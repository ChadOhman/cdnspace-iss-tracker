"use client";

import { useEffect, useState } from "react";
import PanelFrame from "@/components/shared/PanelFrame";
import type { ISSEvent } from "@/lib/types";
import { useLocale } from "@/context/LocaleContext";

const EVENT_TYPE_ICONS: Record<string, string> = {
  eva: "🚶",
  docking: "🔗",
  undocking: "↗️",
  reboost: "🚀",
  maneuver: "🔄",
};

function formatEventDate(ts: number): { date: string; time: string } {
  const d = new Date(ts);
  return {
    date: d.toLocaleDateString("en-CA", { month: "short", day: "numeric" }),
    time: d.toLocaleTimeString("en-CA", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }),
  };
}

export default function UpcomingEventsPanel() {
  const { t } = useLocale();
  const [events, setEvents] = useState<ISSEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    function load() {
      fetch("/api/events")
        .then((r) => {
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          return r.json();
        })
        .then((data: { active: ISSEvent[]; upcoming: ISSEvent[] }) => {
          if (cancelled) return;
          // Merge active + upcoming, sort by start time, take next 5
          const all = [...(data.active ?? []), ...(data.upcoming ?? [])];
          const sorted = all
            .filter((e) => e.status === "scheduled" || e.status === "active")
            .sort((a, b) => a.scheduledStart - b.scheduledStart)
            .slice(0, 5);
          setEvents(sorted);
          setError(null);
          setLoading(false);
        })
        .catch((e) => {
          if (cancelled) return;
          setError(e.message);
          setLoading(false);
        });
    }

    load();
    // Refetch every 5 minutes so the list stays current
    const id = setInterval(load, 5 * 60 * 1000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  return (
    <PanelFrame
      title={t("panels.upcoming").toUpperCase()}
      icon="📋"
      accentColor="var(--color-accent-orange)"
    >
      {loading ? (
        <div
          style={{
            color: "var(--color-text-muted)",
            fontSize: 10,
            textAlign: "center",
            padding: "12px 0",
          }}
        >
          {t("upcoming.loadingEvents")}
        </div>
      ) : error ? (
        <div
          style={{
            color: "var(--color-text-muted)",
            fontSize: 10,
            textAlign: "center",
            padding: "12px 0",
          }}
        >
          {t("upcoming.noEventsAvailable")}
        </div>
      ) : events.length === 0 ? (
        <div
          style={{
            color: "var(--color-text-muted)",
            fontSize: 10,
            textAlign: "center",
            padding: "12px 0",
          }}
        >
          {t("upcoming.noUpcomingEvents")}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {events.map((event, i) => {
            const { date, time } = formatEventDate(event.scheduledStart);
            return (
              <div
                key={event.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "44px 1fr",
                  gap: 8,
                  padding: "5px 0",
                  borderBottom:
                    i < events.length - 1
                      ? "1px solid var(--color-border-subtle)"
                      : "none",
                  alignItems: "start",
                }}
              >
                {/* Date */}
                <div style={{ textAlign: "center" }}>
                  <div
                    style={{
                      color: "var(--color-accent-orange)",
                      fontSize: 9,
                      fontWeight: 700,
                    }}
                  >
                    {date}
                  </div>
                  <div style={{ color: "var(--color-text-muted)", fontSize: 9 }}>
                    {time}
                  </div>
                </div>

                {/* Content */}
                <div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <span style={{ fontSize: 10 }}>
                      {EVENT_TYPE_ICONS[event.type] ?? "📡"}
                    </span>
                    <span
                      style={{
                        color: "var(--color-text-primary)",
                        fontSize: 10,
                        fontWeight: 600,
                      }}
                    >
                      {event.title}
                    </span>
                  </div>
                  <div
                    style={{
                      color: "var(--color-text-muted)",
                      fontSize: 9,
                      lineHeight: 1.4,
                      marginTop: 1,
                    }}
                  >
                    {event.description}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </PanelFrame>
  );
}
