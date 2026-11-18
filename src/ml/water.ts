/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * RoadRisk Delhi - Structural Vulnerability Index
 * Module: water.ts
 * Fetches water features (natural=water, waterway=river|canal|drain) within corridor bbox + 2km margin.
 * Queries Overpass mirrors with fallback to OSM 0.6 Map API, caching in data/cache/water.json.
 * Computes minimum geodesic distance (dist_to_water_m) to segment midpoints.
 */

import fs from "fs";
import path from "path";
import { haversineDistanceMeters } from "../data/floodHotspots.js";

const WATER_CACHE_FILE = path.resolve(process.cwd(), "data/cache/water.json");
const LARGE_WATER_DISTANCE_M = 99999;

export interface WaterPoint {
  lat: number;
  lon: number;
}

export interface WaterFeature {
  id: string;
  name: string;
  type: "river" | "canal" | "drain" | "water" | "lake";
  geometry: WaterPoint[];
}

export interface BoundingBox {
  south: number;
  west: number;
  north: number;
  east: number;
}

// High-availability Overpass API mirrors matching server.ts
const OVERPASS_MIRRORS = [
  "https://overpass-api.de/api/interpreter",
  "https://lz4.overpass-api.de/api/interpreter",
  "https://z.overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
];

/**
 * Expands bounding box by approx 2 km margin:
 * ~0.018 degrees latitude, ~0.021 degrees longitude at 28.6° N.
 */
export function expandBboxMargin(bbox: BoundingBox, marginKm = 2): BoundingBox {
  const latDelta = marginKm / 111.1;
  const lonDelta = marginKm / (111.1 * Math.cos((bbox.south * Math.PI) / 180));
  return {
    south: Number((bbox.south - latDelta).toFixed(4)),
    west: Number((bbox.west - lonDelta).toFixed(4)),
    north: Number((bbox.north + latDelta).toFixed(4)),
    east: Number((bbox.east + lonDelta).toFixed(4)),
  };
}

/**
 * Loads cached water features from data/cache/water.json.
 */
export function loadWaterCache(): WaterFeature[] | null {
  try {
    if (fs.existsSync(WATER_CACHE_FILE)) {
      const raw = fs.readFileSync(WATER_CACHE_FILE, "utf-8");
      const data = JSON.parse(raw);
      if (Array.isArray(data) && data.length > 0) {
        return data;
      }
    }
  } catch (err: any) {
    console.warn("Notice: Could not read water cache:", err?.message || err);
  }
  return null;
}

/**
 * Saves water features to data/cache/water.json.
 */
export function saveWaterCache(features: WaterFeature[]): void {
  try {
    const dir = path.dirname(WATER_CACHE_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(WATER_CACHE_FILE, JSON.stringify(features, null, 2), "utf-8");
  } catch (err: any) {
    console.error("Error saving water cache:", err?.message || err);
  }
}

/**
 * Parse Overpass response elements into WaterFeature array.
 */
function parseOverpassWater(elements: any[]): WaterFeature[] {
  const features: WaterFeature[] = [];
  for (const el of elements) {
    if ((el.type === "way" || el.type === "relation") && el.geometry && el.geometry.length >= 2) {
      const tags = el.tags || {};
      const waterway = tags.waterway || tags.natural || "water";
      const name = tags.name || tags.ref || `${waterway} channel`;
      features.push({
        id: String(el.id),
        name,
        type: tags.waterway === "river" ? "river" : tags.waterway === "canal" ? "canal" : tags.waterway === "drain" ? "drain" : "water",
        geometry: el.geometry.map((pt: any) => ({
          lat: Number(pt.lat),
          lon: Number(pt.lon),
        })),
      });
    }
  }
  return features;
}

/**
 * Parse OSM 0.6 Map XML for water features.
 */
function parseOSMMapWaterXml(xmlText: string): WaterFeature[] {
  const nodes = new Map<string, WaterPoint>();
  for (const m of xmlText.matchAll(/<node id="(\d+)"[^>]*lat="([^"]+)" lon="([^"]+)"/g)) {
    const lat = parseFloat(m[2]);
    const lon = parseFloat(m[3]);
    if (!isNaN(lat) && !isNaN(lon)) nodes.set(m[1], { lat, lon });
  }

  const features: WaterFeature[] = [];
  const wayRegex = /<way id="(\d+)"[^>]*>([\s\S]*?)<\/way>/g;
  for (const wm of xmlText.matchAll(wayRegex)) {
    const id = wm[1];
    const body = wm[2];
    const isWater = body.includes("waterway") || body.includes("k=\"natural\" v=\"water\"");
    if (!isWater) continue;

    const nameMatch = body.match(/<tag k="name" v="([^"]+)"/);
    const wwMatch = body.match(/<tag k="waterway" v="([^"]+)"/);
    const natMatch = body.match(/<tag k="natural" v="([^"]+)"/);

    const pts: WaterPoint[] = [];
    for (const nm of body.matchAll(/<nd ref="(\d+)"/g)) {
      const pt = nodes.get(nm[1]);
      if (pt) pts.push(pt);
    }

    if (pts.length >= 2) {
      const rawType = wwMatch ? wwMatch[1] : natMatch ? natMatch[1] : "water";
      features.push({
        id: `osm_water_${id}`,
        name: nameMatch ? nameMatch[1] : "Water Feature",
        type: rawType === "river" ? "river" : rawType === "canal" ? "canal" : rawType === "drain" ? "drain" : "water",
        geometry: pts,
      });
    }
  }
  return features;
}

