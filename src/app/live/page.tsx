"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useTelemetryStream } from "@/hooks/useTelemetryStream";
import { useBuildCheck } from "@/hooks/useBuildCheck";
import { useLocale } from "@/context/LocaleContext";
import type { ISSEvent, OrbitalState, ISSTelemetry } from "@/lib/types";

// ─── Helper: format seconds as HH:MM:SS ─────────────────────────────────────

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return [h, m, s].map((v) => String(v).padStart(2, "0")).join(":");
}

// ─── Shared sub-components ───────────────────────────────────────────────────

function SectionHeader({ label }: { label: string }) {
  return (
    <div style={{
      fontSize: 9,
      color: "var(--color-accent-cyan)",
      letterSpacing: "0.12em",
      borderBottom: "1px solid rgba(0,229,255,0.15)",
      paddingBottom: 5,
      marginBottom: 6,
    }}>
      {label}
    </div>
  );
}

function DataRow({
  label,
  value,
  unit,
  highlight,
  valueColor,
}: {
  label: string;
  value: string | number;
  unit?: string;
  highlight?: boolean;
  valueColor?: string;
}) {
  return (
    <div style={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "baseline",
      fontSize: 10,
      padding: "2px 0",
    }}>
      <span style={{ color: "var(--color-text-muted)", fontSize: 9, letterSpacing: "0.04em" }}>
        {label}
      </span>
      <span style={{
        color: valueColor ?? (highlight ? "var(--color-accent-cyan)" : "var(--color-text-primary)"),
        fontVariantNumeric: "tabular-nums",
      }}>
        {value}{unit ? <span style={{ color: "var(--color-text-muted)", fontSize: 9, marginLeft: 2 }}>{unit}</span> : null}
      </span>
    </div>
  );
}

function Panel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      background: "var(--color-bg-panel)",
      border: "1px solid var(--color-border-accent)",
      borderRadius: 4,
      padding: "8px 10px",
    }}>
      {children}
    </div>
  );
}

// ─── Event timer ─────────────────────────────────────────────────────────────

function EventTimer({ startMs }: { startMs: number }) {
  const [elapsed, setElapsed] = useState(
    Math.max(0, Math.floor((Date.now() - startMs) / 1000))
  );

  useEffect(() => {
    const id = setInterval(() => {
      setElapsed(Math.max(0, Math.floor((Date.now() - startMs) / 1000)));
    }, 1000);
    return () => clearInterval(id);
  }, [startMs]);

  return <span>{formatDuration(elapsed)}</span>;
}

// ─── Event banner ────────────────────────────────────────────────────────────

function EventBanner({
  event,
  timerLabel,
  accentColor,
}: {
  event: ISSEvent;
  timerLabel: string;
  accentColor: string;
}) {
  return (
    <div style={{
      background: `rgba(0,0,0,0.4)`,
      border: `1px solid ${accentColor}`,
      borderRadius: 4,
      padding: "8px 10px",
      marginBottom: 8,
    }}>
      <div style={{ fontSize: 9, color: accentColor, letterSpacing: "0.12em", marginBottom: 3 }}>
        {event.type.toUpperCase()}
      </div>
      <div style={{ fontSize: 12, color: "var(--color-text-primary)", fontWeight: 600, marginBottom: 4 }}>
        {event.title}
      </div>
      {event.actualStart && (
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--color-text-muted)" }}>
          <span style={{ fontSize: 9, letterSpacing: "0.04em" }}>{timerLabel}</span>
          <span style={{ color: accentColor, fontVariantNumeric: "tabular-nums" }}>
            <EventTimer startMs={event.actualStart} />
          </span>
        </div>
      )}
    </div>
  );
}

// ─── Sidebar sections per event type ─────────────────────────────────────────

