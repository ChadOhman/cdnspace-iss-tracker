"use client";

import PanelFrame from "@/components/shared/PanelFrame";
import type { ISSTelemetry } from "@/lib/types";
import { useLocale } from "@/context/LocaleContext";

interface AirlockPanelProps {
  telemetry: ISSTelemetry | null;
}

interface PressureGaugeProps {
  label: string;
  value: number;
  max: number;
  unit?: string;
  color?: string;
}

function PressureGauge({ label, value, max, unit = "psi", color = "var(--color-accent-orange)" }: PressureGaugeProps) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div
      style={{
        background: "var(--color-bg-secondary)",
        border: "1px solid var(--color-border-subtle)",
        borderRadius: 4,
        padding: "5px 8px",
        marginBottom: 5,
      }}
    >
      <div style={{ color: "var(--color-text-muted)", fontSize: 8, marginBottom: 3 }}>{label}</div>
      <div
        style={{
          color,
          fontSize: 14,
          fontWeight: 700,
          fontVariantNumeric: "tabular-nums",
          marginBottom: 3,
        }}
      >
        {value.toFixed(1)}
        <span style={{ fontSize: 8, color: "var(--color-text-muted)", marginLeft: 2 }}>{unit}</span>
      </div>
      <div
        style={{
          height: 3,
          borderRadius: 2,
          background: "var(--color-border-subtle)",
          overflow: "hidden",
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
    </div>
  );
}

interface EmuCardProps {
  index: number;
  o2Pressure: number;
  o2Current: number;
  standby: boolean;
}

function EmuCard({ index, o2Pressure, o2Current, standby }: EmuCardProps) {
  return (
    <div
      style={{
        background: "var(--color-bg-secondary)",
        border: `1px solid ${standby ? "var(--color-border-subtle)" : "var(--color-accent-orange)"}`,
        borderRadius: 4,
        padding: "5px 6px",
        opacity: standby ? 0.5 : 1,
      }}
    >
      <div style={{ color: "var(--color-text-muted)", fontSize: 8, marginBottom: 3 }}>EMU {index}</div>
      {standby ? (
        <div style={{ color: "var(--color-text-muted)", fontSize: 9, textAlign: "center" }}>Standby</div>
      ) : (
        <>
          <div
            style={{
              color: "var(--color-accent-orange)",
              fontSize: 12,
              fontWeight: 700,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {o2Pressure.toFixed(0)}
            <span style={{ fontSize: 8, color: "var(--color-text-muted)", marginLeft: 1 }}>psi</span>
          </div>
          <div style={{ color: "var(--color-text-muted)", fontSize: 8, marginTop: 1 }}>
            {o2Current.toFixed(2)} A
          </div>
        </>
      )}
    </div>
  );
}

function isEmuStandby(o2Pressure: number, o2Current: number): boolean {
  return Math.abs(o2Pressure) < 0.5 && Math.abs(o2Current) < 0.1;
}

export default function AirlockPanel({ telemetry }: AirlockPanelProps) {
  const { t } = useLocale();

  return (
    <PanelFrame
      title={t("panels.airlock").toUpperCase()}
      icon="🧑‍🚀"
      accentColor="var(--color-accent-orange)"
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
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
          {/* Pressures column */}
          <div>
            <div
              style={{
                color: "var(--color-accent-orange)",
                fontSize: 9,
                fontWeight: 700,
                marginBottom: 6,
                letterSpacing: "0.06em",
              }}
            >
              {t("airlock.pressures").toUpperCase()}
            </div>
            <PressureGauge
              label="O₂ SUPPLY A"
              value={telemetry.airlock.o2SupplyPressureA}
              max={1000}
              color="var(--color-accent-orange)"
            />
            <PressureGauge
              label="O₂ SUPPLY B"
              value={telemetry.airlock.o2SupplyPressureB}
              max={1000}
              color="var(--color-accent-orange)"
            />
            <div
              style={{
                marginTop: 6,
                background: "var(--color-bg-secondary)",
                border: "1px solid var(--color-border-subtle)",
                borderRadius: 4,
                padding: "4px 6px",
              }}
            >
              <div style={{ color: "var(--color-text-muted)", fontSize: 8, marginBottom: 2 }}>PUMP</div>
              <div
                style={{
                  color:
                    telemetry.airlock.crewLockPump.toLowerCase().includes("on") ||
                    telemetry.airlock.crewLockPump.toLowerCase().includes("active")
                      ? "var(--color-accent-green)"
                      : "var(--color-text-muted)",
                  fontSize: 9,
                  fontWeight: 600,
                }}
              >
                {telemetry.airlock.crewLockPump || "—"}
              </div>
            </div>
          </div>

          {/* Gas Tanks column */}
          <div>
            <div
              style={{
                color: "var(--color-accent-orange)",
                fontSize: 9,
                fontWeight: 700,
                marginBottom: 6,
                letterSpacing: "0.06em",
              }}
            >
              {t("airlock.gasTanks").toUpperCase()}
            </div>
            <PressureGauge
              label="O₂ HIGH"
              value={telemetry.airlock.o2HighTank}
              max={14000}
              unit="psi"
              color="var(--color-accent-green)"
            />
            <PressureGauge
              label="O₂ LOW"
              value={telemetry.airlock.o2LowTank}
              max={5000}
              unit="psi"
              color="var(--color-accent-cyan)"
            />
            <PressureGauge
              label="N₂"
              value={telemetry.airlock.n2Tank}
              max={10000}
              unit="psi"
              color="var(--color-accent-orange)"
            />
          </div>

          {/* EVA Suits column */}
          <div>
            <div
              style={{
                color: "var(--color-accent-orange)",
                fontSize: 9,
                fontWeight: 700,
                marginBottom: 6,
                letterSpacing: "0.06em",
              }}
            >
              {t("airlock.evaSuits").toUpperCase()}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <EmuCard
                index={1}
                o2Pressure={telemetry.airlock.emu1O2Pressure}
                o2Current={telemetry.airlock.emu1O2Current}
                standby={isEmuStandby(telemetry.airlock.emu1O2Pressure, telemetry.airlock.emu1O2Current)}
              />
              <EmuCard
                index={2}
                o2Pressure={telemetry.airlock.emu2O2Pressure}
                o2Current={telemetry.airlock.emu2O2Current}
                standby={isEmuStandby(telemetry.airlock.emu2O2Pressure, telemetry.airlock.emu2O2Current)}
              />
              <EmuCard
                index={3}
                o2Pressure={telemetry.airlock.emu3O2Pressure}
                o2Current={telemetry.airlock.emu3O2Current}
                standby={isEmuStandby(telemetry.airlock.emu3O2Pressure, telemetry.airlock.emu3O2Current)}
              />
            </div>
          </div>
        </div>
      )}
    </PanelFrame>
  );
}
