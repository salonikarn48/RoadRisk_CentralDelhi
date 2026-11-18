/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * RoadRisk Delhi - Structural Vulnerability Index
 * Module: randomForest.ts
 * Self-contained, deterministic Random Forest Classifier in TypeScript.
 * - 100 Trees, max depth 6
 * - Seeded Mulberry32 PRNG for reproducible training
 * - Gini impurity splits with balanced class weighting for positive class
 * - Sqrt(features) candidate features per node split
 * - Bootstrap sampling with replacement
 * - Mean Decrease in Impurity (MDI) feature importance
 * 
 * LEAKAGE RULES ENFORCED:
 *   Feature vectors strictly exclude dist_to_nearest_hotspot_m, label_proxy,
 *   nearest_hotspot_id, and all proximity-to-hotspot metrics.
 */

import type { RoadSegmentFeature } from "./features.js";
import type { TopFactor } from "../types/risk.js";

// Deterministic 32-bit PRNG
export class Mulberry32 {
  private s: number;
  constructor(seed = 42) {
    this.s = seed >>> 0;
  }
  next(): number {
    this.s |= 0;
    this.s = (this.s + 0x6d2b79f5) | 0;
    let t = Math.imul(this.s ^ (this.s >>> 15), 1 | this.s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }
}

export interface FeatureSpec {
  name: string;
  label: string;
}

export interface EncodedDataset {
  featureNames: string[];
  featureLabels: string[];
  X: number[][]; // [sampleIdx][featureIdx]
  y: number[];   // [sampleIdx] -> 0 or 1
  sampleIds: string[];
  minVals: number[];
  maxVals: number[];
}

interface TreeNode {
  isLeaf: boolean;
  prediction: number;
  featureIndex?: number;
  threshold?: number;
  left?: TreeNode;
  right?: TreeNode;
}

export interface RFTrainingConfig {
  nTrees?: number;
  maxDepth?: number;
  minSamplesSplit?: number;
  seed?: number;
}

/**
 * Extracts allowed model feature columns and performs one-hot encoding for highway_class.
 * STRICTLY excludes dist_to_nearest_hotspot_m and label_proxy.
 */
export function extractFeatureDataset(
  segments: RoadSegmentFeature[],
  elevationAvailable = true
): EncodedDataset {
  const featureSpecs: FeatureSpec[] = [];

  if (elevationAvailable) {
    featureSpecs.push({ name: "elevation_mean", label: "Mean SRTM Elevation (m)" });
    featureSpecs.push({ name: "elevation_min", label: "Min SRTM Elevation (m)" });
    featureSpecs.push({ name: "low_point_depth_m", label: "Depression Low Point Depth (m)" });
  }

  featureSpecs.push({ name: "dist_to_water_m", label: "Distance to River / Drain (m)" });
  featureSpecs.push({ name: "is_underpass", label: "Subterranean Road Underpass (0/1)" });
  featureSpecs.push({ name: "length_m", label: "Segment Length (m)" });
  featureSpecs.push({ name: "lanes", label: "Number of Road Lanes" });

  // Highway class one-hot columns
  const highwayClasses = ["primary", "secondary", "tertiary", "trunk", "residential", "motorway"];
  highwayClasses.forEach((hw) => {
    featureSpecs.push({ name: `hw_${hw}`, label: `Highway Class: ${hw}` });
  });

  const featureNames = featureSpecs.map((f) => f.name);
  const featureLabels = featureSpecs.map((f) => f.label);

  const X: number[][] = [];
  const y: number[] = [];
  const sampleIds: string[] = [];

  for (const seg of segments) {
    const row: number[] = [];

    if (elevationAvailable) {
      row.push(seg.elevation_mean ?? 215.0);
      row.push(seg.elevation_min ?? 215.0);
      row.push(seg.low_point_depth_m ?? 0.0);
    }

    row.push(seg.dist_to_water_m);
    row.push(seg.is_underpass ? 1.0 : 0.0);
    row.push(seg.length_m);
    row.push(seg.lanes);

    const segHw = (seg.highway_class || "").toLowerCase();
    for (const hw of highwayClasses) {
      row.push(segHw.includes(hw) ? 1.0 : 0.0);
    }

    X.push(row);
    y.push(seg.label_proxy);
    sampleIds.push(seg.segmentId);
  }

  // Compute min/max per feature for later importance contribution scaling
  const numFeatures = featureNames.length;
  const minVals = new Array(numFeatures).fill(Infinity);
  const maxVals = new Array(numFeatures).fill(-Infinity);

  for (const row of X) {
    for (let f = 0; f < numFeatures; f++) {
      if (row[f] < minVals[f]) minVals[f] = row[f];
      if (row[f] > maxVals[f]) maxVals[f] = row[f];
    }
  }

  return {
    featureNames,
    featureLabels,
    X,
    y,
    sampleIds,
    minVals,
    maxVals,
  };
}

export class RandomForestClassifier {
  private trees: TreeNode[] = [];
  private featureImportance: number[] = [];
  private featureNames: string[] = [];
  private featureLabels: string[] = [];
  private minVals: number[] = [];
  private maxVals: number[] = [];
  private nTrees: number;
  private maxDepth: number;
  private minSamplesSplit: number;
  private seed: number;

