/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * RoadRisk Delhi - Structural Vulnerability Index
 * Module: features.ts
 * Builds segment features table from road network geometry:
 * - Polyline segmentation to max ~150 m pieces
 * - SRTM 30m elevation & 300m neighborhood low_point_depth_m
 * - Distance to water features (Yamuna / drains)
 * - Underpass classification
 * - Hotspot proximity & binary proxy label (<= 100m)
 * - Spatial block assignment (~500m grid for spatial CV)
 * - Generates comprehensive data quality audit report
 */

import fs from "fs";
import path from "path";
import { FLOOD_HOTSPOTS, haversineDistanceMeters } from "../data/floodHotspots.js";
import { fetchElevationsForPoints, getCoordKey, type Point } from "./elevation.js";
import { getWaterFeatures, computeDistanceToWaterMeters, type BoundingBox, type WaterFeature } from "./water.js";

export const CORRIDOR_CONFIG = {
  name: "Minto Bridge / ITO corridor, Central Delhi",
  bbox: {
    south: 28.6100, // Widened south edge to 28.610 to include Bhairon Marg (lat 28.6160)
    west: 77.2050,
    north: 28.6480,
    east: 77.2500,
  } as BoundingBox,
  HOTSPOT_RADIUS_M: 100, // Fixed 100m distance for binary proxy label
  MAX_SEGMENT_LENGTH_M: 150, // Maximum length of a split road segment
  LOW_POINT_RADIUS_M: 300, // Neighborhood radius for depression depth calculation
  GRID_BLOCK_SIZE_M: 500, // Spatial cross-validation block size (~500m)
  DISCLAIMERS: {
    index: "Index of structural susceptibility, not a live flood forecast.",
    label: "Proxy label: segment within ~100 m of a PWD/DTP-listed point. Not confirmed flood ground truth.",
    delay: "Relative extra delay estimated from road-class speeds, not real trip data.",
    oversight: "Tool informs, humans decide.",
  },
};

export interface RoadSegmentFeature {
  segmentId: string;
  parentRoadId: string;
  osm_way_id?: number | string;
  name: string;
  highway_class: string;
  length_m: number;
  lanes: number;
  is_underpass: boolean;
  oneway?: string | null;
  tunnel?: string | null;
  bridge?: string | null;
  layer?: string | number | null;
  maxspeed?: string | number | null;
  midpoint: { lat: number; lon: number };
  geometry: Array<{ lat: number; lon: number }>;
  elevation_mean: number | null;
  elevation_min: number | null;
  low_point_depth_m: number | null;
  dist_to_water_m: number;
  dist_to_nearest_hotspot_m: number;
  nearest_hotspot_id: string;
  nearest_hotspot_name: string;
  label_proxy: 0 | 1;
  sub_area_id: string;
}

export interface DataReport {
  timestamp: string;
  corridor: string;
  bbox: BoundingBox;
  segmentCount: number;
  hospitalCount: number;
  positiveCount: number;
  positiveRate: number;
  positiveRatePercent: string;
  underpassCount: number;
  elevationAvailable: boolean;
  elevation: {
    min: number | null;
    max: number | null;
    mean: number | null;
    std: number | null;
  };
  subAreaCount: number;
  nanCounts: Record<string, number>;
  verdict: "enough positives for random forest" | "too few positives, use rule-based baseline";
  verdictRationale: string;
  disclaimers: Record<string, string>;
  markdown: string;
}

export interface FeaturesResult {
  metadata: {
    corridor: string;
    bbox: BoundingBox;
    segmentCount: number;
    elevationAvailable: boolean;
    disclaimers: Record<string, string>;
    generatedAt: string;
  };
  segments: RoadSegmentFeature[];
  report: DataReport;
}

/**
 * Splits polyline into sequential sub-pieces of at most maxLenMeters.
 * Distributes pieces evenly so no awkward tiny remnants exist.
 */
