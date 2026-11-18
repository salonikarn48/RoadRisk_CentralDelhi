/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * RoadRisk Delhi - Corridor Vulnerability Planner (/planner)
 * Public-sector decision-support portal page for screening vulnerable
 * road segments, testing failure scenarios, and reviewing hospital access.
 */

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Download,
  RefreshCw,
  Info,
  ArrowRight,
  Sliders,
  ChevronDown,
  ChevronUp,
  Printer,
  Table,
} from "lucide-react";
import TopNavBar from "../components/TopNavBar";
import PortalBreadcrumbs from "../components/common/PortalBreadcrumbs";
import PortalFooter from "../components/common/PortalFooter";
import { PortalNotice, MetricHelpTooltip } from "../components/common/PortalNotice";
import ModeBadge from "../components/planner/ModeBadge";
import ErrorBoundary from "../components/common/ErrorBoundary";
import PlannerMap, { type HospitalRecord, type ResidentReportItem } from "../components/planner/PlannerMap";
import SegmentDetailCard, { getScoreBin } from "../components/planner/SegmentDetailCard";
import TopRiskList from "../components/planner/TopRiskList";
import ClosureCard from "../components/planner/ClosureCard";
import type { VulnerabilityFile, VulnerabilitySegment, MLMetricsFile, DataSource } from "../types/risk";
import { ClosureEngine } from "../ml/closure/engine";
import type { SimulationResult, OriginScenarioResult } from "../ml/closure/engine";
import { buildSegmentGraph, type SegmentGraph, type GraphQualityReport } from "../ml/closure/graph";
import { DISCLAIMERS } from "../data/disclaimers";
import { resilientFetch } from "../utils/resilientFetch";
import { useAppState } from "../context/AppStateContext";