  constructor(config: RFTrainingConfig = {}) {
    this.nTrees = config.nTrees ?? 100;
    this.maxDepth = config.maxDepth ?? 6;
    this.minSamplesSplit = config.minSamplesSplit ?? 4;
    this.seed = config.seed ?? 42;
  }

  /**
   * Fits the Random Forest on provided dataset.
   */
  fit(dataset: EncodedDataset): void {
    this.featureNames = [...dataset.featureNames];
    this.featureLabels = [...dataset.featureLabels];
    this.minVals = [...dataset.minVals];
    this.maxVals = [...dataset.maxVals];
    const nFeatures = dataset.featureNames.length;
    const nSamples = dataset.X.length;

    this.trees = [];
    const rawImportance = new Array(nFeatures).fill(0);
    const rng = new Mulberry32(this.seed);

    // Compute balanced class weights: w_c = N / (2 * N_c)
    let posCount = 0;
    for (const label of dataset.y) {
      if (label === 1) posCount++;
    }
    const negCount = nSamples - posCount;
    const w1 = posCount > 0 ? nSamples / (2 * posCount) : 1;
    const w0 = negCount > 0 ? nSamples / (2 * negCount) : 1;

    const sampleWeights = dataset.y.map((label) => (label === 1 ? w1 : w0));
    const featuresPerSplit = Math.max(1, Math.round(Math.sqrt(nFeatures)));

    for (let t = 0; t < this.nTrees; t++) {
      // Bootstrap sampling with replacement
      const bootstrapIndices: number[] = new Array(nSamples);
      for (let i = 0; i < nSamples; i++) {
        bootstrapIndices[i] = rng.nextInt(0, nSamples - 1);
      }

      const treeRng = new Mulberry32(rng.nextInt(1, 10000000));
      const root = this.buildTree(
        dataset.X,
        dataset.y,
        sampleWeights,
        bootstrapIndices,
        0,
        featuresPerSplit,
        rawImportance,
        treeRng
      );
      this.trees.push(root);
    }

    // Normalize feature importance to sum to 1.0
    const totalImp = rawImportance.reduce((a, b) => a + b, 0);
    if (totalImp > 0) {
      this.featureImportance = rawImportance.map((v) => Number((v / totalImp).toFixed(4)));
    } else {
      this.featureImportance = new Array(nFeatures).fill(1 / nFeatures);
    }
  }

