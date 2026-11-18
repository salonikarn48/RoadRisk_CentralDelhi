/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * RoadRisk Delhi - Structural Vulnerability Index
 * Mandatory Regulatory Disclaimers
 */

export const DISCLAIMERS = {
  index: "Index of structural susceptibility, not a live flood forecast.",
  label: "Training label is a proxy: segment within ~100 m of a PWD/DTP-listed point. Not confirmed flood ground truth.",
  delay: "Relative extra delay estimated from road-class speeds, not real trip data.",
  oversight: "Tool informs, humans decide.",
} as const;

export type DisclaimerKey = keyof typeof DISCLAIMERS;
