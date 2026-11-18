/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * RoadRisk Delhi - Scenario Routing Engine
 * Module: engine.ts
 * Pure TypeScript (isomorphic: client and server).
 * Multi-source Dijkstra with Binary Heap priority queue.
 * Simulates closing worst X% of segments, computing travel time shifts and cut-offs.
 */

import type { VulnerabilitySegment } from "../../types/risk.js";
import {
  type SegmentGraph,
  type SampleOrigin,
  type SnappedHospital,
  type GraphEdge,
  type GraphNode,
  buildSegmentGraph,
} from "./graph.js";
import { haversineDistanceMeters } from "../../data/floodHotspots.js";

// Fast Binary Heap Priority Queue
export class MinHeap<T extends { dist: number }> {
  private heap: T[] = [];

  push(item: T): void {
    this.heap.push(item);
    this.bubbleUp(this.heap.length - 1);
  }

  pop(): T | null {
    if (this.heap.length === 0) return null;
    const top = this.heap[0];
    const bottom = this.heap.pop()!;
    if (this.heap.length > 0) {
      this.heap[0] = bottom;
      this.bubbleDown(0);
    }
    return top;
  }

  isEmpty(): boolean {
    return this.heap.length === 0;
  }

  private bubbleUp(idx: number): void {
    while (idx > 0) {
      const parent = (idx - 1) >> 1;
      if (this.heap[idx].dist < this.heap[parent].dist) {
        const tmp = this.heap[idx];
        this.heap[idx] = this.heap[parent];
        this.heap[parent] = tmp;
        idx = parent;
      } else {
        break;
      }
    }
  }

  private bubbleDown(idx: number): void {
    const len = this.heap.length;
    while ((idx << 1) + 1 < len) {
      const left = (idx << 1) + 1;
      const right = left + 1;
      let smallest = idx;

      if (left < len && this.heap[left].dist < this.heap[smallest].dist) {
        smallest = left;
      }
      if (right < len && this.heap[right].dist < this.heap[smallest].dist) {
        smallest = right;
      }

      if (smallest !== idx) {
        const tmp = this.heap[idx];
        this.heap[idx] = this.heap[smallest];
        this.heap[smallest] = tmp;
        idx = smallest;
      } else {
        break;
      }
    }
  }
}

export interface OriginScenarioResult {
  id: string;
  name: string;
  nodeId: string;
  lat: number;
  lon: number;
  baselineMin: number;
  scenarioMin: number | null;
  extraDelayMin: number;
  isCutOff: boolean;
  nearestHospitalBefore: string;
  nearestHospitalAfter: string | null;
  routeBefore: string[]; // Segment IDs
  routeAfter: string[];  // Segment IDs
  routeCoordinatesBefore: [number, number][];
  routeCoordinatesAfter: [number, number][];
}

export interface ScenarioSummary {
  percentClosed: number;
  closedSegmentCount: number;
  closedSegmentIds: string[];
  totalAreas: number;
  areasCutOff: number;
  areasConnected: number;
  worstExtraDelayMin: number;
  worstExtraDelayArea: string;
  avgExtraDelayMin: number;
  baselineAvgTravelTimeMin: number;
  hospitalsTotal: number;
  hospitalsReachable: number;
  topRiskDriver: string;
  runtimeMs: number;
}

export interface SimulationResult {
  summary: ScenarioSummary;
  origins: OriginScenarioResult[];
}

interface DijkstraState {
  distances: Map<string, number>;
  nearestHospitals: Map<string, string>;
  prevNodes: Map<string, string | null>;
  prevEdges: Map<string, GraphEdge | null>;
}

export class ClosureEngine {
  private graph: SegmentGraph;
  private sortedEdgesByRiskDesc: GraphEdge[];
  private edgeMapBySegmentId: Map<string, GraphEdge>;
  private baselineState: DijkstraState | null = null;
  private baselineAvgTravelTimeMin = 0;

