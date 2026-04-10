"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useTelemetryStream } from "@/hooks/useTelemetryStream";
import { useBuildCheck } from "@/hooks/useBuildCheck";
import { useLocale } from "@/context/LocaleContext";
import Sparkline from "@/components/shared/Sparkline";

// ─── Constants ────────────────────────────────────────────────────────────────

const ISS_LAUNCH_DATE = new Date("1998-11-20T06:40:00Z");
const REVS_PER_DAY = 15.49;
const ORBIT_RADIUS_KM = 6371 + 408;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function computeStats() {
  const now = new Date();
  const msInOrbit = now.getTime() - ISS_LAUNCH_DATE.getTime();
  const daysInOrbit = msInOrbit / (1000 * 60 * 60 * 24);
  const yearsInOrbit = daysInOrbit / 365.25;
  const totalOrbits = daysInOrbit * REVS_PER_DAY;
  const orbitCircumference = 2 * Math.PI * ORBIT_RADIUS_KM;
  const totalDistanceKm = totalOrbits * orbitCircumference;
  const totalDistanceLightYears = totalDistanceKm / 9.461e12;

  return {
    yearsInOrbit: yearsInOrbit.toFixed(2),
    daysInOrbit: Math.floor(daysInOrbit).toLocaleString(),
    totalOrbits: Math.floor(totalOrbits).toLocaleString(),
    totalDistanceKm: Math.floor(totalDistanceKm).toLocaleString(),
    totalDistanceLightYears: totalDistanceLightYears.toFixed(5),
  };
}

// ─── Static data ──────────────────────────────────────────────────────────────

const staticFacts = [
  { label: "Total EVAs Conducted", value: "~270", unit: "spacewalks" },
  { label: "Crew Visitors", value: "~280", unit: "people" },
  { label: "Pressurized Volume", value: "~916", unit: "m³" },
  { label: "Solar Array Area", value: "~2,500", unit: "m²" },
  { label: "Resident Countries", value: "19", unit: "nations" },
  { label: "Science Experiments", value: "~3,000+", unit: "conducted" },
  { label: "Orbital Altitude", value: "~408", unit: "km" },
];

const records = [
  {
    label: "First Crew Arrival",
    value: "Nov 2, 2000",
    detail: "Expedition 1",
    color: "var(--color-accent-cyan)",
  },
  {
    label: "Continuous Habitation",
    value: "25+ years",
    detail: "Ongoing since Nov 2000",
    color: "var(--color-accent-green)",
  },
  {
    label: "Max People Simultaneously",
    value: "13",
    detail: "During Shuttle visits",
    color: "var(--color-accent-yellow)",
  },
  {
    label: "Longest Single EVA",
    value: "8h 56m",
    detail: "Voss & Helms, March 2001",
    color: "var(--color-accent-purple)",
  },
  {
    label: "Total EVA Time",
    value: "~1,650+ hrs",
    detail: "Across ~270 spacewalks",
    color: "var(--color-accent-orange)",
  },
  {
    label: "Fastest Assembly Mission",
    value: "12 days",
    detail: "STS-116",
    color: "var(--color-accent-cyan)",
  },
  {
    label: "Highest Expedition Number",
    value: "74+",
    detail: "Ongoing",
    color: "var(--color-accent-green)",
  },
];

