/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * RoadRisk Delhi - Structural Vulnerability Index
 * Module: baseline.ts
 * Transparent, rule-based baseline scoring model.
 * Formula:
 *   Score = 0.50 * is_underpass +
 *           0.30 * norm_low_point_depth_m +
 *           0.10 * norm_inv_dist_to_water +
 *           0.10 * norm_highway_class
 * 
 * LEAKAGE GUARD:
 *   NEVER uses dist_to_nearest_hotspot_m, label_proxy, or any hotspot proximity.
 *   Weights are fixed apriori from civil engineering knowledge, NOT tuned on labels.
 */

import type { RoadSegmentFeature } from "./features.js";
import type { TopFactor } from "../types/risk.js";

export const BASELINE_WEIGHTS = {
  UNDERPASS: 0.5,     // Underpasses / sunken cuts are primary structural waterlogging traps
  LOW_POINT: 0.3,     // Relative depth below 300m surrounding terrain drives gravity runoff accumulation
  INV_WATER: 0.1,     // Proximity to river Yamuna / outfall drains increases drainage head resistance
  ROAD_CLASS: 0.1,    // Major multi-lane arterials with wider impervious surface area collect more runoff
} as const;

// Road class susceptibility scale
const HIGHWAY_CLASS_WEIGHTS: Record<string, number> = {
  motorway: 1.0,
  trunk: 0.9,
  primary: 0.8,
  secondary: 0.6,
  tertiary: 0.4,
  residential: 0.2,
  unclassified: 0.2,
  service: 0.1,
  road: 0.2,
};

export interface BaselineScoreResult {
  segmentId: string;
  rawScore: number;
  topFactors: TopFactor[];
  normalizedTerms: {
    underpassTerm: number;
    lowPointTerm: number;
    invWaterTerm: number;
    roadClassTerm: number;
  };
}

/**
 * Normalizes values across the dataset and scores each segment using the baseline rule.
 */
export function scoreSegmentsBaseline(
  segments: RoadSegmentFeature[],
  elevationAvailable = true
): Map<string, BaselineScoreResult> {
  // 1. Compute min / max bounds across segments for normalization
  let minDepth = Infinity;
  let maxDepth = -Infinity;
  let minDistToWater = Infinity;
  let maxDistToWater = -Infinity;

  for (const s of segments) {
    if (elevationAvailable && s.low_point_depth_m !== null && !isNaN(s.low_point_depth_m)) {
      if (s.low_point_depth_m < minDepth) minDepth = s.low_point_depth_m;
      if (s.low_point_depth_m > maxDepth) maxDepth = s.low_point_depth_m;
    }
    if (!isNaN(s.dist_to_water_m)) {
      if (s.dist_to_water_m < minDistToWater) minDistToWater = s.dist_to_water_m;
      if (s.dist_to_water_m > maxDistToWater) maxDistToWater = s.dist_to_water_m;
    }
  }

  if (minDepth === Infinity) {
    minDepth = 0;
    maxDepth = 1;
  }
  if (minDistToWater === Infinity) {
    minDistToWater = 0;
    maxDistToWater = 10000;
  }

  const depthRange = maxDepth - minDepth || 1;
  const waterRange = maxDistToWater - minDistToWater || 1;

  const results = new Map<string, BaselineScoreResult>();

  for (const s of segments) {
    // Term 1: Underpass (0 or 1)
    const normUnderpass = s.is_underpass ? 1.0 : 0.0;
    const underpassTerm = BASELINE_WEIGHTS.UNDERPASS * normUnderpass;

    // Term 2: Low point depth (positive = depression, 0 if elevation not available)
    let normLowPoint = 0;
    if (elevationAvailable && s.low_point_depth_m !== null && !isNaN(s.low_point_depth_m)) {
      normLowPoint = Math.max(0, Math.min(1, (s.low_point_depth_m - minDepth) / depthRange));
    }
    const lowPointTerm = BASELINE_WEIGHTS.LOW_POINT * normLowPoint;

    // Term 3: Inverse distance to water (closer to water = higher vulnerability)
    const normInvWater = Math.max(0, Math.min(1, (maxDistToWater - s.dist_to_water_m) / waterRange));
    const invWaterTerm = BASELINE_WEIGHTS.INV_WATER * normInvWater;

    // Term 4: Highway class hierarchy
    const hwKey = (s.highway_class || "residential").toLowerCase();
    const normHwClass = HIGHWAY_CLASS_WEIGHTS[hwKey] ?? 0.2;
    const roadClassTerm = BASELINE_WEIGHTS.ROAD_CLASS * normHwClass;

    const rawScore = Number((underpassTerm + lowPointTerm + invWaterTerm + roadClassTerm).toFixed(4));

    // Determine top 3 contributing factors
    const factors: TopFactor[] = [
      {
        feature: "is_underpass",
        contribution: Number(underpassTerm.toFixed(4)),
        label: s.is_underpass ? "Subterranean Railway/Road Underpass" : "Surface Road Corridor",
      },
      {
        feature: "low_point_depth_m",
        contribution: Number(lowPointTerm.toFixed(4)),
        label: s.low_point_depth_m !== null && s.low_point_depth_m > 0
          ? `Topographic Depression (+${s.low_point_depth_m.toFixed(2)}m below surroundings)`
          : "Uniform or Elevated Ground",
      },
      {
        feature: "dist_to_water_m",
        contribution: Number(invWaterTerm.toFixed(4)),
        label: `Water Corridor Proximity (${(s.dist_to_water_m / 1000).toFixed(2)}km to Yamuna/Drain)`,
      },
      {
        feature: "highway_class",
        contribution: Number(roadClassTerm.toFixed(4)),
        label: `Corridor Scale (${s.highway_class.toUpperCase()}, ${s.lanes} lanes)`,
      },
    ];

    // Sort descending by contribution and pick top 3
    factors.sort((a, b) => b.contribution - a.contribution);
    const topFactors = factors.slice(0, 3);

    results.set(s.segmentId, {
      segmentId: s.segmentId,
      rawScore,
      topFactors,
      normalizedTerms: {
        underpassTerm,
        lowPointTerm,
        invWaterTerm,
        roadClassTerm,
      },
    });
  }

  return results;
}
