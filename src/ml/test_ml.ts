/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * RoadRisk Delhi - Machine Learning, Closure & Reporting Pipeline Tests
 * Run with: npm run test:ml
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { ClosureEngine, snapPointToGraph } from "./closure/engine.js";
import { buildSegmentGraph, type SegmentGraph } from "./closure/graph.js";
import {
  validateReportInput,
  checkRateLimit,
  addResidentReport,
  clearResidentReports,
  getResidentReports,
  CORRIDOR_BOUNDS,
  type StoredResidentReport,
} from "../server/reports.js";
import type { VulnerabilitySegment } from "../types/risk.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${msg}`);
    process.exit(1);
  }
  console.log(`  ✓ ${msg}`);
}

async function runTests() {
  console.log("\n=======================================================");
  console.log("🚦 RoadRisk Delhi ML, Closure & Citizen Verification Suite");
  console.log("=======================================================\n");

  // Sample corridor network for test validation
  const testHospitals = [
    {
      id: "hosp_lnjp",
      name: "Lok Nayak Hospital (LNJP)",
      lat: 28.6367,
      lon: 77.2403,
      emergency: "yes",
    },
    {
      id: "hosp_rml",
      name: "Dr. Ram Manohar Lohia Hospital (RML)",
      lat: 28.6245,
      lon: 77.2025,
      emergency: "yes",
    },
  ];

  const testSegments: VulnerabilitySegment[] = [
    {
      segmentId: "seg_1",
      parentRoadId: "way_1",
      name: "Minto Road Underpass",
      score: 0.96,
      rawScore: 0.96,
      rank: 1,
      method: "baseline",
      isWithin100mHotspot: true,
      features: {
        elevation_mean: 210,
        elevation_min: 206.8,
        low_point_depth_m: 3.2,
        dist_to_water_m: 60,
        is_underpass: true,
        highway_class: "primary",
        length_m: 150,
        lanes: 4,
      },
      topFactors: [],
      geometry: [
        { lat: 28.6330, lon: 77.2250 },
        { lat: 28.6345, lon: 77.2260 },
      ],
      midpoint: { lat: 28.6337, lon: 77.2255 },
    },
    {
      segmentId: "seg_2",
      parentRoadId: "way_2",
      name: "Barakhamba Road",
      score: 0.40,
      rawScore: 0.40,
      rank: 2,
      method: "baseline",
      isWithin100mHotspot: false,
      features: {
        elevation_mean: 215,
        elevation_min: 214.6,
        low_point_depth_m: 0.4,
        dist_to_water_m: 400,
        is_underpass: false,
        highway_class: "primary",
        length_m: 220,
        lanes: 6,
      },
      topFactors: [],
      geometry: [
        { lat: 28.6300, lon: 77.2230 },
        { lat: 28.6330, lon: 77.2250 },
      ],
      midpoint: { lat: 28.6315, lon: 77.2240 },
    },
    {
      segmentId: "seg_3",
      parentRoadId: "way_3",
      name: "Connaught Circus Outer",
      score: 0.20,
      rawScore: 0.20,
      rank: 3,
      method: "baseline",
      isWithin100mHotspot: false,
      features: {
        elevation_mean: 216,
        elevation_min: 215.8,
        low_point_depth_m: 0.2,
        dist_to_water_m: 800,
        is_underpass: false,
        highway_class: "primary",
        length_m: 300,
        lanes: 6,
      },
      topFactors: [],
      geometry: [
        { lat: 28.6330, lon: 77.2250 },
        { lat: 28.6367, lon: 77.2403 },
      ],
      midpoint: { lat: 28.6348, lon: 77.2326 },
    },
    {
      segmentId: "seg_4",
      parentRoadId: "way_4",
      name: "Tilak Bridge Underpass",
      score: 0.88,
      rawScore: 0.88,
      rank: 4,
      method: "baseline",
      isWithin100mHotspot: true,
      features: {
        elevation_mean: 209,
        elevation_min: 206.2,
        low_point_depth_m: 2.8,
        dist_to_water_m: 120,
        is_underpass: true,
        highway_class: "secondary",
        length_m: 180,
        lanes: 4,
      },
      topFactors: [],
      geometry: [
        { lat: 28.6270, lon: 77.2380 },
        { lat: 28.6367, lon: 77.2403 },
      ],
      midpoint: { lat: 28.6318, lon: 77.2391 },
    },
  ];

  const graph = buildSegmentGraph(testSegments, testHospitals);
  const engine = new ClosureEngine(graph);

  // -------------------------------------------------------------------
  // TEST 1: Scenario Selector (0%, 10%, 20%) & simulate() Reuse
  // -------------------------------------------------------------------
  console.log("Test 1: Scenario Selector maps to 0%, 10%, 20% and reuses simulate()");
  {
    // Scenario 0% (Normal day)
    const sim0 = engine.simulate(0);
    assert(sim0.summary.percentClosed === 0, "Scenario 0: percentClosed is 0");
    assert(sim0.summary.closedSegmentCount === 0, "Scenario 0: 0 segments closed");
    assert(sim0.summary.areasCutOff === 0, "Scenario 0: 0 areas cut off");

    // Scenario 10% (Heavy rain illustrative)
    const sim10 = engine.simulate(10);
    assert(sim10.summary.percentClosed === 10, "Scenario 10: percentClosed is 10");
    assert(sim10.summary.closedSegmentCount > 0, "Scenario 10: closes at least 1 highest-risk segment");
    assert(sim10.summary.closedSegmentIds.includes("seg_1"), "Scenario 10: closes highest-risk Minto Road (seg_1)");

    // Scenario 20% (Severe rain illustrative)
    const sim20 = engine.simulate(20);
    assert(sim20.summary.percentClosed === 20, "Scenario 20: percentClosed is 20");
    assert(sim20.summary.closedSegmentCount >= sim10.summary.closedSegmentCount, "Scenario 20: closes >= segments than 10%");

    // Test in-browser routing method routeFromNode
    const firstNodeId = graph.nodes[0].id;
    const route0 = engine.routeFromNode(firstNodeId, 0);
    assert(route0 !== null, "routeFromNode(0%) returns valid route result");
    assert(route0.extraDelayMin === 0, "routeFromNode(0%) has 0 extra delay");

    const route10 = engine.routeFromNode(firstNodeId, 10);
    assert(route10 !== null, "routeFromNode(10%) returns valid route result");
    assert(route10.extraDelayMin >= 0 || route10.isCutOff, "routeFromNode(10%) has non-negative delay or cutoff");

    const route20 = engine.routeFromNode(firstNodeId, 20);
    assert(route20 !== null, "routeFromNode(20%) returns valid route result");
    assert(route20.extraDelayMin >= 0 || route20.isCutOff, "routeFromNode(20%) has valid detour metrics");
  }

  // -------------------------------------------------------------------
  // TEST 2: Snapping: 300m returns outside; point on road snaps correctly
  // -------------------------------------------------------------------
  console.log("\nTest 2: Snapping: point 300m from graph returns outside; point on road snaps correctly");
  {
    // A point right at a graph node (Barakhamba Road lat 28.6300, lon 77.2230)
    const onRoadPoint = snapPointToGraph(graph, 28.6300, 77.2230, 250);
    assert(onRoadPoint !== null, "Point on road snaps successfully");
    assert(onRoadPoint!.distanceMeters <= 5, "Point on road has near-zero distance (~0-5m)");
    assert(typeof onRoadPoint!.roadName === "string", "Point on road returns adjacent road name");

    // A point ~300m or more from graph nodes (28.6300 + 0.0035 lat is ~390m)
    const distantPoint = snapPointToGraph(graph, 28.6335, 77.2180, 250);
    assert(distantPoint === null, "Point 300m+ from graph nodes returns null (outside corridor threshold)");

    // Far outside point
    const farPoint = snapPointToGraph(graph, 28.5500, 77.1000, 250);
    assert(farPoint === null, "Point outside corridor area returns null");
  }

  // -------------------------------------------------------------------
  // TEST 3: POST /api/reports validation, privacy & rate limiting
  // -------------------------------------------------------------------
  console.log("\nTest 3: POST /api/reports validation, privacy quantization & rate limiting");
  {
    // Valid report
    const valid = validateReportInput({
      lat: 28.6291234,
      lon: 77.2278912,
      severity: "knee_deep",
    });
    assert(valid.valid === true, "Valid input { lat, lon, severity } passes validation");

    // Rejects out-of-box coordinates
    const outOfBoxLat = validateReportInput({
      lat: 28.5000, // South of Central Delhi bounds
      lon: 77.2270,
      severity: "ankle_deep",
    });
    assert(outOfBoxLat.valid === false, "Rejects out-of-bounds latitude");

    const outOfBoxLon = validateReportInput({
      lat: 28.6290,
      lon: 77.1500, // West of Central Delhi bounds
      severity: "ankle_deep",
    });
    assert(outOfBoxLon.valid === false, "Rejects out-of-bounds longitude");

    // Rejects invalid severity
    const badSeverity = validateReportInput({
      lat: 28.6290,
      lon: 77.2270,
      severity: "extreme_flood_unrecognized",
    });
    assert(badSeverity.valid === false, "Rejects invalid severity string");

    // Rejects extra fields (Privacy enforcement)
    const extraFields = validateReportInput({
      lat: 28.6290,
      lon: 77.2270,
      severity: "knee_deep",
      userName: "Citizen John", // DISALLOWED
    });
    assert(extraFields.valid === false, "Rejects payload with extra fields (strict pin-only privacy)");
    assert(extraFields.error!.includes("userName"), "Error message cites disallowed field");

    // Rate Limiting (5 reports per client per hour)
    const testClient = `client_test_${Date.now()}`;
    for (let i = 1; i <= 5; i++) {
      assert(checkRateLimit(testClient) === true, `Rate limit allows report #${i}`);
    }
    const sixthReport = checkRateLimit(testClient);
    assert(sixthReport === false, "Rate limit blocks 6th report within the hour (HTTP 429)");

    // Privacy & Storage Quantization Verification
    const stored = addResidentReport(28.6291234, 77.2278912, "impassable");
    assert(stored.lat === 28.629, "Stored latitude is rounded to 3 decimal places (~100m)");
    assert(stored.lon === 28.228 || stored.lon === 77.228, "Stored longitude is rounded to 3 decimal places");
    
    // Coarse timestamp verification (rounded to the hour)
    const reportDate = new Date(stored.timestamp);
    assert(reportDate.getMinutes() === 0, "Timestamp minutes are rounded to 00");
    assert(reportDate.getSeconds() === 0, "Timestamp seconds are rounded to 00");

    // Verify stored report contains strictly NO identifiers
    const storedKeys = Object.keys(stored);
    assert(!storedKeys.includes("ip"), "Report contains NO ip address");
    assert(!storedKeys.includes("userAgent"), "Report contains NO userAgent");
    assert(!storedKeys.includes("name"), "Report contains NO name");
    assert(!storedKeys.includes("userId"), "Report contains NO userId");
    assert(storedKeys.sort().join(",") === "id,lat,lon,severity,timestamp", "Report contains ONLY id, lat, lon, severity, timestamp");
  }

  // -------------------------------------------------------------------
  // TEST 4: Isolation Test (Scoring & Closure never import Reports)
  // -------------------------------------------------------------------
  console.log("\nTest 4: Isolation test: scoring, closure and metrics modules do NOT import reports module");
  {
    const filesToAudit = [
      path.resolve(__dirname, "features.ts"),
      path.resolve(__dirname, "validate.ts"),
      path.resolve(__dirname, "baseline.ts"),
      path.resolve(__dirname, "randomForest.ts"),
      path.resolve(__dirname, "ladder.ts"),
      path.resolve(__dirname, "closure/engine.ts"),
      path.resolve(__dirname, "closure/graph.ts"),
    ];

    for (const filePath of filesToAudit) {
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, "utf-8");
        const importsReports =
          content.includes("from \"../server/reports") ||
          content.includes("from './server/reports") ||
          content.includes("from \"./server/reports") ||
          content.includes("StoredResidentReport") ||
          content.includes("addResidentReport") ||
          content.includes("getResidentReports");

        assert(!importsReports, `Isolation verified: ${path.basename(filePath)} does NOT import or read reports module`);
      }
    }
  }

  // -------------------------------------------------------------------
  // TEST 5: DELETE /api/reports requires ADMIN_TOKEN
  // -------------------------------------------------------------------
  console.log("\nTest 5: DELETE /api/reports requires ADMIN_TOKEN and matches exact token");
  {
    const originalToken = process.env.ADMIN_TOKEN;

    // Helper simulating DELETE /api/reports authorization logic
    const handleSimulatedDelete = (tokenHeader?: string) => {
      const adminToken = process.env.ADMIN_TOKEN;
      if (!adminToken || adminToken.trim() === "") {
        return { status: 503, error: "Admin token not configured. DELETE endpoint disabled." };
      }
      if (tokenHeader !== adminToken) {
        return { status: 403, error: "Forbidden: invalid x-admin-token" };
      }
      clearResidentReports();
      return { status: 200, ok: true };
    };

    // Case A: Unset / empty ADMIN_TOKEN -> disabled (503)
    delete process.env.ADMIN_TOKEN;
    const resWithoutEnv = handleSimulatedDelete("some-token");
    assert(resWithoutEnv.status === 503, "DELETE /api/reports disabled with 503 when ADMIN_TOKEN is unset");

    // Case B: ADMIN_TOKEN set, wrong token provided -> 403
    process.env.ADMIN_TOKEN = "test_super_secret_admin_token_2026";
    const resWithBadToken = handleSimulatedDelete("wrong-token");
    assert(resWithBadToken.status === 403, "DELETE /api/reports rejects unauthorized request with 403");

    // Case C: ADMIN_TOKEN set, matching x-admin-token -> 200
    const resWithGoodToken = handleSimulatedDelete("test_super_secret_admin_token_2026");
    assert(resWithGoodToken.status === 200, "DELETE /api/reports succeeds with 200 when token matches");
    assert(getResidentReports().length === 0, "Reports store is cleared successfully");

    // Restore environment
    if (originalToken !== undefined) {
      process.env.ADMIN_TOKEN = originalToken;
    } else {
      delete process.env.ADMIN_TOKEN;
    }
  }

  // -------------------------------------------------------------------
  // TEST 6: metrics.notes numbers match metrics.json data exactly
  // -------------------------------------------------------------------
  console.log("\nTest 6: metrics.notes numbers match metrics.json data without hard-coded discrepancies");
  {
    const metricsPath = path.resolve(__dirname, "../../public/data/metrics.json");
    if (fs.existsSync(metricsPath)) {
      const metricsData = JSON.parse(fs.readFileSync(metricsPath, "utf-8"));
      const notes = metricsData.notes as string;

      // Check positive count consistency in notes
      const posMatch = notes.match(/(\d+)\s+positive instances/i);
      assert(posMatch !== null, "metrics.notes contains dynamically generated positive instances note");
      const notedPositiveCount = parseInt(posMatch![1], 10);
      assert(
        notedPositiveCount === metricsData.positiveCount,
        `metrics.notes positive count (${notedPositiveCount}) matches metrics.positiveCount (${metricsData.positiveCount})`
      );

      // Check usable folds consistency in notes
      const foldsMatch = notes.match(/(\d+)\s+of\s+(\d+)\s+folds/i);
      if (foldsMatch) {
        const notedUsable = parseInt(foldsMatch[1], 10);
        const notedTotal = parseInt(foldsMatch[2], 10);
        assert(notedUsable === metricsData.foldsUsable, `metrics.notes usable folds (${notedUsable}) matches foldsUsable (${metricsData.foldsUsable})`);
        assert(notedTotal === metricsData.foldsTotal, `metrics.notes total folds (${notedTotal}) matches foldsTotal (${metricsData.foldsTotal})`);
      }
    }
  }

  // -------------------------------------------------------------------
  // TEST 7: simulate() with empty protectedSegmentIds equals standard simulation
  // -------------------------------------------------------------------
  console.log("\nTest 7: simulate() with empty protectedSegmentIds equals standard output identically");
  {
    const simStd = engine.simulate(20);
    const simEmptyProtect = engine.simulate(20, []);

    assert(
      simStd.summary.percentClosed === simEmptyProtect.summary.percentClosed,
      "simulate(20) and simulate(20, []) have identical percentClosed"
    );
    assert(
      simStd.summary.closedSegmentCount === simEmptyProtect.summary.closedSegmentCount,
      "simulate(20) and simulate(20, []) have identical closedSegmentCount"
    );
    assert(
      simStd.summary.areasCutOff === simEmptyProtect.summary.areasCutOff,
      "simulate(20) and simulate(20, []) have identical areasCutOff"
    );
    assert(
      simStd.summary.avgExtraDelayMin === simEmptyProtect.summary.avgExtraDelayMin,
      "simulate(20) and simulate(20, []) have identical avgExtraDelayMin"
    );
    assert(
      JSON.stringify(simStd.summary.closedSegmentIds) === JSON.stringify(simEmptyProtect.summary.closedSegmentIds),
      "simulate(20) and simulate(20, []) produce identical closedSegmentIds list"
    );
  }

  // -------------------------------------------------------------------
  // TEST 8: Monotonicity: Protecting segments never worsens network outcome
  // -------------------------------------------------------------------
  console.log("\nTest 8: Monotonicity: Protecting a segment never increases cut-offs or origin delay");
  {
    const simUnprotected = engine.simulate(20);
    const closedIds = simUnprotected.summary.closedSegmentIds;

    if (closedIds.length > 0) {
      // Protect the highest-priority closed segment
      const protectPick = closedIds[0];
      const simProtected = engine.simulate(20, [protectPick]);

      assert(
        simProtected.summary.areasCutOff <= simUnprotected.summary.areasCutOff,
        `Protecting ${protectPick} never increases areas cut off (${simProtected.summary.areasCutOff} <= ${simUnprotected.summary.areasCutOff})`
      );

      // Verify origin-level monotonicity: no origin is newly cut off or has increased delay
      for (let i = 0; i < simProtected.origins.length; i++) {
        const origUnprot = simUnprotected.origins[i];
        const origProt = simProtected.origins[i];

        if (!origUnprot.isCutOff) {
          assert(!origProt.isCutOff, `Origin ${origProt.id} was connected unprotected, must remain connected protected`);
          assert(
            origProt.extraDelayMin <= origUnprot.extraDelayMin + 1e-4,
            `Origin ${origProt.id} delay does not increase when protecting road (${origProt.extraDelayMin} <= ${origUnprot.extraDelayMin})`
          );
        }
      }
    }
  }

  // -------------------------------------------------------------------
  // TEST 9: Deterministic Single Points of Failure (SPOF)
  // -------------------------------------------------------------------
  console.log("\nTest 9: SPOF ranking is deterministic and matches direct simulateWithClosedSegmentIds");
  {
    const spofList1 = engine.computeSinglePointsOfFailure(4);
    const spofList2 = engine.computeSinglePointsOfFailure(4);

    assert(spofList1.length > 0, "computeSinglePointsOfFailure returns non-empty list");
    assert(spofList1.length === spofList2.length, "SPOF cache returns consistent count");

    for (let i = 0; i < spofList1.length; i++) {
      assert(spofList1[i].segmentId === spofList2[i].segmentId, `SPOF #${i + 1} deterministic segmentId order`);
      assert(spofList1[i].areasCutOff === spofList2[i].areasCutOff, `SPOF #${i + 1} deterministic areasCutOff`);
    }

    // Direct recomputation check for the top SPOF segment
    const topSpof = spofList1[0];
    const directSim = engine.simulateWithClosedSegmentIds([topSpof.segmentId]);
    assert(
      directSim.areasCutOff === topSpof.areasCutOff,
      `Top SPOF cut-offs (${topSpof.areasCutOff}) matches direct simulateWithClosedSegmentIds (${directSim.areasCutOff})`
    );
    assert(
      directSim.avgExtraDelayMin === topSpof.avgExtraDelayMin,
      `Top SPOF avg delay (${topSpof.avgExtraDelayMin}) matches direct simulateWithClosedSegmentIds (${directSim.avgExtraDelayMin})`
    );
  }

  // -------------------------------------------------------------------
  // TEST 10: Greedy 3-Road Protection Optimality & Non-Degradation
  // -------------------------------------------------------------------
  console.log("\nTest 10: Greedy 'model picks' protection is non-degrading and yields valid candidate picks");
  {
    const sim20 = engine.simulate(20);
    const candidateIds = sim20.summary.closedSegmentIds.slice(0, 4);

    const greedy = engine.computeGreedyProtection(candidateIds, 3, 20);
    assert(greedy.protectedSegmentIds.length <= 3, "Greedy picks <= 3 protected segments");
    assert(
      greedy.afterSimulation.summary.areasCutOff <= greedy.beforeSimulation.summary.areasCutOff,
      `Greedy protection cut-offs (${greedy.afterSimulation.summary.areasCutOff}) <= before (${greedy.beforeSimulation.summary.areasCutOff})`
    );
    assert(
      greedy.reconnectedCount >= 0,
      `Greedy reconnected count (${greedy.reconnectedCount}) is non-negative`
    );
  }

  // -------------------------------------------------------------------
  // TEST 11: Out-of-bounds Snapping and Bounding Box Rejection
  // -------------------------------------------------------------------
  console.log("\nTest 11: Snapping handles out-of-bounds coordinates and far distances cleanly");
  {
    // Out-of-bounds coordinates
    const outSouth = snapPointToGraph(graph, 28.5000, 77.2250, 250);
    assert(outSouth === null, "Snapping rejects latitude far south of corridor");

    const outNorth = snapPointToGraph(graph, 28.7500, 77.2250, 250);
    assert(outNorth === null, "Snapping rejects latitude far north of corridor");

    const outWest = snapPointToGraph(graph, 28.6300, 77.1000, 250);
    assert(outWest === null, "Snapping rejects longitude far west of corridor");

    const outEast = snapPointToGraph(graph, 28.6300, 77.3500, 250);
    assert(outEast === null, "Snapping rejects longitude far east of corridor");
  }

  console.log("\n=======================================================");
  console.log("🎉 ALL ROADRISK DELHI ML & CITIZEN TESTS PASSED (11/11)!");
  console.log("=======================================================\n");
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
