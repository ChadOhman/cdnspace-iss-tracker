"use client";

import PanelFrame from "@/components/shared/PanelFrame";
import type { ISSTelemetry } from "@/lib/types";
import { useLocale } from "@/context/LocaleContext";

interface CommsPanelProps {
  telemetry: ISSTelemetry | null;
}

/** Small component: label + boolean On/Off with a colored dot */
function OnOffRow({ label, on }: { label: string; on: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 3 }}>
      <span style={{ color: "var(--color-text-muted)", fontSize: 9 }}>{label}</span>
      <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: on ? "var(--color-accent-green)" : "var(--color-text-muted)",
            opacity: on ? 1 : 0.4,
            boxShadow: on ? "0 0 4px rgba(0,255,136,0.6)" : "none",
          }}
        />
        <span style={{ fontSize: 9, fontWeight: 600, color: on ? "var(--color-accent-green)" : "var(--color-text-muted)" }}>
          {on ? "ON" : "OFF"}
        </span>
      </span>
    </div>
  );
}

/** Antenna position readout with az/el */
interface AntennaCardProps {
  title: string;
  on: boolean;
  azimuth: number;
  elevation: number;
  subtitle?: string;
}

function AntennaCard({ title, on, azimuth, elevation, subtitle }: AntennaCardProps) {
  return (
    <div
      style={{
        background: "var(--color-bg-secondary)",
        border: `1px solid ${on ? "var(--color-accent-cyan)" : "var(--color-border-subtle)"}`,
        borderRadius: 4,
        padding: "6px 8px",
        opacity: on ? 1 : 0.55,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
        <div>
          <div
            style={{
              color: on ? "var(--color-accent-cyan)" : "var(--color-text-muted)",
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: "0.06em",
            }}
          >
            {title}
          </div>
          {subtitle && (
            <div style={{ color: "var(--color-text-muted)", fontSize: 8, marginTop: 1 }}>
              {subtitle}
            </div>
          )}
        </div>
        <span
          style={{
            padding: "1px 5px",
            borderRadius: 3,
            background: on ? "rgba(0,255,136,0.12)" : "rgba(255,255,255,0.03)",
            border: `1px solid ${on ? "var(--color-accent-green)" : "var(--color-border-subtle)"}`,
            color: on ? "var(--color-accent-green)" : "var(--color-text-muted)",
            fontSize: 8,
            fontWeight: 700,
          }}
        >
          {on ? "ON" : "OFF"}
        </span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
        <div>
          <div style={{ color: "var(--color-text-muted)", fontSize: 8 }}>AZ</div>
          <div
            style={{
              color: "var(--color-text-primary)",
              fontSize: 11,
              fontWeight: 600,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {azimuth.toFixed(1)}°
          </div>
        </div>
        <div>
          <div style={{ color: "var(--color-text-muted)", fontSize: 8 }}>EL</div>
          <div
            style={{
              color: "var(--color-text-primary)",
              fontSize: 11,
              fontWeight: 600,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {elevation.toFixed(1)}°
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CommsPanel({ telemetry }: CommsPanelProps) {
  const { t } = useLocale();

  return (
    <PanelFrame
      title={t("panels.comms")?.toUpperCase() ?? "COMMUNICATIONS"}
      icon="📡"
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
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {/* S-Band section */}
          <div>
            <div
              style={{
                color: "var(--color-accent-cyan)",
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: "0.08em",
                marginBottom: 5,
              }}
            >
              S-BAND
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
              <AntennaCard
                title="RFG 1"
                subtitle="S1 truss"
                on={telemetry.comms.sband1On}
                azimuth={telemetry.comms.sband1Azimuth}
                elevation={telemetry.comms.sband1Elevation}
              />
              <AntennaCard
                title="RFG 2"
                subtitle="P1 truss"
                on={telemetry.comms.sband2On}
                azimuth={telemetry.comms.sband2Azimuth}
                elevation={telemetry.comms.sband2Elevation}
              />
            </div>
            {telemetry.comms.activeSband && (
              <div
                style={{
                  marginTop: 4,
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 9,
                }}
              >
                <span style={{ color: "var(--color-text-muted)" }}>Active String</span>
                <span style={{ color: "var(--color-text-primary)", fontWeight: 600 }}>
                  {telemetry.comms.activeSband || "—"}
                </span>
              </div>
            )}
          </div>

          {/* Ku-Band section */}
          <div
            style={{
              paddingTop: 6,
              borderTop: "1px solid var(--color-border-subtle)",
            }}
          >
            <div
              style={{
                color: "var(--color-accent-cyan)",
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: "0.08em",
                marginBottom: 5,
                cursor: "help",
              }}
              title="Ku-Band Space-to-Ground Antenna — steerable dish on the Z1 truss that relays high-rate data (video, science, telemetry) to ground via the TDRS satellite network"
            >
              KU-BAND (SGANT)
            </div>
            <OnOffRow label="Transmit" on={telemetry.comms.kuTransmitOn} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginTop: 4 }}>
              <div
                style={{
                  background: "var(--color-bg-secondary)",
                  border: "1px solid var(--color-border-subtle)",
                  borderRadius: 4,
                  padding: "4px 6px",
                }}
              >
                <div style={{ color: "var(--color-text-muted)", fontSize: 8 }}>Elevation</div>
                <div
                  style={{
                    color: "var(--color-text-primary)",
                    fontSize: 11,
                    fontWeight: 600,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {telemetry.comms.kuElevation.toFixed(1)}°
                </div>
              </div>
              <div
                style={{
                  background: "var(--color-bg-secondary)",
                  border: "1px solid var(--color-border-subtle)",
                  borderRadius: 4,
                  padding: "4px 6px",
                }}
              >
                <div style={{ color: "var(--color-text-muted)", fontSize: 8 }}>Cross-El</div>
                <div
                  style={{
                    color: "var(--color-text-primary)",
                    fontSize: 11,
                    fontWeight: 600,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {telemetry.comms.kuCrossElevation.toFixed(1)}°
                </div>
              </div>
            </div>
            <div
              style={{
                marginTop: 4,
                color: "var(--color-text-muted)",
                fontSize: 8,
                lineHeight: 1.4,
              }}
            >
              Space-to-Ground Antenna — high-rate data relay via TDRS
            </div>
          </div>
        </div>
      )}
    </PanelFrame>
  );
}