export function splitRoadPolyline(
  pts: Array<{ lat: number; lon: number }>,
  maxLenMeters = 150
): Array<{
  geometry: Array<{ lat: number; lon: number }>;
  length_m: number;
  midpoint: { lat: number; lon: number };
}> {
  if (!pts || pts.length < 2) return [];

  // Cumulative distance along vertices
  const dists: number[] = [0];
  let totalDist = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const d = haversineDistanceMeters(pts[i].lat, pts[i].lon, pts[i + 1].lat, pts[i + 1].lon);
    totalDist += d;
    dists.push(totalDist);
  }

  // If already shorter than maxLenMeters, return as single segment
  if (totalDist <= maxLenMeters || totalDist === 0) {
    return [
      {
        geometry: pts,
        length_m: Math.round(totalDist * 10) / 10,
        midpoint: interpolatePolylinePoint(pts, dists, totalDist / 2),
      },
    ];
  }

  const numPieces = Math.max(1, Math.ceil(totalDist / maxLenMeters));
  const pieceLen = totalDist / numPieces;
  const pieces: Array<{
    geometry: Array<{ lat: number; lon: number }>;
    length_m: number;
    midpoint: { lat: number; lon: number };
  }> = [];

  for (let p = 0; p < numPieces; p++) {
    const startDist = p * pieceLen;
    const endDist = p === numPieces - 1 ? totalDist : (p + 1) * pieceLen;
    const midDist = (startDist + endDist) / 2;

    const subGeom = slicePolylineRange(pts, dists, startDist, endDist);
    const midPt = interpolatePolylinePoint(pts, dists, midDist);

    pieces.push({
      geometry: subGeom,
      length_m: Math.round((endDist - startDist) * 10) / 10,
      midpoint: midPt,
    });
  }

  return pieces;
}

/**
 * Interpolates a coordinate along a polyline at a target distance.
 */
function interpolatePolylinePoint(
  pts: Array<{ lat: number; lon: number }>,
  dists: number[],
  targetDist: number
): { lat: number; lon: number } {
  if (targetDist <= 0) return { lat: pts[0].lat, lon: pts[0].lon };
  const maxD = dists[dists.length - 1];
  if (targetDist >= maxD) return { lat: pts[pts.length - 1].lat, lon: pts[pts.length - 1].lon };

  let idx = 0;
  while (idx < dists.length - 1 && dists[idx + 1] < targetDist) {
    idx++;
  }

  const startD = dists[idx];
  const endD = dists[idx + 1];
  const segLen = endD - startD;
  if (segLen === 0) return { lat: pts[idx].lat, lon: pts[idx].lon };

  const ratio = (targetDist - startD) / segLen;
  return {
    lat: Number((pts[idx].lat + ratio * (pts[idx + 1].lat - pts[idx].lat)).toFixed(6)),
    lon: Number((pts[idx].lon + ratio * (pts[idx + 1].lon - pts[idx].lon)).toFixed(6)),
  };
}

/**
 * Extracts a sub-polyline slice between startDist and endDist.
 */
function slicePolylineRange(
  pts: Array<{ lat: number; lon: number }>,
  dists: number[],
  startDist: number,
  endDist: number
): Array<{ lat: number; lon: number }> {
  const result: Array<{ lat: number; lon: number }> = [];
  result.push(interpolatePolylinePoint(pts, dists, startDist));

  for (let i = 0; i < pts.length; i++) {
    if (dists[i] > startDist && dists[i] < endDist) {
      result.push({ lat: pts[i].lat, lon: pts[i].lon });
    }
  }

  result.push(interpolatePolylinePoint(pts, dists, endDist));
  return result;
}

/**
 * Assigns a spatial grid block id (~500 m grid cell).
 * At 28.6°N: 500m ≈ 0.0045° lat, 0.0051° lon.
 */
export function assignSubAreaId(lat: number, lon: number): string {
  const gridLat = Math.floor(lat / 0.0045);
  const gridLon = Math.floor(lon / 0.0051);
  return `grid_${gridLat}_${gridLon}`;
}

/**
 * Identifies if a road segment is an underpass / subterranean road cut.
 * Tunnel set, layer < 0, or name matches underpass/subway/RUB/tunnel.
 */