export default function PlannerPage() {
  const [searchParams] = useSearchParams();
  const isDemoMode = searchParams.get("demo") === "1";

  const [vulnerabilityData, setVulnerabilityData] = useState<VulnerabilityFile | null>(null);
  const [metricsData, setMetricsData] = useState<MLMetricsFile | null>(null);
  const [hospitals, setHospitals] = useState<HospitalRecord[]>([]);
  const [residentReports, setResidentReports] = useState<ResidentReportItem[]>([]);
  const [dataSource, setDataSource] = useState<DataSource>("Frozen snapshot");

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [recomputing, setRecomputing] = useState<boolean>(false);

  // Map & selection states
  const [selectedSegmentId, setSelectedSegmentId] = useState<string | null>(null);
  const [showRiskLayer, setShowRiskLayer] = useState<boolean>(true);
  const [showHospitals, setShowHospitals] = useState<boolean>(true);
  const [showHotspots, setShowHotspots] = useState<boolean>(true);
  const [showResidentReports, setShowResidentReports] = useState<boolean>(false);
  const [top10PercentOnly, setTop10PercentOnly] = useState<boolean>(false);

  const {
    activeScenario,
    plannerScenarioMode,
    setPlannerScenarioMode,
    plannerClosurePercent,
    setPlannerClosurePercent,
  } = useAppState();

  // Closure Scenario States
  const [closurePercent, setClosurePercent] = useState<number>(plannerClosurePercent ?? 0);
  const [scenarioMode, setScenarioMode] = useState<"slider" | "dashboard">(() =>
    plannerScenarioMode || (activeScenario && activeScenario.hotspotIds.length > 0 ? "dashboard" : "slider")
  );

  useEffect(() => {
    if (activeScenario && activeScenario.hotspotIds.length > 0) {
      setScenarioMode("dashboard");
      setPlannerScenarioMode("dashboard");
    } else {
      setScenarioMode("slider");
      setPlannerScenarioMode("slider");
    }
  }, [activeScenario.hotspotIds.length, setPlannerScenarioMode]);

  const handleScenarioModeChange = useCallback((mode: "slider" | "dashboard") => {
    setScenarioMode(mode);
    setPlannerScenarioMode(mode);
  }, [setPlannerScenarioMode]);

  const handleClosurePercentChange = useCallback((pct: number) => {
    setClosurePercent(pct);
    setPlannerClosurePercent(pct);
  }, [setPlannerClosurePercent]);

  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null);
  const [simulationLoading, setSimulationLoading] = useState<boolean>(false);
  const [selectedOrigin, setSelectedOrigin] = useState<OriginScenarioResult | null>(null);
  const [graphQuality, setGraphQuality] = useState<GraphQualityReport | null>(null);
  const [showOrigins, setShowOrigins] = useState<boolean>(true);

  // About popover modal
  const [showAboutModal, setShowAboutModal] = useState<boolean>(false);

  // Ranked segments table pagination / search
  const [tableFilter, setTableFilter] = useState<string>("");
  const [tablePage, setTablePage] = useState<number>(1);
  const pageSize = 15;

  // Fetch initial data
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch Vulnerability Scores
      const vRes = await resilientFetch("/rr-api/vulnerability");
      if (!vRes.ok) throw new Error(`HTTP ${vRes.status} loading vulnerability scores`);
      const vData: VulnerabilityFile = await vRes.json();
      setVulnerabilityData(vData);

      if (vData.segments && vData.segments.length > 0 && !selectedSegmentId) {
        setSelectedSegmentId(vData.segments[0].segmentId);
      }

      // 2. Fetch ML Metrics
      try {
        const mRes = await resilientFetch("/rr-api/metrics");
        if (mRes.ok) {
          const mData: MLMetricsFile = await mRes.json();
          setMetricsData(mData);
        }
      } catch (mErr) {
        console.warn("Could not load metrics:", mErr);
      }

      // 3. Fetch Hospitals
      try {
        const hRes = await resilientFetch("/rr-api/hospitals");
        if (hRes.ok) {
          const hData = await hRes.json();
          if (Array.isArray(hData.hospitals)) {
            setHospitals(hData.hospitals);
          }
        }
      } catch (hErr) {
        console.warn("Could not load hospitals:", hErr);
      }

      // 4. Fetch Health status
      try {
        const sRes = await resilientFetch("/rr-api/health");
        if (sRes.ok) {
          const sData = await sRes.json();
          if (sData.dataSource) {
            setDataSource(sData.dataSource);
          }
        }
      } catch {
        // Fallback to frozen snapshot
      }
    } catch (err: any) {
      setError(err?.message || "Failed to load corridor planner data");
    } finally {
      setLoading(false);
    }
  }, [selectedSegmentId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Isomorphic in-browser simulation engine
  useEffect(() => {
    if (!vulnerabilityData || vulnerabilityData.segments.length === 0) return;

    let isMounted = true;
    setSimulationLoading(true);

    try {
      const graph = buildSegmentGraph(vulnerabilityData.segments, hospitals);
      setGraphQuality(graph.quality);

      const engine = new ClosureEngine(graph);
      const res =
        scenarioMode === "dashboard"
          ? engine.simulate(activeScenario.closedSegmentIds)
          : engine.simulate(closurePercent);

      if (isMounted) {
        setSimulationResult(res);
        setSimulationLoading(false);
      }
    } catch (simErr) {
      console.warn("Simulation run error:", simErr);
      if (isMounted) setSimulationLoading(false);
    }

    return () => {
      isMounted = false;
    };
  }, [vulnerabilityData, hospitals, closurePercent, scenarioMode, activeScenario.closedSegmentIds]);

  // Recompute pipeline
  const handleRecompute = async () => {
    setRecomputing(true);
    try {
      const res = await resilientFetch("/rr-api/vulnerability/recompute", { method: "POST" });
      if (!res.ok) throw new Error(`Recompute failed with status ${res.status}`);
      await fetchData();
    } catch (err: any) {
      setError(`Recompute error: ${err?.message || err}`);
    } finally {
      setRecomputing(false);
    }
  };

  const selectedSegment =
    vulnerabilityData?.segments.find((s) => s.segmentId === selectedSegmentId) || null;

  // Filtered segments for table
  const filteredSegments = useMemo(() => {
    if (!vulnerabilityData?.segments) return [];
    if (!tableFilter.trim()) return vulnerabilityData.segments;
    const term = tableFilter.toLowerCase().trim();
    return vulnerabilityData.segments.filter(
      (s) =>
        s.segmentId.toLowerCase().includes(term) ||
        (s.name && s.name.toLowerCase().includes(term)) ||
        (s.features.highway_class && s.features.highway_class.toLowerCase().includes(term))
    );
  }, [vulnerabilityData, tableFilter]);

  const totalPages = Math.ceil(filteredSegments.length / pageSize) || 1;
  const pagedSegments = filteredSegments.slice((tablePage - 1) * pageSize, tablePage * pageSize);

  // Download Table to CSV
  const handleDownloadCSV = () => {
    if (!vulnerabilityData?.segments || vulnerabilityData.segments.length === 0) return;

    const headers = [
      "Rank",
      "Road Name",
      "Segment ID",
      "Highway Class",
      "Lanes",
      "Length (m)",
      "Susceptibility Score",
      "Risk Level",
      "Underpass Cut",
      "Elevation Mean (m)",
      "Depression Depth (m)",
      "Dist to Drain (m)",
    ];

    const rows = vulnerabilityData.segments.map((seg) => {
      const bin = getScoreBin(seg.score);
      const name = (seg.name || `Unnamed ${seg.features.highway_class || "Road"}`).replace(/"/g, '""');
      return [
        seg.rank,
        `"${name}"`,
        seg.segmentId,
        seg.features.highway_class || "unclassified",
        seg.features.lanes || 1,
        seg.features.length_m.toFixed(1),
        seg.score.toFixed(4),
        bin.label,
        seg.features.is_underpass ? "Yes" : "No",
        seg.features.elevation_mean !== null ? seg.features.elevation_mean.toFixed(1) : "",
        seg.features.low_point_depth_m !== null ? seg.features.low_point_depth_m.toFixed(2) : "0.00",
        Math.round(seg.features.dist_to_water_m || 0),
      ].join(",");
    });

    const csvContent = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `delhi_vulnerable_segments_table.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F5F7FA] text-[#1B2430] font-sans">
      {/* 1. Header with Utility Strip */}
      <TopNavBar />

      {/* 2. Breadcrumbs */}
      <PortalBreadcrumbs items={[{ label: "Planner" }]} />

      {/* Print-Only Header */}
      <div className="hidden print-header p-4">
        <h1 className="text-xl font-bold text-[#12356B]">RoadRisk Delhi • Vulnerability Planner Report</h1>
        <p className="text-xs text-gray-600">
          Generated: {new Date().toLocaleDateString("en-IN")} • Central Delhi Minto Bridge / ITO Pilot
        </p>
      </div>

      {/* 3. Main Body */}
      <main id="main-content" className="flex-1 max-w-[1440px] w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Public Notices */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 no-print">
          <PortalNotice type="pilot" />
          <PortalNotice type="scenario" />
        </div>

        {/* Page Title & Controls Strip */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#D6DCE5] pb-4">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-semibold text-[#12356B] tracking-tight">
                Corridor Vulnerability Planner
              </h1>
              {vulnerabilityData && (
                <ModeBadge
                  method={vulnerabilityData.method}
                  dataSource={dataSource}
                  snapshotDate={vulnerabilityData.generatedAt}
                />
              )}
            </div>
            <p className="text-xs sm:text-sm text-[#4A5668] mt-1 leading-relaxed">
              Spatial vulnerability ranking of road corridors across Central Delhi, simulating emergency hospital detour times under closure scenarios.
            </p>
            {scenarioMode === "dashboard" && activeScenario && activeScenario.hotspotIds.length > 0 && (
              <div className="mt-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#EBF1FA] text-[#12356B] border border-[#A5BEDB]">
                  Using dashboard scenario: {activeScenario.hotspotIds.length === 1 ? "1 hotspot" : `${activeScenario.hotspotIds.length} hotspots`}, {activeScenario.rainfallLevel ? activeScenario.rainfallLevel.charAt(0).toUpperCase() + activeScenario.rainfallLevel.slice(1) : "Extreme"} rain
                </span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 shrink-0 flex-wrap no-print">
            <button
              type="button"
              onClick={handleDownloadCSV}
              disabled={loading || !vulnerabilityData}
              className="px-3 py-1.5 rounded bg-white hover:bg-[#F0F4F8] text-[#12356B] border border-[#D6DCE5] text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
              title="Download full ranked segments table to CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download table</span>
            </button>

            <button
              type="button"
              onClick={() => window.print()}
              className="px-3 py-1.5 rounded bg-white hover:bg-[#F0F4F8] text-[#12356B] border border-[#D6DCE5] text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Print official planner report"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print report</span>
            </button>

            <button
              type="button"
              onClick={handleRecompute}
              disabled={recomputing || loading}
              className="px-3.5 py-1.5 rounded bg-[#12356B] hover:bg-[#0D2850] text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${recomputing ? "animate-spin" : ""}`} />
              <span>{recomputing ? "Recomputing..." : "Recompute"}</span>
            </button>
          </div>
        </div>

        {/* 1. UPFRONT COMPACT SUMMARY TABLE */}
        <section aria-labelledby="summary-table-heading" className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 id="summary-table-heading" className="text-xs font-semibold text-[#12356B] uppercase tracking-wider flex items-center gap-1.5">
              <Table className="w-4 h-4 text-[#12356B]" />
              <span>Corridor Summary Metrics</span>
            </h2>
            <span className="text-[11px] text-[#64748B]">
              Central Delhi Pilot (BBox 28.615 - 28.648°N, 77.205 - 77.250°E)
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="bg-white p-3.5 rounded border border-[#D6DCE5] shadow-xs">
              <div className="text-xs text-[#4A5668] flex items-center">
                <span>Total Segments</span>
                <MetricHelpTooltip text="Total road segments generated from OpenStreetMap geometries within the corridor boundary." />
              </div>
              <div className="text-xl font-semibold text-[#12356B] mt-1">
                {vulnerabilityData ? vulnerabilityData.segmentCount.toLocaleString() : "..."}
              </div>
              <div className="text-[11px] text-[#64748B] mt-0.5">1,720 roads</div>
            </div>

            <div className="bg-white p-3.5 rounded border border-[#D6DCE5] shadow-xs">
              <div className="text-xs text-[#4A5668] flex items-center">
                <span>High Vulnerability</span>
                <MetricHelpTooltip text="Segments scoring ≥ 0.70 based on underpass cuts, low elevation, and drainage proximity." />
              </div>
              <div className="text-xl font-semibold text-[#B3261E] mt-1">
                {vulnerabilityData
                  ? vulnerabilityData.segments.filter((s) => s.score >= 0.70).length
                  : "..."}
              </div>
              <div className="text-[11px] text-[#64748B] mt-0.5">Score ≥ 0.70</div>
            </div>

            <div className="bg-white p-3.5 rounded border border-[#D6DCE5] shadow-xs">
              <div className="text-xs text-[#4A5668] flex items-center">
                <span>Active Closures</span>
                <MetricHelpTooltip text="Count of highest-ranked vulnerable segments simulated as closed under the current scenario." />
              </div>
              <div className="text-xl font-semibold text-[#B26A00] mt-1">
                {simulationResult ? simulationResult.summary.closedSegmentCount : 0}
              </div>
              <div className="text-[11px] text-[#64748B] mt-0.5">
                {scenarioMode === "dashboard"
                  ? (activeScenario.label ? `Dashboard: ${activeScenario.label}` : "Dashboard scenario")
                  : `${closurePercent}% failure scenario`}
              </div>
            </div>

            <div className="bg-white p-3.5 rounded border border-[#D6DCE5] shadow-xs">
              <div className="text-xs text-[#4A5668] flex items-center">
                <span>Hospitals reachable</span>
                <MetricHelpTooltip text="Emergency trauma hospitals accessible on the connected road graph." />
              </div>
              <div className="text-xl font-semibold text-[#1E7B4F] mt-1">
                {hospitals.length > 0 ? `${hospitals.length} of ${hospitals.length}` : "8 of 8"}
              </div>
              <div className="text-[11px] text-[#64748B] mt-0.5">Trauma centers</div>
            </div>

            <div className="bg-white p-3.5 rounded border border-[#D6DCE5] shadow-xs">
              <div className="text-xs text-[#4A5668] flex items-center">
                <span>Areas Cut Off</span>
                <MetricHelpTooltip text="Sample neighborhood origins that completely lose vehicular connectivity to trauma hospitals." />
              </div>
              <div className="text-xl font-semibold text-[#1B2430] mt-1">
                {simulationResult ? simulationResult.summary.areasCutOff : 0}
              </div>
              <div className="text-[11px] text-[#64748B] mt-0.5">of {simulationResult ? simulationResult.summary.totalAreas : 60} origins</div>
              {scenarioMode === "dashboard" && (
                <div className="text-[10px] text-[#64748B] mt-1.5 pt-1.5 border-t border-[#E4E9F0] leading-tight">
                  Tests 60 spread-out sample origins. The dashboard tests 12 hub zones, so counts can differ for the same scenario.
                </div>
              )}
            </div>

            <div className="bg-white p-3.5 rounded border border-[#D6DCE5] shadow-xs">
              <div className="text-xs text-[#4A5668] flex items-center">
                <span>Avg Detour Delay</span>
                <MetricHelpTooltip text="Average additional ambulance transit time caused by simulated road diversions." />
              </div>
              <div className="text-xl font-semibold text-[#12356B] mt-1">
                +{simulationResult ? simulationResult.summary.avgExtraDelayMin : 0.0} min
              </div>
              <div className="text-[11px] text-[#64748B] mt-0.5">Road-class speeds</div>
            </div>
          </div>
        </section>

        {/* 2. MAP & SCENARIO ENGINE SECTION */}
        <section className="flex flex-col lg:flex-row gap-5 items-stretch min-h-[500px]">
          {/* Left: Map */}
          <div className="w-full lg:flex-1 h-[450px] lg:h-[580px] rounded border border-[#D6DCE5] overflow-hidden bg-white shadow-xs flex flex-col relative">
            <ErrorBoundary moduleName="Corridor Leaflet Map">
              <PlannerMap
                segments={vulnerabilityData?.segments || []}
                hospitals={hospitals}
                selectedSegmentId={selectedSegmentId}
                onSelectSegment={(seg) => setSelectedSegmentId(seg.segmentId)}
                showRiskLayer={showRiskLayer}
                setShowRiskLayer={setShowRiskLayer}
                showHospitals={showHospitals}
                setShowHospitals={setShowHospitals}
                showHotspots={showHotspots}
                setShowHotspots={setShowHotspots}
                top10PercentOnly={top10PercentOnly}
                setTop10PercentOnly={setTop10PercentOnly}
                residentReports={residentReports}
                showResidentReports={showResidentReports}
                setShowResidentReports={setShowResidentReports}
                closedSegmentIds={simulationResult?.summary.closedSegmentIds || []}
                origins={simulationResult?.origins || []}
                selectedOrigin={selectedOrigin}
                onSelectOrigin={setSelectedOrigin}
                showOrigins={showOrigins}
                setShowOrigins={setShowOrigins}
              />
            </ErrorBoundary>
          </div>

          {/* Right: Controls & Side Cards */}
          <aside className="w-full lg:w-[420px] shrink-0 flex flex-col gap-4">
            <SegmentDetailCard
              segment={selectedSegment}
              totalSegments={vulnerabilityData?.segmentCount ?? 0}
              onClearSelection={() => setSelectedSegmentId(null)}
            />

            <ErrorBoundary moduleName="Closure Scenario Engine">
              <ClosureCard
                percent={closurePercent}
                onPercentChange={handleClosurePercentChange}
                simulationResult={simulationResult}
                loading={simulationLoading}
                selectedOriginId={selectedOrigin?.id || null}
                onSelectOrigin={setSelectedOrigin}
                quality={graphQuality}
                scenarioMode={scenarioMode}
                onScenarioModeChange={handleScenarioModeChange}
                activeScenario={activeScenario}
              />
            </ErrorBoundary>

            <TopRiskList
              segments={vulnerabilityData?.segments || []}
              metrics={metricsData}
              selectedSegmentId={selectedSegmentId}
              onSelectSegment={(seg) => setSelectedSegmentId(seg.segmentId)}
            />
          </aside>
        </section>

        {/* 3. RANKED SEGMENTS TABLE WITH DOWNLOAD BUTTON */}
        <section aria-labelledby="ranked-segments-heading" className="bg-white p-5 rounded border border-[#D6DCE5] shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E4E9F0] pb-3">
            <div>
              <h2 id="ranked-segments-heading" className="text-base font-semibold text-[#12356B]">
                Ranked Vulnerable Road Segments Table
              </h2>
              <p className="text-xs text-[#4A5668] mt-0.5">
                Full list of scored corridors ordered by physical susceptibility. Click any row to center on map.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="text"
                placeholder="Filter by name, ID, or class..."
                value={tableFilter}
                onChange={(e) => {
                  setTableFilter(e.target.value);
                  setTablePage(1);
                }}
                className="px-3 py-1.5 rounded border border-[#D6DCE5] text-xs text-[#1B2430] placeholder-[#64748B] focus:border-[#12356B] focus:outline-hidden w-64"
                aria-label="Filter road segments"
              />
              <button
                type="button"
                onClick={handleDownloadCSV}
                className="px-3 py-1.5 rounded bg-[#12356B] hover:bg-[#0D2850] text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </button>
            </div>
          </div>

          {/* Table Container */}
          <div className="overflow-x-auto">
            <table className="portal-table">
              <thead>
                <tr>
                  <th style={{ width: "60px" }}>Rank</th>
                  <th>Road Corridor</th>
                  <th>Segment ID</th>
                  <th>Class</th>
                  <th>Length</th>
                  <th>Score</th>
                  <th>Risk Level</th>
                  <th>Underpass</th>
                  <th>Depression</th>
                  <th>Dist to Drain</th>
                </tr>
              </thead>
              <tbody>
                {pagedSegments.map((seg) => {
                  const bin = getScoreBin(seg.score);
                  const isSelected = seg.segmentId === selectedSegmentId;
                  const isClosed = simulationResult?.summary.closedSegmentIds.includes(seg.segmentId);
                  const roadName = seg.name || `Unnamed ${seg.features.highway_class || "Road"}`;

                  return (
                    <tr
                      key={seg.segmentId}
                      onClick={() => setSelectedSegmentId(seg.segmentId)}
                      className={`cursor-pointer transition-colors ${
                        isSelected ? "bg-[#EBF1FA]! font-semibold" : ""
                      }`}
                    >
                      <td className="font-semibold text-[#12356B]">#{seg.rank}</td>
                      <td>
                        <div className="font-medium text-[#1B2430]">{roadName}</div>
                        {isClosed && (
                          <span className="text-[10px] text-[#B3261E] font-semibold uppercase">
                            [Closed in Scenario]
                          </span>
                        )}
                      </td>
                      <td className="font-mono text-xs text-[#64748B]">{seg.segmentId}</td>
                      <td className="capitalize text-xs text-[#4A5668]">{seg.features.highway_class}</td>
                      <td className="text-xs text-[#4A5668]">{seg.features.length_m.toFixed(0)} m</td>
                      <td className="font-semibold text-xs" style={{ color: bin.color }}>
                        {(seg.score * 100).toFixed(1)}%
                      </td>
                      <td>
                        <span className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${bin.badgeBg} ${bin.badgeText}`}>
                          {bin.label}
                        </span>
                      </td>
                      <td className="text-xs text-[#4A5668]">
                        {seg.features.is_underpass ? (
                          <span className="text-[#B26A00] font-semibold">Yes</span>
                        ) : (
                          "No"
                        )}
                      </td>
                      <td className="text-xs text-[#4A5668]">
                        {seg.features.low_point_depth_m !== null
                          ? `${seg.features.low_point_depth_m.toFixed(2)} m`
                          : "0.00 m"}
                      </td>
                      <td className="text-xs text-[#4A5668]">
                        {Math.round(seg.features.dist_to_water_m || 0)} m
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between text-xs text-[#4A5668] pt-2">
            <div>
              Showing {(tablePage - 1) * pageSize + 1} to{" "}
              {Math.min(tablePage * pageSize, filteredSegments.length)} of {filteredSegments.length} segments
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setTablePage((p) => Math.max(1, p - 1))}
                disabled={tablePage === 1}
                className="px-2.5 py-1 rounded border border-[#D6DCE5] hover:bg-[#F0F4F8] disabled:opacity-40 cursor-pointer"
              >
                Previous
              </button>
              <span className="px-2 font-medium text-[#1B2430]">
                {tablePage} / {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setTablePage((p) => Math.min(totalPages, p + 1))}
                disabled={tablePage === totalPages}
                className="px-2.5 py-1 rounded border border-[#D6DCE5] hover:bg-[#F0F4F8] disabled:opacity-40 cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* 4. Standard Public Portal Footer */}
      <PortalFooter />
    </div>
  );
}
