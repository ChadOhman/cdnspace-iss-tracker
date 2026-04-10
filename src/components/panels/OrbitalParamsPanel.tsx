"use client";

import PanelFrame from "@/components/shared/PanelFrame";
import Sparkline from "@/components/shared/Sparkline";
import type { OrbitalState, ISSTelemetry } from "@/lib/types";
import { useLocale } from "@/context/LocaleContext";
import { useUnits } from "@/context/UnitsContext";

interface OrbitalParamsPanelProps {
  orbital: OrbitalState | null;
  telemetry: ISSTelemetry | null;
}

// Convert WGS84 geodetic (lat, lon, alt) to geocentric distance |r| in km.
// |r| is frame-invariant, so it can be directly compared to NASA's J2000
// state vector magnitude even though SGP4 outputs a different frame.
function geodeticToGeocentricRadiusKm(latDeg: number, lonDeg: number, altKm: number): number {
  const a = 6378.137; // WGS84 semi-major axis (km)
  const e2 = 0.00669437999014; // WGS84 first eccentricity squared
  const lat = (latDeg * Math.PI) / 180;
  const lon = (lonDeg * Math.PI) / 180;
  const sinLat = Math.sin(lat);
  const cosLat = Math.cos(lat);
  const N = a / Math.sqrt(1 - e2 * sinLat * sinLat);
  const x = (N + altKm) * cosLat * Math.cos(lon);
  const y = (N + altKm) * cosLat * Math.sin(lon);
  const z = (N * (1 - e2) + altKm) * sinLat;
  return Math.sqrt(x * x + y * y + z * z);
}

interface ParamRowProps {
  label: string;
  value: string;
}

function ParamRow({ label, value }: ParamRowProps) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "4px 0",
        borderBottom: "1px solid var(--color-border-subtle)",
      }}
    >
      <span style={{ color: "var(--color-text-muted)", fontSize: 10 }}>{label}</span>
      <span
        style={{
          color: "var(--color-accent-cyan)",
          fontSize: 10,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {value}
      </span>
    </div>
  );
}