  private buildTree(
    X: number[][],
    y: number[],
    weights: number[],
    indices: number[],
    depth: number,
    featuresPerSplit: number,
    importanceAccumulator: number[],
    rng: Mulberry32
  ): TreeNode {
    // Calculate current weighted class distribution
    let wSum = 0;
    let wPos = 0;
    for (const idx of indices) {
      const w = weights[idx];
      wSum += w;
      if (y[idx] === 1) wPos += w;
    }

    const probPos = wSum > 0 ? wPos / wSum : 0;

    // Leaf conditions: max depth, too few samples, or pure node
    if (
      depth >= this.maxDepth ||
      indices.length < this.minSamplesSplit ||
      probPos === 0 ||
      probPos === 1 ||
      wSum === 0
    ) {
      return { isLeaf: true, prediction: probPos };
    }

    // Current Gini impurity
    const currentGini = 1 - (Math.pow(1 - probPos, 2) + Math.pow(probPos, 2));

    // Random feature subset selection
    const nFeatures = X[0].length;
    const candidateFeatures: number[] = [];
    const pool = Array.from({ length: nFeatures }, (_, i) => i);
    // Shuffle pool
    for (let i = pool.length - 1; i > 0; i--) {
      const j = rng.nextInt(0, i);
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    for (let i = 0; i < Math.min(featuresPerSplit, nFeatures); i++) {
      candidateFeatures.push(pool[i]);
    }

    let bestGain = 0;
    let bestFeature = -1;
    let bestThreshold = 0;
    let bestLeftIndices: number[] = [];
    let bestRightIndices: number[] = [];

    for (const f of candidateFeatures) {
      // Gather unique values for feature f
      const valsSet = new Set<number>();
      for (const idx of indices) {
        valsSet.add(X[idx][f]);
      }
      if (valsSet.size <= 1) continue;

      const sortedVals = Array.from(valsSet).sort((a, b) => a - b);
      // Sample up to 10 split thresholds
      const step = Math.max(1, Math.floor(sortedVals.length / 10));
      const thresholds: number[] = [];
      for (let i = 0; i < sortedVals.length - 1; i += step) {
        thresholds.push((sortedVals[i] + sortedVals[i + 1]) / 2);
      }

      for (const th of thresholds) {
        let leftW = 0, leftWPos = 0;
        let rightW = 0, rightWPos = 0;
        const leftIdx: number[] = [];
        const rightIdx: number[] = [];

        for (const idx of indices) {
          const w = weights[idx];
          if (X[idx][f] <= th) {
            leftIdx.push(idx);
            leftW += w;
            if (y[idx] === 1) leftWPos += w;
          } else {
            rightIdx.push(idx);
            rightW += w;
            if (y[idx] === 1) rightWPos += w;
          }
        }

        if (leftIdx.length === 0 || rightIdx.length === 0) continue;

        const leftProb = leftW > 0 ? leftWPos / leftW : 0;
        const rightProb = rightW > 0 ? rightWPos / rightW : 0;
        const leftGini = 1 - (Math.pow(1 - leftProb, 2) + Math.pow(leftProb, 2));
        const rightGini = 1 - (Math.pow(1 - rightProb, 2) + Math.pow(rightProb, 2));

        const splitGini = (leftW / wSum) * leftGini + (rightW / wSum) * rightGini;
        const gain = wSum * (currentGini - splitGini);

        if (gain > bestGain) {
          bestGain = gain;
          bestFeature = f;
          bestThreshold = th;
          bestLeftIndices = leftIdx;
          bestRightIndices = rightIdx;
        }
      }
    }

    if (bestGain <= 1e-7 || bestFeature === -1 || bestLeftIndices.length === 0 || bestRightIndices.length === 0) {
      return { isLeaf: true, prediction: probPos };
    }

    // Accumulate MDI importance
    importanceAccumulator[bestFeature] += bestGain;

    const leftNode = this.buildTree(
      X,
      y,
      weights,
      bestLeftIndices,
      depth + 1,
      featuresPerSplit,
      importanceAccumulator,
      rng
    );
    const rightNode = this.buildTree(
      X,
      y,
      weights,
      bestRightIndices,
      depth + 1,
      featuresPerSplit,
      importanceAccumulator,
      rng
    );

    return {
      isLeaf: false,
      prediction: probPos,
      featureIndex: bestFeature,
      threshold: bestThreshold,
      left: leftNode,
      right: rightNode,
    };
  }

  private predictTree(node: TreeNode, x: number[]): number {
    if (node.isLeaf || node.featureIndex === undefined || node.threshold === undefined) {
      return node.prediction;
    }
    if (x[node.featureIndex] <= node.threshold) {
      return this.predictTree(node.left!, x);
    }
    return this.predictTree(node.right!, x);
  }

  /**
   * Predicts probability of class 1 (structural flood susceptibility) for a single sample.
   */
  predictProba(x: number[]): number {
    if (this.trees.length === 0) return 0;
    let sum = 0;
    for (const tree of this.trees) {
      sum += this.predictTree(tree, x);
    }
    return Number((sum / this.trees.length).toFixed(4));
  }

  /**
   * Returns normalized feature importances as a record of { featureName: importance }.
   */
  getFeatureImportanceRecord(): Record<string, number> {
    const record: Record<string, number> = {};
    for (let i = 0; i < this.featureNames.length; i++) {
      record[this.featureNames[i]] = this.featureImportance[i] ?? 0;
    }
    return record;
  }

  /**
   * Identifies top 3 factors driving a segment's prediction:
   * contribution = feature_importance * normalized_feature_value.
   */
  getTopFactors(x: number[], seg: RoadSegmentFeature): TopFactor[] {
    const factors: TopFactor[] = [];
    for (let i = 0; i < this.featureNames.length; i++) {
      const imp = this.featureImportance[i] ?? 0;
      const fName = this.featureNames[i];
      const minV = this.minVals[i] ?? 0;
      const maxV = this.maxVals[i] ?? 1;
      const range = maxV - minV || 1;

      // Invert dist_to_water so closer to water has higher risk contribution
      let normVal = Math.max(0, Math.min(1, (x[i] - minV) / range));
      if (fName === "dist_to_water_m") {
        normVal = 1.0 - normVal;
      }

      const contribution = Number((imp * normVal).toFixed(4));
      let label = this.featureLabels[i];

      if (fName === "is_underpass") {
        label = seg.is_underpass ? "Subterranean Railway/Road Underpass" : "Surface Level Corridor";
      } else if (fName === "low_point_depth_m") {
        label = seg.low_point_depth_m !== null && seg.low_point_depth_m > 0
          ? `Depression Depth (+${seg.low_point_depth_m.toFixed(2)}m below surroundings)`
          : "Elevated / Planar Terrain";
      } else if (fName === "dist_to_water_m") {
        label = `Yamuna / Drain Proximity (${(seg.dist_to_water_m / 1000).toFixed(2)}km)`;
      } else if (fName.startsWith("hw_")) {
        label = `Road Class (${seg.highway_class.toUpperCase()}, ${seg.lanes} lanes)`;
      }

      factors.push({ feature: fName, contribution, label });
    }

    factors.sort((a, b) => b.contribution - a.contribution);
    return factors.slice(0, 3);
  }
}
