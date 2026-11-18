import React, { useState } from "react";
import { Info, ShieldCheck, Cpu, AlertTriangle, Database, Wifi } from "lucide-react";
import type { ScoringMethod, ModeTier, DataSource } from "../../types/risk";

interface ModeBadgeProps {
  method: ScoringMethod;
  dataSource?: DataSource;
  snapshotDate?: string;
}

export default function ModeBadge({
  method,
  dataSource = "Frozen snapshot",
  snapshotDate = "Oct 28, 2026",
}: ModeBadgeProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  const isEmergency = method === "emergency_fallback";
  const isBaseline = method === "baseline";

  let tierLabel = "ML model";
  let tierTooltip = "Trained Random Forest ensemble model scoring structural waterlogging susceptibility.";

  if (isEmergency) {
    tierLabel = "Emergency fallback";
    tierTooltip =
      "Emergency fallback: illustrative score from listed hotspots and underpass tags on a simplified corridor graph. Not validated.";
  } else if (isBaseline) {
    tierLabel = "Labelled baseline";
    tierTooltip =
      "Too few listed hotspots to train a model reliably (or baseline won spatial cross-validation), showing a transparent rule-based physical score.";
  }

  // Format short snapshot date if ISO string provided
  let formattedDate = snapshotDate;
  if (snapshotDate && snapshotDate.includes("T")) {
    try {
      const d = new Date(snapshotDate);
      formattedDate = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    } catch {
      formattedDate = snapshotDate;
    }
  }

  return (
    <div className="relative inline-flex items-center">
      <button
        type="button"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onClick={() => setShowTooltip((prev) => !prev)}
        onFocus={() => setShowTooltip(true)}
        onBlur={() => setShowTooltip(false)}
        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold tracking-wide border shadow-xs transition-all cursor-pointer select-none focus:outline-none focus:ring-2 ${
          isEmergency
            ? "bg-amber-950/80 text-amber-200 border-amber-500 hover:bg-amber-900/90 focus:ring-amber-400"
            : isBaseline
            ? "bg-amber-950/40 text-amber-300 border-amber-600/40 hover:bg-amber-900/40 focus:ring-amber-400"
            : "bg-cyan-950/40 text-cyan-300 border-cyan-500/40 hover:bg-cyan-900/40 focus:ring-cyan-400"
        }`}
        aria-label={`Mode: ${tierLabel}. Data: ${dataSource} (${formattedDate}).`}
      >
        {isEmergency ? (
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
        ) : isBaseline ? (
          <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
        ) : (
          <Cpu className="w-3.5 h-3.5 text-cyan-400" />
        )}

        <span className="font-bold">{tierLabel}</span>

        <span className="opacity-40 text-slate-400">|</span>

        <span className="inline-flex items-center gap-1 text-[11px] font-normal opacity-90">
          {dataSource === "Live OSM" ? (
            <Wifi className="w-3 h-3 text-emerald-400" />
          ) : (
            <Database className="w-3 h-3 text-cyan-300" />
          )}
          <span>{dataSource}</span>
          {!dataSource.includes("downloaded") && (
            <span className="text-[10px] text-slate-400">({formattedDate})</span>
          )}
        </span>

        <Info className="w-3 h-3 opacity-70 ml-0.5" />
      </button>

      {/* Tooltip */}
      {showTooltip && (
        <div
          role="tooltip"
          className="absolute top-full left-0 mt-2 z-50 w-72 p-3 rounded-lg bg-slate-900/95 border border-slate-700 shadow-xl text-slate-200 text-xs leading-relaxed backdrop-blur-md animate-in fade-in zoom-in-95 duration-150"
        >
          <div className="space-y-2">
            <div className="flex items-start gap-2">
              <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-white mb-0.5">{tierLabel}</p>
                <p className="text-slate-300 text-[11px]">{tierTooltip}</p>
              </div>
            </div>
            <div className="border-t border-slate-800 pt-1.5 flex items-center justify-between text-[10px] text-slate-400">
              <span>Data source: <strong className="text-slate-200">{dataSource}</strong></span>
              <span>Snapshot: <strong className="text-slate-200">{formattedDate}</strong></span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
