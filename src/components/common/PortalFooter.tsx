/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * RoadRisk Delhi - Standard Public Portal Footer
 * Complete public sector decision-support footer with data sources,
 * metadata timestamp, method summary, four disclaimers, and required links.
 */

import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { usePortalTheme } from "../../context/PortalThemeContext";
import { resilientFetch } from "../../utils/resilientFetch";

interface SnapshotSummary {
  generatedAt: string;
  roadCount: number;
  segmentCount: number;
  corridor: string;
}

export default function PortalFooter() {
  const { setIsAccessibilityModalOpen } = usePortalTheme();
  const [snapshotMeta, setSnapshotMeta] = useState<SnapshotSummary>({
    generatedAt: "",
    roadCount: 0,
    segmentCount: 0,
    corridor: "Minto Bridge / ITO corridor, Central Delhi",
  });

  useEffect(() => {
    let isMounted = true;
    resilientFetch("/data/snapshot/snapshot-meta.json")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && isMounted) {
          setSnapshotMeta({
            generatedAt: data.generatedAt || "",
            roadCount: data.counts?.roads || 0,
            segmentCount: data.counts?.segments || 0,
            corridor: data.corridor || "Central Delhi",
          });
        }
      })
      .catch(() => {
        // Fallback to initial state
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const hasCounts = snapshotMeta.roadCount > 0 && snapshotMeta.segmentCount > 0;
  const formattedDate = !snapshotMeta.generatedAt ? "not available (live data in use)" : new Date(snapshotMeta.generatedAt).toLocaleDateString("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <footer className="w-full bg-[#FFFFFF] border-t border-[#D6DCE5] text-[#4A5668] text-xs pt-8 pb-12 px-4 sm:px-8 mt-auto select-none">
      <div className="max-w-[1440px] mx-auto space-y-6">
        {/* Top Footer Grid: 3 columns */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pb-6 border-b border-[#E4E9F0]">
          {/* Col 1: Portal Identity & Scope */}
          <div className="space-y-2">
            <h4 className="font-semibold text-sm text-[#12356B]">
              RoadRisk Delhi Decision-Support Portal
            </h4>
            <p className="leading-relaxed text-[#4A5668]">
              A public-sector spatial vulnerability tool evaluating road inundation susceptibility and emergency hospital access across Central Delhi under monsoon rainfall scenarios.
            </p>
            <div className="text-[11px] text-[#64748B] pt-1">
              Active pilot scope: <span className="font-medium text-[#1B2430]">{snapshotMeta.corridor}</span> {hasCounts ? ` (${snapshotMeta.roadCount.toLocaleString()} roads, ${snapshotMeta.segmentCount.toLocaleString()} segments)` : ""}.
            </div>
          </div>

          {/* Col 2: Data Sources & Snapshot Timestamp */}
          <div className="space-y-2">
            <h4 className="font-semibold text-sm text-[#12356B]">
              Data Sources &amp; Offline Baseline
            </h4>
            <ul className="space-y-1 text-[#4A5668]">
              <li>• OpenStreetMap (OSM) road vectors &amp; hospital nodes</li>
              <li>• SRTM 30m Digital Elevation Model (NASA / USGS)</li>
              <li>• Listed hotspot points (demo data, not surveyed) &amp; OpenStreetMap water features</li>
              <li>• Travel times: estimated from road-class speeds, not real trip data</li>
            </ul>
            <div className="text-[11px] text-[#1B2430] font-medium pt-1">
              Snapshot generated: {formattedDate}
            </div>
          </div>

          {/* Col 3: Portal Navigation & Governance Links */}
          <div className="space-y-2">
            <h4 className="font-semibold text-sm text-[#12356B]">
              Verification &amp; Governance
            </h4>
            <nav className="flex flex-col space-y-1.5" aria-label="Footer links">
              <Link to="/reliability" className="text-[#12356B] hover:underline font-medium">
                Model Reliability &amp; Statistical Validation
              </Link>
              <Link to="/assumptions" className="text-[#12356B] hover:underline font-medium">
                Data Sources, Methods &amp; Hydrology Assumptions
              </Link>
              <Link to="/preflight" className="text-[#12356B] hover:underline font-medium">
                Data Pipeline Health &amp; Preflight Status
              </Link>
              <button
                type="button"
                onClick={() => setIsAccessibilityModalOpen(true)}
                className="text-left text-[#12356B] hover:underline font-medium cursor-pointer"
              >
                Accessibility Statement (WCAG AA &amp; Hindi)
              </button>
            </nav>
          </div>
        </div>

        {/* 4 Standard Public Portal Disclaimers */}
        <div className="bg-[#F0F4F8] p-4 rounded border border-[#D6DCE5] space-y-2 text-[11px] leading-relaxed text-[#4A5668]">
          <div className="font-semibold text-[#12356B] text-xs uppercase tracking-wider">
            Operational Disclaimers &amp; Transparency Notice
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            <div>
              <strong className="text-[#1B2430]">1. Pilot Area Scope:</strong> Analysis is strictly calibrated for the Central Delhi corridor (Minto Bridge, Connaught Place, ITO, Tilak Bridge). Peripheral regions lack localized elevation ground-truthing.
            </div>
            <div>
              <strong className="text-[#1B2430]">2. Scenario, Not a Flood Forecast:</strong> Road closures and routing delays reflect topological network vulnerability under simulated stress, not real-time hydrometeorological radar predictions.
            </div>
            <div>
              <strong className="text-[#1B2430]">3. Tool Informs, Humans Decide:</strong> This portal is designed for municipal pre-monsoon prioritization and planning advisory. Operational dispatch and safety closures remain the prerogative of emergency command authorities.
            </div>
            <div>
              <strong className="text-[#1B2430]">4. Baseline Heuristics:</strong> Topographical and drainage metrics are generated from public spatial data; field conditions may vary due to localized pump operation or structural drainage maintenance.
            </div>
          </div>
        </div>

        {/* Bottom Attribution Line */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-2 text-[11px] text-[#64748B]">
          <div>
            RoadRisk Delhi Project Team • Prototype developed for Build for Bharat 2026.
          </div>
          <div className="flex items-center gap-4">
            <span>Non-commercial civic decision-support</span>
            <span>•</span>
            <span>Open Data under ODbL / Open Database License</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
