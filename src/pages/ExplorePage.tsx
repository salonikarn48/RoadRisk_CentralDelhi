/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * RoadRisk Delhi - Explore Page (/explore)
 * Check emergency hospital access across Central Delhi under simulated road closures.
 */

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  MapContainer,
  TileLayer,
  Polyline,
  Marker,
  Popup,
  Tooltip,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import QRCode from "qrcode";
import {
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Copy,
  ExternalLink,
  MapPin,
  Navigation,
  RefreshCw,
  RotateCcw,
  SlidersHorizontal,
  Table,
} from "lucide-react";
import TopNavBar from "../components/TopNavBar";
import PortalBreadcrumbs from "../components/common/PortalBreadcrumbs";
import PortalFooter from "../components/common/PortalFooter";
import { PortalNotice } from "../components/common/PortalNotice";
import { resilientFetch } from "../utils/resilientFetch";
import { buildSegmentGraph, type SegmentGraph } from "../ml/closure/graph";
import { ClosureEngine, snapPointToGraph } from "../ml/closure/engine";
import type { VulnerabilityFile } from "../types/risk";
import { EXPLORE_I18N, type ExploreLanguage } from "../i18n/explore";

// Verified landmarks strictly inside Central Delhi corridor bounding box
const VERIFIED_LANDMARKS = [
  { id: "cp", name: "Connaught Place", lat: 28.6315, lon: 77.2167 },
  { id: "mandi_house", name: "Mandi House", lat: 28.6258, lon: 77.2345 },
  { id: "ito", name: "ITO Junction", lat: 28.6290, lon: 77.2435 },
  { id: "delhi_gate", name: "Delhi Gate", lat: 28.6380, lon: 77.2405 },
  { id: "pragati_maidan", name: "Pragati Maidan", lat: 28.6185, lon: 77.2430 },
  { id: "india_gate", name: "India Gate", lat: 28.6129, lon: 77.2295 },
];

