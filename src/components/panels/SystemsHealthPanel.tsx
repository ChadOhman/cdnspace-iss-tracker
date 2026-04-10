"use client";

import PanelFrame from "@/components/shared/PanelFrame";
import type { ISSTelemetry } from "@/lib/types";
import { useLocale } from "@/context/LocaleContext";

interface SystemsHealthPanelProps {
  telemetry: ISSTelemetry | null;
}

// MDM status enum (shared by all non-PVCU channels):
//   0 = Off-Ok (nominal — MDM is on and healthy)
//   1 = Not-Off Ok (nominal-but-alert)
//   3 = Not-Off Failed
// PVCU channels use different semantics:
//   0 = Not Enabled  (i.e. 120 V bus is off)
//   1 = Enabled      (bus is powered)
function statusColor(status: number, pvcu: boolean): string {
  if (pvcu) {
    return status === 1 ? "var(--color-accent-green)" : "var(--color-text-muted)";
  }
  if (status === 0) return "var(--color-accent-green)";
  if (status === 1) return "var(--color-accent-orange)";
  if (status === 3) return "var(--color-accent-red)";
  return "var(--color-text-muted)";
}

function statusLabel(status: number, pvcu: boolean): string {
  if (pvcu) {
    return status === 1 ? "ON" : "OFF";
  }
  if (status === 0) return "OK";
  if (status === 1) return "ALT";
  if (status === 3) return "FAIL";
  return "—";
}

const GROUP_LABELS: Record<string, string> = {
  cnc: "Command & Control",
  icz: "Internal Control Zone",
  payload: "Payload",
  gnc: "GNC",
  pmcu: "Power Management",
  lab: "US Lab / PMM",
  node: "Nodes",
  airlock: "Airlock",
  truss: "Truss",
  pvcu: "Solar Bus (PVCU 120V)",
};

const GROUP_ORDER = [
  "cnc",
  "gnc",
  "icz",
  "pmcu",
  "lab",
  "node",
  "airlock",
  "truss",
  "pvcu",
  "payload",
];

export default function SystemsHealthPanel({ telemetry }: SystemsHealthPanelProps) {
  const { t } = useLocale();

  return (
    <PanelFrame
      title={t("panels.systemsHealth").toUpperCase()}
      icon="🛠"
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
          {t("orbital.awaitingData")}
        </div>
      ) : (
        (() => {
          const mdms = telemetry.systems.mdms;
          const mdmOnly = mdms.filter((m) => !m.pvcu);
          const nominal = mdmOnly.filter((m) => m.status === 0).length;
          const total = mdmOnly.length;
          const healthPct = total > 0 ? (nominal / total) * 100 : 0;
          const headerColor =
            healthPct >= 95
              ? "var(--color-accent-green)"
              : healthPct >= 85
                ? "var(--color-accent-orange)"
                : "var(--color-accent-red)";

          // Bucket by group
          const byGroup = new Map<string, typeof mdms>();
          for (const m of mdms) {
            if (!byGroup.has(m.group)) byGroup.set(m.group, []);
            byGroup.get(m.group)!.push(m);
          }

          return (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {/* Summary row */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "6px 8px",
                  background: "var(--color-bg-secondary)",
                  border: `1px solid ${headerColor}`,
                  borderRadius: 4,
                }}
              >
                <span
                  style={{
                    color: "var(--color-text-muted)",
                    fontSize: 10,
                    letterSpacing: "0.06em",
                  }}
                  title="Count of MDM (Multiplexer/Demultiplexer) units reporting Off-Ok status. ALT = nominal-but-alert, FAIL = not-off failed. PVCU solar bus channels are excluded from this count."
                >
                  MDMs NOMINAL
                </span>
                <span
                  style={{
                    color: headerColor,
                    fontSize: 14,
                    fontWeight: 700,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {nominal}/{total}
                </span>
              </div>

              {/* Group sections */}
              {GROUP_ORDER.filter((g) => byGroup.has(g)).map((groupKey) => {
                const items = byGroup.get(groupKey)!;
                const label = GROUP_LABELS[groupKey] ?? groupKey;
                return (
                  <div key={groupKey}>
                    <div
                      style={{
                        color: "var(--color-accent-cyan)",
                        fontSize: 9,
                        fontWeight: 700,
                        letterSpacing: "0.08em",
                        marginBottom: 4,
                      }}
                    >
                      {label.toUpperCase()}
                    </div>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
                        gap: 4,
                      }}
                    >
                      {items.map((m) => {
                        const color = statusColor(m.status, m.pvcu);
                        const label = statusLabel(m.status, m.pvcu);
                        return (
                          <div
                            key={m.id}
                            title={`${m.label} (${m.id}) — status code ${m.status}`}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              padding: "3px 6px",
                              background: "var(--color-bg-secondary)",
                              border: "1px solid var(--color-border-subtle)",
                              borderRadius: 3,
                              fontSize: 9,
                            }}
                          >
                            <span
                              style={{
                                color: "var(--color-text-secondary)",
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                              }}
                            >
                              {m.label}
                            </span>
                            <span
                              style={{
                                color,
                                fontWeight: 700,
                                marginLeft: 4,
                                fontVariantNumeric: "tabular-nums",
                              }}
                            >
                              {label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })()
      )}
    </PanelFrame>
  );
}