const vehicles = [
  { name: "Space Shuttle", count: "37", years: "1998–2011", color: "#4a90d9", accent: "rgba(74,144,217,0.15)" },
  { name: "Soyuz", count: "70+", years: "2000–present", color: "#e85d5d", accent: "rgba(232,93,93,0.12)" },
  { name: "Progress", count: "85+", years: "2000–present", color: "#e8a05d", accent: "rgba(232,160,93,0.12)" },
  { name: "SpaceX Dragon (cargo)", count: "30+", years: "2012–present", color: "#00e5ff", accent: "rgba(0,229,255,0.08)" },
  { name: "SpaceX Crew Dragon", count: "12+", years: "2020–present", color: "#00e5ff", accent: "rgba(0,229,255,0.08)" },
  { name: "Northrop Grumman Cygnus", count: "20+", years: "2014–present", color: "#b388ff", accent: "rgba(179,136,255,0.12)" },
  { name: "JAXA HTV / HTV-X", count: "10+", years: "2009–present", color: "#00ff88", accent: "rgba(0,255,136,0.08)" },
  { name: "Boeing Starliner", count: "2+", years: "2024–present", color: "#ffd600", accent: "rgba(255,214,0,0.08)" },
  { name: "ESA ATV", count: "5", years: "2008–2015", color: "#94a3b8", accent: "rgba(148,163,184,0.08)" },
];

// Expedition timeline data: approximate year ranges per expedition block
// Expedition 1 started Nov 2000, averaging ~6 months each
function buildExpeditions() {
  const START_MS = new Date("2000-11-02").getTime();
  const AVG_DAYS = 182; // ~6 months
  const results: { num: number; startYear: number; startMs: number }[] = [];
  for (let i = 1; i <= 74; i++) {
    const startMs = START_MS + (i - 1) * AVG_DAYS * 86400 * 1000;
    results.push({ num: i, startYear: new Date(startMs).getFullYear(), startMs });
  }
  return results;
}

const EXPEDITIONS = buildExpeditions();

// Current expedition estimate based on today
function currentExpedition(): number {
  const now = Date.now();
  const START_MS = new Date("2000-11-02").getTime();
  const AVG_MS = 182 * 86400 * 1000;
  const n = Math.floor((now - START_MS) / AVG_MS) + 1;
  return Math.min(Math.max(n, 1), 74);
}

const CURRENT_EXP = currentExpedition();

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 10,
      color: "var(--color-accent-cyan)",
      letterSpacing: "0.12em",
      borderBottom: "1px solid var(--color-border-accent)",
      paddingBottom: 6,
      marginBottom: 16,
      textTransform: "uppercase" as const,
    }}>
      {children}
    </div>
  );
}

function StatCard({
  label,
  value,
  unit,
  accent,
  sparklineMetric,
}: {
  label: string;
  value: string | number;
  unit?: string;
  accent?: boolean;
  sparklineMetric?: string;
}) {
  return (
    <div style={{
      background: accent ? "rgba(0,229,255,0.04)" : "rgba(255,255,255,0.02)",
      border: `1px solid ${accent ? "rgba(0,229,255,0.18)" : "var(--color-border-subtle)"}`,
      borderRadius: 6,
      padding: "14px 16px",
    }}>
      <div style={{ fontSize: 9, color: "var(--color-text-muted)", letterSpacing: "0.08em", marginBottom: 6, textTransform: "uppercase" as const }}>
        {label}
      </div>
      <div style={{ fontSize: 22, color: accent ? "var(--color-accent-cyan)" : "var(--color-text-primary)", fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1 }}>
        {value}
      </div>
      {unit && (
        <div style={{ fontSize: 9, color: "#4a5568", marginTop: 4, letterSpacing: "0.06em" }}>{unit}</div>
      )}
      {sparklineMetric && (
        <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 8, color: "#4a5568", letterSpacing: "0.06em" }}>7d</span>
          <Sparkline
            metric={sparklineMetric}
            hours={24 * 7}
            color={accent ? "#00e5ff" : "#8892a4"}
            width={140}
            height={18}
          />
        </div>
      )}
    </div>
  );
}

// ─── Live Telemetry Banner ────────────────────────────────────────────────────

