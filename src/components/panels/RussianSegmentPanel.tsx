"use client";

import PanelFrame from "@/components/shared/PanelFrame";
import type { ISSTelemetry } from "@/lib/types";
import { useLocale } from "@/context/LocaleContext";

interface RussianSegmentPanelProps {
  telemetry: ISSTelemetry | null;
}

function num(telemetry: ISSTelemetry | null, id: string): number {
  if (!telemetry) return 0;
  const raw = telemetry.channels[id]?.value;
  return raw ? parseFloat(raw) || 0 : 0;
}

// ─── Enum decoders ────────────────────────────────────────────────────────────

const STATION_MODES: Record<number, string> = {
  1: "Crew Rescue",
  2: "Survival",
  3: "Reboost",
  4: "Proximity Ops",
  5: "EVA",
  6: "Microgravity",
  7: "Standard",
};

const ATTITUDE_MODES: Record<number, string> = {
  0: "Inertial",
  1: "LVLH SM",
  2: "Solar Orientation",
  3: "Current LVLH",
  4: "Current Inertial",
  5: "Damping",
  6: "TEA",
  7: "X-POP",
};

const DYNAMIC_MODES: Record<number, string> = {
  0: "Reserved",
  1: "Thrusters",
  2: "Gyrodines (CMGs)",
  3: "Gyrodines + US Desat",
  4: "Gyrodines + RS Desat",
  5: "Translational Thrusters",
  6: "Thrusters help CMG",
  7: "Free Drift",
};

// ─── Sub-components ───────────────────────────────────────────────────────────

interface SectionHeadingProps {
  label: string;
  color: string;
}

function SectionHeading({ label, color }: SectionHeadingProps) {
  return (
    <div
      style={{
        color,
        fontSize: 9,
        fontWeight: 700,
        marginBottom: 6,
        letterSpacing: "0.06em",
      }}
    >
      {label}
    </div>
  );
}

interface StatusCellProps {
  label: string;
  value: string;
  valueColor: string;
}

function StatusCell({ label, value, valueColor }: StatusCellProps) {
  return (
    <div
      style={{
        background: "var(--color-bg-secondary)",
        border: "1px solid var(--color-border-subtle)",
        borderRadius: 4,
        padding: "4px 6px",
      }}
    >
      <div style={{ color: "var(--color-text-muted)", fontSize: 8, marginBottom: 2 }}>{label}</div>
      <div style={{ color: valueColor, fontSize: 10, fontWeight: 600 }}>{value}</div>
    </div>
  );
}

interface DockPortRowProps {
  label: string;
  engaged: boolean;
}

function DockPortRow({ label, engaged }: DockPortRowProps) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "3px 0",
        borderBottom: "1px solid var(--color-border-subtle)",
      }}
    >
      <div
        style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          flexShrink: 0,
          background: engaged
            ? "var(--color-accent-green)"
            : "var(--color-border-subtle)",
          boxShadow: engaged ? "0 0 4px var(--color-accent-green)" : "none",
        }}
      />
      <span
        style={{
          color: engaged ? "var(--color-text-primary)" : "var(--color-text-muted)",
          fontSize: 9,
          flex: 1,
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: 8,
          color: engaged ? "var(--color-accent-green)" : "var(--color-text-muted)",
          fontWeight: 600,
        }}
      >
        {engaged ? "DOCKED" : "EMPTY"}
      </span>
    </div>
  );
}

interface KursRowProps {
  label: string;
  value: string;
  color?: string;
}

function KursRow({ label, value, color = "var(--color-text-primary)" }: KursRowProps) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "2px 0",
        borderBottom: "1px solid var(--color-border-subtle)",
      }}
    >
      <span style={{ color: "var(--color-text-muted)", fontSize: 9 }}>{label}</span>
      <span style={{ color, fontSize: 9, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
        {value}
      </span>
    </div>
  );
}

// ─── Color helpers ────────────────────────────────────────────────────────────

function stationModeColor(mode: number): string {
  if (mode === 1 || mode === 2) return "var(--color-accent-red)";
  if (mode === 3 || mode === 4 || mode === 5) return "var(--color-accent-orange)";
  return "var(--color-accent-green)"; // Standard or Microgravity
}

function dynamicModeColor(mode: number): string {
  if (mode === 7) return "var(--color-accent-orange)"; // Free Drift
  if (mode === 1 || mode === 5) return "var(--color-accent-orange)"; // Thruster-only
  if (mode === 2 || mode === 3 || mode === 4) return "var(--color-accent-green)"; // Gyrodines
  return "var(--color-text-muted)";
}

// ─── Main panel ───────────────────────────────────────────────────────────────

