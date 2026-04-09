"use client";

import PanelFrame from "@/components/shared/PanelFrame";
import Sparkline from "@/components/shared/Sparkline";
import type { OrbitalState } from "@/lib/types";

interface OrbitalParamsPanelProps {
  orbital: OrbitalState | null;
}

interface ParamRowProps {
  label: string;
  value: string;
}

function ParamRow({ label, value }: ParamRowProps) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "4px 0",
        borderBottom: "1px solid var(--color-border-subtle)",
      }}
    >
      <span style={{ color: "var(--color-text-muted)", fontSize: 10 }}>{label}</span>
      <span
        style={{
          color: "var(--color-accent-cyan)",
          fontSize: 10,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {value}
      </span>
    </div>
  );
}

export default function OrbitalParamsPanel({ orbital }: OrbitalParamsPanelProps) {
  function formatPeriod(minutes: number): string {
    const m = Math.floor(minutes);
    const s = Math.round((minutes - m) * 60);
    return `${m}m ${s}s`;
  }

  return (
    <PanelFrame
      title="ORBITAL PARAMETERS"
      icon="📐"
      accentColor="var(--color-accent-cyan)"
    >
      {!orbital ? (
        <div style={{ color: "var(--color-text-muted)", fontSize: 10, textAlign: "center", padding: "12px 0" }}>
          Awaiting data…
        </div>
      ) : (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "0 12px",
            }}
          >
            <ParamRow
              label="Apoapsis"
              value={`${orbital.apoapsis.toFixed(1)} km`}
            />
            <ParamRow
              label="Periapsis"
              value={`${orbital.periapsis.toFixed(1)} km`}
            />
            <ParamRow
              label="Inclination"
              value={`${orbital.inclination.toFixed(2)}°`}
            />
            <ParamRow
              label="Eccentricity"
              value={orbital.eccentricity.toFixed(6)}
            />
            <ParamRow
              label="Period"
              value={formatPeriod(orbital.period)}
            />
            <ParamRow
              label="Revolutions"
              value={`#${orbital.revolutionNumber}`}
            />
          </div>

          {/* Sparklines */}
          <div
            style={{
              display: "flex",
              gap: 12,
              marginTop: 8,
              paddingTop: 6,
              borderTop: "1px solid var(--color-border-subtle)",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <span style={{ color: "var(--color-text-muted)", fontSize: 9 }}>
                ALT (24h)
              </span>
              <Sparkline
                metric="altitude"
                hours={24}
                color="#00e5ff"
                width={64}
                height={18}
              />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <span style={{ color: "var(--color-text-muted)", fontSize: 9 }}>
                SPD (24h)
              </span>
              <Sparkline
                metric="speed_kmh"
                hours={24}
                color="#00ff88"
                width={64}
                height={18}
              />
            </div>
          </div>
        </>
      )}
    </PanelFrame>
  );
}
