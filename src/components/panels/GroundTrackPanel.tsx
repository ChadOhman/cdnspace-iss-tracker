"use client";

import { useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import PanelFrame from "@/components/shared/PanelFrame";
import type { OrbitalState } from "@/lib/types";
import { useLocale } from "@/context/LocaleContext";

// ── Sub-solar point & terminator helpers ──────────────────────────────────────

function getSubSolarPoint(date: Date): { lat: number; lon: number } {
  const jd = date.getTime() / 86400000 + 2440587.5;
  const T = (jd - 2451545.0) / 36525;
  const L = (280.46646 + 36000.76983 * T) % 360;
  const M = (357.52911 + 35999.05029 * T) % 360;
  const Mrad = M * Math.PI / 180;
  const C = 1.9146 * Math.sin(Mrad) + 0.02 * Math.sin(2 * Mrad);
  const sunLon = (L + C) * Math.PI / 180;
  const obliq = (23.439 - 0.013 * T) * Math.PI / 180;
  const lat = Math.asin(Math.sin(obliq) * Math.sin(sunLon)) * 180 / Math.PI;
  const JD0 = Math.floor(jd - 0.5) + 0.5;
  const UT = (jd - JD0) * 24;
  const GMST = (6.697375 + 0.0657098242 * (JD0 - 2451545) + 1.00273791 * UT) % 24;
  const sunRA = Math.atan2(Math.cos(obliq) * Math.sin(sunLon), Math.cos(sunLon)) * 180 / Math.PI;
  const lon = sunRA - GMST * 15;
  return { lat, lon: ((lon + 540) % 360) - 180 };
}

function getTerminatorPolygon(subSolar: { lat: number; lon: number }): [number, number][] {
  const points: [number, number][] = [];
  const latRad = subSolar.lat * Math.PI / 180;
  const lonRad = subSolar.lon * Math.PI / 180;
  for (let i = 0; i <= 360; i += 2) {
    const bearing = i * Math.PI / 180;
    const angDist = Math.PI / 2;
    const lat2 = Math.asin(
      Math.sin(latRad) * Math.cos(angDist) +
      Math.cos(latRad) * Math.sin(angDist) * Math.cos(bearing)
    );
    const lon2 = lonRad + Math.atan2(
      Math.sin(bearing) * Math.sin(angDist) * Math.cos(latRad),
      Math.cos(angDist) - Math.sin(latRad) * Math.sin(lat2)
    );
    points.push([lat2 * 180 / Math.PI, ((lon2 * 180 / Math.PI) + 540) % 360 - 180]);
  }
  return points;
}

interface GroundTrackPanelProps {
  orbital: OrbitalState | null;
}

// ISS orbital parameters for future track prediction
const ISS_INCLINATION_DEG = 51.64;
const ORBITAL_PERIOD_SEC = 92 * 60 + 34; // ~5554 seconds
// Earth rotates 360°/86400s = 0.00417°/s. ISS ground track longitude
// shifts westward at this rate as Earth rotates beneath the orbit.
const EARTH_ROTATION_DEG_PER_SEC = 360 / 86400;
const FUTURE_STEPS = 180; // 180 steps × 30s = 90 minutes
const FUTURE_STEP_SEC = 30;
const MAX_PATH_POINTS = 5400; // 90 minutes at 1 point/sec

export default function GroundTrackPanel({ orbital }: GroundTrackPanelProps) {
  const { t } = useLocale();
  const mapRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapInstanceRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markerRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pastPolylineRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const futurePolylineRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const nightPolygonRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sunMarkerRef = useRef<any>(null);
  const terminatorIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pathHistoryRef = useRef<[number, number][]>([]);
  const initialCenteredRef = useRef(false);

  // Compute predicted future track from current position
  const computeFutureTrack = useCallback(
    (lat: number, lon: number): [number, number][] => {
      const incRad = (ISS_INCLINATION_DEG * Math.PI) / 180;
      const omega = (2 * Math.PI) / ORBITAL_PERIOD_SEC; // orbital angular velocity

      // Solve for initial orbital phase from current latitude
      const sinLat = Math.sin((lat * Math.PI) / 180);
      const clampedSin = Math.max(-1, Math.min(1, sinLat / Math.sin(incRad)));
      let phase = Math.asin(clampedSin);
      // If heading south (lat decreasing), use the other half of the sine wave
      if (pathHistoryRef.current.length >= 2) {
        const prev = pathHistoryRef.current[pathHistoryRef.current.length - 2];
        if (prev[0] > lat) phase = Math.PI - phase;
      }

      // Compute the longitude of the ascending node from current position
      // The ground track longitude at any phase is:
      //   lon = ascending_node_lon + atan2(cos(inc)*sin(phase), cos(phase))
      // So ascending_node_lon = lon - atan2(cos(inc)*sin(phase), cos(phase))
      const lonOffset = Math.atan2(
        Math.cos(incRad) * Math.sin(phase),
        Math.cos(phase)
      ) * (180 / Math.PI);
      const ascendingNodeLon = lon - lonOffset;

      const points: [number, number][] = [];
      for (let i = 1; i <= FUTURE_STEPS; i++) {
        const dt = i * FUTURE_STEP_SEC;
        const futurePhase = phase + omega * dt;

        // Latitude from orbital phase
        const futureLat =
          Math.asin(Math.sin(incRad) * Math.sin(futurePhase)) *
          (180 / Math.PI);

        // Longitude: ascending node drifts west due to Earth rotation
        const futureNodeLon = ascendingNodeLon - EARTH_ROTATION_DEG_PER_SEC * dt;
        const futureLonOffset = Math.atan2(
          Math.cos(incRad) * Math.sin(futurePhase),
          Math.cos(futurePhase)
        ) * (180 / Math.PI);
        let futureLon = futureNodeLon + futureLonOffset;

        // Normalize to -180..180
        futureLon = ((futureLon + 540) % 360) - 180;
        points.push([futureLat, futureLon]);
      }
      return points;
    },
    []
  );

  // Initialize Leaflet map
  useEffect(() => {
    if (!mapRef.current) return;
    if (mapInstanceRef.current) return;

    let cancelled = false;

    import("leaflet").then((L) => {
      if (cancelled || !mapRef.current || mapInstanceRef.current) return;
      // @ts-expect-error Leaflet attaches _leaflet_id
      if (mapRef.current._leaflet_id) return;

      const map = L.map(mapRef.current, {
        center: [20, 0],
        zoom: 1,
        zoomControl: true,
        attributionControl: false,
        scrollWheelZoom: true,
        worldCopyJump: true,
      });

      // Satellite imagery basemap
      L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        { maxZoom: 18, attribution: "Tiles © Esri" }
      ).addTo(map);

      // Dark labels overlay (place names)
      L.tileLayer(
        "https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png",
        { maxZoom: 18, opacity: 0.8 }
      ).addTo(map);

      // Night-side terminator overlay
      const subSolar = getSubSolarPoint(new Date());
      const nightPoints = getTerminatorPolygon(subSolar);
      const nightPolygon = L.polygon(nightPoints as [number, number][], {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        color: "none" as any,
        fillColor: "#000",
        fillOpacity: 0.35,
        interactive: false,
      }).addTo(map);

      // Sun marker
      const sunIcon = L.divIcon({
        className: "",
        html: `<div style="font-size:16px;line-height:1;text-shadow:0 0 6px rgba(255,220,0,0.9);">☀️</div>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10],
      });
      const sunMarker = L.marker([subSolar.lat, subSolar.lon], {
        icon: sunIcon,
        interactive: false,
      }).addTo(map);

      // Update terminator every 60 seconds
      const terminatorInterval = setInterval(() => {
        if (!mapInstanceRef.current) return;
        const ss = getSubSolarPoint(new Date());
        const np = getTerminatorPolygon(ss);
        nightPolygonRef.current?.setLatLngs(np as [number, number][]);
        sunMarkerRef.current?.setLatLng([ss.lat, ss.lon]);
      }, 60_000);
      terminatorIntervalRef.current = terminatorInterval;

      // Past ground track polyline (solid yellow)
      const pastPolyline = L.polyline([], {
        color: "#ffd600",
        weight: 3,
        opacity: 0.9,
      }).addTo(map);

      // Future predicted track (dashed yellow)
      const futurePolyline = L.polyline([], {
        color: "#ffd600",
        weight: 2,
        opacity: 0.5,
        dashArray: "8 6",
      }).addTo(map);

      // ISS marker (18px with glow)
      const issIcon = L.divIcon({
        className: "",
        html: `<div style="
          width:18px;height:18px;border-radius:50%;
          background:var(--color-accent-red,#ff3d3d);
          box-shadow:0 0 12px 5px rgba(255,61,61,0.7);
          border:2px solid #fff;
        "></div>`,
        iconSize: [18, 18],
        iconAnchor: [9, 9],
      });

      const marker = L.marker([0, 0], { icon: issIcon }).addTo(map);

      mapInstanceRef.current = map;
      markerRef.current = marker;
      pastPolylineRef.current = pastPolyline;
      futurePolylineRef.current = futurePolyline;
      nightPolygonRef.current = nightPolygon;
      sunMarkerRef.current = sunMarker;
      initialCenteredRef.current = false;
      pathHistoryRef.current = [];
    });

    return () => {
      cancelled = true;
    };
  }, []);

  // Cleanup on unmount or mode switch
  useEffect(() => {
    return () => {
      if (terminatorIntervalRef.current) {
        clearInterval(terminatorIntervalRef.current);
        terminatorIntervalRef.current = null;
      }
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markerRef.current = null;
        pastPolylineRef.current = null;
        futurePolylineRef.current = null;
        nightPolygonRef.current = null;
        sunMarkerRef.current = null;
      }
    };
  }, []);

  // Update marker, past track, and future track on each orbital update
  useEffect(() => {
    if (!orbital || !markerRef.current || !mapInstanceRef.current) return;

    const latlng: [number, number] = [orbital.lat, orbital.lon];
    markerRef.current.setLatLng(latlng);

    // Center map only on first fix
    if (!initialCenteredRef.current) {
      mapInstanceRef.current.setView([20, 0], 1);
      initialCenteredRef.current = true;
    }

    // Accumulate past path
    const path = pathHistoryRef.current;
    // Avoid duplicate points
    if (
      path.length === 0 ||
      path[path.length - 1][0] !== orbital.lat ||
      path[path.length - 1][1] !== orbital.lon
    ) {
      path.push(latlng);
      if (path.length > MAX_PATH_POINTS) path.shift();
    }

    // Update past polyline — split at antimeridian crossings to avoid wrapping lines
    if (pastPolylineRef.current) {
      const segments = splitAtAntimeridian(path);
      pastPolylineRef.current.setLatLngs(segments);
    }

    // Update future polyline
    if (futurePolylineRef.current) {
      const future = computeFutureTrack(orbital.lat, orbital.lon);
      const segments = splitAtAntimeridian(future);
      futurePolylineRef.current.setLatLngs(segments);
    }
  }, [orbital, computeFutureTrack]);

  const headerRight = (
    <Link
      href="/track"
      style={{
        padding: "1px 7px",
        borderRadius: 3,
        border: "1px solid rgba(0,229,255,0.3)",
        background: "rgba(0,229,255,0.08)",
        color: "var(--color-accent-cyan)",
        fontSize: 9,
        fontFamily: "inherit",
        textDecoration: "none",
        fontWeight: 600,
        letterSpacing: "0.05em",
      }}
    >
      TRACK ↗
    </Link>
  );

  return (
    <PanelFrame
      title={t("panels.groundTrack").toUpperCase()}
      icon="🗺️"
      accentColor="var(--color-accent-cyan)"
      headerRight={headerRight}
      bodyClassName=""
    >
      <div
        ref={mapRef}
        style={{ height: 240, width: "100%", borderRadius: 4 }}
      />
    </PanelFrame>
  );
}

/**
 * Split a path into segments at antimeridian crossings (|Δlon| > 180)
 * to prevent Leaflet from drawing lines across the whole map.
 */
function splitAtAntimeridian(
  path: [number, number][]
): [number, number][][] {
  if (path.length < 2) return [path];
  const segments: [number, number][][] = [];
  let current: [number, number][] = [path[0]];

  for (let i = 1; i < path.length; i++) {
    const prevLon = path[i - 1][1];
    const curLon = path[i][1];
    if (Math.abs(curLon - prevLon) > 180) {
      // Antimeridian crossing — start a new segment
      segments.push(current);
      current = [];
    }
    current.push(path[i]);
  }
  if (current.length > 0) segments.push(current);
  return segments;
}
