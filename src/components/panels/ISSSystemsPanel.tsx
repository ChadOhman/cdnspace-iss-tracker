"use client";

import PanelFrame from "@/components/shared/PanelFrame";
import type { ISSTelemetry } from "@/lib/types";
import { useLocale } from "@/context/LocaleContext";

interface ISSSystemsPanelProps {
  telemetry: ISSTelemetry | null;
}

interface SubPanelProps {
  title: string;
  children: React.ReactNode;
}

function SubPanel({ title, children }: SubPanelProps) {
  return (
    <div
      style={{
        background: "var(--color-bg-secondary)",
        border: "1px solid var(--color-border-subtle)",
        borderRadius: 4,
        padding: "6px 8px",
      }}
    >
      <div
        style={{
          color: "var(--color-text-muted)",
          fontSize: 9,
          marginBottom: 4,
          letterSpacing: "0.05em",
        }}
      >
        {title}
      </div>
      {children}
    </div>
  );
}

interface ProgressBarProps {
  value: number;
  max: number;
  color?: string;
}

function ProgressBar({ value, max, color = "var(--color-accent-green)" }: ProgressBarProps) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div
      style={{
        height: 4,
        borderRadius: 2,
        background: "var(--color-border-subtle)",
        overflow: "hidden",
        marginTop: 4,
      }}
    >
      <div
        style={{
          height: "100%",
          width: `${pct}%`,
          background: color,
          borderRadius: 2,
          transition: "width 0.5s ease",
        }}
      />
    </div>
  );
}

export default function ISSSystemsPanel({ telemetry }: ISSSystemsPanelProps) {
  const { t } = useLocale();
  return (
    <PanelFrame
      title={t("panels.issSystems").toUpperCase()}
      icon="⚡"
      accentColor="var(--color-accent-green)"
    >
      {!telemetry ? (
        <div
          style={{
            color: "var(--color-text-muted)",
            fontSize: 10,
            textAlign: "center",
            padding: "12px 0",
          }}
        >
          {t("crew.awaitingTelemetry")}
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
          {/* POWER */}
          <SubPanel title={t("systems.power").toUpperCase()}>
            <div
              style={{
                color: "var(--color-accent-green)",
                fontSize: 16,
                fontWeight: 700,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {telemetry.powerKw.toFixed(1)}
              <span style={{ fontSize: 9, color: "var(--color-text-muted)", marginLeft: 2 }}>
                kW
              </span>
            </div>
            <ProgressBar value={telemetry.powerKw} max={120} color="var(--color-accent-green)" />
          </SubPanel>

          {/* THERMAL */}
          <SubPanel title={t("systems.thermal").toUpperCase()}>
            <div
              style={{
                color: "var(--color-accent-cyan)",
                fontSize: 16,
                fontWeight: 700,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {telemetry.temperatureC.toFixed(1)}
              <span style={{ fontSize: 9, color: "var(--color-text-muted)", marginLeft: 2 }}>
                °C
              </span>
            </div>
          </SubPanel>

          {/* ATTITUDE */}
          <SubPanel title={t("systems.attitude").toUpperCase()}>
            <div
              style={{
                color: "var(--color-accent-yellow)",
                fontSize: 11,
                fontWeight: 600,
                wordBreak: "break-word",
              }}
            >
              {telemetry.attitudeMode || "—"}
            </div>
          </SubPanel>

          {/* ATMOSPHERE */}
          <SubPanel title={t("systems.atmosphere").toUpperCase()}>
            <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--color-text-muted)", fontSize: 9 }}>PSI</span>
                <span
                  style={{
                    color: "var(--color-accent-cyan)",
                    fontSize: 9,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {telemetry.pressurePsi.toFixed(1)}
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--color-text-muted)", fontSize: 9 }}>O₂%</span>
                <span
                  style={{
                    color: "var(--color-accent-green)",
                    fontSize: 9,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {telemetry.oxygenPercent.toFixed(1)}
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--color-text-muted)", fontSize: 9 }}>CO₂%</span>
                <span
                  style={{
                    color:
                      telemetry.co2Percent > 0.5
                        ? "var(--color-accent-orange)"
                        : "var(--color-text-primary)",
                    fontSize: 9,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {telemetry.co2Percent.toFixed(2)}
                </span>
              </div>
            </div>
          </SubPanel>
        </div>
      )}
    </PanelFrame>
  );
}
