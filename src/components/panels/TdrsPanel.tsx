"use client";

import PanelFrame from "@/components/shared/PanelFrame";
import type { OrbitalState } from "@/lib/types";

interface TdrsPanelProps {
  orbital: OrbitalState | null;
}

interface TdrsSatellite {
  name: string;
  shortName: string;
  lon: number; // degrees (negative = West)
  designation: string;
}

const TDRS_SATELLITES: TdrsSatellite[] = [
  { name: "TDRS-West",    shortName: "WEST",    lon: -171, designation: "TDRS-12/13" },
  { name: "TDRS-East",    shortName: "EAST",    lon: -41,  designation: "TDRS-10/11" },
  { name: "TDRS-Pacific", shortName: "PACIFIC", lon: -150, designation: "TDRS-6 (backup)" },
];

/** Compute the angular delta between ISS sub-satellite point and a TDRS longitude. */
function lonDelta(issLon: number, tdrsLon: number): number {
  const diff = Math.abs(issLon - tdrsLon);
  return diff > 180 ? 360 - diff : diff;
}

/**
 * Compute an approximate elevation angle from the ISS to a geostationary satellite.
 *
 * Geostationary orbit altitude ~35 786 km, ISS altitude ~420 km.
 * Using a simplified planar approximation:
 *   elevation ≈ atan( (h_GEO - h_ISS) / (R_E * delta_rad) ) - delta_rad / 2
 * where delta_rad is the angular separation in radians and R_E = 6 371 km.
 *
 * This is not precise navigation math but gives a reasonable qualitative value.
 */
function computeElevation(issLon: number, issAlt: number, tdrsLon: number): number {
  const delta = lonDelta(issLon, tdrsLon);
  if (delta >= 90) return -90; // below horizon, clamp
  const R_E = 6371; // km
  const h_GEO = 35786; // km
  const deltaRad = (delta * Math.PI) / 180;
  // Ground distance from ISS sub-satellite point to TDRS sub-satellite point
  const groundDist = R_E * deltaRad;
  // Height difference (GEO is far above ISS)
  const heightDiff = h_GEO - issAlt;
  const elevRad = Math.atan2(heightDiff, groundDist);
  return (elevRad * 180) / Math.PI;
}