function EvaSection({
  event,
  telemetry,
  t,
}: {
  event: ISSEvent;
  telemetry: ISSTelemetry | null;
  t: (k: string) => string;
}) {
  const al = telemetry?.airlock;
  const att = telemetry?.attitude;

  return (
    <>
      <EventBanner event={event} timerLabel={t("pages.eventTimer")} accentColor="var(--color-accent-purple)" />

      {event.metadata?.ev1 || event.metadata?.ev2 ? (
        <Panel>
          <SectionHeader label="CREW" />
          {event.metadata.ev1 && <DataRow label={t("pages.ev1")} value={event.metadata.ev1} />}
          {event.metadata.ev2 && <DataRow label={t("pages.ev2")} value={event.metadata.ev2} />}
        </Panel>
      ) : null}

      <Panel>
        <SectionHeader label={t("pages.evaAirlock")} />
        <DataRow label="Crewlock" value={al ? al.crewLockPressureMmhg.toFixed(0) : "—"} unit="mmHg" />
        <DataRow label="Equip Lock" value={al ? al.equipLockPressureMmhg.toFixed(0) : "—"} unit="mmHg" />
        <DataRow label={t("pages.o2HighTank")} value={al ? al.o2HighTank.toFixed(1) : "—"} unit="psi" />
        <DataRow label={t("pages.o2LowTank")} value={al ? al.o2LowTank.toFixed(1) : "—"} unit="psi" />
        <DataRow label={t("pages.pumpStatus")} value={al ? al.crewLockPump : "—"} />
        <DataRow label={t("pages.emu1Status")} value={al ? `${al.emu1O2Pressure.toFixed(0)} psi` : "—"} />
        <DataRow label={t("pages.emu2Status")} value={al ? `${al.emu2O2Pressure.toFixed(0)} psi` : "—"} />
      </Panel>

      <Panel>
        <SectionHeader label={t("pages.evaAttitude")} />
        <DataRow label={t("pages.roll")} value={att ? att.roll.toFixed(2) : "—"} unit="°" />
        <DataRow label={t("pages.pitch")} value={att ? att.pitch.toFixed(2) : "—"} unit="°" />
        <DataRow label={t("pages.yaw")} value={att ? att.yaw.toFixed(2) : "—"} unit="°" />
      </Panel>
    </>
  );
}

function DockingSection({
  event,
  telemetry,
  t,
}: {
  event: ISSEvent;
  telemetry: ISSTelemetry | null;
  t: (k: string) => string;
}) {
  const att = telemetry?.attitude;

  return (
    <>
      <EventBanner event={event} timerLabel={t("pages.eventTimer")} accentColor="var(--color-accent-orange)" />

      {event.metadata?.vehicle && (
        <Panel>
          <SectionHeader label="VEHICLE" />
          <DataRow label={t("pages.vehicle")} value={event.metadata.vehicle} highlight />
        </Panel>
      )}

      <Panel>
        <SectionHeader label={t("pages.dockingAttitude")} />
        <DataRow label={t("pages.gncMode")} value={att ? att.gncMode : "—"} highlight />
        <DataRow label={t("pages.roll")} value={att ? att.roll.toFixed(2) : "—"} unit="°" />
        <DataRow label={t("pages.pitch")} value={att ? att.pitch.toFixed(2) : "—"} unit="°" />
        <DataRow label={t("pages.yaw")} value={att ? att.yaw.toFixed(2) : "—"} unit="°" />
        {telemetry?.attitude && (
          <>
            <DataRow label={t("pages.cmdTorqueRoll")} value={att!.cmdTorqueRoll.toFixed(1)} unit="Nm" />
            <DataRow label={t("pages.cmdTorquePitch")} value={att!.cmdTorquePitch.toFixed(1)} unit="Nm" />
            <DataRow label={t("pages.cmdTorqueYaw")} value={att!.cmdTorqueYaw.toFixed(1)} unit="Nm" />
          </>
        )}
      </Panel>

      <Panel>
        <SectionHeader label={t("pages.dockingMode")} />
        <DataRow label={t("pages.stationMode")} value={att ? att.stationMode : "—"} highlight />
      </Panel>
    </>
  );
}

