/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * RoadRisk Delhi - Nearest Hospital Card
 * Public-sector design tokens implementation.
 */

import React from "react";
import { Hospital, PhoneCall, AlertTriangle, ArrowRight, ShieldCheck } from "lucide-react";
import type { CitizenStrings } from "../../i18n/citizen";

interface NearestHospitalCardProps {
  t: CitizenStrings;
  hospitalName: string;
  travelTimeMin: number | null;
  isCutOff: boolean;
  onShowDirections: () => void;
}

export default function NearestHospitalCard({
  t,
  hospitalName,
  travelTimeMin,
  isCutOff,
  onShowDirections,
}: NearestHospitalCardProps) {
  return (
    <article className="bg-white border border-[#D6DCE5] rounded p-4 shadow-xs space-y-3.5 text-[#1B2430]">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 border-b border-[#E4E9F0] pb-2.5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded bg-[#EBF1FA] border border-[#A5BEDB] flex items-center justify-center text-[#12356B]">
            <Hospital className="w-4 h-4 text-[#12356B]" />
          </div>
          <div>
            <span className="text-xs uppercase font-semibold tracking-wider text-[#12356B] block">
              {t.nearestHospitalTitle}
            </span>
            <span className="text-[11px] text-[#1E7B4F] font-semibold flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-[#1E7B4F]" />
              <span>{t.traumaCenterBadge}</span>
            </span>
          </div>
        </div>

        {/* Time estimate or Cut-off badge */}
        {!isCutOff && travelTimeMin !== null ? (
          <div className="bg-[#EBF1FA] border border-[#A5BEDB] rounded px-2.5 py-1 text-right">
            <span className="text-xl font-bold text-[#12356B]">
              {Math.round(travelTimeMin)}
            </span>
            <span className="text-xs text-[#4A5668] font-medium ml-1">
              {t.minAway}
            </span>
          </div>
        ) : (
          <span className="bg-[#FDF1F0] border border-[#F5ABA8] text-[#B3261E] text-xs px-2.5 py-1 rounded font-semibold">
            Cut Off
          </span>
        )}
      </div>

      {/* Main Content */}
      {isCutOff ? (
        <div className="bg-[#FDF1F0] border border-[#F5ABA8] rounded p-3 text-[#B3261E] space-y-3">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-[#B3261E] shrink-0 mt-0.5" />
            <p className="text-xs font-medium leading-relaxed">
              {t.noRouteCutoffAlert}
            </p>
          </div>

          <a
            href="tel:112"
            className="w-full min-h-[46px] rounded bg-[#B3261E] hover:bg-[#8F1D17] text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-xs transition-colors"
          >
            <PhoneCall className="w-4 h-4 fill-white" />
            <span>{t.call112}</span>
          </a>
        </div>
      ) : (
        <div className="space-y-3">
          <div>
            <h3 className="text-base font-semibold text-[#12356B] tracking-tight">
              {hospitalName}
            </h3>
            <p className="text-xs text-[#4A5668] mt-0.5">
              Major tertiary emergency &amp; trauma care center serving Central Delhi
            </p>
          </div>

          <button
            type="button"
            onClick={onShowDirections}
            className="w-full min-h-[44px] px-4 py-2 rounded bg-[#12356B] hover:bg-[#0D2850] text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-xs"
          >
            <span>{t.directionsAction}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </article>
  );
}
