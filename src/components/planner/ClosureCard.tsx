/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * RoadRisk Delhi - Failure Scenario & Hospital Access Card
 * Public-sector design system implementation.
 */

import React, { useState } from "react";
import {
  Sliders,
  RotateCcw,
  ShieldAlert,
  Info,
  CheckCircle2,
  XCircle,
  TrendingUp,
} from "lucide-react";
import type { OriginScenarioResult, ScenarioSummary, SimulationResult } from "../../ml/closure/engine";
import type { GraphQualityReport } from "../../ml/closure/graph";
import { DISCLAIMERS } from "../../data/disclaimers";
import type { ActiveScenario } from "../../context/AppStateContext";

interface ClosureCardProps {
  percent: number;
  onPercentChange: (percent: number) => void;
  simulationResult: SimulationResult | null;
  loading: boolean;
  selectedOriginId: string | null;
  onSelectOrigin: (origin: OriginScenarioResult | null) => void;
  quality?: GraphQualityReport | null;
  scenarioMode?: "slider" | "dashboard";
  onScenarioModeChange?: (mode: "slider" | "dashboard") => void;
  activeScenario?: ActiveScenario | null;
}

export default function ClosureCard({
  percent,
  onPercentChange,
  simulationResult,
  loading,
  selectedOriginId,
  onSelectOrigin,
  quality,
  scenarioMode = "slider",
  onScenarioModeChange,
  activeScenario,
}: ClosureCardProps) {
  const [showQualityDetails, setShowQualityDetails] = useState<boolean>(false);
  const summary: ScenarioSummary | null = simulationResult?.summary || null;
  const origins: OriginScenarioResult[] = simulationResult?.origins || [];

  const sortedOrigins = [...origins].sort((a, b) => {
    if (a.isCutOff && !b.isCutOff) return -1;
    if (!a.isCutOff && b.isCutOff) return 1;
    return b.extraDelayMin - a.extraDelayMin;
  });

  const presets = [0, 5, 10, 15, 20];

  return (
    <div className="bg-white border border-[#D6DCE5] rounded p-4 sm:p-5 shadow-xs flex flex-col gap-4 text-[#1B2430]">
      {/* Header */}
      <div className="flex items-start justify-between gap-2 border-b border-[#E4E9F0] pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1 rounded bg-[#EBF1FA] text-[#12356B] border border-[#A5BEDB]">
              <Sliders className="w-4 h-4" />
            </span>
            <h2 className="text-sm font-semibold text-[#12356B] tracking-tight">
              Failure Scenario &amp; Hospital Access
            </h2>
          </div>
          <p className="text-xs text-[#4A5668] mt-1 leading-relaxed">
            Simulate closure of the highest-risk segments by vulnerability score to evaluate hospital detour delays.
          </p>
        </div>

        {quality && (
          <button
            type="button"
            onClick={() => setShowQualityDetails(!showQualityDetails)}
            className="text-xs text-[#12356B] hover:underline font-medium flex items-center gap-1 cursor-pointer"
            title="Inspect segment graph connectivity & snapping"
          >
            <Info className="w-3.5 h-3.5" />
            <span>Graph info</span>
          </button>
        )}
      </div>

      {/* Graph Quality Info Banner (Collapsible) */}
      {showQualityDetails && quality && (
        <div className="bg-[#F0F4F8] border border-[#D6DCE5] rounded p-3 text-xs space-y-1.5 text-[#1B2430]">
          <div className="flex items-center justify-between text-[#12356B] font-semibold border-b border-[#D6DCE5] pb-1">
            <span>Segment Graph Snapping Report</span>
            <span className="text-[11px] bg-white px-1.5 py-0.5 rounded border border-[#CBD5E1]">
              {quality.toleranceMeters}m tolerance
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-[#4A5668]">
            <div>
              <span className="text-[#64748B]">Nodes:</span> <span className="text-[#1B2430] font-medium">{quality.nodeCount}</span>
            </div>
            <div>
              <span className="text-[#64748B]">Segments:</span> <span className="text-[#1B2430] font-medium">{quality.edgeCount}</span>
            </div>
            <div>
              <span className="text-[#64748B]">Connected Component:</span> <span className="text-[#1B2430] font-medium">{quality.largestComponentPercent}</span>
            </div>
            <div>
              <span className="text-[#64748B]">Hospitals Snapped:</span> <span className="text-[#1B2430] font-medium">{quality.hospitalsSnapped}/{quality.hospitalsTotal}</span>
            </div>
            <div>
              <span className="text-[#64748B]">Sample Origins:</span> <span className="text-[#1B2430] font-medium">{quality.originsActive} (~400m grid)</span>
            </div>
            <div>
              <span className="text-[#64748B]">Routing:</span> <span className="text-[#1B2430] font-medium">Bidirectional</span>
            </div>
          </div>
          {quality.notes && quality.notes.length > 0 && (
            <p className="text-[11px] text-[#64748B] italic pt-1 border-t border-[#D6DCE5]">
              {quality.notes.join(" • ")}
            </p>
          )}
        </div>
      )}

      {/* Scenario Mode Toggle: Top X% weakest roads | Dashboard scenario */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E4E9F0] pb-2">
        <span className="text-xs font-semibold text-[#12356B]">Scenario Mode:</span>
        <div className="inline-flex p-0.5 rounded-lg bg-[#EBF1FA] border border-[#CBD8E6] text-xs">
          <button
            type="button"
            onClick={() => onScenarioModeChange?.("slider")}
            className={`px-3 py-1 rounded-md font-semibold transition-all cursor-pointer ${
              scenarioMode === "slider"
                ? "bg-[#12356B] text-white shadow-xs"
                : "text-[#4A5668] hover:text-[#12356B]"
            }`}
          >
            Top X% weakest roads
          </button>
          <button
            type="button"
            onClick={() => onScenarioModeChange?.("dashboard")}
            className={`px-3 py-1 rounded-md font-semibold transition-all cursor-pointer ${
              scenarioMode === "dashboard"
                ? "bg-[#12356B] text-white shadow-xs"
                : "text-[#4A5668] hover:text-[#12356B]"
            }`}
          >
            Dashboard scenario
          </button>
        </div>
      </div>

      {/* Scenario Control: Slider & Presets OR Dashboard Scenario Mode */}
      <div className="space-y-2.5 bg-[#F0F4F8] p-3.5 rounded border border-[#D6DCE5]">
        {scenarioMode === "dashboard" ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-[#12356B]">Dashboard Mode:</span>
              <span className="text-xs font-bold text-[#12356B]">
                {summary ? `${summary.closedSegmentCount} segments closed` : "0 segments closed"}
              </span>
            </div>

            {activeScenario && activeScenario.hotspotIds.length > 0 ? (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#EBF1FA] text-[#12356B] border border-[#A5BEDB]">
                <span>
                  Using dashboard scenario: {activeScenario.hotspotIds.length === 1 ? "1 hotspot" : `${activeScenario.hotspotIds.length} hotspots`}, {activeScenario.rainfallLevel ? activeScenario.rainfallLevel.charAt(0).toUpperCase() + activeScenario.rainfallLevel.slice(1) : "Extreme"} rain
                </span>
              </div>
            ) : (
              <div className="text-xs text-[#64748B] italic">
                No hotspots currently selected on the dashboard. Inundate hotspots on the dashboard or switch to slider mode.
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-[#12356B] flex items-center gap-1.5">
                <span>Closure Scenario:</span>
                <span className="text-[#B26A00] font-bold">Worst {percent}% closed</span>
              </span>
              <span className="text-xs text-[#4A5668]">
                {summary ? `${summary.closedSegmentCount} segments closed` : "All roads open"}
              </span>
            </div>

            {/* Range Slider */}
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={0}
                max={25}
                step={1}
                value={percent}
                onChange={(e) => onPercentChange(Number(e.target.value))}
                className="w-full h-2 bg-[#D6DCE5] rounded appearance-none cursor-pointer accent-[#12356B] focus:outline-hidden"
                aria-label="Closure scenario percentage slider"
              />
              <span className="text-xs font-semibold text-[#12356B] min-w-[36px] text-right">
                {percent}%
              </span>
            </div>

            {/* Preset Buttons */}
            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                {presets.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => onPercentChange(p)}
                    className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors cursor-pointer ${
                      percent === p
                        ? "bg-[#12356B] text-white"
                        : "bg-white text-[#12356B] hover:bg-[#EBF1FA] border border-[#D6DCE5]"
                    }`}
                  >
                    {p === 0 ? "0% (All Open)" : `${p}%`}
                  </button>
                ))}
              </div>

              {percent > 0 && (
                <button
                  type="button"
                  onClick={() => onPercentChange(0)}
                  className="text-xs text-[#4A5668] hover:text-[#12356B] flex items-center gap-1 cursor-pointer font-medium"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset</span>
                </button>
              )}
            </div>
          </>
        )}
      </div>

      {/* 3 Live KPI Cards */}
      {summary && (
        <div className="grid grid-cols-3 gap-2">
          {/* KPI 1: Cut-off Areas */}
          <div
            className={`p-2.5 rounded border flex flex-col justify-between ${
              summary.areasCutOff > 0
                ? "bg-[#FDF1F0] border-[#F5ABA8] text-[#B3261E]"
                : "bg-[#F0F4F8] border-[#D6DCE5] text-[#1B2430]"
            }`}
          >
            <div className="text-[10px] uppercase font-semibold tracking-wider text-[#4A5668]">
              Cut Off
            </div>
            <div className="mt-1 flex items-baseline gap-1">
              <span
                className={`text-lg font-bold ${
                  summary.areasCutOff > 0 ? "text-[#B3261E]" : "text-[#1E7B4F]"
                }`}
              >
                {summary.areasCutOff}
              </span>
              <span className="text-xs text-[#64748B]">/ {summary.totalAreas}</span>
            </div>
            <div className="text-[10px] text-[#4A5668] truncate mt-0.5">
              {summary.areasCutOff > 0 ? "Zero hospital route" : "All reach hospital"}
            </div>
            {scenarioMode === "dashboard" && (
              <div className="text-[9.5px] text-[#4A5668] mt-1 pt-1 border-t border-[#CBD5E1] leading-tight">
                Tests 60 spread-out sample origins. The dashboard tests 12 hub zones, so counts can differ for the same scenario.
              </div>
            )}
          </div>

          {/* KPI 2: Worst Extra Delay */}
          <div className="bg-[#F0F4F8] border border-[#D6DCE5] p-2.5 rounded flex flex-col justify-between">
            <div className="text-[10px] uppercase font-semibold tracking-wider text-[#4A5668]">
              Worst Delay
            </div>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-lg font-bold text-[#B26A00]">
                +{summary.worstExtraDelayMin}
              </span>
              <span className="text-xs text-[#64748B]">min</span>
            </div>
            <div className="text-[10px] text-[#4A5668] truncate mt-0.5" title={summary.worstExtraDelayArea}>
              {summary.worstExtraDelayArea === "None" ? "No delay" : summary.worstExtraDelayArea}
            </div>
          </div>

          {/* KPI 3: Top Risk Driver */}
          <div className="bg-[#F0F4F8] border border-[#D6DCE5] p-2.5 rounded flex flex-col justify-between">
            <div className="text-[10px] uppercase font-semibold tracking-wider text-[#4A5668]">
              Top Driver
            </div>
            <div className="mt-1 text-xs font-semibold text-[#12356B] line-clamp-1">
              {summary.topRiskDriver}
            </div>
            <div className="text-[10px] text-[#4A5668] truncate mt-0.5">
              Avg delay: +{summary.avgExtraDelayMin} min
            </div>
          </div>
        </div>
      )}

      {/* Baseline Intact Note */}
      {percent === 0 && summary && (
        <div className="bg-[#EAF6EE] border border-[#A3D9B8] rounded p-3 text-xs flex items-start gap-2.5 text-[#1E7B4F]">
          <CheckCircle2 className="w-4 h-4 text-[#1E7B4F] shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="font-semibold text-[#1E7B4F]">Baseline Network Fully Intact</p>
            <p className="text-[11px] text-[#4A5668] leading-relaxed">
              All {summary.totalAreas} sample origins maintain direct hospital routes with an estimated average transit time of{" "}
              <span className="font-semibold text-[#1B2430]">{summary.baselineAvgTravelTimeMin} min</span>.
            </p>
          </div>
        </div>
      )}

      {/* Ranked List of Most Affected Areas */}
      {percent > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-[#12356B] flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-[#12356B]" />
              <span>Affected Origins ({sortedOrigins.length})</span>
            </span>
            <span className="text-[11px] text-[#64748B]">Click to view detour</span>
          </div>

          <div className="max-h-[220px] overflow-y-auto space-y-1.5 pr-1">
            {sortedOrigins.slice(0, 10).map((orig, idx) => {
              const isSelected = selectedOriginId === orig.id;
              return (
                <button
                  key={orig.id}
                  type="button"
                  onClick={() => onSelectOrigin(isSelected ? null : orig)}
                  className={`w-full text-left p-2 rounded border transition-colors cursor-pointer flex items-center justify-between gap-2 ${
                    isSelected
                      ? "bg-[#EBF1FA] border-[#12356B]"
                      : orig.isCutOff
                      ? "bg-[#FDF1F0] border-[#F5ABA8]"
                      : "bg-[#F8FAFC] border-[#E2E8F0] hover:bg-[#F0F4F8]"
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-[#64748B]">#{idx + 1}</span>
                      <span className="text-xs font-semibold text-[#1B2430] truncate">
                        {orig.name}
                      </span>
                    </div>
                    <div className="text-[11px] text-[#4A5668] mt-0.5 truncate">
                      {orig.isCutOff ? (
                        <span className="text-[#B3261E] font-medium">Severed from nearest {orig.nearestHospitalBefore}</span>
                      ) : (
                        <span>
                          {orig.baselineMin} min → {orig.scenarioMin} min ({orig.nearestHospitalAfter || orig.nearestHospitalBefore})
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="shrink-0 text-right">
                    {orig.isCutOff ? (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#FDF1F0] text-[#B3261E] border border-[#F5ABA8]">
                        <XCircle className="w-3 h-3" />
                        <span>CUT OFF</span>
                      </span>
                    ) : (
                      <span className="inline-block px-1.5 py-0.5 rounded text-xs font-semibold bg-[#FEF7EC] text-[#B26A00] border border-[#F5CF96]">
                        +{orig.extraDelayMin} min
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Disclaimers Caption */}
      <div className="border-t border-[#E4E9F0] pt-2 space-y-1 text-[11px] text-[#64748B] leading-relaxed">
        <p className="flex items-start gap-1">
          <ShieldAlert className="w-3.5 h-3.5 text-[#B26A00] shrink-0 mt-0.5" />
          <span>{DISCLAIMERS.delay}</span>
        </p>
      </div>
    </div>
  );
}
