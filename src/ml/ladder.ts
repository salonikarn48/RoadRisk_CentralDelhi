/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * RoadRisk Delhi - Structural Vulnerability Index
 * Module: ladder.ts
 * 
 * Three-Tier Mode Ladder:
 * Tier 1: "ML model" (Random Forest classifier on topographical features)
 * Tier 2: "Labelled baseline" (Transparent civil engineering rule-based baseline)
 * Tier 3: "Emergency fallback" (Hotspot proximity + underpass tags on bundled corridor graph)
 */

import type { ModeTier, ScoringMethod } from "../types/risk.js";

export interface TierInfo {
  tier: ModeTier;
  method: ScoringMethod;
  label: string;
  description: string;
  isEmergency: boolean;
  requiresMetrics: boolean;
}

export const TIER_CONFIG: Record<ModeTier, TierInfo> = {
  ml_model: {
    tier: "ml_model",
    method: "model",
    label: "ML model",
    description: "Trained Random Forest ensemble model scoring structural waterlogging susceptibility from physical terrain geometry.",
    isEmergency: false,
    requiresMetrics: true,
  },
  baseline: {
    tier: "baseline",
    method: "baseline",
    label: "Labelled baseline",
    description: "Transparent rule-based physical baseline: underpass tag, low-point depression depth, distance to Yamuna/drains, and road class.",
    isEmergency: false,
    requiresMetrics: true,
  },
  emergency_fallback: {
    tier: "emergency_fallback",
    method: "emergency_fallback",
    label: "Emergency fallback",
    description: "Emergency fallback: illustrative score from listed hotspots and underpass tags on a simplified corridor graph. Not validated.",
    isEmergency: true,
    requiresMetrics: false,
  },
};

/**
 * Resolves the appropriate mode tier according to data availability and validation results.
 * Rules:
 * - With elevation/features missing entirely: Tier 3 ("Emergency fallback")
 * - With too few positives (<10): Tier 2 ("Labelled baseline")
 * - If spatial cross-validation was won by baseline: Tier 2 ("Labelled baseline")
 * - Otherwise: Tier 1 ("ML model")
 */
export function resolveModeTier(options: {
  elevationAvailable: boolean;
  positiveCount: number;
  segmentCount: number;
  winner?: ScoringMethod;
  forceTier?: ModeTier;
}): TierInfo {
  if (options.forceTier) {
    return TIER_CONFIG[options.forceTier];
  }

  // Tier 3: ONLY if segment features or elevation are missing entirely
  if (!options.elevationAvailable || options.segmentCount === 0) {
    return TIER_CONFIG.emergency_fallback;
  }

  // Tier 2: Too few positives for ML training
  if (options.positiveCount < 10) {
    return TIER_CONFIG.baseline;
  }

  // Tier 2: Baseline outperformed ML model on spatial cross-validation
  if (options.winner === "baseline") {
    return TIER_CONFIG.baseline;
  }

  // Tier 1: ML Model
  return TIER_CONFIG.ml_model;
}
