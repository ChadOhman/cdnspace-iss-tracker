"use client";

import { TopBar } from "@/components/TopBar";
import { BottomBar } from "@/components/BottomBar";
import { useTelemetryStream } from "@/hooks/useTelemetryStream";
import { useTime } from "@/context/TimeContext";
import { useEvent } from "@/context/EventContext";

export function Dashboard() {
  const { mode } = useTime();
  const { activeEvent } = useEvent();
  const stream = useTelemetryStream(mode === "LIVE");

  return (
    <div className="dashboard-grid">
      <TopBar
        orbital={stream.orbital}
        connected={stream.connected}
        reconnecting={stream.reconnecting}
        lastUpdate={stream.lastUpdate}
        visitorCount={stream.visitorCount}
      />

      {/* Timeline row — placeholder */}
      <div
        style={{
          gridArea: "timeline",
          background: "var(--color-bg-secondary)",
          borderBottom: "1px solid var(--color-border-accent)",
          display: "flex",
          alignItems: "center",
          padding: "0 8px",
          fontSize: 10,
          color: "var(--color-text-muted)",
        }}
      >
        {/* TimelinePanel will be placed here */}
      </div>

      {/* Left column */}
      <div className="col-left">
        <div className="panel" style={{ minHeight: 40, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--color-text-muted)", fontSize: 10 }}>Left panels loading…</div>
      </div>

      {/* Center column */}
      <div className="col-center">
        <div className="panel" style={{ minHeight: 40, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--color-text-muted)", fontSize: 10 }}>Center panels loading…</div>
      </div>

      {/* Right column */}
      <div className="col-right">
        <div className="panel" style={{ minHeight: 40, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--color-text-muted)", fontSize: 10 }}>Right panels loading…</div>
      </div>

      <BottomBar />
    </div>
  );
}
