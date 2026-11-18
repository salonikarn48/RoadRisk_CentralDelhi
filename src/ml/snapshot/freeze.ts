/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * RoadRisk Delhi - Structural Vulnerability Index
 * Module: freeze.ts
 * 
 * Generates the deterministic, commit-friendly frozen snapshot:
 * - Writes to public/data/snapshot/
 * - Includes: roads, segments_features, hospitals, water, hotspots,
 *   vulnerability_scores, metrics, closure_graph_quality, and snapshot-meta.json
 * - Calculates sha256 checksums for each file.
 */

import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";
import { FLOOD_HOTSPOTS } from "../../data/floodHotspots.js";
import { CORRIDOR_CONFIG, buildSegmentFeatures } from "../features.js";
import { getWaterFeatures } from "../water.js";
import { runModelValidationAndScoring } from "../validate.js";
import { buildSegmentGraph } from "../closure/graph.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SNAPSHOT_DIR = path.resolve(__dirname, "../../../public/data/snapshot");

export const FALLBACK_HOSPITALS_LIST = [
  {
    id: "hosp_lnjp",
    name: "Lok Nayak Hospital (LNJP / Civil Hospital)",
    lat: 28.6367,
    lon: 77.2403,
    emergency: "yes",
    type: "trauma",
    subType: "Major Trauma Centre & Tertiary Teaching Hospital",
    address: "Jawaharlal Nehru Marg, Delhi Gate",
    beds: 2000,
  },
  {
    id: "hosp_gb_pant",
    name: "Govind Ballabh Pant Hospital (G.B. Pant)",
    lat: 28.6375,
    lon: 77.2385,
    emergency: "yes",
    type: "trauma",
    subType: "Super-Speciality Government Hospital",
    address: "1, Jawaharlal Nehru Marg, Raj Ghat",
    beds: 714,
  },
  {
    id: "hosp_mamc",
    name: "Maulana Azad Medical College Hospital / Dental",
    lat: 28.6360,
    lon: 77.2395,
    emergency: "yes",
    type: "trauma",
    subType: "Tertiary Teaching Hospital",
    address: "BSZ Marg, near Delhi Gate",
    beds: 350,
  },
  {
    id: "hosp_guru_nanak",
    name: "Guru Nanak Eye Centre",
    lat: 28.6358,
    lon: 77.2340,
    emergency: "no",
    type: "specialty",
    subType: "Speciality Eye Institute",
    address: "Maharaja Ranjit Singh Marg",
    beds: 200,
  },
  {
    id: "hosp_northern_railway",
    name: "Northern Railway Central Hospital",
    lat: 28.6410,
    lon: 77.2145,
    emergency: "yes",
    type: "trauma",
    subType: "Divisional Railway Hospital & Trauma Unit",
    address: "Basant Lane, Paharganj / Connaught Place",
    beds: 450,
  },
  {
    id: "hosp_rml",
    name: "Dr. Ram Manohar Lohia Hospital (RML Hospital)",
    lat: 28.6245,
    lon: 77.2025,
    emergency: "yes",
    type: "trauma",
    subType: "Central Government Emergency & Super Speciality Hospital",
    address: "Baba Kharak Singh Marg",
    beds: 1420,
  },
  {
    id: "hosp_lady_hardinge",
    name: "Sucheta Kriplani Hospital (Lady Hardinge Medical College)",
    lat: 28.6335,
    lon: 77.2110,
    emergency: "yes",
    type: "trauma",
    subType: "Tertiary Women & General Hospital",
    address: "Shaheed Bhagat Singh Marg, Connaught Place",
    beds: 870,
  },
  {
    id: "hosp_kalawati_saran",
    name: "Kalawati Saran Children's Hospital",
    lat: 28.6322,
    lon: 77.2125,
    emergency: "yes",
    type: "trauma",
    subType: "Government Paediatric Centre",
    address: "Bangla Sahib Marg, Connaught Place",
    beds: 350,
  },
];

export function computeSha256(content: string): string {
  return crypto.createHash("sha256").update(content, "utf-8").digest("hex");
}

