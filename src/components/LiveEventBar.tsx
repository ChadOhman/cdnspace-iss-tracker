"use client";

import { useEffect, useState, memo } from "react";
import Link from "next/link";
import type { ISSEvent, EventType } from "@/lib/types";

interface LiveEventBarProps {
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

function formatElapsed(startTs: number): string {
  const elapsedS = Math.max(0, Math.floor((Date.now() - startTs) / 1000));
  const h = Math.floor(elapsedS / 3600);
  const m = Math.floor((elapsedS % 3600) / 60);
  const s = elapsedS % 60;
  return [h, m, s].map((v) => String(v).padStart(2, "0")).join(":");
}

function LiveEventBarInner({ event }: LiveEventBarProps) {
  const [, setTick] = useState(0);

  useEffect(() => {
    if (!event?.actualStart) return;
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [event?.actualStart]);

  if (!event || event.status !== "active") return null;

  const icon = EVENT_ICONS[event.type] ?? "📡";

  return (
    <div
      style={{
        gridArea: "liveevent",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
        padding: "4px 16px",
        background: "rgba(255,61,61,0.08)",
        borderBottom: "1px solid rgba(255,61,61,0.3)",
        fontSize: 10,
        fontFamily: "inherit",
        animation: "pulse-event 3s ease-in-out infinite",
      }}
    >
      {/* Pulsing dot */}
      <span
        className="animate-pulse-live"
        style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: "var(--color-accent-red)",
          flexShrink: 0,
        }}
      />

      {/* Icon + title */}
      <span style={{ fontSize: 14 }}>{icon}</span>
      <span
        className="live-event-title"
        style={{
          color: "var(--color-text-primary)",
          fontWeight: 700,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {event.title}
      </span>

      {/* Timer */}
      {event.actualStart && (
        <span
          style={{
            color: "var(--color-accent-red)",
            fontWeight: 700,
            fontVariantNumeric: "tabular-nums",
            letterSpacing: "0.05em",
          }}
        >
          T+ {formatElapsed(event.actualStart)}
        </span>
      )}

      {/* Vehicle info */}
      {event.metadata?.vehicle && (
        <span style={{ color: "var(--color-text-muted)" }}>
          {event.metadata.vehicle}
        </span>
      )}

      {/* Watch live link */}
      <Link
        href="/live"
        style={{
          padding: "2px 10px",
          borderRadius: 3,
          border: "1px solid var(--color-accent-red)",
          background: "rgba(255,61,61,0.15)",
          color: "var(--color-accent-red)",
          fontWeight: 700,
          fontSize: 9,
          letterSpacing: "0.05em",
          textDecoration: "none",
          flexShrink: 0,
        }}
      >
        WATCH LIVE
      </Link>
    </div>
  );
}

export const LiveEventBar = memo(LiveEventBarInner);
