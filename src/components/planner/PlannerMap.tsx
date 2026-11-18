import React, { useState, useEffect, useMemo } from "react";
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
import {
  Layers,
  Filter,
  Activity,
  AlertTriangle,
  Eye,
  EyeOff,
  Crosshair,
} from "lucide-react";
import type { VulnerabilitySegment } from "../../types/risk";
import { FLOOD_HOTSPOTS } from "../../data/floodHotspots";
import { getScoreBin } from "./SegmentDetailCard";
import type { OriginScenarioResult } from "../../ml/closure/engine";

export interface HospitalRecord {
  id: string;
  name: string;
  lat: number;
  lon: number;
  emergency?: string;
  type?: string;
  subType?: string;
  address?: string;
  beds?: number;
}

export interface ResidentReportItem {
  id: string;
  lat: number;
  lon: number;
  severity: "ankle_deep" | "knee_deep" | "impassable";
  timestamp: string;
}

interface PlannerMapProps {
  segments: VulnerabilitySegment[];
  hospitals: HospitalRecord[];
  selectedSegmentId: string | null;
  onSelectSegment: (segment: VulnerabilitySegment) => void;
  showRiskLayer: boolean;
  setShowRiskLayer: (show: boolean) => void;
  showHospitals: boolean;
  setShowHospitals: (show: boolean) => void;
  showHotspots: boolean;
  setShowHotspots: (show: boolean) => void;
  top10PercentOnly: boolean;
  setTop10PercentOnly: (topOnly: boolean) => void;
  // Resident reports layer
  residentReports?: ResidentReportItem[];
  showResidentReports?: boolean;
  setShowResidentReports?: (show: boolean) => void;
  // Closure Scenario props
  closedSegmentIds?: string[];
  origins?: OriginScenarioResult[];
  selectedOrigin?: OriginScenarioResult | null;
  onSelectOrigin?: (origin: OriginScenarioResult | null) => void;
  showOrigins?: boolean;
  setShowOrigins?: (show: boolean) => void;
}

// Controller to fly to selected segment
function MapController({
  selectedSegment,
}: {
  selectedSegment: VulnerabilitySegment | null;
}) {
  const map = useMap();

  useEffect(() => {
    if (selectedSegment && selectedSegment.midpoint) {
      map.flyTo([selectedSegment.midpoint.lat, selectedSegment.midpoint.lon], 15, {
        duration: 1.0,
      });
    }
  }, [selectedSegment, map]);

  return null;
}

