/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * RoadRisk Delhi - Citizen Report Waterlogging Card
 * Public-sector accessible input styling with privacy disclosure.
 */

import React, { useState } from "react";
import {
  Droplets,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  Send,
  Shield,
  RotateCcw,
  PhoneCall,
} from "lucide-react";
import type { CitizenStrings } from "../../i18n/citizen";
import type { AllowedSeverity } from "../../server/reports";

interface ReportWaterloggingCardProps {
  t: CitizenStrings;
  currentCoords: [number, number];
  locationLabel: string;
  onReportSubmitted?: () => void;
}

export default function ReportWaterloggingCard({
  t,
  currentCoords,
  locationLabel,
  onReportSubmitted,
}: ReportWaterloggingCardProps) {
  const [severity, setSeverity] = useState<AllowedSeverity>("knee_deep");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError(null);

    try {
      const payload = {
        lat: currentCoords[0],
        lon: currentCoords[1],
        severity,
      };

      const res = await fetch("/rr-api/reports", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Failed to submit pin report");
      }

      setSubmitted(true);
      if (onReportSubmitted) {
        onReportSubmitted();
      }
    } catch (err: any) {
      console.warn("Report submission failed:", err);
      setSubmitError(err?.message || t.reportErrorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setSubmitted(false);
    setSubmitError(null);
  };

  return (
    <article className="bg-white border border-[#D6DCE5] rounded p-4 shadow-xs space-y-3.5 text-[#1B2430]">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 border-b border-[#E4E9F0] pb-2.5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded bg-[#EBF1FA] border border-[#A5BEDB] flex items-center justify-center text-[#12356B]">
            <Droplets className="w-4 h-4 text-[#12356B]" />
          </div>
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#12356B] block">
              {t.reportCardTitle}
            </h3>
            <span className="text-[11px] text-[#4A5668] flex items-center gap-1 font-medium">
              <Shield className="w-3 h-3 text-[#12356B]" />
              <span>{t.reportPrivacyBadge}</span>
            </span>
          </div>
        </div>
      </div>

      {submitted ? (
        /* CONFIRMATION SCREEN */
        <div className="bg-[#EAF6EE] border border-[#A3D9B8] rounded p-4 text-[#1E7B4F] space-y-3">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-[#1E7B4F] shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="text-sm font-semibold text-[#1E7B4F]">
                {t.reportConfirmedTitle}
              </h4>
              <p className="text-xs text-[#4A5668] leading-relaxed">
                {t.reportConfirmedMessage}
              </p>
            </div>
          </div>

          <div className="pt-2 border-t border-[#A3D9B8] flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={handleReset}
              className="min-h-[44px] px-3.5 py-1.5 rounded bg-white hover:bg-[#F0F4F8] text-[#12356B] text-xs font-semibold border border-[#D6DCE5] transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{t.submitAnotherReport}</span>
            </button>

            <a
              href="tel:112"
              className="min-h-[44px] px-3 py-1.5 rounded bg-[#B3261E] hover:bg-[#8F1D17] text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <PhoneCall className="w-3 h-3 fill-white" />
              <span>112</span>
            </a>
          </div>
        </div>
      ) : (
        /* REPORT FORM */
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* Location Pin Confirmation Box */}
          <div className="bg-[#F0F4F8] border border-[#D6DCE5] rounded p-2.5 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <MapPin className="w-4 h-4 text-[#12356B] shrink-0" />
              <div className="min-w-0">
                <span className="text-[10px] text-[#4A5668] font-semibold uppercase block leading-none">
                  Pin Location
                </span>
                <span className="text-xs font-medium text-[#1B2430] truncate block mt-0.5">
                  {locationLabel}
                </span>
              </div>
            </div>
            <span className="text-[11px] font-mono text-[#4A5668] bg-white px-2 py-0.5 rounded border border-[#D6DCE5] shrink-0">
              {currentCoords[0].toFixed(3)}, {currentCoords[1].toFixed(3)}
            </span>
          </div>

          {/* Severity Radio Buttons */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#1B2430] block">
              {t.reportSeverityPrompt}
            </label>
            <div className="grid grid-cols-1 gap-2">
              {/* Option 1: Ankle-deep */}
              <button
                type="button"
                onClick={() => setSeverity("ankle_deep")}
                className={`min-h-[46px] p-2.5 rounded border text-left flex items-center justify-between transition-colors cursor-pointer ${
                  severity === "ankle_deep"
                    ? "bg-[#EBF1FA] border-[#12356B] text-[#12356B]"
                    : "bg-[#F8FAFC] border-[#D6DCE5] text-[#1B2430] hover:bg-[#F0F4F8]"
                }`}
              >
                <div>
                  <span className="text-xs font-semibold block">{t.severityAnkle}</span>
                  <span className="text-[11px] text-[#4A5668]">{t.severityAnkleDesc}</span>
                </div>
                <div
                  className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                    severity === "ankle_deep"
                      ? "border-[#12356B] bg-[#12356B]"
                      : "border-[#94A3B8]"
                  }`}
                >
                  {severity === "ankle_deep" && (
                    <div className="w-1.5 h-1.5 rounded-full bg-white" />
                  )}
                </div>
              </button>

              {/* Option 2: Knee-deep */}
              <button
                type="button"
                onClick={() => setSeverity("knee_deep")}
                className={`min-h-[46px] p-2.5 rounded border text-left flex items-center justify-between transition-colors cursor-pointer ${
                  severity === "knee_deep"
                    ? "bg-[#FEF7EC] border-[#B26A00] text-[#B26A00]"
                    : "bg-[#F8FAFC] border-[#D6DCE5] text-[#1B2430] hover:bg-[#F0F4F8]"
                }`}
              >
                <div>
                  <span className="text-xs font-semibold block text-[#B26A00]">
                    {t.severityKnee}
                  </span>
                  <span className="text-[11px] text-[#4A5668]">{t.severityKneeDesc}</span>
                </div>
                <div
                  className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                    severity === "knee_deep"
                      ? "border-[#B26A00] bg-[#B26A00]"
                      : "border-[#94A3B8]"
                  }`}
                >
                  {severity === "knee_deep" && (
                    <div className="w-1.5 h-1.5 rounded-full bg-white" />
                  )}
                </div>
              </button>

              {/* Option 3: Road Impassable */}
              <button
                type="button"
                onClick={() => setSeverity("impassable")}
                className={`min-h-[46px] p-2.5 rounded border text-left flex items-center justify-between transition-colors cursor-pointer ${
                  severity === "impassable"
                    ? "bg-[#FDF1F0] border-[#B3261E] text-[#B3261E]"
                    : "bg-[#F8FAFC] border-[#D6DCE5] text-[#1B2430] hover:bg-[#F0F4F8]"
                }`}
              >
                <div>
                  <span className="text-xs font-semibold block text-[#B3261E]">
                    {t.severityImpassable}
                  </span>
                  <span className="text-[11px] text-[#4A5668]">
                    {t.severityImpassableDesc}
                  </span>
                </div>
                <div
                  className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                    severity === "impassable"
                      ? "border-[#B3261E] bg-[#B3261E]"
                      : "border-[#94A3B8]"
                  }`}
                >
                  {severity === "impassable" && (
                    <div className="w-1.5 h-1.5 rounded-full bg-white" />
                  )}
                </div>
              </button>
            </div>
          </div>

          {/* Privacy Note */}
          <p className="text-[11px] text-[#64748B] leading-relaxed">
            {t.reportPrivacyNote}
          </p>

          {/* Error notice */}
          {submitError && (
            <div className="bg-[#FDF1F0] border border-[#F5ABA8] text-[#B3261E] text-xs p-2.5 rounded flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-[#B3261E] shrink-0" />
              <span>{submitError}</span>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full min-h-[46px] rounded bg-[#12356B] hover:bg-[#0D2850] text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
            <span>{submitting ? t.submitting : t.submitReportButton}</span>
          </button>
        </form>
      )}
    </article>
  );
}
