"use client";

import PanelFrame from "@/components/shared/PanelFrame";
import type { ISSTelemetry } from "@/lib/types";
import { useLocale } from "@/context/LocaleContext";
import { useUnits } from "@/context/UnitsContext";

interface EclssPanelProps {
  telemetry: ISSTelemetry | null;
}

interface GaugeBarProps {
  label: string;
  value: number;
  max: number;
  color: string;
  unit?: string;
}

function GaugeBar({ label, value, max, color, unit = "" }: GaugeBarProps) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div style={{ marginBottom: 6 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
        <span style={{ color: "var(--color-text-muted)", fontSize: 9 }}>{label}</span>
        <span style={{ color, fontSize: 9, fontVariantNumeric: "tabular-nums" }}>
          {value.toFixed(1)}{unit}
        </span>
      </div>
      <div
        style={{
          height: 4,
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

interface TankBarProps {
  label: string;
  percent: number;
  color: string;
}

function TankBar({ label, percent, color }: TankBarProps) {
  const pct = Math.max(0, Math.min(100, percent));
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
      <div
        style={{
          width: 22,
          height: 60,
          border: `1px solid ${color}`,
          borderRadius: 3,
          overflow: "hidden",
          position: "relative",
          background: "var(--color-bg-secondary)",
        }}
      >
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: `${pct}%`,
            background: color,
            opacity: 0.7,
            transition: "height 0.5s ease",
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--color-text-primary)",
            fontSize: 8,
            fontWeight: 700,
            fontVariantNumeric: "tabular-nums",
            zIndex: 1,
          }}
        >
          {pct.toFixed(0)}%
        </div>
      </div>
      <div style={{ color: "var(--color-text-muted)", fontSize: 8, textAlign: "center" }}>{label}</div>
    </div>
  );
}

function co2Color(mmhg: number): string {
  if (mmhg < 4) return "var(--color-accent-green)";
  if (mmhg < 7) return "var(--color-accent-orange)";
  return "var(--color-accent-red)";
}

// NASA enumerated status codes
const OGS_STATUS: Record<string, string> = {
  "0": "Process", "1": "Standby", "2": "Shutdown", "3": "Stop",
  "4": "Vent Dome", "5": "Inert Dome", "6": "Fast Shutdown", "7": "N₂ Purge Shutdown",
};
const UPA_STATUS: Record<string, string> = {
  "0": "Stop", "1": "Shutdown", "2": "Maintenance", "3": "Normal",
  "4": "Standby", "5": "Idle", "6": "System Init",
};
const WPA_STATUS: Record<string, string> = {
  "0": "Stop", "1": "Shutdown", "2": "Standby", "3": "Process",
  "4": "Hot Service", "5": "Flush", "6": "Warm Shutdown",
};
const ECLSS_DECODE: Record<string, Record<string, string>> = {
  OGS: OGS_STATUS, UPA: UPA_STATUS, WPA: WPA_STATUS,
};
const NOMINAL_STATES = new Set(["Process", "Normal", "On"]);

function StatusRow({ label, value }: { label: string; value: string }) {
  const decoded = ECLSS_DECODE[label]?.[value.trim()] ?? value;
  const isNominal = NOMINAL_STATES.has(decoded);
  const isStandby = decoded === "Standby" || decoded === "Idle";
  return (
    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
      <span style={{ color: "var(--color-text-muted)", fontSize: 9 }}>{label}</span>
      <span
        style={{
          color: isNominal
            ? "var(--color-accent-green)"
            : isStandby
              ? "var(--color-accent-cyan)"
              : "var(--color-accent-orange)",
          fontSize: 9,
          fontWeight: 600,
        }}
      >
        {decoded || "—"}
      </span>
    </div>
  );
}

