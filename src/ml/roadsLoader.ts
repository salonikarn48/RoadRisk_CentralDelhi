/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * RoadRisk Delhi - Unified Road Data Loader
 * Module: roadsLoader.ts
 * 
 * Strict Data Order everywhere:
 * 1. Live Overpass if reachable
 * 2. Otherwise src/data/osm_corridor_roads.json (OSM snapshot)
 * 3. Otherwise src/data/fallbackRoads.json (Synthetic fallback, only if osm_corridor_roads.json missing)
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export interface LoadedRoadsResult {
  roads: any[];
  source: string;
  sourceType: "live" | "osm_snapshot" | "fallback";
  downloadDate?: string;
}

const OSM_SNAPSHOT_PATH = path.resolve(__dirname, "../data/osm_corridor_roads.json");
const FALLBACK_ROADS_PATH = path.resolve(__dirname, "../data/fallbackRoads.json");

const OSM_PART_DIR = path.resolve(__dirname, "../data");

/** Chunk files like osm_corridor_roads.part1.json, part2.json ... (used when the single file is absent). */
function listOsmParts(): string[] {
  try {
    return fs
      .readdirSync(OSM_PART_DIR)
      .filter((f) => /^osm_corridor_roads\.part\d+\.json$/.test(f))
      .sort((a, b) => parseInt(a.match(/part(\d+)/)![1], 10) - parseInt(b.match(/part(\d+)/)![1], 10))
      .map((f) => path.join(OSM_PART_DIR, f));
  } catch {
    return [];
  }
}

function readOsmRoads(): any[] | null {
  if (fs.existsSync(OSM_SNAPSHOT_PATH)) {
    const roads = JSON.parse(fs.readFileSync(OSM_SNAPSHOT_PATH, "utf-8"));
    return Array.isArray(roads) ? roads : null;
  }
  const parts = listOsmParts();
  if (parts.length === 0) return null;
  const all: any[] = [];
  for (const f of parts) {
    const chunk = JSON.parse(fs.readFileSync(f, "utf-8"));
    if (Array.isArray(chunk)) all.push(...chunk);
  }
  return all;
}

/**
 * Gets formatted download date of the offline OSM snapshot.
 */
export function getOsmSnapshotDownloadDate(): string {
  try {
    // Prefer the recorded download date (file modified times change when files are copied or uploaded)
    const metaPath = path.resolve(__dirname, "../data/osm_corridor_roads.meta.json");
    if (fs.existsSync(metaPath)) {
      const meta = JSON.parse(fs.readFileSync(metaPath, "utf-8"));
      if (meta && typeof meta.downloadedOn === "string" && meta.downloadedOn) return meta.downloadedOn;
    }
  } catch {
    // ignore and fall through
  }
  try {
    const dateFile = fs.existsSync(OSM_SNAPSHOT_PATH) ? OSM_SNAPSHOT_PATH : listOsmParts()[0];
    if (dateFile && fs.existsSync(dateFile)) {
      const stat = fs.statSync(dateFile);
      const d = new Date(stat.mtime);
      return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    }
  } catch {
    // fallback to current date
  }
  return "Oct 28";
}

/**
 * Returns formatted source label according to rules:
 * "OSM snapshot (downloaded <date>)"
 */
export function getOsmSnapshotSourceLabel(): string {
  const dateStr = getOsmSnapshotDownloadDate();
  return `OSM snapshot (downloaded ${dateStr})`;
}

/**
 * Loads roads from offline files following strict priority:
 * 1. osm_corridor_roads.json
 * 2. fallbackRoads.json
 */
export function loadOfflineCorridorRoads(): LoadedRoadsResult {
  // 1. Try osm_corridor_roads.json
  if (fs.existsSync(OSM_SNAPSHOT_PATH) || listOsmParts().length > 0) {
    try {
      const roads = readOsmRoads();
      if (roads && roads.length > 0) {
        const sourceLabel = getOsmSnapshotSourceLabel();
        console.info(`[Roads] Using source: ${sourceLabel} (${roads.length} roads)`);
        return {
          roads,
          source: sourceLabel,
          sourceType: "osm_snapshot",
          downloadDate: getOsmSnapshotDownloadDate(),
        };
      }
    } catch (err: any) {
      console.warn(`[Roads] Error reading ${OSM_SNAPSHOT_PATH}:`, err?.message);
    }
  }

  // 2. Only if osm_corridor_roads.json is missing too, fallback to fallbackRoads.json
  if (fs.existsSync(FALLBACK_ROADS_PATH)) {
    try {
      const raw = fs.readFileSync(FALLBACK_ROADS_PATH, "utf-8");
      const roads = JSON.parse(raw);
      if (Array.isArray(roads) && roads.length > 0) {
        console.info(`[Roads] Using source: Synthetic fallback (${FALLBACK_ROADS_PATH}) (${roads.length} roads)`);
        return {
          roads,
          source: "Synthetic fallback",
          sourceType: "fallback",
        };
      }
    } catch (err: any) {
      console.warn(`[Roads] Error reading ${FALLBACK_ROADS_PATH}:`, err?.message);
    }
  }

  return {
    roads: [],
    source: "Empty",
    sourceType: "fallback",
  };
}
