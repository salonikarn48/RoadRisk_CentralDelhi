/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * RoadRisk Delhi - Select Area Page
 * Public-sector bounding box selection for network analysis.
 */

import React, { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  MapContainer,
  TileLayer,
  Rectangle,
  Tooltip,
  useMap,
} from "react-leaflet";
import {
  Scan,
  Square,
  Maximize2,
  Check,
  AlertTriangle,
  RefreshCw,
  AlertOctagon,
  ArrowRight,
  RotateCcw,
} from "lucide-react";
import TopNavBar from "../components/TopNavBar";
import PortalBreadcrumbs from "../components/common/PortalBreadcrumbs";
import LocationSearch from "../components/LocationSearch";
import { calculateAreaKm2 } from "../utils/geo";
import { useAppState, DEFAULT_CENTRAL_DELHI_ZONE } from "../context/AppStateContext";

function MapViewController({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
}

function MapInvalidator() {
  const map = useMap();

  useEffect(() => {
    if (!map) return;
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 200);

    const handleResize = () => {
      map.invalidateSize();
    };
    window.addEventListener("resize", handleResize);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", handleResize);
    };
  }, [map]);

  return null;
}

function MapFlyHandler({
  target,
  onTargetConsumed,
}: {
  target: { center?: [number, number]; zoom?: number; bounds?: [[number, number], [number, number]] } | null;
  onTargetConsumed: () => void;
}) {
  const map = useMap();
  useEffect(() => {
    if (!target || !map) return;
    if (target.bounds) {
      map.fitBounds(target.bounds, { padding: [50, 50], maxZoom: 15, animate: true });
    } else if (target.center) {
      map.flyTo(target.center, target.zoom || 14, { duration: 1.2 });
    }
    onTargetConsumed();
  }, [target, map, onTargetConsumed]);
  return null;
}

function MapBoundsExtractor({ onRegisterExtract }: { onRegisterExtract: (fn: () => [[number, number], [number, number]]) => void }) {
  const map = useMap();
  useEffect(() => {
    onRegisterExtract(() => {
      const b = map.getBounds();
      return [
        [b.getSouth(), b.getWest()],
        [b.getNorth(), b.getEast()],
      ];
    });
  }, [map, onRegisterExtract]);
  return null;
}

function MapAreaDrawInteraction({
  isDrawingMode,
  onBoundsChange,
  onDrawingComplete,
}: {
  isDrawingMode: boolean;
  onBoundsChange: (bounds: [[number, number], [number, number]]) => void;
  onDrawingComplete: () => void;
}) {
  const map = useMap();
  const [dragStart, setDragStart] = useState<L.LatLng | null>(null);
  const [currentDrag, setCurrentDrag] = useState<L.LatLng | null>(null);

  useEffect(() => {
    if (!map) return;

    if (isDrawingMode) {
      map.dragging.disable();
    } else {
      map.dragging.enable();
      setDragStart(null);
      setCurrentDrag(null);
      return;
    }

    const onMouseDown = (e: L.LeafletMouseEvent) => {
      setDragStart(e.latlng);
      setCurrentDrag(e.latlng);
    };

    const onMouseMove = (e: L.LeafletMouseEvent) => {
      if (dragStart) {
        setCurrentDrag(e.latlng);
      }
    };

    const onMouseUp = (e: L.LeafletMouseEvent) => {
      if (dragStart) {
        const s = Math.min(dragStart.lat, e.latlng.lat);
        const n = Math.max(dragStart.lat, e.latlng.lat);
        const w = Math.min(dragStart.lng, e.latlng.lng);
        const el = Math.max(dragStart.lng, e.latlng.lng);

        if (n - s > 0.001 && el - w > 0.001) {
          onBoundsChange([[s, w], [n, el]]);
        }
        setDragStart(null);
        setCurrentDrag(null);
        onDrawingComplete();
      }
    };

    map.on("mousedown", onMouseDown);
    map.on("mousemove", onMouseMove);
    map.on("mouseup", onMouseUp);

    return () => {
      map.off("mousedown", onMouseDown);
      map.off("mousemove", onMouseMove);
      map.off("mouseup", onMouseUp);
    };
  }, [map, isDrawingMode, dragStart, onBoundsChange, onDrawingComplete]);

  if (isDrawingMode && dragStart && currentDrag) {
    const s = Math.min(dragStart.lat, currentDrag.lat);
    const n = Math.max(dragStart.lat, currentDrag.lat);
    const w = Math.min(dragStart.lng, currentDrag.lng);
    const e = Math.max(dragStart.lng, currentDrag.lng);

    return (
      <Rectangle
        bounds={[[s, w], [n, e]]}
        pathOptions={{
          color: "#12356B",
          weight: 2,
          dashArray: "6 4",
          fillColor: "#12356B",
          fillOpacity: 0.15,
        }}
      />
    );
  }

  return null;
}

