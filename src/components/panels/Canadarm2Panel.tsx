"use client";

import PanelFrame from "@/components/shared/PanelFrame";
import type { ISSTelemetry } from "@/lib/types";
import { useLocale } from "@/context/LocaleContext";

interface Canadarm2PanelProps {
  telemetry: ISSTelemetry | null;
}

// SSRMS base location enum from NASA ISSLive
const BASE_LOCATION_MAP: Record<string, string> = {
  "1": "Lab (Destiny)",
  "2": "Node 3 (Tranquility)",
  "4": "Node 2 (Harmony)",
  "7": "MBS PDGF 1",
  "8": "MBS PDGF 2",
  "11": "MBS PDGF 3",
  "13": "MBS PDGF 4",
  "14": "FGB (Zarya)",
  "16": "POA",
  "19": "SSRMS Tip LEE",
  "63": "Undefined",
};

const LEE_MAP: Record<string, string> = {
  "0": "LEE A",
  "5": "LEE B",
};

const TIP_LEE_STATUS: Record<string, { label: string; color: string }> = {
  "0": { label: "Released", color: "var(--color-text-muted)" },
  "1": { label: "Captive",  color: "var(--color-accent-orange)" },
  "2": { label: "Captured", color: "var(--color-accent-green)" },
};

interface JointRowProps {
  label: string;
  abbrev: string;
  value: number;
}

function JointRow({ label, abbrev, value }: JointRowProps) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        padding: "3px 0",
        borderBottom: "1px solid var(--color-border-subtle)",
        gap: 8,
      }}
    >
      <span
        style={{
          color: "var(--color-accent-red)",
          fontSize: 9,
          fontWeight: 700,
          width: 24,
          flexShrink: 0,
        }}
      >
        {abbrev}
      </span>
      <span
        style={{
          color: "var(--color-text-muted)",
          fontSize: 9,
          flex: 1,
        }}
      >
        {label}
      </span>
      <span
        style={{
          color: "var(--color-text-primary)",
          fontSize: 10,
          fontWeight: 600,
          fontVariantNumeric: "tabular-nums",
          minWidth: 56,
          textAlign: "right",
        }}
      >
        {value.toFixed(1)}°
      </span>
    </div>
  );
}

export default function Canadarm2Panel({ telemetry }: Canadarm2PanelProps) {
  const { t } = useLocale();

  return (
    <PanelFrame
      title={t("panels.canadarm")?.toUpperCase() ?? "CANADARM2 (SSRMS)"}
      icon="🦾"
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
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {/* Base info */}
          <div
            style={{
              background: "var(--color-bg-secondary)",
              border: "1px solid var(--color-border-subtle)",
              borderRadius: 4,
              padding: "6px 8px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, marginBottom: 3 }}>
              <span
                style={{ color: "var(--color-text-muted)", cursor: "help" }}
                title="Which ISS module or payload the SSRMS is currently based (anchored) on"
              >
                BASE
              </span>
              <span style={{ color: "var(--color-text-primary)", fontWeight: 600 }}>
                {BASE_LOCATION_MAP[telemetry.robotics.ssrms.baseLocation.trim()] ??
                  telemetry.robotics.ssrms.baseLocation ??
                  "—"}
              </span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, marginBottom: 3 }}>
              <span
                style={{ color: "var(--color-text-muted)", cursor: "help" }}
                title="Latching End Effector — SSRMS has two LEEs (A and B), either can serve as the anchored base with the other as the free tip"
              >
                OPERATING LEE
              </span>
              <span style={{ color: "var(--color-accent-cyan)", fontWeight: 600 }}>
                {LEE_MAP[telemetry.robotics.ssrms.operatingBase.trim()] ??
                  telemetry.robotics.ssrms.operatingBase ??
                  "—"}
              </span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9 }}>
              <span
                style={{ color: "var(--color-text-muted)", cursor: "help" }}
                title="What the free end (tip LEE) is currently holding — released, about to capture (captive), or fully captured"
              >
                TIP LEE
              </span>
              {(() => {
                const tip = TIP_LEE_STATUS[telemetry.robotics.ssrms.tipLeeStatus.trim()] ?? {
                  label: telemetry.robotics.ssrms.tipLeeStatus || "—",
                  color: "var(--color-text-muted)",
                };
                return (
                  <span style={{ color: tip.color, fontWeight: 600 }}>{tip.label}</span>
                );
              })()}
            </div>
          </div>

          {/* 7 joint angles */}
          <div>
            <div
              style={{
                color: "var(--color-accent-red)",
                fontSize: 9,
                fontWeight: 700,
                marginBottom: 4,
                letterSpacing: "0.06em",
                cursor: "help",
              }}
              title="Canadarm2 is a 7-degree-of-freedom robotic arm: 3 shoulder joints, 1 elbow joint, and 3 wrist joints"
            >
              JOINT POSITIONS
            </div>
            <JointRow label="Shoulder Roll"  abbrev="SR" value={telemetry.robotics.ssrms.shoulderRoll} />
            <JointRow label="Shoulder Yaw"   abbrev="SY" value={telemetry.robotics.ssrms.shoulderYaw} />
            <JointRow label="Shoulder Pitch" abbrev="SP" value={telemetry.robotics.ssrms.shoulderPitch} />
            <JointRow label="Elbow Pitch"    abbrev="EP" value={telemetry.robotics.ssrms.elbowPitch} />
            <JointRow label="Wrist Pitch"    abbrev="WP" value={telemetry.robotics.ssrms.wristPitch} />
            <JointRow label="Wrist Yaw"      abbrev="WY" value={telemetry.robotics.ssrms.wristYaw} />
            <JointRow label="Wrist Roll"     abbrev="WR" value={telemetry.robotics.ssrms.wristRoll} />
          </div>

          {/* Mobile Transporter */}
          {telemetry.robotics.mtPosition > 0 && (
            <div
              style={{
                paddingTop: 6,
                borderTop: "1px solid var(--color-border-subtle)",
                display: "flex",
                justifyContent: "space-between",
                fontSize: 9,
              }}
            >
              <span
                style={{ color: "var(--color-text-muted)", cursor: "help" }}
                title="Mobile Transporter — rail cart on the ITS truss that moves the Mobile Base System (and attached SSRMS) along the length of the station"
              >
                MOBILE TRANSPORTER
              </span>
              <span style={{ color: "var(--color-accent-cyan)", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
                {telemetry.robotics.mtPosition.toFixed(0)} cm
              </span>
            </div>
          )}
        </div>
      )}
    </PanelFrame>
  );
}
