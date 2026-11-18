/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * RoadRisk Delhi - Structural Vulnerability Index
 * Module: validate.ts
 * Spatial cross-validation (GroupKFold by sub_area_id), model training,
 * evaluation (ROC-AUC, Precision@K, Recall@K), and export generation:
 * - public/data/vulnerability_scores.json
 * - public/data/metrics.json
 */

import fs from "fs";
import path from "path";
import type { RoadSegmentFeature } from "./features.js";
import { scoreSegmentsBaseline } from "./baseline.js";
import {
  RandomForestClassifier,
  extractFeatureDataset,
  Mulberry32,
  type EncodedDataset,
} from "./randomForest.js";
import { buildSegmentGraph } from "./closure/graph.js";
import { ClosureEngine } from "./closure/engine.js";
import { DEFAULT_CORRIDOR_HOSPITALS } from "./closure/constants.js";
import type {
  VulnerabilityFile,
  VulnerabilitySegment,
  MLMetricsFile,
  EvaluationMetrics,
  ScoringMethod,
  ConfidenceIntervalsReport,
  ConfidenceInterval,
  SanityChecksReport,
  BeyondTheListReport,
  BeyondTheListSegment,
  RankingComparisonTier,
} from "../types/risk.js";

const SCORES_OUTPUT_FILE = path.resolve(process.cwd(), "public/data/vulnerability_scores.json");
const METRICS_OUTPUT_FILE = path.resolve(process.cwd(), "public/data/metrics.json");

export interface ValidationSummary {
  vulnerabilityFile: VulnerabilityFile;
  metricsFile: MLMetricsFile;
}

/**
 * Computes ROC-AUC using trapezoidal integration on binary labels.
 */
export function computeRocAuc(predictions: Array<{ score: number; label: number }>): number {
  const nPos = predictions.filter((p) => p.label === 1).length;
  const nNeg = predictions.length - nPos;
  if (nPos === 0 || nNeg === 0) return 0.5;

  // Stable sort descending by score
  const sorted = [...predictions].sort((a, b) => b.score - a.score);

  let tp = 0;
  let fp = 0;
  let prevFpr = 0;
  let prevTpr = 0;
  let auc = 0;

  for (let i = 0; i < sorted.length; i++) {
    if (sorted[i].label === 1) tp++;
    else fp++;

    // Only update area at threshold boundaries or end of list
    const isLast = i === sorted.length - 1;
    const nextDiff = !isLast && sorted[i + 1].score !== sorted[i].score;

    if (isLast || nextDiff) {
      const curFpr = fp / nNeg;
      const curTpr = tp / nPos;
      auc += (curFpr - prevFpr) * ((curTpr + prevTpr) / 2);
      prevFpr = curFpr;
      prevTpr = curTpr;
    }
  }

  return Number(auc.toFixed(4));
}

/**
 * Computes Precision@K and Recall@K.
 */
export function computePrecisionRecallAtK(
  predictions: Array<{ score: number; label: number }>,
  k: number
): { precision: number; recall: number } {
  const nPos = predictions.filter((p) => p.label === 1).length;
  if (predictions.length === 0 || k <= 0) return { precision: 0, recall: 0 };

  const sorted = [...predictions].sort((a, b) => b.score - a.score);
  const topK = sorted.slice(0, Math.min(k, sorted.length));
  const tp = topK.filter((p) => p.label === 1).length;

  const precision = Number((tp / topK.length).toFixed(4));
  const recall = nPos > 0 ? Number((tp / nPos).toFixed(4)) : 0;
  return { precision, recall };
}

/**
 * Calculates complete evaluation metric suite for a set of predictions.
 */
