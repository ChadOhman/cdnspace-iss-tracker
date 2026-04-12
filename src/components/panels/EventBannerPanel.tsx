"use client";

import { useEffect, useState } from "react";
import PanelFrame from "@/components/shared/PanelFrame";
import type { ISSEvent, EventType } from "@/lib/types";
import { useLocale } from "@/context/LocaleContext";

interface EventBannerPanelProps {
  event: ISSEvent | null;
}

const EVENT_ICONS: Record<EventType, string> = {
  eva: "🚶",
  docking: "🔗",
  berthing: "🦾",
  undocking: "↗️",
  reboost: "🚀",
  maneuver: "🔄",
};

function formatDuration(startTs: number): string {
  const elapsedS = Math.floor((Date.now() - startTs) / 1000);
  if (elapsedS < 0) return "0s";
  const h = Math.floor(elapsedS / 3600);
  const m = Math.floor((elapsedS % 3600) / 60);
  const s = elapsedS % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export default function EventBannerPanel({ event }: EventBannerPanelProps) {
  const { t } = useLocale();
  const [, setTick] = useState(0);

  useEffect(() => {
    if (!event?.actualStart) return;
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [event?.actualStart]);

  if (!event || event.status !== "active") return null;

  const typeIcon = EVENT_ICONS[event.type] ?? "📡";

  return (
    <PanelFrame
      title="ACTIVE EVENT"
      icon="🚀"
      accentColor="var(--color-accent-red)"
      className="animate-pulse-event"
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {/* Title row */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 18 }}>{typeIcon}</span>
          <div>
            <div
              style={{
                color: "var(--color-text-primary)",
                fontWeight: 700,
                fontSize: 12,
              }}
            >
              {event.title}
            </div>
            <div
              style={{
                color: "var(--color-text-muted)",
                fontSize: 9,
                textTransform: "uppercase",
              }}
            >
              {event.type}
            </div>
          </div>
          {event.actualStart && (
            <div
              style={{
                marginLeft: "auto",
                textAlign: "right",
              }}
            >
              <div style={{ color: "var(--color-text-muted)", fontSize: 9 }}>
                {t("events.duration")}
              </div>
              <div
                style={{
                  color: "var(--color-accent-red)",
                  fontSize: 11,
                  fontWeight: 700,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {formatDuration(event.actualStart)}
              </div>
            </div>
          )}
        </div>

        {/* Description */}
        <div
          style={{
            color: "var(--color-text-muted)",
            fontSize: 10,
            lineHeight: 1.4,
          }}
        >
          {event.description}
        </div>

        {/* Type-specific metadata */}
        {event.type === "eva" && (event.metadata.ev1 || event.metadata.ev2) && (
          <div style={{ display: "flex", gap: 12 }}>
            {event.metadata.ev1 && (
              <span style={{ color: "var(--color-accent-cyan)", fontSize: 10 }}>
                EV1: {event.metadata.ev1}
              </span>
            )}
            {event.metadata.ev2 && (
              <span style={{ color: "var(--color-accent-green)", fontSize: 10 }}>
                EV2: {event.metadata.ev2}
              </span>
            )}
          </div>
        )}
        {event.type === "docking" && event.metadata.vehicle && (
          <span style={{ color: "var(--color-accent-cyan)", fontSize: 10 }}>
            {t("events.docking")}: {event.metadata.vehicle}
          </span>
        )}
        {event.type === "reboost" && (event.metadata.climbKm || event.metadata.deltaV) && (
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            {event.metadata.climbKm && (
              <span style={{ color: "var(--color-accent-orange)", fontSize: 10 }}>
                +{event.metadata.climbKm} km
              </span>
            )}
            {event.metadata.deltaV && (
              <span style={{ color: "var(--color-accent-orange)", fontSize: 10 }}>
                ΔV: {event.metadata.deltaV} m/s
              </span>
            )}
            {event.metadata.apoapsisKm && event.metadata.periapsisKm && (
              <span style={{ color: "var(--color-text-muted)", fontSize: 10 }}>
                Apo/Peri: {event.metadata.apoapsisKm}/{event.metadata.periapsisKm} km
              </span>
            )}
          </div>
        )}
      </div>
    </PanelFrame>
  );
}