export async function freezeSnapshot(): Promise<{
  snapshotDir: string;
  filesWritten: string[];
  checksums: Record<string, string>;
}> {
  console.log("==================================================================");
  console.log(" RoadRisk Delhi - Freezing Offline Data Snapshot");
  console.log("==================================================================");

  if (!fs.existsSync(SNAPSHOT_DIR)) {
    fs.mkdirSync(SNAPSHOT_DIR, { recursive: true });
  }

  // 1. Load Road network: live Overpass if reachable, otherwise osm_corridor_roads.json, then fallbackRoads.json
  const { loadOfflineCorridorRoads } = await import("../roadsLoader.js");
  const offlineResult = loadOfflineCorridorRoads();
  const roads = offlineResult.roads;
  const roadSource = offlineResult.source;
  console.log(`[Snapshot] 1/7 Loaded ${roads.length} base roads using source: ${roadSource}`);

  // 2. Fetch or load Water Features
  const waterFeatures = await getWaterFeatures(CORRIDOR_CONFIG.bbox);
  console.log(`[Snapshot] 2/7 Loaded ${waterFeatures.length} water features.`);

  // 3. Build Segment Features
  const featResult = await buildSegmentFeatures(roads, FALLBACK_HOSPITALS_LIST.length, CORRIDOR_CONFIG.bbox);
  console.log(`[Snapshot] 3/7 Generated ${featResult.segments.length} road segments.`);

  // 4. Run Model Validation & Scoring
  const valResult = await runModelValidationAndScoring(
    featResult.segments,
    CORRIDOR_CONFIG.name,
    featResult.metadata.elevationAvailable
  );
  console.log(`[Snapshot] 4/7 Computed validation metrics. Winner: ${valResult.metricsFile.winner}`);

  // 5. Build Segment Closure Graph
  const graph = buildSegmentGraph(valResult.vulnerabilityFile.segments, FALLBACK_HOSPITALS_LIST);
  console.log(`[Snapshot] 5/7 Built closure graph. Connectivity: ${(graph.quality.largestComponentShare * 100).toFixed(1)}%`);

  // 6. Write Data Files
  const filesToWrite: Record<string, any> = {
    "roads.json": roads,
    "segments_features.json": featResult,
    "hospitals.json": FALLBACK_HOSPITALS_LIST,
    "water.json": waterFeatures,
    "hotspots.json": FLOOD_HOTSPOTS,
    "vulnerability_scores.json": valResult.vulnerabilityFile,
    "metrics.json": valResult.metricsFile,
    "closure_graph_quality.json": graph.quality,
  };

  const checksums: Record<string, string> = {};
  const writtenFilenames: string[] = [];

  for (const [filename, data] of Object.entries(filesToWrite)) {
    const formatted = JSON.stringify(data, null, 2);
    const filePath = path.join(SNAPSHOT_DIR, filename);
    fs.writeFileSync(filePath, formatted, "utf-8");
    try {
      const parentDataPath = path.resolve(__dirname, "../../../public/data", filename);
      fs.writeFileSync(parentDataPath, formatted, "utf-8");
    } catch (e) {
      // Ignore if directory doesn't exist
    }
    checksums[filename] = computeSha256(formatted);
    writtenFilenames.push(filename);
    console.log(`[Snapshot]   ✓ Wrote ${filename} (sha256: ${checksums[filename].slice(0, 12)}...)`);
  }

  // 7. Write snapshot-meta.json
  const positiveLabelsCount = featResult.segments.filter((s) => s.label_proxy === 1).length;
  const meta = {
    generatedAt: new Date().toISOString(),
    corridor: CORRIDOR_CONFIG.name,
    bbox: CORRIDOR_CONFIG.bbox,
    method: valResult.metricsFile.winner,
    counts: {
      roads: roads.length,
      segments: featResult.segments.length,
      hospitals: FALLBACK_HOSPITALS_LIST.length,
      waterFeatures: waterFeatures.length,
      hotspots: FLOOD_HOTSPOTS.length,
      positiveLabels: positiveLabelsCount,
    },
    roadSource,
    sha256: checksums,
    sourceNotes:
      `Frozen offline snapshot for Minto Bridge / ITO corridor (Central Delhi). Compiled from ${roadSource}, SRTM 30m elevation cache, Yamuna drainage hydrology, and hand-geocoded PWD/DTP monsoon advisories.`,
  };

  const metaFormatted = JSON.stringify(meta, null, 2);
  const metaPath = path.join(SNAPSHOT_DIR, "snapshot-meta.json");
  fs.writeFileSync(metaPath, metaFormatted, "utf-8");
  writtenFilenames.push("snapshot-meta.json");

  console.log(`[Snapshot]   ✓ Wrote snapshot-meta.json`);
  console.log("==================================================================");
  console.log(`🎉 Offline Snapshot successfully frozen in: ${SNAPSHOT_DIR}`);
  console.log("==================================================================");

  return {
    snapshotDir: SNAPSHOT_DIR,
    filesWritten: writtenFilenames,
    checksums,
  };
}

// Direct execution CLI support
if (process.argv[1] && process.argv[1].endsWith("freeze.ts")) {
  freezeSnapshot().catch((err) => {
    console.error("Failed to freeze snapshot:", err);
    process.exit(1);
  });
}