export default function SelectAreaPage() {
  const navigate = useNavigate();
  const {
    currentZone,
    loading,
    loadingMessage,
    fetchError,
    handleRunAnalysisArea,
    loadZoneData,
  } = useAppState();

  const [selectedAreaBounds, setSelectedAreaBounds] = useState<[[number, number], [number, number]] | null>([
    [currentZone.south, currentZone.west],
    [currentZone.north, currentZone.east],
  ]);
  const [isDrawingRectangle, setIsDrawingRectangle] = useState<boolean>(false);
  const [mapKey] = useState<string>(() => `select-area-map-${Date.now()}`);
  const [flyTarget, setFlyTarget] = useState<{
    center?: [number, number];
    zoom?: number;
    bounds?: [[number, number], [number, number]];
  } | null>(null);

  const extractBoundsRef = useRef<(() => [[number, number], [number, number]]) | null>(null);

  const selectedAreaKm2 = useMemo(() => {
    if (!selectedAreaBounds) return 0;
    return calculateAreaKm2(selectedAreaBounds);
  }, [selectedAreaBounds]);

  const isAreaTooLarge = selectedAreaKm2 > 25.0;
  const isAreaTooSmall = selectedAreaKm2 > 0 && selectedAreaKm2 < 0.3;
  const isAreaValid = Boolean(selectedAreaBounds && !isAreaTooLarge && !isAreaTooSmall);

  // Handle Location Search selection
  const handleLocationSelect = useCallback(
    (lat: number, lon: number, name: string, bbox?: [number, number, number, number]) => {
      if (bbox) {
        const bounds: [[number, number], [number, number]] = [[bbox[0], bbox[1]], [bbox[2], bbox[3]]];
        setFlyTarget({ bounds });
        setSelectedAreaBounds(bounds);
      } else {
        setFlyTarget({ center: [lat, lon], zoom: 14 });
      }
    },
    []
  );

  // Handle "Use current view"
  const handleUseCurrentView = useCallback(() => {
    if (extractBoundsRef.current) {
      const b = extractBoundsRef.current();
      setSelectedAreaBounds(b);
      setIsDrawingRectangle(false);
    }
  }, []);

  // Handle "Use default Central Delhi zone" -> Navigates to /dashboard
  const handleUseDefaultZone = useCallback(async () => {
    setSelectedAreaBounds([
      [DEFAULT_CENTRAL_DELHI_ZONE.south, DEFAULT_CENTRAL_DELHI_ZONE.west],
      [DEFAULT_CENTRAL_DELHI_ZONE.north, DEFAULT_CENTRAL_DELHI_ZONE.east],
    ]);
    await loadZoneData(DEFAULT_CENTRAL_DELHI_ZONE, false);
    navigate("/dashboard");
  }, [loadZoneData, navigate]);

  // Handle "Run analysis on this area" -> Navigates to /dashboard on success
  const handleRunAnalysis = useCallback(async () => {
    if (!selectedAreaBounds || !isAreaValid) return;
    try {
      const ok = await handleRunAnalysisArea(selectedAreaBounds);
      if (ok) {
        navigate("/dashboard");
      }
    } catch (err: any) {
      console.info("Area analysis error:", err?.message || err);
    }
  }, [selectedAreaBounds, isAreaValid, handleRunAnalysisArea, navigate]);

  return (
    <div className="flex flex-col h-[100dvh] w-full bg-[#F5F7FA] text-[#1B2430] font-sans overflow-hidden select-none">
      {/* 1. Header with Utility Strip */}
      <TopNavBar />

      {/* 2. Breadcrumbs */}
      <PortalBreadcrumbs items={[{ label: "Select Analysis Area" }]} />

      {/* 3. Full-Screen Map Container */}
      <div className="relative w-full flex-1 min-h-0 overflow-hidden bg-[#F5F7FA]">
        <MapContainer
          key={mapKey}
          center={currentZone.center}
          zoom={14}
          style={{ width: "100%", height: "100%", background: "#F5F7FA" }}
          zoomControl={true}
        >
          <MapInvalidator />
          {/* Light Low-Contrast Basemap: CartoDB Positron */}
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapViewController center={currentZone.center} zoom={14} />
          <MapFlyHandler target={flyTarget} onTargetConsumed={() => setFlyTarget(null)} />
          <MapBoundsExtractor onRegisterExtract={(fn) => { extractBoundsRef.current = fn; }} />
          <MapAreaDrawInteraction
            isDrawingMode={isDrawingRectangle}
            onBoundsChange={(b) => setSelectedAreaBounds(b)}
            onDrawingComplete={() => setIsDrawingRectangle(false)}
          />

          {/* Current Active Zone (Dashed Navy) */}
          <Rectangle
            bounds={[
              [currentZone.south, currentZone.west],
              [currentZone.north, currentZone.east],
            ]}
            pathOptions={{
              color: "#12356B",
              weight: 2,
              dashArray: "4 4",
              fillColor: "#12356B",
              fillOpacity: 0.04,
            }}
            interactive={false}
          />

          {/* Selected Area Highlighted Rectangle */}
          {selectedAreaBounds && (
            <Rectangle
              bounds={selectedAreaBounds}
              pathOptions={{
                color: isAreaTooLarge || isAreaTooSmall ? "#B3261E" : "#12356B",
                weight: 2,
                dashArray: "6 4",
                fillColor: isAreaTooLarge || isAreaTooSmall ? "#B3261E" : "#12356B",
                fillOpacity: 0.15,
              }}
            >
              <Tooltip permanent direction="center">
                <div className="font-sans text-xs font-semibold text-[#1B2430] px-2 py-1 rounded bg-white shadow-xs border border-[#D6DCE5]">
                  {selectedAreaKm2} km²
                </div>
              </Tooltip>
            </Rectangle>
          )}
        </MapContainer>

        {/* Floating Controls Overlay */}
        <div className="absolute top-4 left-4 z-[1000] flex flex-col gap-2.5 max-w-lg w-[calc(100%-2rem)] sm:w-[480px] pointer-events-auto">
          {/* Search Box */}
          <LocationSearch onSelectLocation={handleLocationSelect} />

          {/* Area Control Card */}
          <div className="p-4 rounded bg-white border border-[#D6DCE5] shadow-sm space-y-3 font-sans text-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-[#E4E9F0] pb-3">
              <div className="space-y-0.5">
                <div className="font-semibold text-[#12356B] text-[13px] flex items-center gap-1.5">
                  <Scan className="w-4 h-4 text-[#12356B]" />
                  <span>Define Bounding Box (0.3 km² – 25 km²)</span>
                </div>
                <div className="text-[12px] text-[#4A5668]">
                  Draw on the map or snap to current view to analyze road infrastructure:
                </div>
              </div>

              {/* Action Buttons: Draw vs Current View */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsDrawingRectangle((prev) => !prev)}
                  className={`px-3 py-1.5 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                    isDrawingRectangle
                      ? "bg-[#FEF7EC] text-[#B26A00] border border-[#F5CF96]"
                      : "bg-white hover:bg-[#F0F4F8] text-[#12356B] border border-[#D6DCE5]"
                  }`}
                  title="Click and drag on the map to draw a custom rectangle"
                >
                  <Square className="w-3.5 h-3.5" />
                  <span>{isDrawingRectangle ? "Drawing..." : "Draw Rectangle"}</span>
                </button>

                <button
                  type="button"
                  onClick={handleUseCurrentView}
                  className="px-3 py-1.5 rounded bg-white hover:bg-[#F0F4F8] text-[#12356B] border border-[#D6DCE5] text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  title="Take the currently visible map viewport bounds"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span>Use Viewport</span>
                </button>
              </div>
            </div>

            {/* Instruction if drawing */}
            {isDrawingRectangle && (
              <div className="p-2 rounded bg-[#FEF7EC] border border-[#F5CF96] text-xs text-[#B26A00] flex items-center gap-2">
                <span>
                  <strong>Draw Mode Active:</strong> Click and drag diagonally on the map to define the target bounding box.
                </span>
              </div>
            )}

            {/* Metrics & Validation Strip */}
            {selectedAreaBounds && (
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 rounded bg-[#F0F4F8] border border-[#D6DCE5]">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[#4A5668] font-medium">Selected Area:</span>
                    <span className="text-sm font-semibold text-[#1B2430]">
                      {selectedAreaKm2} km²
                    </span>
                  </div>

                  {isAreaTooLarge && (
                    <div className="text-xs text-[#B3261E] font-medium flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      <span>Area exceeds 25 km² limit ({selectedAreaKm2} km²). Please select a smaller box.</span>
                    </div>
                  )}

                  {isAreaTooSmall && (
                    <div className="text-xs text-[#B26A00] font-medium flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      <span>Area is below 0.3 km² minimum ({selectedAreaKm2} km²).</span>
                    </div>
                  )}

                  {isAreaValid && (
                    <div className="text-xs text-[#1E7B4F] font-medium flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 shrink-0" />
                      <span>Area size valid ({selectedAreaKm2} km²). Ready for OpenStreetMap query.</span>
                    </div>
                  )}
                </div>

                {/* Run Analysis Button */}
                <button
                  type="button"
                  onClick={handleRunAnalysis}
                  disabled={!isAreaValid || loading}
                  className={`px-4 py-2 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs ${
                    isAreaValid && !loading
                      ? "bg-[#12356B] hover:bg-[#0D2850] text-white cursor-pointer"
                      : "bg-[#D6DCE5] text-[#64748B] cursor-not-allowed"
                  }`}
                >
                  <span>Run Analysis</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Quick Reset to Default Central Delhi */}
            <div className="pt-1 flex items-center justify-between text-xs text-[#4A5668]">
              <span>Prefer pre-calibrated baseline?</span>
              <button
                type="button"
                onClick={handleUseDefaultZone}
                disabled={loading}
                className="text-[#12356B] hover:underline font-semibold flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Use Default Central Delhi</span>
              </button>
            </div>
          </div>

          {/* Error Message Card with Retry */}
          {fetchError && (
            <div className="p-3.5 rounded bg-[#FDF1F0] border border-[#F5ABA8] text-[#B3261E] shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5 font-semibold">
                  <AlertOctagon className="w-4 h-4 shrink-0" />
                  <span>OpenStreetMap Query Error</span>
                </div>
                <p className="text-[11px] leading-relaxed text-[#B3261E]">
                  {fetchError}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleRunAnalysis}
                  disabled={loading}
                  className="px-3 py-1.5 rounded bg-[#B3261E] hover:bg-[#8F1D17] text-white font-semibold text-xs flex items-center gap-1.5"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
                  <span>Retry</span>
                </button>
                <button
                  type="button"
                  onClick={handleUseDefaultZone}
                  className="px-3 py-1.5 rounded bg-white hover:bg-[#F0F4F8] text-[#12356B] border border-[#D6DCE5] font-semibold text-xs"
                >
                  Default Central Delhi
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Loading Overlay */}
        {loading && (
          <div className="absolute inset-0 z-[2000] bg-white/80 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="p-6 rounded bg-white border border-[#D6DCE5] shadow-md text-center space-y-3 max-w-sm w-full font-sans">
              <div className="w-10 h-10 mx-auto rounded-full bg-[#EBF1FA] border border-[#A5BEDB] flex items-center justify-center text-[#12356B]">
                <RefreshCw className="w-5 h-5 animate-spin" />
              </div>
              <div className="text-sm font-semibold text-[#12356B]">
                Retrieving Road Infrastructure
              </div>
              <div className="text-xs text-[#4A5668] bg-[#F0F4F8] border border-[#D6DCE5] p-3 rounded leading-relaxed">
                {loadingMessage || "Querying OpenStreetMap for drivable roads in target area..."}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