  constructor(graph: SegmentGraph) {
    this.graph = graph;
    this.edgeMapBySegmentId = new Map(graph.edges.map((e) => [e.segmentId, e]));

    // Deterministic edge sort: score descending, tie-break by segmentId
    this.sortedEdgesByRiskDesc = [...graph.edges].sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.segmentId.localeCompare(b.segmentId);
    });

    // Compute and cache baseline routing
    this.computeAndCacheBaseline();
  }

  private computeAndCacheBaseline(): void {
    this.baselineState = this.runMultiSourceDijkstra(new Set());

    let sum = 0;
    let count = 0;
    for (const orig of this.graph.origins) {
      const d = this.baselineState.distances.get(orig.nodeId);
      if (d !== undefined && d < Infinity) {
        sum += d;
        count++;
      }
    }
    this.baselineAvgTravelTimeMin = count > 0 ? Number((sum / count).toFixed(2)) : 0;
  }

  /**
   * Runs multi-source Dijkstra from all snapped hospitals with optional closed edge set.
   */
  private runMultiSourceDijkstra(closedEdgeIds: Set<string>): DijkstraState {
    const distances = new Map<string, number>();
    const nearestHospitals = new Map<string, string>();
    const prevNodes = new Map<string, string | null>();
    const prevEdges = new Map<string, GraphEdge | null>();

    const heap = new MinHeap<{ id: string; dist: number }>();

    // Seed heap with all snapped hospitals
    for (const hosp of this.graph.hospitals) {
      distances.set(hosp.nodeId, 0);
      nearestHospitals.set(hosp.nodeId, hosp.name);
      prevNodes.set(hosp.nodeId, null);
      prevEdges.set(hosp.nodeId, null);
      heap.push({ id: hosp.nodeId, dist: 0 });
    }

    while (!heap.isEmpty()) {
      const top = heap.pop()!;
      const curDist = distances.get(top.id);
      if (curDist === undefined || top.dist > curDist) continue;

      const neighbors = this.graph.adjacency.get(top.id) || [];
      for (const nbr of neighbors) {
        // Skip closed edges
        if (closedEdgeIds.has(nbr.edge.segmentId)) continue;

        const newDist = top.dist + nbr.edge.travel_time_min;
        const oldDist = distances.get(nbr.to) ?? Infinity;

        if (newDist < oldDist) {
          distances.set(nbr.to, newDist);
          nearestHospitals.set(nbr.to, nearestHospitals.get(top.id)!);
          prevNodes.set(nbr.to, top.id);
          prevEdges.set(nbr.to, nbr.edge);
          heap.push({ id: nbr.to, dist: newDist });
        }
      }
    }

    return { distances, nearestHospitals, prevNodes, prevEdges };
  }

  /**
   * Reconstructs sequence of segment IDs from a starting node to the nearest hospital.
   */
  private reconstructRoute(
    startNodeId: string,
    state: DijkstraState
  ): { segmentIds: string[]; coordinates: [number, number][] } {
    const segmentIds: string[] = [];
    const coordinates: [number, number][] = [];

    const startNode = this.graph.nodeMap.get(startNodeId);
    if (startNode) {
      coordinates.push([startNode.lat, startNode.lon]);
    }

    let cur = startNodeId;
    const visited = new Set<string>();

    while (cur) {
      if (visited.has(cur)) break; // cycle protection
      visited.add(cur);

      const edge = state.prevEdges.get(cur);
      const parentNode = state.prevNodes.get(cur);

      if (!edge || !parentNode) break;

      segmentIds.push(edge.segmentId);

      // Add edge geometry coordinates
      if (edge.geometry && edge.geometry.length > 0) {
        // Orient geometry from cur toward parentNode
        const firstPt = edge.geometry[0];
        const lastPt = edge.geometry[edge.geometry.length - 1];
        const curPt = this.graph.nodeMap.get(cur);

        const isReverse = curPt && Math.abs(firstPt.lat - curPt.lat) > Math.abs(lastPt.lat - curPt.lat);
        const oriented = isReverse ? [...edge.geometry].reverse() : edge.geometry;

        for (const pt of oriented) {
          coordinates.push([pt.lat, pt.lon]);
        }
      }

      cur = parentNode;
    }

    return { segmentIds, coordinates };
  }

  /**
   * Simulates closing the worst percentClosed% of segments with optional protected segment IDs.
   * If protectedSegmentIds is provided, those segments are excluded from the closed set.
   */
  simulate(
    percentClosedOrSegmentIds: number | string[],
    protectedSegmentIds?: string[]
  ): SimulationResult {
    const t0 = (typeof performance !== "undefined" ? performance.now() : Date.now());

    let closedEdges: GraphEdge[] = [];
    let closedSegmentIds: string[] = [];
    let clampedPercent = 0;
    const totalEdges = this.sortedEdgesByRiskDesc.length;

    if (Array.isArray(percentClosedOrSegmentIds)) {
      closedSegmentIds = percentClosedOrSegmentIds;
      clampedPercent = totalEdges > 0 ? Number(((closedSegmentIds.length / totalEdges) * 100).toFixed(1)) : 0;
      const closedSetLookup = new Set(closedSegmentIds);
      closedEdges = this.sortedEdgesByRiskDesc.filter((e) => closedSetLookup.has(e.segmentId));
    } else {
      clampedPercent = Math.max(0, Math.min(100, percentClosedOrSegmentIds));
      const numClosed =
        clampedPercent === 0
          ? 0
          : Math.max(1, Math.round((clampedPercent / 100) * totalEdges));

      closedEdges = this.sortedEdgesByRiskDesc.slice(0, numClosed);
      closedSegmentIds = closedEdges.map((e) => e.segmentId);
    }

    // Apply protection: remove protected segment IDs from the closed set
    if (protectedSegmentIds && protectedSegmentIds.length > 0) {
      const protectSet = new Set(protectedSegmentIds);
      closedSegmentIds = closedSegmentIds.filter((id) => !protectSet.has(id));
    }
    const closedSet = new Set(closedSegmentIds);

    // Run Dijkstra under closure scenario
    const scenarioState =
      closedSet.size === 0
        ? this.baselineState!
        : this.runMultiSourceDijkstra(closedSet);

    // Compute origin metrics
    const originResults: OriginScenarioResult[] = [];
    let areasCutOff = 0;
    let worstDelay = 0;
    let worstAreaName = "None";
    let sumExtraDelay = 0;
    let connectedCount = 0;
    const reachableHospitals = new Set<string>();

    for (const orig of this.graph.origins) {
      const bDist = this.baselineState!.distances.get(orig.nodeId) ?? 0;
      const bHosp = this.baselineState!.nearestHospitals.get(orig.nodeId) ?? "Unknown Hospital";
      const bRoute = this.reconstructRoute(orig.nodeId, this.baselineState!);

      const sDist = scenarioState.distances.get(orig.nodeId) ?? Infinity;
      const isCutOff = sDist === Infinity;

      let extraDelayMin = 0;
      let sHosp: string | null = null;
      let sRoute = { segmentIds: [] as string[], coordinates: [] as [number, number][] };

      if (isCutOff) {
        areasCutOff++;
      } else {
        connectedCount++;
        extraDelayMin = Number(Math.max(0, sDist - bDist).toFixed(2));
        sumExtraDelay += extraDelayMin;
        sHosp = scenarioState.nearestHospitals.get(orig.nodeId) ?? null;
        if (sHosp) reachableHospitals.add(sHosp);
        sRoute = this.reconstructRoute(orig.nodeId, scenarioState);

        if (extraDelayMin > worstDelay) {
          worstDelay = extraDelayMin;
          worstAreaName = orig.name;
        }
      }

      originResults.push({
        id: orig.id,
        name: orig.name,
        nodeId: orig.nodeId,
        lat: orig.lat,
        lon: orig.lon,
        baselineMin: Number(bDist.toFixed(2)),
        scenarioMin: isCutOff ? null : Number(sDist.toFixed(2)),
        extraDelayMin,
        isCutOff,
        nearestHospitalBefore: bHosp,
        nearestHospitalAfter: sHosp,
        routeBefore: bRoute.segmentIds,
        routeAfter: sRoute.segmentIds,
        routeCoordinatesBefore: bRoute.coordinates,
        routeCoordinatesAfter: sRoute.coordinates,
      });
    }

    // Determine top risk driver among closed segments
    let topRiskDriver = "No active closures";
    if (closedSet.size > 0) {
      const actualClosedEdges = closedEdges.filter((e) => closedSet.has(e.segmentId));
      const underpasses = actualClosedEdges.filter((e) => e.is_underpass).length;
      const underpassShare = actualClosedEdges.length > 0 ? Math.round((underpasses / actualClosedEdges.length) * 100) : 0;

      if (underpasses > 0 && underpassShare >= 35) {
        topRiskDriver = `Underpasses: ${underpassShare}% of closed corridors`;
      } else {
        const topTypes = actualClosedEdges.map((e) => e.highway_class);
        const freq: Record<string, number> = {};
        for (const t of topTypes) freq[t] = (freq[t] || 0) + 1;
        const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1]);
        const dominant = sorted[0]?.[0] || "arterial";
        const domCount = sorted[0]?.[1] || 0;
        topRiskDriver = `${dominant.toUpperCase()} Arterials (${actualClosedEdges.length > 0 ? Math.round((domCount / actualClosedEdges.length) * 100) : 0}% of closed)`;
      }
    }

    const t1 = (typeof performance !== "undefined" ? performance.now() : Date.now());

    const summary: ScenarioSummary = {
      percentClosed: clampedPercent,
      closedSegmentCount: closedSet.size,
      closedSegmentIds: Array.from(closedSet),
      totalAreas: this.graph.origins.length,
      areasCutOff,
      areasConnected: connectedCount,
      worstExtraDelayMin: Number(worstDelay.toFixed(2)),
      worstExtraDelayArea: worstAreaName,
      avgExtraDelayMin: connectedCount > 0 ? Number((sumExtraDelay / connectedCount).toFixed(2)) : 0,
      baselineAvgTravelTimeMin: this.baselineAvgTravelTimeMin,
      hospitalsTotal: this.graph.hospitals.length,
      hospitalsReachable: reachableHospitals.size,
      topRiskDriver,
      runtimeMs: Number((t1 - t0).toFixed(2)),
    };

    return { summary, origins: originResults };
  }

  /**
   * Fast evaluation of arbitrary closed segments (e.g. for random-draw baselines and what-if ranking).
   */
  simulateWithClosedSegmentIds(
    closedSegmentIds: string[],
    protectedSegmentIds?: string[]
  ): {
    areasCutOff: number;
    areasWithDelayOver10Min: number;
    avgExtraDelayMin: number;
    worstExtraDelayMin: number;
  } {
    let effectiveIds = closedSegmentIds;
    if (protectedSegmentIds && protectedSegmentIds.length > 0) {
      const pSet = new Set(protectedSegmentIds);
      effectiveIds = effectiveIds.filter((id) => !pSet.has(id));
    }

    const closedSet = new Set(effectiveIds);
    const scenarioState =
      closedSet.size === 0
        ? this.baselineState!
        : this.runMultiSourceDijkstra(closedSet);

    let areasCutOff = 0;
    let areasWithDelayOver10Min = 0;
    let worstDelay = 0;
    let sumExtraDelay = 0;
    let connectedCount = 0;

    for (const orig of this.graph.origins) {
      const bDist = this.baselineState!.distances.get(orig.nodeId) ?? 0;
      const sDist = scenarioState.distances.get(orig.nodeId) ?? Infinity;
      if (sDist === Infinity) {
        areasCutOff++;
      } else {
        connectedCount++;
        const extraDelay = Math.max(0, sDist - bDist);
        sumExtraDelay += extraDelay;
        if (extraDelay > 10.0) areasWithDelayOver10Min++;
        if (extraDelay > worstDelay) worstDelay = extraDelay;
      }
    }

    const avgExtraDelayMin =
      connectedCount > 0 ? Number((sumExtraDelay / connectedCount).toFixed(2)) : 0;
    return {
      areasCutOff,
      areasWithDelayOver10Min,
      avgExtraDelayMin,
      worstExtraDelayMin: Number(worstDelay.toFixed(2)),
    };
  }

  /**
   * Single Points of Failure (Step 3):
   * Closes each candidate segment alone among the top K by score and measures network consequence.
   * Deterministic tie-break: primary areasCutOff desc, secondary avgExtraDelayMin desc, tertiary worstExtraDelayMin desc, quaternary segmentId asc.
   */
  private _spofCache: Array<{
    segmentId: string;
    name: string;
    score: number;
    rank: number;
    areasCutOff: number;
    avgExtraDelayMin: number;
    worstExtraDelayMin: number;
    affectedOriginIds: string[];
  }> | null = null;

  computeSinglePointsOfFailure(topK = 40): Array<{
    segmentId: string;
    name: string;
    score: number;
    rank: number;
    areasCutOff: number;
    avgExtraDelayMin: number;
    worstExtraDelayMin: number;
    affectedOriginIds: string[];
  }> {
    if (this._spofCache) return this._spofCache;

    // Pick top K unique segments by risk score
    const seenSegs = new Set<string>();
    const candidates: GraphEdge[] = [];
    for (const edge of this.sortedEdgesByRiskDesc) {
      if (!seenSegs.has(edge.segmentId)) {
        seenSegs.add(edge.segmentId);
        candidates.push(edge);
        if (candidates.length >= topK) break;
      }
    }

    const results = candidates.map((c, idx) => {
      const sim = this.simulateWithClosedSegmentIds([c.segmentId]);

      // Identify affected origins (either cut off or extra delay > 0.1m)
      const closedSet = new Set([c.segmentId]);
      const scState = this.runMultiSourceDijkstra(closedSet);
      const affectedOriginIds: string[] = [];

      for (const orig of this.graph.origins) {
        const bDist = this.baselineState!.distances.get(orig.nodeId) ?? 0;
        const sDist = scState.distances.get(orig.nodeId) ?? Infinity;
        if (sDist === Infinity || sDist - bDist > 0.1) {
          affectedOriginIds.push(orig.id);
        }
      }

      return {
        segmentId: c.segmentId,
        name: c.name || "Unnamed road",
        score: c.score,
        rank: idx + 1,
        areasCutOff: sim.areasCutOff,
        avgExtraDelayMin: sim.avgExtraDelayMin,
        worstExtraDelayMin: sim.worstExtraDelayMin,
        affectedOriginIds,
      };
    });

    // Sort by impact: cut-offs desc, avg delay desc, worst delay desc, segmentId asc
    results.sort((a, b) => {
      if (b.areasCutOff !== a.areasCutOff) return b.areasCutOff - a.areasCutOff;
      if (b.avgExtraDelayMin !== a.avgExtraDelayMin) return b.avgExtraDelayMin - a.avgExtraDelayMin;
      if (b.worstExtraDelayMin !== a.worstExtraDelayMin) return b.worstExtraDelayMin - a.worstExtraDelayMin;
      return a.segmentId.localeCompare(b.segmentId);
    });

    this._spofCache = results;
    return results;
  }

  /**
   * Greedy 3-road protection optimizer (Step 4):
   * Greedily picks up to maxPicks segments among candidateSegmentIds to maximize reconnection
   * and delay reduction under percentClosed (default 20%).
   */
  computeGreedyProtection(
    candidateSegmentIds: string[],
    maxPicks = 3,
    percentClosed = 20
  ): {
    protectedSegmentIds: string[];
    beforeSimulation: SimulationResult;
    afterSimulation: SimulationResult;
    reconnectedCount: number;
    timeSavedWorstMin: number;
  } {
    const beforeSimulation = this.simulate(percentClosed);
    const chosenProtected: string[] = [];
    const pool = Array.from(new Set(candidateSegmentIds));

    for (let round = 0; round < maxPicks; round++) {
      let bestCandidate: string | null = null;
      let bestScore = Infinity; // Objective: minimize (areasCutOff * 1000 + avgExtraDelayMin)

      for (const cand of pool) {
        if (chosenProtected.includes(cand)) continue;
        const testProtected = [...chosenProtected, cand];
        const res = this.simulate(percentClosed, testProtected);
        const objScore = res.summary.areasCutOff * 1000 + res.summary.avgExtraDelayMin;

        if (objScore < bestScore) {
          bestScore = objScore;
          bestCandidate = cand;
        }
      }

      if (bestCandidate) {
        chosenProtected.push(bestCandidate);
      }
    }

    const afterSimulation = this.simulate(percentClosed, chosenProtected);
    const reconnectedCount = Math.max(0, beforeSimulation.summary.areasCutOff - afterSimulation.summary.areasCutOff);
    const timeSavedWorstMin = Number(Math.max(0, beforeSimulation.summary.worstExtraDelayMin - afterSimulation.summary.worstExtraDelayMin).toFixed(1));

    return {
      protectedSegmentIds: chosenProtected,
      beforeSimulation,
      afterSimulation,
      reconnectedCount,
      timeSavedWorstMin,
    };
  }

  /**
   * Routes from an arbitrary graph node to nearest hospital under specified closure percent.
   * Reuses the multi-source Dijkstra and route reconstruction without altering closure maths.
   */
  routeFromNode(nodeId: string, percentClosed: number): {
    baselineMin: number;
    scenarioMin: number | null;
    extraDelayMin: number;
    isCutOff: boolean;
    nearestHospitalBefore: string;
    nearestHospitalAfter: string | null;
    routeBefore: string[];
    routeAfter: string[];
    routeCoordinatesBefore: [number, number][];
    routeCoordinatesAfter: [number, number][];
    roadNamesBefore: string[];
    roadNamesAfter: string[];
    closedSegmentIds: string[];
  } {
    const clampedPercent = Math.max(0, Math.min(100, percentClosed));
    const totalEdges = this.sortedEdgesByRiskDesc.length;
    const numClosed =
      clampedPercent === 0
        ? 0
        : Math.max(1, Math.round((clampedPercent / 100) * totalEdges));

    const closedEdges = this.sortedEdgesByRiskDesc.slice(0, numClosed);
    const closedSegmentIds = closedEdges.map((e) => e.segmentId);
    const closedSet = new Set(closedSegmentIds);

    const scenarioState =
      numClosed === 0
        ? this.baselineState!
        : this.runMultiSourceDijkstra(closedSet);

    const bDist = this.baselineState!.distances.get(nodeId) ?? Infinity;
    const bHosp = this.baselineState!.nearestHospitals.get(nodeId) ?? "Unknown Hospital";
    const bRoute = bDist < Infinity ? this.reconstructRoute(nodeId, this.baselineState!) : { segmentIds: [], coordinates: [] };

    const sDist = scenarioState.distances.get(nodeId) ?? Infinity;
    const isCutOff = sDist === Infinity;
    const sHosp = !isCutOff ? scenarioState.nearestHospitals.get(nodeId) ?? null : null;
    const sRoute = !isCutOff ? this.reconstructRoute(nodeId, scenarioState) : { segmentIds: [], coordinates: [] };

    const extraDelayMin = !isCutOff && bDist < Infinity
      ? Number(Math.max(0, sDist - bDist).toFixed(1))
      : 0;

    const extractRoadNames = (segIds: string[]) => {
      const names: string[] = [];
      for (const id of segIds) {
        const edge = this.edgeMapBySegmentId.get(id);
        const name = edge?.name;
        if (name && names[names.length - 1] !== name) {
          names.push(name);
        }
      }
      return names;
    };

    return {
      baselineMin: bDist < Infinity ? Number(bDist.toFixed(1)) : 0,
      scenarioMin: !isCutOff ? Number(sDist.toFixed(1)) : null,
      extraDelayMin,
      isCutOff,
      nearestHospitalBefore: bHosp,
      nearestHospitalAfter: sHosp,
      routeBefore: bRoute.segmentIds,
      routeAfter: sRoute.segmentIds,
      routeCoordinatesBefore: bRoute.coordinates,
      routeCoordinatesAfter: sRoute.coordinates,
      roadNamesBefore: extractRoadNames(bRoute.segmentIds),
      roadNamesAfter: extractRoadNames(sRoute.segmentIds),
      closedSegmentIds,
    };
  }

  getGraph(): SegmentGraph {
    return this.graph;
  }
}