export default function RussianSegmentPanel({ telemetry }: RussianSegmentPanelProps) {
  const { t } = useLocale();

  // ── Section 1: Station Mode & GN&C ──────────────────────────────────────────
  const stationModeRaw  = num(telemetry, "RUSSEG000001");
  const attitudeModeRaw = num(telemetry, "RUSSEG000021");
  const motionMaster    = num(telemetry, "RUSSEG000022");
  const freeDriftPrep   = num(telemetry, "RUSSEG000023");
  const thrusterTerminated = num(telemetry, "RUSSEG000024");
  const dynamicModeRaw  = num(telemetry, "RUSSEG000025");

  const stationModeLabel  = STATION_MODES[stationModeRaw]  ?? `Unknown (${stationModeRaw})`;
  const attitudeModeLabel = ATTITUDE_MODES[attitudeModeRaw] ?? `Unknown (${attitudeModeRaw})`;
  const dynamicModeLabel  = DYNAMIC_MODES[dynamicModeRaw]  ?? `Unknown (${dynamicModeRaw})`;

  // ── Section 2: Docking Ports ─────────────────────────────────────────────────
  const smDockingFlag   = num(telemetry, "RUSSEG000012") === 1;
  const smForward       = num(telemetry, "RUSSEG000013") === 1;
  const smAft           = num(telemetry, "RUSSEG000014") === 1;
  const smNadir         = num(telemetry, "RUSSEG000015") === 1;
  const fgbNadir        = num(telemetry, "RUSSEG000016") === 1;
  const smNadirUdm      = num(telemetry, "RUSSEG000017") === 1;
  const mrm1Rassvet     = num(telemetry, "RUSSEG000018") === 1;
  const mrm2Poisk       = num(telemetry, "RUSSEG000019") === 1;
  const hooksClosedRaw  = num(telemetry, "RUSSEG000020");

  // ── Section 3: KURS ──────────────────────────────────────────────────────────
  const kursSet1        = num(telemetry, "RUSSEG000002");
  const kursSet2        = num(telemetry, "RUSSEG000003");
  const kursPFailure    = num(telemetry, "RUSSEG000004");
  const kursRange       = num(telemetry, "RUSSEG000005");
  const kursRangeRate   = num(telemetry, "RUSSEG000006");
  const kursPTestMode   = num(telemetry, "RUSSEG000007");
  const kursPCapture    = num(telemetry, "RUSSEG000008");
  const kursPTargetAcq  = num(telemetry, "RUSSEG000009");
  const kursPFunctional = num(telemetry, "RUSSEG000010");
  const kursPStandby    = num(telemetry, "RUSSEG000011");

  const kursActive =
    kursSet1 === 1 ||
    kursSet2 === 1 ||
    kursPTestMode === 1 ||
    kursPCapture === 1 ||
    kursPTargetAcq === 1 ||
    kursPFunctional === 1 ||
    kursPStandby === 1 ||
    kursRange > 0;

  return (
    <PanelFrame
      title="RUSSIAN SEGMENT"
      icon="🇷🇺"
      accentColor="var(--color-accent-red)"
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
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

          {/* ── Section 1: Station Mode & Attitude ───────────────────────── */}
          <div>
            <SectionHeading label="STATION MODE & ATTITUDE" color="var(--color-accent-red)" />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
              <StatusCell
                label="STATION MODE"
                value={stationModeLabel}
                valueColor={stationModeColor(stationModeRaw)}
              />
              <StatusCell
                label="ATTITUDE MODE"
                value={attitudeModeLabel}
                valueColor="var(--color-text-primary)"
              />
              <StatusCell
                label="DYNAMIC MODE"
                value={dynamicModeLabel}
                valueColor={dynamicModeColor(dynamicModeRaw)}
              />
              <StatusCell
                label="MOTION CONTROL"
                value={motionMaster === 1 ? "RS Master" : "Slave"}
                valueColor={motionMaster === 1 ? "var(--color-accent-green)" : "var(--color-text-muted)"}
              />
              <StatusCell
                label="THRUSTER STATUS"
                value={thrusterTerminated === 1 ? "Terminated" : "Ready"}
                valueColor={thrusterTerminated === 1 ? "var(--color-accent-red)" : "var(--color-accent-green)"}
              />
              <StatusCell
                label="FREE DRIFT PREP"
                value={freeDriftPrep === 1 ? "Yes" : "No"}
                valueColor={freeDriftPrep === 1 ? "var(--color-accent-orange)" : "var(--color-text-muted)"}
              />
            </div>
          </div>

          {/* ── Section 2: Docking Ports ──────────────────────────────────── */}
          <div>
            <SectionHeading label="DOCKING PORTS" color="var(--color-accent-red)" />
            <div
              style={{
                background: "var(--color-bg-secondary)",
                border: "1px solid var(--color-border-subtle)",
                borderRadius: 4,
                padding: "4px 8px",
              }}
            >
              <DockPortRow label="SM Forward (Xfer)" engaged={smForward} />
              <DockPortRow label="SM Aft (Instr Compartment)" engaged={smAft} />
              <DockPortRow label="SM Nadir (-Y)" engaged={smNadir} />
              <DockPortRow label="FGB Nadir (-Y)" engaged={fgbNadir} />
              <DockPortRow label="SM Nadir UDM" engaged={smNadirUdm} />
              <DockPortRow label="MRM1 Rassvet" engaged={mrm1Rassvet} />
              <DockPortRow label="MRM2 Poisk" engaged={mrm2Poisk} />

              {/* Status rows */}
              <div
                style={{
                  display: "flex",
                  gap: 12,
                  marginTop: 5,
                  paddingTop: 4,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <div
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: smDockingFlag
                        ? "var(--color-accent-green)"
                        : "var(--color-border-subtle)",
                    }}
                  />
                  <span style={{ fontSize: 8, color: "var(--color-text-muted)" }}>
                    Docking Flag
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <div
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: hooksClosedRaw === 1
                        ? "var(--color-accent-green)"
                        : "var(--color-border-subtle)",
                    }}
                  />
                  <span style={{ fontSize: 8, color: "var(--color-text-muted)" }}>
                    Hooks Closed
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ── Section 3: KURS Rendezvous ────────────────────────────────── */}
          <div>
            <SectionHeading label="KURS RENDEZVOUS" color="var(--color-accent-red)" />
            {!kursActive ? (
              <div
                style={{
                  background: "var(--color-bg-secondary)",
                  border: "1px solid var(--color-border-subtle)",
                  borderRadius: 4,
                  padding: "6px 8px",
                  color: "var(--color-text-muted)",
                  fontSize: 9,
                  textAlign: "center",
                }}
              >
                KURS: Inactive
              </div>
            ) : (
              <div
                style={{
                  background: "var(--color-bg-secondary)",
                  border: "1px solid var(--color-border-subtle)",
                  borderRadius: 4,
                  padding: "4px 8px",
                }}
              >
                <KursRow
                  label="Range"
                  value={`${kursRange.toFixed(0)} m`}
                  color="var(--color-accent-cyan)"
                />
                <KursRow
                  label="Range Rate"
                  value={`${kursRangeRate.toFixed(2)} m/s`}
                  color="var(--color-accent-cyan)"
                />
                <KursRow
                  label="Equipment Set 1"
                  value={kursSet1 === 1 ? "ON" : "Off"}
                  color={kursSet1 === 1 ? "var(--color-accent-green)" : "var(--color-text-muted)"}
                />
                <KursRow
                  label="Equipment Set 2"
                  value={kursSet2 === 1 ? "ON" : "Off"}
                  color={kursSet2 === 1 ? "var(--color-accent-green)" : "var(--color-text-muted)"}
                />
                <KursRow
                  label="Capture Signal"
                  value={kursPCapture === 1 ? "Yes" : "No"}
                  color={kursPCapture === 1 ? "var(--color-accent-green)" : "var(--color-text-muted)"}
                />
                <KursRow
                  label="Target Acquired"
                  value={kursPTargetAcq === 1 ? "Yes" : "No"}
                  color={kursPTargetAcq === 1 ? "var(--color-accent-green)" : "var(--color-text-muted)"}
                />
                <KursRow
                  label="Functional Mode"
                  value={kursPFunctional === 1 ? "Yes" : "No"}
                  color={kursPFunctional === 1 ? "var(--color-accent-green)" : "var(--color-text-muted)"}
                />
                <KursRow
                  label="Standby"
                  value={kursPStandby === 1 ? "Yes" : "No"}
                  color={kursPStandby === 1 ? "var(--color-accent-orange)" : "var(--color-text-muted)"}
                />
                <KursRow
                  label="Test Mode"
                  value={kursPTestMode === 1 ? "Active" : "Off"}
                  color={kursPTestMode === 1 ? "var(--color-accent-orange)" : "var(--color-text-muted)"}
                />
                {kursPFailure === 1 && (
                  <div
                    style={{
                      marginTop: 4,
                      background: "var(--color-accent-red)",
                      borderRadius: 3,
                      padding: "2px 6px",
                      color: "#fff",
                      fontSize: 9,
                      fontWeight: 700,
                      textAlign: "center",
                    }}
                  >
                    KURS P1/P2 FAILURE
                  </div>
                )}
              </div>
            )}
          </div>

        </div>
      )}
    </PanelFrame>
  );
}
