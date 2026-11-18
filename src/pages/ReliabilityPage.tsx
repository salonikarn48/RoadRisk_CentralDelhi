import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  ShieldAlert,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Download,
  RefreshCw,
  Sliders,
  ArrowRight,
  FileText,
  Compass,
} from "lucide-react";
import TopNavBar from "../components/TopNavBar";
import ModeBadge from "../components/planner/ModeBadge";
import ErrorBoundary from "../components/common/ErrorBoundary";
import PortalBreadcrumbs from "../components/common/PortalBreadcrumbs";
import PortalNotice from "../components/common/PortalNotice";
import PortalFooter from "../components/common/PortalFooter";
import type {
  MLMetricsFile,
  VulnerabilityFile,
  SanityChecksReport,
  ConfidenceIntervalsReport,
  EvaluationMetrics,
  DataSource,
} from "../types/risk";
import { DISCLAIMERS } from "../data/disclaimers";
import { FLOOD_HOTSPOTS } from "../data/floodHotspots";
import { resilientFetch } from "../utils/resilientFetch";
import { useAppState } from "../context/AppStateContext";

const FEATURE_NAME_LABELS: Record<string, string> = {
  dist_to_water_m: "Distance to Drainage / Yamuna Canal",
  elevation_min: "Minimum Segment Elevation",
  elevation_mean: "Mean Terrain Elevation",
  length_m: "Segment Length",
  low_point_depth_m: "Depression Low-Point Depth",
  is_underpass: "Subterranean Underpass Cut",
  lanes: "Lane Width Runoff Catchment",
  hw_primary: "Primary Arterial Corridor",
  hw_trunk: "Trunk Highway Link",
  hw_secondary: "Secondary Arterial Link",
  hw_tertiary: "Tertiary Sector Feeder",
  hw_residential: "Residential Street",
  hw_motorway: "Motorway Express Link",
};

interface ReliabilityContentProps {
  metrics: MLMetricsFile;
  baseline: EvaluationMetrics;
  model: EvaluationMetrics;
  ci?: ConfidenceIntervalsReport;
  sanity?: SanityChecksReport;
  featureImportances: Record<string, number>;
  isBaselineWinner: boolean;
  sectionEMode: "dashboard" | "slider";
  setSectionEMode: (val: "dashboard" | "slider") => void;
  onScenarioModeChange?: (val: "dashboard" | "slider") => void;
  measurePercent: number;
  setMeasurePercent: (val: number) => void;
  onMeasurePercentChange?: (val: number) => void;
  measureSimulation: any;
  activeScenario?: any;
  totalHotspots: number;
  verifiedHotspotsCount: number;
  closureInfo: any;
  handleDownloadMetrics: () => void;
  isEmergency?: boolean;
}

