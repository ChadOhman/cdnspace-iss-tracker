"use client";

import PanelFrame from "@/components/shared/PanelFrame";
import type { ISSTelemetry } from "@/lib/types";
import { useLocale } from "@/context/LocaleContext";
import { useUnits } from "@/context/UnitsContext";

interface AirlockPanelProps {
  telemetry: ISSTelemetry | null;
}

type PressureConverter = (psi: number) => { value: number; unit: string };

interface PressureGaugeProps {
  label: string;
  /** Raw value in psi */
  value: number;
  /** Max value in psi (will be converted alongside value) */
  maxPsi: number;
  color?: string;
  pressureConv: PressureConverter;
}

function PressureGauge({ label, value, maxPsi, color = "var(--color-accent-orange)", pressureConv }: PressureGaugeProps) {
  const converted = pressureConv(value);
  const convertedMax = pressureConv(maxPsi);
  const pct = Math.max(0, Math.min(100, (converted.value / convertedMax.value) * 100));
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
        {converted.value.toFixed(0)}
        <span style={{ fontSize: 8, color: "var(--color-text-muted)", marginLeft: 2 }}>{converted.unit}</span>
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
  /** Raw o2 primary pressure in psi */
  o2Pressure: number;
  o2Current: number;
  standby: boolean;
  pressureConv: PressureConverter;
  /** Secondary O₂ supply pressure (psi) — optional, only EMU 1 & 2 */
  secO2Pressure?: number;
  /** Secondary O₂ supply current (A) — optional, only EMU 1 & 2 */
  secO2Current?: number;
}

