"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useTelemetryStream } from "@/hooks/useTelemetryStream";
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
}: {
  label: string;
  value: string | number;
  unit?: string;
  highlight?: boolean;
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
        color: highlight ? "var(--color-accent-cyan)" : "var(--color-text-primary)",
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
        <DataRow label="O₂ Supply A" value={al ? al.o2SupplyPressureA.toFixed(1) : "—"} unit="psi" />
        <DataRow label="O₂ Supply B" value={al ? al.o2SupplyPressureB.toFixed(1) : "—"} unit="psi" />
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
