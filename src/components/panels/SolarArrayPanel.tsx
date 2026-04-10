"use client";

import PanelFrame from "@/components/shared/PanelFrame";
import type { ISSTelemetry } from "@/lib/types";
import { useLocale } from "@/context/LocaleContext";

// SARJ and TRRJ software mode enum (shared — both joint types use the same scheme)
// From node-red-iss-data-streamer README: 1=STANDBY, 4=DIRECTED_POSITION,
// 5=AUTOTRACK, 6=BLIND, 7=SHUTDOWN, 8=SWITCHOVER
const SARJ_MODE_MAP: Record<string, { label: string; color: string }> = {
  "1": { label: "Standby",   color: "var(--color-text-muted)" },
  "4": { label: "Directed",  color: "var(--color-accent-orange)" },
  "5": { label: "Autotrack", color: "var(--color-accent-green)" },
  "6": { label: "Blind",     color: "var(--color-accent-orange)" },
  "7": { label: "Shutdown",  color: "var(--color-accent-red)" },
  "8": { label: "Switchover",color: "var(--color-accent-orange)" },
};

function decodeSarjMode(raw: string): { label: string; color: string } {
  const trimmed = raw.trim();
  return SARJ_MODE_MAP[trimmed] ?? { label: trimmed || "—", color: "var(--color-text-muted)" };
}