export default function TdrsPanel({ orbital }: TdrsPanelProps) {
  if (!orbital) {
    return (
      <PanelFrame
        title="COMMUNICATIONS — TDRS"
        icon="📡"
        accentColor="var(--color-accent-cyan)"
      >
        <div
          style={{
            color: "var(--color-text-muted)",
            fontSize: 10,
            textAlign: "center",
            padding: "12px 0",
          }}
        >
          Awaiting data...
        </div>
      </PanelFrame>
    );
  }

  const { lon: issLon, altitude: issAlt } = orbital;

  const satellites = TDRS_SATELLITES.map((sat) => {
    const delta = lonDelta(issLon, sat.lon);
    const inView = delta < 70;
    const elevation = computeElevation(issLon, issAlt, sat.lon);
    return { ...sat, delta, inView, elevation };
  });

  const inViewCount = satellites.filter((s) => s.inView).length;
  const hasSignal = inViewCount >= 1;

  // Format longitude for display: e.g. -171 → "171°W"
  function formatLon(lon: number): string {
    const abs = Math.abs(lon);
    const dir = lon <= 0 ? "W" : "E";
    return `${abs}°${dir}`;
  }

  return (
    <PanelFrame
      title="COMMUNICATIONS — TDRS"
      icon="📡"
      accentColor="var(--color-accent-cyan)"
      headerRight={
        <div
          title="Tracking and Data Relay Satellites relay ISS communications to ground. ISS uses S-band (voice/command) and Ku-band (science data) via these geostationary relay satellites."
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            cursor: "help",
          }}
        >
          <span
            style={{
              fontSize: 9,
              color: "var(--color-text-muted)",
              letterSpacing: "0.04em",
            }}
          >
            {inViewCount} OF 3 IN VIEW
          </span>
          <span
            style={{
              display: "inline-block",
              width: 7,
              height: 7,
              borderRadius: "50%",
              background: inViewCount >= 1
                ? "var(--color-accent-green)"
                : "var(--color-accent-orange)",
            }}
          />
        </div>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {/* Overall signal status */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "4px 6px",
            borderRadius: 4,
            background: "var(--color-bg-tertiary)",
            border: `1px solid ${hasSignal ? "rgba(0,255,136,0.15)" : "rgba(255,61,61,0.15)"}`,
          }}
        >
          <span style={{ fontSize: 9, color: "var(--color-text-muted)", letterSpacing: "0.06em" }}>
            SIGNAL STATUS
          </span>
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.08em",
              color: hasSignal
                ? "var(--color-accent-green)"
                : "var(--color-accent-red)",
            }}
          >
            {hasSignal ? "ACTIVE" : "LOS"}
          </span>
        </div>

        {/* Satellite cards */}
        {satellites.map((sat) => (
          <div
            key={sat.name}
            style={{
              borderRadius: 4,
              padding: "6px 8px",
              background: "var(--color-bg-tertiary)",
              border: `1px solid ${sat.inView
                ? "rgba(0,229,255,0.15)"
                : "var(--color-border-subtle)"}`,
              opacity: sat.inView ? 1 : 0.6,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 3,
              }}
            >
              {/* Left: name + designation */}
              <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: "0.06em",
                    color: sat.inView
                      ? "var(--color-text-primary)"
                      : "var(--color-text-muted)",
                  }}
                >
                  {sat.shortName}
                </span>
                <span style={{ fontSize: 8, color: "var(--color-text-muted)" }}>
                  {sat.designation} · {formatLon(sat.lon)}
                </span>
              </div>

              {/* Right: IN VIEW / OUT OF VIEW badge */}
              <span
                style={{
                  fontSize: 8,
                  fontWeight: 700,
                  letterSpacing: "0.07em",
                  color: sat.inView
                    ? "var(--color-accent-green)"
                    : "var(--color-text-muted)",
                  background: sat.inView
                    ? "rgba(0,255,136,0.1)"
                    : "rgba(255,255,255,0.04)",
                  border: `1px solid ${sat.inView
                    ? "rgba(0,255,136,0.25)"
                    : "rgba(255,255,255,0.08)"}`,
                  borderRadius: 3,
                  padding: "1px 5px",
                }}
              >
                {sat.inView ? "IN VIEW" : "OUT OF VIEW"}
              </span>
            </div>

            {/* Elevation row */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <span style={{ fontSize: 8, color: "var(--color-text-muted)" }}>
                ELEV
              </span>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                {/* Mini elevation bar */}
                <div
                  style={{
                    width: 48,
                    height: 3,
                    borderRadius: 2,
                    background: "var(--color-border-subtle)",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${Math.max(0, Math.min(100, (sat.elevation / 90) * 100))}%`,
                      background: sat.inView
                        ? "var(--color-accent-cyan)"
                        : "var(--color-text-muted)",
                      borderRadius: 2,
                    }}
                  />
                </div>
                <span
                  style={{
                    fontSize: 9,
                    color: sat.inView
                      ? "var(--color-accent-cyan)"
                      : "var(--color-text-muted)",
                    fontVariantNumeric: "tabular-nums",
                    minWidth: 32,
                    textAlign: "right",
                  }}
                >
                  {sat.elevation >= 0
                    ? `${Math.round(sat.elevation)}°`
                    : `< 0°`}
                </span>
              </div>
            </div>
          </div>
        ))}

        {/* Band info footer */}
        <div
          style={{
            display: "flex",
            gap: 6,
            marginTop: 2,
          }}
        >
          {[
            { band: "S-BAND", desc: "Voice / CMD", rate: "192 kbps" },
            { band: "Ku-BAND", desc: "Science data", rate: "300 Mbps" },
          ].map((b) => (
            <div
              key={b.band}
              style={{
                flex: 1,
                padding: "3px 5px",
                borderRadius: 3,
                background: "var(--color-bg-overlay)",
                border: "1px solid var(--color-border-subtle)",
              }}
            >
              <div style={{ fontSize: 8, fontWeight: 700, color: "var(--color-accent-cyan)", letterSpacing: "0.06em" }}>
                {b.band}
              </div>
              <div style={{ fontSize: 8, color: "var(--color-text-muted)" }}>
                {b.desc}
              </div>
              <div style={{ fontSize: 8, color: "var(--color-text-secondary)" }}>
                {b.rate}
              </div>
            </div>
          ))}
        </div>
      </div>
    </PanelFrame>
  );
}
