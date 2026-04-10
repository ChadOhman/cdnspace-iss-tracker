"use client";

import PanelFrame from "@/components/shared/PanelFrame";
import type { ISSTelemetry } from "@/lib/types";
import { useLocale } from "@/context/LocaleContext";

interface EvaBatteryPanelProps {
  telemetry: ISSTelemetry | null;
  /** True if there's an active EVA event — panel auto-hides otherwise */
  evaActive: boolean;
}

// BCA overall status enum (AIRLOCK000019-022):
//   0 = Normal, 1 = No Data, 2 = Missing Data, 3 = Extra Data
const BCA_STATUS_LABEL: Record<number, string> = {
  0: "Normal",
  1: "No Data",
  2: "Missing",
  3: "Extra",
};

// BCA channel status enum (AIRLOCK000023-046):
//   0 = No history, 1 = Charging, 2 = Complete normal, 3 = Stop switch,
//   4 = Open circuit, 5 = Wrong batt/Hi-imp, 6 = Over-temp,
//   7 = Amp-hour OK, 8 = Amp-hour error, 9 = Low slope, 10 = Power error,
//   11 = Reverse polarity, 12 = Short circuit, 13 = Timeout,
//   14 = External temp error, 15 = Discharge, 16 = Wait discharge, 17 = Wait charge
const CHANNEL_STATUS: Record<number, { label: string; color: string }> = {
  0:  { label: "Idle",        color: "var(--color-text-muted)" },
  1:  { label: "Charging",    color: "var(--color-accent-cyan)" },
  2:  { label: "Complete",    color: "var(--color-accent-green)" },
  3:  { label: "Stop sw",     color: "var(--color-accent-orange)" },
  4:  { label: "Open ckt",    color: "var(--color-accent-red)" },
  5:  { label: "Wrong batt",  color: "var(--color-accent-red)" },
  6:  { label: "Over-temp",   color: "var(--color-accent-red)" },
  7:  { label: "A-h OK",      color: "var(--color-accent-green)" },
  8:  { label: "A-h err",     color: "var(--color-accent-red)" },
  9:  { label: "Low slope",   color: "var(--color-accent-orange)" },
  10: { label: "Pwr err",     color: "var(--color-accent-red)" },
  11: { label: "Rev pol",     color: "var(--color-accent-red)" },
  12: { label: "Short",       color: "var(--color-accent-red)" },
  13: { label: "Timeout",     color: "var(--color-accent-red)" },
  14: { label: "Ext-temp",    color: "var(--color-accent-red)" },
  15: { label: "Discharge",   color: "var(--color-accent-yellow)" },
  16: { label: "Wait dischg", color: "var(--color-text-muted)" },
  17: { label: "Wait chrg",   color: "var(--color-text-muted)" },
};

function overallStatusColor(status: number): string {
  return status === 0 ? "var(--color-accent-green)" : "var(--color-accent-orange)";
}

export default function EvaBatteryPanel({ telemetry, evaActive }: EvaBatteryPanelProps) {
  const { t } = useLocale();

  // Auto-hide when no EVA is active (even if the panel is enabled in settings)
  if (!evaActive) {
    return null;
  }

  return (
    <PanelFrame
      title={t("panels.evaBattery").toUpperCase()}
      icon="🔋"
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
          {t("orbital.awaitingData")}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div
            style={{
              color: "var(--color-text-muted)",
              fontSize: 9,
              lineHeight: 1.4,
              marginBottom: 2,
            }}
            title="Battery Charger Assemblies 1–4 in the Quest Airlock. Each BCA has 6 charge channels for EMU/REBA/SAFER batteries. Data only streams during EVA prep."
          >
            BCA 1–4 charge status (6 channels each) — Quest Airlock
          </div>
          {telemetry.emuBatteries.bcas.map((bca, idx) => {
            const bcaNum = idx + 1;
            return (
              <div
                key={bcaNum}
                style={{
                  padding: "6px 8px",
                  background: "var(--color-bg-secondary)",
                  border: "1px solid var(--color-border-subtle)",
                  borderRadius: 4,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "baseline",
                    marginBottom: 4,
                  }}
                >
                  <span
                    style={{
                      color: "var(--color-accent-cyan)",
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: "0.06em",
                    }}
                  >
                    BCA {bcaNum}
                  </span>
                  <span
                    style={{
                      color: "var(--color-text-muted)",
                      fontSize: 9,
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {bca.voltage.toFixed(1)} V / {bca.current.toFixed(1)} A
                    <span
                      style={{
                        color: overallStatusColor(bca.overallStatus),
                        marginLeft: 6,
                        fontWeight: 700,
                      }}
                    >
                      {BCA_STATUS_LABEL[bca.overallStatus] ?? `#${bca.overallStatus}`}
                    </span>
                  </span>
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(6, 1fr)",
                    gap: 3,
                  }}
                >
                  {bca.channels.map((chStatus, chIdx) => {
                    const info = CHANNEL_STATUS[chStatus] ?? {
                      label: `#${chStatus}`,
                      color: "var(--color-text-muted)",
                    };
                    return (
                      <div
                        key={chIdx}
                        title={`BCA ${bcaNum} Channel ${chIdx + 1}: ${info.label}`}
                        style={{
                          padding: "2px 2px",
                          textAlign: "center",
                          background: "rgba(0,0,0,0.25)",
                          border: `1px solid ${info.color}`,
                          borderRadius: 2,
                          fontSize: 8,
                        }}
                      >
                        <div style={{ color: "var(--color-text-muted)" }}>CH{chIdx + 1}</div>
                        <div
                          style={{
                            color: info.color,
                            fontWeight: 700,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {info.label}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </PanelFrame>
  );
}