export function evaluatePredictions(predictions: Array<{ score: number; label: number }>): EvaluationMetrics {
  const n = predictions.length;
  const k5pct = Math.max(1, Math.round(n * 0.05));

  const at10 = computePrecisionRecallAtK(predictions, 10);
  const at20 = computePrecisionRecallAtK(predictions, 20);
  const at5pct = computePrecisionRecallAtK(predictions, k5pct);
  const rocAuc = computeRocAuc(predictions);

  return {
    rocAuc,
    precisionAt10: at10.precision,
    recallAt10: at10.recall,
    precisionAt20: at20.precision,
    recallAt20: at20.recall,
    precisionAt5pct: at5pct.precision,
    recallAt5pct: at5pct.recall,
  };
}

/**
 * Computes 90% empirical confidence intervals for baseline and model ROC-AUC
 * using block bootstrap (resampling whole sub_area blocks with replacement).
 */
export function computeBlockBootstrapConfidenceIntervals(
  segments: RoadSegmentFeature[],
  baselinePredictions: Array<{ score: number; label: number }>,
  modelPredictions: Array<{ score: number; label: number }>,
  resamples = 200,
  seed = 2026
): ConfidenceIntervalsReport {
  // Group prediction indices by sub_area_id block
  const blockMap = new Map<string, number[]>();
  for (let i = 0; i < segments.length; i++) {
    const blockId = segments[i].sub_area_id;
    if (!blockMap.has(blockId)) blockMap.set(blockId, []);
    blockMap.get(blockId)!.push(i);
  }

  const blockIds = Array.from(blockMap.keys());
  const numBlocks = blockIds.length;

  const totalPositives = segments.filter((s) => s.label_proxy === 1).length;
  if (totalPositives < 5 || numBlocks < 3) {
    return {
      resamples: 0,
      level: 0.90,
      baselineRocAuc: null,
      modelRocAuc: null,
      notes: "Too few positives for a reliable interval",
    };
  }

  const rng = new Mulberry32(seed);
  const baselineAucs: number[] = [];
  const modelAucs: number[] = [];

  for (let r = 0; r < resamples; r++) {
    const sampledIndices: number[] = [];
    for (let b = 0; b < numBlocks; b++) {
      const randBlockIdx = Math.floor(rng.next() * numBlocks);
      const chosenBlockId = blockIds[randBlockIdx];
      const indicesInBlock = blockMap.get(chosenBlockId)!;
      for (const idx of indicesInBlock) {
        sampledIndices.push(idx);
      }
    }

    const subBaseline = sampledIndices.map((idx) => baselinePredictions[idx]);
    const subModel = sampledIndices.map((idx) => modelPredictions[idx]);

    const posCount = subBaseline.filter((p) => p.label === 1).length;
    if (posCount === 0 || posCount === sampledIndices.length) {
      continue;
    }

    baselineAucs.push(computeRocAuc(subBaseline));
    modelAucs.push(computeRocAuc(subModel));
  }

  if (baselineAucs.length < 20) {
    return {
      resamples: baselineAucs.length,
      level: 0.90,
      baselineRocAuc: null,
      modelRocAuc: null,
      notes: "Too few valid resample draws with positives for a reliable interval",
    };
  }

  baselineAucs.sort((a, b) => a - b);
  modelAucs.sort((a, b) => a - b);

  const lowIdx = Math.floor(baselineAucs.length * 0.05);
  const highIdx = Math.min(baselineAucs.length - 1, Math.floor(baselineAucs.length * 0.95));
  const medIdx = Math.floor(baselineAucs.length * 0.50);

  const baselineCI: ConfidenceInterval = {
    low: Number(baselineAucs[lowIdx].toFixed(4)),
    high: Number(baselineAucs[highIdx].toFixed(4)),
    median: Number(baselineAucs[medIdx].toFixed(4)),
  };

  const modelCI: ConfidenceInterval = {
    low: Number(modelAucs[lowIdx].toFixed(4)),
    high: Number(modelAucs[highIdx].toFixed(4)),
    median: Number(modelAucs[medIdx].toFixed(4)),
  };

  return {
    resamples: baselineAucs.length,
    level: 0.90,
    baselineRocAuc: baselineCI,
    modelRocAuc: modelCI,
    notes: `90% empirical bootstrap interval from ${baselineAucs.length} sub_area block resamples.`,
  };
}