export default function EclssPanel({ telemetry }: EclssPanelProps) {
  const { t } = useLocale();
  const { pressure } = useUnits();

  return (
    <PanelFrame
      title={t("panels.lifeSupport").toUpperCase()}
      icon="🫁"
      accentColor="var(--color-accent-cyan)"
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
          {/* Atmosphere column */}
          <div>
            <div
              style={{
                color: "var(--color-accent-cyan)",
                fontSize: 9,
                fontWeight: 700,
                marginBottom: 8,
                letterSpacing: "0.06em",
              }}
            >
              {t("eclss.atmosphere").toUpperCase()}
            </div>
            <GaugeBar
              label="O₂"
              value={telemetry.eclss.o2Mmhg}
              max={200}
              color="var(--color-accent-green)"
              unit=" mmHg"
            />
            <GaugeBar
              label="CO₂"
              value={telemetry.eclss.co2Mmhg}
              max={10}
              color={co2Color(telemetry.eclss.co2Mmhg)}
              unit=" mmHg"
            />
            <GaugeBar
              label="N₂"
              value={telemetry.eclss.n2Mmhg}
              max={600}
              color="var(--color-accent-cyan)"
              unit=" mmHg"
            />
            <div
              style={{
                marginTop: 8,
                paddingTop: 6,
                borderTop: "1px solid var(--color-border-subtle)",
                display: "flex",
                justifyContent: "space-between",
              }}
            >
              <span style={{ color: "var(--color-text-muted)", fontSize: 9 }}>TOTAL</span>
              <span
                style={{
                  color: "var(--color-text-primary)",
                  fontSize: 11,
                  fontWeight: 700,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {telemetry.eclss.totalMmhg.toFixed(1)}
                <span style={{ fontSize: 8, color: "var(--color-text-muted)", marginLeft: 2 }}>mmHg</span>
                {(() => {
                  const p = pressure(telemetry.pressurePsi);
                  return (
                    <span style={{ fontSize: 8, color: "var(--color-text-muted)", marginLeft: 6 }}>
                      ({p.value.toFixed(1)} {p.unit})
                    </span>
                  );
                })()}
              </span>
            </div>
          </div>

          {/* Water Recovery column */}
          <div>
            <div
              style={{
                color: "var(--color-accent-cyan)",
                fontSize: 9,
                fontWeight: 700,
                marginBottom: 8,
                letterSpacing: "0.06em",
              }}
            >
              {t("eclss.waterRecovery").toUpperCase()}
            </div>
            <div style={{ display: "flex", justifyContent: "space-around", marginBottom: 8 }}>
              <TankBar
                label={t("eclss.clean")}
                percent={telemetry.eclss.cleanWaterPercent}
                color="var(--color-accent-cyan)"
              />
              <TankBar
                label={t("eclss.waste")}
                percent={telemetry.eclss.wasteWaterPercent}
                color="var(--color-accent-orange)"
              />
              <TankBar
                label={t("eclss.urine")}
                percent={telemetry.eclss.urinePercent}
                color="var(--color-accent-yellow)"
              />
            </div>
            <StatusRow label="UPA" value={telemetry.eclss.upaStatus} />
            <StatusRow label="WPA" value={telemetry.eclss.wpaStatus} />
          </div>

          {/* O2 Generation column */}
          <div>
            <div
              style={{
                color: "var(--color-accent-cyan)",
                fontSize: 9,
                fontWeight: 700,
                marginBottom: 8,
                letterSpacing: "0.06em",
              }}
            >
              {t("eclss.o2Gen").toUpperCase()}
            </div>
            <div
              style={{
                background: "var(--color-bg-secondary)",
                border: "1px solid var(--color-border-subtle)",
                borderRadius: 4,
                padding: "8px 6px",
                textAlign: "center",
                marginBottom: 6,
              }}
            >
              <div style={{ color: "var(--color-text-muted)", fontSize: 8, marginBottom: 3 }}>
                {t("eclss.genRate").toUpperCase()}
              </div>
              {telemetry.eclss.o2GenRate > 0 ? (
                <>
                  <div
                    style={{
                      color: "var(--color-accent-green)",
                      fontSize: 18,
                      fontWeight: 700,
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {telemetry.eclss.o2GenRate.toFixed(2)}
                  </div>
                  <div style={{ color: "var(--color-text-muted)", fontSize: 8 }}>mg/sec</div>
                </>
              ) : (
                <div style={{ color: "var(--color-text-muted)", fontSize: 11, marginTop: 4 }}>
                  Standby
                </div>
              )}
            </div>
            <StatusRow label="OGS" value={telemetry.eclss.ogsStatus} />
            <div
              style={{
                marginTop: 8,
                paddingTop: 6,
                borderTop: "1px solid var(--color-border-subtle)",
              }}
            >
              <div style={{ color: "var(--color-text-muted)", fontSize: 8, marginBottom: 3 }}>DESTINY CO₂</div>
              <div
                style={{
                  color: co2Color(telemetry.eclss.uslabCo2Mmhg),
                  fontSize: 11,
                  fontWeight: 700,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {telemetry.eclss.uslabCo2Mmhg.toFixed(1)}
                <span style={{ fontSize: 8, color: "var(--color-text-muted)", marginLeft: 2 }}>mmHg</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </PanelFrame>
  );
}
