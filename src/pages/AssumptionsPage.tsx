import React from "react";
import {
  Info,
  Activity,
  Droplets,
  DollarSign,
  Cpu,
  CloudRain,
  Clock,
  ShieldCheck,
} from "lucide-react";
import TopNavBar from "../components/TopNavBar";
import PortalBreadcrumbs from "../components/common/PortalBreadcrumbs";
import PortalNotice from "../components/common/PortalNotice";
import PortalFooter from "../components/common/PortalFooter";
import { BPR_CONFIG } from "../simulation/traffic";
import { COST_DISCLAIMER } from "../data/fixCosts";

export default function AssumptionsPage() {
  const assumptions = [
    {
      id: "synthetic-demand",
      title: "1. Synthetic Demand (Illustrative)",
      icon: <Activity className="w-5 h-5 text-[#12356B]" />,
      badge: "GRAVITY MODEL",
      badgeColor: "bg-[#F0F4F8] text-[#12356B] border-[#D6DCE5]",
      summary: "Trip generation between 12 Central Delhi centroid intersection hubs",
      description:
        "Demand is synthetically modeled via a spatial gravity formulation (T_ij = K * (Mass_i * Mass_j) / (d_ij + 0.25)^1.5) connecting key CBD nodes (Connaught Place radials, Minto Bridge, ITO, Tilak Bridge, Delhi Gate, Mandi House). It reflects structural urban trip distributions without real-time GPS probe telemetry or census microdata.",
    },
    {
      id: "demo-hotspots",
      title: "2. Demo Hotspots (Public Lists)",
      icon: <Droplets className="w-5 h-5 text-[#12356B]" />,
      badge: "PWD / TRAFFIC POLICE",
      badgeColor: "bg-[#F0F4F8] text-[#12356B] border-[#D6DCE5]",
      summary: "Illustrative locations based on published municipal waterlogging registries",
      description:
        "Hotspots (e.g. Minto Bridge Underpass, ITO Crossing, Tilak Bridge RUB, Delhi Gate) are derived from public Delhi Traffic Police annual monsoon advisories and PWD vulnerable underpass registers. Coordinates and nominal radiuses (240m–320m) are illustrative planning heuristics, not hydraulic site surveys.",
    },
    {
      id: "indicative-costs",
      title: "3. Indicative Fix Costs (CPWD / DSR)",
      icon: <DollarSign className="w-5 h-5 text-[#1E7B4F]" />,
      badge: "CPWD / DSR RATES",
      badgeColor: "bg-[#DCFCE7] text-[#166534] border-[#BBF7D0]",
      summary: `${COST_DISCLAIMER}`,
      description:
        "Costs for Quick fixes (high-power 3,000–5,000 GPM dewatering pumps & automated diversion barriers at ₹0.7–₹1.8 Cr, 8–18 days delivery) and Capital works (micro-tunneling storm culverts, sump deepening at ₹3.9–₹8.5 Cr, 5–10 months delivery) are indicative planning benchmarks calibrated to CPWD Delhi Schedule of Rates, not formal contractor tenders.",
    },
    {
      id: "bpr-parameters",
      title: "4. BPR Congestion Function Parameters",
      icon: <Cpu className="w-5 h-5 text-[#12356B]" />,
      badge: `α = ${BPR_CONFIG.ALPHA}, β = ${BPR_CONFIG.BETA}`,
      badgeColor: "bg-[#F0F4F8] text-[#12356B] border-[#D6DCE5]",
      summary: "Iterative Dijkstra with Bureau of Public Roads delay formulation",
      description:
        `Travel time on each road link follows the standard BPR curve: t = t_0 * (1 + 0.15 * (V / C)^4), where V is assigned vehicular volume and C is OSM-derived lane capacity. Flows are solved using Method of Successive Averages (4 MSA iterations) with a numerical stability cap of 8.0x free-flow time to represent severe gridlock.`,
    },
    {
      id: "rainfall-multipliers",
      title: "5. Rainfall Radius Multipliers",
      icon: <CloudRain className="w-5 h-5 text-[#12356B]" />,
      badge: "HEURISTIC SCALING",
      badgeColor: "bg-[#F0F4F8] text-[#12356B] border-[#D6DCE5]",
      summary: "Moderate (40%), Heavy (70%), Extreme (100% of listed hotspot radius (demo data))",
      description:
        "Rainfall intensity scales the geometric flood intersection radius: Moderate rainfall activates 40% of radius (low-depression collection); Heavy rainfall activates 70% (underpass sump breach); Extreme rainfall activates 100% (severe cloudburst spillover onto feeder radials). This is an operational heuristic, not IMD Doppler radar telemetry.",
    },
    {
      id: "golden-hour",
      title: "6. Golden Hour = 30 Minutes",
      icon: <Clock className="w-5 h-5 text-[#B3261E]" />,
      badge: "THRESHOLD: 30 MIN",
      badgeColor: "bg-[#FEE2E2] text-[#991B1B] border-[#FECACA]",
      summary: "Emergency transit window from demand centroids to tertiary trauma facilities",
      description:
        "Emergency healthcare reachability evaluates congested travel time from 12 zone origins to the nearest tertiary trauma center (LNJP, GB Pant, RML Hospital, Lady Hardinge, Northern Railway Hospital). Trips under 15 min are classified as Safe, 15–30 min as Delayed, and trips exceeding 30 min (or severed) trigger a critical Golden Hour Breach alarm.",
    },
  ];

  return (
    <div className="relative w-full min-h-screen bg-[#F5F7FA] text-[#1B2430] flex flex-col justify-between overflow-x-hidden font-sans">
      <TopNavBar />

      <main className="flex-1 w-full max-w-[1440px] mx-auto px-4 sm:px-8 py-6 space-y-6">
        <PortalBreadcrumbs items={[{ label: "Model Assumptions" }]} />

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#D6DCE5] pb-4 bg-white p-5 rounded border shadow-xs">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#12356B]">
              Model Assumptions &amp; Methodology
            </h1>
            <p className="text-xs sm:text-sm text-[#4A5668] mt-1 font-medium">
              Scientific parameters, algorithmic formulations, and data benchmarks
            </p>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="text-xs px-2.5 py-1 rounded bg-[#F0F4F8] text-[#12356B] border border-[#D6DCE5] font-semibold flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-[#1E7B4F]" />
              <span>Calibrated Heuristics</span>
            </span>
          </div>
        </div>

        <PortalNotice type="scenario" />

        {/* Informational Summary Callout */}
        <div className="p-4 rounded bg-white border border-[#D6DCE5] shadow-xs flex items-start gap-3">
          <Info className="w-5 h-5 text-[#12356B] shrink-0 mt-0.5" />
          <p className="text-xs sm:text-sm text-[#4A5668] leading-relaxed">
            RoadRisk Delhi synthesizes open geospatial infrastructure from OpenStreetMap, public municipal waterlogging advisories from the Public Works Department (PWD) and Delhi Traffic Police, and classical transportation equilibrium modeling (Bureau of Public Roads delay curves). All simulation outputs are intended for pre-monsoon priority screening and operational stress-testing.
          </p>
        </div>

        {/* Two-Column Responsive Grid of Assumption Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
          {assumptions.map((item) => (
            <div
              key={item.id}
              className="p-5 rounded bg-white border border-[#D6DCE5] shadow-xs hover:border-[#12356B] transition-colors space-y-3 flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded bg-[#F0F4F8] border border-[#D6DCE5] flex items-center justify-center shrink-0">
                      {item.icon}
                    </div>
                    <h2 className="text-base font-semibold text-[#12356B] leading-snug">
                      {item.title}
                    </h2>
                  </div>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded font-semibold uppercase tracking-wider shrink-0 border ${item.badgeColor}`}
                  >
                    {item.badge}
                  </span>
                </div>

                <div className="text-xs font-semibold text-[#12356B] bg-[#F0F4F8] border border-[#D6DCE5] px-3 py-1.5 rounded">
                  {item.summary}
                </div>

                <p className="text-xs text-[#4A5668] leading-relaxed">
                  {item.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </main>

      <PortalFooter />
    </div>
  );
}