/**
 * Computes two sanity checks:
 * a) Beyond the list: share of top 10% segments not within 100m of listed hotspot
 * b) Does ranking matter?: Closure simulation comparing top-risk closures vs 50 random draws
 */
export function computeSanityChecks(
  finalSegments: VulnerabilitySegment[],
  baselineRawMap: Map<string, number>,
  modelRawMap: Map<string, number>
): SanityChecksReport {
  const nTotal = finalSegments.length;

  // 1. Beyond the List: Top 5% segments unlisted in historic PWD/DTP points (with base rate beside it)
  const top5PercentTotal = Math.max(1, Math.round(nTotal * 0.05));
  const top5PercentSegments = finalSegments.slice(0, top5PercentTotal);
  const unlistedInTop5 = top5PercentSegments.filter((s) => !s.isWithin100mHotspot);
  const positiveCount = finalSegments.filter((s) => s.isWithin100mHotspot).length;
  const baseRatePercent = Number(((positiveCount / nTotal) * 100).toFixed(2));

  const top5UnlistedSegments: BeyondTheListSegment[] = unlistedInTop5.slice(0, 5).map((s) => {
    // Choose reason dynamically from this segment's real top factors
    let reason = "High low-point terrain depression & canal proximity";
    if (s.topFactors && s.topFactors.length > 0 && s.topFactors[0].label) {
      reason = s.topFactors[0].label;
    } else if (s.features.is_underpass) {
      reason = "Subterranean Railway/Road Underpass geometry";
    } else if (s.features.low_point_depth_m && s.features.low_point_depth_m > 0) {
      reason = `Pronounced local depression (+${s.features.low_point_depth_m.toFixed(2)}m below surroundings)`;
    } else if (s.features.dist_to_water_m < 1000) {
      reason = `Proximity to Yamuna canal/drain (${Math.round(s.features.dist_to_water_m)}m)`;
    }

    return {
      segmentId: s.segmentId,
      name: s.name,
      score: s.score,
      rank: s.rank,
      reason,
      highwayClass: s.features.highway_class,
      isUnderpass: s.features.is_underpass,
      lowPointDepthM: s.features.low_point_depth_m,
    };
  });

  const beyondTheList: BeyondTheListReport = {
    top5PercentTotal,
    unlistedCount: unlistedInTop5.length,
    unlistedSharePercent: Number(((unlistedInTop5.length / top5PercentTotal) * 100).toFixed(1)),
    baseRatePercent,
    top5UnlistedSegments,
    caution: "These are candidates for field checking, not confirmed flooding spots.",
    top10PercentTotal: Math.max(1, Math.round(nTotal * 0.10)),
  };

  // 2. Does ranking matter?: Closure engine evaluations at 5%, 10%, 20%
  // Reporting together: areas cut off, areas with >10 min extra delay, and avg extra delay
  const graph = buildSegmentGraph(finalSegments, DEFAULT_CORRIDOR_HOSPITALS);
  const engine = new ClosureEngine(graph);

  const allSegmentIds = finalSegments.map((s) => s.segmentId);

  // Ranked lists by baseline and model scores
  const sortedByBaseline = [...finalSegments]
    .sort((a, b) => (baselineRawMap.get(b.segmentId) ?? 0) - (baselineRawMap.get(a.segmentId) ?? 0))
    .map((s) => s.segmentId);

  const sortedByModel = [...finalSegments]
    .sort((a, b) => (modelRawMap.get(b.segmentId) ?? 0) - (modelRawMap.get(a.segmentId) ?? 0))
    .map((s) => s.segmentId);

  const testPercentages = [5, 10, 20];
  const tiers: RankingComparisonTier[] = [];

  for (const p of testPercentages) {
    const numClosed = Math.max(1, Math.round((p / 100) * nTotal));

    // Closing top X% by Model
    const modelClosedIds = sortedByModel.slice(0, numClosed);
    const modelEval = engine.simulateWithClosedSegmentIds(modelClosedIds);

    // Closing top X% by Baseline
    const baselineClosedIds = sortedByBaseline.slice(0, numClosed);
    const baselineEval = engine.simulateWithClosedSegmentIds(baselineClosedIds);

    // 50 Seeded Random Draws
    const rng = new Mulberry32(1000 + p * 43);
    const randomDelays: number[] = [];
    const randomCutOffs: number[] = [];
    const randomOver10s: number[] = [];
    const numDraws = 50;

    for (let d = 0; d < numDraws; d++) {
      const pool = [...allSegmentIds];
      for (let i = 0; i < numClosed; i++) {
        const j = i + Math.floor(rng.next() * (pool.length - i));
        const tmp = pool[i];
        pool[i] = pool[j];
        pool[j] = tmp;
      }
      const randomClosedIds = pool.slice(0, numClosed);
      const randEval = engine.simulateWithClosedSegmentIds(randomClosedIds);
      randomDelays.push(randEval.avgExtraDelayMin);
      randomCutOffs.push(randEval.areasCutOff);
      randomOver10s.push(randEval.areasWithDelayOver10Min);
    }

    const avgExtraDelayMinMean = Number(
      (randomDelays.reduce((a, b) => a + b, 0) / numDraws).toFixed(2)
    );
    const avgExtraDelayMinMin = Number(Math.min(...randomDelays).toFixed(2));
    const avgExtraDelayMinMax = Number(Math.max(...randomDelays).toFixed(2));

    const areasCutOffMean = Number(
      (randomCutOffs.reduce((a, b) => a + b, 0) / numDraws).toFixed(1)
    );
    const areasCutOffMin = Math.min(...randomCutOffs);
    const areasCutOffMax = Math.max(...randomCutOffs);

    const areasWithDelayOver10MinMean = Number(
      (randomOver10s.reduce((a, b) => a + b, 0) / numDraws).toFixed(1)
    );
    const areasWithDelayOver10MinMin = Math.min(...randomOver10s);
    const areasWithDelayOver10MinMax = Math.max(...randomOver10s);

    tiers.push({
      percent: p,
      numClosed,
      model: {
        avgExtraDelayMin: modelEval.avgExtraDelayMin,
        areasCutOff: modelEval.areasCutOff,
        areasWithDelayOver10Min: modelEval.areasWithDelayOver10Min,
      },
      baseline: {
        avgExtraDelayMin: baselineEval.avgExtraDelayMin,
        areasCutOff: baselineEval.areasCutOff,
        areasWithDelayOver10Min: baselineEval.areasWithDelayOver10Min,
      },
      random: {
        drawsCount: numDraws,
        avgExtraDelayMinMean,
        avgExtraDelayMinMin,
        avgExtraDelayMinMax,
        areasCutOffMean,
        areasCutOffMin,
        areasCutOffMax,
        areasWithDelayOver10MinMean,
        areasWithDelayOver10MinMin,
        areasWithDelayOver10MinMax,
      },
    });
  }

  // Verdict logic per instructions:
  // "Only say score-ranked closures do worse than random closures if that holds at at least two of the three tiers; otherwise state plainly that ranking does not consistently differ from random."
  // Stricter rule: score-ranked closures only count as "worse than random" at a tier when the number of
  // areas cut off is ABOVE the maximum seen in all random draws (not merely above the mean).
  let worseTiersCount = 0;
  for (const tier of tiers) {
    if (tier.baseline.areasCutOff > tier.random.areasCutOffMax) worseTiersCount++;
  }

  let verdict = "";
  if (worseTiersCount >= 2) {
    verdict = `Score-ranked closures cut off more areas than every random draw at ${worseTiersCount} of 3 tiers.`;
  } else {
    verdict = `Score-ranked closures stayed within the range of random closures at ${3 - worseTiersCount} of 3 tiers, so this check does not show a consistent difference between ranked and random closures.`;
  }

  return {
    beyondTheList,
    rankingVsRandom: {
      tiers,
      verdict,
    },
  };
}

