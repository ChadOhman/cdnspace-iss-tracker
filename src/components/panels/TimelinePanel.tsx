"use client";

import { useMemo, useState, useEffect } from "react";
import PanelFrame from "@/components/shared/PanelFrame";
import type { ActivityType, TimelineActivity } from "@/lib/types";
import { useLocale } from "@/context/LocaleContext";

const ACTIVITY_COLORS: Record<ActivityType, string> = {
  sleep: "var(--color-activity-sleep)",
  science: "var(--color-activity-science)",
  exercise: "var(--color-activity-exercise)",
  meal: "var(--color-activity-meal)",
  eva: "var(--color-activity-eva)",
  maneuver: "var(--color-activity-maneuver)",
  dpc: "#5c8a8a",
  "off-duty": "var(--color-activity-off-duty)",
  other: "#4a5568",
};

function makeSampleActivities(): TimelineActivity[] {
  const today = new Date();
  const base = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const t = (h: number, m = 0) => base.getTime() + (h * 60 + m) * 60 * 1000;

  return [
    { name: "Sleep", type: "sleep", startTime: t(0), endTime: t(6) },
    { name: "Morning Hygiene", type: "other", startTime: t(6), endTime: t(7) },
    { name: "Breakfast", type: "meal", startTime: t(7), endTime: t(7, 30) },
    { name: "DPC", type: "dpc", startTime: t(7, 30), endTime: t(8) },
    { name: "Science — MISSE", type: "science", startTime: t(8), endTime: t(11) },
    { name: "Lunch", type: "meal", startTime: t(11), endTime: t(11, 45) },
    { name: "Exercise", type: "exercise", startTime: t(11, 45), endTime: t(13) },
    { name: "Science — Veggie", type: "science", startTime: t(13), endTime: t(15, 30) },
    { name: "Dinner", type: "meal", startTime: t(15, 30), endTime: t(16) },
    { name: "Off Duty", type: "off-duty", startTime: t(16), endTime: t(18) },
    { name: "Pre-sleep", type: "other", startTime: t(18), endTime: t(18, 30) },
    { name: "Sleep", type: "sleep", startTime: t(18, 30), endTime: t(24) },
  ];
}

export default function TimelinePanel() {
  const { t } = useLocale();
  const activities = useMemo(() => makeSampleActivities(), []);

  const DAY_MS = 24 * 60 * 60 * 1000;
  const dayStart = useMemo(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  }, []);
  const [nowFrac, setNowFrac] = useState<number | null>(null);

  useEffect(() => {
    const update = () => {
      const now = new Date();
      const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      setNowFrac(Math.max(0, Math.min(1, (now.getTime() - dayStart) / DAY_MS)));
    };
    update();
    const id = setInterval(update, 30_000);
    return () => clearInterval(id);
  }, []);

  // hour labels — 7 elements. Mobile CSS in globals.css (.timeline-hour-labels)
  // hides :nth-child(2,4,6) to keep 00/08/16/24. Changing this array requires
  // updating that CSS rule.
  const hourLabels = [0, 4, 8, 12, 16, 20, 24];

  return (
    <PanelFrame
      title={t("panels.crewTimeline").toUpperCase()}
      icon="📅"
      accentColor="var(--color-accent-purple)"
    >
      {/* Hour labels */}
      <div
        className="timeline-hour-labels"
        style={{
          position: "relative",
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 2,
        }}
      >
        {hourLabels.map((h) => (
          <span
            key={h}
            className="panel-label-xs"
            style={{ color: "var(--color-text-muted)" }}
          >
            {String(h).padStart(2, "0")}:00
          </span>
        ))}
      </div>

      {/* Timeline bar */}
      <div
        style={{
          position: "relative",
          height: 20,
          borderRadius: 3,
          overflow: "hidden",
          background: "var(--color-bg-secondary)",
          border: "1px solid var(--color-border-subtle)",
        }}
      >
        {activities.map((act, i) => {
          const leftFrac = (act.startTime - dayStart) / DAY_MS;
          const widthFrac = (act.endTime - act.startTime) / DAY_MS;
          if (leftFrac >= 1 || widthFrac <= 0) return null;
          return (
            <div
              key={i}
              title={act.name}
              style={{
                position: "absolute",
                top: 0,
                bottom: 0,
                left: `${leftFrac * 100}%`,
                width: `${widthFrac * 100}%`,
                background: ACTIVITY_COLORS[act.type],
                opacity: 0.85,
              }}
            />
          );
        })}

        {/* NOW marker (client-only to avoid hydration mismatch) */}
        {nowFrac !== null && (
          <div
            style={{
              position: "absolute",
              top: 0,
              bottom: 0,
              left: `${nowFrac * 100}%`,
              width: 2,
              background: "#fff",
              boxShadow: "0 0 4px rgba(255,255,255,0.8)",
              zIndex: 2,
            }}
          />
        )}
      </div>

      {/* Legend */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "4px 10px",
          marginTop: 6,
        }}
      >
        {(
          [
            ["sleep", t("timeline.sleep")],
            ["science", t("timeline.science")],
            ["exercise", t("timeline.exercise")],
            ["meal", t("timeline.meal")],
            ["eva", t("timeline.eva")],
          ] as [ActivityType, string][]
        ).map(([type, label]) => (
          <div
            key={type}
            style={{ display: "flex", alignItems: "center", gap: 3 }}
          >
            <span
              style={{
                display: "inline-block",
                width: 8,
                height: 8,
                borderRadius: 2,
                background: ACTIVITY_COLORS[type],
              }}
            />
            <span className="panel-label-xs" style={{ color: "var(--color-text-muted)" }}>
              {label}
            </span>
          </div>
        ))}
      </div>
    </PanelFrame>
  );
}
