/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * RoadRisk Delhi - Structural Vulnerability Index
 * Module: emergencyFallback.ts
 * 
 * Tier 3 "Emergency Fallback" Engine:
 * - Operates ONLY if segment features or elevation are missing entirely.
 * - Computed on the bundled hand-built corridor graph in src/data/fallbackRoads.json (91 roads).
 * - Formula: Score = 0.6 * norm_proximity_to_hotspot + 0.4 * underpass_flag
 * - Completely deterministic, scores strictly in [0, 1].
 * - Generates valid segment routing graph for the closure engine.
 * - CIRCULARITY GUARD: The hotspot-proximity score is NOT evaluated against the proxy label.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { FLOOD_HOTSPOTS, haversineDistanceMeters } from "../data/floodHotspots.js";
import { splitRoadPolyline, checkIsUnderpass, CORRIDOR_CONFIG } from "./features.js";
import type { VulnerabilityFile, VulnerabilitySegment, TopFactor } from "../types/risk.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export interface EmergencyFallbackResult {
  vulnerabilityFile: VulnerabilityFile;
  segments: VulnerabilitySegment[];
  roadCount: number;
  segmentCount: number;
}

/**
 * Loads the bundled 91-road corridor network from fallbackRoads.json.
 */
export function getBundledFallbackRoads(): any[] {
  try {
    const filePath = path.resolve(__dirname, "../data/fallbackRoads.json");
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, "utf-8");
      return JSON.parse(raw);
    }
  } catch (err) {
    console.warn("Warning: Could not read fallbackRoads.json:", err);
  }
  return [];
}

/**
 * Computes Tier 3 scores and segments from fallbackRoads.json.
 */