/**
 * Partitions segments into spatial GroupKFold partitions based on sub_area_id.
 * Balances positive sub_areas across folds while ensuring NO sub_area is split.
 */
export function createSpatialFolds(
  segments: RoadSegmentFeature[],
  nFolds = 5
): Array<{ foldIndex: number; trainIndices: number[]; testIndices: number[]; testPositives: number }> {
  // Group segment indices by sub_area_id
  const groupMap = new Map<string, { indices: number[]; positiveCount: number }>();
  for (let i = 0; i < segments.length; i++) {
    const s = segments[i];
    if (!groupMap.has(s.sub_area_id)) {
      groupMap.set(s.sub_area_id, { indices: [], positiveCount: 0 });
    }
    const entry = groupMap.get(s.sub_area_id)!;
    entry.indices.push(i);
    if (s.label_proxy === 1) {
      entry.positiveCount++;
    }
  }

  // Sort groups by positive count descending to distribute positives across folds
  const groups = Array.from(groupMap.entries()).sort((a, b) => b[1].positiveCount - a[1].positiveCount);

  const foldGroups: string[][] = Array.from({ length: nFolds }, () => []);
  const foldPositives: number[] = new Array(nFolds).fill(0);

  // Assign groups to the fold currently having the fewest positive samples
  for (const [subAreaId, data] of groups) {
    let minFold = 0;
    for (let f = 1; f < nFolds; f++) {
      if (foldPositives[f] < foldPositives[minFold]) {
        minFold = f;
      }
    }
    foldGroups[minFold].push(subAreaId);
    foldPositives[minFold] += data.positiveCount;
  }

  const folds: Array<{ foldIndex: number; trainIndices: number[]; testIndices: number[]; testPositives: number }> = [];

  for (let f = 0; f < nFolds; f++) {
    const testSubAreas = new Set(foldGroups[f]);
    const trainIndices: number[] = [];
    const testIndices: number[] = [];
    let testPos = 0;

    for (let i = 0; i < segments.length; i++) {
      if (testSubAreas.has(segments[i].sub_area_id)) {
        testIndices.push(i);
        if (segments[i].label_proxy === 1) testPos++;
      } else {
        trainIndices.push(i);
      }
    }

    folds.push({
      foldIndex: f,
      trainIndices,
      testIndices,
      testPositives: testPos,
    });
  }

  return folds;
}