function LiveTelemetryBanner() {
  const { orbital, telemetry, connected, reconnecting } = useTelemetryStream();

  const statusColor = connected
    ? "var(--color-accent-green)"
    : reconnecting
    ? "var(--color-accent-yellow)"
    : "var(--color-accent-red)";

  const statusLabel = connected ? "LIVE" : reconnecting ? "RECONNECTING" : "DISCONNECTED";

  return (
    <div style={{
      background: "var(--color-bg-panel)",
      border: "1px solid var(--color-border-accent)",
      borderRadius: 6,
      padding: "14px 16px",
      marginBottom: 24,
    }}>
      {/* Header row */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 12,
      }}>
        <span style={{ fontSize: 10, color: "var(--color-accent-cyan)", letterSpacing: "0.12em", textTransform: "uppercase" as const }}>
          Live Telemetry
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 9, color: statusColor }}>
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: statusColor,
              display: "inline-block",
              animation: connected ? "pulse-live 2s ease-in-out infinite" : "none",
            }}
          />
          {statusLabel}
        </span>
      </div>

      {/* Data grid */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
        gap: 10,
      }}>
        {/* Orbital */}
        <TelemetryCell label="Altitude" value={orbital ? `${orbital.altitude.toFixed(1)} km` : "—"} />
        <TelemetryCell label="Speed" value={orbital ? `${orbital.speedKmH.toLocaleString(undefined, { maximumFractionDigits: 0 })} km/h` : "—"} />
        <TelemetryCell label="Latitude" value={orbital ? `${orbital.lat.toFixed(4)}°` : "—"} />
        <TelemetryCell label="Longitude" value={orbital ? `${orbital.lon.toFixed(4)}°` : "—"} />
        <TelemetryCell label="Orbit #" value={orbital ? orbital.revolutionNumber.toLocaleString() : "—"} highlight />

        {/* Power */}
        <TelemetryCell label="Power Generation" value={telemetry ? `${telemetry.powerKw.toFixed(1)} kW` : "—"} highlight />

        {/* Atmosphere */}
        <TelemetryCell label="Pressure" value={telemetry ? `${telemetry.pressurePsi.toFixed(2)} psi` : "—"} />
        <TelemetryCell label="O₂" value={telemetry ? `${telemetry.oxygenPercent.toFixed(1)}%` : "—"} />
        <TelemetryCell label="CO₂" value={telemetry ? `${telemetry.co2Percent.toFixed(3)}%` : "—"} />

        {/* Attitude */}
        <TelemetryCell label="Attitude Mode" value={telemetry ? telemetry.attitudeMode : "—"} />
      </div>
    </div>
  );
}

function TelemetryCell({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div style={{
      background: "rgba(255,255,255,0.02)",
      border: "1px solid var(--color-border-subtle)",
      borderRadius: 4,
      padding: "8px 10px",
    }}>
      <div style={{ fontSize: 8, color: "var(--color-text-muted)", letterSpacing: "0.08em", marginBottom: 3, textTransform: "uppercase" as const }}>
        {label}
      </div>
      <div style={{
        fontSize: 13,
        fontWeight: 600,
        color: highlight ? "var(--color-accent-cyan)" : "var(--color-text-primary)",
        fontVariantNumeric: "tabular-nums",
        letterSpacing: "0.02em",
        whiteSpace: "nowrap" as const,
        overflow: "hidden",
        textOverflow: "ellipsis",
      }}>
        {value}
      </div>
    </div>
  );
}

// ─── Records Section ──────────────────────────────────────────────────────────

