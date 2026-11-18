/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * RoadRisk Delhi - Closure Scenario Constants
 * Module: constants.ts
 * Single source of truth for road-class speeds, delay thresholds, and snapping limits.
 */

export const ROAD_CLASS_SPEED_KMH: Record<string, number> = {
  motorway: 60,
  motorway_link: 50,
  trunk: 45,
  trunk_link: 35,
  primary: 35,
  primary_link: 30,
  secondary: 30,
  secondary_link: 25,
  tertiary: 25,
  tertiary_link: 20,
  residential: 20,
  living_street: 15,
  unclassified: 15,
  service: 15,
  other: 15,
};

export interface RoadSpeedTags {
  maxspeed?: string | number | null;
  tunnel?: string | null;
  bridge?: string | null;
  layer?: string | number | null;
  oneway?: string | null;
}

export function getRoadSpeedKmh(
  highwayClass?: string,
  tags?: RoadSpeedTags
): number {
  const key = highwayClass ? highwayClass.toLowerCase().trim() : "other";
  let speed = ROAD_CLASS_SPEED_KMH[key] ?? ROAD_CLASS_SPEED_KMH.other;

  if (tags?.maxspeed) {
    const parsed = parseInt(String(tags.maxspeed).replace(/\D.*$/, ""), 10);
    if (!isNaN(parsed) && parsed >= 10 && parsed <= 120) {
      speed = parsed;
    }
  }

  // Tunnels / subterranean cuts often have lower safe speeds
  if (tags?.tunnel && tags.tunnel !== "no") {
    speed = Math.min(speed, 35);
  }

  return speed;
}

/**
 * Calculates travel time in minutes for a segment length and speed.
 * time = (length_m / 1000) / speed_kmh * 60
 */
export function calculateTravelTimeMinutes(lengthMeters: number, speedKmh: number): number {
  if (speedKmh <= 0) return 0;
  return Number(((lengthMeters / 1000) / speedKmh * 60).toFixed(4));
}

// Snapping and Grid Constraints
export const CLOSURE_CONFIG = {
  NODE_SNAP_INITIAL_TOLERANCE_M: 8,   // Initial endpoint snapping radius
  NODE_SNAP_MAX_TOLERANCE_M: 15,      // Expanded tolerance if largest component < 90%
  HOSPITAL_SNAP_TOLERANCE_M: 250,     // Drop hospital if > 250m from road network
  ORIGIN_GRID_SPACING_M: 400,         // ~400m cell grid for sample origins
  ORIGIN_SNAP_TOLERANCE_M: 150,       // Max distance from grid cell center to road node
  MAX_ORIGINS_CAP: 60,                // Cap sample origins at ~60 areas
} as const;

// Origin delay thresholds for visual map markers
export const DELAY_THRESHOLDS_MIN = {
  LOW_MAX: 2.0,      // Extra delay < 2 min -> Green
  MODERATE_MAX: 10.0, // Extra delay 2 - 10 min -> Amber
  // Extra delay > 10 min -> Red
  // Cut-off (null / disconnected) -> Black with 'X'
} as const;

export const DELAY_COLORS = {
  LOW: "#10B981",       // Emerald Green
  MODERATE: "#F59E0B",  // Amber Orange
  HIGH: "#EF4444",      // Bright Red
  CUT_OFF: "#18181B",   // Pitch Black / Zinc 900
} as const;

export interface CorridorHospitalInput {
  id: string;
  name: string;
  lat: number;
  lon: number;
  emergency?: string;
  beds?: number;
}

export const DEFAULT_CORRIDOR_HOSPITALS: CorridorHospitalInput[] = [
  {
    id: "hosp_lnjp",
    name: "Lok Nayak Hospital (LNJP)",
    lat: 28.6367,
    lon: 77.2403,
    emergency: "yes",
    beds: 2000,
  },
  {
    id: "hosp_gb_pant",
    name: "Govind Ballabh Pant Hospital (G.B. Pant)",
    lat: 28.6375,
    lon: 77.2385,
    emergency: "yes",
    beds: 714,
  },
  {
    id: "hosp_mamc",
    name: "Maulana Azad Medical College (MAMC)",
    lat: 28.6360,
    lon: 77.2395,
    emergency: "yes",
    beds: 350,
  },
  {
    id: "hosp_guru_nanak",
    name: "Guru Nanak Eye Centre",
    lat: 28.6358,
    lon: 77.2340,
    emergency: "no",
    beds: 200,
  },
  {
    id: "hosp_northern_railway",
    name: "Northern Railway Central Hospital",
    lat: 28.6410,
    lon: 77.2145,
    emergency: "yes",
    beds: 450,
  },
  {
    id: "hosp_rml",
    name: "Dr. Ram Manohar Lohia Hospital (RML)",
    lat: 28.6245,
    lon: 77.2025,
    emergency: "yes",
    beds: 1420,
  },
  {
    id: "hosp_lady_hardinge",
    name: "Sucheta Kriplani Hospital (Lady Hardinge)",
    lat: 28.6335,
    lon: 77.2110,
    emergency: "yes",
    beds: 870,
  },
  {
    id: "hosp_kalawati_saran",
    name: "Kalawati Saran Children's Hospital",
    lat: 28.6322,
    lon: 77.2125,
    emergency: "yes",
    beds: 350,
  },
];

