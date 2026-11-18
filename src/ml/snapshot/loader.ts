/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * RoadRisk Delhi - Structural Vulnerability Index
 * Module: loader.ts
 * 
 * Manages loading and integrity verification for the frozen offline data snapshot.
 */

import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";
import type { VulnerabilityFile, MLMetricsFile } from "../../types/risk.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const SNAPSHOT_DIR = path.resolve(__dirname, "../../../public/data/snapshot");

export interface SnapshotMeta {
  generatedAt: string;
  corridor: string;
  bbox: { south: number; west: number; north: number; east: number };
  method: string;
  counts: {
    roads: number;
    segments: number;
    hospitals: number;
    waterFeatures: number;
    hotspots: number;
    positiveLabels: number;
  };
  sha256: Record<string, string>;
  sourceNotes: string;
}

/**
 * Checks if the frozen snapshot directory and metadata file exist.
 */
export function isSnapshotAvailable(): boolean {
  try {
    const metaPath = path.join(SNAPSHOT_DIR, "snapshot-meta.json");
    const scoresPath = path.join(SNAPSHOT_DIR, "vulnerability_scores.json");
    return fs.existsSync(metaPath) && fs.existsSync(scoresPath);
  } catch {
    return false;
  }
}

/**
 * Loads snapshot-meta.json and computes age in hours.
 */
export function getSnapshotMeta(): { meta: SnapshotMeta | null; ageHours: number | null } {
  try {
    const metaPath = path.join(SNAPSHOT_DIR, "snapshot-meta.json");
    if (!fs.existsSync(metaPath)) {
      return { meta: null, ageHours: null };
    }
    const raw = fs.readFileSync(metaPath, "utf-8");
    const meta: SnapshotMeta = JSON.parse(raw);
    const genTime = new Date(meta.generatedAt).getTime();
    const ageHours = Number(((Date.now() - genTime) / (1000 * 60 * 60)).toFixed(2));
    return { meta, ageHours: isNaN(ageHours) ? null : ageHours };
  } catch (err) {
    console.warn("Could not read snapshot-meta.json:", err);
    return { meta: null, ageHours: null };
  }
}

/**
 * Verifies that all snapshot file checksums match snapshot-meta.json.
 */
export function verifySnapshotIntegrity(): {
  valid: boolean;
  errors: string[];
  filesChecked: number;
} {
  const { meta } = getSnapshotMeta();
  if (!meta) {
    return { valid: false, errors: ["snapshot-meta.json not found"], filesChecked: 0 };
  }

  const errors: string[] = [];
  let filesChecked = 0;

  for (const [filename, expectedSha] of Object.entries(meta.sha256)) {
    const filePath = path.join(SNAPSHOT_DIR, filename);
    if (!fs.existsSync(filePath)) {
      errors.push(`Missing snapshot file: ${filename}`);
      continue;
    }
    const content = fs.readFileSync(filePath, "utf-8");
    const actualSha = crypto.createHash("sha256").update(content, "utf-8").digest("hex");
    if (actualSha !== expectedSha) {
      errors.push(`Checksum mismatch for ${filename}: expected ${expectedSha}, got ${actualSha}`);
    }
    filesChecked++;
  }

  return {
    valid: errors.length === 0,
    errors,
    filesChecked,
  };
}

/**
 * Loads parsed JSON data from snapshot file without throwing.
 */
export function readSnapshotFile<T = any>(filename: string): T | null {
  try {
    const filePath = path.join(SNAPSHOT_DIR, filename);
    if (!fs.existsSync(filePath)) {
      console.warn(`[Snapshot] Warning: Snapshot file ${filename} not found in ${SNAPSHOT_DIR}.`);
      return null;
    }
    const raw = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(raw);
  } catch (err: any) {
    console.warn(`[Snapshot] Warning: Error reading snapshot file ${filename}:`, err?.message || err);
    return null;
  }
}

export function loadSnapshotVulnerability(): VulnerabilityFile {
  const data = readSnapshotFile<VulnerabilityFile>("vulnerability_scores.json");
  if (data) return data;
  return {
    generatedAt: new Date().toISOString(),
    corridor: "Minto Bridge / ITO corridor, Central Delhi",
    method: "baseline",
    label: "Corridor Baseline",
    segmentCount: 0,
    disclaimers: {
      uncertainty: "Data snapshot not initialized.",
    },
    segments: [],
  };
}

export function loadSnapshotMetrics(): MLMetricsFile {
  const data = readSnapshotFile<MLMetricsFile>("metrics.json");
  if (data) return data;
  const emptyMetrics = {
    rocAuc: 0.5,
    precisionAt10: 0,
    recallAt10: 0,
    precisionAt20: 0,
    recallAt20: 0,
    precisionAt5pct: 0,
    recallAt5pct: 0,
  };
  return {
    generatedAt: new Date().toISOString(),
    corridor: "Minto Bridge / ITO corridor, Central Delhi",
    cvScheme: "Spatial GroupKFold (500m blocks)",
    foldsTotal: 5,
    foldsUsable: 5,
    positiveCount: 0,
    totalSegments: 0,
    winner: "baseline",
    baseline: emptyMetrics,
    model: emptyMetrics,
    featureImportance: {},
    notes: "Data snapshot not initialized.",
  };
}

export function loadSnapshotRoads(): any[] {
  return readSnapshotFile<any[]>("roads.json") || [];
}

export function loadSnapshotHospitals(): any[] {
  return readSnapshotFile<any[]>("hospitals.json") || [];
}