function MapResizer() {
  const map = useMap();
  useEffect(() => {
    map.invalidateSize();
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

// Basemap error listener for offline-proof rendering
function BasemapMonitor({ onOffline }: { onOffline: () => void }) {
  const map = useMap();
  useEffect(() => {
    const handleTileError = () => {
      onOffline();
    };
    map.on("tileerror", handleTileError);
    return () => {
      map.off("tileerror", handleTileError);
    };
  }, [map, onOffline]);
  return null;
}

// Custom DivIcons
const hospitalIcon = L.divIcon({
  className: "custom-hospital-marker",
  html: `
    <div style="
      background: #0284c7;
      color: white;
      border: 2px solid white;
      border-radius: 50%;
      width: 26px;
      height: 26px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 800;
      font-size: 13px;
      box-shadow: 0 2px 6px rgba(0,0,0,0.45);
    ">
      H
    </div>
  `,
  iconSize: [26, 26],
  iconAnchor: [13, 13],
});

const hotspotIcon = L.divIcon({
  className: "custom-hotspot-marker",
  html: `
    <div style="
      background: #7e22ce;
      color: #faf5ff;
      border: 2px solid #e9d5ff;
      border-radius: 50%;
      width: 22px;
      height: 22px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 11px;
      box-shadow: 0 2px 6px rgba(0,0,0,0.4);
    ">
      ⚠️
    </div>
  `,
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

const getResidentReportIcon = (severity: string) => {
  let size = 10;
  let bg = "#38BDF8"; // Ankle-deep
  if (severity === "knee_deep") {
    size = 14;
    bg = "#F59E0B";
  } else if (severity === "impassable") {
    size = 18;
    bg = "#EF4444";
  }
  return L.divIcon({
    className: "custom-resident-report-marker",
    html: `
      <div style="
        background: ${bg};
        border: 2px solid #94A3B8;
        border-radius: 50%;
        width: ${size}px;
        height: ${size}px;
        box-shadow: 0 1px 4px rgba(0,0,0,0.5);
      "></div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
};

function getReportHoursAgo(iso: string): number {
  const diffMs = Date.now() - new Date(iso).getTime();
  const hrs = Math.floor(diffMs / (1000 * 60 * 60));
  return hrs < 0 ? 0 : hrs;
}

export default function PlannerMap({
  segments,
  hospitals,
  selectedSegmentId,
  onSelectSegment,
  showRiskLayer,
  setShowRiskLayer,
  showHospitals,
  setShowHospitals,
  showHotspots,
  setShowHotspots,
  top10PercentOnly,
  setTop10PercentOnly,
  residentReports = [],
  showResidentReports = true,
  setShowResidentReports,
  closedSegmentIds = [],
  origins = [],
  selectedOrigin = null,
  onSelectOrigin,
  showOrigins = true,
  setShowOrigins,
}: PlannerMapProps) {
  const [basemapOffline, setBasemapOffline] = useState<boolean>(false);

  // Center of Minto Bridge / ITO Corridor
  const defaultCenter: [number, number] = [28.6290, 77.2270];

  const closedSet = useMemo(() => new Set(closedSegmentIds), [closedSegmentIds]);

  const closedSegmentsList = useMemo(() => {
    if (closedSet.size === 0) return [];
    return segments.filter((s) => closedSet.has(s.segmentId));
  }, [segments, closedSet]);

  const selectedSegment = useMemo(() => {
    if (!selectedSegmentId) return null;
    return segments.find((s) => s.segmentId === selectedSegmentId) || null;
  }, [selectedSegmentId, segments]);

  // Helper for origin pin icon
  const getOriginIcon = (orig: OriginScenarioResult, isSelected: boolean) => {
    let bg = "#10B981";
    let label = `${Math.round(orig.extraDelayMin)}m`;
    let border = isSelected ? "3px solid #06B6D4" : "2px solid #FFFFFF";
    const scale = isSelected ? "scale(1.25)" : "scale(1.0)";

    if (orig.isCutOff) {
      bg = "#18181B";
      label = "✕";
      border = isSelected ? "3px solid #EF4444" : "2px solid #EF4444";
    } else if (orig.extraDelayMin > 10) {
      bg = "#EF4444";
    } else if (orig.extraDelayMin >= 2) {
      bg = "#F59E0B";
    }

    return L.divIcon({
      className: "custom-origin-marker",
      html: `
        <div style="
          background: ${bg};
          color: white;
          border: ${border};
          border-radius: 50%;
          width: 22px;
          height: 22px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-size: ${orig.isCutOff ? "12px" : "10px"};
          box-shadow: 0 2px 6px rgba(0,0,0,0.55);
          transform: ${scale};
          transition: transform 0.15s ease;
        ">
          ${label}
        </div>
      `,
      iconSize: [22, 22],
      iconAnchor: [11, 11],
    });
  };

  // Pre-filter / classify segments for fast render
  const renderedSegments = useMemo(() => {
    return segments.map((seg) => {
      const isSelected = seg.segmentId === selectedSegmentId;
      const bin = getScoreBin(seg.score);
      const isTop10 = seg.score >= 0.90; // Top ~10% threshold

      // If top10 filter is enabled and this segment is not top 10%, dim it
      const isDimmed = top10PercentOnly && !isTop10;

      // Base weights
      let weight = 3.5;
      if (seg.score >= 0.75) weight = 6.0;
      else if (seg.score >= 0.5) weight = 5.0;
      else if (seg.score >= 0.25) weight = 4.0;

      if (isSelected) weight += 4.0;
      if (isDimmed) weight = 2.0;

      const opacity = isDimmed ? 0.15 : isSelected ? 1.0 : 0.85;
      const color = isSelected ? "#06B6D4" : bin.color;

      const positions: [number, number][] = (seg.geometry || []).map((pt) => [
        pt.lat,
        pt.lon,
      ]);

      return {
        segment: seg,
        positions,
        color,
        weight,
        opacity,
        bin,
        isSelected,
        isDimmed,
      };
    });
  }, [segments, selectedSegmentId, top10PercentOnly]);

  return (
    <div className="relative w-full h-full min-h-[400px] overflow-hidden rounded border border-[#D6DCE5] bg-[#F5F7FA]">
      {/* Offline Chip indicator */}
      {basemapOffline && (
        <div className="absolute top-3 left-3 z-[1000] px-2.5 py-1 rounded bg-white/95 border border-[#F5CF96] shadow-xs flex items-center gap-1.5 text-xs font-semibold text-[#B26A00] select-none">
          <AlertTriangle className="w-3.5 h-3.5 text-[#B26A00]" />
          <span>Basemap offline • Vector corridors active</span>
        </div>
      )}

      {/* Map Container using Canvas Renderer for 60fps polyline performance */}
      <MapContainer
        center={defaultCenter}
        zoom={14}
        preferCanvas={true}
        className="w-full h-full z-0"
        style={{ height: "100%", width: "100%", background: "#F5F7FA" }}
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
          eventHandlers={{
            tileerror: () => setBasemapOffline(true),
          }}
        />

        <MapResizer />
        <BasemapMonitor onOffline={() => setBasemapOffline(true)} />
        <MapController selectedSegment={selectedSegment} />

        {/* Polylines: Risk Segments */}
        {showRiskLayer &&
          renderedSegments.map(
            ({ segment, positions, color, weight, opacity, isSelected }) => (
              <React.Fragment key={segment.segmentId}>
                {/* Highlight Halo for Selected Segment */}
                {isSelected && (
                  <Polyline
                    positions={positions}
                    pathOptions={{
                      color: "#FFFFFF",
                      weight: weight + 3,
                      opacity: 0.9,
                    }}
                  />
                )}

                <Polyline
                  positions={positions}
                  pathOptions={{
                    color,
                    weight,
                    opacity,
                    lineCap: "round",
                    lineJoin: "round",
                  }}
                  eventHandlers={{
                    click: () => onSelectSegment(segment),
                  }}
                >
                  <Tooltip sticky direction="top" className="planner-tooltip">
                    <div className="text-xs p-0.5">
                      <p className="font-bold text-slate-900">
                        {segment.name || "Unnamed Corridor"}
                      </p>
                      <p className="text-[11px] text-slate-600 mt-0.5">
                        Rank #{segment.rank} • Score: {(segment.score * 100).toFixed(1)}%
                      </p>
                      {segment.features.is_underpass && (
                        <p className="text-[10px] text-amber-700 font-bold mt-0.5">
                          ⚠️ Underpass Corridor
                        </p>
                      )}
                    </div>
                  </Tooltip>
                </Polyline>
              </React.Fragment>
            )
          )}

        {/* Closed Segments in Scenario (Thick Dark Red Dashed Polylines) */}
        {closedSegmentsList.map((seg) => {
          const coords: [number, number][] = (seg.geometry || []).map((pt) => [pt.lat, pt.lon]);
          return (
            <Polyline
              key={`closed-seg-${seg.segmentId}`}
              positions={coords}
              pathOptions={{
                color: "#7F1D1D",
                weight: 6,
                dashArray: "6, 6",
                opacity: 0.95,
                lineCap: "round",
              }}
              eventHandlers={{
                click: () => onSelectSegment(seg),
              }}
            >
              <Tooltip sticky direction="top">
                <div className="text-xs p-1">
                  <p className="font-bold text-red-900 flex items-center gap-1">
                    <span>⛔</span> CLOSED IN SCENARIO
                  </p>
                  <p className="font-semibold text-slate-800">{seg.name}</p>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    Vulnerability score: {(seg.score * 100).toFixed(1)}% • Road class: {seg.features.highway_class}
                  </p>
                  {seg.features.is_underpass && (
                    <p className="text-[10px] text-amber-700 font-bold mt-0.5">
                      ⚠️ Underpass depression
                    </p>
                  )}
                </div>
              </Tooltip>
            </Polyline>
          );
        })}

        {/* Selected Origin Baseline Route (Subtle Blue / Grey) */}
        {selectedOrigin && selectedOrigin.routeCoordinatesBefore && selectedOrigin.routeCoordinatesBefore.length > 1 && (
          <Polyline
            positions={selectedOrigin.routeCoordinatesBefore}
            pathOptions={{
              color: selectedOrigin.isCutOff ? "#94A3B8" : "#0284C7",
              weight: 4,
              dashArray: selectedOrigin.isCutOff ? "5, 5" : undefined,
              opacity: 0.75,
              lineCap: "round",
            }}
          />
        )}

        {/* Selected Origin Scenario Detour Route (Amber / Orange) */}
        {selectedOrigin && !selectedOrigin.isCutOff && selectedOrigin.routeCoordinatesAfter && selectedOrigin.routeCoordinatesAfter.length > 1 && (
          <Polyline
            positions={selectedOrigin.routeCoordinatesAfter}
            pathOptions={{
              color: "#F59E0B",
              weight: 5,
              opacity: 0.95,
              lineCap: "round",
            }}
          />
        )}

        {/* Sample Origin Markers (Colored by delay, Black with X for cut off) */}
        {showOrigins &&
          origins.map((orig) => {
            const isSelected = selectedOrigin?.id === orig.id;
            return (
              <Marker
                key={orig.id}
                position={[orig.lat, orig.lon]}
                icon={getOriginIcon(orig, isSelected)}
                eventHandlers={{
                  click: () => onSelectOrigin?.(isSelected ? null : orig),
                }}
              >
                <Tooltip sticky direction="top">
                  <div className="text-xs p-1 max-w-xs">
                    <p className="font-bold text-slate-900">{orig.name}</p>
                    {orig.isCutOff ? (
                      <p className="text-[11px] font-bold text-red-700 mt-0.5 flex items-center gap-1">
                        <span>✕</span> CUT OFF: Severed from all emergency trauma hospitals
                      </p>
                    ) : (
                      <p className="text-[11px] text-slate-700 mt-0.5">
                        +{orig.extraDelayMin}m extra delay (Baseline {orig.baselineMin}m → Detour {orig.scenarioMin}m)
                      </p>
                    )}
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      Nearest hospital: {orig.nearestHospitalAfter || orig.nearestHospitalBefore}
                    </p>
                  </div>
                </Tooltip>
              </Marker>
            );
          })}

        {/* Hospital Markers */}
        {showHospitals &&
          hospitals.map((hosp) => (
            <Marker
              key={hosp.id}
              position={[hosp.lat, hosp.lon]}
              icon={hospitalIcon}
            >
              <Popup>
                <div className="p-1 text-slate-900 text-xs max-w-xs">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="w-4 h-4 rounded-full bg-sky-600 text-white flex items-center justify-center text-[10px] font-bold">
                      H
                    </span>
                    <h4 className="font-bold text-sm leading-tight text-sky-900">
                      {hosp.name}
                    </h4>
                  </div>
                  <p className="text-slate-600 text-[11px] mt-0.5">
                    {hosp.subType || "Emergency Healthcare Facility"}
                  </p>
                  {hosp.address && (
                    <p className="text-slate-500 text-[10px] mt-1 italic">
                      {hosp.address}
                    </p>
                  )}
                  <div className="mt-2 flex items-center gap-2 text-[10px] text-slate-700 font-semibold border-t pt-1 border-slate-200">
                    <span>Emergency: {hosp.emergency === "yes" ? "24/7 Trauma" : "Specialty"}</span>
                    {hosp.beds && <span>• {hosp.beds} Beds</span>}
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}

        {/* Listed Hotspots Markers */}
        {showHotspots &&
          FLOOD_HOTSPOTS.map((hotspot) => (
            <Marker
              key={hotspot.id}
              position={[hotspot.lat, hotspot.lon]}
              icon={hotspotIcon}
            >
              <Popup>
                <div className="p-1 text-slate-900 text-xs max-w-xs">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-purple-700 font-bold">⚠️</span>
                    <h4 className="font-bold text-sm leading-tight text-purple-950">
                      {hotspot.name}
                    </h4>
                  </div>
                  <span className="inline-block px-1.5 py-0.5 rounded bg-purple-100 text-purple-800 text-[10px] font-semibold">
                    Listed hotspot (demo data)
                  </span>
                  <p className="text-slate-600 text-[11px] mt-1.5 leading-relaxed">
                    Public PWD / Delhi Traffic Police monitored waterlogging node.
                  </p>
                  <p className="text-[10px] text-slate-500 mt-1 italic">
                    Reference radius: {hotspot.radiusMeters} m
                  </p>
                </div>
              </Popup>
            </Marker>
          ))}

        {/* Resident Reports (Unverified) */}
        {showResidentReports &&
          residentReports.map((rep) => {
            const hrs = getReportHoursAgo(rep.timestamp);
            const severityLabel =
              rep.severity === "impassable"
                ? "Road impassable"
                : rep.severity === "knee_deep"
                ? "Knee-deep"
                : "Ankle-deep";

            return (
              <Marker
                key={`resident-report-${rep.id}`}
                position={[rep.lat, rep.lon]}
                icon={getResidentReportIcon(rep.severity)}
              >
                <Tooltip sticky direction="top">
                  <div className="text-xs p-1 max-w-xs">
                    <p className="font-bold text-slate-900 flex items-center gap-1">
                      <span className="inline-block w-2 h-2 rounded-full bg-[#BD6A36] mr-1.5 align-middle" aria-hidden="true" /> Unverified resident report
                    </p>
                    <p className="text-[11px] text-slate-700 mt-0.5 font-medium">
                      Severity: <span className="font-bold">{severityLabel}</span>
                    </p>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      Unverified resident report, approx. location, about {hrs} {hrs === 1 ? "hour" : "hours"} ago
                    </p>
                  </div>
                </Tooltip>
              </Marker>
            );
          })}
      </MapContainer>

      {/* Floating Selected Origin Reachability Card (Top Right) */}
      {selectedOrigin && (
        <div className="absolute top-3 right-3 z-10 bg-[#0f1d2df2] backdrop-blur-md border border-cyan-700/80 rounded-xl p-3 shadow-2xl text-slate-200 text-xs max-w-xs space-y-2 animate-fadeIn">
          <div className="flex items-start justify-between gap-2 border-b border-slate-800 pb-1.5">
            <div>
              <span className="text-[10px] uppercase font-bold text-cyan-400 tracking-wider">
                Area Reachability
              </span>
              <h4 className="font-bold text-white text-xs leading-snug">
                {selectedOrigin.name}
              </h4>
            </div>
            <button
              type="button"
              onClick={() => onSelectOrigin?.(null)}
              className="text-slate-400 hover:text-white p-0.5 rounded cursor-pointer"
              title="Close route detail"
            >
              ✕
            </button>
          </div>

          {selectedOrigin.isCutOff ? (
            <div className="text-red-300 text-[11px] space-y-1">
              <p className="font-bold flex items-center gap-1 text-red-400">
                <span>⚠️</span> No flood-free route to any hospital
              </p>
              <p className="text-slate-400 leading-tight">
                All pathways to {selectedOrigin.nearestHospitalBefore} and other trauma centers are blocked by failed road segments in this scenario.
              </p>
            </div>
          ) : (
            <div className="text-[11px] space-y-1.5">
              <div className="flex items-center justify-between text-slate-300">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-1 bg-[#0284C7] rounded" /> Baseline route:
                </span>
                <span className="font-mono font-semibold">{selectedOrigin.baselineMin} min</span>
              </div>
              <div className="flex items-center justify-between text-amber-300 font-bold">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-1.5 bg-[#F59E0B] rounded" /> Detour route:
                </span>
                <span className="font-mono">{selectedOrigin.scenarioMin} min (+{selectedOrigin.extraDelayMin} min)</span>
              </div>
              <div className="text-[10px] text-slate-400 border-t border-slate-800/80 pt-1 flex items-center justify-between">
                <span>Hospital:</span>
                <span className="text-slate-300 font-medium truncate max-w-[170px]" title={selectedOrigin.nearestHospitalAfter || selectedOrigin.nearestHospitalBefore}>
                  {selectedOrigin.nearestHospitalAfter || selectedOrigin.nearestHospitalBefore}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Floating Map Controls & Layer Toggles (Top Left) */}
      <div className="absolute top-3 left-3 z-10 flex flex-col gap-2">
        <div className="bg-[#0f1d2df0] backdrop-blur-md border border-slate-800 rounded-xl p-2.5 shadow-xl text-slate-200 text-xs flex flex-col gap-2">
          <div className="flex items-center gap-1.5 pb-1.5 border-b border-slate-800 font-bold uppercase tracking-wider text-[10px] text-slate-400">
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            <span>Map Layers</span>
          </div>

          <label className="flex items-center justify-between gap-3 cursor-pointer hover:text-white select-none">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
              Risk Segments
            </span>
            <input
              type="checkbox"
              checked={showRiskLayer}
              onChange={(e) => setShowRiskLayer(e.target.checked)}
              className="accent-cyan-500 rounded cursor-pointer"
            />
          </label>

          <label className="flex items-center justify-between gap-3 cursor-pointer hover:text-white select-none">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              Sample Areas ({origins.length})
            </span>
            <input
              type="checkbox"
              checked={showOrigins}
              onChange={(e) => setShowOrigins?.(e.target.checked)}
              className="accent-cyan-500 rounded cursor-pointer"
            />
          </label>

          <label className="flex items-center justify-between gap-3 cursor-pointer hover:text-white select-none">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-500" />
              Hospitals ({hospitals.length})
            </span>
            <input
              type="checkbox"
              checked={showHospitals}
              onChange={(e) => setShowHospitals(e.target.checked)}
              className="accent-cyan-500 rounded cursor-pointer"
            />
          </label>

          <label className="flex items-center justify-between gap-3 cursor-pointer hover:text-white select-none">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
              Listed Hotspots
            </span>
            <input
              type="checkbox"
              checked={showHotspots}
              onChange={(e) => setShowHotspots(e.target.checked)}
              className="accent-cyan-500 rounded cursor-pointer"
            />
          </label>

          <label className="flex items-center justify-between gap-3 cursor-pointer hover:text-white select-none">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 border border-slate-300" />
              Resident reports (unverified) ({residentReports.length})
            </span>
            <input
              type="checkbox"
              checked={showResidentReports}
              onChange={(e) => setShowResidentReports?.(e.target.checked)}
              className="accent-cyan-500 rounded cursor-pointer"
            />
          </label>

          <div className="pt-1.5 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setTop10PercentOnly(!top10PercentOnly)}
              className={`w-full py-1.5 px-2 rounded-md text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer select-none border ${
                top10PercentOnly
                  ? "bg-red-950/80 text-red-300 border-red-500/60 shadow-xs"
                  : "bg-slate-800/80 text-slate-300 border-slate-700/80 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <Filter className="w-3 h-3 text-red-400" />
              <span>{top10PercentOnly ? "Show All Segments" : "Top 10% Risk Only"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Sequential Color Legend (Bottom Left) */}
      <div className="absolute bottom-3 left-3 z-10 bg-[#0f1d2df0] backdrop-blur-md border border-slate-800 rounded-xl p-2.5 shadow-xl text-slate-200 text-xs max-w-sm">
        <div className="flex items-center justify-between gap-4 mb-1.5">
          <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Vulnerability & Delay Legend
          </span>
          {closedSegmentsList.length > 0 && (
            <span className="text-[10px] text-red-400 font-bold bg-red-950/80 px-1.5 py-0.5 rounded border border-red-800">
              {closedSegmentsList.length} closed
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-1.5 rounded-full bg-[#FEF08A] shrink-0" />
            <span>Low (0–0.25)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-2 rounded-full bg-[#F59E0B] shrink-0" />
            <span>Moderate (0.25–0.5)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-2.5 rounded-full bg-[#EA580C] shrink-0" />
            <span>High (0.5–0.75)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3 rounded-full bg-[#DC2626] shrink-0" />
            <span className="font-bold text-red-300">Very High</span>
          </div>
        </div>

        {/* Closure and Area Delay Legend Strip */}
        <div className="mt-2 pt-1.5 border-t border-slate-800/80 flex items-center justify-between gap-2 text-[10px] text-slate-300">
          <div className="flex items-center gap-1">
            <span className="w-3 h-1 border-b-2 border-dashed border-[#7F1D1D]" />
            <span className="text-red-400 font-bold">Closed Road</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>&lt;2m</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <span>2-10m</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-red-500" />
            <span>&gt;10m</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-zinc-900 border border-red-500 text-[8px] text-red-400 flex items-center justify-center font-bold">✕</span>
            <span className="text-red-400 font-semibold">Cut-off</span>
          </div>
        </div>
      </div>
    </div>
  );
}
