"use client";

import Link from "next/link";
import { useLocale } from "@/context/LocaleContext";

const ISS_LAUNCH_DATE = new Date("1998-11-20T06:40:00Z");
const REVS_PER_DAY = 15.49;
const ORBIT_RADIUS_KM = 6371 + 408; // Earth radius + avg ISS altitude

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
    yearsInOrbit: yearsInOrbit.toFixed(1),
    daysInOrbit: Math.floor(daysInOrbit).toLocaleString(),
    totalOrbits: Math.floor(totalOrbits).toLocaleString(),
    totalDistanceKm: Math.floor(totalDistanceKm).toLocaleString(),
    totalDistanceLightYears: totalDistanceLightYears.toFixed(4),
  };
}

const staticFacts = [
  { label: "Total EVAs Conducted", value: "~270", unit: "spacewalks" },
  { label: "Crew Visitors", value: "~280", unit: "people" },
  { label: "ISS Mass", value: "~420,000", unit: "kg" },
  { label: "Pressurized Volume", value: "~916", unit: "m³" },
  { label: "Solar Array Area", value: "~2,500", unit: "m²" },
  { label: "Resident Countries", value: "19", unit: "nations" },
  { label: "Science Experiments", value: "~3,000+", unit: "conducted" },
  { label: "Orbital Altitude", value: "~408", unit: "km" },
];

export default function StatsPage() {
  const { t } = useLocale();
  const stats = computeStats();

  return (
    <div style={{
      width: "100vw",
      minHeight: "100vh",
      background: "#0a0e14",
      fontFamily: "var(--font-jetbrains-mono)",
      color: "#e2e8f0",
    }}>
      {/* Header */}
      <div style={{
        height: 48,
        background: "rgba(0,0,0,0.6)",
        borderBottom: "1px solid rgba(0,229,255,0.2)",
        display: "flex",
        alignItems: "center",
        padding: "0 16px",
        gap: 16,
      }}>
        <Link href="/" style={{
          color: "#00e5ff",
          textDecoration: "none",
          fontSize: 11,
          letterSpacing: "0.05em",
          border: "1px solid rgba(0,229,255,0.3)",
          padding: "2px 8px",
          borderRadius: 3,
        }}>
          &larr; {t("pages.dashboard")}
        </Link>
        <span style={{ color: "#00e5ff", fontSize: 13, letterSpacing: "0.1em" }}>
          {t("pages.stats")}
        </span>
      </div>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "32px 16px" }}>

        {/* Section: Live computed stats */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 10, color: "#00e5ff", letterSpacing: "0.1em", marginBottom: 16, borderBottom: "1px solid rgba(0,229,255,0.15)", paddingBottom: 6 }}>
            {t("pages.liveCumulativeMetrics")} — {t("pages.since")} {ISS_LAUNCH_DATE.toDateString()}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
            {[
              { label: t("pages.yearsInOrbit"), value: stats.yearsInOrbit, unit: "years" },
              { label: t("pages.daysInOrbit"), value: stats.daysInOrbit, unit: "days" },
              { label: t("pages.totalOrbits"), value: stats.totalOrbits, unit: "revolutions" },
              { label: t("pages.distanceTraveled"), value: stats.totalDistanceKm, unit: "km" },
              { label: t("pages.distanceLightYears"), value: stats.totalDistanceLightYears, unit: "ly" },
            ].map(({ label, value, unit }) => (
              <div key={label} style={{
                background: "rgba(0,229,255,0.04)",
                border: "1px solid rgba(0,229,255,0.15)",
                borderRadius: 6,
                padding: "14px 16px",
              }}>
                <div style={{ fontSize: 9, color: "#8892a4", letterSpacing: "0.08em", marginBottom: 6 }}>{label.toUpperCase()}</div>
                <div style={{ fontSize: 22, color: "#00e5ff", fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1 }}>{value}</div>
                <div style={{ fontSize: 9, color: "#4a5568", marginTop: 4, letterSpacing: "0.06em" }}>{unit}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Section: Static facts */}
        <div>
          <div style={{ fontSize: 10, color: "#00e5ff", letterSpacing: "0.1em", marginBottom: 16, borderBottom: "1px solid rgba(0,229,255,0.15)", paddingBottom: 6 }}>
            {t("pages.issProgramFacts")}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
            {staticFacts.map(({ label, value, unit }) => (
              <div key={label} style={{
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 6,
                padding: "14px 16px",
              }}>
                <div style={{ fontSize: 9, color: "#8892a4", letterSpacing: "0.08em", marginBottom: 6 }}>{label.toUpperCase()}</div>
                <div style={{ fontSize: 20, color: "#e2e8f0", fontWeight: 600, letterSpacing: "-0.02em", lineHeight: 1 }}>{value}</div>
                <div style={{ fontSize: 9, color: "#4a5568", marginTop: 4, letterSpacing: "0.06em" }}>{unit}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ marginTop: 32, fontSize: 9, color: "#4a5568", lineHeight: 1.6 }}>
          {t("pages.statsFootnote")}
        </div>
      </div>
    </div>
  );
}