export default function OrbitalParamsPanel({ orbital, telemetry }: OrbitalParamsPanelProps) {
  const { t } = useLocale();
  const { distance } = useUnits();

  // Compute SGP4 vs NASA GNC state vector offset (if NASA data is populated).
  // Frame-independent comparison via geocentric radius magnitude + velocity
  // magnitude — won't flag frame rotation errors, but will catch real drift.
  const sv = telemetry?.lab.gncStateVector;
  let gncOffset: { dRkm: number; dVms: number } | null = null;
  if (orbital && sv && (sv.xKm !== 0 || sv.yKm !== 0 || sv.zKm !== 0)) {
    const nasaR = Math.sqrt(sv.xKm * sv.xKm + sv.yKm * sv.yKm + sv.zKm * sv.zKm);
    const nasaV = Math.sqrt(sv.vxMs * sv.vxMs + sv.vyMs * sv.vyMs + sv.vzMs * sv.vzMs); // m/s
    const ourR = geodeticToGeocentricRadiusKm(orbital.lat, orbital.lon, orbital.altitude);
    const ourV = orbital.velocity * 1000; // km/s → m/s
    gncOffset = { dRkm: nasaR - ourR, dVms: nasaV - ourV };
  }

  function formatPeriod(minutes: number): string {
    const m = Math.floor(minutes);
    const s = Math.round((minutes - m) * 60);
    return `${m}m ${s}s`;
  }

  return (
    <PanelFrame
      title={t("panels.orbitalParams").toUpperCase()}
      icon="📐"
      accentColor="var(--color-accent-cyan)"
    >
      {!orbital ? (
        <div style={{ color: "var(--color-text-muted)", fontSize: 10, textAlign: "center", padding: "12px 0" }}>
          {t("orbital.awaitingData")}
        </div>
      ) : (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "0 12px",
            }}
          >
            <ParamRow
              label={t("orbital.apoapsis")}
              value={(() => { const d = distance(orbital.apoapsis); return `${d.value.toFixed(1)} ${d.unit}`; })()}
            />
            <ParamRow
              label={t("orbital.periapsis")}
              value={(() => { const d = distance(orbital.periapsis); return `${d.value.toFixed(1)} ${d.unit}`; })()}
            />
            <ParamRow
              label={t("orbital.inclination")}
              value={`${orbital.inclination.toFixed(2)}°`}
            />
            <ParamRow
              label={t("orbital.eccentricity")}
              value={orbital.eccentricity.toFixed(6)}
            />
            <ParamRow
              label={t("orbital.period")}
              value={formatPeriod(orbital.period)}
            />
            <ParamRow
              label={t("orbital.revolutions")}
              value={`#${orbital.revolutionNumber}`}
            />
            {/* Beta angle — full-width row with colour coding */}
            <div
              style={{
                gridColumn: "1 / -1",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "4px 0",
                borderBottom: "1px solid var(--color-border-subtle)",
              }}
            >
              <span
                style={{ color: "var(--color-text-muted)", fontSize: 10 }}
                title="Beta angle — angle between the ISS orbital plane and the Sun-Earth vector. High absolute values (>60°) mean continuous sunlight; near zero means frequent eclipses."
              >
                Beta Angle
              </span>
              {(() => {
                const beta = orbital.betaAngle;
                const absBeta = Math.abs(beta);
                const betaColor =
                  absBeta > 60
                    ? "var(--color-accent-yellow)"   // continuous sunlight
                    : absBeta > 45
                      ? "var(--color-accent-orange)"
                      : "var(--color-accent-cyan)";
                return (
                  <span
                    style={{
                      color: betaColor,
                      fontSize: 10,
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {beta >= 0 ? "+" : ""}{beta.toFixed(2)}°
                  </span>
                );
              })()}
            </div>

            {/* NASA GNC state vector vs SGP4 offset — confidence indicator */}
            {gncOffset && (
              <div
                style={{
                  gridColumn: "1 / -1",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "4px 0",
                  borderBottom: "1px solid var(--color-border-subtle)",
                }}
                title="Offset between our SGP4 propagation and NASA's onboard GNC J2000 propagated state vector (USLAB000032-037). Small values indicate our orbit prediction is tracking NASA's ground truth."
              >
                <span style={{ color: "var(--color-text-muted)", fontSize: 10, cursor: "help" }}>
                  NASA ΔR / ΔV
                </span>
                {(() => {
                  const absDr = Math.abs(gncOffset.dRkm);
                  const absDv = Math.abs(gncOffset.dVms);
                  const color =
                    absDr > 10 || absDv > 20
                      ? "var(--color-accent-red)"
                      : absDr > 2 || absDv > 5
                        ? "var(--color-accent-orange)"
                        : "var(--color-accent-green)";
                  const drStr = absDr < 1
                    ? `${(gncOffset.dRkm * 1000).toFixed(0)} m`
                    : `${gncOffset.dRkm >= 0 ? "+" : ""}${gncOffset.dRkm.toFixed(2)} km`;
                  const dvStr = `${gncOffset.dVms >= 0 ? "+" : ""}${gncOffset.dVms.toFixed(1)} m/s`;
                  return (
                    <span
                      style={{
                        color,
                        fontSize: 10,
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {drStr} / {dvStr}
                    </span>
                  );
                })()}
              </div>
            )}
          </div>

          {/* Sparklines */}
          <div
            style={{
              display: "flex",
              gap: 12,
              marginTop: 8,
              paddingTop: 6,
              borderTop: "1px solid var(--color-border-subtle)",
              flexWrap: "wrap",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <span style={{ color: "var(--color-text-muted)", fontSize: 9 }}>
                {t("orbital.alt24h")}
              </span>
              <Sparkline
                metric="altitude"
                hours={24}
                color="#00e5ff"
                width={64}
                height={18}
              />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <span style={{ color: "var(--color-text-muted)", fontSize: 9 }}>
                {t("orbital.spd24h")}
              </span>
              <Sparkline
                metric="speed_kmh"
                hours={24}
                color="#00ff88"
                width={64}
                height={18}
              />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <span style={{ color: "var(--color-text-muted)", fontSize: 9 }}>
                β 24h
              </span>
              <Sparkline
                metric="beta_angle"
                hours={24}
                color="#ffaa33"
                width={64}
                height={18}
              />
            </div>
          </div>
        </>
      )}
    </PanelFrame>
  );
}