function Canadarm2Diagram({ ssrms }: { ssrms: ISSTelemetry["robotics"]["ssrms"] }) {
  // Simplified 2D side-view of Canadarm2
  // The arm has 3 main segments: shoulder→elbow, elbow→wrist, wrist→tip
  // We use pitch angles to rotate each segment
  const w = 320;
  const h = 180;
  const baseX = 40;
  const baseY = h / 2;
  const seg1 = 90; // shoulder to elbow
  const seg2 = 90; // elbow to wrist
  const seg3 = 40; // wrist to tip

  const shoulderRad = (ssrms.shoulderPitch * Math.PI) / 180;
  const elbowRad = (ssrms.elbowPitch * Math.PI) / 180;
  const wristRad = (ssrms.wristPitch * Math.PI) / 180;

  // Forward kinematics
  let angle = shoulderRad;
  const elbowX = baseX + seg1 * Math.cos(angle);
  const elbowY = baseY - seg1 * Math.sin(angle);

  angle += elbowRad;
  const wristX = elbowX + seg2 * Math.cos(angle);
  const wristY = elbowY - seg2 * Math.sin(angle);

  angle += wristRad;
  const tipX = wristX + seg3 * Math.cos(angle);
  const tipY = wristY - seg3 * Math.sin(angle);

  const tipStatus = ssrms.tipLeeStatus;
  const tipColor =
    tipStatus === "2"
      ? "#00ff88"
      : tipStatus === "1"
        ? "#ff8c00"
        : "#94adc4";
  const tipLabel =
    tipStatus === "2"
      ? "CAPTURED"
      : tipStatus === "1"
        ? "CAPTIVE"
        : "RELEASED";

  return (
    <div style={{ padding: "8px 0" }}>
      <svg
        viewBox={`0 0 ${w} ${h}`}
        width="100%"
        height={h}
        style={{ display: "block" }}
      >
        {/* ISS body */}
        <rect
          x={0}
          y={baseY - 12}
          width={baseX - 4}
          height={24}
          rx={3}
          fill="rgba(0,229,255,0.1)"
          stroke="rgba(0,229,255,0.3)"
          strokeWidth={1}
        />
        <text
          x={(baseX - 4) / 2}
          y={baseY + 3}
          textAnchor="middle"
          fill="#94adc4"
          fontSize={7}
          fontFamily="monospace"
        >
          ISS
        </text>

        {/* Shoulder joint */}
        <circle cx={baseX} cy={baseY} r={4} fill="rgba(0,229,255,0.3)" stroke="#00e5ff" strokeWidth={1} />

        {/* Segment 1: shoulder → elbow */}
        <line x1={baseX} y1={baseY} x2={elbowX} y2={elbowY} stroke="#00e5ff" strokeWidth={3} strokeLinecap="round" />

        {/* Elbow joint */}
        <circle cx={elbowX} cy={elbowY} r={4} fill="rgba(0,229,255,0.3)" stroke="#00e5ff" strokeWidth={1} />

        {/* Segment 2: elbow → wrist */}
        <line x1={elbowX} y1={elbowY} x2={wristX} y2={wristY} stroke="#00e5ff" strokeWidth={3} strokeLinecap="round" />

        {/* Wrist joint */}
        <circle cx={wristX} cy={wristY} r={3} fill="rgba(0,229,255,0.3)" stroke="#00e5ff" strokeWidth={1} />

        {/* Segment 3: wrist → tip (LEE) */}
        <line x1={wristX} y1={wristY} x2={tipX} y2={tipY} stroke={tipColor} strokeWidth={2} strokeLinecap="round" />

        {/* Tip LEE */}
        <circle cx={tipX} cy={tipY} r={5} fill={tipColor} fillOpacity={0.3} stroke={tipColor} strokeWidth={1.5} />

        {/* Tip status label */}
        <text
          x={tipX}
          y={tipY - 10}
          textAnchor="middle"
          fill={tipColor}
          fontSize={8}
          fontFamily="monospace"
          fontWeight={700}
        >
          {tipLabel}
        </text>
      </svg>
    </div>
  );
}