function RecordsSection() {
  return (
    <div style={{ marginBottom: 32 }}>
      <SectionLabel>Records &amp; Milestones</SectionLabel>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 12 }}>
        {records.map((r) => (
          <div
            key={r.label}
            style={{
              background: "var(--color-bg-panel)",
              border: `1px solid ${r.color}33`,
              borderLeft: `3px solid ${r.color}`,
              borderRadius: 6,
              padding: "12px 14px",
            }}
          >
            <div style={{ fontSize: 8, color: "var(--color-text-muted)", letterSpacing: "0.1em", textTransform: "uppercase" as const, marginBottom: 5 }}>
              {r.label}
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, color: r.color, letterSpacing: "-0.01em", lineHeight: 1.1 }}>
              {r.value}
            </div>
            <div style={{ fontSize: 9, color: "var(--color-text-muted)", marginTop: 4, letterSpacing: "0.04em" }}>
              {r.detail}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Visiting Vehicle History ─────────────────────────────────────────────────

function VehicleHistorySection() {
  return (
    <div style={{ marginBottom: 32 }}>
      <SectionLabel>Visiting Vehicle History</SectionLabel>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 10 }}>
        {vehicles.map((v) => (
          <div
            key={v.name}
            style={{
              background: v.accent,
              border: `1px solid ${v.color}44`,
              borderRadius: 6,
              padding: "12px 14px",
              position: "relative" as const,
              overflow: "hidden",
            }}
          >
            {/* Decorative top bar */}
            <div style={{
              position: "absolute" as const,
              top: 0,
              left: 0,
              right: 0,
              height: 2,
              background: v.color,
              opacity: 0.7,
            }} />
            <div style={{ fontSize: 9, color: v.color, letterSpacing: "0.06em", fontWeight: 600, marginBottom: 4 }}>
              {v.name.toUpperCase()}
            </div>
            <div style={{ fontSize: 24, fontWeight: 700, color: "var(--color-text-primary)", lineHeight: 1, marginBottom: 4 }}>
              {v.count}
            </div>
            <div style={{ fontSize: 8, color: "var(--color-text-muted)", letterSpacing: "0.04em" }}>
              missions
            </div>
            <div style={{ fontSize: 9, color: "#4a5568", marginTop: 6, letterSpacing: "0.02em" }}>
              {v.years}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Expedition Timeline ──────────────────────────────────────────────────────

function ExpeditionTimeline() {
  const years = Array.from(new Set(EXPEDITIONS.map((e) => e.startYear)));

  return (
    <div style={{ marginBottom: 32 }}>
      <SectionLabel>Expedition Timeline — Expeditions 1–74+</SectionLabel>

      <div style={{ position: "relative" as const }}>
        {/* Scrollable expedition blocks */}
        <div
          style={{
            overflowX: "auto",
            overflowY: "hidden",
            paddingBottom: 28,
            cursor: "grab",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column" as const, gap: 0 }}>
            {/* Expedition blocks row */}
            <div style={{ display: "flex", gap: 2, alignItems: "flex-end", paddingTop: 4 }}>
              {EXPEDITIONS.map((exp) => {
                const isCurrent = exp.num === CURRENT_EXP;
                const isPast = exp.num < CURRENT_EXP;
                const color = isCurrent
                  ? "var(--color-accent-cyan)"
                  : isPast
                  ? "rgba(0,229,255,0.35)"
                  : "rgba(255,255,255,0.08)";
                const height = isCurrent ? 36 : 28;

                return (
                  <div
                    key={exp.num}
                    title={`Expedition ${exp.num} (~${exp.startYear})`}
                    style={{
                      width: 14,
                      minWidth: 14,
                      height,
                      background: color,
                      borderRadius: 2,
                      position: "relative" as const,
                      flexShrink: 0,
                      border: isCurrent ? "1px solid var(--color-accent-cyan)" : "none",
                      boxShadow: isCurrent ? "0 0 8px rgba(0,229,255,0.5)" : "none",
                      transition: "height 0.2s",
                    }}
                  >
                    {/* Number label for every 5th */}
                    {exp.num % 10 === 0 && (
                      <span style={{
                        position: "absolute" as const,
                        top: -16,
                        left: "50%",
                        transform: "translateX(-50%)",
                        fontSize: 7,
                        color: "var(--color-text-muted)",
                        letterSpacing: 0,
                        whiteSpace: "nowrap" as const,
                        pointerEvents: "none",
                      }}>
                        {exp.num}
                      </span>
                    )}
                    {isCurrent && (
                      <span style={{
                        position: "absolute" as const,
                        top: -18,
                        left: "50%",
                        transform: "translateX(-50%)",
                        fontSize: 8,
                        color: "var(--color-accent-cyan)",
                        letterSpacing: 0,
                        whiteSpace: "nowrap" as const,
                        fontWeight: 700,
                        pointerEvents: "none",
                      }}>
                        {exp.num}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Year axis */}
            <div style={{ display: "flex", gap: 2, marginTop: 4 }}>
              {EXPEDITIONS.map((exp) => {
                const showYear = years.includes(exp.startYear) && exp.num === EXPEDITIONS.find((e) => e.startYear === exp.startYear)?.num;
                return (
                  <div
                    key={exp.num}
                    style={{
                      width: 14,
                      minWidth: 14,
                      flexShrink: 0,
                      position: "relative" as const,
                      height: 14,
                    }}
                  >
                    {showYear && (
                      <span style={{
                        position: "absolute" as const,
                        left: 0,
                        top: 2,
                        fontSize: 7,
                        color: "#4a5568",
                        whiteSpace: "nowrap" as const,
                        letterSpacing: 0,
                        pointerEvents: "none",
                      }}>
                        {exp.startYear}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Legend */}
        <div style={{ display: "flex", gap: 16, marginTop: 4, flexWrap: "wrap" as const }}>
          <LegendItem color="var(--color-accent-cyan)" label={`Current (Exp. ${CURRENT_EXP})`} />
          <LegendItem color="rgba(0,229,255,0.35)" label="Past" />
          <LegendItem color="rgba(255,255,255,0.08)" label="Future (projected)" />
        </div>
      </div>
    </div>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 9, color: "var(--color-text-muted)" }}>
      <div style={{ width: 10, height: 10, borderRadius: 2, background: color, flexShrink: 0 }} />
      {label}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function StatsPage() {
  useBuildCheck([]);
  const { t } = useLocale();
  const { telemetry } = useTelemetryStream();
  const [stats, setStats] = useState(computeStats);

  // Recompute live every second
  useEffect(() => {
    const id = setInterval(() => setStats(computeStats()), 1000);
    return () => clearInterval(id);
  }, []);

  const navLinks = [
    { href: "/", label: t("pages.dashboard") },
    { href: "/track", label: "TRACK" },
    { href: "/live", label: t("pages.live") },
    { href: "/stats", label: t("pages.stats"), active: true },
  ];

  return (
    <div style={{
      width: "100vw",
      minHeight: "100vh",
      background: "var(--color-bg-primary)",
      fontFamily: "var(--font-jetbrains-mono)",
      color: "var(--color-text-primary)",
      overflowX: "hidden",
    }}>
      {/* Header */}
      <div style={{
        height: 48,
        background: "rgba(0,0,0,0.6)",
        borderBottom: "1px solid var(--color-border-accent)",
        display: "flex",
        alignItems: "center",
        padding: "0 16px",
        gap: 8,
        position: "sticky" as const,
        top: 0,
        zIndex: 10,
        backdropFilter: "blur(8px)",
      }}>
        {navLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            style={{
              color: link.active ? "#fff" : "var(--color-accent-cyan)",
              textDecoration: "none",
              fontSize: 11,
              letterSpacing: "0.05em",
              border: link.active
                ? "1px solid rgba(0,229,255,0.5)"
                : "1px solid rgba(0,229,255,0.2)",
              padding: "2px 10px",
              borderRadius: 3,
              background: link.active ? "rgba(0,229,255,0.1)" : "transparent",
              transition: "background 0.15s",
            }}
          >
            {link.label}
          </Link>
        ))}
        <div style={{ flex: 1 }} />
        <span style={{ color: "var(--color-text-muted)", fontSize: 9, letterSpacing: "0.08em" }}>
          ISS STATISTICS &amp; HISTORY
        </span>
      </div>

      <div style={{ maxWidth: 1024, margin: "0 auto", padding: "28px 16px 48px" }}>

        {/* 1. Live Telemetry */}
        <LiveTelemetryBanner />

        {/* 2. Live Cumulative Metrics */}
        <div style={{ marginBottom: 32 }}>
          <SectionLabel>
            {t("pages.liveCumulativeMetrics")} — {t("pages.since")} {ISS_LAUNCH_DATE.toDateString()}
          </SectionLabel>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))", gap: 12 }}>
            <StatCard label={t("pages.yearsInOrbit")} value={stats.yearsInOrbit} unit="years" accent />
            <StatCard label={t("pages.daysInOrbit")} value={stats.daysInOrbit} unit="days" accent />
            <StatCard label={t("pages.totalOrbits")} value={stats.totalOrbits} unit="revolutions" accent />
            <StatCard label={t("pages.distanceTraveled")} value={stats.totalDistanceKm} unit="km" accent />
            <StatCard label={t("pages.distanceLightYears")} value={stats.totalDistanceLightYears} unit="ly" accent />
          </div>
        </div>

        {/* 3. Program Facts */}
        <div style={{ marginBottom: 32 }}>
          <SectionLabel>{t("pages.issProgramFacts")}</SectionLabel>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))", gap: 12 }}>
            {/* ISS Mass — live from USLAB000039 when available, else approximate */}
            {(() => {
              const liveMass = telemetry?.attitude.issMassKg ?? 0;
              const label = "ISS Mass";
              const card = liveMass > 0 ? (
                <StatCard
                  key={label}
                  label={label}
                  value={liveMass.toLocaleString("en", { maximumFractionDigits: 0 })}
                  unit="kg (live)"
                  accent
                  sparklineMetric="iss_mass_kg"
                />
              ) : (
                <StatCard
                  key={label}
                  label={label}
                  value="~420,000"
                  unit="kg"
                />
              );
              return card;
            })()}
            {staticFacts.map(({ label, value, unit }) => (
              <StatCard key={label} label={label} value={value} unit={unit} />
            ))}
          </div>
        </div>

        {/* 3b. Live C&C Computer Stats (only shown when telemetry connected) */}
        {telemetry && (telemetry.lab.stdCmdCount > 0 || telemetry.lab.laptopsConnected > 0) && (
          <div style={{ marginBottom: 32 }}>
            <SectionLabel>Command & Control Computer</SectionLabel>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))", gap: 12 }}>
              <StatCard
                label="Standard Commands"
                value={telemetry.lab.stdCmdCount.toLocaleString()}
                unit="received by C&C MDM"
                accent
              />
              <StatCard
                label="Data-Load Commands"
                value={telemetry.lab.dataLoadCmdCount.toLocaleString()}
                unit="received by C&C MDM"
                accent
              />
              <StatCard
                label="Laptops Connected"
                value={telemetry.lab.laptopsConnected.toString()}
                unit="on primary C&C network"
                accent
              />
              {telemetry.lab.onboardTimeCourse && telemetry.lab.onboardTimeCourse !== "" && (
                <StatCard
                  label="C&C Onboard Time"
                  value={telemetry.lab.onboardTimeCourse}
                  unit="station clock"
                  accent
                />
              )}
            </div>
          </div>
        )}

        {/* 4. Records & Milestones */}
        <RecordsSection />

        {/* 5. Visiting Vehicle History */}
        <VehicleHistorySection />

        {/* 6. Expedition Timeline */}
        <ExpeditionTimeline />

        {/* Footer note */}
        <div style={{ marginTop: 32, fontSize: 9, color: "#4a5568", lineHeight: 1.8 }}>
          {t("pages.statsFootnote")}
          {" "}Visiting vehicle counts are approximate and include crewed and uncrewed missions.
          Expedition timeline is estimated at ~6 month intervals from November 2000.
          Live telemetry data sourced via NASA Lightstreamer SSE.
        </div>
      </div>
    </div>
  );
}