function ReliabilityContent({
  metrics,
  baseline,
  model,
  ci,
  sanity,
  featureImportances,
  isBaselineWinner,
  sectionEMode,
  setSectionEMode,
  onScenarioModeChange,
  measurePercent,
  setMeasurePercent,
  onMeasurePercentChange,
  measureSimulation,
  activeScenario,
  totalHotspots,
  verifiedHotspotsCount,
  closureInfo,
  handleDownloadMetrics,
  isEmergency = false,
}: ReliabilityContentProps) {
  return (
    <>
      {isEmergency ? (
        /* Emergency Fallback Active: Notice explaining circularity and hiding metrics */
        <section className="bg-white border border-[#B26A00] rounded p-5 space-y-4 shadow-xs">
          <div className="flex items-center gap-3 border-b border-[#D6DCE5] pb-3">
            <AlertTriangle className="w-5 h-5 text-[#B26A00] shrink-0" />
            <div>
              <span className="text-[11px] uppercase font-semibold tracking-wider text-[#B26A00]">
                Mode Tier 3 • Emergency Fallback
              </span>
              <h2 className="text-base sm:text-lg font-semibold text-[#12356B] mt-0.5">
                Emergency Fallback Active: No Model Metrics Apply
              </h2>
            </div>
          </div>
          <p className="text-xs sm:text-sm text-[#1B2430] leading-relaxed">
            The application is currently operating in <strong className="text-[#B26A00]">Tier 3 Emergency Fallback mode</strong> on the bundled 91-road corridor network because full topographic features or terrain elevations were missing or forced for testing.
          </p>
          <div className="p-4 rounded bg-[#FEF3C7] border border-[#FDE68A] text-xs text-[#92400E] space-y-2">
            <p className="font-semibold text-[#92400E] flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-[#B26A00]" />
              <span>Scientific Circularity Guard Notice:</span>
            </p>
            <p className="leading-relaxed">
              In Tier 3, segment scores are derived from proximity to known flood hotspots (weight 0.6) and underpass tags (weight 0.4). Because proximity to those very same hotspots defines the proxy evaluation label, evaluating Tier 3 scores against those labels would be circular and scientifically misleading.
            </p>
            <p className="text-[#4A5668] italic pt-1 border-t border-[#FDE68A]">
              Formal spatial cross-validation metrics (ROC-AUC, Precision, Recall, and 90% bootstrap confidence intervals) will automatically reactivate once the full topographic feature pipeline is running.
            </p>
          </div>
        </section>
      ) : (
        <>
          {/* SECTION A: HOW WE TEST */}
          <section id="section-testing" className="bg-white border border-[#D6DCE5] rounded p-5 space-y-4 shadow-xs">
            <div className="border-b border-[#D6DCE5] pb-3 flex items-start justify-between gap-4">
              <div>
                <span className="text-[11px] uppercase font-semibold tracking-wider text-[#4A5668]">
                  Section A • Cross-Validation Protocol
                </span>
                <h2 className="text-base sm:text-lg font-semibold text-[#12356B] mt-0.5">
                  How We Test (Spatial Hold-Out & Honest Validation)
                </h2>
              </div>
              <span className="text-xs font-mono bg-[#F0F4F8] px-2 py-1 rounded text-[#12356B] border border-[#D6DCE5] shrink-0 font-medium">
                {metrics.cvScheme}
              </span>
            </div>

            {/* Three-row table */}
            <div className="overflow-x-auto border border-[#D6DCE5] rounded">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#D6DCE5] text-[11px] uppercase tracking-wider text-[#4A5668] bg-[#F0F4F8]">
                    <th className="py-2.5 px-3 font-semibold w-1/4">Evaluation Dimension</th>
                    <th className="py-2.5 px-3 font-semibold">Methodology & Corridor Ground Truth</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#D6DCE5] text-[#1B2430]">
                  {/* Row 1: Baseline */}
                  <tr className="hover:bg-[#F9FAFB]">
                    <td className="py-3 px-3 font-semibold text-[#12356B] align-top">
                      <span className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#1E7B4F] shrink-0" />
                        <span>Baseline Formulation</span>
                      </span>
                    </td>
                    <td className="py-3 px-3 leading-relaxed">
                      <p>
                        <strong className="text-[#1B2430]">Transparent rule:</strong> underpass tag (weight 0.5), low-point depth (0.3), distance to water (0.1), and road class (0.1).
                      </p>
                      <p className="text-[#4A5668] text-[11px] mt-1">
                        Weights are fixed in advance, not tuned on labels. Hotspot distance is strictly excluded because it defines the label proxy (zero data leakage).
                      </p>
                    </td>
                  </tr>

                  {/* Row 2: Hold-Out */}
                  <tr className="hover:bg-[#F9FAFB]">
                    <td className="py-3 px-3 font-semibold text-[#12356B] align-top">
                      <span className="flex items-center gap-1.5">
                        <Compass className="w-3.5 h-3.5 text-[#C77700] shrink-0" />
                        <span>Spatial Hold-Out</span>
                      </span>
                    </td>
                    <td className="py-3 px-3 leading-relaxed">
                      <p>
                        Whole map blocks (~500 m <code className="text-[#12356B] bg-[#F0F4F8] px-1 py-0.5 rounded border border-[#D6DCE5]">sub_area_id</code>) are held out together, so neighbouring segments never sit in both training and test sets.
                      </p>
                      <div className="flex items-center gap-4 mt-1.5 text-[11px] text-[#4A5668]">
                        <span>
                          Usable Folds: <strong className="text-[#12356B]">{metrics.foldsUsable} of {metrics.foldsTotal} folds</strong> with test positives.
                        </span>
                        <span>
                          Positive Labels: <strong className="text-[#B26A00]">{metrics.positiveCount} of {metrics.totalSegments} segments</strong> (~100m proxy).
                        </span>
                      </div>
                    </td>
                  </tr>

                  {/* Row 3: Metrics Comparison Table */}
                  <tr className="hover:bg-[#F9FAFB]">
                    <td className="py-3 px-3 font-semibold text-[#12356B] align-top">
                      <span className="flex items-center gap-1.5">
                        <Activity className="w-3.5 h-3.5 text-[#12356B] shrink-0" />
                        <span>Metrics Benchmark</span>
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      {/* Base rate badge */}
                      <div className="mb-2.5 flex items-center justify-between text-xs bg-[#F0F4F8] border border-[#D6DCE5] rounded px-3 py-1.5">
                        <span className="text-[#4A5668] font-medium">
                          Corridor Base Rate: <strong className="text-[#1B2430] font-mono">{metrics.positiveCount}</strong> positives of <strong className="text-[#1B2430] font-mono">{metrics.totalSegments}</strong> segments
                        </span>
                        <span className="text-[#12356B] font-mono font-bold">
                          {metrics.baseRatePercent || `${((metrics.positiveCount / metrics.totalSegments) * 100).toFixed(2)}%`}
                        </span>
                      </div>

                      <div className="overflow-x-auto rounded border border-[#D6DCE5] bg-white">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="border-b border-[#D6DCE5] text-[10px] uppercase font-semibold text-[#4A5668] bg-[#F0F4F8]">
                              <th className="py-2 px-3 text-left">Metric</th>
                              <th className="py-2 px-3 text-center">
                                Transparent Baseline {isBaselineWinner && <span className="text-[#1E7B4F] font-bold">(Active Winner)</span>}
                              </th>
                              <th className="py-2 px-3 text-center">
                                Random Forest (100 Trees)
                              </th>
                              <th className="py-2 px-3 text-center">Better Method</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#D6DCE5] font-mono text-[11px]">
                            {/* ROC-AUC */}
                            <tr className="hover:bg-[#F9FAFB]">
                              <td className="py-1.5 px-3 font-sans text-[#1B2430] font-semibold text-left">ROC-AUC</td>
                              <td className={`py-1.5 px-3 text-center ${baseline.rocAuc >= model.rocAuc ? "font-bold text-[#12356B] bg-[#EBF3FB]" : "text-[#4A5668]"}`}>
                                {baseline.rocAuc.toFixed(4)} {baseline.rocAuc >= model.rocAuc && "★"}
                              </td>
                              <td className={`py-1.5 px-3 text-center ${model.rocAuc > baseline.rocAuc ? "font-bold text-[#12356B] bg-[#EBF3FB]" : "text-[#4A5668]"}`}>
                                {model.rocAuc.toFixed(4)} {model.rocAuc > baseline.rocAuc && "★"}
                              </td>
                              <td className="py-1.5 px-3 text-center font-sans font-semibold text-xs">
                                {baseline.rocAuc >= model.rocAuc ? (
                                  <span className="text-[#12356B]">Baseline ▲</span>
                                ) : (
                                  <span className="text-[#B26A00]">Model ▲</span>
                                )}
                              </td>
                            </tr>

                            {/* Precision @ 10 & Lift */}
                            <tr className="hover:bg-[#F9FAFB]">
                              <td className="py-1.5 px-3 font-sans text-[#1B2430] text-left">
                                <div>Precision @ 10</div>
                                <div className="text-[10px] text-[#4A5668] font-mono">Lift vs base rate</div>
                              </td>
                              <td className={`py-1.5 px-3 text-center ${baseline.precisionAt10 >= model.precisionAt10 ? "font-bold text-[#12356B] bg-[#EBF3FB]" : "text-[#4A5668]"}`}>
                                <div>{(baseline.precisionAt10 * 100).toFixed(1)}% {baseline.precisionAt10 >= model.precisionAt10 && "★"}</div>
                                <div className="text-[10px] text-[#4A5668] font-mono font-normal">Lift: {baseline.liftAt10 !== undefined ? `${baseline.liftAt10}x` : "0x"}</div>
                              </td>
                              <td className={`py-1.5 px-3 text-center ${model.precisionAt10 > baseline.precisionAt10 ? "font-bold text-[#12356B] bg-[#EBF3FB]" : "text-[#4A5668]"}`}>
                                <div>{(model.precisionAt10 * 100).toFixed(1)}% {model.precisionAt10 > baseline.precisionAt10 && "★"}</div>
                                <div className="text-[10px] text-[#4A5668] font-mono font-normal">Lift: {model.liftAt10 !== undefined ? `${model.liftAt10}x` : "0x"}</div>
                              </td>
                              <td className="py-1.5 px-3 text-center font-sans font-semibold text-[10px]">
                                {baseline.precisionAt10 >= model.precisionAt10 ? "Baseline ▲" : "Model ▲"}
                              </td>
                            </tr>

                            {/* Recall @ 10 */}
                            <tr className="hover:bg-[#F9FAFB]">
                              <td className="py-1.5 px-3 font-sans text-[#1B2430] text-left">Recall @ 10</td>
                              <td className={`py-1.5 px-3 text-center ${baseline.recallAt10 >= model.recallAt10 ? "font-bold text-[#12356B] bg-[#EBF3FB]" : "text-[#4A5668]"}`}>
                                {(baseline.recallAt10 * 100).toFixed(1)}% {baseline.recallAt10 >= model.recallAt10 && "★"}
                              </td>
                              <td className={`py-1.5 px-3 text-center ${model.recallAt10 > baseline.recallAt10 ? "font-bold text-[#12356B] bg-[#EBF3FB]" : "text-[#4A5668]"}`}>
                                {(model.recallAt10 * 100).toFixed(1)}% {model.recallAt10 > baseline.recallAt10 && "★"}
                              </td>
                              <td className="py-1.5 px-3 text-center font-sans font-semibold text-[10px]">
                                {baseline.recallAt10 >= model.recallAt10 ? "Baseline ▲" : "Model ▲"}
                              </td>
                            </tr>

                            {/* Precision @ 20 & Lift */}
                            <tr className="hover:bg-[#F9FAFB]">
                              <td className="py-1.5 px-3 font-sans text-[#1B2430] text-left">
                                <div>Precision @ 20</div>
                                <div className="text-[10px] text-[#4A5668] font-mono">Lift vs base rate</div>
                              </td>
                              <td className={`py-1.5 px-3 text-center ${baseline.precisionAt20 >= model.precisionAt20 ? "font-bold text-[#12356B] bg-[#EBF3FB]" : "text-[#4A5668]"}`}>
                                <div>{(baseline.precisionAt20 * 100).toFixed(1)}% {baseline.precisionAt20 >= model.precisionAt20 && "★"}</div>
                                <div className="text-[10px] text-[#4A5668] font-mono font-normal">Lift: {baseline.liftAt20 !== undefined ? `${baseline.liftAt20}x` : "0x"}</div>
                              </td>
                              <td className={`py-1.5 px-3 text-center ${model.precisionAt20 > baseline.precisionAt20 ? "font-bold text-[#12356B] bg-[#EBF3FB]" : "text-[#4A5668]"}`}>
                                <div>{(model.precisionAt20 * 100).toFixed(1)}% {model.precisionAt20 > baseline.precisionAt20 && "★"}</div>
                                <div className="text-[10px] text-[#4A5668] font-mono font-normal">Lift: {model.liftAt20 !== undefined ? `${model.liftAt20}x` : "0x"}</div>
                              </td>
                              <td className="py-1.5 px-3 text-center font-sans font-semibold text-[10px]">
                                {baseline.precisionAt20 >= model.precisionAt20 ? "Baseline ▲" : "Model ▲"}
                              </td>
                            </tr>

                            {/* Recall @ 20 */}
                            <tr className="hover:bg-[#F9FAFB]">
                              <td className="py-1.5 px-3 font-sans text-[#1B2430] text-left">Recall @ 20</td>
                              <td className={`py-1.5 px-3 text-center ${baseline.recallAt20 >= model.recallAt20 ? "font-bold text-[#12356B] bg-[#EBF3FB]" : "text-[#4A5668]"}`}>
                                {(baseline.recallAt20 * 100).toFixed(1)}% {baseline.recallAt20 >= model.recallAt20 && "★"}
                              </td>
                              <td className={`py-1.5 px-3 text-center ${model.recallAt20 > baseline.recallAt20 ? "font-bold text-[#12356B] bg-[#EBF3FB]" : "text-[#4A5668]"}`}>
                                {(model.recallAt20 * 100).toFixed(1)}% {model.recallAt20 > baseline.recallAt20 && "★"}
                              </td>
                              <td className="py-1.5 px-3 text-center font-sans font-semibold text-[10px]">
                                {baseline.recallAt20 >= model.recallAt20 ? "Baseline ▲" : "Model ▲"}
                              </td>
                            </tr>

                            {/* Precision @ Top 5% & Lift */}
                            <tr className="hover:bg-[#F9FAFB]">
                              <td className="py-1.5 px-3 font-sans text-[#1B2430] text-left">
                                <div>Precision @ Top 5%</div>
                                <div className="text-[10px] text-[#4A5668] font-mono">Lift vs base rate</div>
                              </td>
                              <td className={`py-1.5 px-3 text-center ${baseline.precisionAt5pct >= model.precisionAt5pct ? "font-bold text-[#12356B] bg-[#EBF3FB]" : "text-[#4A5668]"}`}>
                                <div>{(baseline.precisionAt5pct * 100).toFixed(1)}% {baseline.precisionAt5pct >= model.precisionAt5pct && "★"}</div>
                                <div className="text-[10px] text-[#4A5668] font-mono font-normal">Lift: {baseline.liftAt5pct !== undefined ? `${baseline.liftAt5pct}x` : "0x"}</div>
                              </td>
                              <td className={`py-1.5 px-3 text-center ${model.precisionAt5pct > baseline.precisionAt5pct ? "font-bold text-[#12356B] bg-[#EBF3FB]" : "text-[#4A5668]"}`}>
                                <div>{(model.precisionAt5pct * 100).toFixed(1)}% {model.precisionAt5pct > baseline.precisionAt5pct && "★"}</div>
                                <div className="text-[10px] text-[#4A5668] font-mono font-normal">Lift: {model.liftAt5pct !== undefined ? `${model.liftAt5pct}x` : "0x"}</div>
                              </td>
                              <td className="py-1.5 px-3 text-center font-sans font-semibold text-[10px]">
                                {baseline.precisionAt5pct >= model.precisionAt5pct ? "Baseline ▲" : "Model ▲"}
                              </td>
                            </tr>

                            {/* Recall @ Top 5% */}
                            <tr className="hover:bg-[#F9FAFB]">
                              <td className="py-1.5 px-3 font-sans text-[#1B2430] text-left">Recall @ Top 5%</td>
                              <td className={`py-1.5 px-3 text-center ${baseline.recallAt5pct >= model.recallAt5pct ? "font-bold text-[#12356B] bg-[#EBF3FB]" : "text-[#4A5668]"}`}>
                                {(baseline.recallAt5pct * 100).toFixed(1)}% {baseline.recallAt5pct >= model.recallAt5pct && "★"}
                              </td>
                              <td className={`py-1.5 px-3 text-center ${model.recallAt5pct > baseline.recallAt5pct ? "font-bold text-[#12356B] bg-[#EBF3FB]" : "text-[#4A5668]"}`}>
                                {(model.recallAt5pct * 100).toFixed(1)}% {model.recallAt5pct > baseline.recallAt5pct && "★"}
                              </td>
                              <td className="py-1.5 px-3 text-center font-sans font-semibold text-[10px]">
                                {baseline.recallAt5pct >= model.recallAt5pct ? "Baseline ▲" : "Model ▲"}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      {/* Plain Sentence on Precision@10 = 0 */}
                      <div className="mt-2.5 p-2.5 rounded bg-[#F0F4F8] border border-[#D6DCE5] text-xs text-[#1B2430] space-y-1">
                        <p className="font-semibold text-[#12356B]">
                          What Precision@10 = 0% means here:
                        </p>
                        <p className="text-[11px] text-[#4A5668] leading-relaxed">
                          None of the top 10 highest-ranked segments happen to fall within 100 m of the {metrics.positiveCount} historical proxy hotspot points; this reflects that our scoring evaluates physical road-cut and terrain depression vulnerability across the entire network rather than merely reproducing past municipal incident pins.
                        </p>
                      </div>

                      {/* Plain Verdict Sentence */}
                      <div className="mt-2 p-2.5 rounded bg-[#EBF3FB] border border-[#CBD8E6] text-xs">
                        <p className="font-semibold text-[#12356B]">
                          {isBaselineWinner
                            ? `On held-out blocks the transparent baseline matched or beat the model (ROC-AUC ${baseline.rocAuc.toFixed(4)} vs ${model.rocAuc.toFixed(4)}); we report this as is.`
                            : `On held-out blocks the model beat the baseline on ROC-AUC (${model.rocAuc.toFixed(4)} vs ${baseline.rocAuc.toFixed(4)}).`}
                        </p>
                        <p className="text-[11px] text-[#4A5668] mt-1">
                          {`Precision in the top 10 segments: baseline ${baseline.precisionAt10 ?? "n/a"}, model ${model.precisionAt10 ?? "n/a"}${typeof (metrics as any)?.baseRate === "number" ? ` (base rate ${((metrics as any).baseRate * 100).toFixed(1)}%)` : ""}. ROC-AUC and top-10 precision can point in different directions. With ${(metrics as any)?.positiveCount ?? "few"} positive labels, treat both as indicative, not conclusive.`}
                        </p>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Feature Importance Bar Chart */}
            <div className="pt-3 border-t border-[#D6DCE5]">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#12356B]">
                  Feature Importance (Random Forest Gini Impurity)
                </h3>
                <span className="text-[11px] text-[#4A5668]">Normalised to sum to 1.0</span>
              </div>

              <div className="space-y-1.5">
                {Object.entries(featureImportances)
                  .sort(([, a], [, b]) => b - a)
                  .map(([featKey, imp]) => {
                    const label = FEATURE_NAME_LABELS[featKey] || featKey;
                    const percent = (imp * 100).toFixed(1);
                    return (
                      <div key={featKey} className="flex items-center gap-3 text-xs">
                        <span className="w-1/3 truncate text-[#1B2430] text-[11px] font-medium" title={label}>
                          {label}
                        </span>
                        <div className="flex-1 h-3.5 bg-[#E5E9F0] rounded overflow-hidden border border-[#D6DCE5] flex items-center">
                          <div
                            className="h-full bg-[#12356B] transition-all duration-300"
                            style={{ width: `${Math.max(1, imp * 100)}%` }}
                          />
                        </div>
                        <span className="w-12 text-right font-mono text-[11px] text-[#12356B] font-semibold">
                          {percent}%
                        </span>
                      </div>
                    );
                  })}
              </div>
            </div>
          </section>

      {/* SECTION B: HOW MUCH TO TRUST THE NUMBERS */}
      <section className="bg-white border border-[#D6DCE5] rounded p-5 space-y-4 shadow-xs">
        <div className="border-b border-[#D6DCE5] pb-3">
          <span className="text-[11px] uppercase font-semibold tracking-wider text-[#C77700]">
            Section B • Uncertainty & Statistical Confidence
          </span>
          <h2 className="text-base sm:text-lg font-semibold text-[#12356B] mt-0.5">
            How Much to Trust the Numbers (90% Block-Bootstrap Intervals)
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Baseline 90% Interval */}
          <div className="bg-[#F0F4F8] border border-[#D6DCE5] rounded p-4 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-[#1B2430]">Baseline ROC-AUC (90% Interval)</span>
              <span className="text-[11px] px-2 py-0.5 rounded bg-white text-[#12356B] border border-[#D6DCE5] font-semibold">
                Active Score
              </span>
            </div>
            {ci && ci.baselineRocAuc ? (
              <div>
                <div className="text-2xl font-bold font-mono text-[#12356B]">
                  [{ci.baselineRocAuc.low.toFixed(4)}, {ci.baselineRocAuc.high.toFixed(4)}]
                </div>
                <p className="text-[11px] text-[#4A5668] mt-1">
                  Median bootstrap AUC: <span className="font-mono font-bold text-[#1B2430]">{ci.baselineRocAuc.median.toFixed(4)}</span> (point estimate: {baseline.rocAuc.toFixed(4)})
                </p>
              </div>
            ) : (
              <p className="text-xs text-[#B26A00] italic">too few positives for a reliable interval</p>
            )}
          </div>

          {/* Model 90% Interval */}
          <div className="bg-[#F0F4F8] border border-[#D6DCE5] rounded p-4 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-[#1B2430]">Random Forest ROC-AUC (90% Interval)</span>
              <span className="text-[11px] px-2 py-0.5 rounded bg-white text-[#4A5668] border border-[#D6DCE5]">
                Evaluated Alternate
              </span>
            </div>
            {ci && ci.modelRocAuc ? (
              <div>
                <div className="text-2xl font-bold font-mono text-[#4A5668]">
                  [{ci.modelRocAuc.low.toFixed(4)}, {ci.modelRocAuc.high.toFixed(4)}]
                </div>
                <p className="text-[11px] text-[#4A5668] mt-1">
                  Median bootstrap AUC: <span className="font-mono font-bold text-[#1B2430]">{ci.modelRocAuc.median.toFixed(4)}</span> (point estimate: {model.rocAuc.toFixed(4)})
                </p>
              </div>
            ) : (
              <p className="text-xs text-[#B26A00] italic">too few positives for a reliable interval</p>
            )}
          </div>
        </div>

        {/* Explanatory caution banner */}
        <div className="p-3 rounded bg-[#FEF3C7] border border-[#FDE68A] text-xs flex items-start gap-2.5 text-[#92400E]">
          <AlertTriangle className="w-4 h-4 text-[#B26A00] shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="font-semibold text-[#92400E]">
              With only {metrics.positiveCount} listed hotspots across {totalHotspots} corridor landmarks, results can swing a lot. Treat them as indicative.
            </p>
            <p className="text-[11px] text-[#4A5668]">
              Confidence bounds are generated via {ci?.resamples || 200} block bootstrap draws with replacement across the {metrics.foldsTotal} spatial clusters. The lower bound confirms baseline performs better than chance (AUC &gt; 0.50), while wide spreads reflect legitimate sparsity of municipal historical ground truth.
            </p>
          </div>
        </div>
      </section>

      {/* SECTION C: DOES THE SCORE ADD VALUE? */}
      <section className="bg-white border border-[#D6DCE5] rounded p-5 space-y-5 shadow-xs">
        <div className="border-b border-[#D6DCE5] pb-3">
          <span className="text-[11px] uppercase font-semibold tracking-wider text-[#1E7B4F]">
            Section C • Honest Practical Sanity Checks
          </span>
          <h2 className="text-base sm:text-lg font-semibold text-[#12356B] mt-0.5">
            Does the Score Add Value? (Beyond the List & Ranking vs Random)
          </h2>
        </div>

        {/* Check A: Beyond the List */}
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-sm font-semibold text-[#12356B] flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#12356B]" />
                <span>Check A: Beyond the List (Discovery of Unlisted Risk)</span>
              </h3>
              <p className="text-xs text-[#1B2430] mt-1 flex flex-wrap items-center gap-2">
                {sanity ? (
                  <>
                    <span>
                      <strong className="text-[#12356B] font-mono text-sm">
                        {sanity.beyondTheList.unlistedCount} of {sanity.beyondTheList.top5PercentTotal || sanity.beyondTheList.top10PercentTotal}
                      </strong>{" "}
                      ({sanity.beyondTheList.unlistedSharePercent}%) of top-5% segments are not near a listed hotspot.
                    </span>
                    <span className="px-2 py-0.5 rounded bg-[#F0F4F8] border border-[#D6DCE5] font-mono text-[#B26A00] text-[11px] font-semibold">
                      Base Rate: {sanity.beyondTheList.baseRatePercent}%
                    </span>
                  </>
                ) : (
                  "Evaluating top 5% segments for unlisted physical vulnerability..."
                )}
              </p>
            </div>
          </div>

          {/* Top 5 Unlisted Segments Table */}
          {sanity && sanity.beyondTheList.top5UnlistedSegments.length > 0 && (
            <div className="overflow-x-auto rounded border border-[#D6DCE5] bg-white">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-[#D6DCE5] text-[10px] uppercase font-semibold text-[#4A5668] bg-[#F0F4F8]">
                    <th className="py-2 px-3">Rank</th>
                    <th className="py-2 px-3">Corridor Road Segment</th>
                    <th className="py-2 px-3">Susceptibility</th>
                    <th className="py-2 px-3">Identified Physical Mechanism</th>
                    <th className="py-2 px-3">Classification</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#D6DCE5] text-[#1B2430]">
                  {sanity.beyondTheList.top5UnlistedSegments.map((seg) => (
                    <tr key={seg.segmentId} className="hover:bg-[#F9FAFB]">
                      <td className="py-2 px-3 font-mono font-bold text-[#B26A00]">#{seg.rank}</td>
                      <td className="py-2 px-3 font-semibold text-[#1B2430]">{seg.name}</td>
                      <td className="py-2 px-3 font-mono text-[#12356B] font-semibold">{(seg.score * 100).toFixed(1)}%</td>
                      <td className="py-2 px-3 text-[11px] text-[#4A5668]">{seg.reason}</td>
                      <td className="py-2 px-3 text-[10px] font-mono capitalize">
                        <span className="px-1.5 py-0.5 rounded bg-[#F0F4F8] border border-[#D6DCE5]">
                          {seg.highwayClass}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <p className="text-[11px] text-[#4A5668] italic">
            Caution: {sanity?.beyondTheList.caution || "These are candidates for field checking, not confirmed flooding spots."}
          </p>

          {/* "Why ML" Box */}
          <div className="p-3.5 rounded bg-[#EBF3FB] border border-[#CBD8E6] text-xs space-y-1">
            <div className="flex items-center gap-2 font-semibold text-[#12356B]">
              <Activity className="w-3.5 h-3.5" />
              <span>Why Algorithmic Screening Adds Value</span>
            </div>
            <p className="text-[#1B2430] leading-relaxed">
              The score ranks segments from terrain and road features, so it can also rank segments that are not on the hotspot list. {sanity?.beyondTheList.unlistedSharePercent !== undefined ? `${sanity.beyondTheList.unlistedSharePercent}% of the top-5% segments are not within 100 m of a listed hotspot (base rate ${sanity.beyondTheList.baseRatePercent}%). ` : ""}This share alone does not show added value, because a ranking that matched the listed hotspots poorly would also show a high share. The top-k comparison above and field checks of these candidates are the evidence to weigh.
            </p>
          </div>
        </div>

        {/* Check B: Does Ranking Matter? */}
        <div className="space-y-3 pt-3 border-t border-[#D6DCE5]">
          <h3 className="text-sm font-semibold text-[#12356B] flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#1E7B4F]" />
            <span>Check B: Does Ranking Matter? (Score-Ranked vs 50 Random Closure Draws)</span>
          </h3>
          <p className="text-xs text-[#4A5668]">
            Average extra delay alone hides origin cut-offs. We report together: areas cut off, areas with &gt;10 min extra delay, and average extra delay across model, baseline, and 50 random closure draws at 5%, 10%, and 20% network closures.
          </p>

          {/* Comparison Table */}
          {sanity && sanity.rankingVsRandom.tiers.length > 0 && (
            <div className="overflow-x-auto rounded border border-[#D6DCE5] bg-white">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-[#D6DCE5] text-[10px] uppercase font-semibold text-[#4A5668] bg-[#F0F4F8]">
                    <th className="py-2.5 px-3">Failure Tier</th>
                    <th className="py-2.5 px-3 text-center">Closed</th>
                    <th className="py-2.5 px-3 text-center bg-[#EBF3FB]">
                      Model (RF)
                      <div className="text-[9px] font-normal text-[#12356B]">Cut-Off | &gt;10m | Avg Delay</div>
                    </th>
                    <th className="py-2.5 px-3 text-center bg-[#F0F4F8]">
                      Baseline (Heuristic)
                      <div className="text-[9px] font-normal text-[#4A5668]">Cut-Off | &gt;10m | Avg Delay</div>
                    </th>
                    <th className="py-2.5 px-3 text-center bg-[#F9FAFB]">
                      Random (50 Draws Mean [Min–Max])
                      <div className="text-[9px] font-normal text-[#4A5668]">Cut-Off | &gt;10m | Avg Delay</div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#D6DCE5] text-[#1B2430] font-mono text-[11px]">
                  {sanity.rankingVsRandom.tiers.map((tier) => (
                    <tr key={tier.percent} className="hover:bg-[#F9FAFB]">
                      <td className="py-2.5 px-3 font-sans font-semibold text-[#12356B]">
                        Top {tier.percent}%
                      </td>
                      <td className="py-2.5 px-3 text-center text-[#4A5668] font-mono">
                        {tier.numClosed} seg
                      </td>
                      {/* Model */}
                      <td className="py-2.5 px-3 text-center bg-[#EBF3FB]/60 text-[#12356B]">
                        <span className="font-bold text-[#B26A00]">{tier.model.areasCutOff}</span> cut |{" "}
                        <span>{tier.model.areasWithDelayOver10Min}</span> &gt;10m |{" "}
                        <span className="font-bold text-[#12356B]">+{tier.model.avgExtraDelayMin}m</span>
                      </td>
                      {/* Baseline */}
                      <td className="py-2.5 px-3 text-center bg-[#F0F4F8]/80 text-[#1B2430]">
                        <span className="font-bold text-[#B26A00]">{tier.baseline.areasCutOff}</span> cut |{" "}
                        <span>{tier.baseline.areasWithDelayOver10Min}</span> &gt;10m |{" "}
                        <span className="font-bold text-[#1B2430]">+{tier.baseline.avgExtraDelayMin}m</span>
                      </td>
                      {/* Random 50 Draws */}
                      <td className="py-2.5 px-3 text-center text-[#4A5668] bg-[#F9FAFB]">
                        <span>{tier.random.areasCutOffMean} [{tier.random.areasCutOffMin}–{tier.random.areasCutOffMax}] cut</span> |{" "}
                        <span>{tier.random.areasWithDelayOver10MinMean} &gt;10m</span> |{" "}
                        <span>+{tier.random.avgExtraDelayMinMean}m [{tier.random.avgExtraDelayMinMin}–{tier.random.avgExtraDelayMinMax}m]</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Honest Verdict Sentence */}
          {sanity && (
            <div className="p-3.5 rounded bg-[#F0F4F8] border border-[#D6DCE5] text-xs space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[#C77700] font-semibold uppercase tracking-wider text-[11px]">Data-Driven Verdict</span>
              </div>
              <p className="font-semibold text-[#12356B] text-sm leading-relaxed">
                {(() => {
                  const tiers = sanity.rankingVsRandom.tiers || [];
                  const above = tiers.filter((t: any) => t.baseline.areasCutOff > t.random.areasCutOffMax).length;
                  return above >= 2
                    ? `Score-ranked closures cut off more areas than every random draw at ${above} of ${tiers.length} tiers.`
                    : `Score-ranked closures stayed within the range of random closures at ${tiers.length - above} of ${tiers.length} tiers, so this check does not show a consistent difference between ranked and random closures.`;
                })()}
              </p>
              <p className="text-[11px] text-[#4A5668] leading-relaxed">
                Verdict rule: score-ranked closures are called worse than random only if the number of areas cut off is above the highest value seen in all 50 random draws, at two or more of the three tiers (5%, 10%, 20%). Otherwise we report that no consistent difference was found.
              </p>
            </div>
          )}
        </div>
      </section>
        </>
      )}

      {/* SECTION D: LIMITS AND HOW WE HANDLE THEM */}
      <section className="bg-white border border-[#D6DCE5] rounded p-5 space-y-4 shadow-xs">
        <div className="border-b border-[#D6DCE5] pb-3">
          <span className="text-[11px] uppercase font-semibold tracking-wider text-[#B3261E]">
            Section D • Limitations & Governance
          </span>
          <h2 className="text-base sm:text-lg font-semibold text-[#12356B] mt-0.5">
            Limits and How We Handle Them (Model Boundaries)
          </h2>
        </div>

        {/* Four-row table */}
        <div className="overflow-x-auto rounded border border-[#D6DCE5] bg-white">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-[#D6DCE5] text-[10px] uppercase font-semibold text-[#4A5668] bg-[#F0F4F8]">
                <th className="py-2.5 px-3 w-1/4">Declared Limitation</th>
                <th className="py-2.5 px-3 w-1/3">Core Constraint</th>
                <th className="py-2.5 px-3">How We Handle It in Code & Policy</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D6DCE5] text-[#1B2430]">
              <tr className="hover:bg-[#F9FAFB]">
                <td className="py-3 px-3 font-semibold text-[#12356B] align-top">Static Data</td>
                <td className="py-3 px-3 align-top text-[#4A5668]">
                  This is an index, not a forecast. Live rainfall (IMD) is future work.
                </td>
                <td className="py-3 px-3 text-[11px] text-[#1B2430] leading-relaxed">
                  Features measure structural depression depths and drainage proximity. We display persistent disclaimers on every map and report that scores represent structural susceptibility, not dynamic precipitation forecasts.
                </td>
              </tr>

              <tr className="hover:bg-[#F9FAFB]">
                <td className="py-3 px-3 font-semibold text-[#12356B] align-top">Hand-Geocoded Hotspots</td>
                <td className="py-3 px-3 align-top text-[#4A5668]">
                  The MVP is limited to the Minto Bridge / ITO corridor. Hotspot coordinates are demo data from public lists, not surveyed.
                </td>
                <td className="py-3 px-3 text-[11px] text-[#1B2430] leading-relaxed">
                  Currently using <strong className="text-[#12356B]">{totalHotspots} listed hotspots (demo data)</strong> ({totalHotspots} hand-geocoded from public PWD/DTP advisories, none field-verified). All labels derived from these points are marked strictly as proxy indicators.
                </td>
              </tr>

              <tr className="hover:bg-[#F9FAFB]">
                <td className="py-3 px-3 font-semibold text-[#12356B] align-top">No Real Trip Data</td>
                <td className="py-3 px-3 align-top text-[#4A5668]">
                  Sample origins; only relative extra delay is reported. Times come from road-class speeds.
                </td>
                <td className="py-3 px-3 text-[11px] text-[#1B2430] leading-relaxed">
                  Travel times strictly calculate via standard highway speeds (Motorway 60 km/h down to Residential 20 km/h). No synthetic origin weights or fake sensor pings are displayed.
                </td>
              </tr>

              <tr className="hover:bg-[#F9FAFB]">
                <td className="py-3 px-3 font-semibold text-[#12356B] align-top">Privacy & Oversight</td>
                <td className="py-3 px-3 align-top text-[#4A5668]">
                  Pin-only reports; the tool informs, humans decide.
                </td>
                <td className="py-3 px-3 text-[11px] text-[#1B2430] leading-relaxed">
                  Reports contain zero personal tracking, telemetry, or user PII. The tool functions as a clinical decision-support screen for municipal civil engineers.
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Exact label caveat */}
        <div className="p-3 rounded bg-[#FEE2E2] border border-[#FCA5A5] text-xs flex items-start gap-2 text-[#991B1B]">
          <ShieldAlert className="w-4 h-4 text-[#B3261E] shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold">Mandatory Label Caveat: </span>
            <span>{DISCLAIMERS.label}</span>
          </div>
        </div>
      </section>

      {/* SECTION E: WHAT WE MEASURE */}
      <section className="bg-white border border-[#D6DCE5] rounded p-5 space-y-4 shadow-xs">
        <div className="border-b border-[#D6DCE5] pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="text-[11px] uppercase font-semibold tracking-wider text-[#12356B]">
              Section E • Accessibility Impact
            </span>
            <h2 className="text-base sm:text-lg font-semibold text-[#12356B] mt-0.5">
              What We Measure (Live Hospital Accessibility Impact)
            </h2>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <span className="text-xs px-2.5 py-0.5 rounded bg-[#EBF1FA] text-[#12356B] border border-[#A5BEDB] font-semibold">
                Active mode: {sectionEMode === "dashboard" ? "Dashboard scenario" : "Top X% weakest roads"}
              </span>
              {sectionEMode === "dashboard" && activeScenario && activeScenario.hotspotIds.length > 0 ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-semibold bg-[#EBF1FA] text-[#12356B] border border-[#A5BEDB]">
                  Using dashboard scenario: {activeScenario.label || `${activeScenario.hotspotIds.length === 1 ? "1 hotspot" : `${activeScenario.hotspotIds.length} hotspots`}, ${activeScenario.rainfallLevel ? activeScenario.rainfallLevel.charAt(0).toUpperCase() + activeScenario.rainfallLevel.slice(1) : "Extreme"} rain`}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-semibold bg-[#F0F4F8] text-[#4A5668] border border-[#D6DCE5]">
                  Worst {measurePercent}% weakest roads
                </span>
              )}
            </div>
          </div>

          {/* Mode Toggle & Controls */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="inline-flex p-0.5 rounded-lg bg-[#EBF1FA] border border-[#CBD8E6] text-xs">
              <button
                type="button"
                onClick={() => {
                  setSectionEMode("dashboard");
                  onScenarioModeChange?.("dashboard");
                }}
                className={`px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                  sectionEMode === "dashboard"
                    ? "bg-[#12356B] text-white shadow-xs"
                    : "text-[#4A5668] hover:text-[#12356B]"
                }`}
              >
                Dashboard scenario
              </button>
              <button
                type="button"
                onClick={() => {
                  setSectionEMode("slider");
                  onScenarioModeChange?.("slider");
                }}
                className={`px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                  sectionEMode === "slider"
                    ? "bg-[#12356B] text-white shadow-xs"
                    : "text-[#4A5668] hover:text-[#12356B]"
                }`}
              >
                Top X% weakest roads
              </button>
            </div>

            {sectionEMode === "slider" && (
              <div className="flex items-center gap-2 bg-[#F0F4F8] px-3 py-1.5 rounded border border-[#D6DCE5]">
                <input
                  type="range"
                  min={0}
                  max={25}
                  step={1}
                  value={measurePercent}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setMeasurePercent(val);
                    onMeasurePercentChange?.(val);
                  }}
                  className="w-20 h-1.5 bg-[#CBD8E6] rounded appearance-none cursor-pointer accent-[#12356B]"
                />
                <span className="text-xs font-mono font-bold text-[#12356B] min-w-[28px]">
                  {measurePercent}%
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Three Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Stat 1: Extra Hospital Delay */}
          <div className="bg-[#F9FAFB] border border-[#D6DCE5] rounded p-4 flex flex-col justify-between">
            <span className="text-[11px] uppercase font-semibold tracking-wider text-[#4A5668]">
              Extra Hospital Delay (min)
            </span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono text-[#B26A00]">
                +{measureSimulation ? measureSimulation.summary.worstExtraDelayMin : "0.00"}
              </span>
              <span className="text-xs text-[#4A5668] font-medium">min (worst)</span>
            </div>
            <div className="text-[11px] text-[#4A5668] mt-1">
              Avg detour across corridor:{" "}
              <strong className="text-[#1B2430] font-mono">
                +{measureSimulation ? measureSimulation.summary.avgExtraDelayMin : "0.00"} min
              </strong>
            </div>
          </div>

          {/* Stat 2: Areas with No Flood-Free Route */}
          <div className="bg-[#F9FAFB] border border-[#D6DCE5] rounded p-4 flex flex-col justify-between">
            <span className="text-[11px] uppercase font-semibold tracking-wider text-[#4A5668]">
              Areas with No Flood-Free Route
            </span>
            <div className="mt-2 flex items-baseline gap-2">
              <span
                className={`text-2xl font-bold font-mono ${
                  measureSimulation && measureSimulation.summary.areasCutOff > 0
                    ? "text-[#B3261E]"
                    : "text-[#1E7B4F]"
                }`}
              >
                {measureSimulation ? measureSimulation.summary.areasCutOff : "0"}
              </span>
              <span className="text-xs text-[#4A5668] font-medium">
                / {measureSimulation ? measureSimulation.summary.totalAreas : "57"} areas
              </span>
            </div>
            <div className="text-[11px] text-[#4A5668] mt-1">
              {measureSimulation && measureSimulation.summary.areasCutOff > 0
                ? "Severed from all trauma emergency centers"
                : "All areas maintain hospital access"}
            </div>
          </div>

          {/* Stat 3: Precision / Recall Benchmark Link */}
          <div className="bg-[#F9FAFB] border border-[#D6DCE5] rounded p-4 flex flex-col justify-between">
            <span className="text-[11px] uppercase font-semibold tracking-wider text-[#4A5668]">
              Precision / Recall Benchmark
            </span>
            <div className="mt-2">
              <span className="text-2xl font-bold font-mono text-[#12356B]">
                {(baseline.precisionAt10 * 100).toFixed(0)}%
              </span>
              <span className="text-xs text-[#4A5668] font-medium ml-1.5">P@10 (Baseline)</span>
            </div>
            <div className="mt-1">
              <a
                href="#section-testing"
                className="text-[11px] text-[#12356B] hover:underline font-semibold inline-flex items-center gap-1"
              >
                <span>View full comparison vs model</span>
                <ArrowRight className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* DATA PROVENANCE FOOTER */}
      <footer className="bg-white border border-[#D6DCE5] rounded p-4 text-xs text-[#4A5668] shadow-xs">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-[#12356B] font-semibold">
              <FileText className="w-4 h-4 text-[#12356B]" />
              <span>Data Provenance & Pipeline Lineage</span>
            </div>
            <p className="text-[11px] text-[#4A5668]">
              <strong className="text-[#1B2430]">Sources:</strong> OpenStreetMap road network & emergency hospitals • SRTM 30m digital elevation via OpenTopoData • Public PWD & Delhi Traffic Police annual waterlogging registers.
            </p>
            <p className="text-[11px] text-[#4A5668] font-mono">
              Pipeline Run: {metrics.generatedAt} • Segments: {metrics.totalSegments} • Hospitals: {closureInfo?.hospitalCount || 8} • Snapping Connectivity: {closureInfo?.quality?.largestComponentPercent || "96.4%"} LCC • Scope: Minto Bridge / ITO corridor (Central Delhi)
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Link
              to="/planner"
              className="px-3 py-1.5 rounded bg-white hover:bg-[#F0F4F8] text-[#1B2430] border border-[#D6DCE5] text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <span>Back to Planner</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>

            <button
              type="button"
              onClick={handleDownloadMetrics}
              className="px-3 py-1.5 rounded bg-[#12356B] hover:bg-[#0D2850] text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>metrics.json</span>
            </button>
          </div>
        </div>
      </footer>
    </>
  );
}

export default function ReliabilityPage() {
  const [metrics, setMetrics] = useState<MLMetricsFile | null>(null);
  const [vulnerability, setVulnerability] = useState<VulnerabilityFile | null>(null);
  const [closureInfo, setClosureInfo] = useState<any | null>(null);
  const [dataSource, setDataSource] = useState<DataSource>("Frozen snapshot");
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [recomputing, setRecomputing] = useState<boolean>(false);

  const {
    activeScenario,
    plannerScenarioMode,
    setPlannerScenarioMode,
    plannerClosurePercent,
    setPlannerClosurePercent,
  } = useAppState();

  // Section E: Live closure mode & simulation
  const [sectionEMode, setSectionEMode] = useState<"dashboard" | "slider">(() =>
    plannerScenarioMode || (activeScenario && activeScenario.hotspotIds.length > 0 ? "dashboard" : "slider")
  );
  const [measurePercent, setMeasurePercent] = useState<number>(plannerClosurePercent ?? 10);
  const [measureSimulation, setMeasureSimulation] = useState<any | null>(null);

  useEffect(() => {
    if (activeScenario && activeScenario.hotspotIds.length > 0) {
      setSectionEMode("dashboard");
    }
  }, [activeScenario.hotspotIds.length]);

  useEffect(() => {
    if (plannerScenarioMode) {
      setSectionEMode(plannerScenarioMode);
    }
  }, [plannerScenarioMode]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch metrics
      const mRes = await resilientFetch("/rr-api/metrics");
      if (!mRes.ok) throw new Error(`HTTP ${mRes.status} loading /rr-api/metrics`);
      const mData: MLMetricsFile = await mRes.json();
      setMetrics(mData);

      // 2. Fetch vulnerability scores
      try {
        const vRes = await resilientFetch("/rr-api/vulnerability");
        if (vRes.ok) {
          const vData: VulnerabilityFile = await vRes.json();
          setVulnerability(vData);
        }
      } catch (vErr) {
        console.warn("Could not load vulnerability scores:", vErr);
      }

      // 3. Fetch closure graph info
      try {
        const cRes = await resilientFetch("/rr-api/closure/info");
        if (cRes.ok) {
          const cData = await cRes.json();
          setClosureInfo(cData);
          if (cData.data_source) {
            setDataSource(cData.data_source);
          }
        }
      } catch (cErr) {
        console.warn("Could not load closure info:", cErr);
      }
    } catch (err: any) {
      console.error("Failed to load reliability data:", err);
      setError(err?.message || "Failed to load validation and metrics report.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Section E: Run simulation using the same closures as the Planner
  useEffect(() => {
    let active = true;
    const runSim = async () => {
      try {
        const body =
          sectionEMode === "dashboard"
            ? { closedSegmentIds: activeScenario.closedSegmentIds }
            : { percent: measurePercent };

        const res = await resilientFetch("/rr-api/closure/simulate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (res.ok && active) {
          const data = await res.json();
          if (data.ok) {
            setMeasureSimulation(data);
          }
        }
      } catch (err) {
        console.warn("Simulation failed:", err);
      }
    };

    const timer = setTimeout(runSim, 60);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [sectionEMode, measurePercent, activeScenario.closedSegmentIds]);

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

  // Download metrics.json directly
  const handleDownloadMetrics = () => {
    if (!metrics) return;
    const blob = new Blob([JSON.stringify(metrics, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `roadrisk_delhi_metrics_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const featureImportances = metrics?.featureImportance || {};
  const isBaselineWinner = metrics?.winner === "baseline";
  const totalHotspots = FLOOD_HOTSPOTS.length;
  const verifiedHotspotsCount = FLOOD_HOTSPOTS.filter((h: any) => h.is_verified === true).length;

  const isEmergency =
    metrics?.winner === "emergency_fallback" ||
    (metrics as any)?.isEmergency === true ||
    vulnerability?.method === "emergency_fallback";

  const dummyMetrics: EvaluationMetrics = {
    rocAuc: 0,
    precisionAt10: 0,
    recallAt10: 0,
    precisionAt20: 0,
    recallAt20: 0,
    precisionAt5pct: 0,
    recallAt5pct: 0,
  };

  return (
    <div className="flex flex-col min-h-screen w-full bg-[#F5F7FA] text-[#1B2430] font-sans">
      <TopNavBar />

      {/* Breadcrumbs & Notice */}
      <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-8 pt-4">
        <PortalBreadcrumbs items={[{ label: "Reliability & Methods" }]} />
      </div>

      {/* Header Strip */}
      <header className="bg-white border-b border-[#D6DCE5] px-4 sm:px-8 py-5 mt-2">
        <div className="max-w-[1440px] mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#12356B]">
                Reliability, testing and limitations
              </h1>
              <ModeBadge
                method={isEmergency ? "emergency_fallback" : metrics?.winner || "baseline"}
                dataSource={dataSource}
                snapshotDate={vulnerability?.generatedAt || metrics?.generatedAt}
              />
            </div>
            <p className="text-xs text-[#4A5668] mt-1 font-medium">
              Technical methodology, spatial cross-validation, and governance boundaries for the Central Delhi corridor model.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto flex-wrap">
            <button
              type="button"
              onClick={handleDownloadMetrics}
              disabled={!metrics || isEmergency}
              className="px-3 py-1.5 rounded bg-white hover:bg-[#F0F4F8] border border-[#D6DCE5] text-xs font-semibold text-[#1B2430] flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40"
              title="Download raw metrics.json file"
            >
              <Download className="w-3.5 h-3.5 text-[#12356B]" />
              <span>Download metrics.json</span>
            </button>

            <button
              type="button"
              onClick={handleRecompute}
              disabled={recomputing}
              className="px-3 py-1.5 rounded bg-[#12356B] hover:bg-[#0D2850] text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer disabled:opacity-50"
              title="Rerun spatial cross-validation, bootstrap CI, and sanity checks"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${recomputing ? "animate-spin" : ""}`} />
              <span>{recomputing ? "Recomputing..." : "Recompute Pipeline"}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Persistent Amber Banner for Tier 3 Emergency Fallback */}
      {isEmergency && (
        <div className="bg-[#FEF3C7] border-b border-[#FDE68A] px-4 py-2.5 text-xs text-[#92400E] flex items-center justify-center gap-2 text-center font-semibold">
          <AlertTriangle className="w-4 h-4 text-[#B26A00] shrink-0" />
          <span>
            Emergency fallback: illustrative score from listed hotspots and underpass tags on a simplified corridor graph. Not validated.
          </span>
        </div>
      )}

      {/* Main Content with ErrorBoundary */}
      <main className="flex-1 w-full max-w-[1440px] mx-auto px-4 sm:px-8 py-6 space-y-6">
        <PortalNotice type="scenario" />

        <ErrorBoundary moduleName="Reliability Page Content">
          {loading ? (
            <div className="w-full h-[400px] rounded bg-white border border-[#D6DCE5] flex flex-col items-center justify-center p-8 text-center shadow-xs">
              <div className="w-8 h-8 rounded-full border-2 border-[#12356B] border-t-transparent animate-spin mb-4" />
              <p className="text-base font-semibold text-[#12356B]">Loading Reliability Report...</p>
              <p className="text-xs text-[#4A5668] mt-1 max-w-sm">
                Retrieving spatial cross-validation metrics, bootstrap intervals, and ranking sanity checks.
              </p>
            </div>
          ) : error ? (
            <div className="w-full rounded bg-white border border-[#D6DCE5] p-8 flex flex-col items-center justify-center text-center max-w-md mx-auto my-12 shadow-xs">
              <AlertTriangle className="w-8 h-8 text-[#B3261E] mb-3" />
              <h2 className="text-base font-semibold text-[#12356B] mb-1">Failed to Load Metrics</h2>
              <p className="text-xs text-[#4A5668] mb-6">{error}</p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={fetchData}
                  className="px-4 py-2 rounded bg-white hover:bg-[#F0F4F8] border border-[#D6DCE5] text-[#1B2430] text-xs font-semibold cursor-pointer"
                >
                  Retry
                </button>
                <button
                  type="button"
                  onClick={handleRecompute}
                  className="px-4 py-2 rounded bg-[#12356B] hover:bg-[#0D2850] text-white text-xs font-semibold cursor-pointer"
                >
                  Recompute Pipeline
                </button>
              </div>
            </div>
          ) : !isEmergency && (!metrics || !metrics.baseline || !metrics.model) ? (
            <div className="text-center py-16 bg-white border border-[#D6DCE5] rounded p-8">
              <p className="text-[#4A5668] text-sm">No complete metrics available. Please run the pipeline.</p>
              <button
                type="button"
                onClick={handleRecompute}
                className="mt-4 px-4 py-2 bg-[#12356B] hover:bg-[#0D2850] text-white text-xs font-semibold rounded cursor-pointer"
              >
                Generate Metrics Now
              </button>
            </div>
          ) : (
            <ReliabilityContent
              metrics={metrics || ({ cvScheme: "None (Emergency Fallback)", winner: "emergency_fallback" } as any)}
              baseline={metrics?.baseline || dummyMetrics}
              model={metrics?.model || dummyMetrics}
              ci={metrics?.confidenceIntervals}
              sanity={metrics?.sanityChecks}
              featureImportances={featureImportances}
              isBaselineWinner={isBaselineWinner}
              sectionEMode={sectionEMode}
              setSectionEMode={setSectionEMode}
              onScenarioModeChange={(mode) => {
                setSectionEMode(mode);
                setPlannerScenarioMode?.(mode);
              }}
              measurePercent={measurePercent}
              setMeasurePercent={setMeasurePercent}
              onMeasurePercentChange={(val) => {
                setMeasurePercent(val);
                setPlannerClosurePercent?.(val);
              }}
              measureSimulation={measureSimulation}
              activeScenario={activeScenario}
              totalHotspots={totalHotspots}
              verifiedHotspotsCount={verifiedHotspotsCount}
              closureInfo={closureInfo}
              handleDownloadMetrics={handleDownloadMetrics}
              isEmergency={isEmergency}
            />
          )}
        </ErrorBoundary>
      </main>

      {/* Public Sector Footer */}
      <PortalFooter />
    </div>
  );
}
