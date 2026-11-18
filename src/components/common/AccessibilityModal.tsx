/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * RoadRisk Delhi - Accessibility Statement & Help Modal
 */

import React from "react";
import { X, CheckCircle2, Eye, Keyboard, Type } from "lucide-react";
import { usePortalTheme } from "../../context/PortalThemeContext";

export default function AccessibilityModal() {
  const { isAccessibilityModalOpen, setIsAccessibilityModalOpen } = usePortalTheme();

  if (!isAccessibilityModalOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="accessibility-title"
    >
      <div className="relative w-full max-w-lg bg-white rounded-lg shadow-xl border border-[#D6DCE5] overflow-hidden text-[#1B2430]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-[#12356B] text-white">
          <h3 id="accessibility-title" className="font-semibold text-base text-white">
            Accessibility Statement &amp; Options
          </h3>
          <button
            type="button"
            onClick={() => setIsAccessibilityModalOpen(false)}
            className="p-1 rounded text-white/80 hover:text-white hover:bg-white/10"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 text-sm text-[#1B2430] max-h-[75vh] overflow-y-auto leading-relaxed">
          <p>
            RoadRisk Delhi conforms to <strong>WCAG 2.1 Level AA</strong> standards to ensure that public-sector transport and emergency access insights are accessible to all citizens, municipal planners, and emergency responders.
          </p>

          <div className="space-y-3 pt-2">
            <div className="flex items-start gap-3 p-3 rounded bg-[#F0F4F8] border border-[#D6DCE5]">
              <Eye className="w-5 h-5 text-[#12356B] shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-xs text-[#12356B] uppercase tracking-wider">
                  Color Contrast &amp; Palette
                </h4>
                <p className="text-xs text-[#4A5668] mt-1">
                  All typography maintains minimum 4.5:1 contrast against surface backgrounds. Road risk metrics feature dual encoding (color and numerical score/text labels).
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded bg-[#F0F4F8] border border-[#D6DCE5]">
              <Keyboard className="w-5 h-5 text-[#12356B] shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-xs text-[#12356B] uppercase tracking-wider">
                  Keyboard Navigation &amp; Focus
                </h4>
                <p className="text-xs text-[#4A5668] mt-1">
                  Full keyboard navigation is supported across navigation links, form controls, and map interactions with high-visibility 2px focus outlines. A &ldquo;Skip to main content&rdquo; link is provided.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded bg-[#F0F4F8] border border-[#D6DCE5]">
              <Type className="w-5 h-5 text-[#12356B] shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-xs text-[#12356B] uppercase tracking-wider">
                  Text Scaling &amp; Hindi (Devanagari) Support
                </h4>
                <p className="text-xs text-[#4A5668] mt-1">
                  Text size can be toggled dynamically between Small (A-), Default (A), and Large (A+) via the top utility strip without breaking layout proportions. Full Devanagari script support is available for Hindi translations.
                </p>
              </div>
            </div>
          </div>

          <div className="pt-2 text-xs text-[#64748B] border-t border-[#D6DCE5]">
            For feedback or accessibility assistance, please contact the development team at{" "}
            <span className="font-semibold text-[#1B2430]">support@roadrisk-delhi.org</span>.
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-[#F0F4F8] border-t border-[#D6DCE5] flex justify-end">
          <button
            type="button"
            onClick={() => setIsAccessibilityModalOpen(false)}
            className="px-4 py-1.5 rounded bg-[#12356B] hover:bg-[#0D2850] text-white text-xs font-semibold"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
