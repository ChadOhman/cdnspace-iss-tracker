"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { useTelemetryStream } from "@/hooks/useTelemetryStream";

export default function TrackPage() {
  const { orbital, connected } = useTelemetryStream();
  const mapRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapInstanceRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markerRef = useRef<any>(null);

  // Initialize Leaflet map
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
        "></div>`,
        iconSize: [18, 18],
        iconAnchor: [9, 9],
      });

      const marker = L.marker([0, 0], { icon: issIcon }).addTo(map);
      mapInstanceRef.current = map;
      markerRef.current = marker;
    });

    return () => {
      cancelled = true;
    };
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markerRef.current = null;
      }
    };
  }, []);

  // Update marker position
  useEffect(() => {
    if (!orbital || !markerRef.current || !mapInstanceRef.current) return;
    const latlng: [number, number] = [orbital.lat, orbital.lon];
    markerRef.current.setLatLng(latlng);
    mapInstanceRef.current.panTo(latlng);
  }, [orbital]);

  return (
    <div style={{ width: "100vw", height: "100vh", background: "#0a0e14", display: "flex", flexDirection: "column" }}>
      {/* Header bar */}
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
          color: "var(--color-accent-cyan, #00e5ff)",
          textDecoration: "none",
          fontSize: 11,
          fontFamily: "var(--font-jetbrains-mono)",
          letterSpacing: "0.05em",
          border: "1px solid rgba(0,229,255,0.3)",
          padding: "2px 8px",
          borderRadius: 3,
        }}>
          &larr; DASHBOARD
        </Link>
        <span style={{ color: "#00e5ff", fontSize: 13, fontFamily: "var(--font-jetbrains-mono)", letterSpacing: "0.1em" }}>
          ISS GROUND TRACK
        </span>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{
            width: 6, height: 6, borderRadius: "50%",
            background: connected ? "#00ff88" : "#ff3d3d",
            boxShadow: connected ? "0 0 6px #00ff88" : "none",
          }} />
          <span style={{ color: "var(--color-text-muted, #8892a4)", fontSize: 10, fontFamily: "var(--font-jetbrains-mono)" }}>
            {connected ? "LIVE" : "OFFLINE"}
          </span>
          {orbital && (
            <span style={{ color: "var(--color-text-muted, #8892a4)", fontSize: 10, fontFamily: "var(--font-jetbrains-mono)", marginLeft: 8 }}>
              {orbital.lat.toFixed(2)}&deg;N &nbsp; {orbital.lon.toFixed(2)}&deg;E &nbsp; ALT {Math.round(orbital.alt)} km
            </span>
          )}
        </div>
      </div>

      {/* Full-viewport map */}
      <div ref={mapRef} style={{ flex: 1, width: "100%" }} />
    </div>
  );
}
