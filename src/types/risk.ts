/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * RoadRisk Delhi - Structural Vulnerability Index
 * Type Definitions: risk.ts
 */

export type ScoringMethod = "model" | "baseline" | "emergency_fallback";

export type ModeTier = "ml_model" | "baseline" | "emergency_fallback";
export type DataSource = "Live OSM" | "Frozen snapshot" | string;

export interface TopFactor {
  feature: string;
  contribution: number;
  label: string;
}

export interface VulnerabilitySegment {
  segmentId: string;
  parentRoadId: string;
  osm_way_id?: number | string;
  name: string;
  score: number;       // Rank-normalized 0 to 1 (1.0 = highest risk)
  rawScore: number;    // Raw probability or rule score
  rank: number;        // 1-indexed (1 is most vulnerable)
  method: ScoringMethod;
  geometry: Array<{ lat: number; lon: number }>;
  midpoint: { lat: number; lon: number };
  isWithin100mHotspot: boolean;
  oneway?: string | null;
  tunnel?: string | null;
  bridge?: string | null;
  layer?: string | number | null;
  maxspeed?: string | number | null;
  features: {
    elevation_mean: number | null;
    elevation_min: number | null;
    low_point_depth_m: number | null;
    dist_to_water_m: number;
    is_underpass: boolean;
    highway_class: string;
    length_m: number;
    lanes: number;
    oneway?: string | null;
    tunnel?: string | null;
    bridge?: string | null;
    layer?: string | number | null;
    maxspeed?: string | number | null;
  };
  topFactors: TopFactor[];
}

export interface VulnerabilityFile {
  generatedAt: string;
  corridor: string;
  method: ScoringMethod;
  label: string;
  segmentCount: number;
  disclaimers: Record<string, string>;
  segments: VulnerabilitySegment[];
}

export interface EvaluationMetrics {
  rocAuc: number;
  precisionAt10: number;
  recallAt10: number;
  precisionAt20: number;
  recallAt20: number;
  precisionAt5pct: number;
  recallAt5pct: number;
  liftAt10?: number;
  liftAt20?: number;
  liftAt5pct?: number;
}

export interface ConfidenceInterval {
  low: number;
  high: number;
  median: number;
}

export interface ConfidenceIntervalsReport {
  resamples: number;
  level: number;
  baselineRocAuc: ConfidenceInterval | null;
  modelRocAuc: ConfidenceInterval | null;
  notes: string;
}

export interface BeyondTheListSegment {
  segmentId: string;
  name: string;
  score: number;
  rank: number;
  reason: string;
  highwayClass: string;
  isUnderpass: boolean;
  lowPointDepthM: number | null;
}

export interface BeyondTheListReport {
  top5PercentTotal: number;
  unlistedCount: number;
  unlistedSharePercent: number;
  baseRatePercent: number;
  top5UnlistedSegments: BeyondTheListSegment[];
  caution: string;
  top10PercentTotal?: number;
}

export interface FailureMetrics {
  avgExtraDelayMin: number;
  areasCutOff: number;
  areasWithDelayOver10Min: number;
}

export interface RandomFailureMetrics {
  drawsCount: number;
  avgExtraDelayMinMean: number;
  avgExtraDelayMinMin: number;
  avgExtraDelayMinMax: number;
  areasCutOffMean: number;
  areasCutOffMin: number;
  areasCutOffMax: number;
  areasWithDelayOver10MinMean: number;
  areasWithDelayOver10MinMin: number;
  areasWithDelayOver10MinMax: number;
}

export interface RankingComparisonTier {
  percent: number;
  numClosed: number;
  model: FailureMetrics;
  baseline: FailureMetrics;
  random: RandomFailureMetrics;
}

export interface SanityChecksReport {
  beyondTheList: BeyondTheListReport;
  rankingVsRandom: {
    tiers: RankingComparisonTier[];
    verdict: string;
  };
}

export interface MLMetricsFile {
  generatedAt: string;
  corridor: string;
  cvScheme: string;
  foldsTotal: number;
  foldsUsable: number;
  positiveCount: number;
  totalSegments: number;
  baseRate?: number;
  baseRatePercent?: string;
  winner: ScoringMethod;
  baseline: EvaluationMetrics;
  model: EvaluationMetrics;
  featureImportance: Record<string, number>;
  confidenceIntervals?: ConfidenceIntervalsReport;
  sanityChecks?: SanityChecksReport;
  notes: string;
}

export interface PreflightSelfChecks {
  scores_valid: boolean;
  closure_0_percent: boolean;
  closure_10_percent: boolean;
  closure_segments_exist: boolean;
}

export interface HealthResponse {
  ok: boolean;
  mode_tier: ModeTier;
  mode_label: string;
  data_source: DataSource;
  snapshot_age_hours: number | null;
  segment_count: number;
  graph_segment_count?: number;
  graph_edge_count?: number;
  hospital_count: number;
  graph_connectivity_share: number;
  last_pipeline_error: string | null;
  self_checks: PreflightSelfChecks;
  all_checks_passed: boolean;
  message?: string;
}
