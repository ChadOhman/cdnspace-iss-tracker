"use client";

import { useEffect, useRef } from "react";
import { useTelemetryStream } from "@/hooks/useTelemetryStream";
import type { OrbitalState } from "@/lib/types";

// ── Leaflet types ────────────────────────────────────────────────────────────
declare const L: typeof import("leaflet");

const ISS_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#00e5ff" stroke-width="2"><circle cx="12" cy="12" r="3"/><line x1="3" y1="12" x2="9" y2="12"/><line x1="15" y1="12" x2="21" y2="12"/><line x1="12" y1="3" x2="12" y2="9"/><line x1="12" y1="15" x2="12" y2="21"/></svg>`;

export default function EmbedPage() {
  const stream = useTelemetryStream(true);
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const trailRef = useRef<L.Polyline | null>(null);
  const trailPoints = useRef<[number, number][]>([]);
  const prevOrbital = useRef<OrbitalState | null>(null);

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || leafletMap.current) return;
    if (typeof L === "undefined") return;

    const map = L.map(mapRef.current, {
      center: [0, 0],
      zoom: 2,
      zoomControl: false,
      attributionControl: false,
      minZoom: 1,
      maxZoom: 6,
      worldCopyJump: true,
    });

    L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png",
      { subdomains: "abcd", maxZoom: 19 }
    ).addTo(map);

    const icon = L.divIcon({
      html: ISS_ICON_SVG,
      className: "",
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    });

    markerRef.current = L.marker([0, 0], { icon }).addTo(map);

    trailRef.current = L.polyline([], {
      color: "#00e5ff",
      weight: 1.5,
      opacity: 0.5,
    }).addTo(map);

    leafletMap.current = map;

    return () => {
      map.remove();
      leafletMap.current = null;
    };
  }, []);

  // Update marker position
  useEffect(() => {
    const orbital = stream.orbital;
    if (!orbital || !markerRef.current || !trailRef.current) return;

    const pos: [number, number] = [orbital.lat, orbital.lon];
    markerRef.current.setLatLng(pos);

    // Add to trail (limit to ~2 orbits of points)
    const prev = prevOrbital.current;
    if (!prev || Math.abs(orbital.lon - prev.lon) < 90) {
      trailPoints.current.push(pos);
      if (trailPoints.current.length > 12000) {
        trailPoints.current = trailPoints.current.slice(-6000);
      }
      trailRef.current.setLatLngs(trailPoints.current);
    } else {
      // Orbit wrap — start a new segment
      trailPoints.current = [pos];
      trailRef.current.setLatLngs(trailPoints.current);
    }

    prevOrbital.current = orbital;
  }, [stream.orbital]);

  const orbital = stream.orbital;

  return (
    <div
      style={{
        width: "100%",
        height: "100vh",
        background: "#0a0e14",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div ref={mapRef} style={{ width: "100%", height: "100%" }} />

      {/* Overlay with stats */}
      {orbital && (
        <div
          style={{
            position: "absolute",
            bottom: 8,
            left: 8,
            display: "flex",
            gap: 8,
            padding: "6px 10px",
            background: "rgba(10,14,20,0.85)",
            backdropFilter: "blur(8px)",
            borderRadius: 6,
            border: "1px solid rgba(0,229,255,0.12)",
            fontSize: 10,
            fontFamily: "monospace",
            color: "#94adc4",
          }}
        >
          <span>
            <span style={{ color: "#00e5ff" }}>ALT</span>{" "}
            {Math.round(orbital.altitude)} km
          </span>
          <span>
            <span style={{ color: "#00e5ff" }}>SPD</span>{" "}
            {Math.round(orbital.speedKmH).toLocaleString()} km/h
          </span>
          <span>
            {orbital.isInSunlight ? "☀️" : "🌙"}{" "}
            {orbital.lat >= 0 ? "+" : ""}
            {orbital.lat.toFixed(1)}°,{" "}
            {orbital.lon >= 0 ? "+" : ""}
            {orbital.lon.toFixed(1)}°
          </span>
        </div>
      )}

      {/* Branding */}
      <a
        href="https://iss.cdnspace.ca"
        target="_blank"
        rel="noopener noreferrer"
        style={{
          position: "absolute",
          top: 8,
          right: 8,
          padding: "4px 8px",
          background: "rgba(10,14,20,0.85)",
          borderRadius: 4,
          border: "1px solid rgba(0,229,255,0.12)",
          fontSize: 9,
          fontFamily: "monospace",
          color: "#00e5ff",
          textDecoration: "none",
        }}
      >
        🛰️ iss.cdnspace.ca
      </a>
    </div>
  );
}
