"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { useTelemetryStream } from "@/hooks/useTelemetryStream";
import { useBuildCheck } from "@/hooks/useBuildCheck";
import { useLocale } from "@/context/LocaleContext";
import { useUnits } from "@/context/UnitsContext";
import type { PassPrediction } from "@/lib/types";
import {
  connectTelescope,
  disconnectTelescope,
  getTelescopeState,
  slewToCoordinates,
  setTracking,
  abortSlew,
  type AlpacaState,
} from "@/lib/alpaca";
import { computeTopocentric, formatRA, formatDec, type TopocentricResult } from "@/lib/topocentric";

// ── Constants ────────────────────────────────────────────────────────────────

const MAX_PATH_POINTS = 5400;
const ISS_INCLINATION_DEG = 51.64;
const ORBITAL_PERIOD_SEC = 92 * 60 + 34; // ~5554 seconds
const EARTH_ROTATION_DEG_PER_SEC = 360 / 86400;
const FUTURE_STEP_SEC = 30;
const FUTURE_STEPS = (90 * 60) / FUTURE_STEP_SEC;

const TDRS_STATIONS = [
  { lon: -171, label: "TDRS-West" },
  { lon: -41,  label: "TDRS-East" },
  { lon: -150, label: "TDRS-Pacific" },
];

const EARTH_RADIUS_KM = 6371;

// ── Helper functions ─────────────────────────────────────────────────────────

