/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { Link, useLocation } from "react-router-dom";
import { useAppState } from "../context/AppStateContext";
import PortalUtilityStrip from "./common/PortalUtilityStrip";

export default function TopNavBar() {
  const location = useLocation();
  const { currentZone, activeScenario } = useAppState();
  const navLinks = [
    { name: "Overview", path: "/dashboard" },
    { name: "Planner", path: "/planner" },
    { name: "Explore", path: "/explore" },
    { name: "Citizen view", path: "/citizen" },
    { name: "Reliability", path: "/reliability" },
    { name: "Data & methods", path: "/assumptions" },
  ];

  return (
    <div className="rr-header w-full shrink-0 select-none z-40">
      <PortalUtilityStrip />
      <header className="rr-brand-header w-full">
        <div className="rr-header-inner max-w-[1440px] mx-auto px-4 sm:px-6 min-h-[72px] flex items-center justify-between gap-4">
          <Link to="/" className="rr-wordmark flex items-center gap-3 text-left" aria-label="RoadRisk Delhi home">
            <span className="rr-brand-symbol" aria-hidden="true">
              <span />
              <span />
              <span />
            </span>
            <span className="flex flex-col">
              <span className="rr-brand-name">RoadRisk <b>Delhi</b></span>
              <span className="rr-brand-caption">Monsoon access intelligence <i>/</i> {currentZone?.isDefault ? "Central Delhi pilot" : currentZone?.name || "Pilot zone"}</span>
            </span>
          </Link>
          <div className="rr-header-status hidden sm:flex items-center gap-2">
            <span className="rr-live-dot" />
            <span>Decision support</span>
            {activeScenario && activeScenario.hotspotIds.length > 0 && (
              <>
                <span className="rr-header-divider" />
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#EBF1FA] text-[#12356B] border border-[#A5BEDB] flex items-center gap-1">
                  <span>Using dashboard scenario:</span>
                  <b>{activeScenario.label || `${activeScenario.hotspotIds.length === 1 ? "1 hotspot" : `${activeScenario.hotspotIds.length} hotspots`}, ${activeScenario.rainfallLevel ? activeScenario.rainfallLevel.charAt(0).toUpperCase() + activeScenario.rainfallLevel.slice(1) : "Extreme"} rain`}</b>
                </span>
              </>
            )}
            <span className="rr-header-divider" />
            <Link to="/select-area" className="rr-area-link">Change area <span aria-hidden="true">↗</span></Link>
          </div>
          <Link to="/select-area" className="rr-mobile-area sm:hidden" aria-label="Change analysis area">Area</Link>
        </div>
        <div className="rr-nav-wrap">
          <div className="max-w-[1440px] mx-auto px-3 sm:px-6">
            <nav className="rr-main-nav flex items-center overflow-x-auto no-scrollbar" aria-label="Main Navigation">
              {navLinks.map((link) => {
                const isActive =
                  location.pathname === link.path ||
                  (link.path === "/citizen" && location.pathname === "/reports") ||
                  (link.path === "/assumptions" && ["/preflight", "/live-feed", "/best-fixes"].includes(location.pathname));
                return (
                  <Link
                    key={link.path}
                    to={link.path}
                    className={`rr-nav-link ${isActive ? "is-active" : ""}`}
                    aria-current={isActive ? "page" : undefined}
                  >
                    {link.name}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      </header>
    </div>
  );
}
