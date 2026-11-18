/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * RoadRisk Delhi - Segment Detail Card
 * Public-sector design system for inspecting physical risk drivers.
 */

import React, { useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Info,
  ShieldAlert,
} from "lucide-react";
import type { VulnerabilitySegment } from "../../types/risk";
import { DISCLAIMERS } from "../../data/disclaimers";

interface SegmentDetailCardProps {
  segment: VulnerabilitySegment | null;
  totalSegments: number;
  onClearSelection?: () => void;
}

// Bins and colors matching public sector standard
export function getScoreBin(score: number): {
  label: "Low" | "Moderate" | "High" | "Very high";
  color: string;
  badgeBg: string;
  badgeText: string;
} {
  if (score >= 0.75) {
    return {
      label: "Very high",
      color: "#B3261E",
      badgeBg: "bg-[#FDF1F0] border-[#F5ABA8]",
      badgeText: "text-[#B3261E]",
    };
  }
  if (score >= 0.5) {
    return {
      label: "High",
      color: "#C77700",
      badgeBg: "bg-[#FEF7EC] border-[#F5CF96]",
      badgeText: "text-[#B26A00]",
    };
  }
  if (score >= 0.25) {
    return {
      label: "Moderate",
      color: "#B26A00",
      badgeBg: "bg-[#FEF7EC] border-[#F5CF96]",
      badgeText: "text-[#B26A00]",
    };
  }
  return {
    label: "Low",
    color: "#1E7B4F",
    badgeBg: "bg-[#EAF6EE] border-[#A3D9B8]",
    badgeText: "text-[#1E7B4F]",
  };
}