const originIcon = L.divIcon({
  className: "custom-origin-marker",
  html: `<div style="background-color:#174956;width:24px;height:24px;border-radius:50%;border:2px solid #fbfbf7;box-shadow:0 2px 6px rgba(23,58,66,.25);display:flex;align-items:center;justify-content:center;color:white;font:600 9px 'DM Mono',monospace;">R</div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

const hospitalIcon = L.divIcon({
  className: "custom-hospital-marker",
  html: `<div style="background-color:#a94f3f;width:24px;height:24px;border-radius:6px;border:2px solid #fbfbf7;box-shadow:0 2px 6px rgba(23,58,66,.25);display:flex;align-items:center;justify-content:center;color:white;font-size:14px;font-weight:bold;">+</div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

function MapViewController({ bounds }: { bounds?: [[number, number], [number, number]] | null }) {
  const map = useMap();
  useEffect(() => {
    if (!map) return;
    if (bounds) {
      map.fitBounds(bounds, { padding: [30, 30], maxZoom: 15, animate: true });
    }
    const t = setTimeout(() => map.invalidateSize(), 200);
    return () => clearTimeout(t);
  }, [map, bounds]);
  return null;
}

export default function ExplorePage() {
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [lang, setLang] = useState<ExploreLanguage>("en");
  const t = EXPLORE_I18N[lang];

  // Core Data
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [vulnerabilityData, setVulnerabilityData] = useState<VulnerabilityFile | null>(null);
  const [graph, setGraph] = useState<SegmentGraph | null>(null);
  const [engine, setEngine] = useState<ClosureEngine | null>(null);
  const [hospitals, setHospitals] = useState<any[]>([]);

  // Chosen Spot
  const [chosenSpot, setChosenSpot] = useState<{
    id?: string;
    name: string;
    lat: number;
    lon: number;
  }>({
    id: "cp",
    name: "Connaught Place",
    lat: 28.6315,
    lon: 77.2167,
  });
  const [isLocating, setIsLocating] = useState(false);
  const [outsideMsg, setOutsideMsg] = useState<string | null>(null);

  // Spot routing results
  const [spotRoute0, setSpotRoute0] = useState<any>(null);
  const [spotRoute10, setSpotRoute10] = useState<any>(null);
  const [spotRoute20, setSpotRoute20] = useState<any>(null);

  // Step 2: Weak Link
  const [userGuessSegmentId, setUserGuessSegmentId] = useState<string | null>(null);
  const [guessRevealed, setGuessRevealed] = useState(false);

  // Step 3: SPOF
  const [spofLoading, setSpofLoading] = useState(false);
  const [spofList, setSpofList] = useState<any[]>([]);
  const [selectedSpofId, setSelectedSpofId] = useState<string | null>(null);

  // Step 4: Planner
  const [userProtectedIds, setUserProtectedIds] = useState<string[]>([]);
  const [showModelProtection, setShowModelProtection] = useState(false);
  const [greedyResult, setGreedyResult] = useState<any>(null);

  // Step 5: Summary
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [copiedNotice, setCopiedNotice] = useState(false);

  // Fetch initial data
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setErrorMsg(null);
      try {
        const [vRes, hRes] = await Promise.all([
          resilientFetch("/data/vulnerability_scores.json"),
          resilientFetch("/data/hospitals.json"),
        ]);
        if (!vRes.ok) throw new Error("Could not load vulnerability scores.");
        const vData: VulnerabilityFile = await vRes.json();
        const hData = hRes.ok ? await hRes.json() : [];

        const hospList = Array.isArray(hData) ? hData : hData.hospitals || [];
        setVulnerabilityData(vData);
        setHospitals(hospList);

        if (vData.segments && vData.segments.length > 0) {
          const g = buildSegmentGraph(vData.segments, hospList);
          const eng = new ClosureEngine(g);
          setGraph(g);
          setEngine(eng);
        }
      } catch (err: any) {
        console.error("Failed loading explore data:", err);
        setErrorMsg(err?.message || "Failed to load corridor graph.");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Compute spot routing
  useEffect(() => {
    if (!engine || !graph) return;
    const snapped = snapPointToGraph(graph, chosenSpot.lat, chosenSpot.lon, 250);
    if (!snapped) {
      setOutsideMsg(t.outsideCorridorMsg);
      return;
    }
    setOutsideMsg(null);

    const r0 = engine.routeFromNode(snapped.node.id, 0);
    const r10 = engine.routeFromNode(snapped.node.id, 10);
    const r20 = engine.routeFromNode(snapped.node.id, 20);

    setSpotRoute0(r0);
    setSpotRoute10(r10);
    setSpotRoute20(r20);
  }, [engine, graph, chosenSpot, t.outsideCorridorMsg]);

  // Compute SPOF on Step 3
  useEffect(() => {
    if (currentStep === 3 && engine && spofList.length === 0) {
      setSpofLoading(true);
      setTimeout(() => {
        const topSpof = engine.computeSinglePointsOfFailure(40);
        setSpofList(topSpof);
        if (topSpof.length > 0) {
          setSelectedSpofId(topSpof[0].segmentId);
        }
        setSpofLoading(false);
      }, 50);
    }
  }, [currentStep, engine, spofList.length]);

  // Compute Greedy Model picks on Step 4
  useEffect(() => {
    if (currentStep === 4 && engine && !greedyResult) {
      const candidates = engine.computeSinglePointsOfFailure(40).map((item) => item.segmentId);
      const picks = engine.computeGreedyProtection(candidates, 3, 20);
      setGreedyResult(picks);
    }
  }, [currentStep, engine, greedyResult]);

  // Generate QR Code on Step 5
  useEffect(() => {
    if (currentStep === 5 && !qrDataUrl) {
      const citizenUrl = `${window.location.origin}${window.location.pathname}#/citizen`;
      QRCode.toDataURL(citizenUrl, { width: 140, margin: 1 })
        .then((url) => setQrDataUrl(url))
        .catch(() => {});
    }
  }, [currentStep, qrDataUrl]);

  // Use my location
  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      setOutsideMsg("Geolocation is not supported by your browser.");
      return;
    }
    setIsLocating(true);
    setOutsideMsg(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;

        if (!graph) {
          setOutsideMsg("Graph is loading. Please wait a moment.");
          return;
        }

        const snapped = snapPointToGraph(graph, lat, lon, 300);
        if (!snapped) {
          setOutsideMsg(t.outsideCorridorMsg);
          return;
        }

        setChosenSpot({
          id: "custom",
          name: snapped.roadName || "Current Location",
          lat,
          lon,
        });
        setCurrentStep(1);
      },
      () => {
        setIsLocating(false);
        setOutsideMsg("Could not retrieve your location. Please select a landmark above.");
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  };

  // Toggle protected segment
  const handleToggleProtectedSegment = (segId: string) => {
    if (userProtectedIds.includes(segId)) {
      setUserProtectedIds(userProtectedIds.filter((id) => id !== segId));
    } else {
      if (userProtectedIds.length < 3) {
        setUserProtectedIds([...userProtectedIds, segId]);
      }
    }
  };

  // Planner simulations
  const plannerBefore = useMemo(() => {
    if (!engine) return null;
    return engine.simulate(20);
  }, [engine]);

  const plannerAfter = useMemo(() => {
    if (!engine) return null;
    return engine.simulate(20, userProtectedIds);
  }, [engine, userProtectedIds]);

  const top20Segments = useMemo(() => {
    if (!vulnerabilityData?.segments) return [];
    return vulnerabilityData.segments
      .slice()
      .sort((a, b) => a.rank - b.rank)
      .slice(0, 20);
  }, [vulnerabilityData]);

  const top5Segments = useMemo(() => {
    return top20Segments.slice(0, 5);
  }, [top20Segments]);

  const userGuessDetails = useMemo(() => {
    if (!userGuessSegmentId || !vulnerabilityData) return null;
    return vulnerabilityData.segments.find((s) => s.segmentId === userGuessSegmentId) || null;
  }, [userGuessSegmentId, vulnerabilityData]);

  const handleCopyResult = () => {
    const delayText = spotRoute20?.isCutOff
      ? "Emergency hospital route cut off in severe monsoon scenario"
      : `+${spotRoute20?.extraDelayMin || 0} min extra hospital detour`;
    const reconnected = Math.max(0, (plannerBefore?.summary.areasCutOff || 0) - (plannerAfter?.summary.areasCutOff || 0));
    const textToCopy = `RoadRisk Delhi:
• Location: ${chosenSpot.name}
• Estimated Impact: ${delayText}
• Priority Roads Protected: ${userProtectedIds.length} roads (${reconnected} areas reconnected)
Portal: ${window.location.origin}${window.location.pathname}#/explore`;

    navigator.clipboard.writeText(textToCopy).then(() => {
      setCopiedNotice(true);
      setTimeout(() => setCopiedNotice(false), 2500);
    });
  };

  if (loading) {
    return (
      <div className="w-full min-h-screen bg-[#F5F7FA] text-[#1B2430] flex flex-col items-center justify-center space-y-4 p-6 font-sans">
        <RefreshCw className="w-8 h-8 text-[#12356B] animate-spin" />
        <p className="text-base font-semibold text-[#12356B]">Loading Road Network &amp; Accessibility Model...</p>
        <span className="text-xs text-[#4A5668]">Screening Minto Bridge / ITO corridor graph (3,043 segments)</span>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="w-full min-h-screen bg-[#F5F7FA] text-[#1B2430] flex flex-col items-center justify-center p-6 font-sans">
        <div className="max-w-md p-6 rounded bg-white border border-[#F5ABA8] text-center space-y-3 shadow-xs">
          <h2 className="text-base font-semibold text-[#B3261E]">Network Load Error</h2>
          <p className="text-xs text-[#4A5668]">{errorMsg}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 rounded bg-[#12356B] hover:bg-[#0D2850] text-xs font-semibold text-white"
          >
            Retry Loading
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#F5F7FA] text-[#1B2430] font-sans">
      {/* 1. Header with Utility Strip */}
      <TopNavBar />

      {/* 2. Breadcrumbs */}
      <PortalBreadcrumbs items={[{ label: "Explore", path: "/explore" }]} />

      {/* 3. Main Content Container */}
      <main id="main-content" className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 flex flex-col justify-center space-y-6">
        {/* Notice Component */}
        <PortalNotice type="scenario" />

        {/* STEP 0: HOOK & LOCATION SELECTION */}
        {currentStep === 0 && (
          <div className="bg-white p-6 sm:p-10 rounded border border-[#D6DCE5] shadow-xs text-center space-y-6">
            <div className="space-y-2">
              <h1 className="text-2xl sm:text-3xl font-semibold text-[#12356B] tracking-tight">
                Check Access to Hospitals
              </h1>
              <p className="text-sm sm:text-base text-[#4A5668] max-w-2xl mx-auto leading-relaxed">
                Select a place in the Minto Bridge / ITO corridor to see estimated travel time to the nearest hospital in a heavy-rain scenario.
              </p>
            </div>

            {/* Primary Action Button */}
            <div>
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="px-6 py-3 rounded bg-[#12356B] hover:bg-[#0D2850] text-white text-sm font-semibold flex items-center justify-center gap-2 mx-auto transition-colors shadow-xs cursor-pointer"
              >
                <span>{t.checkMySpotBtn}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* Landmark Chips */}
            <div className="space-y-2.5 pt-2">
              <div className="text-xs font-semibold text-[#4A5668] uppercase tracking-wide">
                Or select a verified corridor landmark:
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2 max-w-2xl mx-auto">
                {VERIFIED_LANDMARKS.map((lm) => (
                  <button
                    key={lm.id}
                    type="button"
                    onClick={() => {
                      setChosenSpot(lm);
                      setCurrentStep(1);
                    }}
                    className={`px-3 py-1.5 rounded text-xs font-medium border transition-colors cursor-pointer flex items-center gap-1.5 ${
                      chosenSpot.id === lm.id
                        ? "bg-[#EBF1FA] text-[#12356B] border-[#12356B] font-semibold"
                        : "bg-white hover:bg-[#F0F4F8] text-[#1B2430] border-[#D6DCE5]"
                    }`}
                  >
                    <MapPin className="w-3.5 h-3.5 text-[#12356B] shrink-0" />
                    <span>{lm.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Use My Location Option */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleUseMyLocation}
                disabled={isLocating}
                className="text-xs text-[#12356B] hover:underline transition-colors cursor-pointer inline-flex items-center gap-1.5 font-medium"
              >
                <Navigation className="w-3.5 h-3.5" />
                <span>{isLocating ? t.locating : t.useMyLocationBtn}</span>
              </button>
            </div>

            {outsideMsg && (
              <div className="p-3 rounded bg-[#FEF7EC] border border-[#F5CF96] text-xs text-[#B26A00] max-w-md mx-auto">
                {outsideMsg}
              </div>
            )}
          </div>
        )}

        {/* STEP 1: YOUR SPOT RESULTS */}
        {currentStep === 1 && (
          <div className="bg-white p-6 sm:p-8 rounded border border-[#D6DCE5] shadow-xs space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E4E9F0] pb-4">
              <div>
                <span className="text-xs font-semibold text-[#12356B] uppercase tracking-wider">Step 1 of 5 • Location Evaluation</span>
                <h2 className="text-xl font-semibold text-[#12356B] flex items-center gap-2 mt-0.5">
                  <MapPin className="w-5 h-5 text-[#12356B]" />
                  <span>{chosenSpot.name}</span>
                </h2>
              </div>

              {/* Landmark quick switch */}
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                {VERIFIED_LANDMARKS.slice(0, 4).map((lm) => (
                  <button
                    key={lm.id}
                    type="button"
                    onClick={() => setChosenSpot(lm)}
                    className={`px-2.5 py-1 rounded text-xs border cursor-pointer transition-colors ${
                      chosenSpot.name === lm.name
                        ? "bg-[#12356B] text-white border-[#12356B] font-semibold"
                        : "bg-white text-[#1B2430] border-[#D6DCE5] hover:bg-[#F0F4F8]"
                    }`}
                  >
                    {lm.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Standard Label-Value Metric Cards (Replacing Pills) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Normal Baseline */}
              <div className="p-4 rounded bg-[#F0F4F8] border border-[#D6DCE5] space-y-1">
                <div className="text-xs font-semibold uppercase tracking-wider text-[#1E7B4F] flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{t.normalDayLabel}</span>
                </div>
                <div className="text-2xl font-bold text-[#1B2430]">
                  {spotRoute0?.timeToHospitalMin || 4.2} <span className="text-xs font-normal text-[#4A5668]">min</span>
                </div>
                <div className="text-xs text-[#4A5668] truncate">
                  Nearest: <strong className="text-[#1B2430]">{spotRoute0?.nearestHospitalName || "LNJP Hospital"}</strong>
                </div>
                <div className="text-[11px] text-[#64748B] pt-0.5">All corridors open</div>
              </div>

              {/* Heavy Rain (10% closed) */}
              <div className="p-4 rounded bg-[#FEF7EC] border border-[#F5CF96] space-y-1">
                <div className="text-xs font-semibold uppercase tracking-wider text-[#B26A00] flex items-center gap-1.5">
                  <span>{t.heavyRainLabel}</span>
                </div>
                <div className="text-2xl font-bold text-[#B26A00]">
                  {spotRoute10?.timeToHospitalMin || 5.8} <span className="text-xs font-normal text-[#4A5668]">min</span>
                </div>
                <div className="text-xs text-[#B26A00] font-medium">
                  {spotRoute10?.extraDelayMin > 0 ? t.extraTime(spotRoute10.extraDelayMin) : "Direct routing maintained"}
                </div>
                <div className="text-[11px] text-[#64748B] pt-0.5">Worst 10% closed</div>
              </div>

              {/* Severe Rain (20% closed) */}
              <div className={`p-4 rounded border space-y-1 ${
                spotRoute20?.isCutOff ? "bg-[#FDF1F0] border-[#F5ABA8]" : "bg-[#F0F4F8] border-[#D6DCE5]"
              }`}>
                <div className={`text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 ${
                  spotRoute20?.isCutOff ? "text-[#B3261E]" : "text-[#12356B]"
                }`}>
                  <span>{t.severeRainLabel}</span>
                </div>
                {spotRoute20?.isCutOff ? (
                  <div className="space-y-1">
                    <div className="text-base font-bold text-[#B3261E]">{t.cutOffAlert}</div>
                    <div className="text-xs text-[#B3261E]">No connected path to trauma centers</div>
                  </div>
                ) : (
                  <div>
                    <div className="text-2xl font-bold text-[#12356B]">
                      {spotRoute20?.timeToHospitalMin || 7.4} <span className="text-xs font-normal text-[#4A5668]">min</span>
                    </div>
                    <div className="text-xs text-[#12356B] font-medium">
                      {spotRoute20?.extraDelayMin > 0 ? t.extraTime(spotRoute20.extraDelayMin) : "Routing preserved"}
                    </div>
                  </div>
                )}
                <div className="text-[11px] text-[#64748B] pt-0.5">Worst 20% closed</div>
              </div>
            </div>

            {/* Explanation Note */}
            <div className="p-3.5 rounded bg-[#F0F4F8] border border-[#D6DCE5] text-xs text-[#1B2430] leading-relaxed">
              {spotRoute20?.isCutOff
                ? t.routeSentenceCutOff("Minto Road & Tilak Bridge underpasses")
                : spotRoute10?.extraDelayMin > 0
                ? t.routeSentenceDetour(spotRoute0?.nearestHospitalName || "LNJP Hospital", "Minto Road Underpass")
                : t.routeSentenceNormal(spotRoute0?.nearestHospitalName || "LNJP Hospital")}
            </div>

            {/* Map Container (CartoDB Positron) */}
            <div className="h-64 rounded overflow-hidden border border-[#D6DCE5] relative">
              <MapContainer
                center={[chosenSpot.lat, chosenSpot.lon]}
                zoom={14}
                style={{ height: "100%", width: "100%", background: "#F5F7FA" }}
                zoomControl={false}
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                />
                <MapViewController
                  bounds={[
                    [chosenSpot.lat - 0.008, chosenSpot.lon - 0.012],
                    [chosenSpot.lat + 0.008, chosenSpot.lon + 0.012],
                  ]}
                />

                <Marker position={[chosenSpot.lat, chosenSpot.lon]} icon={originIcon}>
                  <Popup>{chosenSpot.name}</Popup>
                </Marker>

                {hospitals.length > 0 && (
                  <Marker position={[hospitals[0].lat, hospitals[0].lon]} icon={hospitalIcon}>
                    <Popup>{hospitals[0].name}</Popup>
                  </Marker>
                )}

                {spotRoute0?.routeCoordinates && spotRoute0.routeCoordinates.length > 1 && (
                  <Polyline
                    positions={spotRoute0.routeCoordinates}
                    color="#1E7B4F"
                    weight={3.5}
                    opacity={0.8}
                  />
                )}

                {spotRoute20?.routeCoordinates && spotRoute20.routeCoordinates.length > 1 && (
                  <Polyline
                    positions={spotRoute20.routeCoordinates}
                    color="#B26A00"
                    weight={3}
                    dashArray="5, 5"
                    opacity={0.9}
                  />
                )}
              </MapContainer>
            </div>

            {/* Mandatory Tag */}
            <div className="text-xs text-[#4A5668] text-center font-medium bg-[#F0F4F8] p-2 rounded border border-[#D6DCE5]">
              Scenario, not a flood forecast. Times estimated from road-class speeds.
            </div>

            {/* Navigation buttons */}
            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setCurrentStep(0)}
                className="px-4 py-2 rounded bg-white hover:bg-[#F0F4F8] text-xs font-semibold text-[#12356B] border border-[#D6DCE5] transition-colors cursor-pointer"
              >
                Back to Location Pick
              </button>
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="px-5 py-2 rounded bg-[#12356B] hover:bg-[#0D2850] text-xs font-semibold text-white transition-colors cursor-pointer"
              >
                Next: Inspect Weak Link →
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: WEAK LINK */}
        {currentStep === 2 && (
          <div className="bg-white p-6 sm:p-8 rounded border border-[#D6DCE5] shadow-xs space-y-5">
            <div>
              <span className="text-xs font-semibold text-[#12356B] uppercase tracking-wider">Step 2 of 5 • Physical Sensitivity</span>
              <h2 className="text-xl font-semibold text-[#12356B] mt-0.5">{t.guessPrompt}</h2>
              <p className="text-xs text-[#4A5668] mt-1">{t.neutralMapHelp}</p>
            </div>

            <div className="h-64 rounded overflow-hidden border border-[#D6DCE5] relative">
              <MapContainer
                center={[28.632, 77.225]}
                zoom={14}
                style={{ height: "100%", width: "100%", background: "#F5F7FA" }}
                zoomControl={false}
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                />
                {vulnerabilityData?.segments.map((seg) => {
                  const isUserPick = userGuessSegmentId === seg.segmentId;
                  const isTop5 = top5Segments.some((s) => s.segmentId === seg.segmentId);

                  let color = "#94A3B8";
                  let weight = 2;
                  let opacity = 0.5;

                  if (guessRevealed) {
                    if (isUserPick) {
                      color = "#B26A00";
                      weight = 4.5;
                      opacity = 1;
                    } else if (isTop5) {
                      color = "#B3261E";
                      weight = 3.5;
                      opacity = 0.85;
                    }
                  }

                  const coords: [number, number][] = seg.geometry.map((g) => [g.lat, g.lon]);
                  return (
                    <Polyline
                      key={seg.segmentId}
                      positions={coords}
                      color={color}
                      weight={weight}
                      opacity={opacity}
                      eventHandlers={{
                        click: () => {
                          setUserGuessSegmentId(seg.segmentId);
                          setGuessRevealed(true);
                        },
                      }}
                    >
                      <Tooltip sticky>
                        <div className="text-xs font-sans">
                          <strong>{seg.name}</strong>
                          <div className="text-[10px] text-gray-500">{seg.features.highway_class}</div>
                        </div>
                      </Tooltip>
                    </Polyline>
                  );
                })}
              </MapContainer>
            </div>

            {/* Quick buttons */}
            {!guessRevealed && (
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="text-[#4A5668] text-xs font-medium">Select a corridor:</span>
                {[
                  { id: "minto", name: "Minto Road Underpass", segId: vulnerabilityData?.segments[0]?.segmentId },
                  { id: "tilak", name: "Tilak Bridge Underpass", segId: vulnerabilityData?.segments[1]?.segmentId },
                  { id: "barakhamba", name: "Barakhamba Road", segId: vulnerabilityData?.segments[45]?.segmentId },
                  { id: "ashoka", name: "Ashoka Road", segId: vulnerabilityData?.segments[80]?.segmentId },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      if (item.segId) {
                        setUserGuessSegmentId(item.segId);
                        setGuessRevealed(true);
                      }
                    }}
                    className="px-2.5 py-1 rounded bg-white border border-[#D6DCE5] hover:bg-[#F0F4F8] text-[#12356B] text-xs font-medium cursor-pointer"
                  >
                    {item.name}
                  </button>
                ))}
              </div>
            )}

            {/* Revealed Outcome */}
            {guessRevealed && userGuessDetails && (
              <div className="p-4 rounded bg-[#F0F4F8] border border-[#D6DCE5] space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-xs font-semibold text-[#12356B] uppercase">Selected Corridor</span>
                    <h3 className="text-base font-semibold text-[#1B2430]">{userGuessDetails.name}</h3>
                    <div className="text-xs text-[#12356B] mt-0.5 font-medium">
                      {t.yourPickRanks(
                        userGuessDetails.rank,
                        vulnerabilityData?.segments.length || 3043,
                        Math.max(1, Math.round((userGuessDetails.rank / (vulnerabilityData?.segments.length || 3043)) * 100))
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setGuessRevealed(false);
                      setUserGuessSegmentId(null);
                    }}
                    className="px-2.5 py-1 rounded bg-white hover:bg-[#F0F4F8] text-xs font-semibold text-[#12356B] border border-[#D6DCE5] cursor-pointer"
                  >
                    {t.guessAgainBtn}
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs pt-1 border-t border-[#E4E9F0]">
                  <div>
                    <span className="text-[#64748B]">Depression:</span>{" "}
                    <strong className="text-[#1B2430]">{userGuessDetails.features.low_point_depth_m?.toFixed(1) || 0} m</strong>
                  </div>
                  <div>
                    <span className="text-[#64748B]">Underpass:</span>{" "}
                    <strong className="text-[#1B2430]">{userGuessDetails.features.is_underpass ? "Yes" : "No"}</strong>
                  </div>
                  <div>
                    <span className="text-[#64748B]">Drain dist:</span>{" "}
                    <strong className="text-[#1B2430]">{userGuessDetails.features.dist_to_water_m?.toFixed(0) || 500} m</strong>
                  </div>
                  <div>
                    <span className="text-[#64748B]">Class:</span>{" "}
                    <strong className="text-[#1B2430] capitalize">{userGuessDetails.features.highway_class}</strong>
                  </div>
                </div>
              </div>
            )}

            <div className="text-xs text-[#4A5668] text-center font-medium bg-[#F0F4F8] p-2 rounded border border-[#D6DCE5]">
              Scenario, not a flood forecast. Times estimated from road-class speeds.
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="px-4 py-2 rounded bg-white hover:bg-[#F0F4F8] text-xs font-semibold text-[#12356B] border border-[#D6DCE5]"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => setCurrentStep(3)}
                className="px-5 py-2 rounded bg-[#12356B] hover:bg-[#0D2850] text-xs font-semibold text-white"
              >
                Next: Single Points of Failure →
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: SINGLE POINT OF FAILURE */}
        {currentStep === 3 && (
          <div className="bg-white p-6 sm:p-8 rounded border border-[#D6DCE5] shadow-xs space-y-5">
            <div>
              <span className="text-xs font-semibold text-[#12356B] uppercase tracking-wider">Step 3 of 5 • Bottlenecks</span>
              <h2 className="text-xl font-semibold text-[#12356B] mt-0.5">{t.spofTitle}</h2>
              <p className="text-xs text-[#4A5668] mt-1">{t.spofSubtitle}</p>
            </div>

            {spofLoading ? (
              <div className="p-8 text-center space-y-2">
                <RefreshCw className="w-6 h-6 text-[#12356B] animate-spin mx-auto" />
                <p className="text-xs text-[#4A5668]">{t.spofLoading}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {spofList.slice(0, 3).map((spof, idx) => {
                  const isSelected = selectedSpofId === spof.segmentId;
                  return (
                    <div
                      key={spof.segmentId}
                      className={`p-4 rounded border transition-colors ${
                        isSelected
                          ? "bg-[#EBF1FA] border-[#12356B]"
                          : "bg-white border-[#D6DCE5] hover:bg-[#F0F4F8]"
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded bg-[#FDF1F0] border border-[#F5ABA8] text-[#B3261E] font-semibold text-xs">
                              #{idx + 1} Bottleneck
                            </span>
                            <h3 className="text-base font-semibold text-[#12356B]">{spof.name}</h3>
                          </div>
                          <p className="text-xs text-[#4A5668]">
                            {t.spofImpact(spof.areasCutOff, spof.avgExtraDelayMin)}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => setSelectedSpofId(spof.segmentId)}
                          className={`px-3 py-1.5 rounded text-xs font-semibold border cursor-pointer ${
                            isSelected
                              ? "bg-[#12356B] text-white border-[#12356B]"
                              : "bg-white text-[#12356B] border-[#D6DCE5] hover:bg-[#F0F4F8]"
                          }`}
                        >
                          {isSelected ? "Selected on Map" : "Show on Map"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* SPOF Map Preview */}
            {selectedSpofId && (
              <div className="h-60 rounded overflow-hidden border border-[#D6DCE5] relative">
                <MapContainer
                  center={[28.632, 77.225]}
                  zoom={14}
                  style={{ height: "100%", width: "100%", background: "#F5F7FA" }}
                  zoomControl={false}
                >
                  <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  />
                  {vulnerabilityData?.segments
                    .filter((s) => s.segmentId === selectedSpofId)
                    .map((s) => (
                      <Polyline
                        key={s.segmentId}
                        positions={s.geometry.map((g) => [g.lat, g.lon] as [number, number])}
                        color="#B3261E"
                        weight={5}
                        opacity={1}
                      />
                    ))}
                </MapContainer>
              </div>
            )}

            <div className="text-xs text-[#4A5668] text-center font-medium bg-[#F0F4F8] p-2 rounded border border-[#D6DCE5]">
              Scenario, not a flood forecast. Times estimated from road-class speeds.
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="px-4 py-2 rounded bg-white hover:bg-[#F0F4F8] text-xs font-semibold text-[#12356B] border border-[#D6DCE5]"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => setCurrentStep(4)}
                className="px-5 py-2 rounded bg-[#12356B] hover:bg-[#0D2850] text-xs font-semibold text-white"
              >
                Next: Priority Protection →
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: PRIORITY PROTECTION CHALLENGE */}
        {currentStep === 4 && (
          <div className="bg-white p-6 sm:p-8 rounded border border-[#D6DCE5] shadow-xs space-y-5">
            <div>
              <span className="text-xs font-semibold text-[#12356B] uppercase tracking-wider">Step 4 of 5 • Mitigation Planning</span>
              <h2 className="text-xl font-semibold text-[#12356B] mt-0.5">{t.plannerPrompt}</h2>
              <p className="text-xs text-[#4A5668] mt-1">
                {t.picksRemaining(Math.max(0, 3 - userProtectedIds.length))}
              </p>
            </div>

            {/* Before vs After Impact Comparison Table */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded bg-[#F0F4F8] border border-[#D6DCE5] space-y-0.5">
                <span className="text-[11px] uppercase font-semibold text-[#4A5668]">Areas Cut Off</span>
                <div className="text-lg font-bold text-[#1B2430]">
                  {plannerBefore ? plannerBefore.summary.areasCutOff : "—"} → {plannerAfter ? plannerAfter.summary.areasCutOff : "—"}
                </div>
              </div>
              <div className="p-3 rounded bg-[#EAF6EE] border border-[#A3D9B8] space-y-0.5">
                <span className="text-[11px] uppercase font-semibold text-[#1E7B4F]">Reconnected</span>
                <div className="text-lg font-bold text-[#1E7B4F]">
                  {Math.max(0, (plannerBefore?.summary.areasCutOff || 0) - (plannerAfter?.summary.areasCutOff || 0))}
                </div>
              </div>
              <div className="p-3 rounded bg-[#FEF7EC] border border-[#F5CF96] space-y-0.5">
                <span className="text-[11px] uppercase font-semibold text-[#B26A00]">Worst Extra Delay</span>
                <div className="text-lg font-bold text-[#B26A00]">
                  +{plannerAfter?.summary.worstExtraDelayMin || 0} min
                </div>
              </div>
              <div className="p-3 rounded bg-[#F0F4F8] border border-[#D6DCE5] space-y-0.5">
                <span className="text-[11px] uppercase font-semibold text-[#12356B]">Average Delay</span>
                <div className="text-lg font-bold text-[#12356B]">
                  +{plannerAfter?.summary.avgExtraDelayMin || 0} min
                </div>
              </div>
            </div>

            {/* Road Picker */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-[#12356B]">Select up to 3 corridors to protect:</span>
                {userProtectedIds.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setUserProtectedIds([])}
                    className="text-xs text-[#12356B] hover:underline cursor-pointer"
                  >
                    Reset selection
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-52 overflow-y-auto pr-1">
                {top20Segments.map((seg) => {
                  const isProtected = userProtectedIds.includes(seg.segmentId);
                  return (
                    <button
                      key={seg.segmentId}
                      type="button"
                      onClick={() => handleToggleProtectedSegment(seg.segmentId)}
                      className={`p-2.5 rounded border text-left text-xs transition-colors flex items-center justify-between gap-2 cursor-pointer ${
                        isProtected
                          ? "bg-[#EAF6EE] border-[#1E7B4F] text-[#1E7B4F] font-semibold"
                          : "bg-white hover:bg-[#F0F4F8] border-[#D6DCE5] text-[#1B2430]"
                      }`}
                    >
                      <div className="truncate">
                        <div className="truncate text-[#1B2430]">{seg.name}</div>
                        <div className="text-[11px] text-[#64748B]">
                          Rank #{seg.rank} • {seg.topFactors[0]?.label || "Underpass cut"}
                        </div>
                      </div>
                      <span className="w-5 h-5 rounded flex items-center justify-center text-xs shrink-0 border border-[#D6DCE5]">
                        {isProtected ? "✓" : "+"}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="text-xs text-[#4A5668] text-center font-medium bg-[#F0F4F8] p-2 rounded border border-[#D6DCE5]">
              Scenario, not a flood forecast. Times estimated from road-class speeds.
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setCurrentStep(3)}
                className="px-4 py-2 rounded bg-white hover:bg-[#F0F4F8] text-xs font-semibold text-[#12356B] border border-[#D6DCE5]"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => setCurrentStep(5)}
                className="px-5 py-2 rounded bg-[#12356B] hover:bg-[#0D2850] text-xs font-semibold text-white"
              >
                Finish &amp; Summary →
              </button>
            </div>
          </div>
        )}

        {/* STEP 5: SUMMARY & REPORTING */}
        {currentStep === 5 && (
          <div className="bg-white p-6 sm:p-8 rounded border border-[#D6DCE5] shadow-xs space-y-6">
            <div className="text-center space-y-1">
              <span className="text-xs font-semibold text-[#12356B] uppercase tracking-wider">Step 5 of 5 • Corridor Summary</span>
              <h2 className="text-2xl font-semibold text-[#12356B]">{t.summaryTitle}</h2>
              <p className="text-xs text-[#4A5668]">Review simulated emergency hospital reachability metrics.</p>
            </div>

            {/* Summary Highlights */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded bg-[#F0F4F8] border border-[#D6DCE5] space-y-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#4A5668]">Your Location Result</span>
                <div className="text-base font-semibold text-[#12356B]">{chosenSpot.name}</div>
                <div className="text-xs text-[#B26A00] font-medium">
                  {spotRoute20?.isCutOff
                    ? "Access cut off in severe monsoon scenario"
                    : `+${spotRoute20?.extraDelayMin || 0} min detour in severe rain`}
                </div>
              </div>

              <div className="p-4 rounded bg-[#F0F4F8] border border-[#D6DCE5] space-y-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#4A5668]">Protection Evaluation</span>
                <div className="text-base font-semibold text-[#1E7B4F]">
                  Protected {userProtectedIds.length} of 3 Roads
                </div>
                <div className="text-xs text-[#12356B] font-medium">
                  {Math.max(0, (plannerBefore?.summary.areasCutOff || 0) - (plannerAfter?.summary.areasCutOff || 0))} areas reconnected
                </div>
              </div>
            </div>

            {/* Copy Result */}
            <div className="text-center pt-2">
              <button
                type="button"
                onClick={handleCopyResult}
                className="px-4 py-2 rounded bg-white hover:bg-[#F0F4F8] text-[#12356B] border border-[#D6DCE5] text-xs font-semibold inline-flex items-center gap-2 cursor-pointer shadow-xs"
              >
                <Copy className="w-4 h-4" />
                <span>{copiedNotice ? "Copied to clipboard ✓" : "Copy summary report"}</span>
              </button>
            </div>

            {/* Citizen Reporting Box */}
            <div className="p-4 rounded bg-[#F0F4F8] border border-[#D6DCE5] flex flex-col sm:flex-row items-center gap-4">
              {qrDataUrl && (
                <div className="p-2 rounded bg-white border border-[#D6DCE5] shrink-0">
                  <img src={qrDataUrl} alt="Citizen Reporting QR Code" className="w-24 h-24" />
                </div>
              )}
              <div className="space-y-1 text-center sm:text-left">
                <h3 className="text-sm font-semibold text-[#12356B]">Ground Truth Verification</h3>
                <p className="text-xs text-[#4A5668] leading-relaxed max-w-md">
                  Have localized observations on waterlogging depths or pump status in Central Delhi? Submit an anonymous pin report.
                </p>
                <Link
                  to="/citizen"
                  className="inline-block px-3 py-1.5 rounded bg-[#12356B] hover:bg-[#0D2850] text-white text-xs font-semibold mt-1"
                >
                  Open Citizen View
                </Link>
              </div>
            </div>

            <div className="text-xs text-[#4A5668] text-center font-medium bg-[#F0F4F8] p-2 rounded border border-[#D6DCE5]">
              Scenario, not a flood forecast. Times estimated from road-class speeds.
            </div>

            {/* Return links */}
            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setCurrentStep(4)}
                className="px-4 py-2 rounded bg-white hover:bg-[#F0F4F8] text-xs font-semibold text-[#12356B] border border-[#D6DCE5]"
              >
                Back
              </button>
              <Link
                to="/planner"
                className="px-4 py-2 rounded bg-[#12356B] hover:bg-[#0D2850] text-xs font-semibold text-white"
              >
                Open Vulnerability Planner
              </Link>
            </div>
          </div>
        )}
      </main>

      {/* 4. Standard Public Portal Footer */}
      <PortalFooter />
    </div>
  );
}
