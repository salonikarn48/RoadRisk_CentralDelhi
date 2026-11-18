import React from "react";
import { Link } from "react-router-dom";
import { Activity, Globe, PhoneCall, AlertTriangle, ArrowLeft } from "lucide-react";
import type { CitizenLanguage, CitizenStrings } from "../../i18n/citizen";

interface CitizenHeaderProps {
  t: CitizenStrings;
  lang: CitizenLanguage;
  onToggleLang: () => void;
  isEmergencyFallback?: boolean;
}

export default function CitizenHeader({
  t,
  lang,
  onToggleLang,
  isEmergencyFallback = false,
}: CitizenHeaderProps) {
  return (
    <header className="w-full bg-[#0B2540] border-b border-[#1A3B5C] shadow-md text-[#E6EEF7] shrink-0 select-none">
      {/* Top Bar with Brand, Back to Planner & Language Toggle */}
      <div className="max-w-[480px] mx-auto px-4 py-2.5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <Link
            to="/planner"
            className="w-11 h-11 rounded-lg bg-[#12355A] hover:bg-[#1A4570] text-slate-200 hover:text-white flex items-center justify-center transition-colors border border-[#2B4A6B] shrink-0"
            title={t.backToPlanner}
            aria-label={t.backToPlanner}
          >
            <ArrowLeft className="w-5 h-5 text-cyan-400" />
          </Link>
          <div className="flex flex-col min-w-0">
            <span className="font-bold text-[15px] tracking-tight text-white truncate">
              {t.appTitle}
            </span>
            <span className="text-[11px] text-cyan-300 font-medium truncate">
              {t.citizenViewTitle}
            </span>
          </div>
        </div>

        {/* Language Toggle: minimum 44px touch target */}
        <button
          type="button"
          onClick={onToggleLang}
          className="min-h-[44px] min-w-[76px] px-3 py-2 rounded-lg bg-[#12355A] hover:bg-[#1A4570] text-white border border-[#2B4A6B] text-[13px] font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs active:scale-95"
          aria-label={`Switch language to ${t.langToggle}`}
        >
          <Globe className="w-4 h-4 text-[#F59E0B]" />
          <span>{t.langToggle}</span>
        </button>
      </div>

      {/* Emergency Call 112 Ribbon */}
      <div className="bg-[#12355A]/90 border-t border-[#1A3B5C] px-4 py-1.5 text-[12px] flex items-center justify-between gap-2">
        <span className="text-slate-300 flex items-center gap-1.5 font-medium truncate">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
          <span>{t.emergencyNotice}</span>
        </span>
        <a
          href="tel:112"
          className="px-2.5 py-1 rounded bg-red-600 hover:bg-red-700 text-white font-bold text-[11px] flex items-center gap-1 shrink-0 transition-colors shadow-xs"
          title="Call 112"
        >
          <PhoneCall className="w-3 h-3" />
          <span>112</span>
        </a>
      </div>

      {/* Tier 3 Emergency Fallback Banner */}
      {isEmergencyFallback && (
        <div className="bg-amber-950/95 border-t border-amber-600 px-4 py-2 text-xs text-amber-200 flex items-center justify-center gap-2 text-center font-bold shadow-md">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 animate-pulse" />
          <span className="text-[11px] leading-tight">{t.tier3Banner}</span>
        </div>
      )}
    </header>
  );
}
