/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * RoadRisk Delhi - Citizen View Page (/citizen)
 * Public-sector citizen interface for checking emergency hospital access
 * and reporting localized waterlogging pins.
 */

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, RefreshCw, PhoneCall } from "lucide-react";
import ErrorBoundary from "../components/common/ErrorBoundary";
import TopNavBar from "../components/TopNavBar";
import PortalBreadcrumbs from "../components/common/PortalBreadcrumbs";
import PortalFooter from "../components/common/PortalFooter";
import { PortalNotice } from "../components/common/PortalNotice";
import CitizenLocationPicker from "../components/citizen/CitizenLocationPicker";
import CitizenScenarioSelector, { CitizenScenarioOption } from "../components/citizen/CitizenScenarioSelector";
import NearestHospitalCard from "../components/citizen/NearestHospitalCard";
import RouteHospitalCard from "../components/citizen/RouteHospitalCard";
import ReportWaterloggingCard from "../components/citizen/ReportWaterloggingCard";
import {
  CITIZEN_I18N,
  type CitizenLanguage,
  getSavedCitizenLanguage,
  saveCitizenLanguage,
} from "../i18n/citizen";
import {
  ClosureEngine,
  snapPointToGraph,
} from "../ml/closure/engine";
import { buildSegmentGraph, type SegmentGraph } from "../ml/closure/graph";
import type { VulnerabilityFile } from "../types/risk";
import { resilientFetch } from "../utils/resilientFetch";

