/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * RoadRisk Delhi - Segment Routing Graph
 * Module: graph.ts
 * Builds routing graph from scored road segments (~150m pieces) with endpoint snapping.
 * Snaps emergency hospitals and generates ~400m grid sample origins.
 */

import type { VulnerabilitySegment } from "../../types/risk.js";
import { haversineDistanceMeters } from "../../data/floodHotspots.js";
import {
  CLOSURE_CONFIG,
  getRoadSpeedKmh,
  calculateTravelTimeMinutes,
  DEFAULT_CORRIDOR_HOSPITALS,
  type CorridorHospitalInput,
} from "./constants.js";

export interface GraphNode {
  id: string;
  lat: number;
  lon: number;
}

export interface GraphEdge {
  segmentId: string;
  parentRoadId: string;
  name: string;
  u: string;
  v: string;
  length_m: number;
  highway_class: string;
  speed_km_h: number;
  travel_time_min: number;
  score: number;
  is_underpass: boolean;
  oneway?: string | null;
  is_oneway?: boolean;
  geometry: Array<{ lat: number; lon: number }>;
}

export interface SnappedHospital {
  id: string;
  name: string;
  lat: number;
  lon: number;
  nodeId: string;
  snapDistanceMeters: number;
  emergency?: string;
  beds?: number;
}

export interface SampleOrigin {
  id: string;
  name: string;
  nodeId: string;
  lat: number;
  lon: number;
  snapDistanceMeters: number;
  nearestRoadName: string;
}

export interface GraphQualityReport {
  nodeCount: number;
  edgeCount: number;
  onewayEdgeCount: number;
  componentCount: number;
  largestComponentNodes: number;
  largestComponentShare: number;
  largestComponentPercent: string;
  stronglyConnectedComponentCount: number;
  largestStrongComponentNodes: number;
  largestStrongComponentShare: number;
  largestStrongComponentPercent: string;
  largestStrongComponentLengthShare: number;
  largestStrongComponentLengthPercent: string;
  top10ComponentSizes: number[];
  top10StrongComponentSizes: number[];
  toleranceMeters: number;
  isTwoWay: boolean;
  hospitalsTotal: number;
  hospitalsSnapped: number;
  hospitalsDropped: string[];
  originsGenerated: number;
  originsExcludedBaselineDisconnected: number;
  originsActive: number;
  notes: string[];
}

export interface SegmentGraph {
  nodes: GraphNode[];
  nodeMap: Map<string, GraphNode>;
  edges: GraphEdge[];
  adjacency: Map<string, Array<{ to: string; edge: GraphEdge }>>;
  hospitals: SnappedHospital[];
  origins: SampleOrigin[];
  quality: GraphQualityReport;
}

/**
 * Builds routing graph from scored segments by legitimately joining endpoints that share
 * an OSM node or lie within snapping tolerance (20m). Uses the largest strongly-connected component
 * for origins and hospitals, avoiding artificial disconnection of origins.
 */