function formatSeconds(sec: number | null): string {
  if (sec === null) return "—";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function formatLatLon(lat: number, lon: number): { latStr: string; lonStr: string } {
  const latStr = `${Math.abs(lat).toFixed(4)}° ${lat >= 0 ? "N" : "S"}`;
  const lonStr = `${Math.abs(lon).toFixed(4)}° ${lon >= 0 ? "E" : "W"}`;
  return { latStr, lonStr };
}

function formatAzimuth(deg: number): string {
  const dirs = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
                "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  const idx = Math.round(deg / 22.5) % 16;
  return `${Math.round(deg)}° ${dirs[idx]}`;
}

function formatPassTime(ts: number): string {
  return new Date(ts).toLocaleString(undefined, {
    month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function formatDuration(riseTs: number, setTs: number): string {
  const sec = Math.round((setTs - riseTs) / 1000);
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}m ${s}s`;
}

/** Haversine distance in km */
function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(a));
}

/**
 * Simplified elevation angle of ISS from observer.
 * Uses: atan2(alt_iss - R*(1-cos(sigma)), R*sin(sigma))
 * where sigma is the central angle between observer and sub-satellite point.
 */
function issElevationDeg(
  obsLat: number, obsLon: number,
  issLat: number, issLon: number,
  issAltKm: number
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const toDeg = (r: number) => (r * 180) / Math.PI;
  const sigma = toRad(haversineKm(obsLat, obsLon, issLat, issLon) / EARTH_RADIUS_KM * 180 / Math.PI);
  // rho = Earth central angle in radians
  const rho = 2 * Math.asin(Math.sqrt(
    Math.sin(toRad(issLat - obsLat) / 2) ** 2 +
    Math.cos(toRad(obsLat)) * Math.cos(toRad(issLat)) * Math.sin(toRad(issLon - obsLon) / 2) ** 2
  ));
  const R = EARTH_RADIUS_KM;
  const H = issAltKm;
  // Horizontal range from observer to ISS ground track
  const d_h = R * rho;
  const d_v = H;
  const elev = Math.atan2(d_v - R * (1 - Math.cos(rho)), d_h);
  return toDeg(elev);
}

// ── Sub-solar point & terminator helpers ─────────────────────────────────────

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

// Twilight bands (sun elevation below horizon).
// -6° civil, -12° nautical, -18° astronomical. Plus 0° (ground sunset).
const TWILIGHT_BANDS = [
  { elevDeg: 0, opacity: 0.08 },
  { elevDeg: -6, opacity: 0.1 },
  { elevDeg: -12, opacity: 0.12 },
  { elevDeg: -18, opacity: 0.12 },
];

/**
 * Find latitude at a given longitude where solar elevation equals elevRad.
 * Uses the general solar elevation formula and solves for lat.
 */
function terminatorLatAtLonAtElevation(
  lonDeg: number,
  subSolar: { lat: number; lon: number },
  elevRad: number
): number {
  const dec = (subSolar.lat * Math.PI) / 180;
  const H = ((lonDeg - subSolar.lon) * Math.PI) / 180;
  const a = Math.sin(dec);
  const b = Math.cos(dec) * Math.cos(H);
  const c = Math.sin(elevRad);
  const R = Math.sqrt(a * a + b * b);

  if (R < 1e-9) return 0;

  const ratio = c / R;
  if (ratio > 1) return -90;
  if (ratio < -1) return 90;

  const phi = Math.atan2(b, a);
  const lat1 = Math.asin(ratio) - phi;
  const lat2 = Math.PI - Math.asin(ratio) - phi;
  const norm = (x: number) => {
    while (x > Math.PI) x -= 2 * Math.PI;
    while (x < -Math.PI) x += 2 * Math.PI;
    return x;
  };
  const l1 = norm(lat1);
  const l2 = norm(lat2);
  return (Math.abs(l1) < Math.abs(l2) ? l1 : l2) * (180 / Math.PI);
}

/** Build a night polygon for a given solar elevation threshold. */
function buildNightPolygonAtElevation(
  subSolar: { lat: number; lon: number },
  elevDeg: number
): [number, number][] {
  const points: [number, number][] = [];
  const STEP = 2;
  const elevRad = (elevDeg * Math.PI) / 180;
  const terminatorPoints: [number, number][] = [];
  for (let lon = -180; lon <= 180; lon += STEP) {
    terminatorPoints.push([
      terminatorLatAtLonAtElevation(lon, subSolar, elevRad),
      lon,
    ]);
  }
  const southPoleInShadow = subSolar.lat > 0;
  if (southPoleInShadow) {
    points.push(...terminatorPoints);
    points.push([-90, 180]);
    points.push([-90, -180]);
  } else {
    points.push(...terminatorPoints);
    points.push([90, 180]);
    points.push([90, -180]);
  }
  return points;
}

function computeFutureTrack(
  lat: number, lon: number, steps: number, stepSec: number,
  pathHistory?: [number, number][]
): [number, number][] {
  const incRad = (ISS_INCLINATION_DEG * Math.PI) / 180;
  const omega = (2 * Math.PI) / ORBITAL_PERIOD_SEC;

  // Solve for initial orbital phase from current latitude
  const sinLat = Math.sin((lat * Math.PI) / 180);
  const clampedSin = Math.max(-1, Math.min(1, sinLat / Math.sin(incRad)));
  let phase = Math.asin(clampedSin);

  // If heading south, use the other half of the sine wave
  if (pathHistory && pathHistory.length >= 2) {
    const prev = pathHistory[pathHistory.length - 2];
    if (prev[0] > lat) phase = Math.PI - phase;
  }

  // Compute ascending node longitude from current position
  const lonOffset = Math.atan2(
    Math.cos(incRad) * Math.sin(phase),
    Math.cos(phase)
  ) * (180 / Math.PI);
  const ascendingNodeLon = lon - lonOffset;

  const points: [number, number][] = [];
  for (let i = 1; i <= steps; i++) {
    const dt = i * stepSec;
    const futurePhase = phase + omega * dt;

    const futureLat =
      Math.asin(Math.sin(incRad) * Math.sin(futurePhase)) * (180 / Math.PI);

    const futureNodeLon = ascendingNodeLon - EARTH_ROTATION_DEG_PER_SEC * dt;
    const futureLonOffset = Math.atan2(
      Math.cos(incRad) * Math.sin(futurePhase),
      Math.cos(futurePhase)
    ) * (180 / Math.PI);
    let futureLon = futureNodeLon + futureLonOffset;

    futureLon = ((futureLon + 540) % 360) - 180;
    points.push([futureLat, futureLon]);
  }
  return points;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function CardHeader({ title, badge }: { title: string; badge?: React.ReactNode }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "6px 10px",
      background: "var(--color-bg-panel-header)",
      borderBottom: "1px solid var(--color-border-accent)",
      borderRadius: "6px 6px 0 0",
    }}>
      <span style={{
        color: "var(--color-accent-cyan)",
        fontSize: 9,
        letterSpacing: "0.12em",
        fontFamily: "var(--font-jetbrains-mono)",
      }}>
        {title}
      </span>
      {badge}
    </div>
  );
}

function CardBody({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ padding: "8px 10px", ...style }}>
      {children}
    </div>
  );
}

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: "var(--color-bg-panel)",
      border: "1px solid var(--color-border-accent)",
      borderRadius: 6,
      flexShrink: 0,
      ...style,
    }}>
      {children}
    </div>
  );
}

function Row({ label, value, valueColor }: {
  label: string;
  value: string | React.ReactNode;
  valueColor?: string;
}) {
  return (
    <div style={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "baseline",
      marginBottom: 4,
    }}>
      <span style={{ color: "var(--color-text-muted)", fontSize: 9, letterSpacing: "0.04em" }}>
        {label}
      </span>
      <span style={{
        color: valueColor ?? "var(--color-text-primary)",
        fontSize: 10,
        fontVariantNumeric: "tabular-nums",
        fontFamily: "var(--font-jetbrains-mono)",
      }}>
        {value}
      </span>
    </div>
  );
}

function Divider() {
  return <div style={{ borderTop: "1px solid var(--color-border-subtle)", margin: "6px 0" }} />;
}

// ── Main component ────────────────────────────────────────────────────────────

export default function TrackPage() {
  useBuildCheck([]);
  const { t } = useLocale();
  const { distance: distConv, speed: speedConv } = useUnits();
  const { orbital, telemetry, connected } = useTelemetryStream();

  // ── Observer location ──────────────────────────────────────────────────────
  type ObserverLoc = { lat: number; lon: number; altitudeM?: number };
  const [observer, setObserver] = useState<ObserverLoc | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const stored = localStorage.getItem("iss-observer-loc");
      if (stored) return JSON.parse(stored) as ObserverLoc;
    } catch { /* ignore */ }
    return null;
  });
  const [obsInputLat, setObsInputLat] = useState(observer ? observer.lat.toString() : "");
  const [obsInputLon, setObsInputLon] = useState(observer ? observer.lon.toString() : "");
  const [altUnit, setAltUnit] = useState<"m" | "ft">(() => {
    if (typeof window === "undefined") return "m";
    return (localStorage.getItem("iss-observer-alt-unit") as "m" | "ft") || "m";
  });
  const [obsInputAlt, setObsInputAlt] = useState(() => {
    if (!observer?.altitudeM) return "";
    return altUnit === "ft"
      ? (observer.altitudeM * 3.28084).toFixed(0)
      : observer.altitudeM.toFixed(0);
  });
  const [geoError, setGeoError] = useState<string | null>(null);

  const persistObserver = useCallback((loc: ObserverLoc) => {
    setObserver(loc);
    setObsInputLat(loc.lat.toString());
    setObsInputLon(loc.lon.toString());
    try { localStorage.setItem("iss-observer-loc", JSON.stringify(loc)); } catch { /* ignore */ }
  }, []);

  const handleAltUnitChange = useCallback((unit: "m" | "ft") => {
    setAltUnit(unit);
    try { localStorage.setItem("iss-observer-alt-unit", unit); } catch { /* ignore */ }
    // Re-display the current altitude in the new unit
    if (observer?.altitudeM !== undefined) {
      setObsInputAlt(
        unit === "ft"
          ? (observer.altitudeM * 3.28084).toFixed(0)
          : observer.altitudeM.toFixed(0)
      );
    }
  }, [observer]);

  const handleUseMyLocation = useCallback(() => {
    setGeoError(null);
    if (!navigator.geolocation) {
      setGeoError("Geolocation not supported by this browser.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const altitudeM = typeof pos.coords.altitude === "number" && pos.coords.altitude !== null
          ? pos.coords.altitude
          : undefined;
        persistObserver({
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          altitudeM,
        });
        if (altitudeM !== undefined) {
          setObsInputAlt(
            altUnit === "ft"
              ? (altitudeM * 3.28084).toFixed(0)
              : altitudeM.toFixed(0)
          );
        }
      },
      (err) => setGeoError(err.message),
      { timeout: 10000, enableHighAccuracy: true }
    );
  }, [persistObserver, altUnit]);

  const handleManualSet = useCallback(() => {
    const lat = parseFloat(obsInputLat);
    const lon = parseFloat(obsInputLon);
    if (isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      setGeoError("Invalid coordinates.");
      return;
    }
    let altitudeM: number | undefined;
    if (obsInputAlt.trim() !== "") {
      const parsedAlt = parseFloat(obsInputAlt);
      if (isNaN(parsedAlt)) {
        setGeoError("Invalid altitude.");
        return;
      }
      // Convert to meters if user entered feet
      altitudeM = altUnit === "ft" ? parsedAlt / 3.28084 : parsedAlt;
    }
    setGeoError(null);
    persistObserver({ lat, lon, altitudeM });
  }, [obsInputLat, obsInputLon, obsInputAlt, altUnit, persistObserver]);

  // ── Pass predictions ───────────────────────────────────────────────────────
  const [passes, setPasses] = useState<PassPrediction[] | null>(null);
  const [passesLoading, setPassesLoading] = useState(false);
  const [passesError, setPassesError] = useState<string | null>(null);
  const lastObsKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!observer) return;
    const key = `${observer.lat.toFixed(4)},${observer.lon.toFixed(4)}`;
    if (key === lastObsKeyRef.current) return;
    lastObsKeyRef.current = key;

    setPassesLoading(true);
    setPassesError(null);
    // Honour the user's global pass-predictor minimum elevation preference
    // (set on the dashboard's Pass Predictions panel).
    let minElev = 10;
    try {
      const stored = window.localStorage.getItem("passPredictor.minElev");
      const parsed = stored ? parseInt(stored, 10) : NaN;
      if ([5, 10, 20].includes(parsed)) minElev = parsed;
    } catch { /* ignore */ }
    fetch(`/api/passes?lat=${observer.lat}&lon=${observer.lon}&minElev=${minElev}`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<PassPrediction[]>;
      })
      .then((data) => { setPasses(data.slice(0, 5)); setPassesLoading(false); })
      .catch((e: Error) => { setPassesError(e.message); setPassesLoading(false); });
  }, [observer]);

  // ── Observer-derived values ────────────────────────────────────────────────
  const obsValues = (() => {
    if (!observer || !orbital) return null;
    const distKm = haversineKm(observer.lat, observer.lon, orbital.lat, orbital.lon);
    const elevDeg = issElevationDeg(observer.lat, observer.lon, orbital.lat, orbital.lon, orbital.altitude);
    const aboveHorizon = elevDeg > 0;
    const visible = aboveHorizon && orbital.isInSunlight;
    return { distKm, elevDeg, aboveHorizon, visible };
  })();

  // ── Topocentric RA/Dec for telescope pointing ─────────────────────────────
  const topo: TopocentricResult | null = (() => {
    if (!observer || !orbital) return null;
    return computeTopocentric(
      { lat: orbital.lat, lon: orbital.lon, altitudeKm: orbital.altitude },
      { lat: observer.lat, lon: observer.lon, altitudeM: observer.altitudeM },
      Date.now()
    );
  })();

  // ── Telescope (ASCOM Alpaca) ───────────────────────────────────────────────
  const [telescopeHost, setTelescopeHost] = useState("192.168.1.100:11111");
  const [alpacaState, setAlpacaState] = useState<AlpacaState | null>(null);
  const [telescopeStatus, setTelescopeStatus] = useState<
    "disconnected" | "connecting" | "connected" | "slewing"
  >("disconnected");
  const [telescopeError, setTelescopeError] = useState<string | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  // Auto-follow: when enabled, continuously re-slew the telescope to the
  // ISS's current topocentric RA/Dec while it's above the horizon.
  const [autoFollow, setAutoFollow] = useState(false);
  const [autoFollowStatus, setAutoFollowStatus] = useState<
    "idle" | "waiting" | "following"
  >("idle");

  useEffect(() => {
    const stored = localStorage.getItem("alpaca_host");
    if (stored) setTelescopeHost(stored);
  }, []);

  const handleTelescopeConnect = useCallback(async () => {
    setTelescopeStatus("connecting");
    setTelescopeError(null);
    try {
      localStorage.setItem("alpaca_host", telescopeHost);
    } catch { /* ignore */ }
    try {
      await connectTelescope(telescopeHost);
      const state = await getTelescopeState(telescopeHost);
      setAlpacaState(state);
      setTelescopeStatus("connected");
      setIsTracking(state.tracking);
    } catch (err) {
      setTelescopeError(err instanceof Error ? err.message : String(err));
      setTelescopeStatus("disconnected");
    }
  }, [telescopeHost]);

  const handleTelescopeDisconnect = useCallback(async () => {
    try {
      await disconnectTelescope(telescopeHost);
    } catch { /* ignore */ }
    setAlpacaState(null);
    setTelescopeStatus("disconnected");
    setIsTracking(false);
  }, [telescopeHost]);

  const handleGoto = useCallback(async () => {
    if (telescopeStatus !== "connected" || !topo) return;
    setTelescopeStatus("slewing");
    setTelescopeError(null);
    try {
      await slewToCoordinates(telescopeHost, topo.ra, topo.dec);
      setTelescopeStatus("connected");
    } catch (err) {
      setTelescopeError(err instanceof Error ? err.message : String(err));
      setTelescopeStatus("connected");
    }
  }, [telescopeStatus, topo, telescopeHost]);

  const handleTrackToggle = useCallback(async () => {
    if (telescopeStatus !== "connected") return;
    const next = !isTracking;
    try {
      await setTracking(telescopeHost, next);
      setIsTracking(next);
    } catch (err) {
      setTelescopeError(err instanceof Error ? err.message : String(err));
    }
  }, [telescopeStatus, isTracking, telescopeHost]);

  const handleAbort = useCallback(async () => {
    try {
      await abortSlew(telescopeHost);
      setTelescopeStatus("connected");
    } catch (err) {
      setTelescopeError(err instanceof Error ? err.message : String(err));
    }
  }, [telescopeHost]);

  // ── Auto-follow loop ─────────────────────────────────────────────────────
  // Keep refs to the latest values so the interval callback doesn't close
  // over stale state.
  const orbitalRef = useRef(orbital);
  const observerRef = useRef(observer);
  const telescopeHostRef = useRef(telescopeHost);
  const telescopeStatusRef = useRef(telescopeStatus);
  useEffect(() => { orbitalRef.current = orbital; }, [orbital]);
  useEffect(() => { observerRef.current = observer; }, [observer]);
  useEffect(() => { telescopeHostRef.current = telescopeHost; }, [telescopeHost]);
  useEffect(() => { telescopeStatusRef.current = telescopeStatus; }, [telescopeStatus]);

  const handleAutoFollowToggle = useCallback(() => {
    setAutoFollow((prev) => !prev);
  }, []);

  useEffect(() => {
    if (!autoFollow) {
      setAutoFollowStatus("idle");
      return;
    }
    if (telescopeStatus === "disconnected") {
      // Can't follow if we're not connected. Keep the switch on so the
      // user sees it stays armed; just don't tick.
      setAutoFollowStatus("waiting");
      return;
    }

    // Re-slew every 2 seconds while the ISS is above 10° elevation.
    // Below that we stay idle so we don't spam the mount near the horizon.
    const MIN_ELEV_DEG = 10;
    const TICK_MS = 2000;
    let inFlight = false;

    const tick = async () => {
      if (inFlight) return;
      const orb = orbitalRef.current;
      const obs = observerRef.current;
      const host = telescopeHostRef.current;
      const status = telescopeStatusRef.current;
      if (!orb || !obs || status === "disconnected") {
        setAutoFollowStatus("waiting");
        return;
      }
      const t = computeTopocentric(
        { lat: orb.lat, lon: orb.lon, altitudeKm: orb.altitude },
        { lat: obs.lat, lon: obs.lon, altitudeM: obs.altitudeM },
        Date.now()
      );
      if (t.elevation < MIN_ELEV_DEG) {
        setAutoFollowStatus("waiting");
        return;
      }
      setAutoFollowStatus("following");
      inFlight = true;
      try {
        await slewToCoordinates(host, t.ra, t.dec);
      } catch (err) {
        setTelescopeError(err instanceof Error ? err.message : String(err));
      } finally {
        inFlight = false;
      }
    };

    // Fire once immediately, then on interval.
    tick();
    const id = setInterval(tick, TICK_MS);
    return () => clearInterval(id);
  }, [autoFollow, telescopeStatus]);

  // ── Leaflet refs ───────────────────────────────────────────────────────────
  const mapRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapInstanceRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markerRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const polylineRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const futurePolylineRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tdrsLayerRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const popupRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const obsMarkerRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const obsLineRef = useRef<any>(null);
  // Stacked twilight polygons (one per band) for fuzzy terminator
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const twilightPolygonRefs = useRef<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sunMarkerRef = useRef<any>(null);
  const terminatorIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pathHistoryRef = useRef<[number, number][]>([]);
  const initialCenteredRef = useRef(false);

  // ── Initialize Leaflet ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current) return;
    let cancelled = false;

    import("leaflet").then((L) => {
      if (cancelled || !mapRef.current || mapInstanceRef.current) return;
      // @ts-expect-error Leaflet attaches _leaflet_id
      if (mapRef.current._leaflet_id) return;

      const map = L.map(mapRef.current, {
        center: [0, 0],
        zoom: 1,
        zoomControl: true,
        attributionControl: true,
        scrollWheelZoom: true,
      });

      // Satellite imagery basemap
      L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        { maxZoom: 18, attribution: "Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community" }
      ).addTo(map);

      // Dark labels overlay (place names)
      L.tileLayer(
        "https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png",
        { maxZoom: 18, opacity: 0.8 }
      ).addTo(map);

      // Stacked twilight overlays — fuzzy terminator using multiple elevation bands
      const subSolar = getSubSolarPoint(new Date());
      const twilightPolygons = TWILIGHT_BANDS.map((band) => {
        const pts = buildNightPolygonAtElevation(subSolar, band.elevDeg);
        return L.polygon(pts as [number, number][], {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          color: "none" as any,
          stroke: false,
          fillColor: "#000",
          fillOpacity: band.opacity,
          interactive: false,
        }).addTo(map);
      });
      twilightPolygonRefs.current = twilightPolygons;

      // Sun marker
      const sunIcon = L.divIcon({
        className: "",
        html: `<div style="font-size:18px;line-height:1;text-shadow:0 0 8px rgba(255,220,0,0.9);">☀️</div>`,
        iconSize: [22, 22],
        iconAnchor: [11, 11],
      });
      const sunMarker = L.marker([subSolar.lat, subSolar.lon], {
        icon: sunIcon,
        interactive: false,
      }).addTo(map);

      // Update terminator every 60 seconds
      const terminatorInterval = setInterval(() => {
        if (!mapInstanceRef.current) return;
        const ss = getSubSolarPoint(new Date());
        TWILIGHT_BANDS.forEach((band, i) => {
          const pts = buildNightPolygonAtElevation(ss, band.elevDeg);
          twilightPolygonRefs.current[i]?.setLatLngs(pts as [number, number][]);
        });
        sunMarkerRef.current?.setLatLng([ss.lat, ss.lon]);
      }, 60_000);
      terminatorIntervalRef.current = terminatorInterval;

      // ISS marker (18px with glow)
      const issIcon = L.divIcon({
        className: "",
        html: `<div style="
          width:18px;height:18px;border-radius:50%;
          background:#ff3d3d;
          box-shadow:0 0 14px 6px rgba(255,61,61,0.7);
          border:2px solid #fff;
          cursor:pointer;
        "></div>`,
        iconSize: [18, 18],
        iconAnchor: [9, 9],
        popupAnchor: [0, -14],
      });
      const marker = L.marker([0, 0], { icon: issIcon }).addTo(map);
      const popup = L.popup({ closeButton: true, className: "iss-popup" });
      marker.bindPopup(popup);

      // Past ground track polyline (solid yellow)
      const polyline = L.polyline([], {
        color: "#ffd600", weight: 3, opacity: 0.9,
      }).addTo(map);

      // Future predicted track (dashed yellow)
      const futurePolyline = L.polyline([], {
        color: "#ffd600", weight: 2, opacity: 0.5, dashArray: "8 6",
      }).addTo(map);

      // TDRS footprints
      const tdrsGroup = L.layerGroup().addTo(map);
      TDRS_STATIONS.forEach(({ lon: tdrsLon, label }) => {
        const circle = L.circle([0, tdrsLon], {
          radius: 2_500_000,
          color: "#00e5ff", weight: 1, opacity: 0.2,
          fillColor: "#00e5ff", fillOpacity: 0.05,
        }).addTo(tdrsGroup);
        circle.bindTooltip(label, {
          permanent: true, direction: "center", className: "tdrs-label",
        });
      });

      mapInstanceRef.current = map;
      markerRef.current = marker;
      polylineRef.current = polyline;
      futurePolylineRef.current = futurePolyline;
      tdrsLayerRef.current = tdrsGroup;
      popupRef.current = popup;
      sunMarkerRef.current = sunMarker;
    });

    return () => { cancelled = true; };
  }, []);

  // Cleanup on unmount
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
        polylineRef.current = null;
        futurePolylineRef.current = null;
        tdrsLayerRef.current = null;
        popupRef.current = null;
        obsMarkerRef.current = null;
        obsLineRef.current = null;
        twilightPolygonRefs.current = [];
        sunMarkerRef.current = null;
      }
    };
  }, []);

  // ── Update ISS marker + track ──────────────────────────────────────────────
  useEffect(() => {
    if (!orbital || !markerRef.current || !mapInstanceRef.current) return;

    const latlng: [number, number] = [orbital.lat, orbital.lon];
    markerRef.current.setLatLng(latlng);

    if (popupRef.current) {
      const alt = distConv(orbital.altitude);
      const spd = speedConv(orbital.speedKmH);
      const { latStr, lonStr } = formatLatLon(orbital.lat, orbital.lon);
      popupRef.current.setContent(`
        <div style="font-family:monospace;font-size:11px;line-height:1.7;color:#e8f0fe;background:#0f1621;padding:4px 2px;">
          <div style="color:#00e5ff;font-size:10px;letter-spacing:.1em;margin-bottom:4px;">ISS POSITION</div>
          <div><span style="color:#94adc4">ALT</span> ${alt.value.toFixed(1)} ${alt.unit}</div>
          <div><span style="color:#94adc4">SPD</span> ${Math.round(spd.value).toLocaleString()} ${spd.unit}</div>
          <div><span style="color:#94adc4">LAT</span> ${latStr}</div>
          <div><span style="color:#94adc4">LON</span> ${lonStr}</div>
          <div><span style="color:#94adc4">ORB</span> ${orbital.revolutionNumber.toLocaleString()}</div>
          <div><span style="color:#94adc4">SUN</span> ${orbital.isInSunlight ? "☀ Sunlight" : "🌑 Shadow"}</div>
        </div>
      `);
    }

    if (!initialCenteredRef.current) {
      mapInstanceRef.current.setView(latlng, 2);
      initialCenteredRef.current = true;
    }

    const history = pathHistoryRef.current;
    history.push(latlng);
    if (history.length > MAX_PATH_POINTS) history.splice(0, history.length - MAX_PATH_POINTS);
    if (polylineRef.current) polylineRef.current.setLatLngs(history);

    if (futurePolylineRef.current) {
      const futurePoints = computeFutureTrack(orbital.lat, orbital.lon, FUTURE_STEPS, FUTURE_STEP_SEC, pathHistoryRef.current);
      // Split at antimeridian to prevent wrap-around lines
      const segments: [number, number][][] = [[]];
      for (let i = 0; i < futurePoints.length; i++) {
        if (i > 0 && Math.abs(futurePoints[i][1] - futurePoints[i - 1][1]) > 180) {
          segments.push([]);
        }
        segments[segments.length - 1].push(futurePoints[i]);
      }
      futurePolylineRef.current.setLatLngs(segments);
    }
  }, [orbital, distConv, speedConv]);

  // ── Update observer marker + line ─────────────────────────────────────────
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    import("leaflet").then((L) => {
      if (!observer) {
        if (obsMarkerRef.current) { obsMarkerRef.current.remove(); obsMarkerRef.current = null; }
        if (obsLineRef.current) { obsLineRef.current.remove(); obsLineRef.current = null; }
        return;
      }

      const obsLatLng: [number, number] = [observer.lat, observer.lon];

      if (!obsMarkerRef.current) {
        const obsIcon = L.divIcon({
          className: "",
          html: `<div style="
            width:12px;height:12px;border-radius:50%;
            background:#4fc3f7;
            box-shadow:0 0 8px 3px rgba(79,195,247,0.6);
            border:1.5px solid #fff;
          "></div>`,
          iconSize: [12, 12],
          iconAnchor: [6, 6],
        });
        obsMarkerRef.current = L.marker(obsLatLng, { icon: obsIcon }).addTo(mapInstanceRef.current);
        obsMarkerRef.current.bindTooltip("Observer", { className: "tdrs-label", direction: "top" });
      } else {
        obsMarkerRef.current.setLatLng(obsLatLng);
      }

      // Line from observer to ISS sub-point
      if (orbital) {
        const issLatLng: [number, number] = [orbital.lat, orbital.lon];
        if (!obsLineRef.current) {
          obsLineRef.current = L.polyline([obsLatLng, issLatLng], {
            color: "#ffffff", weight: 1, opacity: 0.4, dashArray: "4 4",
          }).addTo(mapInstanceRef.current);
        } else {
          obsLineRef.current.setLatLngs([obsLatLng, issLatLng]);
        }
      }
    });
  }, [observer, orbital]);

  // ── Render ─────────────────────────────────────────────────────────────────
  const altDisplay = orbital ? distConv(orbital.altitude) : null;
  const spdDisplay = orbital ? speedConv(orbital.speedKmH) : null;
  const periodMin = orbital ? Math.floor(orbital.period) : 0;
  const periodSec = orbital ? Math.round((orbital.period - periodMin) * 60) : 0;

  return (
    <div style={{
      width: "100vw",
      height: "100vh",
      background: "var(--color-bg-primary)",
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
      fontFamily: "var(--font-jetbrains-mono), monospace",
    }}>
      {/* ── Header ── */}
      <div style={{
        height: 48,
        flexShrink: 0,
        background: "rgba(0,0,0,0.6)",
        borderBottom: "1px solid rgba(0,229,255,0.2)",
        display: "flex",
        alignItems: "center",
        padding: "0 16px",
        gap: 16,
        zIndex: 1000,
      }}>
        <Link href="/" style={{
          color: "var(--color-accent-cyan)",
          textDecoration: "none",
          fontSize: 11,
          letterSpacing: "0.05em",
          border: "1px solid rgba(0,229,255,0.3)",
          padding: "2px 8px",
          borderRadius: 3,
          whiteSpace: "nowrap",
        }}>
          &larr; {t("pages.dashboard")}
        </Link>

        <span style={{
          color: "var(--color-accent-cyan)",
          fontSize: 13,
          letterSpacing: "0.1em",
          whiteSpace: "nowrap",
        }}>
          {t("pages.groundTrack")}
        </span>

        {orbital && (
          <div style={{
            display: "flex", gap: 14,
            fontSize: 10, color: "var(--color-text-muted)",
            fontVariantNumeric: "tabular-nums",
          }}>
            {altDisplay && (
              <span>
                <span style={{ color: "var(--color-accent-cyan)", marginRight: 3 }}>ALT</span>
                {Math.round(altDisplay.value)} {altDisplay.unit}
              </span>
            )}
            {spdDisplay && (
              <span>
                <span style={{ color: "var(--color-accent-cyan)", marginRight: 3 }}>SPD</span>
                {Math.round(spdDisplay.value).toLocaleString()} {spdDisplay.unit}
              </span>
            )}
            <span>{orbital.lat.toFixed(2)}°{orbital.lat >= 0 ? "N" : "S"}</span>
            <span>{orbital.lon.toFixed(2)}°{orbital.lon >= 0 ? "E" : "W"}</span>
          </div>
        )}

        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{
            width: 6, height: 6, borderRadius: "50%",
            background: connected ? "var(--color-accent-green)" : "var(--color-accent-red)",
            boxShadow: connected ? "0 0 6px var(--color-accent-green)" : "none",
          }} />
          <span style={{ color: "var(--color-text-muted)", fontSize: 10 }}>
            {connected ? t("pages.live") : t("pages.offline")}
          </span>
        </div>
      </div>

      {/* ── Body: two-column layout ── */}
      <div style={{
        flex: 1,
        display: "grid",
        gridTemplateColumns: "40% 60%",
        overflow: "hidden",
      }}>
        {/* ── Left column: data cards ── */}
        <div style={{
          overflowY: "auto",
          padding: "10px 8px 10px 10px",
          display: "flex",
          flexDirection: "column",
          gap: 8,
          borderRight: "1px solid var(--color-border-accent)",
        }}>

          {/* 1. Current Position Card */}
          <Card>
            <CardHeader title="CURRENT POSITION" badge={
              orbital ? (
                <span style={{
                  fontSize: 8, color: "var(--color-accent-green)",
                  letterSpacing: "0.08em",
                }}>LIVE</span>
              ) : null
            } />
            <CardBody>
              {orbital ? (() => {
                const { latStr, lonStr } = formatLatLon(orbital.lat, orbital.lon);
                const alt = distConv(orbital.altitude);
                const spd = speedConv(orbital.speedKmH);
                return (
                  <>
                    <Row label="LATITUDE"  value={latStr} />
                    <Row label="LONGITUDE" value={lonStr} />
                    <Divider />
                    <Row label="ALTITUDE"  value={`${alt.value.toFixed(1)} ${alt.unit}`} />
                    <Row label="SPEED"     value={`${Math.round(spd.value).toLocaleString()} ${spd.unit}`} />
                    <Row label="HEADING"   value={formatAzimuth(orbital.velocity > 0 ? 90 : 270)} />
                    <Divider />
                    <Row label="ORBIT #"   value={orbital.revolutionNumber.toLocaleString()} />
                    <Row label="BETA ANGLE" value={`${orbital.betaAngle.toFixed(1)}°`} />
                    <Row label="INCLINATION" value={`${orbital.inclination.toFixed(2)}°`} />
                  </>
                );
              })() : (
                <span style={{ fontSize: 10, color: "var(--color-text-muted)" }}>{t("common.loading")}</span>
              )}
            </CardBody>
          </Card>

          {/* 2. Orbital Elements Card */}
          <Card>
            <CardHeader title="ORBITAL ELEMENTS" />
            <CardBody>
              {orbital ? (() => {
                const apo = distConv(orbital.apoapsis);
                const peri = distConv(orbital.periapsis);
                return (
                  <>
                    <Row label="APOAPSIS"     value={`${apo.value.toFixed(1)} ${apo.unit}`} />
                    <Row label="PERIAPSIS"    value={`${peri.value.toFixed(1)} ${peri.unit}`} />
                    <Divider />
                    <Row label="INCLINATION"  value={`${orbital.inclination.toFixed(3)}°`} />
                    <Row label="ECCENTRICITY" value={orbital.eccentricity.toFixed(6)} />
                    <Row label="PERIOD"       value={`${periodMin}m ${periodSec}s`} />
                    <Row label="VELOCITY"     value={`${orbital.velocity.toFixed(3)} km/s`} />
                  </>
                );
              })() : (
                <span style={{ fontSize: 10, color: "var(--color-text-muted)" }}>{t("common.loading")}</span>
              )}
            </CardBody>
          </Card>

          {/* 3. Day/Night Status Card */}
          <Card>
            <CardHeader title="DAY / NIGHT STATUS" />
            <CardBody>
              {orbital ? (
                <>
                  <div style={{
                    display: "flex", alignItems: "center", gap: 8, marginBottom: 8,
                  }}>
                    <div style={{
                      width: 10, height: 10, borderRadius: "50%",
                      background: orbital.isInSunlight ? "#fbbf24" : "#818cf8",
                      boxShadow: orbital.isInSunlight
                        ? "0 0 8px 3px rgba(251,191,36,0.5)"
                        : "0 0 6px 2px rgba(129,140,248,0.4)",
                    }} />
                    <span style={{
                      color: orbital.isInSunlight ? "#fbbf24" : "#818cf8",
                      fontSize: 11, letterSpacing: "0.06em",
                    }}>
                      {orbital.isInSunlight ? t("pages.inDaylight") : t("pages.inShadow")}
                    </span>
                  </div>
                  {orbital.isInSunlight && orbital.sunsetIn !== null && (
                    <Row label={t("pages.sunsetIn")} value={formatSeconds(orbital.sunsetIn)} />
                  )}
                  {!orbital.isInSunlight && orbital.sunriseIn !== null && (
                    <Row label={t("pages.sunriseIn")} value={formatSeconds(orbital.sunriseIn)} />
                  )}
                  <Divider />
                  <Row label="BETA ANGLE" value={`${orbital.betaAngle.toFixed(1)}°`} />
                  <div style={{ fontSize: 9, color: "var(--color-text-muted)", marginTop: 4, lineHeight: 1.5 }}>
                    {Math.abs(orbital.betaAngle) > 60
                      ? "High beta — long eclipse-free periods"
                      : Math.abs(orbital.betaAngle) > 30
                        ? "Moderate beta — normal eclipse cycles"
                        : "Low beta — frequent short eclipses"}
                  </div>
                </>
              ) : (
                <span style={{ fontSize: 10, color: "var(--color-text-muted)" }}>{t("common.loading")}</span>
              )}
            </CardBody>
          </Card>

          {/* 4. Observer Location Card */}
          <Card>
            <CardHeader title="OBSERVER LOCATION" />
            <CardBody>
              <button
                onClick={handleUseMyLocation}
                style={{
                  width: "100%",
                  padding: "5px 0",
                  background: "rgba(0,229,255,0.08)",
                  border: "1px solid rgba(0,229,255,0.3)",
                  borderRadius: 3,
                  color: "var(--color-accent-cyan)",
                  fontSize: 10,
                  letterSpacing: "0.06em",
                  cursor: "pointer",
                  fontFamily: "var(--font-jetbrains-mono), monospace",
                  marginBottom: 8,
                }}
              >
                ⊕ USE MY LOCATION
              </button>

              <div style={{ display: "flex", gap: 4, marginBottom: 8 }}>
                <input
                  type="text"
                  placeholder="Lat (e.g. 43.65)"
                  value={obsInputLat}
                  onChange={(e) => setObsInputLat(e.target.value)}
                  style={{
                    flex: 1, padding: "4px 6px",
                    background: "#0d1117",
                    border: "1px solid rgba(0,229,255,0.2)",
                    borderRadius: 3,
                    color: "var(--color-text-primary)",
                    fontSize: 10,
                    fontFamily: "var(--font-jetbrains-mono), monospace",
                    outline: "none",
                  }}
                />
                <input
                  type="text"
                  placeholder="Lon (e.g. -79.38)"
                  value={obsInputLon}
                  onChange={(e) => setObsInputLon(e.target.value)}
                  style={{
                    flex: 1, padding: "4px 6px",
                    background: "#0d1117",
                    border: "1px solid rgba(0,229,255,0.2)",
                    borderRadius: 3,
                    color: "var(--color-text-primary)",
                    fontSize: 10,
                    fontFamily: "var(--font-jetbrains-mono), monospace",
                    outline: "none",
                  }}
                />
                <button
                  onClick={handleManualSet}
                  style={{
                    padding: "4px 8px",
                    background: "rgba(0,229,255,0.08)",
                    border: "1px solid rgba(0,229,255,0.3)",
                    borderRadius: 3,
                    color: "var(--color-accent-cyan)",
                    fontSize: 9,
                    cursor: "pointer",
                    fontFamily: "var(--font-jetbrains-mono), monospace",
                    whiteSpace: "nowrap",
                  }}
                >
                  SET
                </button>
              </div>

              {/* Altitude input with unit selector */}
              <div style={{ display: "flex", gap: 4, marginBottom: 8, alignItems: "center" }}>
                <span style={{
                  fontSize: 9,
                  color: "var(--color-text-muted)",
                  letterSpacing: "0.06em",
                  minWidth: 54,
                }}>
                  ALTITUDE
                </span>
                <input
                  type="text"
                  placeholder={altUnit === "ft" ? "e.g. 2300" : "e.g. 700"}
                  value={obsInputAlt}
                  onChange={(e) => setObsInputAlt(e.target.value)}
                  style={{
                    flex: 1, padding: "4px 6px",
                    background: "#0d1117",
                    border: "1px solid rgba(0,229,255,0.2)",
                    borderRadius: 3,
                    color: "var(--color-text-primary)",
                    fontSize: 10,
                    fontFamily: "var(--font-jetbrains-mono), monospace",
                    outline: "none",
                  }}
                />
                <div style={{ display: "flex", gap: 0 }}>
                  <button
                    onClick={() => handleAltUnitChange("m")}
                    style={{
                      padding: "4px 8px",
                      background: altUnit === "m" ? "rgba(0,229,255,0.15)" : "transparent",
                      border: `1px solid ${altUnit === "m" ? "var(--color-accent-cyan)" : "rgba(0,229,255,0.2)"}`,
                      borderRight: "none",
                      borderRadius: "3px 0 0 3px",
                      color: altUnit === "m" ? "var(--color-accent-cyan)" : "var(--color-text-muted)",
                      fontSize: 9,
                      cursor: "pointer",
                      fontFamily: "var(--font-jetbrains-mono), monospace",
                      fontWeight: altUnit === "m" ? 700 : 400,
                    }}
                  >
                    m
                  </button>
                  <button
                    onClick={() => handleAltUnitChange("ft")}
                    style={{
                      padding: "4px 8px",
                      background: altUnit === "ft" ? "rgba(0,229,255,0.15)" : "transparent",
                      border: `1px solid ${altUnit === "ft" ? "var(--color-accent-cyan)" : "rgba(0,229,255,0.2)"}`,
                      borderRadius: "0 3px 3px 0",
                      color: altUnit === "ft" ? "var(--color-accent-cyan)" : "var(--color-text-muted)",
                      fontSize: 9,
                      cursor: "pointer",
                      fontFamily: "var(--font-jetbrains-mono), monospace",
                      fontWeight: altUnit === "ft" ? 700 : 400,
                    }}
                  >
                    ft
                  </button>
                </div>
              </div>

              {geoError && (
                <div style={{ fontSize: 9, color: "var(--color-accent-red)", marginBottom: 6 }}>
                  {geoError}
                </div>
              )}

              {observer && (
                <>
                  <Divider />
                  <Row
                    label="OBSERVER"
                    value={`${observer.lat.toFixed(3)}° ${observer.lat >= 0 ? "N" : "S"}, ${Math.abs(observer.lon).toFixed(3)}° ${observer.lon >= 0 ? "E" : "W"}`}
                  />
                  {obsValues && (
                    <>
                      {(() => {
                        const d = distConv(obsValues.distKm);
                        return <Row label="DIST TO ISS TRACK" value={`${Math.round(d.value).toLocaleString()} ${d.unit}`} />;
                      })()}
                      <Row
                        label="ELEVATION"
                        value={`${obsValues.elevDeg.toFixed(1)}°`}
                        valueColor={obsValues.aboveHorizon ? "var(--color-accent-green)" : "var(--color-text-muted)"}
                      />
                      <Row
                        label="VISIBLE NOW"
                        value={obsValues.visible ? "YES" : "NO"}
                        valueColor={obsValues.visible ? "var(--color-accent-green)" : "var(--color-text-muted)"}
                      />
                    </>
                  )}
                </>
              )}
            </CardBody>
          </Card>

          {/* Telescope Control Card (ASCOM Alpaca) */}
          <Card>
            <CardHeader title="TELESCOPE CONTROL" badge={
              <span style={{ fontSize: 8, color: "var(--color-text-muted)" }}>ASCOM ALPACA</span>
            } />
            <CardBody>
              <p style={{ fontSize: 10, color: "var(--color-text-muted)", marginBottom: 10, lineHeight: 1.5 }}>
                Point any ASCOM Alpaca-compatible telescope at the ISS. Works with the ASCOM Platform (Windows), INDIGO (macOS/Linux), or direct Alpaca servers (Celestron, Sky-Watcher, iOptron, SeeStar, etc.).
              </p>

              {/* Connection form */}
              <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
                <input
                  type="text"
                  value={telescopeHost}
                  onChange={(e) => setTelescopeHost(e.target.value)}
                  placeholder="host:port (e.g. 192.168.1.100:11111)"
                  disabled={telescopeStatus !== "disconnected"}
                  style={{
                    flex: 1,
                    padding: "5px 8px",
                    background: "var(--color-bg-secondary)",
                    border: "1px solid var(--color-border-subtle)",
                    borderRadius: 3,
                    color: "var(--color-text-primary)",
                    fontFamily: "var(--font-jetbrains-mono, monospace)",
                    fontSize: 10,
                  }}
                />
                {telescopeStatus === "disconnected" ? (
                  <button
                    onClick={handleTelescopeConnect}
                    style={{
                      padding: "5px 12px",
                      background: "rgba(0,229,255,0.15)",
                      border: "1px solid var(--color-accent-cyan)",
                      borderRadius: 3,
                      color: "var(--color-accent-cyan)",
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: "0.05em",
                      cursor: "pointer",
                      fontFamily: "inherit",
                    }}
                  >
                    CONNECT
                  </button>
                ) : (
                  <button
                    onClick={handleTelescopeDisconnect}
                    style={{
                      padding: "5px 12px",
                      background: "rgba(255,61,61,0.15)",
                      border: "1px solid var(--color-accent-red)",
                      borderRadius: 3,
                      color: "var(--color-accent-red)",
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: "0.05em",
                      cursor: "pointer",
                      fontFamily: "inherit",
                    }}
                  >
                    DISCONNECT
                  </button>
                )}
              </div>

              {/* Status indicator */}
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "5px 8px",
                background: "var(--color-bg-secondary)",
                border: "1px solid var(--color-border-subtle)",
                borderRadius: 3,
                marginBottom: 8,
              }}>
                <div
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background:
                      telescopeStatus === "connected" ? "#00ff88" :
                      telescopeStatus === "slewing"   ? "#00e5ff" :
                      telescopeStatus === "connecting" ? "#ffaa00" :
                      "#444",
                    boxShadow: telescopeStatus !== "disconnected"
                      ? `0 0 6px 1px ${
                          telescopeStatus === "connected" ? "#00ff88" :
                          telescopeStatus === "slewing" ? "#00e5ff" :
                          "#ffaa00"
                        }`
                      : "none",
                  }}
                />
                <span style={{ fontSize: 10, color: "var(--color-text-primary)", fontWeight: 600, letterSpacing: "0.1em" }}>
                  {telescopeStatus.toUpperCase()}
                </span>
                {alpacaState?.slewing && telescopeStatus !== "slewing" && (
                  <span style={{ fontSize: 9, color: "var(--color-accent-cyan)", marginLeft: "auto" }}>
                    SLEWING
                  </span>
                )}
              </div>

              {/* Topocentric position readout */}
              {topo && telescopeStatus !== "disconnected" && (
                <div style={{ marginBottom: 8, fontSize: 10, color: "var(--color-text-muted)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>RA</span>
                    <span style={{ color: "var(--color-accent-cyan)", fontVariantNumeric: "tabular-nums" }}>
                      {formatRA(topo.ra)}
                    </span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>Dec</span>
                    <span style={{ color: "var(--color-accent-cyan)", fontVariantNumeric: "tabular-nums" }}>
                      {formatDec(topo.dec)}
                    </span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>Elevation</span>
                    <span style={{
                      color: topo.elevation > 10 ? "var(--color-accent-green)" : topo.elevation > 0 ? "var(--color-accent-orange)" : "var(--color-text-muted)",
                      fontVariantNumeric: "tabular-nums",
                    }}>
                      {topo.elevation.toFixed(1)}°
                    </span>
                  </div>
                </div>
              )}

              {/* Error message */}
              {telescopeError && (
                <div style={{
                  padding: "4px 6px",
                  background: "rgba(255,61,61,0.1)",
                  border: "1px solid rgba(255,61,61,0.3)",
                  borderRadius: 3,
                  color: "var(--color-accent-red)",
                  fontSize: 9,
                  marginBottom: 8,
                  fontFamily: "var(--font-jetbrains-mono, monospace)",
                }}>
                  {telescopeError}
                </div>
              )}

              {/* Action buttons */}
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <button
                  onClick={handleGoto}
                  disabled={telescopeStatus !== "connected" || !topo}
                  style={{
                    flex: 1,
                    padding: "5px 8px",
                    background: telescopeStatus === "connected" && topo ? "rgba(0,255,136,0.15)" : "var(--color-bg-secondary)",
                    border: `1px solid ${telescopeStatus === "connected" && topo ? "var(--color-accent-green)" : "var(--color-border-subtle)"}`,
                    borderRadius: 3,
                    color: telescopeStatus === "connected" && topo ? "var(--color-accent-green)" : "var(--color-text-muted)",
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: "0.05em",
                    cursor: telescopeStatus === "connected" && topo ? "pointer" : "not-allowed",
                    fontFamily: "inherit",
                  }}
                >
                  GOTO ISS
                </button>
                <button
                  onClick={handleTrackToggle}
                  disabled={telescopeStatus !== "connected"}
                  style={{
                    flex: 1,
                    padding: "5px 8px",
                    background: isTracking ? "rgba(255,140,0,0.15)" : "rgba(0,229,255,0.15)",
                    border: `1px solid ${isTracking ? "var(--color-accent-orange)" : "var(--color-accent-cyan)"}`,
                    borderRadius: 3,
                    color: isTracking ? "var(--color-accent-orange)" : "var(--color-accent-cyan)",
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: "0.05em",
                    cursor: telescopeStatus === "connected" ? "pointer" : "not-allowed",
                    opacity: telescopeStatus === "connected" ? 1 : 0.4,
                    fontFamily: "inherit",
                  }}
                >
                  {isTracking ? "STOP TRACK" : "TRACK"}
                </button>
                <button
                  onClick={handleAutoFollowToggle}
                  disabled={telescopeStatus === "disconnected"}
                  title="Continuously re-slew the telescope to follow the ISS while it's above 10° elevation. Telescope tracking should also be enabled."
                  style={{
                    flex: 1,
                    padding: "5px 8px",
                    background: autoFollow ? "rgba(0,255,136,0.20)" : "var(--color-bg-secondary)",
                    border: `1px solid ${autoFollow ? "var(--color-accent-green)" : "var(--color-border-subtle)"}`,
                    borderRadius: 3,
                    color: autoFollow ? "var(--color-accent-green)" : "var(--color-text-muted)",
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: "0.05em",
                    cursor: telescopeStatus !== "disconnected" ? "pointer" : "not-allowed",
                    opacity: telescopeStatus !== "disconnected" ? 1 : 0.4,
                    fontFamily: "inherit",
                  }}
                >
                  {autoFollow
                    ? autoFollowStatus === "following"
                      ? "FOLLOW ●"
                      : "FOLLOW …"
                    : "FOLLOW"}
                </button>
                <button
                  onClick={handleAbort}
                  disabled={telescopeStatus === "disconnected"}
                  style={{
                    flex: 1,
                    padding: "5px 8px",
                    background: "rgba(255,61,61,0.15)",
                    border: "1px solid var(--color-accent-red)",
                    borderRadius: 3,
                    color: "var(--color-accent-red)",
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: "0.05em",
                    cursor: telescopeStatus !== "disconnected" ? "pointer" : "not-allowed",
                    opacity: telescopeStatus !== "disconnected" ? 1 : 0.4,
                    fontFamily: "inherit",
                  }}
                >
                  ABORT
                </button>
              </div>
              {autoFollow && (
                <div style={{ fontSize: 9, color: "var(--color-text-muted)", marginTop: 4 }}>
                  {autoFollowStatus === "following"
                    ? "Auto-follow active — re-slewing every 2s"
                    : autoFollowStatus === "waiting"
                      ? "Auto-follow armed — waiting for ISS above 10° elevation"
                      : "Auto-follow idle"}
                </div>
              )}
            </CardBody>
          </Card>

          {/* 5. Next Passes Card */}
          <Card>
            <CardHeader title="NEXT PASSES" badge={
              observer
                ? <span style={{ fontSize: 8, color: "var(--color-text-muted)" }}>
                    {observer.lat.toFixed(2)}°, {observer.lon.toFixed(2)}°
                  </span>
                : null
            } />
            <CardBody>
              {!observer ? (
                <span style={{ fontSize: 10, color: "var(--color-text-muted)" }}>
                  Set observer location above to see upcoming passes.
                </span>
              ) : passesLoading ? (
                <span style={{ fontSize: 10, color: "var(--color-text-muted)" }}>Computing passes…</span>
              ) : passesError ? (
                <span style={{ fontSize: 9, color: "var(--color-accent-red)" }}>Error: {passesError}</span>
              ) : passes && passes.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {passes.map((p, i) => {
                    const isBright = p.magnitude < -2;
                    return (
                      <div key={i} style={{
                        background: isBright ? "rgba(255,214,0,0.06)" : "rgba(255,255,255,0.02)",
                        border: `1px solid ${isBright ? "rgba(255,214,0,0.25)" : "var(--color-border-subtle)"}`,
                        borderRadius: 4,
                        padding: "6px 8px",
                      }}>
                        <div style={{
                          display: "flex", justifyContent: "space-between",
                          alignItems: "center", marginBottom: 3,
                        }}>
                          <span style={{
                            fontSize: 10,
                            color: isBright ? "var(--color-accent-yellow)" : "var(--color-text-primary)",
                            letterSpacing: "0.04em",
                          }}>
                            {isBright ? "★ " : ""}{formatPassTime(p.riseTime)}
                          </span>
                          <span style={{
                            fontSize: 9,
                            background: p.quality === "bright" ? "rgba(255,214,0,0.15)" :
                                        p.quality === "good" ? "rgba(0,255,136,0.1)" :
                                        "rgba(148,173,196,0.1)",
                            color: p.quality === "bright" ? "var(--color-accent-yellow)" :
                                   p.quality === "good" ? "var(--color-accent-green)" :
                                   "var(--color-text-muted)",
                            padding: "1px 5px", borderRadius: 2,
                            letterSpacing: "0.06em",
                          }}>
                            {p.quality.toUpperCase()}
                          </span>
                        </div>
                        <div style={{ display: "flex", gap: 12, fontSize: 9, color: "var(--color-text-muted)" }}>
                          <span>MAX <span style={{ color: "var(--color-text-primary)" }}>{p.maxElevation.toFixed(0)}°</span></span>
                          <span>DUR <span style={{ color: "var(--color-text-primary)" }}>{formatDuration(p.riseTime, p.setTime)}</span></span>
                          <span>MAG <span style={{ color: "var(--color-text-primary)" }}>{p.magnitude.toFixed(1)}</span></span>
                        </div>
                        <div style={{ fontSize: 8, color: "var(--color-text-muted)", marginTop: 2 }}>
                          Rise {formatAzimuth(p.riseAzimuth)} → Set {formatAzimuth(p.setAzimuth)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <span style={{ fontSize: 10, color: "var(--color-text-muted)" }}>No passes found.</span>
              )}
            </CardBody>
          </Card>

          {/* 6. ISS Systems Summary Card */}
          {telemetry && (
            <Card>
              <CardHeader title="SYSTEMS SUMMARY" />
              <CardBody>
                <Row label="POWER GEN"    value={`${telemetry.powerKw.toFixed(1)} kW`} />
                <Row label="ATT MODE"     value={telemetry.attitudeMode} />
                <Row label="STATION MODE" value={telemetry.attitude.stationMode} />
                <Row label="CABIN TEMP"   value={`${telemetry.temperatureC.toFixed(1)} °C`} />
                <Row label="CABIN PRES"   value={`${telemetry.pressurePsi.toFixed(2)} psi`} />
                <Row label="O₂ CONC"      value={`${telemetry.oxygenPercent.toFixed(1)}%`} />
              </CardBody>
            </Card>
          )}
        </div>

        {/* ── Right column: map ── */}
        <div style={{ position: "relative", overflow: "hidden" }}>
          <div ref={mapRef} style={{ width: "100%", height: "100%" }} />

          {/* Map legend (bottom-right) */}
          <div style={{
            position: "absolute", bottom: 24, right: 16,
            zIndex: 900,
            background: "rgba(13,17,23,0.85)",
            border: "1px solid rgba(0,229,255,0.15)",
            borderRadius: 4, padding: "7px 10px",
            backdropFilter: "blur(4px)",
            fontSize: 9, color: "var(--color-text-muted)",
            fontFamily: "var(--font-jetbrains-mono), monospace",
            pointerEvents: "none",
            display: "flex", flexDirection: "column", gap: 4,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#ff3d3d", boxShadow: "0 0 6px rgba(255,61,61,0.6)", border: "1px solid #fff" }} />
              <span>ISS</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <svg width="20" height="6">
                <line x1="0" y1="3" x2="20" y2="3" stroke="#00e5ff" strokeWidth="2.5" strokeOpacity="0.8" />
              </svg>
              <span>Past track</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <svg width="20" height="6">
                <line x1="0" y1="3" x2="20" y2="3" stroke="#ffd600" strokeWidth="2" strokeOpacity="0.6" strokeDasharray="4 3" />
              </svg>
              <span>Future track (~90 min)</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <svg width="20" height="12">
                <ellipse cx="10" cy="6" rx="8" ry="5" stroke="#00e5ff" strokeWidth="1" strokeOpacity="0.2" fill="#00e5ff" fillOpacity="0.05" />
              </svg>
              <span>TDRS coverage</span>
            </div>
            {observer && (
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#4fc3f7", border: "1px solid #fff" }} />
                <span>Observer</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Leaflet CSS overrides */}
      <style>{`
        .leaflet-popup-content-wrapper {
          background: #0f1621 !important;
          border: 1px solid rgba(0,229,255,0.25) !important;
          border-radius: 4px !important;
          box-shadow: 0 0 16px rgba(0,229,255,0.15) !important;
          color: #e8f0fe !important;
        }
        .leaflet-popup-tip { background: #0f1621 !important; }
        .leaflet-popup-content { margin: 8px 12px !important; }
        .tdrs-label {
          background: rgba(13,17,23,0.75) !important;
          border: 1px solid rgba(0,229,255,0.2) !important;
          border-radius: 3px !important;
          color: rgba(0,229,255,0.6) !important;
          font-family: var(--font-jetbrains-mono), monospace !important;
          font-size: 9px !important;
          letter-spacing: 0.06em !important;
          padding: 2px 5px !important;
          white-space: nowrap !important;
          box-shadow: none !important;
        }
        .tdrs-label::before { display: none !important; }
      `}</style>
    </div>
  );
}
