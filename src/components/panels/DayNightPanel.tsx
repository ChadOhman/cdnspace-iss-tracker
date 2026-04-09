"use client";

import PanelFrame from "@/components/shared/PanelFrame";
import type { OrbitalState } from "@/lib/types";

interface DayNightPanelProps {
  orbital: OrbitalState | null;
}

function formatSecondsRelative(seconds: number, suffix: string): string {
  const abs = Math.abs(seconds);
  const m = Math.floor(abs / 60);
  const s = Math.floor(abs % 60);
  if (m >= 60) {
    const h = Math.floor(m / 60);
    return `${h}h ${m % 60}m ${suffix}`;
  }
  return `${m}m ${s}s ${suffix}`;
}

export default function DayNightPanel({ orbital }: DayNightPanelProps) {
  if (!orbital) {
    return (
      <PanelFrame
        title="DAY/NIGHT CYCLE"
        icon="🌗"
        accentColor="var(--color-accent-yellow)"
      >
        <div
          style={{
            color: "var(--color-text-muted)",
            fontSize: 10,
            textAlign: "center",
            padding: "12px 0",
          }}
        >
          Awaiting data…
        </div>
      </PanelFrame>
    );
  }

  const { isInSunlight, sunriseIn, sunsetIn } = orbital;

  // ISS orbital period is ~92 minutes. Half-cycle ~ 46 min
  const HALF_CYCLE_S = 46 * 60;

  // Progress through current phase
  let progressPct = 0;
  let phaseLabel = "";

  if (isInSunlight) {
    // In daylight: sunsetIn tells us how long until dark
    if (sunsetIn !== null) {
      const elapsedS = HALF_CYCLE_S - sunsetIn;
      progressPct = Math.max(0, Math.min(100, (elapsedS / HALF_CYCLE_S) * 100));
    }
    phaseLabel = sunsetIn !== null ? `Sunset in ${formatSecondsRelative(sunsetIn, "")}` : "In Daylight";
  } else {
    // In shadow: sunriseIn tells us how long until light
    if (sunriseIn !== null) {
      const elapsedS = HALF_CYCLE_S - sunriseIn;
      progressPct = Math.max(0, Math.min(100, (elapsedS / HALF_CYCLE_S) * 100));
    }
    phaseLabel = sunriseIn !== null ? `Sunrise in ${formatSecondsRelative(sunriseIn, "")}` : "In Shadow";
  }

  const accentColor = isInSunlight
    ? "var(--color-accent-yellow)"
    : "var(--color-accent-purple)";

  const progressColor = isInSunlight
    ? "var(--color-accent-yellow)"
    : "#3b5bdb";

  return (
    <PanelFrame
      title="DAY/NIGHT CYCLE"
      icon="🌗"
      accentColor={accentColor}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {/* Status indicator */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 20 }}>{isInSunlight ? "☀️" : "🌑"}</span>
          <span
            style={{
              color: accentColor,
              fontSize: 14,
              fontWeight: 700,
              letterSpacing: "0.05em",
            }}
          >
            {isInSunlight ? "DAYLIGHT" : "SHADOW"}
          </span>
        </div>

        {/* Progress bar */}
        <div>
          <div
            style={{
              height: 6,
              borderRadius: 3,
              background: "var(--color-border-subtle)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${progressPct}%`,
                background: progressColor,
                borderRadius: 3,
                transition: "width 1s linear",
              }}
            />
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginTop: 2,
            }}
          >
            <span style={{ color: "var(--color-text-muted)", fontSize: 8 }}>
              {isInSunlight ? "Sunrise" : "Sunset"}
            </span>
            <span style={{ color: "var(--color-text-muted)", fontSize: 8 }}>
              {isInSunlight ? "Sunset" : "Sunrise"}
            </span>
          </div>
        </div>

        {/* Phase label */}
        <div style={{ color: "var(--color-text-muted)", fontSize: 10 }}>
          {phaseLabel}
        </div>
      </div>
    </PanelFrame>
  );
}