interface SolarArrayPanelProps {
  telemetry: ISSTelemetry | null;
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
        height: 3,
        borderRadius: 2,
        background: "var(--color-border-subtle)",
        overflow: "hidden",
        marginTop: 2,
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

interface WingPairProps {
  label: string;
  voltage: number;
}

function WingPair({ label, voltage }: WingPairProps) {
  return (
    <div
      style={{
        background: "var(--color-bg-secondary)",
        border: "1px solid var(--color-border-subtle)",
        borderRadius: 4,
        padding: "4px 6px",
        marginBottom: 4,
      }}
    >
      <div style={{ color: "var(--color-text-muted)", fontSize: 8, marginBottom: 2 }}>{label}</div>
      <div>
        <span style={{ color: "var(--color-accent-green)", fontSize: 11, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
          {voltage.toFixed(1)}
          <span style={{ fontSize: 8, color: "var(--color-text-muted)", marginLeft: 2 }}>V</span>
        </span>
      </div>
      <ProgressBar value={voltage} max={160} color="var(--color-accent-green)" />
    </div>
  );
}

interface SideBlockProps {
  label: string;
  wing1Label: string;
  wing1Voltage: number;
  wing2Label: string;
  wing2Voltage: number;
  bgaRotation: number;
  bgaIncidence: number;
}

function SideBlock({
  label,
  wing1Label, wing1Voltage,
  wing2Label, wing2Voltage,
  bgaRotation, bgaIncidence,
}: SideBlockProps) {
  return (
    <div
      style={{
        border: "1px solid var(--color-border-subtle)",
        borderRadius: 4,
        padding: "6px 8px",
        background: "rgba(0,0,0,0.2)",
      }}
    >
      <div
        style={{
          color: "var(--color-accent-green)",
          fontSize: 9,
          fontWeight: 700,
          marginBottom: 6,
          letterSpacing: "0.08em",
        }}
      >
        {label}
      </div>
      <WingPair label={wing1Label} voltage={wing1Voltage} />
      <WingPair label={wing2Label} voltage={wing2Voltage} />
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
        <div>
          <div style={{ color: "var(--color-text-muted)", fontSize: 8, cursor: "help" }} title="Beta Gimbal Assembly Rotation — angle of the solar array drive mechanism">BGA ROT</div>
          <div style={{ color: "var(--color-text-secondary)", fontSize: 10, fontVariantNumeric: "tabular-nums" }}>
            {bgaRotation.toFixed(1)}°
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ color: "var(--color-text-muted)", fontSize: 8, cursor: "help" }} title="Sun incidence angle — angle between the solar panel surface and incoming sunlight (0° = edge-on, 90° = face-on)">INCIDENCE</div>
          <div style={{ color: "var(--color-text-secondary)", fontSize: 10, fontVariantNumeric: "tabular-nums" }}>
            {bgaIncidence.toFixed(1)}°
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SolarArrayPanel({ telemetry }: SolarArrayPanelProps) {
  const { t } = useLocale();

  return (
    <PanelFrame
      title={t("panels.solarArrays").toUpperCase()}
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
        <div>
          {/* Total power */}
          <div
            style={{
              textAlign: "center",
              marginBottom: 10,
              padding: "6px 0",
              borderBottom: "1px solid var(--color-border-subtle)",
            }}
          >
            <div style={{ color: "var(--color-text-muted)", fontSize: 9, marginBottom: 2 }}>
              {t("solarArrays.totalPower").toUpperCase()}
            </div>
            <div
              style={{
                color: "var(--color-accent-green)",
                fontSize: 22,
                fontWeight: 700,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {telemetry.powerKw.toFixed(1)}
              <span style={{ fontSize: 11, color: "var(--color-text-muted)", marginLeft: 4 }}>kW</span>
            </div>
          </div>

          {/* Port / Starboard grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 8 }}>
            <SideBlock
              label={t("solarArrays.portSide").toUpperCase()}
              wing1Label="P4 — 2B"
              wing1Voltage={telemetry.solarArrays.p4.voltage2B}
              wing2Label="P6 — 2B"
              wing2Voltage={telemetry.solarArrays.p6.voltage2B}
              bgaRotation={telemetry.solarArrays.p4.bgaRotation}
              bgaIncidence={telemetry.solarArrays.p4.bgaIncidence}
            />
            <SideBlock
              label={t("solarArrays.starboardSide").toUpperCase()}
              wing1Label="S4 — 2A"
              wing1Voltage={telemetry.solarArrays.s4.voltage2A}
              wing2Label="S6 — 2A"
              wing2Voltage={telemetry.solarArrays.s6.voltage2A}
              bgaRotation={telemetry.solarArrays.s4.bgaRotation}
              bgaIncidence={telemetry.solarArrays.s4.bgaIncidence}
            />
          </div>

          {/* SARJ angles */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 6,
            }}
          >
            {(() => {
              const portMode = decodeSarjMode(telemetry.solarArrays.portSarjMode);
              return (
                <div
                  style={{
                    background: "var(--color-bg-secondary)",
                    border: "1px solid var(--color-border-subtle)",
                    borderRadius: 4,
                    padding: "5px 8px",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ color: "var(--color-text-muted)", fontSize: 8, cursor: "help" }} title="Solar Alpha Rotary Joint — rotates the port-side solar array wings to track the sun">PORT SARJ</div>
                    <div style={{ color: portMode.color, fontSize: 8, fontWeight: 700 }}>
                      {portMode.label.toUpperCase()}
                    </div>
                  </div>
                  <div style={{ color: "var(--color-accent-green)", fontSize: 13, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
                    {telemetry.solarArrays.portSarj.toFixed(1)}°
                  </div>
                </div>
              );
            })()}
            {(() => {
              const sbMode = decodeSarjMode(telemetry.solarArrays.starboardSarjMode);
              return (
                <div
                  style={{
                    background: "var(--color-bg-secondary)",
                    border: "1px solid var(--color-border-subtle)",
                    borderRadius: 4,
                    padding: "5px 8px",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ color: "var(--color-text-muted)", fontSize: 8, cursor: "help" }} title="Solar Alpha Rotary Joint — rotates the starboard-side solar array wings to track the sun">STARBOARD SARJ</div>
                    <div style={{ color: sbMode.color, fontSize: 8, fontWeight: 700 }}>
                      {sbMode.label.toUpperCase()}
                    </div>
                  </div>
                  <div style={{ color: "var(--color-accent-green)", fontSize: 13, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
                    {telemetry.solarArrays.starboardSarj.toFixed(1)}°
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </PanelFrame>
  );
}
