"use client";

import dynamic from "next/dynamic";
import { TopBar } from "@/components/TopBar";
import { BottomBar } from "@/components/BottomBar";
import { useTelemetryStream } from "@/hooks/useTelemetryStream";
import { useTime } from "@/context/TimeContext";
import { useEvent } from "@/context/EventContext";

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