function BerthingSection({
  event,
  telemetry,
  t,
}: {
  event: ISSEvent;
  telemetry: ISSTelemetry | null;
  t: (k: string) => string;
}) {
  const att = telemetry?.attitude;
  const ssrms = telemetry?.robotics?.ssrms;

  const BASE_LOCATION_MAP: Record<string, string> = {
    "1": "Lab (Destiny)",
    "2": "Node 3 (Tranquility)",
    "4": "Node 2 (Harmony)",
    "7": "MBS PDGF 1",
    "8": "MBS PDGF 2",
  };

  const TIP_STATUS: Record<string, { label: string; color: string }> = {
    "0": { label: "Released", color: "var(--color-text-muted)" },
    "1": { label: "Captive", color: "var(--color-accent-orange)" },
    "2": { label: "Captured", color: "var(--color-accent-green)" },
  };

  const tipInfo = TIP_STATUS[ssrms?.tipLeeStatus ?? ""] ?? TIP_STATUS["0"];

  return (
    <>
      <EventBanner event={event} timerLabel={t("pages.eventTimer")} accentColor="var(--color-accent-orange)" />

      {event.metadata?.vehicle && (
        <Panel>
          <SectionHeader label="VEHICLE" />
          <DataRow label="Vehicle" value={event.metadata.vehicle} highlight />
          {event.metadata.operator && (
            <DataRow label="Operator" value={event.metadata.operator} />
          )}
        </Panel>
      )}

      {/* Canadarm2 visualization */}
      {ssrms && (
        <Panel>
          <SectionHeader label="CANADARM2 (SSRMS)" />
          <Canadarm2Diagram ssrms={ssrms} />
          <DataRow
            label="Tip LEE"
            value={tipInfo.label}
            highlight
            valueColor={tipInfo.color}
          />
          <DataRow
            label="Base"
            value={BASE_LOCATION_MAP[ssrms.baseLocation] ?? ssrms.baseLocation}
          />
          <DataRow label="Shoulder Pitch" value={ssrms.shoulderPitch.toFixed(1)} unit="°" />
          <DataRow label="Elbow Pitch" value={ssrms.elbowPitch.toFixed(1)} unit="°" />
          <DataRow label="Wrist Pitch" value={ssrms.wristPitch.toFixed(1)} unit="°" />
        </Panel>
      )}

      <Panel>
        <SectionHeader label="ATTITUDE — PROXIMITY OPS" />
        <DataRow label="GNC Mode" value={att ? att.gncMode : "—"} highlight />
        <DataRow label="Station Mode" value={att ? att.stationMode : "—"} highlight />
        <DataRow label="Roll" value={att ? att.roll.toFixed(2) : "—"} unit="°" />
        <DataRow label="Pitch" value={att ? att.pitch.toFixed(2) : "—"} unit="°" />
        <DataRow label="Yaw" value={att ? att.yaw.toFixed(2) : "—"} unit="°" />
      </Panel>
    </>
  );
}

function ReboostSection({
  event,
  orbital,
  telemetry,
  t,
}: {
  event: ISSEvent;
  orbital: OrbitalState | null;
  telemetry: ISSTelemetry | null;
  t: (k: string) => string;
}) {
  const att = telemetry?.attitude;
  const cmgs = telemetry?.cmgs ?? [];

  return (
    <>
      <EventBanner event={event} timerLabel={t("pages.burnTimer")} accentColor="var(--color-accent-orange)" />

      <Panel>
        <SectionHeader label={t("pages.reboostOrbital")} />
        <DataRow label={t("pages.currentAlt")} value={orbital ? Math.round(orbital.altitude) : "—"} unit="km" highlight />
        {event.metadata?.targetAlt && (
          <DataRow label={t("pages.targetAlt")} value={event.metadata.targetAlt} unit="km" />
        )}
        {event.metadata?.deltaV && (
          <DataRow label={t("pages.deltaV")} value={event.metadata.deltaV} unit="m/s" />
        )}
      </Panel>

      <Panel>
        <SectionHeader label={t("pages.reboostAttitude")} />
        <DataRow label={t("pages.cmdTorqueRoll")} value={att ? att.cmdTorqueRoll.toFixed(1) : "—"} unit="Nm" highlight />
        <DataRow label={t("pages.cmdTorquePitch")} value={att ? att.cmdTorquePitch.toFixed(1) : "—"} unit="Nm" highlight />
        <DataRow label={t("pages.cmdTorqueYaw")} value={att ? att.cmdTorqueYaw.toFixed(1) : "—"} unit="Nm" highlight />
        <DataRow label={t("pages.momentumSat")} value={att ? att.momentumSaturation.toFixed(1) : "—"} unit="%" />
      </Panel>

      {cmgs.length > 0 && (
        <Panel>
          <SectionHeader label={t("pages.cmgStatus")} />
          {cmgs.map((cmg, i) => (
            <DataRow
              key={i}
              label={`CMG ${i + 1}`}
              value={cmg.on ? `${cmg.spinRate.toFixed(0)} RPM` : "OFF"}
              highlight={cmg.on}
            />
          ))}
        </Panel>
      )}
    </>
  );
}