function EmuCard({ index, o2Pressure, o2Current, standby, pressureConv, secO2Pressure, secO2Current }: EmuCardProps) {
  const converted = pressureConv(o2Pressure);
  const hasSecondary = secO2Pressure !== undefined && secO2Current !== undefined;
  const secConverted = hasSecondary ? pressureConv(secO2Pressure!) : null;
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
          {/* Primary O₂ */}
          <div style={{ color: "var(--color-text-muted)", fontSize: 7, marginBottom: 1 }}>PRI O₂</div>
          <div
            style={{
              color: "var(--color-accent-orange)",
              fontSize: 12,
              fontWeight: 700,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {converted.value.toFixed(0)}
            <span style={{ fontSize: 8, color: "var(--color-text-muted)", marginLeft: 1 }}>{converted.unit}</span>
          </div>
          <div style={{ color: "var(--color-text-muted)", fontSize: 8, marginTop: 1, marginBottom: 4 }}>
            {o2Current.toFixed(2)} A
          </div>
          {/* Secondary O₂ — only shown for EMU 1 & 2 */}
          {hasSecondary && secConverted && (
            <>
              <div
                style={{
                  height: 1,
                  background: "var(--color-border-subtle)",
                  marginBottom: 4,
                }}
              />
              <div style={{ color: "var(--color-text-muted)", fontSize: 7, marginBottom: 1 }}>SEC O₂</div>
              <div
                style={{
                  color: "var(--color-text-secondary)",
                  fontSize: 11,
                  fontWeight: 700,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {secConverted.value.toFixed(0)}
                <span style={{ fontSize: 8, color: "var(--color-text-muted)", marginLeft: 1 }}>{secConverted.unit}</span>
              </div>
              <div style={{ color: "var(--color-text-muted)", fontSize: 8, marginTop: 1 }}>
                {secO2Current!.toFixed(2)} A
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

function isEmuStandby(o2Pressure: number, o2Current: number): boolean {
  return Math.abs(o2Pressure) < 0.5 && Math.abs(o2Current) < 0.1;
}

/** Chamber pressure (crewlock / equipment lock) — raw value is mmHg */
function ChamberPressure({ label, mmhg }: { label: string; mmhg: number }) {
  const kpa = mmhg * 0.133322;
  const psi = mmhg * 0.0193368;
  // Normal is ~760 mmHg / 14.7 psi. Color green when pressurized, cyan-dim when vacuum/depressurized.
  const pct = Math.max(0, Math.min(100, (mmhg / 800) * 100));
  const pressurized = mmhg > 700;
  const color = pressurized ? "var(--color-accent-green)" : mmhg > 300 ? "var(--color-accent-orange)" : "var(--color-accent-cyan)";
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
      <div style={{ color: "var(--color-text-muted)", fontSize: 8, marginBottom: 2 }}>{label}</div>
      <div style={{ color, fontSize: 12, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
        {mmhg.toFixed(0)}
        <span style={{ fontSize: 8, color: "var(--color-text-muted)", marginLeft: 2 }}>mmHg</span>
        <span style={{ fontSize: 8, color: "var(--color-text-muted)", marginLeft: 6 }}>
          ({kpa.toFixed(1)} kPa / {psi.toFixed(2)} psi)
        </span>
      </div>
      <div
        style={{
          height: 3,
          borderRadius: 2,
          background: "var(--color-border-subtle)",
          overflow: "hidden",
          marginTop: 3,
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

/** Supply valve position row */
const VALVE_STATE: Record<string, { label: string; color: string }> = {
  "0": { label: "Closed",    color: "var(--color-text-muted)" },
  "1": { label: "Open",      color: "var(--color-accent-green)" },
  "2": { label: "In-Transit",color: "var(--color-accent-orange)" },
  "3": { label: "Failed",    color: "var(--color-accent-red)" },
};

function ValveRow({ label, state }: { label: string; state: string }) {
  const raw = (state ?? "").trim();
  const decoded = VALVE_STATE[raw] ?? { label: raw || "—", color: "var(--color-text-muted)" };
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "2px 0", fontSize: 9 }}>
      <span style={{ color: "var(--color-text-muted)" }}>{label}</span>
      <span style={{ color: decoded.color, fontWeight: 600 }}>{decoded.label}</span>
    </div>
  );
}

export default function AirlockPanel({ telemetry }: AirlockPanelProps) {
  const { t } = useLocale();
  const { pressure } = useUnits();

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
            <ChamberPressure
              label="CREWLOCK"
              mmhg={telemetry.airlock.crewLockPressureMmhg}
            />
            <ChamberPressure
              label="EQUIP LOCK"
              mmhg={telemetry.airlock.equipLockPressureMmhg}
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
              {(() => {
                const PUMP_STATUS: Record<string, { label: string; color: string }> = {
                  "0": { label: "Off", color: "var(--color-text-muted)" },
                  "1": { label: "On", color: "var(--color-accent-green)" },
                  "2": { label: "Failed", color: "var(--color-accent-red)" },
                };
                const raw = telemetry.airlock.crewLockPump.trim();
                const decoded = PUMP_STATUS[raw] ?? { label: raw || "—", color: "var(--color-text-muted)" };
                return (
                  <div style={{ color: decoded.color, fontSize: 9, fontWeight: 600 }}>
                    {decoded.label}
                  </div>
                );
              })()}
            </div>
            {/* Supply valve positions */}
            <div style={{ marginTop: 6 }}>
              <div style={{ color: "var(--color-accent-orange)", fontSize: 8, fontWeight: 700, marginBottom: 4, letterSpacing: "0.06em" }}>
                SUPPLY VALVES
              </div>
              <ValveRow label="Hi-P O₂" state={telemetry.airlock.hiO2ValvePosition} />
              <ValveRow label="Lo-P O₂" state={telemetry.airlock.loO2ValvePosition} />
              <ValveRow label="N₂" state={telemetry.airlock.n2ValvePosition} />
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
              maxPsi={14000}
              color="var(--color-accent-green)"
              pressureConv={pressure}
            />
            <PressureGauge
              label="O₂ LOW"
              value={telemetry.airlock.o2LowTank}
              maxPsi={5000}
              color="var(--color-accent-cyan)"
              pressureConv={pressure}
            />
            <PressureGauge
              label="N₂"
              value={telemetry.airlock.n2Tank}
              maxPsi={10000}
              color="var(--color-accent-orange)"
              pressureConv={pressure}
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
                pressureConv={pressure}
                secO2Pressure={telemetry.airlock.emu1SecO2Pressure}
                secO2Current={telemetry.airlock.emu1SecO2Current}
              />
              <EmuCard
                index={2}
                o2Pressure={telemetry.airlock.emu2O2Pressure}
                o2Current={telemetry.airlock.emu2O2Current}
                standby={isEmuStandby(telemetry.airlock.emu2O2Pressure, telemetry.airlock.emu2O2Current)}
                pressureConv={pressure}
                secO2Pressure={telemetry.airlock.emu2SecO2Pressure}
                secO2Current={telemetry.airlock.emu2SecO2Current}
              />
              <EmuCard
                index={3}
                o2Pressure={telemetry.airlock.emu3O2Pressure}
                o2Current={telemetry.airlock.emu3O2Current}
                standby={isEmuStandby(telemetry.airlock.emu3O2Pressure, telemetry.airlock.emu3O2Current)}
                pressureConv={pressure}
              />
            </div>
          </div>
        </div>
      )}
    </PanelFrame>
  );
}
