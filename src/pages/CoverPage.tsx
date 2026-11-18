/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * RoadRisk Delhi public portal cover.
 */

import React from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  Building2,
  CircleDot,
  CloudRain,
  FileText,
  Map,
  Route,
  ShieldCheck,
} from "lucide-react";
import TopNavBar from "../components/TopNavBar";
import PortalFooter from "../components/common/PortalFooter";
import { PortalNotice } from "../components/common/PortalNotice";
import { useAppState } from "../context/AppStateContext";

const modules = [
  {
    index: "01",
    title: "See the weak links",
    description: "Rank road segments by physical susceptibility, then inspect the underpasses and low points that drive the score.",
    path: "/planner",
    label: "Open vulnerability planner",
    icon: Map,
    tone: "teal",
  },
  {
    index: "02",
    title: "Keep care within reach",
    description: "Compare hospital travel time as corridors fail, with route-level consequences across the pilot network.",
    path: "/explore",
    label: "Check hospital access",
    icon: Building2,
    tone: "clay",
  },
  {
    index: "03",
    title: "Plan the response",
    description: "Test closure scenarios, identify disconnected origins, and see where targeted protection can restore access.",
    path: "/dashboard",
    label: "Open scenario dashboard",
    icon: Route,
    tone: "moss",
  },
];

