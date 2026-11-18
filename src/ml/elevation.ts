/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * RoadRisk Delhi - Structural Vulnerability Index
 * Module: elevation.ts
 * Fetches SRTM 30m elevation via OpenTopoData API in batches of 100 points
 * with 1-second delay, caching results to data/cache/elevation.json.
 */

import fs from "fs";
import path from "path";

const ELEVATION_CACHE_FILE = path.resolve(process.cwd(), "data/cache/elevation.json");
const OPENTOPODATA_URL = "https://api.opentopodata.org/v1/srtm30m";
const BATCH_SIZE = 100;
const DELAY_MS = 1000;

export interface Point {
  lat: number;
  lon: number;
}

export interface ElevationResult {
  elevationMap: Map<string, number | null>;
  elevationAvailable: boolean;
  totalFetched: number;
  fromCache: number;
}

/**
 * Coordinate key helper formatted to 5 decimal places (~1.1 meter resolution).
 */
export function getCoordKey(lat: number, lon: number): string {
  return `${lat.toFixed(5)},${lon.toFixed(5)}`;
}

/**
 * Sleep helper for batch pacing.
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Loads cached elevation dictionary from data/cache/elevation.json.
 */
export function loadElevationCache(): Record<string, number> {
  try {
    if (fs.existsSync(ELEVATION_CACHE_FILE)) {
      const raw = fs.readFileSync(ELEVATION_CACHE_FILE, "utf-8");
      return JSON.parse(raw);
    }
  } catch (err: any) {
    console.warn("Notice: Could not read elevation cache:", err?.message || err);
  }
  return {};
}

/**
 * Saves elevation dictionary to data/cache/elevation.json.
 */
export function saveElevationCache(cache: Record<string, number>): void {
  try {
    const dir = path.dirname(ELEVATION_CACHE_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(ELEVATION_CACHE_FILE, JSON.stringify(cache, null, 2), "utf-8");
  } catch (err: any) {
    console.error("Error saving elevation cache:", err?.message || err);
  }
}

/**
 * Fetches SRTM 30m elevation for each point from OpenTopoData.
 * Batched at 100 points per request with 1 second delay between batches.
 * Caches all responses. If API is unreachable, never invents values.
 */
export async function fetchElevationsForPoints(points: Point[]): Promise<ElevationResult> {
  const cache = loadElevationCache();
  const elevationResultMap = new Map<string, number | null>();

  const missingPoints: Point[] = [];
  let fromCacheCount = 0;

  for (const pt of points) {
    const key = getCoordKey(pt.lat, pt.lon);
    if (key in cache && typeof cache[key] === "number" && !isNaN(cache[key])) {
      elevationResultMap.set(key, cache[key]);
      fromCacheCount++;
    } else {
      missingPoints.push(pt);
    }
  }

  let totalFetched = 0;
  let apiFailure = false;

  if (missingPoints.length > 0) {
    console.log(`[Elevation] Fetching ${missingPoints.length} points from OpenTopoData (${fromCacheCount} already cached)...`);

    // Deduplicate missing coordinate keys to minimize API calls
    const uniqueMissingMap = new Map<string, Point>();
    for (const pt of missingPoints) {
      uniqueMissingMap.set(getCoordKey(pt.lat, pt.lon), pt);
    }
    const uniqueMissingPoints = Array.from(uniqueMissingMap.values());

    for (let i = 0; i < uniqueMissingPoints.length; i += BATCH_SIZE) {
      const batch = uniqueMissingPoints.slice(i, i + BATCH_SIZE);
      const locationsParam = batch.map((p) => `${p.lat.toFixed(5)},${p.lon.toFixed(5)}`).join("|");

      try {
        const response = await fetch(`${OPENTOPODATA_URL}?locations=${locationsParam}`, {
          method: "GET",
          headers: {
            "User-Agent": "RoadRiskDelhi/3.0 (Urban Waterlogging Vulnerability Study)",
            Accept: "application/json",
          },
          signal: AbortSignal.timeout(12000),
        });

        if (!response.ok) {
          throw new Error(`OpenTopoData returned HTTP ${response.status}`);
        }

        const data = await response.json();
        if (data && data.status === "OK" && Array.isArray(data.results)) {
          data.results.forEach((r: any, idx: number) => {
            const originalPt = batch[idx];
            if (!originalPt) return;
            const key = getCoordKey(originalPt.lat, originalPt.lon);
            const val = typeof r.elevation === "number" && !isNaN(r.elevation) ? r.elevation : null;
            if (val !== null) {
              cache[key] = val;
              elevationResultMap.set(key, val);
            } else {
              elevationResultMap.set(key, null);
            }
          });
          totalFetched += data.results.length;
        } else {
          throw new Error("Invalid response format from OpenTopoData");
        }
      } catch (err: any) {
        console.warn(`[Elevation] OpenTopoData batch ${Math.floor(i / BATCH_SIZE) + 1} failed: ${err?.message || err}. Will not invent values.`);
        apiFailure = true;
        // Do not crash, mark missing points as null
        for (const pt of batch) {
          const key = getCoordKey(pt.lat, pt.lon);
          elevationResultMap.set(key, null);
        }
      }

      // 1-second delay between batches if more remain
      if (i + BATCH_SIZE < uniqueMissingPoints.length) {
        await sleep(DELAY_MS);
      }
    }

    // Save updated cache
    saveElevationCache(cache);
  }

  // Check if all requested points have valid numeric elevation
  let allHaveElevation = true;
  for (const pt of points) {
    const key = getCoordKey(pt.lat, pt.lon);
    const val = elevationResultMap.get(key);
    if (val === null || val === undefined || isNaN(val)) {
      allHaveElevation = false;
    }
  }

  const elevationAvailable = !apiFailure && allHaveElevation && points.length > 0;

  return {
    elevationMap: elevationResultMap,
    elevationAvailable,
    totalFetched,
    fromCache: fromCacheCount,
  };
}
