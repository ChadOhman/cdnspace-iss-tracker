"use client";

import PanelFrame from "@/components/shared/PanelFrame";
import type { ISSTelemetry } from "@/lib/types";
import { useLocale } from "@/context/LocaleContext";
import { useUnits } from "@/context/UnitsContext";

interface AttitudePanelProps {
  telemetry: ISSTelemetry | null;
}

type TemperatureConverter = (celsius: number) => { value: number; unit: string };

interface CmgCardProps {
  index: number;
  on: boolean;
  spinRate: number;
  spinMotorTemp: number;
  vibration: number;
  temperature: TemperatureConverter;
}

function CmgCard({ index, on, spinRate, spinMotorTemp, vibration, temperature }: CmgCardProps) {
  const tempConverted = temperature(spinMotorTemp);
  return (
    <div
      style={{
        background: "var(--color-bg-secondary)",
        border: `1px solid ${on ? "var(--color-accent-green)" : "var(--color-border-subtle)"}`,
        borderRadius: 4,
        padding: "5px 6px",
        opacity: on ? 1 : 0.45,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 3,
        }}
      >
        <span style={{ color: "var(--color-text-muted)", fontSize: 8 }}>CMG {index + 1}</span>
        <span
          style={{
            fontSize: 8,
            fontWeight: 700,
            color: on ? "var(--color-accent-green)" : "var(--color-text-muted)",
          }}
        >
          {on ? "ON" : "OFF"}
        </span>
      </div>
      <div
        style={{
          color: on ? "var(--color-accent-green)" : "var(--color-text-muted)",
          fontSize: 14,
          fontWeight: 700,
          fontVariantNumeric: "tabular-nums",
          marginBottom: 2,
        }}
      >
        {spinRate.toFixed(0)}
        <span style={{ fontSize: 8, color: "var(--color-text-muted)", marginLeft: 2 }}>RPM</span>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <span style={{ color: "var(--color-text-muted)", fontSize: 8 }}>
          {tempConverted.value.toFixed(1)}{tempConverted.unit}
        </span>
        <span style={{ color: "var(--color-text-muted)", fontSize: 8 }}>
          {vibration.toFixed(3)}g
        </span>
      </div>
    </div>
  );
}

interface StatusRowProps {
  label: string;
  value: string;
}

const NOMINAL_GNC = new Set(["CMG Attitude Control", "Attitude Hold", "Standard", "LVLH", "GPS 1", "GPS 2", "Momentum Mgmt"]);
const CAUTION_GNC = new Set(["Free Drift", "CMG Thruster Assist", "Reboost", "Proximity Ops", "External Ops", "Survival", "ASCR", "None"]);

function StatusRow({ label, value }: StatusRowProps) {
  const isNominal = NOMINAL_GNC.has(value);
  const isCaution = CAUTION_GNC.has(value);
  const valueColor = isNominal
    ? "var(--color-accent-green)"
    : isCaution
      ? "var(--color-accent-orange)"
      : "var(--color-text-primary)";

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        marginBottom: 3,
        padding: "2px 0",
        borderBottom: "1px solid var(--color-border-subtle)",
      }}
    >
      <span style={{ color: "var(--color-text-muted)", fontSize: 9 }}>{label}</span>
      <span style={{ color: valueColor, fontSize: 9, fontWeight: 600 }}>
        {value || "—"}
      </span>
    </div>
  );
}

interface AngleRowProps {
  label: string;
  value: number;
  rateErr: number;
  unit?: string;
}