/**
 * Queries Overpass mirrors for water features.
 */
async function queryOverpassWater(bbox: BoundingBox): Promise<WaterFeature[]> {
  const highwayFilter = "river|canal|drain";
  const query = `[out:json][timeout:10];(way["natural"="water"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});way["waterway"~"^(${highwayFilter})$"](${bbox.south},${bbox.west},${bbox.north},${bbox.east}););out geom;`;

  try {
    const elements = await Promise.any(
      OVERPASS_MIRRORS.map(async (mirror) => {
        const body = new URLSearchParams({ data: query });
        const res = await fetch(mirror, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
            "User-Agent": "RoadRiskDelhi/3.0 (Urban Transportation Resilience; contact@roadrisk.app)",
            Accept: "application/json",
          },
          body: body.toString(),
          signal: AbortSignal.timeout(8000),
        });
        if (!res.ok) throw new Error(`Status ${res.status}`);
        const data = await res.json();
        if (data && Array.isArray(data.elements) && data.elements.length > 0) {
          return data.elements;
        }
        throw new Error("No water elements");
      })
    );

    return parseOverpassWater(elements);
  } catch (err: any) {
    console.warn("[Water] Overpass mirrors unavailable or timed out for water query:", err?.message || err);
    return [];
  }
}

/**
 * Queries OSM 0.6 Map API for compact water boundary.
 */
