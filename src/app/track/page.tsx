"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { useTelemetryStream } from "@/hooks/useTelemetryStream";
import { useLocale } from "@/context/LocaleContext";

// Keep at most 5400 points (90 min at ~1/sec)
const MAX_PATH_POINTS = 5400;

// ISS orbital inclination in degrees
const ISS_INCLINATION_DEG = 51.6;
// Approx orbital period in seconds
const ORBITAL_PERIOD_SEC = 92.68 * 60; // ~5561 s
// Approx lon shift per orbit (westward, degrees)
const LON_SHIFT_PER_ORBIT_DEG = -22.9;
// Future track steps: every 30s for 90 minutes
const FUTURE_STEP_SEC = 30;
const FUTURE_STEPS = (90 * 60) / FUTURE_STEP_SEC; // 180 steps

// TDRS geostationary satellite positions (lon, label)
const TDRS_STATIONS = [
  { lon: -171, label: "TDRS-West" },
  { lon: -41, label: "TDRS-East" },
  { lon: -150, label: "TDRS-Pacific" },
];

function formatSeconds(sec: number | null): string {
  if (sec === null) return "—";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

/**
 * Simple sinusoidal great-circle extrapolation of ISS ground track.
 * Given a known lat/lon at t=0 and the orbital angular velocity, project
 * forward in `stepSec` increments for `steps` steps.
 *
 * The ISS latitude follows:  lat(t) = incl * sin(ω·t + φ₀)
 * where φ₀ is chosen so that lat(0) == currentLat.
 * Longitude advances uniformly at the Earth's surface rate minus Earth's rotation.
 */
function computeFutureTrack(
  lat: number,
  lon: number,
  steps: number,
  stepSec: number
): [number, number][] {
  const points: [number, number][] = [];

  // Angular frequency of the orbit (rad/s)
  const omega = (2 * Math.PI) / ORBITAL_PERIOD_SEC;

  // Solve for initial phase: lat = incl * sin(φ₀)  →  φ₀ = asin(clamp(lat/incl))
  const clampedRatio = Math.max(-1, Math.min(1, lat / ISS_INCLINATION_DEG));
  const phi0 = Math.asin(clampedRatio);

  // Lon rate: orbital period / 360° minus Earth rotation
  // ISS moves ~360°/92.68min eastward while Earth rotates ~360°/1440min
  // Net westward ground track per second:
  const lonRatePerSec = LON_SHIFT_PER_ORBIT_DEG / ORBITAL_PERIOD_SEC;

  for (let i = 1; i <= steps; i++) {
    const t = i * stepSec;
    const futureLat = ISS_INCLINATION_DEG * Math.sin(omega * t + phi0);
    let futureLon = lon + lonRatePerSec * t;
    // Normalize lon to [-180, 180]
    futureLon = ((futureLon + 180) % 360 + 360) % 360 - 180;
    points.push([futureLat, futureLon]);
  }

  return points;
}

export default function TrackPage() {
  const { t } = useLocale();
  const { orbital, connected } = useTelemetryStream();

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
  const pathHistoryRef = useRef<[number, number][]>([]);
  const initialCenteredRef = useRef(false);

  const [isFullscreen, setIsFullscreen] = useState(false);

  // Local state mirror for the info overlay (avoids re-renders on every tick
  // via the ref — we update a separate state at most once per second via the
  // orbital update from the hook, which is already throttled).
  const [displayOrbital, setDisplayOrbital] = useState(orbital);
  useEffect(() => {
    setDisplayOrbital(orbital);
  }, [orbital]);

  // ── Fullscreen toggle ────────────────────────────────────────────────────
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }, []);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  // ── Initialize Leaflet map ───────────────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current) return;
    let cancelled = false;

    import("leaflet").then((L) => {
      if (cancelled || !mapRef.current || mapInstanceRef.current) return;
      // @ts-expect-error Leaflet attaches _leaflet_id
      if (mapRef.current._leaflet_id) return;

      const map = L.map(mapRef.current, {
        center: [0, 0],
        zoom: 2,
        zoomControl: true,
        attributionControl: true,
        scrollWheelZoom: true,
      });

      L.tileLayer(
        "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
        { maxZoom: 18, attribution: "&copy; OpenStreetMap &copy; CARTO" }
      ).addTo(map);

      const issIcon = L.divIcon({
        className: "",
        html: `<div style="
          width:18px;height:18px;border-radius:50%;
          background:var(--color-accent-red,#ff3d3d);
          box-shadow:0 0 12px 5px rgba(255,61,61,0.7);
          border:2px solid #fff;
          cursor:pointer;
        "></div>`,
        iconSize: [18, 18],
        iconAnchor: [9, 9],
        popupAnchor: [0, -12],
      });

      const marker = L.marker([0, 0], { icon: issIcon }).addTo(map);

      // ISS popup — content will be updated each tick
      const popup = L.popup({ closeButton: true, className: "iss-popup" });
      marker.bindPopup(popup);

      // ── Historical ground track polyline ─────────────────────────────────
      const polyline = L.polyline([], {
        color: "#00e5ff",
        weight: 1.5,
        opacity: 0.7,
      }).addTo(map);

      // ── Predicted future track: dashed cyan at 50% opacity ───────────────
      const futurePolyline = L.polyline([], {
        color: "#00e5ff",
        weight: 1.5,
        opacity: 0.5,
        dashArray: "6 6",
      }).addTo(map);

      // ── TDRS ground station footprints ────────────────────────────────────
      // Each TDRS is geostationary; we draw a circle centered on the equator
      // at the satellite's sub-satellite longitude with ~2500km radius.
      const tdrsGroup = L.layerGroup().addTo(map);
      TDRS_STATIONS.forEach(({ lon: tdrsLon, label }) => {
        const circle = L.circle([0, tdrsLon], {
          radius: 2_500_000, // 2500 km in metres
          color: "#00e5ff",
          weight: 1,
          opacity: 0.2,
          fillColor: "#00e5ff",
          fillOpacity: 0.05,
        }).addTo(tdrsGroup);

        circle.bindTooltip(label, {
          permanent: true,
          direction: "center",
          className: "tdrs-label",
        });
      });

      mapInstanceRef.current = map;
      markerRef.current = marker;
      polylineRef.current = polyline;
      futurePolylineRef.current = futurePolyline;
      tdrsLayerRef.current = tdrsGroup;
      popupRef.current = popup;
    });

    return () => {
      cancelled = true;
    };
  }, []);

  // ── Cleanup on unmount ───────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markerRef.current = null;
        polylineRef.current = null;
        futurePolylineRef.current = null;
        tdrsLayerRef.current = null;
        popupRef.current = null;
      }
    };
  }, []);

  // ── Update marker + ground track on each orbital tick ───────────────────
  useEffect(() => {
    if (!orbital || !markerRef.current || !mapInstanceRef.current) return;

    const latlng: [number, number] = [orbital.lat, orbital.lon];

    // Move marker
    markerRef.current.setLatLng(latlng);

    // Update popup content (only refreshes if popup is open)
    if (popupRef.current) {
      popupRef.current.setContent(`
        <div style="font-family:monospace;font-size:11px;line-height:1.7;color:#e8f0fe;background:#0f1621;padding:4px 2px;">
          <div style="color:#00e5ff;font-size:10px;letter-spacing:.1em;margin-bottom:4px;">ISS POSITION</div>
          <div><span style="color:#94adc4">ALT</span> ${Math.round(orbital.altitude)} km</div>
          <div><span style="color:#94adc4">SPD</span> ${Math.round(orbital.speedKmH).toLocaleString()} km/h</div>
          <div><span style="color:#94adc4">LAT</span> ${orbital.lat.toFixed(4)}&deg;</div>
          <div><span style="color:#94adc4">LON</span> ${orbital.lon.toFixed(4)}&deg;</div>
          <div><span style="color:#94adc4">ORB</span> ${orbital.revolutionNumber.toLocaleString()}</div>
        </div>
      `);
    }

    // First fix — center the map once
    if (!initialCenteredRef.current) {
      mapInstanceRef.current.setView(latlng, 2);
      initialCenteredRef.current = true;
    }

    // Accumulate path history — handle anti-meridian wrapping by NOT
    // splitting here; Leaflet's polyline handles wrap reasonably at zoom 2.
    const history = pathHistoryRef.current;
    history.push(latlng);
    if (history.length > MAX_PATH_POINTS) {
      history.splice(0, history.length - MAX_PATH_POINTS);
    }

    // Update historical polyline
    if (polylineRef.current) {
      polylineRef.current.setLatLngs(history);
    }

    // Update predicted future track
    if (futurePolylineRef.current) {
      const futurePoints = computeFutureTrack(
        orbital.lat,
        orbital.lon,
        FUTURE_STEPS,
        FUTURE_STEP_SEC
      );
      futurePolylineRef.current.setLatLngs(futurePoints);
    }
  }, [orbital]);

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div style={{
      width: "100vw",
      height: "100vh",
      background: "var(--color-bg-primary)",
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
    }}>
      {/* ── Header bar ── */}
      <div style={{
        height: 48,
        background: "rgba(0,0,0,0.6)",
        borderBottom: "1px solid rgba(0,229,255,0.2)",
        display: "flex",
        alignItems: "center",
        padding: "0 16px",
        gap: 16,
        zIndex: 1000,
        flexShrink: 0,
      }}>
        <Link href="/" style={{
          color: "var(--color-accent-cyan)",
          textDecoration: "none",
          fontSize: 11,
          fontFamily: "var(--font-jetbrains-mono)",
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
          fontFamily: "var(--font-jetbrains-mono)",
          letterSpacing: "0.1em",
          whiteSpace: "nowrap",
        }}>
          {t("pages.groundTrack")}
        </span>

        {/* Quick orbital readout in header */}
        {orbital && (
          <div style={{
            display: "flex",
            gap: 16,
            fontSize: 10,
            color: "var(--color-text-muted)",
            fontFamily: "var(--font-jetbrains-mono)",
            fontVariantNumeric: "tabular-nums",
            marginLeft: 4,
          }}>
            <span>
              <span style={{ color: "var(--color-accent-cyan)", marginRight: 3 }}>ALT</span>
              {Math.round(orbital.altitude)} km
            </span>
            <span>
              <span style={{ color: "var(--color-accent-cyan)", marginRight: 3 }}>SPD</span>
              {Math.round(orbital.speedKmH).toLocaleString()} km/h
            </span>
            <span>{orbital.lat.toFixed(2)}&deg;N</span>
            <span>{orbital.lon.toFixed(2)}&deg;E</span>
          </div>
        )}

        {/* Spacer */}
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }}>
          {/* Connection status */}
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{
              width: 6, height: 6, borderRadius: "50%",
              background: connected ? "var(--color-accent-green)" : "var(--color-accent-red)",
              boxShadow: connected ? "0 0 6px var(--color-accent-green)" : "none",
            }} />
            <span style={{
              color: "var(--color-text-muted)",
              fontSize: 10,
              fontFamily: "var(--font-jetbrains-mono)",
            }}>
              {connected ? t("pages.live") : t("pages.offline")}
            </span>
          </div>

          {/* Fullscreen toggle button */}
          <button
            onClick={toggleFullscreen}
            title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
            style={{
              background: "transparent",
              border: "1px solid rgba(0,229,255,0.3)",
              borderRadius: 3,
              color: "var(--color-accent-cyan)",
              cursor: "pointer",
              padding: "2px 7px",
              fontSize: 14,
              lineHeight: 1,
              fontFamily: "inherit",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {isFullscreen ? "⊠" : "⛶"}
          </button>
        </div>
      </div>

      {/* ── Map container (relative so overlay can position inside) ── */}
      <div style={{ flex: 1, position: "relative" }}>
        <div ref={mapRef} style={{ width: "100%", height: "100%" }} />

        {/* ── Info overlay (bottom-left) ── */}
        <div style={{
          position: "absolute",
          bottom: 24,
          left: 16,
          zIndex: 900,
          background: "rgba(13,17,23,0.88)",
          border: "1px solid rgba(0,229,255,0.2)",
          borderRadius: 5,
          padding: "10px 14px",
          minWidth: 200,
          backdropFilter: "blur(4px)",
          fontFamily: "var(--font-jetbrains-mono)",
          pointerEvents: "none",
        }}>
          <div style={{
            fontSize: 9,
            color: "var(--color-accent-cyan)",
            letterSpacing: "0.12em",
            marginBottom: 6,
            borderBottom: "1px solid rgba(0,229,255,0.12)",
            paddingBottom: 4,
          }}>
            ISS STATUS
          </div>

          {displayOrbital ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 3, fontSize: 11 }}>
              {/* Altitude + speed */}
              <InfoRow label="ALT" value={`${Math.round(displayOrbital.altitude)} km`} />
              <InfoRow label="SPD" value={`${Math.round(displayOrbital.speedKmH).toLocaleString()} km/h`} />
              <InfoRow label="LAT" value={`${displayOrbital.lat.toFixed(4)}\u00b0`} />
              <InfoRow label="LON" value={`${displayOrbital.lon.toFixed(4)}\u00b0`} />

              <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", margin: "4px 0" }} />

              {/* Orbit + period */}
              <InfoRow label={t("pages.orbitNumber")} value={displayOrbital.revolutionNumber.toLocaleString()} />
              <InfoRow label={t("pages.period")} value={`${displayOrbital.period.toFixed(1)} min`} />

              <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", margin: "4px 0" }} />

              {/* Day/night — color-coded */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ color: "var(--color-text-muted)", fontSize: 9, letterSpacing: "0.04em" }}>
                  {t("pages.dayNightStatus")}
                </span>
                <span style={{
                  color: displayOrbital.isInSunlight
                    ? "#fbbf24"  // warm yellow for daylight
                    : "#818cf8", // indigo/violet for shadow
                  fontSize: 10,
                  fontWeight: 600,
                }}>
                  {displayOrbital.isInSunlight ? t("pages.inDaylight") : t("pages.inShadow")}
                </span>
              </div>

              {displayOrbital.isInSunlight && displayOrbital.sunsetIn !== null && (
                <InfoRow label={t("pages.sunsetIn")} value={formatSeconds(displayOrbital.sunsetIn)} />
              )}
              {!displayOrbital.isInSunlight && displayOrbital.sunriseIn !== null && (
                <InfoRow label={t("pages.sunriseIn")} value={formatSeconds(displayOrbital.sunriseIn)} />
              )}

              <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", margin: "4px 0" }} />

              {/* Path history count */}
              <InfoRow
                label={t("pages.pathHistory")}
                value={`${Math.min(pathHistoryRef.current.length, MAX_PATH_POINTS)} pts`}
                muted
              />
            </div>
          ) : (
            <div style={{ fontSize: 10, color: "var(--color-text-muted)" }}>
              {t("common.loading")}
            </div>
          )}
        </div>

        {/* ── Map legend (bottom-right) ── */}
        <div style={{
          position: "absolute",
          bottom: 24,
          right: 16,
          zIndex: 900,
          background: "rgba(13,17,23,0.80)",
          border: "1px solid rgba(0,229,255,0.15)",
          borderRadius: 4,
          padding: "7px 10px",
          backdropFilter: "blur(4px)",
          fontFamily: "var(--font-jetbrains-mono)",
          fontSize: 9,
          color: "var(--color-text-muted)",
          pointerEvents: "none",
          display: "flex",
          flexDirection: "column",
          gap: 4,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <svg width="20" height="6">
              <line x1="0" y1="3" x2="20" y2="3" stroke="#00e5ff" strokeWidth="1.5" strokeOpacity="0.7" />
            </svg>
            <span>Ground track</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <svg width="20" height="6">
              <line x1="0" y1="3" x2="20" y2="3" stroke="#00e5ff" strokeWidth="1.5" strokeOpacity="0.5" strokeDasharray="4 3" />
            </svg>
            <span>Predicted orbit (~90 min)</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <svg width="20" height="12">
              <ellipse cx="10" cy="6" rx="8" ry="5" stroke="#00e5ff" strokeWidth="1" strokeOpacity="0.2" fill="#00e5ff" fillOpacity="0.05" />
            </svg>
            <span>TDRS coverage</span>
          </div>
        </div>
      </div>

      {/* Leaflet popup + TDRS label dark theme overrides — injected inline */}
      <style>{`
        .leaflet-popup-content-wrapper {
          background: #0f1621 !important;
          border: 1px solid rgba(0,229,255,0.25) !important;
          border-radius: 4px !important;
          box-shadow: 0 0 16px rgba(0,229,255,0.15) !important;
          color: #e8f0fe !important;
        }
        .leaflet-popup-tip {
          background: #0f1621 !important;
        }
        .leaflet-popup-content {
          margin: 8px 12px !important;
        }
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
        .tdrs-label::before {
          display: none !important;
        }
      `}</style>
    </div>
  );
}

// ── Small helper component (defined outside main to avoid re-declaration) ────

function InfoRow({
  label,
  value,
  muted,
}: {
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
      <span style={{ color: "var(--color-text-muted)", fontSize: 9, letterSpacing: "0.04em" }}>
        {label}
      </span>
      <span style={{
        color: muted ? "var(--color-text-muted)" : "var(--color-text-primary)",
        fontSize: 10,
        fontVariantNumeric: "tabular-nums",
      }}>
        {value}
      </span>
    </div>
  );
}
