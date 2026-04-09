"use client";

import PanelFrame from "@/components/shared/PanelFrame";
import type { SolarActivity, RadiationRisk } from "@/lib/types";

interface SpaceWeatherPanelProps {
  solar: SolarActivity | null;
}

function radiationColor(risk: RadiationRisk): string {
  switch (risk) {
    case "low":
      return "var(--color-accent-green)";
    case "moderate":
      return "var(--color-accent-orange)";
    case "high":
    case "severe":
      return "var(--color-accent-red)";
  }
}

interface MetricCellProps {
  label: string;
  value: string;
  sub?: string;
  color?: string;
}

function MetricCell({ label, value, sub, color = "var(--color-accent-orange)" }: MetricCellProps) {
  return (
    <div
      style={{
        padding: "6px 8px",
        background: "var(--color-bg-secondary)",
        borderRadius: 4,
        border: "1px solid var(--color-border-subtle)",
      }}
    >
      <div style={{ color: "var(--color-text-muted)", fontSize: 9, marginBottom: 2 }}>
        {label}
      </div>
      <div style={{ color, fontSize: 14, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
        {value}
      </div>
      {sub && (
        <div style={{ color: "var(--color-text-muted)", fontSize: 9, marginTop: 1 }}>
          {sub}
        </div>
      )}
    </div>
  );
}

export default function SpaceWeatherPanel({ solar }: SpaceWeatherPanelProps) {
  return (
    <PanelFrame
      title="SPACE WEATHER"
      icon="☀️"
      accentColor="var(--color-accent-orange)"
    >
      {!solar ? (
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
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 6,
          }}
        >
          <MetricCell
            label="KP INDEX"
            value={solar.kpIndex.toFixed(1)}
            sub={solar.kpLabel}
            color="var(--color-accent-orange)"
          />
          <MetricCell
            label="X-RAY"
            value={solar.xrayClass}
            sub={`${solar.xrayFlux.toExponential(2)} W/m²`}
            color="var(--color-accent-yellow)"
          />
          <MetricCell
            label="PROTON FLUX"
            value={solar.protonFlux10MeV.toFixed(1)}
            sub="≥10 MeV pfu"
            color="var(--color-accent-cyan)"
          />
          <MetricCell
            label="RADIATION"
            value={solar.radiationRisk.toUpperCase()}
            sub="crew risk level"
            color={radiationColor(solar.radiationRisk)}
          />
        </div>
      )}
    </PanelFrame>
  );
}