async function queryOSMMapWater(bbox: BoundingBox): Promise<WaterFeature[]> {
  try {
    // The main Yamuna river course sits east: 77.240 to 77.271, 28.600 to 28.650
    const url = `https://api.openstreetmap.org/api/0.6/map?bbox=${bbox.west.toFixed(4)},${bbox.south.toFixed(4)},${bbox.east.toFixed(4)},${bbox.north.toFixed(4)}`;
    const res = await fetch(url, {
      headers: {
        "User-Agent": "RoadRiskDelhi/3.0 (Urban Transportation Resilience; contact@roadrisk.app)",
        Accept: "application/xml, text/xml",
      },
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return [];
    const xml = await res.text();
    return parseOSMMapWaterXml(xml);
  } catch (err: any) {
    console.warn("[Water] OSM 0.6 map API note for water:", err?.message || err);
    return [];
  }
}

/**
 * High-fidelity fallback Yamuna River & Delhi Drain corridors
 * Ensures offline stability and graceful behavior if all remote APIs are unreachable.
 */
const FALLBACK_WATER_FEATURES: WaterFeature[] = [
  {
    id: "yamuna_river_central_reach",
    name: "Yamuna River (Central Delhi Reach)",
    type: "river",
    geometry: [
      { lat: 28.6650, lon: 77.2460 },
      { lat: 28.6580, lon: 77.2485 },
      { lat: 28.6510, lon: 77.2510 },
      { lat: 28.6440, lon: 77.2530 },
      { lat: 28.6370, lon: 77.2560 },
      { lat: 28.6300, lon: 77.2585 },
      { lat: 28.6230, lon: 77.2610 },
      { lat: 28.6160, lon: 77.2625 },
      { lat: 28.6090, lon: 77.2640 },
      { lat: 28.6000, lon: 77.2655 },
      { lat: 28.5920, lon: 77.2670 },
    ],
  },
  {
    id: "barapullah_drain_confluence",
    name: "Barapullah Nallah Drain",
    type: "drain",
    geometry: [
      { lat: 28.5910, lon: 77.2350 },
      { lat: 28.5925, lon: 77.2450 },
      { lat: 28.5940, lon: 77.2550 },
      { lat: 28.5955, lon: 77.2645 },
    ],
  },
  {
    id: "delhi_gate_nallah",
    name: "Delhi Gate Trunk Drain / Outfall",
    type: "drain",
    geometry: [
      { lat: 28.6390, lon: 77.2410 },
      { lat: 28.6385, lon: 77.2480 },
      { lat: 28.6375, lon: 77.2555 },
    ],
  },
];

/**
 * Fetches and caches water features for the corridor + 2 km margin.
 */
export async function getWaterFeatures(corridorBbox: BoundingBox): Promise<WaterFeature[]> {
  // 1. Try local cache
  const cached = loadWaterCache();
  if (cached && cached.length > 0) {
    return cached;
  }

  const marginBbox = expandBboxMargin(corridorBbox, 2);
  console.log(`[Water] Querying water features for margin bbox: ${marginBbox.south}, ${marginBbox.west} to ${marginBbox.north}, ${marginBbox.east}...`);

  // 2. Try Overpass mirrors
  let features = await queryOverpassWater(marginBbox);

  // 3. If Overpass empty, try OSM Map API (sliced for Yamuna river corridor)
  if (features.length === 0) {
    const yamunaBbox: BoundingBox = {
      south: Math.max(marginBbox.south, 28.600),
      west: 77.238,
      north: Math.min(marginBbox.north, 28.655),
      east: Math.min(marginBbox.east, 77.271),
    };
    features = await queryOSMMapWater(yamunaBbox);
  }

  // 4. If still empty, use bundled high-fidelity Yamuna / Barapullah baseline
  if (features.length === 0) {
    console.info("[Water] Remote mirrors unavailable, utilizing high-fidelity Yamuna basin snapshot.");
    features = FALLBACK_WATER_FEATURES;
  }

  // Cache to disk
  saveWaterCache(features);
  return features;
}

/**
 * Calculates shortest distance from a point to a line segment AB.
 */
function pointToSegmentDistanceMeters(
  pLat: number,
  pLon: number,
  aLat: number,
  aLon: number,
  bLat: number,
  bLon: number
): number {
  // Convert to local meter projection centered at A
  const cosLat = Math.cos((pLat * Math.PI) / 180);
  const px = (pLon - aLon) * 111139 * cosLat;
  const py = (pLat - aLat) * 111139;
  const bx = (bLon - aLon) * 111139 * cosLat;
  const by = (bLat - aLat) * 111139;

  const segLenSq = bx * bx + by * by;
  if (segLenSq === 0) {
    return haversineDistanceMeters(pLat, pLon, aLat, aLon);
  }

  // Project P onto AB
  const t = Math.max(0, Math.min(1, (px * bx + py * by) / segLenSq));
  const projX = t * bx;
  const projY = t * by;

  const dx = px - projX;
  const dy = py - projY;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Computes minimum distance from a point (midpoint of segment) to any water feature in meters.
 * If no water features found, returns large value (99999).
 */
export function computeDistanceToWaterMeters(
  point: { lat: number; lon: number },
  waterFeatures: WaterFeature[]
): number {
  if (!waterFeatures || waterFeatures.length === 0) {
    return LARGE_WATER_DISTANCE_M;
  }

  let minDistance = Infinity;

  for (const wf of waterFeatures) {
    const pts = wf.geometry;
    if (!pts || pts.length === 0) continue;

    for (let i = 0; i < pts.length - 1; i++) {
      const d = pointToSegmentDistanceMeters(
        point.lat,
        point.lon,
        pts[i].lat,
        pts[i].lon,
        pts[i + 1].lat,
        pts[i + 1].lon
      );
      if (d < minDistance) {
        minDistance = d;
      }
    }
  }

  return Number.isFinite(minDistance) ? Math.round(minDistance * 10) / 10 : LARGE_WATER_DISTANCE_M;
}