export function computeEmergencyFallbackScores(): EmergencyFallbackResult {
  const roads = getBundledFallbackRoads();
  if (!roads || roads.length === 0) {
    throw new Error("Cannot compute Tier 3 emergency fallback: fallbackRoads.json is empty or missing.");
  }

  // 1. Split roads into ~150m segments
  interface IntermediateSegment {
    segmentId: string;
    parentRoadId: string;
    name: string;
    highway_class: string;
    length_m: number;
    lanes: number;
    is_underpass: boolean;
    midpoint: { lat: number; lon: number };
    geometry: Array<{ lat: number; lon: number }>;
    dist_to_hotspot: number;
    nearest_hotspot_name: string;
  }

  const intermediateList: IntermediateSegment[] = [];

  for (const r of roads) {
    const parentRoadId = String(r.id);
    const pieces = splitRoadPolyline(r.geometry || [], CORRIDOR_CONFIG.MAX_SEGMENT_LENGTH_M);
    const isUnderpass = checkIsUnderpass(r);
    const lanes = typeof r.lanes === "number" && r.lanes > 0 ? r.lanes : 2;
    const highwayClass = String(r.highway || "primary").split("_")[0];
    const roadName = r.name || `Corridor #${parentRoadId}`;

    pieces.forEach((p, idx) => {
      // Find nearest listed hotspot
      let minDist = Infinity;
      let nearestName = "Minto Bridge Underpass";

      for (const h of FLOOD_HOTSPOTS) {
        const d = haversineDistanceMeters(p.midpoint.lat, p.midpoint.lon, h.lat, h.lon);
        if (d < minDist) {
          minDist = d;
          nearestName = h.name;
        }
      }

      intermediateList.push({
        segmentId: `${parentRoadId}#${idx}`,
        parentRoadId,
        name: `${roadName} (Part ${idx + 1})`,
        highway_class: highwayClass,
        length_m: p.length_m,
        lanes,
        is_underpass: isUnderpass,
        midpoint: p.midpoint,
        geometry: p.geometry,
        dist_to_hotspot: minDist,
        nearest_hotspot_name: nearestName,
      });
    });
  }

  // 2. Normalise proximity across corridor
  // Closer to hotspot = higher proximity (1.0 = closest, 0.0 = furthest)
  let minDistAcrossAll = Infinity;
  let maxDistAcrossAll = -Infinity;

  for (const s of intermediateList) {
    if (s.dist_to_hotspot < minDistAcrossAll) minDistAcrossAll = s.dist_to_hotspot;
    if (s.dist_to_hotspot > maxDistAcrossAll) maxDistAcrossAll = s.dist_to_hotspot;
  }

  const distRange = maxDistAcrossAll - minDistAcrossAll || 1;

  // 3. Compute score = 0.6 * norm_proximity + 0.4 * underpass_flag
  interface ScoredCandidate {
    item: IntermediateSegment;
    rawScore: number;
    normProximity: number;
    underpassFlag: number;
  }

  const scoredCandidates: ScoredCandidate[] = intermediateList.map((item) => {
    const normProximity = Math.max(0, Math.min(1, (maxDistAcrossAll - item.dist_to_hotspot) / distRange));
    const underpassFlag = item.is_underpass ? 1.0 : 0.0;
    const rawScore = Number((0.6 * normProximity + 0.4 * underpassFlag).toFixed(4));
    return { item, rawScore, normProximity, underpassFlag };
  });

  // 4. Deterministic sorting: descending by rawScore, tie-break by segmentId
  scoredCandidates.sort((a, b) => {
    if (b.rawScore !== a.rawScore) return b.rawScore - a.rawScore;
    return a.item.segmentId.localeCompare(b.item.segmentId);
  });

  const totalN = scoredCandidates.length;

  const finalSegments: VulnerabilitySegment[] = scoredCandidates.map((c, index) => {
    const rank = index + 1;
    // Rank-normalized percentile score [0.0 to 1.0]
    const score = Number(((totalN - rank + 1) / totalN).toFixed(4));

    const topFactors: TopFactor[] = [
      {
        feature: "dist_to_nearest_hotspot_m",
        contribution: Number((0.6 * c.normProximity).toFixed(4)),
        label: `Proximity to ${c.item.nearest_hotspot_name} (~${Math.round(c.item.dist_to_hotspot)}m)`,
      },
      {
        feature: "is_underpass",
        contribution: Number((0.4 * c.underpassFlag).toFixed(4)),
        label: c.item.is_underpass ? "Railway/Road Underpass Cut" : "Surface Level Corridor",
      },
    ];

    return {
      segmentId: c.item.segmentId,
      parentRoadId: c.item.parentRoadId,
      name: c.item.name,
      score,
      rawScore: c.rawScore,
      rank,
      method: "emergency_fallback" as const,
      geometry: c.item.geometry,
      midpoint: c.item.midpoint,
      isWithin100mHotspot: c.item.dist_to_hotspot <= CORRIDOR_CONFIG.HOTSPOT_RADIUS_M,
      features: {
        elevation_mean: null,
        elevation_min: null,
        low_point_depth_m: null,
        dist_to_water_m: 500, // Estimated neutral distance
        is_underpass: c.item.is_underpass,
        highway_class: c.item.highway_class,
        length_m: c.item.length_m,
        lanes: c.item.lanes,
      },
      topFactors,
    };
  });

  const vulnerabilityFile: VulnerabilityFile = {
    generatedAt: new Date().toISOString(),
    corridor: CORRIDOR_CONFIG.name,
    method: "emergency_fallback" as const,
    label: "Emergency Fallback (Hotspot Proximity + Underpass Tags)",
    segmentCount: finalSegments.length,
    disclaimers: {
      ...CORRIDOR_CONFIG.DISCLAIMERS,
      emergency: "Emergency fallback: illustrative score from listed hotspots and underpass tags on a simplified corridor graph. Not validated.",
    },
    segments: finalSegments,
  };

  return {
    vulnerabilityFile,
    segments: finalSegments,
    roadCount: roads.length,
    segmentCount: finalSegments.length,
  };
}
