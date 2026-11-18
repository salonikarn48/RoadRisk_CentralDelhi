import React, { useState } from "react";
import { Info, ShieldCheck, Cpu } from "lucide-react";
import type { ScoringMethod } from "../../types/risk";

interface MethodBadgeProps {
  method: ScoringMethod;
}

export default function MethodBadge({ method }: MethodBadgeProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  const isBaseline = method === "baseline";
  const label = isBaseline ? "Labelled baseline" : "ML model";
  const tooltipText = isBaseline
    ? "Too few listed hotspots to train a model reliably, showing a transparent rule-based score."
    : "Trained Random Forest ensemble model scoring structural waterlogging susceptibility.";

  return (
    <div className="relative inline-flex items-center">
      <button
        type="button"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onClick={() => setShowTooltip((prev) => !prev)}
        onFocus={() => setShowTooltip(true)}
        onBlur={() => setShowTooltip(false)}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold tracking-wide border shadow-xs transition-colors cursor-pointer select-none focus:outline-none focus:ring-2 focus:ring-cyan-400 ${
          isBaseline
            ? "bg-amber-950/40 text-amber-300 border-amber-600/40 hover:bg-amber-900/40"
            : "bg-cyan-950/40 text-cyan-300 border-cyan-500/40 hover:bg-cyan-900/40"
        }`}
        aria-label={`Scoring method: ${label}. ${tooltipText}`}
      >
        {isBaseline ? (
          <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
        ) : (
          <Cpu className="w-3.5 h-3.5 text-cyan-400" />
        )}
        <span>{label}</span>
        <Info className="w-3 h-3 opacity-70 ml-0.5" />
      </button>

      {/* Tooltip */}
      {showTooltip && (
        <div
          role="tooltip"
          className="absolute top-full left-0 mt-2 z-50 w-64 p-2.5 rounded-lg bg-slate-900/95 border border-slate-700 shadow-xl text-slate-200 text-xs leading-relaxed backdrop-blur-md animate-in fade-in zoom-in-95 duration-150"
        >
          <div className="flex items-start gap-2">
            <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            <p>{tooltipText}</p>
          </div>
        </div>
      )}
    </div>
  );
}
