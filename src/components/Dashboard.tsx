"use client";

import { useEffect } from "react";
import dynamic from "next/dynamic";
import { TopBar } from "@/components/TopBar";
import { BottomBar } from "@/components/BottomBar";
import { useTelemetryStream } from "@/hooks/useTelemetryStream";
import { useTime } from "@/context/TimeContext";
import { useEvent } from "@/context/EventContext";

const BUILD_ID = process.env.NEXT_PUBLIC_BUILD_ID ?? "";
const BUILD_CHECK_INTERVAL = 60_000;

function useBuildCheck() {
  // Restore scroll position after a build-triggered reload
  useEffect(() => {
    const saved = sessionStorage.getItem("scrollRestore");
    if (saved) {
      sessionStorage.removeItem("scrollRestore");
      const parsed = JSON.parse(saved) as Record<string, number>;
      requestAnimationFrame(() => {
        for (const [selector, top] of Object.entries(parsed)) {
          const el = document.querySelector(selector) as HTMLElement;
          if (el) el.scrollTop = top;
        }
      });
    }
  }, []);

  // Poll /api/build every 60s, reload if buildId changed
  useEffect(() => {
    if (!BUILD_ID) return;
    const id = setInterval(async () => {
      try {
        const res = await fetch("/api/build");
        const data = await res.json();
        if (data.buildId && data.buildId !== BUILD_ID) {
          // Save scroll positions for all columns before reload
          const columns = [".col-left", ".col-center", ".col-right"];
          const scrollState: Record<string, number> = {};
          for (const sel of columns) {
            const el = document.querySelector(sel) as HTMLElement;
            if (el) scrollState[sel] = el.scrollTop;
          }
          sessionStorage.setItem("scrollRestore", JSON.stringify(scrollState));
          window.location.reload();
        }
      } catch {
        // ignore fetch errors
      }
    }, BUILD_CHECK_INTERVAL);
    return () => clearInterval(id);
  }, []);
}

// Dynamic imports to avoid SSR issues with Leaflet
const GroundTrackPanel = dynamic(
  () => import("@/components/panels/GroundTrackPanel"),
  { ssr: false }
);
import OrbitalParamsPanel from "@/components/panels/OrbitalParamsPanel";
import SpaceWeatherPanel from "@/components/panels/SpaceWeatherPanel";
import PassPredictionPanel from "@/components/panels/PassPredictionPanel";
import LiveVideoPanel from "@/components/panels/LiveVideoPanel";
import TimelinePanel from "@/components/panels/TimelinePanel";
import SolarArrayPanel from "@/components/panels/SolarArrayPanel";
import EclssPanel from "@/components/panels/EclssPanel";
import EventBannerPanel from "@/components/panels/EventBannerPanel";
import CrewRosterPanel from "@/components/panels/CrewRosterPanel";
import AttitudePanel from "@/components/panels/AttitudePanel";
import ModuleTempsPanel from "@/components/panels/ModuleTempsPanel";
import AirlockPanel from "@/components/panels/AirlockPanel";
import UpcomingEventsPanel from "@/components/panels/UpcomingEventsPanel";
import DayNightPanel from "@/components/panels/DayNightPanel";

export function Dashboard() {
  useBuildCheck();
  const { mode } = useTime();
  const { activeEvent } = useEvent();
  const stream = useTelemetryStream(mode === "LIVE");

  return (
    <div className="dashboard-grid">
      {/* Top bar */}
      <TopBar
        orbital={stream.orbital}
        connected={stream.connected}
        reconnecting={stream.reconnecting}
        lastUpdate={stream.lastUpdate}
        visitorCount={stream.visitorCount}
      />

      {/* Timeline row */}
      <div
        style={{
          gridArea: "timeline",
          background: "var(--color-bg-secondary)",
          borderBottom: "1px solid var(--color-border-accent)",
          padding: "4px 8px",
          overflow: "hidden",
        }}
      >
        <TimelinePanel />
      </div>

      {/* Left column */}
      <div className="col-left">
        <GroundTrackPanel orbital={stream.orbital} />
        <OrbitalParamsPanel orbital={stream.orbital} />
        <SpaceWeatherPanel solar={stream.solar} />
        <PassPredictionPanel />
      </div>

      {/* Center column */}
      <div className="col-center">
        <LiveVideoPanel />
        <SolarArrayPanel telemetry={stream.telemetry} />
        <EclssPanel telemetry={stream.telemetry} />
      </div>

      {/* Right column */}
      <div className="col-right">
        <EventBannerPanel event={stream.activeEvent ?? activeEvent} />
        <CrewRosterPanel />
        <AttitudePanel telemetry={stream.telemetry} />
        <ModuleTempsPanel telemetry={stream.telemetry} />
        <AirlockPanel telemetry={stream.telemetry} />
        <UpcomingEventsPanel />
        <DayNightPanel orbital={stream.orbital} />
      </div>

      {/* Bottom bar */}
      <BottomBar />
    </div>
  );
}
