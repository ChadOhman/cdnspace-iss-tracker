"use client";

import { useEffect, useState, memo } from "react";
import type { OrbitalState } from "@/lib/types";
import { useLocale } from "@/context/LocaleContext";

interface TopBarProps {
  orbital: OrbitalState | null;
  connected: boolean;
  reconnecting: boolean;
  lastUpdate: number | null;
  visitorCount: number;
}

function TopBarInner({
  orbital,
  connected,
  reconnecting,
  lastUpdate,
  visitorCount,
}: TopBarProps) {
  const { t } = useLocale();
  const [utc, setUtc] = useState("");

  useEffect(() => {
    function tick() {
      const now = new Date();
      const hh = String(now.getUTCHours()).padStart(2, "0");
      const mm = String(now.getUTCMinutes()).padStart(2, "0");
      const ss = String(now.getUTCSeconds()).padStart(2, "0");
      setUtc(`${hh}:${mm}:${ss}`);
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const isDelayed =
    lastUpdate !== null && Date.now() - lastUpdate > 10 * 60 * 1000;

  let connectionEl: React.ReactNode;
  if (connected) {
    connectionEl = (
      <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <span
          className="animate-pulse-live"
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: "var(--color-accent-green)",
            display: "inline-block",
          }}
        />
        <span style={{ color: "var(--color-accent-green)" }}>LIVE</span>
      </span>
    );
  } else if (reconnecting) {
    connectionEl = (
      <span style={{ color: "var(--color-accent-orange)" }}>RECONNECTING</span>
    );
  } else {
    connectionEl = (
      <span style={{ color: "var(--color-accent-red)" }}>OFFLINE</span>
    );
  }

  // Period display: Xm Ys
  function formatPeriod(minutes: number): string {
    const m = Math.floor(minutes);
    const s = Math.round((minutes - m) * 60);
    return `${m}m ${s}s`;
  }

  return (
    <div
      className="dashboard-topbar"
      style={{
        gridArea: "topbar",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 16px",
        background: "var(--color-bg-panel)",
        borderBottom: "1px solid var(--color-border-accent)",
        fontSize: 10,
        color: "var(--color-text-muted)",
        gap: 12,
        overflow: "hidden",
      }}
    >
      {/* Left side */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
        {connectionEl}
        <span style={{ color: "var(--color-text-primary)", fontWeight: 600 }}>
          🛰️ ISS
        </span>
        {visitorCount > 0 && (
          <span style={{ color: "var(--color-text-muted)" }}>
            {visitorCount} online
          </span>
        )}
      </div>

      {/* Orbital metrics */}
      {orbital && (
        <div style={{ display: "flex", alignItems: "center", gap: 14, overflow: "hidden" }}>
          <span>
            <span style={{ color: "var(--color-text-muted)" }}>{t("topbar.altitude")} </span>
            <span style={{ color: "var(--color-accent-cyan)" }}>
              {orbital.altitude.toFixed(1)} km
            </span>
          </span>
          <span>
            <span style={{ color: "var(--color-text-muted)" }}>{t("topbar.speed")} </span>
            <span style={{ color: "var(--color-accent-cyan)" }}>
              {Math.round(orbital.speedKmH).toLocaleString()} km/h
            </span>
          </span>
          <span>
            <span style={{ color: "var(--color-text-muted)" }}>{t("topbar.latitude")} </span>
            <span style={{ color: "var(--color-text-primary)" }}>
              {orbital.lat >= 0
                ? `+${orbital.lat.toFixed(1)}°`
                : `${orbital.lat.toFixed(1)}°`}
            </span>
          </span>
          <span>
            <span style={{ color: "var(--color-text-muted)" }}>{t("topbar.longitude")} </span>
            <span style={{ color: "var(--color-text-primary)" }}>
              {orbital.lon >= 0
                ? `+${orbital.lon.toFixed(1)}°`
                : `${orbital.lon.toFixed(1)}°`}
            </span>
          </span>
          <span>
            <span style={{ color: "var(--color-text-muted)" }}>{t("topbar.orbit")} </span>
            <span style={{ color: "var(--color-text-primary)" }}>
              #{orbital.revolutionNumber}
            </span>
          </span>
        </div>
      )}

      {/* Right side */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
        {orbital && (
          <span>
            <span style={{ color: "var(--color-text-muted)" }}>{t("topbar.period")} </span>
            <span style={{ color: "var(--color-text-primary)" }}>
              {formatPeriod(orbital.period)}
            </span>
          </span>
        )}
        {isDelayed && (
          <span style={{ color: "var(--color-accent-orange)", fontWeight: 700 }}>
            DELAYED
          </span>
        )}
        <span style={{ color: "var(--color-accent-cyan)", letterSpacing: "0.05em" }}>
          {utc} UTC
        </span>
      </div>
    </div>
  );
}

export const TopBar = memo(TopBarInner);
