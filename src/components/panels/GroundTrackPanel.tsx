"use client";

import { useState, useEffect, useRef } from "react";
import PanelFrame from "@/components/shared/PanelFrame";
import type { OrbitalState } from "@/lib/types";

interface GroundTrackPanelProps {
  orbital: OrbitalState | null;
}

export default function GroundTrackPanel({ orbital }: GroundTrackPanelProps) {
  const [mode3D, setMode3D] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapInstanceRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markerRef = useRef<any>(null);

  // Initialize Leaflet map
  useEffect(() => {
    if (mode3D || !mapRef.current) return;
    if (mapInstanceRef.current) return; // already initialized

    let cancelled = false;

    import("leaflet").then((L) => {
      if (cancelled || !mapRef.current || mapInstanceRef.current) return;

      // Remove any previous Leaflet init on this container
      // @ts-expect-error Leaflet attaches _leaflet_id to the element
      if (mapRef.current._leaflet_id) return;

      const map = L.map(mapRef.current, {
        center: [0, 0],
        zoom: 2,
        zoomControl: true,
        attributionControl: false,
        scrollWheelZoom: true,
      });

      L.tileLayer(
        "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
        { maxZoom: 18 }
      ).addTo(map);

      // ISS marker: red dot with glow via divIcon
      const issIcon = L.divIcon({
        className: "",
        html: `<div style="
          width:14px;height:14px;border-radius:50%;
          background:var(--color-accent-red,#ff3d3d);
          box-shadow:0 0 8px 3px rgba(255,61,61,0.7);
          border:2px solid #fff;
        "></div>`,
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      });

      const marker = L.marker([0, 0], { icon: issIcon }).addTo(map);
      mapInstanceRef.current = map;
      markerRef.current = marker;
    });

    return () => {
      cancelled = true;
    };
  }, [mode3D]);

  // Cleanup map when switching to 3D or unmounting
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
      title="GROUND TRACK"
      icon="🗺️"
      accentColor="var(--color-accent-cyan)"
      headerRight={toggle}
      bodyClassName=""
    >
      {mode3D ? (
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
          3D Globe — Coming in Task 19
        </div>
      ) : (
        <div
          ref={mapRef}
          style={{ height: 240, width: "100%", borderRadius: 4 }}
        />
      )}
    </PanelFrame>
  );
}
