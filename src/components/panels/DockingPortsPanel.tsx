"use client";

import PanelFrame from "@/components/shared/PanelFrame";
import { FLAG_EMOJI } from "@/data/iss-modules";
import type { DockedSpacecraft } from "@/lib/types";

interface DockingPortsPanelProps {
  docking: DockedSpacecraft[] | null;
}

const TYPE_COLOR: Record<string, string> = {
  Crew: "var(--color-accent-cyan)",
  Cargo: "var(--color-accent-orange)",
};

const TYPE_BG: Record<string, string> = {
  Crew: "rgba(0,229,255,0.1)",
  Cargo: "rgba(255,140,0,0.1)",
};

// All ISS docking ports — port names must match what the Corquaid API returns
const ALL_PORTS = [
  { name: "Harmony forward", segment: "US" },
  { name: "Harmony zenith", segment: "US" },
  { name: "Harmony nadir", segment: "US" },
  { name: "Zvezda aft", segment: "RU" },
  { name: "Rassvet nadir", segment: "RU" },
  { name: "Poisk zenith", segment: "RU" },
  { name: "Prichal nadir", segment: "RU" },
];

function daysSince(timestampMs: number): string {
  const days = Math.floor((Date.now() - timestampMs) / (1000 * 60 * 60 * 24));
  if (days === 0) return "today";
  if (days === 1) return "1 day ago";
  return `${days} days ago`;
}

export default function DockingPortsPanel({ docking }: DockingPortsPanelProps) {
  if (!docking) {
    return (
      <PanelFrame title="DOCKING PORTS" icon="🔗" accentColor="var(--color-accent-cyan)">
        <div
          style={{
            color: "var(--color-text-muted)",
            fontSize: 10,
            fontStyle: "italic",
            textAlign: "center",
            padding: "8px 0",
          }}
        >
          Loading docking data...
        </div>
      </PanelFrame>
    );
  }

  const occupiedPorts = new Set(docking.map((v) => v.port.toLowerCase()));
  const emptyPorts = ALL_PORTS.filter(
    (p) => !occupiedPorts.has(p.name.toLowerCase())
  );

  return (
    <PanelFrame
      title={`DOCKING PORTS — ${docking.length} VEHICLE${docking.length !== 1 ? "S" : ""}`}
      icon="🔗"
      accentColor="var(--color-accent-cyan)"
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {docking.map((vehicle) => {
          const color = TYPE_COLOR[vehicle.type] ?? "var(--color-text-muted)";
          const bg = TYPE_BG[vehicle.type] ?? "rgba(255,255,255,0.05)";
          const flag = FLAG_EMOJI[vehicle.flagCode] ?? "🏳️";

          return (
            <div
              key={vehicle.name}
              style={{
                padding: "8px 10px",
                background: "var(--color-bg-secondary, #0d1117)",
                border: "1px solid var(--color-border-subtle)",
                borderLeft: `3px solid ${color}`,
                borderRadius: 4,
              }}
            >
              {/* Header: name + type badge */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 4,
                }}
              >
                <span style={{ fontSize: 14 }}>{flag}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      color: "var(--color-text-primary)",
                      fontSize: 11,
                      fontWeight: 700,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {vehicle.name}
                  </div>
                  <div style={{ color: "var(--color-text-muted)", fontSize: 9 }}>
                    {vehicle.operator}
                  </div>
                </div>
                <span
                  style={{
                    padding: "2px 6px",
                    borderRadius: 3,
                    background: bg,
                    color,
                    fontSize: 9,
                    fontWeight: 700,
                    letterSpacing: "0.06em",
                    flexShrink: 0,
                  }}
                >
                  {vehicle.type.toUpperCase()}
                </span>
              </div>

              {/* Port + docked time */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 9,
                  color: "var(--color-text-muted)",
                }}
              >
                <span>
                  <span style={{ color: "var(--color-text-secondary)" }}>Port: </span>
                  {vehicle.port}
                </span>
                <span>Docked {daysSince(vehicle.dockedAt)}</span>
              </div>

              {/* Crew list if applicable */}
              {vehicle.crew && vehicle.crew.length > 0 && (
                <div
                  style={{
                    marginTop: 4,
                    fontSize: 9,
                    color: "var(--color-text-muted)",
                  }}
                >
                  <span style={{ color: "var(--color-text-secondary)" }}>Crew: </span>
                  {vehicle.crew.join(", ")}
                </div>
              )}
            </div>
          );
        })}

        {/* Empty ports */}
        {emptyPorts.length > 0 && (
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 4,
              marginTop: 2,
            }}
          >
            {emptyPorts.map((port) => (
              <div
                key={port.name}
                style={{
                  padding: "4px 8px",
                  background: "var(--color-bg-secondary, #0d1117)",
                  border: "1px solid var(--color-border-subtle)",
                  borderRadius: 3,
                  fontSize: 9,
                  color: "var(--color-text-muted)",
                }}
              >
                <span style={{ opacity: 0.5 }}>○</span> {port.name}
              </div>
            ))}
          </div>
        )}
      </div>
    </PanelFrame>
  );
}
