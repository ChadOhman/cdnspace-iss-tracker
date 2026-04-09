"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useTelemetryStream } from "@/hooks/useTelemetryStream";
import { useLocale } from "@/context/LocaleContext";

// Keep at most 5400 points (90 min at ~1/sec)
const MAX_PATH_POINTS = 5400;

function formatSeconds(sec: number | null): string {
  if (sec === null) return "—";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
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
  const popupRef = useRef<any>(null);
  const pathHistoryRef = useRef<[number, number][]>([]);
  const initialCenteredRef = useRef(false);

  // Local state mirror for the info overlay (avoids re-renders on every tick
  // via the ref — we update a separate state at most once per second via the
  // orbital update from the hook, which is already throttled).
  const [displayOrbital, setDisplayOrbital] = useState(orbital);
  useEffect(() => {
    setDisplayOrbital(orbital);
  }, [orbital]);

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

      // Empty polyline for ground track
      const polyline = L.polyline([], {
        color: "#00e5ff",
        weight: 1.5,
        opacity: 0.7,
      }).addTo(map);

      mapInstanceRef.current = map;
      markerRef.current = marker;
      polylineRef.current = polyline;
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

    // Update polyline
    if (polylineRef.current) {
      polylineRef.current.setLatLngs(history);
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

        {/* Connection status */}
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6 }}>
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

              {/* Day/night */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ color: "var(--color-text-muted)", fontSize: 9, letterSpacing: "0.04em" }}>
                  {t("pages.dayNightStatus")}
                </span>
                <span style={{
                  color: displayOrbital.isInSunlight ? "var(--color-accent-yellow)" : "var(--color-accent-purple)",
                  fontSize: 10,
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
      </div>

      {/* Leaflet popup dark theme overrides — injected inline */}
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
