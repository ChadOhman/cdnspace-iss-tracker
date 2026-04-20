"use client";

import PanelFrame from "@/components/shared/PanelFrame";
import type { OrbitalState } from "@/lib/types";
import { regionVisibility, formatLon } from "@/lib/tdrs";

interface TdrsPanelProps {
  orbital: OrbitalState | null;
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
  const regions = regionVisibility(issLon, issAlt);
  const inViewCount = regions.filter((r) => r.inView).length;
  const hasSignal = inViewCount >= 1;

  return (
    <PanelFrame
      title="COMMUNICATIONS — TDRS"
      icon="📡"
      accentColor="var(--color-accent-cyan)"
      headerRight={
        <div
          title="Tracking and Data Relay Satellite coverage regions. NASA operates geostationary relays in three ocean zones — Atlantic, Pacific, Indian — that together provide near-continuous ISS communications coverage. ISS uses S-band for voice/command and Ku-band for science data via these relays."
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

        {/* Region cards */}
        {regions.map(({ region, inView, elevation }) => (
          <div
            key={region.id}
            style={{
              borderRadius: 4,
              padding: "6px 8px",
              background: "var(--color-bg-tertiary)",
              border: `1px solid ${inView
                ? "rgba(0,229,255,0.15)"
                : "var(--color-border-subtle)"}`,
              opacity: inView ? 1 : 0.6,
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
              {/* Left: region label + centre longitude */}
              <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: "0.06em",
                    color: inView
                      ? "var(--color-text-primary)"
                      : "var(--color-text-muted)",
                  }}
                >
                  {region.label}
                </span>
                <span style={{ fontSize: 8, color: "var(--color-text-muted)" }}>
                  {formatLon(region.lon)}
                </span>
              </div>

              {/* Right: IN VIEW / OUT OF VIEW badge */}
              <span
                style={{
                  fontSize: 8,
                  fontWeight: 700,
                  letterSpacing: "0.07em",
                  color: inView
                    ? "var(--color-accent-green)"
                    : "var(--color-text-muted)",
                  background: inView
                    ? "rgba(0,255,136,0.1)"
                    : "rgba(255,255,255,0.04)",
                  border: `1px solid ${inView
                    ? "rgba(0,255,136,0.25)"
                    : "rgba(255,255,255,0.08)"}`,
                  borderRadius: 3,
                  padding: "1px 5px",
                }}
              >
                {inView ? "IN VIEW" : "OUT OF VIEW"}
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
                      width: `${Math.max(0, Math.min(100, (elevation / 90) * 100))}%`,
                      background: inView
                        ? "var(--color-accent-cyan)"
                        : "var(--color-text-muted)",
                      borderRadius: 2,
                    }}
                  />
                </div>
                <span
                  style={{
                    fontSize: 9,
                    color: inView
                      ? "var(--color-accent-cyan)"
                      : "var(--color-text-muted)",
                    fontVariantNumeric: "tabular-nums",
                    minWidth: 32,
                    textAlign: "right",
                  }}
                >
                  {elevation >= 0
                    ? `${Math.round(elevation)}°`
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
            { band: "S-BAND", desc: "Voice · CMD" },
            { band: "Ku-BAND", desc: "Science data" },
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
            </div>
          ))}
        </div>
      </div>
    </PanelFrame>
  );
}
