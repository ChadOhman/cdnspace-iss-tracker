"use client";

import { useEffect, useState, memo } from "react";
import type { OrbitalState, CrewMember } from "@/lib/types";
import { useLocale } from "@/context/LocaleContext";
import { useUnits } from "@/context/UnitsContext";
import { useTime } from "@/context/TimeContext";
import { FLAG_EMOJI } from "@/data/iss-modules";
import CrewModal from "@/components/modals/CrewModal";
import type { CrewRoster } from "@/hooks/useTelemetryStream";

interface TopBarProps {
  orbital: OrbitalState | null;
  connected: boolean;
  reconnecting: boolean;
  lastUpdate: number | null;
  visitorCount: number;
  crew: CrewRoster | null;
}

function TopBarInner({
  orbital,
  connected,
  reconnecting,
  lastUpdate,
  visitorCount,
  crew,
}: TopBarProps) {
  const { t } = useLocale();
  const { distance, speed } = useUnits();
  const { formatTime, clockFormat, setClockFormat, clockLabel } = useTime();
  const [timeStr, setTimeStr] = useState("");
  const [crewOpen, setCrewOpen] = useState(false);

  const crewMembers = crew?.crew ?? [];
  const expedition = crew?.expedition;

  // Build the flag string from the current crew roster
  const crewFlags = crewMembers
    .map((m) => FLAG_EMOJI[m.nationality] ?? "🏳️")
    .join("");

  useEffect(() => {
    function tick() {
      setTimeStr(formatTime(new Date()));
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [formatTime]);

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
          <span className="topbar-metrics">🛰️ International Space Station</span>
          <span className="topbar-mobile-title" style={{ display: "none" }}>🛰️ ISS</span>
        </span>
        <span style={{
          padding: "1px 5px",
          borderRadius: 3,
          background: "rgba(255,140,0,0.15)",
          border: "1px solid rgba(255,140,0,0.4)",
          color: "var(--color-accent-orange)",
          fontSize: 8,
          fontWeight: 700,
          letterSpacing: "0.1em",
        }}>
          ALPHA
        </span>
        {visitorCount > 0 && (
          <span style={{ color: "var(--color-text-muted)" }}>
            {visitorCount} online
          </span>
        )}
        <button
          onClick={() => setCrewOpen(true)}
          title={`${crewMembers.length} crew members — click for bios`}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            padding: "2px 8px",
            background: "transparent",
            border: "1px solid var(--color-border-subtle)",
            borderRadius: 999,
            color: "var(--color-text-muted)",
            cursor: "pointer",
            fontFamily: "inherit",
            fontSize: 10,
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.borderColor =
              "var(--color-accent-cyan)";
            (e.currentTarget as HTMLButtonElement).style.color =
              "var(--color-accent-cyan)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.borderColor =
              "var(--color-border-subtle)";
            (e.currentTarget as HTMLButtonElement).style.color =
              "var(--color-text-muted)";
          }}
        >
          <span className="crew-flags-full" style={{ fontSize: 11, letterSpacing: 1 }}>
            {crewFlags}
          </span>
          <span className="crew-flags-compact" style={{ fontSize: 11, letterSpacing: 1, display: "none" }}>
            👥 {crewMembers.length}
          </span>
          <span style={{ fontSize: 9, letterSpacing: "0.05em" }}>
            {t("panels.crew")}
          </span>
        </button>
      </div>

      {/* Orbital metrics — hidden on mobile */}
      {orbital && (
        <div className="topbar-metrics" style={{ display: "flex", alignItems: "center", gap: 14, overflow: "hidden" }}>
          <span>
            <span style={{ color: "var(--color-text-muted)" }}>{t("topbar.altitude")} </span>
            <span style={{ color: "var(--color-accent-cyan)" }}>
              {(() => { const d = distance(orbital.altitude); return `${d.value.toFixed(1)} ${d.unit}`; })()}
            </span>
          </span>
          <span>
            <span style={{ color: "var(--color-text-muted)" }}>{t("topbar.speed")} </span>
            <span style={{ color: "var(--color-accent-cyan)" }}>
              {(() => { const s = speed(orbital.speedKmH); return `${Math.round(s.value).toLocaleString()} ${s.unit}`; })()}
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

      {/* TDRS signal status — hidden on mobile */}
      {orbital && (() => {
        const TDRS = [
          { name: "W", lon: -171 },
          { name: "E", lon: -41 },
          { name: "P", lon: -150 },
        ];
        const inView = TDRS.filter(({ lon }) => {
          const delta = Math.abs(orbital.lon - lon);
          return (delta > 180 ? 360 - delta : delta) < 70;
        }).length;
        const hasSignal = inView > 0;
        return (
          <span
            className="topbar-metrics"
            style={{ display: "flex", alignItems: "center", gap: 4, cursor: "help" }}
            title={`TDRS Relay: ${inView} of 3 satellites in view. ${hasSignal ? "Signal active." : "Loss of signal."}`}
          >
            <span style={{ color: "var(--color-text-muted)" }}>📡</span>
            <span style={{
              color: hasSignal ? "var(--color-accent-green)" : "var(--color-accent-red)",
              fontWeight: 600,
            }}>
              {hasSignal ? `${inView}/3` : "LOS"}
            </span>
          </span>
        );
      })()}

      {/* Right side */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
        {orbital && (
          <span className="topbar-metrics">
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
        <span
          onClick={() => setClockFormat(clockFormat === "utc" ? "local" : "utc")}
          style={{
            color: "var(--color-accent-cyan)",
            letterSpacing: "0.05em",
            cursor: "pointer",
            userSelect: "none",
          }}
          title={`Click to switch to ${clockFormat === "utc" ? "local" : "UTC"} time`}
        >
          {timeStr} {clockLabel}
        </span>
      </div>

      <CrewModal isOpen={crewOpen} onClose={() => setCrewOpen(false)} crew={crew} />
    </div>
  );
}

export const TopBar = memo(TopBarInner);
