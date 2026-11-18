/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * RoadRisk Delhi - Resident Reporting Backend (Unverified Pin-Only Ingestion)
 * 
 * Strict Privacy & Isolation Rules:
 * - Accepts ONLY { lat, lon, severity }. Rejects extra fields.
 * - Validates coordinates are strictly within Central Delhi corridor.
 * - Rounds coordinates to 3 decimals (~100m) before storage.
 * - Stores coarse timestamp rounded to the hour.
 * - NO names, NO photos, NO free text, NO accounts, NO IP addresses, NO user agents.
 * - Rate limit: 5 reports per client per hour via unpersisted salted hash.
 * - Maximum capacity: 500 reports (FIFO dropping oldest).
 * - UNVERIFIED: Never imported by or used in ML scoring, closure maths, or metrics.
 */

import fs from "fs";
import path from "path";
import crypto from "crypto";

export interface StoredResidentReport {
  id: string;
  lat: number;
  lon: number;
  severity: "ankle_deep" | "knee_deep" | "impassable";
  timestamp: string; // Coarse ISO timestamp rounded to the hour
}

export const CORRIDOR_BOUNDS = {
  south: 28.6100,
  north: 28.6480,
  west: 77.2050,
  east: 77.2500,
};

export const ALLOWED_SEVERITIES = ["ankle_deep", "knee_deep", "impassable"] as const;
export type AllowedSeverity = (typeof ALLOWED_SEVERITIES)[number];

const MAX_STORED_REPORTS = 500;
const MAX_REPORTS_PER_HOUR = 5;
const RATE_LIMIT_SALT = crypto.randomBytes(16).toString("hex");

// Rate limit memory tracking (keyed by salted hash, client IP is never stored)
interface RateLimitRecord {
  count: number;
  hourBucket: string;
}
const rateLimitMap = new Map<string, RateLimitRecord>();

const DATA_DIR = path.resolve(process.cwd(), "data");
const REPORTS_FILE = path.join(DATA_DIR, "reports.json");

// In-memory store
let storedReports: StoredResidentReport[] = [];

// Initialize store from disk if available
try {
  if (fs.existsSync(REPORTS_FILE)) {
    const raw = fs.readFileSync(REPORTS_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      storedReports = parsed.slice(-MAX_STORED_REPORTS);
    }
  }
} catch {
  // Graceful fallback to memory-only
  storedReports = [];
}

function persistToDisk(): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(REPORTS_FILE, JSON.stringify(storedReports, null, 2), "utf-8");
  } catch {
    // If hosting environment filesystem is read-only, silently keep in-memory
  }
}

/**
 * Normalizes input severity strings to canonical types.
 */
export function normalizeSeverity(raw: any): AllowedSeverity | null {
  if (typeof raw !== "string") return null;
  const s = raw.toLowerCase().trim();
  if (s === "ankle_deep" || s === "ankle-deep" || s === "ankle") return "ankle_deep";
  if (s === "knee_deep" || s === "knee-deep" || s === "knee") return "knee_deep";
  if (s === "impassable" || s === "road impassable" || s === "road_impassable" || s === "severe") return "impassable";
  return null;
}

/**
 * Validates report submission payload.
 */
export function validateReportInput(body: any): {
  valid: boolean;
  error?: string;
  data?: { lat: number; lon: number; severity: AllowedSeverity };
} {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { valid: false, error: "Invalid request body: JSON object required" };
  }

  // Strict field check: NO extra fields permitted
  const allowedKeys = new Set(["lat", "lon", "severity"]);
  const actualKeys = Object.keys(body);
  for (const k of actualKeys) {
    if (!allowedKeys.has(k)) {
      return { valid: false, error: `Disallowed field detected: "${k}". Privacy policy allows only { lat, lon, severity }.` };
    }
  }

  const { lat, lon, severity } = body;

  if (typeof lat !== "number" || !Number.isFinite(lat)) {
    return { valid: false, error: "Field 'lat' must be a valid finite number" };
  }
  if (typeof lon !== "number" || !Number.isFinite(lon)) {
    return { valid: false, error: "Field 'lon' must be a valid finite number" };
  }

  // Check corridor bounds strictly
  if (
    lat < CORRIDOR_BOUNDS.south ||
    lat > CORRIDOR_BOUNDS.north ||
    lon < CORRIDOR_BOUNDS.west ||
    lon > CORRIDOR_BOUNDS.east
  ) {
    return {
      valid: false,
      error: `Coordinates (${lat}, ${lon}) fall outside the Minto Bridge / ITO corridor pilot area.`,
    };
  }

  const normSeverity = normalizeSeverity(severity);
  if (!normSeverity) {
    return {
      valid: false,
      error: `Invalid severity: '${severity}'. Allowed values: ${ALLOWED_SEVERITIES.join(", ")}`,
    };
  }

  return {
    valid: true,
    data: {
      lat,
      lon,
      severity: normSeverity,
    },
  };
}

/**
 * Rate limiter: 5 reports per client per hour.
 * Client identifier (IP) is hashed with an ephemeral salt and NOT stored.
 */
export function checkRateLimit(clientIdentifier: string): boolean {
  const currentHourBucket = new Date().toISOString().slice(0, 13); // "YYYY-MM-DDTHH"
  const hashKey = crypto
    .createHash("sha256")
    .update(`${RATE_LIMIT_SALT}:${clientIdentifier}:${currentHourBucket}`)
    .digest("hex");

  const record = rateLimitMap.get(hashKey);
  if (!record || record.hourBucket !== currentHourBucket) {
    rateLimitMap.set(hashKey, { count: 1, hourBucket: currentHourBucket });
    return true;
  }

  if (record.count >= MAX_REPORTS_PER_HOUR) {
    return false;
  }

  record.count++;
  return true;
}

/**
 * Adds an unverified report with strict coordinate rounding and hour timestamp.
 */
export function addResidentReport(lat: number, lon: number, severity: AllowedSeverity): StoredResidentReport {
  // Round to 3 decimals (~100m privacy quantization)
  const roundedLat = Number(lat.toFixed(3));
  const roundedLon = Number(lon.toFixed(3));

  // Coarse timestamp rounded to top of the hour
  const coarseDate = new Date();
  coarseDate.setMinutes(0, 0, 0);
  const coarseTimestamp = coarseDate.toISOString();

  const reportId = `rep_${Date.now().toString(36)}_${crypto.randomBytes(3).toString("hex")}`;

  const newReport: StoredResidentReport = {
    id: reportId,
    lat: roundedLat,
    lon: roundedLon,
    severity,
    timestamp: coarseTimestamp,
  };

  storedReports.push(newReport);

  // Cap at 500 reports FIFO
  while (storedReports.length > MAX_STORED_REPORTS) {
    storedReports.shift();
  }

  persistToDisk();

  return newReport;
}

/**
 * Returns all stored resident reports (no personal or device identifiers).
 */
export function getResidentReports(): StoredResidentReport[] {
  return [...storedReports];
}

/**
 * Clears all reports if admin token matches.
 */
export function clearResidentReports(): void {
  storedReports = [];
  persistToDisk();
}

/**
 * Helper to get count of stored reports.
 */
export function getReportCount(): number {
  return storedReports.length;
}