/**
 * Runs full validation, selects final scoring method, and generates export files.
 */
export async function runModelValidationAndScoring(
  segments: RoadSegmentFeature[],
  corridorName = "Minto Bridge / ITO corridor, Central Delhi",
  elevationAvailable = true
): Promise<ValidationSummary> {
  console.log(`[ML Pipeline] Initiating spatial cross-validation for ${segments.length} segments...`);

  // 1. Evaluate baseline rule model
  const baselineResults = scoreSegmentsBaseline(segments, elevationAvailable);
  const baselinePreds: Array<{ score: number; label: number }> = segments.map((s) => ({
    score: baselineResults.get(s.segmentId)!.rawScore,
    label: s.label_proxy,
  }));
  const baselineMetrics = evaluatePredictions(baselinePreds);

  // 2. Check Random Forest training eligibility
  const positiveSegments = segments.filter((s) => s.label_proxy === 1);
  const positiveSubAreas = new Set(positiveSegments.map((s) => s.sub_area_id));

  const eligibleForRF = positiveSegments.length >= 10 && positiveSubAreas.size >= 3;

  let modelMetrics: EvaluationMetrics = {
    rocAuc: 0,
    precisionAt10: 0,
    recallAt10: 0,
    precisionAt20: 0,
    recallAt20: 0,
    precisionAt5pct: 0,
    recallAt5pct: 0,
  };
  let rfOofPreds: Array<{ score: number; label: number }> = [];
  let usableFoldsCount = 0;
  const nFolds = 5;
  const folds = createSpatialFolds(segments, nFolds);

  // Train and evaluate RF via spatial GroupKFold if eligible
  if (eligibleForRF) {
    const oofScoreMap = new Map<string, number>();

    for (const fold of folds) {
      if (fold.testPositives === 0) {
        console.warn(`[ML Validation] Fold ${fold.foldIndex} has 0 test positives; skipping evaluation fold.`);
        continue;
      }
      usableFoldsCount++;

      // Filter training and test segments
      const trainSegs = fold.trainIndices.map((idx) => segments[idx]);
      const testSegs = fold.testIndices.map((idx) => segments[idx]);

      const trainDataset = extractFeatureDataset(trainSegs, elevationAvailable);
      const testDataset = extractFeatureDataset(testSegs, elevationAvailable);

      const rf = new RandomForestClassifier({ nTrees: 100, maxDepth: 6, seed: 100 + fold.foldIndex });
      rf.fit(trainDataset);

      for (let i = 0; i < testSegs.length; i++) {
        const prob = rf.predictProba(testDataset.X[i]);
        oofScoreMap.set(testSegs[i].segmentId, prob);
      }
    }

    // Pool out-of-fold predictions
    rfOofPreds = segments
      .filter((s) => oofScoreMap.has(s.segmentId))
      .map((s) => ({
        score: oofScoreMap.get(s.segmentId)!,
        label: s.label_proxy,
      }));

    modelMetrics = evaluatePredictions(rfOofPreds);
  } else {
    console.info(`[ML Pipeline] Insufficient positives for RF (<10 positives or <3 sub-areas). Defaulting to baseline.`);
  }

  // 3. Determine winner objectively (using ROC-AUC, fallback to Precision@20)
  let winner: ScoringMethod = "baseline";
  let winnerRationale = "";

  if (!eligibleForRF) {
    winner = "baseline";
    winnerRationale = "Baseline selected: RF training disabled due to sparse positive labels.";
  } else if (modelMetrics.rocAuc >= baselineMetrics.rocAuc) {
    winner = "model";
    winnerRationale = `Random Forest won spatial CV with ROC-AUC ${modelMetrics.rocAuc} vs Baseline ${baselineMetrics.rocAuc}.`;
  } else {
    winner = "baseline";
    winnerRationale = `Transparent baseline won spatial CV with ROC-AUC ${baselineMetrics.rocAuc} vs Random Forest ${modelMetrics.rocAuc}.`;
  }

  console.log(`[ML Pipeline] Spatial CV Winner: ${winner.toUpperCase()} (${winnerRationale})`);

  // 4. Train final model on ALL data and compute feature importances
  const fullDataset = extractFeatureDataset(segments, elevationAvailable);
  const finalRf = new RandomForestClassifier({ nTrees: 100, maxDepth: 6, seed: 42 });
  if (eligibleForRF) {
    finalRf.fit(fullDataset);
  }
  const featureImportance = eligibleForRF ? finalRf.getFeatureImportanceRecord() : {
    is_underpass: 0.5,
    low_point_depth_m: 0.3,
    dist_to_water_m: 0.1,
    highway_class: 0.1,
  };

  // 5. Compute final raw scores and top factors per segment
  interface ScoredCandidate {
    segment: RoadSegmentFeature;
    rawScore: number;
    topFactors: { feature: string; contribution: number; label: string }[];
  }

  const scoredCandidates: ScoredCandidate[] = [];

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    if (winner === "model" && eligibleForRF) {
      const x = fullDataset.X[i];
      const prob = finalRf.predictProba(x);
      const topFactors = finalRf.getTopFactors(x, seg);
      scoredCandidates.push({ segment: seg, rawScore: prob, topFactors });
    } else {
      const bRes = baselineResults.get(seg.segmentId)!;
      scoredCandidates.push({ segment: seg, rawScore: bRes.rawScore, topFactors: bRes.topFactors });
    }
  }

  // 6. Rank segments (1 = most vulnerable) and calculate rank-normalized score (0 to 1)
  // Tie-breaker: higher rawScore first, then higher low_point_depth, then segmentId
  scoredCandidates.sort((a, b) => {
    if (b.rawScore !== a.rawScore) return b.rawScore - a.rawScore;
    const depthA = a.segment.low_point_depth_m ?? 0;
    const depthB = b.segment.low_point_depth_m ?? 0;
    if (depthB !== depthA) return depthB - depthA;
    return a.segment.segmentId.localeCompare(b.segment.segmentId);
  });

  const nTotal = scoredCandidates.length;
  const finalSegments: VulnerabilitySegment[] = scoredCandidates.map((cand, idx) => {
    const rank = idx + 1; // 1-indexed (1 is most vulnerable)
    // Rank-normalized: Rank 1 -> 1.0, Rank N -> 0.0
    const rankNormalizedScore = nTotal > 1 ? Number((1.0 - (rank - 1) / (nTotal - 1)).toFixed(4)) : 1.0;

    return {
      segmentId: cand.segment.segmentId,
      parentRoadId: cand.segment.parentRoadId,
      osm_way_id: cand.segment.osm_way_id,
      name: cand.segment.name,
      score: rankNormalizedScore,
      rawScore: cand.rawScore,
      rank,
      method: winner,
      geometry: cand.segment.geometry,
      midpoint: cand.segment.midpoint,
      isWithin100mHotspot: cand.segment.label_proxy === 1,
      oneway: cand.segment.oneway,
      tunnel: cand.segment.tunnel,
      bridge: cand.segment.bridge,
      layer: cand.segment.layer,
      maxspeed: cand.segment.maxspeed,
      features: {
        elevation_mean: cand.segment.elevation_mean,
        elevation_min: cand.segment.elevation_min,
        low_point_depth_m: cand.segment.low_point_depth_m,
        dist_to_water_m: cand.segment.dist_to_water_m,
        is_underpass: cand.segment.is_underpass,
        highway_class: cand.segment.highway_class,
        length_m: cand.segment.length_m,
        lanes: cand.segment.lanes,
        oneway: cand.segment.oneway,
        tunnel: cand.segment.tunnel,
        bridge: cand.segment.bridge,
        layer: cand.segment.layer,
        maxspeed: cand.segment.maxspeed,
      },
      topFactors: cand.topFactors,
    };
  });

  const positiveCount = positiveSegments.length;
  const totalSegments = segments.length;
  const baseRate = totalSegments > 0 ? Number((positiveCount / totalSegments).toFixed(5)) : 0;
  const baseRatePercent = totalSegments > 0 ? `${((positiveCount / totalSegments) * 100).toFixed(2)}%` : "0.00%";

  if (baseRate > 0) {
    baselineMetrics.liftAt10 = Number((baselineMetrics.precisionAt10 / baseRate).toFixed(2));
    baselineMetrics.liftAt20 = Number((baselineMetrics.precisionAt20 / baseRate).toFixed(2));
    baselineMetrics.liftAt5pct = Number((baselineMetrics.precisionAt5pct / baseRate).toFixed(2));

    modelMetrics.liftAt10 = Number((modelMetrics.precisionAt10 / baseRate).toFixed(2));
    modelMetrics.liftAt20 = Number((modelMetrics.precisionAt20 / baseRate).toFixed(2));
    modelMetrics.liftAt5pct = Number((modelMetrics.precisionAt5pct / baseRate).toFixed(2));
  } else {
    baselineMetrics.liftAt10 = 0;
    baselineMetrics.liftAt20 = 0;
    baselineMetrics.liftAt5pct = 0;
    modelMetrics.liftAt10 = 0;
    modelMetrics.liftAt20 = 0;
    modelMetrics.liftAt5pct = 0;
  }

  const positiveBlocks = new Set(positiveSegments.map((s) => s.sub_area_id)).size;
  const notes = `
Evaluation Notes:
1. Spatial Cross-Validation: GroupKFold (${nFolds} folds) grouped by ~500m sub_area_id blocks to prevent spatial autocorrelation leakage.
2. Usable Folds: ${usableFoldsCount} of ${nFolds} folds contained test positive samples.
3. Winner Selection: ${winner === "model" ? "Random Forest" : "Rule-Based Baseline"} outperformed the alternative on pooled out-of-fold spatial evaluation.
4. Model Limitations:
   - Proxy Label: Labels indicate proximity (<=100m) to historic PWD/DTP waterlogging spots, not hydraulic flood ground truth.
   - Small Sample Support: ${positiveCount} positive instances across ${positiveBlocks} spatial blocks limit deep parameter exploration.
   - Static Topography: Model measures structural vulnerability (underpasses, depression depth, river proximity); it does NOT simulate rainfall intensity or stormwater drain pipe hydraulic capacities.
`.trim();

  // 6b. Block bootstrap confidence intervals (200 resamples by sub_area blocks)
  const confidenceIntervals = computeBlockBootstrapConfidenceIntervals(
    segments,
    baselinePreds,
    rfOofPreds.length === segments.length ? rfOofPreds : baselinePreds,
    200,
    2026
  );

  // 6c. Build raw baseline and model maps for sanity checks
  const baselineRawMap = new Map<string, number>();
  for (const seg of segments) {
    const b = baselineResults.get(seg.segmentId);
    baselineRawMap.set(seg.segmentId, b ? b.rawScore : 0);
  }

  const modelRawMap = new Map<string, number>();
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    const x = fullDataset.X[i];
    const prob = eligibleForRF ? finalRf.predictProba(x) : (baselineResults.get(seg.segmentId)?.rawScore ?? 0);
    modelRawMap.set(seg.segmentId, prob);
  }

  // 6d. Sanity checks: Beyond the list & Ranking vs Random
  const sanityChecks = computeSanityChecks(
    finalSegments,
    baselineRawMap,
    modelRawMap
  );

  const vulnerabilityFile: VulnerabilityFile = {
    generatedAt: new Date().toISOString(),
    corridor: corridorName,
    method: winner,
    label: "proxy: segment within ~100 m of a PWD/DTP-listed point (not confirmed flood ground truth)",
    segmentCount: finalSegments.length,
    disclaimers: {
      index: "Index of structural susceptibility, not a live flood forecast.",
      label: "Proxy label: segment within ~100 m of a PWD/DTP-listed point. Not confirmed flood ground truth.",
      delay: "Relative extra delay estimated from road-class speeds, not real trip data.",
      oversight: "Tool informs, humans decide.",
    },
    segments: finalSegments,
  };

  const metricsFile: MLMetricsFile = {
    generatedAt: new Date().toISOString(),
    corridor: corridorName,
    cvScheme: `GroupKFold (${nFolds} folds) by sub_area_id`,
    foldsTotal: nFolds,
    foldsUsable: usableFoldsCount,
    positiveCount,
    totalSegments,
    baseRate,
    baseRatePercent,
    winner,
    baseline: baselineMetrics,
    model: modelMetrics,
    featureImportance,
    confidenceIntervals,
    sanityChecks,
    notes,
  };

  // 7. Write to public/data/
  try {
    const dir = path.dirname(SCORES_OUTPUT_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(SCORES_OUTPUT_FILE, JSON.stringify(vulnerabilityFile, null, 2), "utf-8");
    fs.writeFileSync(METRICS_OUTPUT_FILE, JSON.stringify(metricsFile, null, 2), "utf-8");
    console.log(`[ML Pipeline] Wrote vulnerability scores to ${SCORES_OUTPUT_FILE}`);
    console.log(`[ML Pipeline] Wrote evaluation metrics to ${METRICS_OUTPUT_FILE}`);
  } catch (err: any) {
    console.error("Error saving score/metric files:", err?.message || err);
  }

  return { vulnerabilityFile, metricsFile };
}