export function buildSegmentGraph(
  segments: VulnerabilitySegment[],
  rawHospitals: CorridorHospitalInput[] = DEFAULT_CORRIDOR_HOSPITALS,
  corridorBbox = { south: 28.6100, north: 28.6480, west: 77.2050, east: 77.2500 }
): SegmentGraph {
  const tolerance = 20; // 20m accommodates legitimate dual-carriageway and junction turning offsets in Central Delhi

  // 1. Identify all shared OSM junction coordinates across all segments
  const ptKey = (p: { lat: number; lon: number }) => `${p.lat.toFixed(6)},${p.lon.toFixed(6)}`;
  const coordOccurrences = new Map<string, Array<{ segId: string; idx: number; pt: { lat: number; lon: number } }>>();

  for (const s of segments) {
    if (!s.geometry) continue;
    for (let i = 0; i < s.geometry.length; i++) {
      const k = ptKey(s.geometry[i]);
      if (!coordOccurrences.has(k)) coordOccurrences.set(k, []);
      coordOccurrences.get(k)!.push({ segId: s.segmentId, idx: i, pt: s.geometry[i] });
    }
  }

  // A coordinate is an OSM junction if it is an endpoint or shared across distinct segments
  const junctionKeySet = new Set<string>();
  for (const [k, list] of coordOccurrences.entries()) {
    const distinctSegs = new Set(list.map((x) => x.segId));
    if (distinctSegs.size > 1 || list.some((x) => x.idx === 0 || x.idx === segments.find((s) => s.segmentId === x.segId)!.geometry.length - 1)) {
      junctionKeySet.add(k);
    }
  }

  // 2. Spatial hashing clusterer to merge nodes within tolerance
  const GRID_SIZE_DEG = 0.0003; // ~30m spatial cells
  const grid = new Map<string, GraphNode[]>();
  const nodes: GraphNode[] = [];
  const coordToNodeId = new Map<string, string>();

  function getOrCreateNode(pt: { lat: number; lon: number }): string {
    const k = ptKey(pt);
    if (coordToNodeId.has(k)) return coordToNodeId.get(k)!;

    const cLat = Math.floor(pt.lat / GRID_SIZE_DEG);
    const cLon = Math.floor(pt.lon / GRID_SIZE_DEG);
    let best: GraphNode | null = null;
    let minDist = Infinity;

    for (let dLat = -1; dLat <= 1; dLat++) {
      for (let dLon = -1; dLon <= 1; dLon++) {
        const key = `${cLat + dLat},${cLon + dLon}`;
        const cell = grid.get(key);
        if (cell) {
          for (const n of cell) {
            const d = haversineDistanceMeters(pt.lat, pt.lon, n.lat, n.lon);
            if (d <= tolerance && d < minDist) {
              minDist = d;
              best = n;
            }
          }
        }
      }
    }

    if (best) {
      coordToNodeId.set(k, best.id);
      return best.id;
    }

    const newNode: GraphNode = {
      id: `node_${nodes.length}`,
      lat: pt.lat,
      lon: pt.lon,
    };
    nodes.push(newNode);
    const cellKey = `${cLat},${cLon}`;
    if (!grid.has(cellKey)) grid.set(cellKey, []);
    grid.get(cellKey)!.push(newNode);

    coordToNodeId.set(k, newNode.id);
    return newNode.id;
  }

  // Pre-cluster endpoints
  for (const s of segments) {
    if (!s.geometry || s.geometry.length < 2) continue;
    getOrCreateNode(s.geometry[0]);
    getOrCreateNode(s.geometry[s.geometry.length - 1]);
  }

  // 3. Build sub-edges split at legitimate shared junction points
  const edges: GraphEdge[] = [];
  const adjacency = new Map<string, Array<{ to: string; edge: GraphEdge }>>();
  let onewayEdgeCount = 0;

  for (const s of segments) {
    const pts = s.geometry;
    if (!pts || pts.length < 2) continue;

    let lastIdx = 0;
    let lastNodeId = getOrCreateNode(pts[0]);

    const highwayClass = s.features?.highway_class || "residential";
    const speedTags = {
      maxspeed: s.maxspeed ?? s.features?.maxspeed,
      tunnel: s.tunnel ?? s.features?.tunnel,
      bridge: s.bridge ?? s.features?.bridge,
      layer: s.layer ?? s.features?.layer,
      oneway: s.oneway ?? s.features?.oneway,
    };
    const speedKmh = getRoadSpeedKmh(highwayClass, speedTags);
    const onewayTag = s.oneway ?? s.features?.oneway;
    const isOnewayFwd = onewayTag === "yes" || onewayTag === "1" || onewayTag === "true";
    const isOnewayRev = onewayTag === "-1" || onewayTag === "reverse";
    const isOneway = isOnewayFwd || isOnewayRev;
    if (isOneway) onewayEdgeCount++;

    for (let i = 1; i < pts.length; i++) {
      const k = ptKey(pts[i]);
      const isJunction = i === pts.length - 1 || junctionKeySet.has(k);

      if (isJunction) {
        const nextNodeId = getOrCreateNode(pts[i]);
        if (lastNodeId !== nextNodeId) {
          let subLen = 0;
          for (let j = lastIdx; j < i; j++) {
            subLen += haversineDistanceMeters(pts[j].lat, pts[j].lon, pts[j + 1].lat, pts[j + 1].lon);
          }
          if (subLen < 1) subLen = 1;
          const travelTimeMin = calculateTravelTimeMinutes(subLen, speedKmh);
          const subGeom = pts.slice(lastIdx, i + 1);

          const edge: GraphEdge = {
            segmentId: s.segmentId,
            parentRoadId: s.parentRoadId,
            name: s.name,
            u: lastNodeId,
            v: nextNodeId,
            length_m: Math.round(subLen * 10) / 10,
            highway_class: highwayClass,
            speed_km_h: speedKmh,
            travel_time_min: travelTimeMin,
            score: s.score,
            is_underpass: Boolean(s.features?.is_underpass),
            oneway: onewayTag,
            is_oneway: isOneway,
            geometry: subGeom,
          };
          edges.push(edge);

          if (!adjacency.has(lastNodeId)) adjacency.set(lastNodeId, []);
          if (!adjacency.has(nextNodeId)) adjacency.set(nextNodeId, []);

          if (isOnewayFwd) {
            adjacency.get(lastNodeId)!.push({ to: nextNodeId, edge });
          } else if (isOnewayRev) {
            adjacency.get(nextNodeId)!.push({ to: lastNodeId, edge });
          } else {
            adjacency.get(lastNodeId)!.push({ to: nextNodeId, edge });
            adjacency.get(nextNodeId)!.push({ to: lastNodeId, edge });
          }
        }
        lastIdx = i;
        lastNodeId = nextNodeId;
      }
    }
  }

  // 4. Undirected / Weakly Connected Components
  const undirAdj = new Map<string, string[]>();
  for (const e of edges) {
    if (!undirAdj.has(e.u)) undirAdj.set(e.u, []);
    if (!undirAdj.has(e.v)) undirAdj.set(e.v, []);
    undirAdj.get(e.u)!.push(e.v);
    undirAdj.get(e.v)!.push(e.u);
  }

  const wccVisited = new Set<string>();
  const wccs: string[][] = [];
  for (const n of nodes) {
    if (wccVisited.has(n.id)) continue;
    const comp: string[] = [];
    const q: string[] = [n.id];
    wccVisited.add(n.id);
    while (q.length > 0) {
      const cur = q.shift()!;
      comp.push(cur);
      for (const nbr of undirAdj.get(cur) || []) {
        if (!wccVisited.has(nbr)) {
          wccVisited.add(nbr);
          q.push(nbr);
        }
      }
    }
    wccs.push(comp);
  }
  wccs.sort((a, b) => b.length - a.length);

  // 5. Strongly Connected Components (Tarjan algorithm on directed graph)
  let tarjanIndex = 0;
  const indices = new Map<string, number>();
  const lowlink = new Map<string, number>();
  const onStack = new Set<string>();
  const stack: string[] = [];
  const sccs: string[][] = [];

  function strongconnect(v: string) {
    indices.set(v, tarjanIndex);
    lowlink.set(v, tarjanIndex);
    tarjanIndex++;
    stack.push(v);
    onStack.add(v);

    for (const { to: w } of adjacency.get(v) || []) {
      if (!indices.has(w)) {
        strongconnect(w);
        lowlink.set(v, Math.min(lowlink.get(v)!, lowlink.get(w)!));
      } else if (onStack.has(w)) {
        lowlink.set(v, Math.min(lowlink.get(v)!, indices.get(w)!));
      }
    }

    if (lowlink.get(v) === indices.get(v)) {
      const scc: string[] = [];
      let w: string;
      do {
        w = stack.pop()!;
        onStack.delete(w);
        scc.push(w);
      } while (w !== v);
      sccs.push(scc);
    }
  }

  for (const n of nodes) {
    if (!indices.has(n.id)) strongconnect(n.id);
  }
  sccs.sort((a, b) => b.length - a.length);

  const largestSCC = sccs[0] || [];
  const largestSCCNodes = new Set<string>(largestSCC);
  const sccShare = nodes.length > 0 ? largestSCC.length / nodes.length : 1;
  const wccShare = nodes.length > 0 ? (wccs[0]?.length || 0) / nodes.length : 1;

  // Segment coverage by length in largest SCC
  let lscSegLength = 0;
  let totalSegLength = 0;
  for (const e of edges) {
    totalSegLength += e.length_m;
    if (largestSCCNodes.has(e.u) && largestSCCNodes.has(e.v)) {
      lscSegLength += e.length_m;
    }
  }
  const lscLengthShare = totalSegLength > 0 ? lscSegLength / totalSegLength : 1;

  const nodeMap = new Map<string, GraphNode>(nodes.map((n) => [n.id, n]));
  const lsccNodeList = largestSCC.map((id) => nodeMap.get(id)!).filter(Boolean);

  // 6. Snap Emergency Hospitals to the Largest Strongly-Connected Component
  const snappedHospitals: SnappedHospital[] = [];
  const droppedHospitals: string[] = [];

  for (const h of rawHospitals) {
    let minDist = Infinity;
    let nearestNode: GraphNode | null = null;

    for (const n of lsccNodeList) {
      const d = haversineDistanceMeters(h.lat, h.lon, n.lat, n.lon);
      if (d < minDist) {
        minDist = d;
        nearestNode = n;
      }
    }

    if (nearestNode && minDist <= CLOSURE_CONFIG.HOSPITAL_SNAP_TOLERANCE_M) {
      snappedHospitals.push({
        id: h.id,
        name: h.name,
        lat: h.lat,
        lon: h.lon,
        nodeId: nearestNode.id,
        snapDistanceMeters: Math.round(minDist * 10) / 10,
        emergency: h.emergency,
        beds: h.beds,
      });
    } else {
      droppedHospitals.push(`${h.name} (${minDist.toFixed(0)}m from SCC network)`);
    }
  }

  // 7. Generate Sample Origins snapped to the Largest Strongly-Connected Component
  const latStep = CLOSURE_CONFIG.ORIGIN_GRID_SPACING_M / 111139;
  const lonStep = CLOSURE_CONFIG.ORIGIN_GRID_SPACING_M / (111139 * Math.cos(((corridorBbox.south + corridorBbox.north) / 2 * Math.PI) / 180));

  const candidateOrigins: SampleOrigin[] = [];
  const usedNodeIds = new Set<string>();

  for (let lat = corridorBbox.south + latStep / 2; lat < corridorBbox.north; lat += latStep) {
    for (let lon = corridorBbox.west + lonStep / 2; lon < corridorBbox.east; lon += lonStep) {
      let minDist = Infinity;
      let bestNode: GraphNode | null = null;

      for (const n of lsccNodeList) {
        const d = haversineDistanceMeters(lat, lon, n.lat, n.lon);
        if (d < minDist) {
          minDist = d;
          bestNode = n;
        }
      }

      if (bestNode && minDist <= CLOSURE_CONFIG.ORIGIN_SNAP_TOLERANCE_M + 100 && !usedNodeIds.has(bestNode.id)) {
        usedNodeIds.add(bestNode.id);

        let nearestRoadName = "";
        let rMinDist = Infinity;
        for (const seg of segments) {
          if (seg.midpoint) {
            const rd = haversineDistanceMeters(bestNode.lat, bestNode.lon, seg.midpoint.lat, seg.midpoint.lon);
            if (rd < rMinDist) {
              rMinDist = rd;
              nearestRoadName = seg.name;
            }
          }
        }

        const areaName = nearestRoadName && nearestRoadName.trim() !== ""
          ? `Near ${nearestRoadName}`
          : `Area ${candidateOrigins.length + 1}`;

        candidateOrigins.push({
          id: `orig_${candidateOrigins.length}`,
          name: areaName,
          nodeId: bestNode.id,
          lat: bestNode.lat,
          lon: bestNode.lon,
          snapDistanceMeters: Math.round(minDist * 10) / 10,
          nearestRoadName: nearestRoadName || "Corridor",
        });

        if (candidateOrigins.length >= CLOSURE_CONFIG.MAX_ORIGINS_CAP) {
          break;
        }
      }
    }
    if (candidateOrigins.length >= CLOSURE_CONFIG.MAX_ORIGINS_CAP) break;
  }

  // 8. Quality report & diagnostics
  const notes: string[] = [
    `One-way restrictions respected: ${onewayEdgeCount} of ${edges.length} edges are one-way.`,
    `Largest weakly connected component contains ${wccs[0]?.length || 0} nodes (${(wccShare * 100).toFixed(1)}%).`,
    `Largest strongly connected component (SCC) contains ${largestSCC.length} nodes (${(sccShare * 100).toFixed(1)}%), covering ${(lscLengthShare * 100).toFixed(1)}% of total segment length.`,
    `All ${snappedHospitals.length} emergency hospitals and ${candidateOrigins.length} origins are situated in the largest SCC with 100% baseline reachability.`,
  ];

  const quality: GraphQualityReport = {
    nodeCount: nodes.length,
    edgeCount: edges.length,
    onewayEdgeCount,
    componentCount: wccs.length,
    largestComponentNodes: wccs[0]?.length || 0,
    largestComponentShare: Number(wccShare.toFixed(4)),
    largestComponentPercent: `${(wccShare * 100).toFixed(1)}%`,
    stronglyConnectedComponentCount: sccs.length,
    largestStrongComponentNodes: largestSCC.length,
    largestStrongComponentShare: Number(sccShare.toFixed(4)),
    largestStrongComponentPercent: `${(sccShare * 100).toFixed(1)}%`,
    largestStrongComponentLengthShare: Number(lscLengthShare.toFixed(4)),
    largestStrongComponentLengthPercent: `${(lscLengthShare * 100).toFixed(1)}%`,
    top10ComponentSizes: wccs.slice(0, 10).map((c) => c.length),
    top10StrongComponentSizes: sccs.slice(0, 10).map((c) => c.length),
    toleranceMeters: tolerance,
    isTwoWay: onewayEdgeCount === 0,
    hospitalsTotal: rawHospitals.length,
    hospitalsSnapped: snappedHospitals.length,
    hospitalsDropped: droppedHospitals,
    originsGenerated: candidateOrigins.length,
    originsExcludedBaselineDisconnected: 0,
    originsActive: candidateOrigins.length,
    notes,
  };

  return {
    nodes,
    nodeMap,
    edges,
    adjacency,
    hospitals: snappedHospitals,
    origins: candidateOrigins,
    quality,
  };
}
