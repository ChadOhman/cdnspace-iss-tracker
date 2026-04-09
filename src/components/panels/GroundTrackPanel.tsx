"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import PanelFrame from "@/components/shared/PanelFrame";
import type { OrbitalState } from "@/lib/types";
import { useLocale } from "@/context/LocaleContext";

function Globe3DLoader() {
  const { t } = useLocale();
  return (
    <div
      style={{
        height: 240,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "var(--color-text-muted)",
        fontSize: 11,
      }}
    >
      {t("ground.loading3DGlobe")}
    </div>
  );
}

const Globe3D = dynamic(() => import("@/components/panels/Globe3D"), {
  ssr: false,
  loading: () => <Globe3DLoader />,
});

interface GroundTrackPanelProps {
  orbital: OrbitalState | null;
}

// ISS orbital parameters for future track prediction
const ISS_INCLINATION_DEG = 51.64;
const ORBITAL_PERIOD_SEC = 92 * 60 + 34;
const LON_SHIFT_PER_ORBIT_DEG = 22.9;
const FUTURE_STEPS = 180; // 180 steps × 30s = 90 minutes
const FUTURE_STEP_SEC = 30;
const MAX_PATH_POINTS = 5400; // 90 minutes at 1 point/sec

export default function GroundTrackPanel({ orbital }: GroundTrackPanelProps) {
  const { t } = useLocale();
  const [mode3D, setMode3D] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapInstanceRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markerRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pastPolylineRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const futurePolylineRef = useRef<any>(null);
  const pathHistoryRef = useRef<[number, number][]>([]);
  const initialCenteredRef = useRef(false);

  // Compute predicted future track from current position
  const computeFutureTrack = useCallback(
    (lat: number, lon: number): [number, number][] => {
      const incRad = (ISS_INCLINATION_DEG * Math.PI) / 180;
      const omega = (2 * Math.PI) / ORBITAL_PERIOD_SEC;
      const lonRate = LON_SHIFT_PER_ORBIT_DEG / ORBITAL_PERIOD_SEC;

      // Solve for initial phase from current latitude
      const sinLat = Math.sin((lat * Math.PI) / 180);
      const clampedSin = Math.max(-1, Math.min(1, sinLat / Math.sin(incRad)));
      let phase = Math.asin(clampedSin);
      // If heading south (lat decreasing), use the other half of the sine wave
      if (pathHistoryRef.current.length >= 2) {
        const prev = pathHistoryRef.current[pathHistoryRef.current.length - 2];
        if (prev[0] > lat) phase = Math.PI - phase;
      }

      const points: [number, number][] = [];
      for (let i = 1; i <= FUTURE_STEPS; i++) {
        const dt = i * FUTURE_STEP_SEC;
        const futureLat =
          Math.asin(Math.sin(incRad) * Math.sin(phase + omega * dt)) *
          (180 / Math.PI);
        let futureLon = lon - lonRate * dt;
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
    if (mode3D || !mapRef.current) return;
    if (mapInstanceRef.current) return;

    let cancelled = false;

    import("leaflet").then((L) => {
      if (cancelled || !mapRef.current || mapInstanceRef.current) return;
      // @ts-expect-error Leaflet attaches _leaflet_id
      if (mapRef.current._leaflet_id) return;

      const map = L.map(mapRef.current, {
        center: [20, 0],
        zoom: 2,
        zoomControl: true,
        attributionControl: false,
        scrollWheelZoom: true,
        worldCopyJump: true,
      });

      L.tileLayer(
        "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
        { maxZoom: 18 }
      ).addTo(map);

      // Past ground track polyline (solid cyan)
      const pastPolyline = L.polyline([], {
        color: "#00e5ff",
        weight: 2,
        opacity: 0.6,
      }).addTo(map);

      // Future predicted track (dashed cyan)
      const futurePolyline = L.polyline([], {
        color: "#00e5ff",
        weight: 1.5,
        opacity: 0.35,
        dashArray: "6, 6",
      }).addTo(map);

      // ISS marker
      const issIcon = L.divIcon({
        className: "",
        html: `<div style="
          width:14px;height:14px;border-radius:50%;
          background:var(--color-accent-red,#ff3d3d);
          box-shadow:0 0 10px 4px rgba(255,61,61,0.7);
          border:2px solid #fff;
        "></div>`,
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      });

      const marker = L.marker([0, 0], { icon: issIcon }).addTo(map);

      mapInstanceRef.current = map;
      markerRef.current = marker;
      pastPolylineRef.current = pastPolyline;
      futurePolylineRef.current = futurePolyline;
      initialCenteredRef.current = false;
      pathHistoryRef.current = [];
    });

    return () => {
      cancelled = true;
    };
  }, [mode3D]);

  // Cleanup on unmount or mode switch
  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markerRef.current = null;
        pastPolylineRef.current = null;
        futurePolylineRef.current = null;
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
      mapInstanceRef.current.setView(latlng, 3);
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

  const toggle = (
    <div style={{ display: "flex", gap: 4 }}>
      {(["2D", "3D"] as const).map((m) => (
        <button
          key={m}
          onClick={() => setMode3D(m === "3D")}
          style={{
            padding: "1px 7px",
            borderRadius: 3,
            border:
              (m === "3D") === mode3D
                ? "1px solid var(--color-accent-cyan)"
                : "1px solid var(--color-border-accent)",
            background:
              (m === "3D") === mode3D
                ? "rgba(0,229,255,0.15)"
                : "transparent",
            color:
              (m === "3D") === mode3D
                ? "var(--color-accent-cyan)"
                : "var(--color-text-muted)",
            cursor: "pointer",
            fontSize: 9,
            fontFamily: "inherit",
          }}
        >
          {m}
        </button>
      ))}
    </div>
  );

  return (
    <PanelFrame
      title={t("panels.groundTrack").toUpperCase()}
      icon="🗺️"
      accentColor="var(--color-accent-cyan)"
      headerRight={toggle}
      bodyClassName=""
    >
      {mode3D ? (
        <Globe3D orbital={orbital} width={560} height={240} />
      ) : (
        <div
          ref={mapRef}
          style={{ height: 240, width: "100%", borderRadius: 4 }}
        />
      )}
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