export default function CitizenPage() {
  const [lang, setLang] = useState<CitizenLanguage>(getSavedCitizenLanguage);
  const t = CITIZEN_I18N[lang];

  const handleToggleLang = () => {
    const nextLang: CitizenLanguage = lang === "en" ? "hi" : "en";
    setLang(nextLang);
    saveCitizenLanguage(nextLang);
  };

  // Data Loading states
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [vulnerabilityData, setVulnerabilityData] = useState<VulnerabilityFile | null>(null);
  const [hospitals, setHospitals] = useState<any[]>([]);

  // Simulation & Graph State
  const [closureEngine, setClosureEngine] = useState<ClosureEngine | null>(null);
  const [graph, setGraph] = useState<SegmentGraph | null>(null);

  // User Selection State
  const [scenarioPercent, setScenarioPercent] = useState<CitizenScenarioOption>(0);
  const [selectedOriginId, setSelectedOriginId] = useState<string | null>(null);
  const [userCustomCoords, setUserCustomCoords] = useState<[number, number] | null>(null);
  const [userCustomLabel, setUserCustomLabel] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [outsideNotice, setOutsideNotice] = useState(false);

  // Fetch core vulnerability and hospitals data once
  const loadCitizenData = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const vRes = await resilientFetch("/rr-api/vulnerability");
      if (!vRes.ok) throw new Error(`HTTP ${vRes.status} loading /rr-api/vulnerability`);
      const vData: VulnerabilityFile = await vRes.json();
      setVulnerabilityData(vData);

      const hRes = await resilientFetch("/rr-api/hospitals");
      let hospList: any[] = [];
      if (hRes.ok) {
        const hData = await hRes.json();
        if (Array.isArray(hData.hospitals)) hospList = hData.hospitals;
      }
      setHospitals(hospList);

      const segmentGraph = buildSegmentGraph(vData.segments, hospList);
      const engine = new ClosureEngine(segmentGraph);

      setGraph(segmentGraph);
      setClosureEngine(engine);

      if (segmentGraph.origins.length > 0) {
        setSelectedOriginId(segmentGraph.origins[0].id);
      }
    } catch (err: any) {
      console.warn("Could not initialize citizen data:", err);
      setFetchError(err?.message || "Failed to load corridor routing network");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCitizenData();
  }, [loadCitizenData]);

  const handleUseGeolocation = async () => {
    if (!navigator.geolocation) {
      setOutsideNotice(true);
      return;
    }
    setIsLocating(true);
    setOutsideNotice(false);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setIsLocating(false);
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;

        if (!graph) return;

        const snapped = snapPointToGraph(graph, lat, lon, 250);

        if (snapped) {
          setUserCustomCoords([snapped.node.lat, snapped.node.lon]);
          setUserCustomLabel(`${t.snappedNear} ${snapped.roadName} (~${snapped.distanceMeters}m)`);
          setSelectedOriginId(null);
          setOutsideNotice(false);
        } else {
          setOutsideNotice(true);
        }
      },
      (err) => {
        setIsLocating(false);
        console.info("Geolocation unavailable or denied:", err.message);
        setOutsideNotice(true);
      },
      { timeout: 7000, enableHighAccuracy: false }
    );
  };

  const handleMapClick = (lat: number, lon: number) => {
    if (!graph) return;
    const snapped = snapPointToGraph(graph, lat, lon, 400);
    if (snapped) {
      setUserCustomCoords([snapped.node.lat, snapped.node.lon]);
      setUserCustomLabel(`${t.snappedNear} ${snapped.roadName} (~${snapped.distanceMeters}m)`);
      setSelectedOriginId(null);
      setOutsideNotice(false);
    } else {
      setOutsideNotice(true);
    }
  };

  const activeOriginInfo = useMemo(() => {
    if (!graph) return null;

    if (userCustomCoords) {
      const match = graph.nodes.find(
        (n) =>
          Math.abs(n.lat - userCustomCoords[0]) < 0.0001 &&
          Math.abs(n.lon - userCustomCoords[1]) < 0.0001
      );
      if (match) {
        return {
          nodeId: match.id,
          lat: match.lat,
          lon: match.lon,
          label: userCustomLabel || `${t.selectedLocation} (${match.lat.toFixed(3)}, ${match.lon.toFixed(3)})`,
        };
      }
    }

    if (selectedOriginId && graph.origins) {
      const orig = graph.origins.find((o) => o.id === selectedOriginId) || graph.origins[0];
      if (orig) {
        return {
          nodeId: orig.nodeId,
          lat: orig.lat,
          lon: orig.lon,
          label: orig.name,
        };
      }
    }

    if (graph.nodes.length > 0) {
      return {
        nodeId: graph.nodes[0].id,
        lat: graph.nodes[0].lat,
        lon: graph.nodes[0].lon,
        label: "Central Delhi Corridor Point",
      };
    }

    return null;
  }, [graph, userCustomCoords, userCustomLabel, selectedOriginId, t]);

  const routeResult = useMemo(() => {
    if (!closureEngine || !activeOriginInfo) return null;
    return closureEngine.routeFromNode(activeOriginInfo.nodeId, scenarioPercent);
  }, [closureEngine, activeOriginInfo, scenarioPercent]);

  const hospitalCoords = useMemo((): [number, number] | undefined => {
    if (!routeResult || !hospitals || hospitals.length === 0) return undefined;
    const targetName = routeResult.nearestHospitalAfter || routeResult.nearestHospitalBefore;
    const h = hospitals.find((item) => item.name === targetName) || hospitals[0];
    return h ? [h.lat, h.lon] : undefined;
  }, [routeResult, hospitals]);

  const closedSegmentsGeometry = useMemo(() => {
    if (!routeResult || !closureEngine || routeResult.closedSegmentIds.length === 0) return [];
    const graphInstance = closureEngine.getGraph();
    const geomList: Array<Array<{ lat: number; lon: number }>> = [];
    const idSet = new Set(routeResult.closedSegmentIds);

    for (const edge of graphInstance.edges) {
      if (idSet.has(edge.segmentId) && edge.geometry && edge.geometry.length > 1) {
        geomList.push(edge.geometry);
      }
    }
    return geomList;
  }, [routeResult, closureEngine]);

  const scrollToRouteCard = () => {
    const el = document.getElementById("citizen-route-card");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="flex flex-col min-h-screen w-full bg-[#F5F7FA] text-[#1B2430] font-sans">
      {/* 1. Top Navigation */}
      <TopNavBar />

      {/* 2. Breadcrumbs */}
      <PortalBreadcrumbs items={[{ label: "Citizen view" }]} />

      {/* 3. Main Container (Mobile & Desktop Accessible) */}
      <main id="main-content" className="flex-1 w-full max-w-xl mx-auto px-4 py-6 flex flex-col gap-5">
        {/* Notices */}
        <PortalNotice type="scenario" />

        {/* Emergency Call 112 Banner */}
        <div className="bg-[#FEF7EC] border border-[#F5CF96] rounded p-3 text-xs flex items-center justify-between gap-2">
          <span className="text-[#B26A00] font-medium flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#B26A00]" />
            <span>{t.emergencyNotice}</span>
          </span>
          <a
            href="tel:112"
            className="px-3 py-1 rounded bg-[#B3261E] hover:bg-[#8F1D17] text-white font-bold text-xs flex items-center gap-1 shadow-xs transition-colors shrink-0"
          >
            <PhoneCall className="w-3.5 h-3.5 fill-white" />
            <span>Call 112</span>
          </a>
        </div>

        {loading ? (
          <div className="w-full h-64 rounded bg-white border border-[#D6DCE5] flex flex-col items-center justify-center p-6 text-center space-y-3">
            <RefreshCw className="w-8 h-8 text-[#12356B] animate-spin" />
            <p className="text-sm font-semibold text-[#12356B]">{t.loading}</p>
          </div>
        ) : fetchError ? (
          <div className="w-full rounded bg-white border border-[#F5ABA8] p-6 flex flex-col items-center justify-center text-center space-y-3 shadow-xs">
            <AlertTriangle className="w-8 h-8 text-[#B3261E]" />
            <h3 className="text-sm font-semibold text-[#B3261E]">{t.errorTitle}</h3>
            <p className="text-xs text-[#4A5668]">{fetchError}</p>
            <button
              type="button"
              onClick={loadCitizenData}
              className="px-4 py-2 rounded bg-[#12356B] hover:bg-[#0D2850] text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>{t.retry}</span>
            </button>
          </div>
        ) : (
          <>
            {/* Control A: Location Picker */}
            <CitizenLocationPicker
              t={t}
              sampleOrigins={graph?.origins || []}
              selectedOriginId={selectedOriginId}
              onSelectOriginId={(id) => {
                setSelectedOriginId(id);
                setUserCustomCoords(null);
                setUserCustomLabel(null);
                setOutsideNotice(false);
              }}
              onUseGeolocation={handleUseGeolocation}
              isLocating={isLocating}
              outsideNotice={outsideNotice}
              selectedLabel={activeOriginInfo?.label || "Central Delhi"}
            />

            {/* Control B: Scenario Selector (0%, 10%, 20%) */}
            <CitizenScenarioSelector
              t={t}
              selectedPercent={scenarioPercent}
              onSelect={setScenarioPercent}
            />

            {/* CARD 1: Nearest Hospital */}
            {routeResult && (
              <NearestHospitalCard
                t={t}
                hospitalName={routeResult.nearestHospitalAfter || routeResult.nearestHospitalBefore}
                travelTimeMin={routeResult.scenarioMin}
                isCutOff={routeResult.isCutOff}
                onShowDirections={scrollToRouteCard}
              />
            )}

            {/* CARD 2: Route to Hospital */}
            {routeResult && activeOriginInfo && (
              <div id="citizen-route-card">
                <RouteHospitalCard
                  t={t}
                  baselineMin={routeResult.baselineMin}
                  scenarioMin={routeResult.scenarioMin}
                  extraDelayMin={routeResult.extraDelayMin}
                  isCutOff={routeResult.isCutOff}
                  hospitalName={routeResult.nearestHospitalAfter || routeResult.nearestHospitalBefore}
                  originLabel={activeOriginInfo.label}
                  originCoords={[activeOriginInfo.lat, activeOriginInfo.lon]}
                  hospitalCoords={hospitalCoords}
                  normalRouteCoords={routeResult.routeCoordinatesBefore}
                  detourRouteCoords={routeResult.routeCoordinatesAfter}
                  roadNames={routeResult.isCutOff ? [] : routeResult.roadNamesAfter.length > 0 ? routeResult.roadNamesAfter : routeResult.roadNamesBefore}
                  closedSegmentsGeometry={closedSegmentsGeometry}
                  onMapClick={handleMapClick}
                />
              </div>
            )}

            {/* CARD 3: Report Waterlogging (Pin-only anonymous) */}
            {activeOriginInfo && (
              <ReportWaterloggingCard
                t={t}
                currentCoords={[activeOriginInfo.lat, activeOriginInfo.lon]}
                locationLabel={activeOriginInfo.label}
              />
            )}
          </>
        )}
      </main>

      {/* 4. Standard Portal Footer */}
      <PortalFooter />
    </div>
  );
}
