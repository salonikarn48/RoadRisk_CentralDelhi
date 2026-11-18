/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * RoadRisk Delhi - Route Hospital Card
 * Public-sector design tokens implementation.
 */

import React from "react";
import { Route, Clock, AlertTriangle, ShieldCheck, MapPin, ListOrdered, Info } from "lucide-react";
import type { CitizenStrings } from "../../i18n/citizen";
import CitizenMiniMap from "./CitizenMiniMap";

interface RouteHospitalCardProps {
  t: CitizenStrings;
  baselineMin: number;
  scenarioMin: number | null;
  extraDelayMin: number;
  isCutOff: boolean;
  hospitalName: string;
  originLabel: string;
  originCoords: [number, number];
  hospitalCoords?: [number, number];
  normalRouteCoords: [number, number][];
  detourRouteCoords: [number, number][];
  roadNames: string[];
  closedSegmentsGeometry: Array<Array<{ lat: number; lon: number }>>;
  onMapClick?: (lat: number, lon: number) => void;
}

export default function RouteHospitalCard({
  t,
  baselineMin,
  scenarioMin,
  extraDelayMin,
  isCutOff,
  hospitalName,
  originLabel,
  originCoords,
  hospitalCoords,
  normalRouteCoords,
  detourRouteCoords,
  roadNames,
  closedSegmentsGeometry,
  onMapClick,
}: RouteHospitalCardProps) {
  return (
    <article className="bg-white border border-[#D6DCE5] rounded p-4 shadow-xs space-y-3.5 text-[#1B2430]">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 border-b border-[#E4E9F0] pb-2.5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded bg-[#EBF1FA] border border-[#A5BEDB] flex items-center justify-center text-[#12356B]">
            <Route className="w-4 h-4 text-[#12356B]" />
          </div>
          <span className="text-xs uppercase font-semibold tracking-wider text-[#12356B] block">
            {t.routeCardTitle}
          </span>
        </div>

        {/* Delay difference tag */}
        {!isCutOff ? (
          extraDelayMin > 0 ? (
            <span className="bg-[#FEF7EC] border border-[#F5CF96] text-[#B26A00] text-xs font-semibold px-2.5 py-1 rounded">
              +{Math.round(extraDelayMin)} min delay
            </span>
          ) : (
            <span className="bg-[#EAF6EE] border border-[#A3D9B8] text-[#1E7B4F] text-xs font-semibold px-2 py-0.5 rounded">
              Direct Route Available
            </span>
          )
        ) : (
          <span className="bg-[#FDF1F0] border border-[#F5ABA8] text-[#B3261E] text-xs font-semibold px-2.5 py-1 rounded">
            No Flood-Free Route
          </span>
        )}
      </div>

      {/* Comparison Times Grid */}
      <div className="grid grid-cols-2 gap-2 text-center">
        {/* Normal Route Time */}
        <div className="bg-[#F0F4F8] border border-[#D6DCE5] rounded p-2.5">
          <span className="text-[11px] text-[#4A5668] font-medium block uppercase">
            {t.normalRouteLabel}
          </span>
          <div className="mt-1 flex items-baseline justify-center gap-1">
            <span className="text-xl font-bold text-[#1B2430]">
              {Math.round(baselineMin)}
            </span>
            <span className="text-xs text-[#4A5668] font-medium">{t.minAway}</span>
          </div>
        </div>

        {/* Scenario Route Time */}
        <div
          className={`rounded p-2.5 border ${
            isCutOff
              ? "bg-[#FDF1F0] border-[#F5ABA8]"
              : extraDelayMin > 0
              ? "bg-[#FEF7EC] border-[#F5CF96]"
              : "bg-[#F0F4F8] border-[#D6DCE5]"
          }`}
        >
          <span className="text-[11px] text-[#4A5668] font-medium block uppercase">
            {t.floodAwareRouteLabel}
          </span>
          <div className="mt-1 flex items-baseline justify-center gap-1">
            {!isCutOff && scenarioMin !== null ? (
              <>
                <span
                  className={`text-xl font-bold ${
                    extraDelayMin > 0 ? "text-[#B26A00]" : "text-[#1E7B4F]"
                  }`}
                >
                  {Math.round(scenarioMin)}
                </span>
                <span className="text-xs text-[#4A5668] font-medium">{t.minAway}</span>
              </>
            ) : (
              <span className="text-base font-bold text-[#B3261E]">Cut Off</span>
            )}
          </div>
        </div>
      </div>

      {/* Interactive Map */}
      <div className="rounded overflow-hidden border border-[#D6DCE5]">
        <CitizenMiniMap
          originCoords={originCoords}
          hospitalCoords={hospitalCoords}
          hospitalName={hospitalName}
          originLabel={originLabel}
          normalRouteCoords={normalRouteCoords}
          detourRouteCoords={detourRouteCoords}
          closedSegmentsGeometry={closedSegmentsGeometry}
          onMapClick={onMapClick}
          isCutOff={isCutOff}
        />
      </div>

      {/* Road Traversal List */}
      {!isCutOff && roadNames && roadNames.length > 0 && (
        <div className="space-y-1.5 pt-1">
          <span className="text-xs font-semibold text-[#12356B] flex items-center gap-1.5 uppercase tracking-wide">
            <ListOrdered className="w-3.5 h-3.5 text-[#12356B]" />
            <span>{t.routeStepsTitle}</span>
          </span>
          <div className="bg-[#F0F4F8] border border-[#D6DCE5] rounded p-2.5 max-h-36 overflow-y-auto space-y-1 text-xs">
            {roadNames.map((name, idx) => (
              <div key={idx} className="flex items-center gap-2 text-[#4A5668]">
                <span className="w-4 h-4 rounded-full bg-white text-[#12356B] border border-[#D6DCE5] text-[10px] font-semibold flex items-center justify-center shrink-0">
                  {idx + 1}
                </span>
                <span className="truncate text-[#1B2430] font-medium">{name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Scenario not forecast tag */}
      <div className="pt-2 border-t border-[#E4E9F0] text-[11px] text-[#64748B] flex items-start gap-1.5">
        <Info className="w-3.5 h-3.5 text-[#12356B] shrink-0 mt-0.5" />
        <p>{t.scenarioDisclaimer}</p>
      </div>
    </article>
  );
}
