import React, { useEffect, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Polyline,
  Marker,
  Popup,
  Tooltip,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import { AlertTriangle, MapPin } from "lucide-react";
import ErrorBoundary from "../common/ErrorBoundary";

interface CitizenMiniMapProps {
  originCoords: [number, number];
  hospitalCoords?: [number, number];
  hospitalName?: string;
  originLabel?: string;
  normalRouteCoords: [number, number][];
  detourRouteCoords: [number, number][];
  closedSegmentsGeometry: Array<Array<{ lat: number; lon: number }>>;
  onMapClick?: (lat: number, lon: number) => void;
  isCutOff?: boolean;
}

// Controller to handle tap-to-set-pin on map
function MapClickHandler({ onClick }: { onClick?: (lat: number, lon: number) => void }) {
  useMapEvents({
    click(e) {
      if (onClick) {
        onClick(e.latlng.lat, e.latlng.lng);
      }
    },
  });
  return null;
}

// Controller to fit bounds around route or center
function MapBoundsController({
  originCoords,
  hospitalCoords,
  normalRoute,
  detourRoute,
}: {
  originCoords: [number, number];
  hospitalCoords?: [number, number];
  normalRoute: [number, number][];
  detourRoute: [number, number][];
}) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;

    // Collect all points to fit
    const allPts: [number, number][] = [originCoords];
    if (hospitalCoords) allPts.push(hospitalCoords);
    if (detourRoute.length > 0) {
      detourRoute.forEach((pt) => allPts.push(pt));
    } else if (normalRoute.length > 0) {
      normalRoute.forEach((pt) => allPts.push(pt));
    }

    if (allPts.length > 1) {
      const lats = allPts.map((p) => p[0]);
      const lons = allPts.map((p) => p[1]);
      const minLat = Math.min(...lats);
      const maxLat = Math.max(...lats);
      const minLon = Math.min(...lons);
      const maxLon = Math.max(...lons);

      map.fitBounds(
        [
          [minLat, minLon],
          [maxLat, maxLon],
        ],
        { padding: [35, 35], maxZoom: 15, animate: true }
      );
    } else {
      map.setView(originCoords, 14);
    }

    // Call invalidateSize after render
    map.invalidateSize();
    const t = setTimeout(() => map.invalidateSize(), 200);
    return () => clearTimeout(t);
  }, [map, originCoords, hospitalCoords, normalRoute, detourRoute]);

  return null;
}

// Map invalidateSize handler on resize
function MapResizer() {
  const map = useMap();
  useEffect(() => {
    map.invalidateSize();
    const handleResize = () => map.invalidateSize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [map]);
  return null;
}

// Custom markers
const userPinIcon = L.divIcon({
  className: "custom-user-pin",
  html: `
    <div style="
      background: #0284c7;
      color: white;
      border: 2px solid white;
      border-radius: 50%;
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 900;
      font-size: 11px;
      box-shadow: 0 2px 6px rgba(0,0,0,0.5);
    ">
      ●
    </div>
  `,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

const hospitalPinIcon = L.divIcon({
  className: "custom-hospital-pin",
  html: `
    <div style="
      background: #dc2626;
      color: white;
      border: 2px solid white;
      border-radius: 50%;
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 900;
      font-size: 13px;
      box-shadow: 0 2px 6px rgba(0,0,0,0.5);
    ">
      +
    </div>
  `,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

export default function CitizenMiniMap({
  originCoords,
  hospitalCoords,
  hospitalName = "Emergency Hospital",
  originLabel = "Your Location",
  normalRouteCoords,
  detourRouteCoords,
  closedSegmentsGeometry,
  onMapClick,
  isCutOff = false,
}: CitizenMiniMapProps) {
  const [offline, setOffline] = useState(false);

  return (
    <div className="relative w-full h-[240px] sm:h-[260px] rounded-xl overflow-hidden border border-slate-700 shadow-inner bg-[#0B1B2B]">
      {offline && (
        <div className="absolute top-2 left-2 z-[1000] px-2 py-0.5 rounded bg-slate-900/95 border border-amber-500/70 text-[10px] text-amber-300 font-semibold flex items-center gap-1 select-none">
          <AlertTriangle className="w-3 h-3 text-amber-400" />
          <span>Offline Basemap</span>
        </div>
      )}

      <ErrorBoundary moduleName="Citizen Route Map">
        <MapContainer
          center={originCoords}
          zoom={14}
          preferCanvas={true}
          style={{ height: "100%", width: "100%", background: "#F5F7FA" }}
          zoomControl={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            maxZoom={18}
            eventHandlers={{
              tileerror: () => setOffline(true),
            }}
          />

          <MapResizer />
          <MapBoundsController
            originCoords={originCoords}
            hospitalCoords={hospitalCoords}
            normalRoute={normalRouteCoords}
            detourRoute={detourRouteCoords}
          />
          <MapClickHandler onClick={onMapClick} />

          {/* 1. Closed Segments in Scenario (Dashed Dark Red) */}
          {closedSegmentsGeometry.map((pts, idx) => {
            const coords: [number, number][] = pts.map((p) => [p.lat, p.lon]);
            return (
              <Polyline
                key={`closed-seg-${idx}`}
                positions={coords}
                pathOptions={{
                  color: "#991b1b",
                  weight: 5,
                  dashArray: "5, 5",
                  opacity: 0.9,
                  lineCap: "round",
                }}
              />
            );
          })}

          {/* 2. Normal Route (Grey/Blue Polyline) */}
          {normalRouteCoords && normalRouteCoords.length > 1 && (
            <Polyline
              positions={normalRouteCoords}
              pathOptions={{
                color: "#64748b",
                weight: detourRouteCoords.length > 1 ? 3.5 : 5,
                opacity: detourRouteCoords.length > 1 ? 0.6 : 0.9,
                lineCap: "round",
              }}
            >
              <Tooltip sticky direction="top">
                <span className="text-xs font-bold text-slate-800">Normal Route</span>
              </Tooltip>
            </Polyline>
          )}

          {/* 3. Flood-Aware Detour Route (Bold Amber Polyline) */}
          {detourRouteCoords && detourRouteCoords.length > 1 && (
            <Polyline
              positions={detourRouteCoords}
              pathOptions={{
                color: "#f59e0b",
                weight: 5.5,
                opacity: 0.95,
                lineCap: "round",
              }}
            >
              <Tooltip sticky direction="top">
                <span className="text-xs font-bold text-slate-900">Flood-Aware Detour</span>
              </Tooltip>
            </Polyline>
          )}

          {/* User Origin Pin */}
          <Marker position={originCoords} icon={userPinIcon}>
            <Tooltip direction="top" opacity={0.95}>
              <span className="text-xs font-bold text-slate-900">{originLabel}</span>
            </Tooltip>
          </Marker>

          {/* Hospital Pin */}
          {hospitalCoords && (
            <Marker position={hospitalCoords} icon={hospitalPinIcon}>
              <Tooltip direction="top" opacity={0.95}>
                <span className="text-xs font-bold text-slate-900">{hospitalName}</span>
              </Tooltip>
            </Marker>
          )}
        </MapContainer>
      </ErrorBoundary>
    </div>
  );
}