export default function CoverPage() {
  const navigate = useNavigate();
  const { currentZone, handleRunDemoScenario } = useAppState();

  const handleDemoClick = (event: React.MouseEvent) => {
    event.preventDefault();
    handleRunDemoScenario();
    navigate("/dashboard");
  };

  return (
    <div className="rr-cover min-h-screen flex flex-col">
      <TopNavBar />
      <main id="main-content" className="rr-cover-main flex-1 w-full">
        <div className="rr-cover-notices">
          <PortalNotice type="pilot" />
          <PortalNotice type="scenario" />
        </div>

        <section className="rr-hero">
          <div className="rr-hero-copy">
            <div className="rr-eyebrow"><span className="rr-eyebrow-line" /> DELHI / MONSOON READINESS / PILOT 01</div>
            <h1>When the rain comes,<br /><em>every road matters.</em></h1>
            <p className="rr-hero-deck">
              Understand which corridors may fail, how detours affect emergency care, and where a small intervention can make the biggest difference.
            </p>
            <div className="rr-hero-actions">
              <Link to="/dashboard" className="rr-button-primary">
                Enter the scenario room <ArrowRight size={17} />
              </Link>
              <Link to="/citizen" className="rr-button-secondary">Resident access check <ArrowUpRight size={16} /></Link>
            </div>
            <button type="button" onClick={handleDemoClick} className="rr-demo-link">
              <span className="rr-demo-marker" /> Load monsoon demonstration
            </button>
          </div>
          <div className="rr-hero-map" aria-label="Illustrated Central Delhi road network">
            <div className="rr-map-label rr-map-label-top"><span>28°37'48"N</span><span>77°13'28"E</span></div>
            <div className="rr-map-grid" />
            <svg className="rr-map-drawing" viewBox="0 0 680 520" role="img" aria-label="Road lines through a flood-risk corridor">
              <path className="rr-map-water" d="M476 -25 C428 49 508 102 449 165 C403 214 460 277 407 330 C359 378 433 438 368 545" />
              <path className="rr-map-road road-a" d="M20 122 C118 155 145 88 236 121 S370 198 498 156 S619 98 704 121" />
              <path className="rr-map-road road-b" d="M28 270 C109 245 169 303 247 278 S354 224 427 268 S563 342 692 295" />
              <path className="rr-map-road road-c" d="M99 -20 C113 75 201 100 188 180 S120 303 177 378 S257 452 244 540" />
              <path className="rr-map-road road-d" d="M305 -20 C267 71 328 127 301 201 S280 334 334 395 S405 472 401 540" />
              <path className="rr-map-road road-e" d="M584 -20 C543 58 573 129 541 196 S494 303 535 373 S583 466 570 540" />
              <path className="rr-map-road road-f" d="M-20 404 C74 367 151 425 231 402 S384 365 463 410 S584 468 700 430" />
              <path className="rr-map-road road-g" d="M-12 45 C68 88 127 184 212 190 S384 177 469 222 S602 267 701 238" />
              <path className="rr-map-road road-h" d="M17 490 C76 417 119 375 117 300 S76 156 104 80" />
              <path className="rr-map-route" d="M93 353 C181 333 222 305 280 286 S389 281 460 216 S536 145 602 150" />
              <g className="rr-map-pin pin-a"><circle r="16" /><circle r="5" /></g>
              <g className="rr-map-pin pin-b"><circle r="13" /><circle r="4" /></g>
              <g className="rr-map-hospital" transform="translate(600 151)"><circle r="16" /><path d="M0 -7v14M-7 0h14" /></g>
              <g className="rr-map-hotspot"><circle cx="280" cy="286" r="23" /><circle cx="280" cy="286" r="8" /></g>
              <text x="90" y="342">MINTO BRIDGE</text>
              <text x="411" y="191">ITO CORRIDOR</text>
              <text x="535" y="124">CARE ACCESS</text>
              <text x="62" y="454">CENTRAL DELHI</text>
            </svg>
            <div className="rr-map-legend">
              <span><i className="legend-route" /> Route under review</span>
              <span><i className="legend-risk" /> Susceptibility point</span>
              <span><i className="legend-care">+</i> Trauma facility</span>
            </div>
            <div className="rr-map-caption"><span className="rr-caption-kicker">FOCUS AREA</span><strong>Minto Bridge <b>—</b> ITO</strong><small>Central Delhi corridor</small></div>
          </div>
          <div className="rr-hero-index">01 <span>/</span> 04</div>
        </section>

        <section className="rr-baseline" aria-label="Pilot network baseline">
          <div className="rr-baseline-intro">
            <span className="rr-section-index">THE PILOT / 2025</span>
            <h2>A corridor, closely read.</h2>
            <p>Baseline coverage for the Central Delhi demonstration area.</p>
          </div>
          <div className="rr-stat"><strong>1,720</strong><span>road corridors</span><small>OpenStreetMap network</small></div>
          <div className="rr-stat"><strong>3,043</strong><span>analyzed segments</span><small>Terrain-informed cuts</small></div>
          <div className="rr-stat"><strong>08</strong><span>trauma hospitals</span><small>Emergency facilities</small></div>
          <div className="rr-stat"><strong>09</strong><span>listed hotspots (demo data)</span><small>Historic flood points</small></div>
          <span className="rr-baseline-zone"><CircleDot size={13} /> {currentZone.name}</span>
        </section>

        <section className="rr-modules">
          <div className="rr-section-heading">
            <div><span className="rr-section-index">FROM SIGNAL TO RESPONSE</span><h2>One corridor. Three ways to act.</h2></div>
            <Link to="/select-area" className="rr-text-link">Choose another area <ArrowUpRight size={15} /></Link>
          </div>
          <div className="rr-module-list">
            {modules.map(({ index, title, description, path, label, icon: Icon, tone }) => (
              <article key={index} className={`rr-module rr-module-${tone}`}>
                <span className="rr-module-index">{index}</span>
                <div className="rr-module-icon"><Icon size={21} strokeWidth={1.7} /></div>
                <div className="rr-module-copy"><h3>{title}</h3><p>{description}</p></div>
                <Link to={path} className="rr-module-link" aria-label={label}><ArrowUpRight size={20} /></Link>
                <Link to={path} className="rr-module-label">{label}</Link>
              </article>
            ))}
          </div>
        </section>

        <section className="rr-method-band">
          <div className="rr-method-icon"><ShieldCheck size={23} /></div>
          <div className="rr-method-copy">
            <span className="rr-section-index">BUILT FOR TRANSPARENT DECISIONS</span>
            <h2>Show the evidence. State the uncertainty.</h2>
            <p>Risk scores are screening signals, not flood forecasts. Explore source data, assumptions, and model reliability before acting.</p>
          </div>
          <div className="rr-method-links">
            <Link to="/reliability">Reliability analysis <ArrowRight size={15} /></Link>
            <Link to="/assumptions">Data and assumptions <ArrowRight size={15} /></Link>
            <Link to="/preflight">System data status <ArrowRight size={15} /></Link>
          </div>
        </section>

        <section className="rr-footnotes">
          <div className="rr-footnote"><CloudRain size={17} /><p><b>Scenario, not forecast.</b> Rainfall and closure runs describe modeled conditions, not live predictions.</p></div>
          <div className="rr-footnote"><Activity size={17} /><p><b>Designed for preparedness.</b> Use the analysis to support planning, not emergency dispatch.</p></div>
          <Link to="/reports" className="rr-report-link"><FileText size={16} /> Browse resident reports <ArrowUpRight size={14} /></Link>
        </section>
      </main>
      <PortalFooter />
    </div>
  );
}
