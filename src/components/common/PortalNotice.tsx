/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * RoadRisk Delhi - Standard Public Portal Notices
 * Single source of truth for "Pilot area" and "Scenario, not a forecast" notices.
 */

import React from "react";
import { Info, AlertTriangle } from "lucide-react";

interface PortalNoticeProps {
  type: "pilot" | "scenario" | "warning";
  compact?: boolean;
  className?: string;
}

export function PortalNotice({ type, compact = false, className = "" }: PortalNoticeProps) {
  if (type === "pilot") {
    return (
      <div
        className={`flex items-start gap-2.5 rounded border border-[#D6DCE5] bg-[#F0F4F8] text-[#1B2430] ${
          compact ? "p-2 text-xs" : "p-3 text-xs sm:text-sm"
        } ${className}`}
        role="note"
        aria-label="Pilot area scope notice"
      >
        <Info className="w-4 h-4 text-[#12356B] shrink-0 mt-0.5" aria-hidden="true" />
        <div className="leading-relaxed">
          <strong className="font-semibold text-[#12356B]">Pilot Area:</strong>{" "}
          Central Delhi corridor covering Connaught Place, Minto Bridge, ITO, and Tilak Bridge (road network from OpenStreetMap). Analysis outside this corridor is disabled during the pilot evaluation.
        </div>
      </div>
    );
  }

  if (type === "scenario") {
    return (
      <div
        className={`flex items-start gap-2.5 rounded border border-[#F5CF96] bg-[#FEF7EC] text-[#1B2430] ${
          compact ? "p-2 text-xs" : "p-3 text-xs sm:text-sm"
        } ${className}`}
        role="note"
        aria-label="Scenario disclaimer"
      >
        <AlertTriangle className="w-4 h-4 text-[#B26A00] shrink-0 mt-0.5" aria-hidden="true" />
        <div className="leading-relaxed">
          <strong className="font-semibold text-[#B26A00]">Scenario, not a flood forecast:</strong>{" "}
          Road closures and travel times are simulated from network topology and road-class speeds to evaluate hospital access. This does not predict live rainfall or water depth.
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex items-start gap-2.5 rounded border border-[#D6DCE5] bg-white text-[#1B2430] ${
        compact ? "p-2 text-xs" : "p-3 text-xs sm:text-sm"
      } ${className}`}
      role="note"
    >
      <Info className="w-4 h-4 text-[#4A5668] shrink-0 mt-0.5" aria-hidden="true" />
      <div className="leading-relaxed text-xs">
        Data advisory: Results are based on OpenStreetMap geometries and spatial vulnerability screening.
      </div>
    </div>
  );
}

/**
 * Clean accessible help tooltip '?' with a one-sentence definition
 */
export function MetricHelpTooltip({ text }: { text: string }) {
  const [open, setOpen] = React.useState(false);

  return (
    <span className="relative inline-flex items-center ml-1 align-baseline">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        className="w-3.5 h-3.5 rounded-full bg-[#E4E9F0] hover:bg-[#D6DCE5] text-[#4A5668] hover:text-[#1B2430] text-[10px] font-bold flex items-center justify-center cursor-help border border-[#CBD5E1]"
        aria-label={`Definition: ${text}`}
        title={text}
      >
        ?
      </button>
      {open && (
        <span
          role="tooltip"
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 z-50 w-56 p-2 text-[11px] leading-snug font-normal text-white bg-[#1B2430] rounded shadow-md border border-[#334155] text-left pointer-events-none"
        >
          {text}
        </span>
      )}
    </span>
  );
}

export default PortalNotice;
