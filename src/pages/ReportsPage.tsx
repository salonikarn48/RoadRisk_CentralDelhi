import React, { useState } from "react";
import {
  Users,
  Camera,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ShieldAlert,
  FileCheck2,
  RefreshCw,
  Image as ImageIcon,
  Upload,
  Droplets,
  Clock,
  Sparkles,
} from "lucide-react";
import TopNavBar from "../components/TopNavBar";
import PortalBreadcrumbs from "../components/common/PortalBreadcrumbs";
import PortalNotice from "../components/common/PortalNotice";
import PortalFooter from "../components/common/PortalFooter";
import { FLOOD_HOTSPOTS } from "../data/floodHotspots";

export interface SubmittedReport {
  location: string;
  depth: string;
  roadClosed: boolean;
  description: string;
  status: "SAMPLE: PENDING" | "SAMPLE: VERIFIED";
  photoSample: string;
}

export default function ReportsPage() {
  const [location, setLocation] = useState<string>("Minto Bridge Railway Underpass");
  const [customStreet, setCustomStreet] = useState<string>("");
  const [waterDepth, setWaterDepth] = useState<string>("2 to 3 feet (Car axle submerged)");
  const [isPassable, setIsPassable] = useState<boolean>(false);
  const [description, setDescription] = useState<string>(
    "Underpass drain choked with silt. Water level rising fast; 2 cars stalled under bridge. Traffic backing up towards Connaught Place."
  );
  const [selectedPhoto, setSelectedPhoto] = useState<string>("minto_waterlogged.jpg");
  const [submittedReports, setSubmittedReports] = useState<SubmittedReport[]>([
    {
      location: "Minto Bridge Railway Underpass",
      depth: "3+ feet (Fully impassable)",
      roadClosed: true,
      description: "Severe waterlogging near Shivaji Bridge rail cut. Water depth past knee level.",
      status: "SAMPLE: VERIFIED",
      photoSample: "minto_waterlogged.jpg",
    },
    {
      location: "ITO Junction / Vikas Marg",
      depth: "1.5 feet (Slow crawl)",
      roadClosed: false,
      description: "Water stagnation in left two lanes towards Laxmi Nagar.",
      status: "SAMPLE: PENDING",
      photoSample: "ito_crossing.jpg",
    },
    {
      location: "Tilak Bridge Underpass",
      depth: "2 feet (Moderate stagnation)",
      roadClosed: false,
      description: "Debris accumulating in stormwater drain grating along railway retaining wall.",
      status: "SAMPLE: VERIFIED",
      photoSample: "tilak_inundation.jpg",
    },
  ]);
  const [hasJustSubmitted, setHasJustSubmitted] = useState<boolean>(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const resolvedLoc = customStreet.trim() ? customStreet.trim() : location;
    const newReport: SubmittedReport = {
      location: resolvedLoc,
      depth: waterDepth,
      roadClosed: !isPassable,
      description: description.trim() || "Water accumulation observed by resident.",
      status: "SAMPLE: PENDING",
      photoSample: selectedPhoto,
    };

    setSubmittedReports([newReport, ...submittedReports]);
    setHasJustSubmitted(true);
    setTimeout(() => setHasJustSubmitted(false), 3500);
  };

  return (
    <div className="flex flex-col min-h-screen w-full bg-[#F5F7FA] text-[#1B2430] font-sans">
      {/* Consistent Shared Top Navigation Bar */}
      <TopNavBar />

      <main className="flex-1 w-full max-w-[1440px] mx-auto px-4 sm:px-8 py-6 space-y-6">
        <PortalBreadcrumbs items={[{ label: "Resident Reporting" }]} />

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#D6DCE5] pb-4 bg-white p-5 rounded border shadow-xs">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#12356B]">
              Resident Reporting
            </h1>
            <p className="text-xs sm:text-sm text-[#4A5668] mt-1 font-medium">
              Crowdsourced citizen reporting channel for MCD / PWD monsoon response
            </p>
          </div>
          <span className="text-xs px-2.5 py-1 rounded bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A] font-semibold self-start sm:self-auto">
            Design Intake Channel
          </span>
        </div>

        <PortalNotice type="scenario" />

        {/* 2-Column Responsive Grid: Form on the Left, Pipeline Diagram & Logs on the Right */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-6 space-y-6">
            <form onSubmit={handleSubmit} className="p-5 rounded bg-white border border-[#D6DCE5] space-y-4 shadow-xs">
              <div className="flex items-center justify-between border-b border-[#D6DCE5] pb-3">
                <span className="text-xs font-semibold text-[#12356B] uppercase tracking-wider flex items-center gap-2">
                  <Droplets className="w-4 h-4 text-[#12356B]" />
                  <span>Submit Waterlogging Observation</span>
                </span>
                <span className="text-xs text-[#4A5668]">Citizen Form</span>
              </div>

              {/* Location selector */}
              <div className="space-y-2">
                <label className="text-[13px] text-[#0B2540] font-semibold flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-[#0369A1]" />
                  <span>Incident Location (Central Delhi):</span>
                </label>
                <select
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full bg-white border border-[#94A9BF] text-[#1E293B] text-[14px] rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-[#0369A1] focus:ring-1 focus:ring-[#0369A1] cursor-pointer shadow-2xs"
                >
                  {FLOOD_HOTSPOTS.map((h) => (
                    <option key={h.id || h.name} value={h.name}>
                      {h.name}
                    </option>
                  ))}
                  <option value="Custom Street / Intersection">-- Other Street / Colony Road --</option>
                </select>

                {location === "Custom Street / Intersection" && (
                  <input
                    type="text"
                    placeholder="Enter street name, colony or intersection..."
                    value={customStreet}
                    onChange={(e) => setCustomStreet(e.target.value)}
                    className="w-full mt-2 bg-white border border-[#94A9BF] text-[#1E293B] text-[14px] rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-[#0369A1] focus:ring-1 focus:ring-[#0369A1] shadow-2xs"
                  />
                )}
              </div>

              {/* Estimated Water Depth & Passability */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[13px] text-[#0B2540] font-semibold block">
                    Observed Water Depth:
                  </label>
                  <select
                    value={waterDepth}
                    onChange={(e) => setWaterDepth(e.target.value)}
                    className="w-full bg-white border border-[#94A9BF] text-[#1E293B] text-[13px] rounded-xl px-3 py-2.5 focus:outline-none focus:border-[#0369A1] focus:ring-1 focus:ring-[#0369A1] cursor-pointer shadow-2xs"
                  >
                    <option value="6 to 12 inches (Curb overtopping)">6 to 12 inches (Curb overtopping)</option>
                    <option value="1 to 2 feet (Knee level, small cars stuck)">1 to 2 feet (Knee level, small cars stuck)</option>
                    <option value="2 to 3 feet (Car axle submerged)">2 to 3 feet (Car axle submerged)</option>
                    <option value="3+ feet (Fully submerged / underpass blocked)">3+ feet (Fully submerged / blocked)</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[13px] text-[#0B2540] font-semibold block">
                    Vehicular Passability:
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setIsPassable(false)}
                      className={`py-2 px-3 rounded-xl text-[13px] font-bold border transition-colors cursor-pointer ${
                        !isPassable
                          ? "bg-[#FEE2E2] text-[#991B1B] border-[#FECACA] shadow-2xs"
                          : "bg-white border-[#CBD8E6] text-[#475569] hover:bg-[#EAF1F8]"
                      }`}
                    >
                      Impassable
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsPassable(true)}
                      className={`py-2 px-3 rounded-xl text-[13px] font-bold border transition-colors cursor-pointer ${
                        isPassable
                          ? "bg-[#FEF3C7] text-[#92400E] border-[#FDE68A] shadow-2xs"
                          : "bg-white border-[#CBD8E6] text-[#475569] hover:bg-[#EAF1F8]"
                      }`}
                    >
                      Crawling / 1 Lane
                    </button>
                  </div>
                </div>
              </div>

              {/* Photo Evidence Placeholder */}
              <div className="space-y-2">
                <label className="text-[13px] text-[#0B2540] font-semibold flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <ImageIcon className="w-4 h-4 text-[#0369A1]" />
                    <span>Geotagged Photo Evidence:</span>
                  </span>
                  <span className="text-[11px] text-[#475569]">EXIF Geolocation</span>
                </label>

                <div className="p-4 border-2 border-dashed border-[#CBD8E6] hover:border-[#0369A1] rounded-xl bg-[#EAF1F8]/50 text-center space-y-2 transition-colors cursor-pointer">
                  <div className="w-9 h-9 mx-auto rounded-full bg-[#E0F2FE] border border-[#CBD8E6] flex items-center justify-center text-[#0369A1]">
                    <Upload className="w-4 h-4" />
                  </div>
                  <div className="text-[13px] text-[#1E293B]">
                    Drag &amp; drop waterlogging photo or <span className="text-[#0369A1] font-semibold underline">browse device</span>
                  </div>
                  <div className="text-[12px] text-[#475569]">
                    Simulated upload: attaches GPS timestamp and visual flood gauge stamp
                  </div>

                  {/* Simulated photo options */}
                  <div className="flex flex-wrap justify-center gap-2 pt-1">
                    {[
                      { id: "minto_waterlogged.jpg", label: "Minto Bridge RUB (3.2 ft)" },
                      { id: "ito_crossing.jpg", label: "ITO Radial Slipway" },
                      { id: "tilak_inundation.jpg", label: "Tilak Underpass" },
                    ].map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setSelectedPhoto(p.id)}
                        className={`text-[12px] px-2.5 py-1 rounded-md border transition-colors cursor-pointer ${
                          selectedPhoto === p.id
                            ? "bg-[#E0F2FE] text-[#0369A1] border-[#0369A1] font-bold"
                            : "bg-white text-[#475569] border-[#CBD8E6] hover:bg-[#EAF1F8]"
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <label className="text-[13px] text-[#0B2540] font-semibold block">
                  Field Description &amp; Public Safety Impact:
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe water accumulation, stuck emergency vehicles, or choked stormwater drains..."
                  className="w-full bg-white border border-[#94A9BF] text-[#1E293B] text-[14px] rounded-xl p-3 focus:outline-none focus:border-[#0369A1] focus:ring-1 focus:ring-[#0369A1] resize-none leading-relaxed shadow-2xs"
                />
              </div>

              {/* Validated Before Use Note */}
              <div className="p-4 rounded-xl bg-[#DCFCE7] border border-[#BBF7D0] text-[13px] text-[#166534] leading-relaxed flex items-start gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-[#166534] shrink-0 mt-0.5" />
                <div>
                  <strong>Validated before use:</strong> All resident reports are quarantined in a pending review queue and verified by municipal engineers via field inspection or traffic CCTV cameras before being fed back into inputs.
                </div>
              </div>

              {/* Submit Button */}
              <div>
                <button
                  type="submit"
                  className="w-full py-3.5 px-4 rounded-xl bg-[#0369A1] hover:bg-[#075985] text-white font-bold text-[15px] flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
                >
                  <Upload className="w-4 h-4" />
                  <span>Submit report (mockup, not sent anywhere)</span>
                </button>
              </div>

              {hasJustSubmitted && (
                <div className="p-3 rounded-xl bg-[#DCFCE7] border border-[#BBF7D0] text-[#166534] text-[13px] text-center font-bold animate-pulse">
                  ✓ Report logged into Mockup Intake Ledger (Status: SAMPLE: PENDING)
                </div>
              )}
            </form>
          </div>

          {/* ========================================================
              RIGHT COLUMN: Pipeline Diagram & Recent Logs (~50%)
              ======================================================== */}
          <div className="lg:col-span-6 space-y-6">
            {/* 1. CONCEPT MOCKUP NOTICE */}
            <div className="p-4 rounded-2xl bg-[#FEF3C7] border border-[#FDE68A] text-[#92400E] text-[13px] space-y-1.5 shadow-sm">
              <div className="flex items-center gap-2 font-bold text-[13px] uppercase tracking-wider text-[#92400E]">
                <ShieldAlert className="w-4 h-4 text-[#92400E] shrink-0" />
                <span>Concept Mockup &bull; Not Connected to Simulation</span>
              </div>
              <p className="leading-relaxed">
                This intake interface is a design prototype illustrating how crowdsourced citizen hazard reports flow into municipal operations. Submissions here do <strong>not</strong> alter live simulation physics or topological link weights.
              </p>
            </div>

            {/* 2. OPERATIONAL DATA PIPELINE DIAGRAM */}
            <div className="p-6 rounded-2xl bg-white border border-[#CBD8E6] shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-[#CBD8E6] pb-3">
                <span className="text-[13px] font-bold uppercase tracking-wider text-[#0B2540] flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#0369A1]" />
                  <span>Operational Data Pipeline Diagram</span>
                </span>
                <span className="text-[12px] text-[#475569]">MCD Protocol</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center pt-1">
                {/* Step 1 */}
                <div className="p-3.5 rounded-xl bg-[#EAF1F8] border border-[#CBD8E6] space-y-2">
                  <div className="w-9 h-9 mx-auto rounded-full bg-[#E0F2FE] border border-[#CBD8E6] flex items-center justify-center text-[#0369A1]">
                    <Camera className="w-4 h-4" />
                  </div>
                  <div className="text-[14px] font-bold text-[#0B2540]">1. Citizen Reports</div>
                  <div className="text-[12px] text-[#475569] leading-relaxed">
                    Location, water depth &amp; photo tagged via mobile app
                  </div>
                </div>

                {/* Step 2 */}
                <div className="p-3.5 rounded-xl bg-[#EAF1F8] border border-[#CBD8E6] space-y-2">
                  <div className="w-9 h-9 mx-auto rounded-full bg-[#FEF3C7] border border-[#FDE68A] flex items-center justify-center text-[#92400E]">
                    <FileCheck2 className="w-4 h-4" />
                  </div>
                  <div className="text-[14px] font-bold text-[#0B2540]">2. Validation Gate</div>
                  <div className="text-[12px] text-[#92400E] leading-relaxed font-bold">
                    Verified by municipal engineers (planned) &amp; CCTV footage before use
                  </div>
                </div>

                {/* Step 3 */}
                <div className="p-3.5 rounded-xl bg-[#EAF1F8] border border-[#CBD8E6] space-y-2">
                  <div className="w-9 h-9 mx-auto rounded-full bg-[#DCFCE7] border border-[#BBF7D0] flex items-center justify-center text-[#166534]">
                    <RefreshCw className="w-4 h-4" />
                  </div>
                  <div className="text-[14px] font-bold text-[#0B2540]">3. Feed into Inputs</div>
                  <div className="text-[12px] text-[#475569] leading-relaxed">
                    Verified severances feed into road resilience cascade model
                  </div>
                </div>
              </div>

              <div className="text-center text-[13px] text-[#0369A1] font-bold pt-1">
                reports &rarr; validation &rarr; feed back into inputs
              </div>
            </div>

            {/* 3. SAMPLE ENTRIES (ILLUSTRATIVE) */}
            <div className="p-5 rounded bg-white border border-[#D6DCE5] shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-[#D6DCE5] pb-3">
                <span className="text-xs font-semibold text-[#12356B] uppercase tracking-wider flex items-center gap-2">
                  <Users className="w-4 h-4 text-[#12356B]" />
                  <span>Sample entries (illustrative) ({submittedReports.length})</span>
                </span>
                <span className="text-xs text-[#4A5668]">Intake Ledger</span>
              </div>

              <div className="space-y-3">
                {submittedReports.map((item, idx) => (
                  <div
                    key={`sample-report-${idx}`}
                    className="p-3.5 rounded bg-white border border-[#D6DCE5] hover:border-[#12356B] space-y-2 transition-colors shadow-2xs"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                      <div>
                        <div className="font-semibold text-[#12356B] text-xs">
                          <span className="truncate">{item.location}</span>
                        </div>
                        <div className="text-[11px] text-[#4A5668] mt-0.5">
                          Depth: <strong className="text-[#B26A00]">{item.depth}</strong>
                        </div>
                      </div>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded font-semibold uppercase shrink-0 border self-start ${
                          item.status === "SAMPLE: VERIFIED"
                            ? "bg-[#DCFCE7] text-[#166534] border-[#BBF7D0]"
                            : "bg-[#FEF3C7] text-[#92400E] border-[#FDE68A]"
                        }`}
                      >
                        {item.status}
                      </span>
                    </div>
                    <p className="text-xs text-[#1B2430] leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>

      <PortalFooter />
    </div>
  );
}