// Global cached engine instance
let globalEngine: ClosureEngine | null = null;

export function getOrCreateClosureEngine(
  segments: VulnerabilitySegment[],
  hospitals: Array<{ id: string; name: string; lat: number; lon: number; emergency?: string; beds?: number }>
): ClosureEngine {
  if (!globalEngine) {
    const graph = buildSegmentGraph(segments, hospitals);
    globalEngine = new ClosureEngine(graph);
  }
  return globalEngine;
}

/**
 * Snaps user lat/lon coordinate to nearest graph node within maxDistanceMeters (default 250m).
 * Returns snapped node or null if outside distance threshold.
 */
export function snapPointToGraph(
  graph: SegmentGraph,
  lat: number,
  lon: number,
  maxDistanceMeters = 250
): { node: GraphNode; distanceMeters: number; roadName: string } | null {
  if (!graph || !graph.nodes || graph.nodes.length === 0) return null;

  let bestNode: GraphNode | null = null;
  let minDist = Infinity;

  for (const n of graph.nodes) {
    const d = haversineDistanceMeters(lat, lon, n.lat, n.lon);
    if (d < minDist) {
      minDist = d;
      bestNode = n;
    }
  }

  if (!bestNode || minDist > maxDistanceMeters) {
    return null;
  }

  // Find adjacent road name
  const neighbors = graph.adjacency.get(bestNode.id) || [];
  const roadName = neighbors[0]?.edge?.name || "Corridor";

  return {
    node: bestNode,
    distanceMeters: Math.round(minDist),
    roadName,
  };
}
