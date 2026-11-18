/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * RoadRisk Delhi - Citizen Scenario Selector
 * Public-sector design system styling for rainfall failure scenario selection.
 */

import React from "react";
import { CloudRain, Sun, CloudLightning, Info } from "lucide-react";
import type { CitizenStrings } from "../../i18n/citizen";

export type CitizenScenarioOption = 0 | 10 | 20;

interface CitizenScenarioSelectorProps {
  t: CitizenStrings;
  selectedPercent: CitizenScenarioOption;
  onSelect: (percent: CitizenScenarioOption) => void;
}

export default function CitizenScenarioSelector({
  t,
  selectedPercent,
  onSelect,
}: CitizenScenarioSelectorProps) {
  const options: Array<{
    value: CitizenScenarioOption;
    label: string;
    icon: React.ReactNode;
  }> = [
    {
      value: 0,
      label: t.scenarioNormal,
      icon: <Sun className="w-4 h-4 text-[#1E7B4F]" />,
    },
    {
      value: 10,
      label: t.scenarioHeavy,
      icon: <CloudRain className="w-4 h-4 text-[#B26A00]" />,
    },
    {
      value: 20,
      label: t.scenarioSevere,
      icon: <CloudLightning className="w-4 h-4 text-[#B3261E]" />,
    },
  ];

  return (
    <section className="bg-white border border-[#D6DCE5] rounded p-4 shadow-xs text-[#1B2430]">
      <div className="flex items-center justify-between gap-2 mb-2.5 border-b border-[#E4E9F0] pb-2">
        <label className="text-xs uppercase font-semibold tracking-wider text-[#12356B]">
          <span>{t.scenarioTitle}</span>
        </label>
        <span className="text-xs font-semibold text-[#12356B] bg-[#EBF1FA] px-2 py-0.5 rounded border border-[#A5BEDB]">
          {selectedPercent}% closed
        </span>
      </div>

      {/* 3 Touch Targets (min-h-[44px]) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {options.map((opt) => {
          const isSelected = selectedPercent === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onSelect(opt.value)}
              className={`min-h-[46px] px-3 py-2 rounded text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer border text-left ${
                isSelected
                  ? `bg-[#12356B] text-white border-[#12356B]`
                  : `bg-[#F8FAFC] text-[#1B2430] hover:bg-[#F0F4F8] border-[#D6DCE5]`
              }`}
              aria-pressed={isSelected}
            >
              <span className="shrink-0">{opt.icon}</span>
              <span className="truncate">{opt.label}</span>
            </button>
          );
        })}
      </div>

      {/* Required Plain Disclaimer Line */}
      <div className="mt-2.5 pt-2 border-t border-[#E4E9F0] flex items-start gap-1.5 text-[11px] text-[#64748B] leading-normal">
        <Info className="w-3.5 h-3.5 text-[#12356B] shrink-0 mt-0.5" />
        <p>{t.scenarioDisclaimer}</p>
      </div>
    </section>
  );
}