export default function SegmentDetailCard({
  segment,
  totalSegments,
  onClearSelection,
}: SegmentDetailCardProps) {
  const [showAllFeatures, setShowAllFeatures] = useState(false);

  if (!segment) {
    return (
      <div className="bg-white border border-[#D6DCE5] rounded p-5 text-center shadow-xs">
        <div className="w-10 h-10 rounded bg-[#F0F4F8] border border-[#D6DCE5] flex items-center justify-center mx-auto mb-2.5">
          <Info className="w-5 h-5 text-[#12356B]" />
        </div>
        <h3 className="text-sm font-semibold text-[#12356B] mb-1">No Segment Selected</h3>
        <p className="text-xs text-[#4A5668] max-w-xs mx-auto leading-relaxed">
          Select any road segment on the map or click a ranked item in the table below to review physical risk drivers.
        </p>
      </div>
    );
  }

  const bin = getScoreBin(segment.score);
  const scorePercent = Math.round(segment.score * 100);
  const isWithinHotspot = Boolean(segment.isWithin100mHotspot);

  const roadTitle =
    segment.name && segment.name.trim() !== ""
      ? segment.name
      : `Unnamed ${segment.features.highway_class || "Road"}`;

  const maxContribution = Math.max(
    ...segment.topFactors.map((f) => f.contribution),
    0.01
  );

  return (
    <div className="bg-white border border-[#D6DCE5] rounded p-4 sm:p-5 shadow-xs text-[#1B2430] flex flex-col gap-3.5">
      {/* Header: Title, Class, Rank & Close Button */}
      <div className="flex items-start justify-between gap-3 border-b border-[#E4E9F0] pb-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span
              className={`px-2 py-0.5 rounded text-[11px] font-semibold uppercase tracking-wider border ${bin.badgeBg} ${bin.badgeText}`}
            >
              {bin.label} Risk
            </span>
            <span className="text-xs text-[#4A5668] capitalize">
              {segment.features.highway_class} corridor
            </span>
          </div>
          <h3 className="text-base font-semibold text-[#12356B] tracking-tight truncate" title={roadTitle}>
            {roadTitle}
          </h3>
          <p className="text-[11px] text-[#64748B] font-mono mt-0.5">
            ID: {segment.segmentId}
          </p>
        </div>

        {onClearSelection && (
          <button
            type="button"
            onClick={onClearSelection}
            className="text-[#64748B] hover:text-[#1B2430] p-1 rounded hover:bg-[#F0F4F8] transition-colors cursor-pointer text-xs"
            aria-label="Clear segment selection"
          >
            ✕
          </button>
        )}
      </div>

      {/* Score Gauge & Rank Card */}
      <div className="grid grid-cols-2 gap-3 bg-[#F0F4F8] rounded p-3 border border-[#D6DCE5]">
        {/* Score Gauge */}
        <div className="flex flex-col">
          <span className="text-[11px] font-medium text-[#4A5668] uppercase tracking-wide">
            Susceptibility Score
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span
              className="text-2xl font-bold tracking-tight"
              style={{ color: bin.color }}
            >
              {scorePercent}%
            </span>
            <span className="text-xs text-[#64748B] font-medium">
              ({segment.score.toFixed(3)})
            </span>
          </div>
          <div className="w-full h-1.5 bg-[#D6DCE5] rounded mt-2 overflow-hidden">
            <div
              className="h-full rounded"
              style={{
                width: `${scorePercent}%`,
                backgroundColor: bin.color,
              }}
            />
          </div>
        </div>

        {/* Priority Rank */}
        <div className="flex flex-col border-l border-[#D6DCE5] pl-3">
          <span className="text-[11px] font-medium text-[#4A5668] uppercase tracking-wide">
            Corridor Rank
          </span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-2xl font-bold text-[#12356B]">
              #{segment.rank}
            </span>
            <span className="text-xs text-[#64748B] font-medium">
              of {totalSegments}
            </span>
          </div>
          <p className="text-[11px] text-[#4A5668] mt-2 truncate font-medium">
            {segment.rank <= Math.round(totalSegments * 0.1)
              ? "Top 10% Critical"
              : segment.rank <= Math.round(totalSegments * 0.25)
              ? "Elevated Priority"
              : "Standard Priority"}
          </p>
        </div>
      </div>

      {/* Top 3 Factors */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-[#12356B] flex items-center gap-1.5 uppercase tracking-wide">
            <AlertTriangle className="w-3.5 h-3.5 text-[#B26A00]" />
            Top Physical Vulnerability Factors
          </span>
          <span className="text-[11px] text-[#64748B]">Weight Impact</span>
        </div>

        <div className="space-y-1.5">
          {segment.topFactors.map((factor, idx) => {
            const barWidth = Math.max(
              12,
              Math.round((factor.contribution / maxContribution) * 100)
            );

            return (
              <div
                key={idx}
                className="bg-[#F8FAFC] border border-[#E2E8F0] rounded p-2 flex flex-col gap-1"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-[#1B2430]">
                    {idx + 1}. {factor.label}
                  </span>
                  <span className="text-[#12356B] font-semibold text-[11px] shrink-0 ml-2">
                    +{factor.contribution.toFixed(3)}
                  </span>
                </div>
                <div className="w-full h-1 bg-[#D6DCE5] rounded overflow-hidden">
                  <div
                    className="h-full rounded bg-[#12356B]"
                    style={{ width: `${barWidth}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Collapsible: All Features Table */}
      <div className="border border-[#D6DCE5] rounded overflow-hidden">
        <button
          type="button"
          onClick={() => setShowAllFeatures((prev) => !prev)}
          className="w-full px-3 py-2 text-xs font-semibold text-[#12356B] flex items-center justify-between bg-[#F0F4F8] hover:bg-[#E4E9F0] transition-colors cursor-pointer select-none"
        >
          <span>All Physical Features &amp; Measurements</span>
          {showAllFeatures ? (
            <ChevronUp className="w-4 h-4 text-[#12356B]" />
          ) : (
            <ChevronDown className="w-4 h-4 text-[#4A5668]" />
          )}
        </button>

        {showAllFeatures && (
          <div className="p-3 bg-white text-xs space-y-1.5">
            <div className="flex justify-between py-1 border-b border-[#E4E9F0]">
              <span className="text-[#4A5668]">Mean Elevation (SRTM 30m):</span>
              <span className="font-semibold text-[#1B2430]">
                {segment.features.elevation_mean !== null
                  ? `${segment.features.elevation_mean.toFixed(1)} m`
                  : "Unavailable"}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-[#E4E9F0]">
              <span className="text-[#4A5668]">Min Elevation:</span>
              <span className="font-semibold text-[#1B2430]">
                {segment.features.elevation_min !== null
                  ? `${segment.features.elevation_min.toFixed(1)} m`
                  : "Unavailable"}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-[#E4E9F0]">
              <span className="text-[#4A5668]">Depression Depth (vs 300m):</span>
              <span className="font-semibold text-[#1B2430]">
                {segment.features.low_point_depth_m !== null
                  ? `${segment.features.low_point_depth_m > 0 ? "+" : ""}${segment.features.low_point_depth_m.toFixed(2)} m`
                  : "0.00 m"}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-[#E4E9F0]">
              <span className="text-[#4A5668]">Distance to Drainage / Yamuna:</span>
              <span className="font-semibold text-[#1B2430]">
                {segment.features.dist_to_water_m >= 1000
                  ? `${(segment.features.dist_to_water_m / 1000).toFixed(2)} km`
                  : `${Math.round(segment.features.dist_to_water_m)} m`}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-[#E4E9F0]">
              <span className="text-[#4A5668]">Subterranean Underpass Cut:</span>
              <span className="font-semibold text-[#1B2430]">
                {segment.features.is_underpass ? "Yes (Subsurface Cut)" : "No (At Grade)"}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-[#E4E9F0]">
              <span className="text-[#4A5668]">Road Class &amp; Lanes:</span>
              <span className="font-semibold text-[#1B2430] capitalize">
                {segment.features.highway_class} ({segment.features.lanes} {segment.features.lanes > 1 ? "lanes" : "lane"})
              </span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-[#4A5668]">Segment Length:</span>
              <span className="font-semibold text-[#1B2430]">
                {segment.features.length_m.toFixed(1)} m
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Label Proxy Transparency Note */}
      <div className="bg-[#F0F4F8] border border-[#D6DCE5] rounded p-2.5 text-[11px] text-[#4A5668] leading-relaxed">
        <p>
          <span className="font-semibold text-[#1B2430]">
            Within 100 m of a listed hotspot: {isWithinHotspot ? "Yes" : "No"}.
          </span>{" "}
          Used for training validation alignment; provided for transparency.
        </p>
      </div>

      {/* Regulatory Disclaimer Line */}
      <div className="border-t border-[#E4E9F0] pt-2 flex items-center gap-1.5 text-[11px] text-[#64748B]">
        <ShieldAlert className="w-3.5 h-3.5 text-[#64748B] shrink-0" />
        <p className="italic">{DISCLAIMERS.index}</p>
      </div>
    </div>
  );
}