function NoEventSection({
  orbital,
  telemetry,
  t,
}: {
  orbital: OrbitalState | null;
  telemetry: ISSTelemetry | null;
  t: (k: string) => string;
}) {
  return (
    <>
      <div style={{
        padding: "10px",
        background: "rgba(0,0,0,0.3)",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: 4,
        fontSize: 10,
        color: "var(--color-text-muted)",
        lineHeight: 1.6,
        marginBottom: 8,
      }}>
        <div style={{ color: "var(--color-text-secondary)", fontWeight: 600, marginBottom: 4, fontSize: 9, letterSpacing: "0.1em" }}>
          {t("pages.noActiveEventTitle")}
        </div>
        {t("pages.noActiveEvent")}
      </div>

      <Panel>
        <SectionHeader label={t("pages.orbitalSummary")} />
        <DataRow label={t("topbar.altitude")} value={orbital ? Math.round(orbital.altitude) : "—"} unit="km" highlight />
        <DataRow label={t("topbar.speed")} value={orbital ? Math.round(orbital.speedKmH).toLocaleString() : "—"} unit="km/h" />
        <DataRow label={t("topbar.orbit")} value={orbital ? orbital.revolutionNumber.toLocaleString() : "—"} />
        <DataRow label={t("orbital.period")} value={orbital ? `${orbital.period.toFixed(1)} min` : "—"} />
      </Panel>

      {telemetry && (
        <Panel>
          <SectionHeader label={t("pages.systemsSummary")} />
          <DataRow label={t("systems.power")} value={telemetry.powerKw.toFixed(1)} unit="kW" highlight />
          <DataRow label={t("systems.atmosphere")} value={telemetry.pressurePsi.toFixed(2)} unit="psi" />
          <DataRow label={t("systems.thermal")} value={telemetry.temperatureC.toFixed(1)} unit="°C" />
        </Panel>
      )}
    </>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function LivePage() {
  useBuildCheck([]);
  const { t } = useLocale();
  const { orbital, telemetry, activeEvent, connected } = useTelemetryStream();

  function renderSidebar(event: ISSEvent | null) {
    if (!event) {
      return <NoEventSection orbital={orbital} telemetry={telemetry} t={t} />;
    }
    switch (event.type) {
      case "eva":
        return <EvaSection event={event} telemetry={telemetry} t={t} />;
      case "docking":
      case "undocking":
        return <DockingSection event={event} telemetry={telemetry} t={t} />;
      case "berthing":
        return <BerthingSection event={event} telemetry={telemetry} t={t} />;
      case "reboost":
      case "maneuver":
        return <ReboostSection event={event} orbital={orbital} telemetry={telemetry} t={t} />;
      default:
        return <NoEventSection orbital={orbital} telemetry={telemetry} t={t} />;
    }
  }

  return (
    <div style={{
      width: "100vw",
      height: "100vh",
      background: "var(--color-bg-primary)",
      display: "flex",
      flexDirection: "column",
      fontFamily: "var(--font-jetbrains-mono)",
      overflow: "hidden",
    }}>
      {/* ── Header bar (48px) ── */}
      <div style={{
        height: 48,
        background: "rgba(0,0,0,0.6)",
        borderBottom: "1px solid rgba(0,229,255,0.2)",
        display: "flex",
        alignItems: "center",
        padding: "0 16px",
        gap: 16,
        flexShrink: 0,
        zIndex: 10,
      }}>
        {/* Back link */}
        <Link href="/" style={{
          color: "var(--color-accent-cyan)",
          textDecoration: "none",
          fontSize: 11,
          letterSpacing: "0.05em",
          border: "1px solid rgba(0,229,255,0.3)",
          padding: "2px 8px",
          borderRadius: 3,
          whiteSpace: "nowrap",
        }}>
          &larr; {t("pages.dashboard")}
        </Link>

        {/* Page title */}
        <span style={{ color: "var(--color-accent-cyan)", fontSize: 13, letterSpacing: "0.1em", whiteSpace: "nowrap" }}>
          {t("pages.liveVideo")}
        </span>

        {/* Orbital quick-glance */}
        {orbital && (
          <div style={{
            display: "flex",
            gap: 16,
            fontSize: 10,
            color: "var(--color-text-muted)",
            fontVariantNumeric: "tabular-nums",
            marginLeft: 8,
          }}>
            <span>
              <span style={{ color: "var(--color-accent-cyan)", marginRight: 3 }}>ALT</span>
              {Math.round(orbital.altitude)} km
            </span>
            <span>
              <span style={{ color: "var(--color-accent-cyan)", marginRight: 3 }}>SPD</span>
              {Math.round(orbital.speedKmH).toLocaleString()} km/h
            </span>
            <span>
              <span style={{ color: "var(--color-accent-cyan)", marginRight: 3 }}>LAT</span>
              {orbital.lat.toFixed(2)}&deg;
            </span>
            <span>
              <span style={{ color: "var(--color-accent-cyan)", marginRight: 3 }}>LON</span>
              {orbital.lon.toFixed(2)}&deg;
            </span>
          </div>
        )}

        {/* Connection status */}
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{
            width: 6, height: 6, borderRadius: "50%",
            background: connected ? "var(--color-accent-green)" : "var(--color-accent-red)",
            boxShadow: connected ? "0 0 6px var(--color-accent-green)" : "none",
          }} />
          <span style={{ color: "var(--color-text-muted)", fontSize: 10 }}>
            {connected ? t("pages.connected") : t("pages.offline")}
          </span>
        </div>
      </div>

      {/* ── Main area ── */}
      <div style={{
        flex: 1,
        display: "flex",
        overflow: "hidden",
      }}>
        {/* Left ~70%: YouTube iframe */}
        <div style={{
          flex: "0 0 70%",
          display: "flex",
          flexDirection: "column",
          padding: 12,
          minWidth: 0,
        }}>
          <div style={{ fontSize: 9, color: "var(--color-text-muted)", letterSpacing: "0.08em", marginBottom: 6 }}>
            {t("pages.nasaLiveStream")}
          </div>
          <div style={{
            flex: 1,
            borderRadius: 6,
            overflow: "hidden",
            border: "1px solid rgba(0,229,255,0.15)",
          }}>
            <iframe
              src="https://www.youtube.com/embed/P9C25Un7xaM?autoplay=1&mute=1&modestbranding=1&rel=0"
              title="NASA ISS Live Stream"
              style={{ width: "100%", height: "100%", border: "none", display: "block" }}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
          <div style={{ marginTop: 6, fontSize: 9, color: "#4a5568", letterSpacing: "0.06em" }}>
            {t("pages.streamCourtesy")}
          </div>
        </div>

        {/* Right ~30%: Event context sidebar */}
        <div style={{
          flex: "0 0 30%",
          borderLeft: "1px solid rgba(0,229,255,0.1)",
          padding: "12px 12px",
          display: "flex",
          flexDirection: "column",
          gap: 8,
          background: "rgba(0,0,0,0.3)",
          overflowY: "auto",
          minWidth: 0,
        }}>
          <div style={{
            fontSize: 9,
            color: "var(--color-accent-cyan)",
            letterSpacing: "0.12em",
            borderBottom: "1px solid rgba(0,229,255,0.15)",
            paddingBottom: 6,
            flexShrink: 0,
          }}>
            {t("pages.currentEvent")}
          </div>

          {renderSidebar(activeEvent)}
        </div>
      </div>
    </div>
  );
}