export function checkIsUnderpass(road: any): boolean {
  if (road.tunnel && road.tunnel !== "no" && road.tunnel !== false) return true;
  if (road.layer !== undefined && road.layer !== null && road.layer !== "") {
    const layerNum = typeof road.layer === "number" ? road.layer : parseFloat(String(road.layer));
    if (!isNaN(layerNum) && layerNum < 0) return true;
  }
  const name = road.name || "";
  const underpassRegex = /(underpass|subway|RUB|tunnel)/i;
  return underpassRegex.test(name);
}

/**
 * Builds the complete feature table and quality audit report.
 */
export async function buildSegmentFeatures(
  roads: any[],
  hospitalCount = 8,
  customBbox: BoundingBox = CORRIDOR_CONFIG.bbox
): Promise<FeaturesResult> {
  console.log(`[Features] Splitting ${roads.length} road polylines into <=150m segments...`);

  // 1. Split each road into pieces
  interface RawPiece {
    segmentId: string;
    parentRoadId: string;
    osm_way_id?: number | string;
    name: string;
    highway_class: string;
    length_m: number;
    lanes: number;
    is_underpass: boolean;
    oneway?: string | null;
    tunnel?: string | null;
    bridge?: string | null;
    layer?: string | number | null;
    maxspeed?: string | number | null;
    midpoint: { lat: number; lon: number };
    geometry: Array<{ lat: number; lon: number }>;
  }

  const rawPieces: RawPiece[] = [];

  for (let rIdx = 0; rIdx < roads.length; rIdx++) {
    const r = roads[rIdx];
    const parentRoadId = r.id ? String(r.id) : (r.osm_way_id ? `osm-${r.osm_way_id}` : `osm-road-${rIdx}`);
    const pieces = splitRoadPolyline(r.geometry || [], CORRIDOR_CONFIG.MAX_SEGMENT_LENGTH_M);
    const isUnderpass = checkIsUnderpass(r);
    const lanes = typeof r.lanes === "number" && r.lanes > 0 ? r.lanes : r.highway?.includes("primary") || r.highway?.includes("trunk") ? 2 : 1;
    const highwayClass = String(r.highway || "residential").split("_")[0];

    pieces.forEach((p, idx) => {
      rawPieces.push({
        segmentId: `${parentRoadId}#${idx}`,
        parentRoadId,
        osm_way_id: r.osm_way_id,
        name: r.name || `Segment ${parentRoadId}#${idx}`,
        highway_class: highwayClass,
        length_m: p.length_m,
        lanes,
        is_underpass: isUnderpass,
        oneway: r.oneway ?? null,
        tunnel: r.tunnel ?? null,
        bridge: r.bridge ?? null,
        layer: r.layer ?? null,
        maxspeed: r.maxspeed ?? null,
        midpoint: p.midpoint,
        geometry: p.geometry,
      });
    });
  }

  console.log(`[Features] Generated ${rawPieces.length} segments from ${roads.length} roads.`);

  // 2. Fetch elevations for segment midpoints
  const midpoints: Point[] = rawPieces.map((p) => p.midpoint);
  const elevationData = await fetchElevationsForPoints(midpoints);

  // 3. Fetch water features for corridor + 2 km margin
  const waterFeatures = await getWaterFeatures(customBbox);
  console.log(`[Features] Loaded ${waterFeatures.length} water corridors for distance computation.`);

  // 4. Calculate surrounding mean elevation for low_point_depth_m
  // Neighborhood radius: 300 m
  const segmentsWithElevation: Array<{ midpoint: Point; elevation: number | null }> = rawPieces.map((p) => {
    const key = getCoordKey(p.midpoint.lat, p.midpoint.lon);
    const ele = elevationData.elevationMap.get(key) ?? null;
    return { midpoint: p.midpoint, elevation: ele };
  });

  const lowPointDepths: Array<number | null> = [];
  for (let i = 0; i < rawPieces.length; i++) {
    const target = segmentsWithElevation[i];
    if (target.elevation === null || isNaN(target.elevation)) {
      lowPointDepths.push(null);
      continue;
    }

    let sumElev = 0;
    let countElev = 0;

    for (let j = 0; j < segmentsWithElevation.length; j++) {
      const neighbor = segmentsWithElevation[j];
      if (neighbor.elevation === null || isNaN(neighbor.elevation)) continue;

      const d = haversineDistanceMeters(
        target.midpoint.lat,
        target.midpoint.lon,
        neighbor.midpoint.lat,
        neighbor.midpoint.lon
      );
      if (d <= CORRIDOR_CONFIG.LOW_POINT_RADIUS_M) {
        sumElev += neighbor.elevation;
        countElev++;
      }
    }

    if (countElev > 0) {
      const surroundingMean = sumElev / countElev;
      // Positive = lower than surrounding average (depression)
      const depth = Math.round((surroundingMean - target.elevation) * 100) / 100;
      lowPointDepths.push(depth);
    } else {
      lowPointDepths.push(0);
    }
  }

  // 5. Build final segment rows
  const segments: RoadSegmentFeature[] = [];
  const subAreaSet = new Set<string>();
  let positiveCount = 0;
  let underpassCount = 0;

  const validElevations: number[] = [];

  for (let i = 0; i < rawPieces.length; i++) {
    const p = rawPieces[i];
    const key = getCoordKey(p.midpoint.lat, p.midpoint.lon);
    const ele = elevationData.elevationMap.get(key) ?? null;

    if (ele !== null && !isNaN(ele)) {
      validElevations.push(ele);
    }

    // Distance to nearest of 9 hotspots in src/data/floodHotspots.js
    let nearestHotspotDist = Infinity;
    let nearestHotspotId = "";
    let nearestHotspotName = "";

    for (const h of FLOOD_HOTSPOTS) {
      const d = haversineDistanceMeters(p.midpoint.lat, p.midpoint.lon, h.lat, h.lon);
      if (d < nearestHotspotDist) {
        nearestHotspotDist = d;
        nearestHotspotId = h.id;
        nearestHotspotName = h.name;
      }
    }

    // Fixed 100m threshold proxy label
    const labelProxy: 0 | 1 = nearestHotspotDist <= CORRIDOR_CONFIG.HOTSPOT_RADIUS_M ? 1 : 0;
    if (labelProxy === 1) positiveCount++;

    if (p.is_underpass) underpassCount++;

    // Distance to water
    const distToWater = computeDistanceToWaterMeters(p.midpoint, waterFeatures);

    // Spatial block ID
    const subAreaId = assignSubAreaId(p.midpoint.lat, p.midpoint.lon);
    subAreaSet.add(subAreaId);

    segments.push({
      segmentId: p.segmentId,
      parentRoadId: p.parentRoadId,
      osm_way_id: p.osm_way_id,
      name: p.name,
      highway_class: p.highway_class,
      length_m: p.length_m,
      lanes: p.lanes,
      is_underpass: p.is_underpass,
      oneway: p.oneway,
      tunnel: p.tunnel,
      bridge: p.bridge,
      layer: p.layer,
      maxspeed: p.maxspeed,
      midpoint: p.midpoint,
      geometry: p.geometry,
      elevation_mean: ele,
      elevation_min: ele,
      low_point_depth_m: lowPointDepths[i],
      dist_to_water_m: distToWater,
      dist_to_nearest_hotspot_m: Math.round(nearestHotspotDist * 10) / 10,
      nearest_hotspot_id: nearestHotspotId,
      nearest_hotspot_name: nearestHotspotName,
      label_proxy: labelProxy,
      sub_area_id: subAreaId,
    });
  }

  // 6. Compute statistics & Data Quality Report
  const totalSegs = segments.length;
  const positiveRate = totalSegs > 0 ? positiveCount / totalSegs : 0;
  const positiveRatePercent = `${(positiveRate * 100).toFixed(2)}%`;

  let eleMin: number | null = null;
  let eleMax: number | null = null;
  let eleMean: number | null = null;
  let eleStd: number | null = null;

  if (validElevations.length > 0) {
    eleMin = Math.min(...validElevations);
    eleMax = Math.max(...validElevations);
    const sum = validElevations.reduce((a, b) => a + b, 0);
    eleMean = Math.round((sum / validElevations.length) * 10) / 10;
    const sqDiffSum = validElevations.reduce((a, b) => a + Math.pow(b - eleMean!, 2), 0);
    eleStd = Math.round(Math.sqrt(sqDiffSum / validElevations.length) * 100) / 100;
  }

  // Check NaN counts across columns
  const nanCounts: Record<string, number> = {
    elevation_mean: segments.filter((s) => s.elevation_mean === null || isNaN(s.elevation_mean)).length,
    elevation_min: segments.filter((s) => s.elevation_min === null || isNaN(s.elevation_min)).length,
    low_point_depth_m: segments.filter((s) => s.low_point_depth_m === null || isNaN(s.low_point_depth_m)).length,
    dist_to_water_m: segments.filter((s) => isNaN(s.dist_to_water_m)).length,
    dist_to_nearest_hotspot_m: segments.filter((s) => isNaN(s.dist_to_nearest_hotspot_m)).length,
    label_proxy: segments.filter((s) => s.label_proxy !== 0 && s.label_proxy !== 1).length,
  };

  // Verdict criteria:
  // Random Forest requires at least ~20 positive cases and positive rate >= 5% for stratified k-fold cross validation.
  const isEnoughForRF = positiveCount >= 20 && positiveRate >= 0.05;
  const verdict: "enough positives for random forest" | "too few positives, use rule-based baseline" = isEnoughForRF
    ? "enough positives for random forest"
    : "too few positives, use rule-based baseline";

  const verdictRationale = isEnoughForRF
    ? `Dataset provides ${positiveCount} positive segments (${positiveRatePercent} prevalence) across ${totalSegs} total segments and ${subAreaSet.size} spatial sub-areas. This provides sufficient class support for class-weighted Random Forest or ensemble bagging, paired with group-k-fold cross validation.`
    : `Only ${positiveCount} positive segments identified (${positiveRatePercent} prevalence) across ${totalSegs} segments. With fewer than 20 positive cases, standard decision trees risk severe class collapse during spatial folds; use the rule-based baseline index instead.`;

  const reportMarkdown = `
# Data Quality & Feature Audit Report
**Project:** RoadRisk Delhi - Structural Vulnerability Index
**Corridor:** ${CORRIDOR_CONFIG.name}
**Bounding Box:** S: ${customBbox.south.toFixed(4)}, W: ${customBbox.west.toFixed(4)}, N: ${customBbox.north.toFixed(4)}, E: ${customBbox.east.toFixed(4)}
**Generated:** ${new Date().toISOString()}

---

## 1. Inventory Summary
| Metric | Value | Rationale |
| :--- | :--- | :--- |
| **Total Road Segments** | **${totalSegs}** | Split into <=150 m pieces for localized spatial feature variation |
| **Parent Road Polylines** | **${roads.length}** | Preserves parentRoadId for seamless simulation graph joins |
| **Hospitals Monitored** | **${hospitalCount}** | Tertiary emergency trauma centers in the corridor catchment |
| **Underpass Segments** | **${underpassCount}** | Identified via tunnel, negative layer tag, or naming regex |
| **Spatial Grid Blocks** | **${subAreaSet.size}** | ~500 m spatial cells for leak-free spatial cross-validation |

## 2. Target Label & Class Balance
- **Positive Segments (<=100 m of listed hotspot):** **${positiveCount}**
- **Negative Segments (>100 m of listed hotspot):** **${totalSegs - positiveCount}**
- **Positive Rate:** **${positiveRatePercent}**
- **Discretion Note:** Fixed 100 m radius applied per requirement (ignoring legacy scenario radius).

## 3. Elevation & Topographic Depressions (SRTM 30m)
- **Elevation Available:** ${elevationData.elevationAvailable ? "Yes (OpenTopoData SRTM 30m cached)" : "No (Unreachable - values omitted)"}
- **Elevation Min:** ${eleMin !== null ? `${eleMin} m` : "N/A"}
- **Elevation Max:** ${eleMax !== null ? `${eleMax} m` : "N/A"}
- **Elevation Mean:** ${eleMean !== null ? `${eleMean} m` : "N/A"}
- **Elevation Std Dev:** ${eleStd !== null ? `${eleStd} m` : "N/A"}

## 4. Data Completeness & NaN Audit
| Feature Column | Missing / NaN Count | Status |
| :--- | :--- | :--- |
| \`elevation_mean\` | ${nanCounts.elevation_mean} | ${nanCounts.elevation_mean === 0 ? "Complete" : "Missing API values"} |
| \`elevation_min\` | ${nanCounts.elevation_min} | ${nanCounts.elevation_min === 0 ? "Complete" : "Missing API values"} |
| \`low_point_depth_m\` | ${nanCounts.low_point_depth_m} | ${nanCounts.low_point_depth_m === 0 ? "Complete" : "Missing API values"} |
| \`dist_to_water_m\` | ${nanCounts.dist_to_water_m} | Complete |
| \`dist_to_nearest_hotspot_m\` | ${nanCounts.dist_to_nearest_hotspot_m} | Complete |
| \`label_proxy\` | ${nanCounts.label_proxy} | Binary (0 or 1) |

## 5. Machine Learning Verdict
> **Verdict: ${verdict}**
> 
> *${verdictRationale}*

---

## 6. Regulatory Disclaimers
1. **${CORRIDOR_CONFIG.DISCLAIMERS.index}**
2. **${CORRIDOR_CONFIG.DISCLAIMERS.label}**
3. **${CORRIDOR_CONFIG.DISCLAIMERS.delay}**
4. **${CORRIDOR_CONFIG.DISCLAIMERS.oversight}**
`.trim();

  const report: DataReport = {
    timestamp: new Date().toISOString(),
    corridor: CORRIDOR_CONFIG.name,
    bbox: customBbox,
    segmentCount: totalSegs,
    hospitalCount,
    positiveCount,
    positiveRate,
    positiveRatePercent,
    underpassCount,
    elevationAvailable: elevationData.elevationAvailable,
    elevation: {
      min: eleMin,
      max: eleMax,
      mean: eleMean,
      std: eleStd,
    },
    subAreaCount: subAreaSet.size,
    nanCounts,
    verdict,
    verdictRationale,
    disclaimers: CORRIDOR_CONFIG.DISCLAIMERS,
    markdown: reportMarkdown,
  };

  // 7. Save features to public/data/segments_features.json
  try {
    const publicDataDir = path.resolve(process.cwd(), "public/data");
    if (!fs.existsSync(publicDataDir)) {
      fs.mkdirSync(publicDataDir, { recursive: true });
    }
    const outputPath = path.join(publicDataDir, "segments_features.json");
    fs.writeFileSync(
      outputPath,
      JSON.stringify(
        {
          metadata: {
            corridor: CORRIDOR_CONFIG.name,
            bbox: customBbox,
            segmentCount: totalSegs,
            elevationAvailable: elevationData.elevationAvailable,
            disclaimers: CORRIDOR_CONFIG.DISCLAIMERS,
            generatedAt: new Date().toISOString(),
          },
          segments,
        },
        null,
        2
      ),
      "utf-8"
    );
    console.log(`[Features] Successfully saved ${totalSegs} segment features to ${outputPath}`);
  } catch (err: any) {
    console.error("Error saving segments_features.json to public/data:", err?.message || err);
  }

  return {
    metadata: {
      corridor: CORRIDOR_CONFIG.name,
      bbox: customBbox,
      segmentCount: totalSegs,
      elevationAvailable: elevationData.elevationAvailable,
      disclaimers: CORRIDOR_CONFIG.DISCLAIMERS,
      generatedAt: new Date().toISOString(),
    },
    segments,
    report,
  };
}
