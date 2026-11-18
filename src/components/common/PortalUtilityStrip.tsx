/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * RoadRisk Delhi - Top Portal Utility Strip
 * Public-sector accessibility and language banner.
 */

import React from "react";
import { usePortalTheme } from "../../context/PortalThemeContext";

export default function PortalUtilityStrip() {
  const { textSize, setTextSize, language, setLanguage } = usePortalTheme();

  return (
    <div className="portal-utility-strip w-full bg-[#0D2850] text-[#E4E9F0] border-b border-[#1A3B5C] text-xs py-1 px-4 sm:px-6 flex items-center justify-between select-none">
      {/* Left: Official Prototype Notice */}
      <div className="flex items-center gap-2">
        <span className="font-semibold tracking-wide text-slate-200">
          Prototype
        </span>
        <span className="text-slate-400">•</span>
        <span className="text-slate-300">
          Build for Bharat 2026
        </span>
      </div>

      {/* Right: Accessibility Controls & Language */}
      <div className="flex items-center gap-4">
        {/* Skip to Main Content Link (Visible on Tab/Focus) */}
        <a
          href="#main-content"
          className="skip-to-content-link"
        >
          Skip to main content
        </a>

        {/* Text Size Control */}
        <div className="flex items-center gap-1" role="group" aria-label="Text size control">
          <span className="text-[11px] text-slate-300 mr-1 hidden sm:inline">Text Size:</span>
          <button
            type="button"
            onClick={() => setTextSize("sm")}
            className={`px-1.5 py-0.5 rounded text-[11px] font-semibold transition-colors ${
              textSize === "sm"
                ? "bg-[#12356B] text-white border border-cyan-400"
                : "text-slate-300 hover:text-white hover:bg-white/10"
            }`}
            title="Small text size (A-)"
            aria-pressed={textSize === "sm"}
          >
            A-
          </button>
          <button
            type="button"
            onClick={() => setTextSize("base")}
            className={`px-1.5 py-0.5 rounded text-[11px] font-semibold transition-colors ${
              textSize === "base"
                ? "bg-[#12356B] text-white border border-cyan-400"
                : "text-slate-300 hover:text-white hover:bg-white/10"
            }`}
            title="Default text size (A)"
            aria-pressed={textSize === "base"}
          >
            A
          </button>
          <button
            type="button"
            onClick={() => setTextSize("lg")}
            className={`px-1.5 py-0.5 rounded text-[11px] font-semibold transition-colors ${
              textSize === "lg"
                ? "bg-[#12356B] text-white border border-cyan-400"
                : "text-slate-300 hover:text-white hover:bg-white/10"
            }`}
            title="Large text size (A+)"
            aria-pressed={textSize === "lg"}
          >
            A+
          </button>
        </div>

        <span className="text-slate-500" aria-hidden="true">|</span>

        {/* Language Switcher */}
        <div className="flex items-center gap-1 text-[11px] font-medium" role="group" aria-label="Language selection">
          <button
            type="button"
            onClick={() => setLanguage("en")}
            className={`px-1.5 py-0.5 rounded transition-colors ${
              language === "en"
                ? "font-bold text-white underline underline-offset-2"
                : "text-slate-300 hover:text-white"
            }`}
            aria-pressed={language === "en"}
          >
            English
          </button>
          <span className="text-slate-500" aria-hidden="true">|</span>
          <button
            type="button"
            onClick={() => setLanguage("hi")}
            className={`px-1.5 py-0.5 rounded font-devanagari transition-colors ${
              language === "hi"
                ? "font-bold text-white underline underline-offset-2"
                : "text-slate-300 hover:text-white"
            }`}
            aria-pressed={language === "hi"}
          >
            हिन्दी
          </button>
        </div>
      </div>
    </div>
  );
}
