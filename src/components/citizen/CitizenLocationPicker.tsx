/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * RoadRisk Delhi - Citizen Location Picker
 * Public-sector accessible input styling with privacy-preserving geolocation.
 */

import React from "react";
import { MapPin, Navigation, AlertCircle, ChevronDown } from "lucide-react";
import type { CitizenStrings } from "../../i18n/citizen";
import type { SampleOrigin } from "../../ml/closure/graph";

interface CitizenLocationPickerProps {
  t: CitizenStrings;
  sampleOrigins: SampleOrigin[];
  selectedOriginId: string | null;
  onSelectOriginId: (id: string) => void;
  onUseGeolocation: () => Promise<void>;
  isLocating: boolean;
  outsideNotice: boolean;
  selectedLabel: string;
}

export default function CitizenLocationPicker({
  t,
  sampleOrigins,
  selectedOriginId,
  onSelectOriginId,
  onUseGeolocation,
  isLocating,
  outsideNotice,
  selectedLabel,
}: CitizenLocationPickerProps) {
  return (
    <section className="bg-white border border-[#D6DCE5] rounded p-4 shadow-xs space-y-3.5 text-[#1B2430]">
      <div className="flex items-center justify-between gap-2 border-b border-[#E4E9F0] pb-2">
        <label className="text-xs uppercase font-semibold tracking-wider text-[#12356B] flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 text-[#12356B]" />
          <span>{t.selectedLocation}</span>
        </label>
        <span className="text-xs font-medium text-[#1B2430] truncate max-w-[220px]">
          {selectedLabel}
        </span>
      </div>

      {/* Button "Use my location" - >= 44px touch target */}
      <button
        type="button"
        onClick={onUseGeolocation}
        disabled={isLocating}
        className="w-full min-h-[46px] px-4 py-2.5 rounded bg-[#12356B] hover:bg-[#0D2850] text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors shadow-xs cursor-pointer disabled:opacity-60"
      >
        <Navigation className={`w-4 h-4 ${isLocating ? "animate-spin" : ""}`} />
        <span>{isLocating ? t.locating : t.useMyLocation}</span>
      </button>

      {/* Message when outside corridor */}
      {outsideNotice && (
        <div className="bg-[#FEF7EC] border border-[#F5CF96] rounded p-2.5 text-[#B26A00] text-xs flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-[#B26A00]" />
          <div className="space-y-0.5">
            <p className="font-semibold text-[#B26A00]">{t.locationOutsideCorridor}</p>
            <p className="text-[11px] text-[#4A5668]">{t.locationOutsideCorridorSub}</p>
          </div>
        </div>
      )}

      {/* Corridor Area Dropdown Fallback */}
      <div className="space-y-1.5">
        <label className="text-xs text-[#4A5668] font-medium block">
          {t.orSelectArea}
        </label>
        <div className="relative">
          <select
            value={selectedOriginId || ""}
            onChange={(e) => onSelectOriginId(e.target.value)}
            className="w-full min-h-[44px] bg-white border border-[#D6DCE5] text-[#1B2430] text-xs font-medium rounded px-3.5 py-2.5 pr-8 appearance-none focus:border-[#12356B] focus:outline-hidden cursor-pointer"
            aria-label={t.orSelectArea}
          >
            {sampleOrigins.map((orig) => (
              <option key={orig.id} value={orig.id}>
                {orig.name}
              </option>
            ))}
          </select>
          <ChevronDown className="w-4 h-4 text-[#4A5668] absolute right-3 top-3.5 pointer-events-none" />
        </div>
      </div>
    </section>
  );
}