function AngleRow({ label, value, rateErr }: AngleRowProps) {
  return (
    <div style={{ marginBottom: 5 }}>
      <div style={{ color: "var(--color-text-muted)", fontSize: 8, marginBottom: 1 }}>{label}</div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
        <span
          style={{
            color: "var(--color-accent-orange)",
            fontSize: 14,
            fontWeight: 700,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {value.toFixed(2)}°
        </span>
        <span style={{ color: "var(--color-text-muted)", fontSize: 8, fontVariantNumeric: "tabular-nums" }}>
          Δ {rateErr.toFixed(4)} °/s
        </span>
      </div>
    </div>
  );
}

export default function AttitudePanel({ telemetry }: AttitudePanelProps) {
  const { t } = useLocale();
  const { temperature } = useUnits();

  const stationAlarmActive = (telemetry?.attitude.stationAlarm ?? 0) !== 0;
  const gyroAlarmActive    = (telemetry?.attitude.gyroAlarm    ?? 0) !== 0;
  const anyAlarm           = stationAlarmActive || gyroAlarmActive;

  return (
    <PanelFrame
      title={t("panels.attitudeControl").toUpperCase()}
      icon="🔄"
      accentColor="var(--color-accent-orange)"
    >
      {/* ── Alarm banners ──────────────────────────────────────────────────── */}
      {stationAlarmActive && (
        <div
          style={{
            marginBottom: 6,
            padding: "5px 8px",
            borderRadius: 4,
            background: "rgba(255, 51, 51, 0.15)",
            border: "1px solid var(--color-accent-red)",
            display: "flex",
            alignItems: "center",
            gap: 6,
            animation: "attitudeAlarmPulse 1s ease-in-out infinite",
          }}
        >
          <span style={{ fontSize: 11 }}>⚠</span>
          <span
            style={{
              color: "var(--color-accent-red)",
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.08em",
            }}
          >
            ATTITUDE ALARM
          </span>
          <span style={{ color: "var(--color-text-muted)", fontSize: 9, marginLeft: "auto" }}>
            Code {telemetry!.attitude.stationAlarm}
          </span>
        </div>
      )}
      {gyroAlarmActive && (
        <div
          style={{
            marginBottom: 6,
            padding: "5px 8px",
            borderRadius: 4,
            background: "rgba(255, 51, 51, 0.15)",
            border: "1px solid var(--color-accent-red)",
            display: "flex",
            alignItems: "center",
            gap: 6,
            animation: "attitudeAlarmPulse 1s ease-in-out infinite",
          }}
        >
          <span style={{ fontSize: 11 }}>⚠</span>
          <span
            style={{
              color: "var(--color-accent-red)",
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.08em",
            }}
          >
            GYRO ALARM
          </span>
          <span style={{ color: "var(--color-text-muted)", fontSize: 9, marginLeft: "auto" }}>
            Code {telemetry!.attitude.gyroAlarm}
          </span>
        </div>
      )}
      {/* Keyframe for alarm pulse — injected inline via a style tag */}
      {anyAlarm && (
        <style>{`
          @keyframes attitudeAlarmPulse {
            0%, 100% { opacity: 1; }
            50%       { opacity: 0.5; }
          }
        `}</style>
      )}

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
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {/* CMG Status */}
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
              {t("attitude.cmgStatus").toUpperCase()}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
              {telemetry.cmgs.map((cmg, i) => (
                <CmgCard
                  key={i}
                  index={i}
                  on={cmg.on}
                  spinRate={cmg.spinRate}
                  spinMotorTemp={cmg.spinMotorTemp}
                  vibration={cmg.vibration}
                  temperature={temperature}
                />
              ))}
            </div>
          </div>

          {/* Attitude data */}
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
              {t("attitude.gnc").toUpperCase()}
            </div>
            <StatusRow label="GNC MODE" value={telemetry.attitude.gncMode} />
            <StatusRow label="NAV SOURCE" value={telemetry.attitude.navSource} />
            <StatusRow label="REF FRAME" value={telemetry.attitude.refFrame} />
            <StatusRow label="STATION MODE" value={telemetry.attitude.stationMode} />

            <div style={{ marginTop: 8 }}>
              <AngleRow
                label={t("attitude.roll").toUpperCase()}
                value={telemetry.attitude.roll}
                rateErr={telemetry.attitude.rollRateErr}
              />
              <AngleRow
                label={t("attitude.pitch").toUpperCase()}
                value={telemetry.attitude.pitch}
                rateErr={telemetry.attitude.pitchRateErr}
              />
              <AngleRow
                label={t("attitude.yaw").toUpperCase()}
                value={telemetry.attitude.yaw}
                rateErr={telemetry.attitude.yawRateErr}
              />
            </div>

            <div
              style={{
                marginTop: 6,
                paddingTop: 6,
                borderTop: "1px solid var(--color-border-subtle)",
              }}
            >
              <div style={{ color: "var(--color-text-muted)", fontSize: 8, marginBottom: 3, cursor: "help" }} title="CMG momentum as percentage of capacity. High saturation requires thruster desaturation.">
                {t("attitude.momentum").toUpperCase()}
              </div>
              {(() => {
                const rawNms = telemetry.attitude.momentumSaturation;
                const capacity = telemetry.attitude.momentumCapacity;
                // Prefer NASA's direct percentage channel; fall back to computed
                const pct = telemetry.attitude.momentumPercent > 0
                  ? telemetry.attitude.momentumPercent
                  : capacity > 0
                    ? (rawNms / capacity) * 100
                    : 0;
                return (
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <div
                      style={{
                        flex: 1,
                        height: 4,
                        borderRadius: 2,
                        background: "var(--color-border-subtle)",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          height: "100%",
                          width: `${Math.min(100, pct)}%`,
                          background:
                            pct > 80
                              ? "var(--color-accent-red)"
                              : pct > 50
                              ? "var(--color-accent-orange)"
                              : "var(--color-accent-green)",
                          transition: "width 0.5s ease",
                          borderRadius: 2,
                        }}
                      />
                    </div>
                    <span
                      style={{
                        color: "var(--color-text-secondary)",
                        fontSize: 9,
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {pct.toFixed(1)}%
                    </span>
                    <span style={{ color: "var(--color-text-muted)", fontSize: 8 }}>
                      ({rawNms.toFixed(0)} / {capacity > 0 ? capacity.toFixed(0) : "—"} Nms)
                    </span>
                  </div>
                );
              })()}
            </div>

            <div
              style={{
                marginTop: 6,
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                gap: 4,
              }}
            >
              {[
                { label: "τ-R", value: telemetry.attitude.cmdTorqueRoll },
                { label: "τ-P", value: telemetry.attitude.cmdTorquePitch },
                { label: "τ-Y", value: telemetry.attitude.cmdTorqueYaw },
              ].map(({ label, value }) => (
                <div
                  key={label}
                  style={{
                    background: "var(--color-bg-secondary)",
                    border: "1px solid var(--color-border-subtle)",
                    borderRadius: 4,
                    padding: "3px 5px",
                    textAlign: "center",
                  }}
                >
                  <div style={{ color: "var(--color-text-muted)", fontSize: 8 }}>{label}</div>
                  <div
                    style={{
                      color: "var(--color-text-secondary)",
                      fontSize: 9,
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {value.toFixed(1)}
                    <span style={{ fontSize: 7, color: "var(--color-text-muted)", marginLeft: 1 }}>Nm</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </PanelFrame>
  );
}
