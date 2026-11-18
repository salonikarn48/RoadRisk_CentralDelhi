/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * RoadRisk Delhi - Top Risk List Component
 * Public-sector design system for displaying top ranked vulnerable road segments.
 */

import React from "react";
import { AlertTriangle, MapPin } from "lucide-react";
import type { VulnerabilitySegment, MLMetricsFile } from "../../types/risk";
import { getScoreBin } from "./SegmentDetailCard";

interface TopRiskListProps {
  segments: VulnerabilitySegment[];
  metrics: MLMetricsFile | null;
  selectedSegmentId: string | null;
  onSelectSegment: (segment: VulnerabilitySegment) => void;
}

export default function TopRiskList({
  segments,
  metrics,
  selectedSegmentId,
  onSelectSegment,
}: TopRiskListProps) {
  // Top 10 sorted by rank
  const top10 = segments
    .slice()
    .sort((a, b) => a.rank - b.rank)
    .slice(0, 10);

  const totalCount = segments.length;
  const veryHighCount = segments.filter((s) => s.score >= 0.75).length;

  let topDriverName = "Subterranean Road Underpasses";
  if (metrics && metrics.featureImportance) {
    const sortedFeatures = Object.entries(metrics.featureImportance).sort(
      (a, b) => Number(b[1]) - Number(a[1])
    );
    if (sortedFeatures.length > 0) {
      const topKey = sortedFeatures[0][0];
      const nameMap: Record<string, string> = {
        dist_to_water_m: "Water Drainage Proximity",
        elevation_min: "Low Surface Elevation",
        elevation_mean: "Low Ground Baseline",
        low_point_depth_m: "Depression Low-Point",
        is_underpass: "Subsurface Underpass Cuts",
        length_m: "Long Road Segment",
        lanes: "Multi-Lane Surface Runoff",
        highway_class: "Arterial Highway Hierarchy",
      };
      topDriverName = nameMap[topKey] || topKey.replace(/_/g, " ");
    }
  }

  return (
    <div className="bg-white border border-[#D6DCE5] rounded p-4 shadow-xs text-[#1B2430] flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#E4E9F0] pb-2.5">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-[#B3261E]" />
          <h3 className="text-xs font-semibold text-[#12356B] uppercase tracking-wider">
            Most Vulnerable Corridors
          </h3>
        </div>
        <span className="text-[11px] font-semibold text-[#B3261E] bg-[#FDF1F0] border border-[#F5ABA8] px-2 py-0.5 rounded">
          Top 10 Critical
        </span>
      </div>

      {/* Summary Row */}
      <div className="grid grid-cols-3 gap-2 bg-[#F0F4F8] rounded p-2 border border-[#D6DCE5] text-center">
        <div className="flex flex-col">
          <span className="text-[10px] text-[#4A5668] uppercase font-medium">Segments</span>
          <span className="text-sm font-semibold text-[#1B2430]">{totalCount}</span>
        </div>
        <div className="flex flex-col border-x border-[#D6DCE5]">
          <span className="text-[10px] text-[#B3261E] uppercase font-medium">Very High</span>
          <span className="text-sm font-semibold text-[#B3261E]">{veryHighCount}</span>
        </div>
        <div className="flex flex-col" title={`Primary Driver: ${topDriverName}`}>
          <span className="text-[10px] text-[#12356B] uppercase font-medium">Top Driver</span>
          <span className="text-xs font-semibold text-[#12356B] truncate px-1 mt-0.5">
            {topDriverName.split(" ")[0]}
          </span>
        </div>
      </div>

      {/* Segment List */}
      <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1 select-none">
        {top10.map((seg) => {
          const isSelected = seg.segmentId === selectedSegmentId;
          const bin = getScoreBin(seg.score);
          const roadTitle =
            seg.name && seg.name.trim() !== ""
              ? seg.name
              : `Unnamed ${seg.features.highway_class || "Road"}`;

          return (
            <button
              key={seg.segmentId}
              type="button"
              onClick={() => onSelectSegment(seg)}
              className={`w-full text-left p-2 rounded border transition-colors flex items-center justify-between gap-2.5 cursor-pointer focus:outline-hidden ${
                isSelected
                  ? "bg-[#EBF1FA] border-[#12356B]"
                  : "bg-[#F8FAFC] hover:bg-[#F0F4F8] border-[#E2E8F0]"
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-5 h-5 rounded flex items-center justify-center font-mono text-[11px] font-semibold bg-[#E4E9F0] text-[#12356B] shrink-0 border border-[#CBD5E1]">
                  #{seg.rank}
                </span>

                <div className="min-w-0">
                  <p
                    className="text-xs font-semibold text-[#1B2430] truncate"
                    title={roadTitle}
                  >
                    {roadTitle}
                  </p>
                  <p className="text-[10px] text-[#64748B] flex items-center gap-1.5 capitalize mt-0.5">
                    <span>{seg.features.highway_class}</span>
                    {seg.features.is_underpass && (
                      <span className="text-[#B26A00] font-semibold">• Underpass</span>
                    )}
                  </p>
                </div>
              </div>

              {/* Score Badge */}
              <div className="flex items-center gap-1 shrink-0 text-right">
                <span
                  className="text-xs font-semibold"
                  style={{ color: bin.color }}
                >
                  {Math.round(seg.score * 100)}%
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
