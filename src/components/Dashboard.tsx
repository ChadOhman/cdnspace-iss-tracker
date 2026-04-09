"use client";

import { useEffect, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { TopBar } from "@/components/TopBar";
import { BottomBar } from "@/components/BottomBar";
import { useTelemetryStream } from "@/hooks/useTelemetryStream";
import { useTime } from "@/context/TimeContext";
import { useEvent } from "@/context/EventContext";
import {
  PanelId,
  PanelColumn,
  defaultPanelVisibility,
  defaultPanelColumns,
} from "@/lib/panel-visibility";
import {
  StoredPresetsState,
  DashboardLayoutSnapshot,
  readStoredPresetsState,
  writeStoredPresetsState,
  getSnapshotForPresetId,
  saveNewPreset,
  deletePreset,
  setActivePresetId,
} from "@/lib/dashboard-layout-presets";
import PanelVisibilityModal from "@/components/modals/PanelVisibilityModal";

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

function useLayoutPresets() {
  const [presetsState, setPresetsState] = useState<StoredPresetsState>(() =>
    readStoredPresetsState()
  );
  const [panelVisibility, setPanelVisibility] = useState<Record<PanelId, boolean>>(
    () => defaultPanelVisibility()
  );
  const [panelColumns, setPanelColumns] = useState<Record<PanelId, PanelColumn>>(
    () => defaultPanelColumns()
  );

  // On mount, load from localStorage and apply active preset
  useEffect(() => {
    const state = readStoredPresetsState();
    setPresetsState(state);
    const snapshot = getSnapshotForPresetId(state, state.activePresetId);
    setPanelVisibility(snapshot.panelVisibility);
    setPanelColumns(snapshot.panelColumns);
  }, []);

  function applySnapshot(snapshot: DashboardLayoutSnapshot) {
    setPanelVisibility(snapshot.panelVisibility);
    setPanelColumns(snapshot.panelColumns);
  }

  function updateState(newState: StoredPresetsState) {
    setPresetsState(newState);
    writeStoredPresetsState(newState);
  }

  const handlePresetChange = useCallback(
    (presetId: string) => {
      const newState = setActivePresetId(presetsState, presetId);
      updateState(newState);
      const snapshot = getSnapshotForPresetId(newState, presetId);
      applySnapshot(snapshot);
    },
    [presetsState]
  );

  const handleSavePreset = useCallback(
    (name: string): boolean => {
      const snapshot: DashboardLayoutSnapshot = { panelVisibility, panelColumns };
      const newState = saveNewPreset(presetsState, name, snapshot);
      updateState(newState);
      return true;
    },
    [presetsState, panelVisibility, panelColumns]
  );

  const handleDeletePreset = useCallback(() => {
    const newState = deletePreset(presetsState, presetsState.activePresetId);
    updateState(newState);
    const snapshot = getSnapshotForPresetId(newState, newState.activePresetId);
    applySnapshot(snapshot);
  }, [presetsState]);

  const handleToggle = useCallback((id: PanelId, visible: boolean) => {
    setPanelVisibility((prev) => ({ ...prev, [id]: visible }));
  }, []);

  const handleColumnChange = useCallback((id: PanelId, col: PanelColumn) => {
    setPanelColumns((prev) => ({ ...prev, [id]: col }));
  }, []);

  return {
    presetsState,
    panelVisibility,
    panelColumns,
    handlePresetChange,
    handleSavePreset,
    handleDeletePreset,
    handleToggle,
    handleColumnChange,
  };
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
import TdrsPanel from "@/components/panels/TdrsPanel";

export function Dashboard() {
  useBuildCheck();
  const { mode } = useTime();
  const { activeEvent } = useEvent();
  const stream = useTelemetryStream(mode === "LIVE");

  const {
    presetsState,
    panelVisibility,
    panelColumns,
    handlePresetChange,
    handleSavePreset,
    handleDeletePreset,
    handleToggle,
    handleColumnChange,
  } = useLayoutPresets();

  const [modalOpen, setModalOpen] = useState(false);

  // 'M' keyboard shortcut to toggle the modal
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.key === "m" || e.key === "M") {
        setModalOpen((open) => !open);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Helper: show a panel in a specific column
  function show(id: PanelId, col: PanelColumn): boolean {
    return panelVisibility[id] && panelColumns[id] === col;
  }

  const presetOptions = presetsState.presets.map((p) => ({
    id: p.id,
    name: p.name,
  }));

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
      {panelVisibility.timeline && (
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
      )}

      {/* Left column */}
      <div className="col-left">
        {show("groundTrack", "left") && <GroundTrackPanel orbital={stream.orbital} />}
        {show("orbitalParams", "left") && <OrbitalParamsPanel orbital={stream.orbital} />}
        {show("spaceWeather", "left") && <SpaceWeatherPanel solar={stream.solar} />}
        {show("passPrediction", "left") && <PassPredictionPanel />}
        {show("liveVideo", "left") && <LiveVideoPanel />}
        {show("solarArrays", "left") && <SolarArrayPanel telemetry={stream.telemetry} />}
        {show("eclss", "left") && <EclssPanel telemetry={stream.telemetry} />}
        {show("eventBanner", "left") && <EventBannerPanel event={stream.activeEvent ?? activeEvent} />}
        {show("crew", "left") && <CrewRosterPanel />}
        {show("attitude", "left") && <AttitudePanel telemetry={stream.telemetry} />}
        {show("tdrs", "left") && <TdrsPanel orbital={stream.orbital} />}
        {show("moduleTemps", "left") && <ModuleTempsPanel telemetry={stream.telemetry} />}
        {show("airlock", "left") && <AirlockPanel telemetry={stream.telemetry} />}
        {show("upcomingEvents", "left") && <UpcomingEventsPanel />}
        {show("dayNight", "left") && <DayNightPanel orbital={stream.orbital} />}
      </div>

      {/* Center column */}
      <div className="col-center">
        {show("groundTrack", "center") && <GroundTrackPanel orbital={stream.orbital} />}
        {show("orbitalParams", "center") && <OrbitalParamsPanel orbital={stream.orbital} />}
        {show("spaceWeather", "center") && <SpaceWeatherPanel solar={stream.solar} />}
        {show("passPrediction", "center") && <PassPredictionPanel />}
        {show("liveVideo", "center") && <LiveVideoPanel />}
        {show("solarArrays", "center") && <SolarArrayPanel telemetry={stream.telemetry} />}
        {show("eclss", "center") && <EclssPanel telemetry={stream.telemetry} />}
        {show("eventBanner", "center") && <EventBannerPanel event={stream.activeEvent ?? activeEvent} />}
        {show("crew", "center") && <CrewRosterPanel />}
        {show("attitude", "center") && <AttitudePanel telemetry={stream.telemetry} />}
        {show("tdrs", "center") && <TdrsPanel orbital={stream.orbital} />}
        {show("moduleTemps", "center") && <ModuleTempsPanel telemetry={stream.telemetry} />}
        {show("airlock", "center") && <AirlockPanel telemetry={stream.telemetry} />}
        {show("upcomingEvents", "center") && <UpcomingEventsPanel />}
        {show("dayNight", "center") && <DayNightPanel orbital={stream.orbital} />}
      </div>

      {/* Right column */}
      <div className="col-right">
        {show("groundTrack", "right") && <GroundTrackPanel orbital={stream.orbital} />}
        {show("orbitalParams", "right") && <OrbitalParamsPanel orbital={stream.orbital} />}
        {show("spaceWeather", "right") && <SpaceWeatherPanel solar={stream.solar} />}
        {show("passPrediction", "right") && <PassPredictionPanel />}
        {show("liveVideo", "right") && <LiveVideoPanel />}
        {show("solarArrays", "right") && <SolarArrayPanel telemetry={stream.telemetry} />}
        {show("eclss", "right") && <EclssPanel telemetry={stream.telemetry} />}
        {show("eventBanner", "right") && <EventBannerPanel event={stream.activeEvent ?? activeEvent} />}
        {show("crew", "right") && <CrewRosterPanel />}
        {show("attitude", "right") && <AttitudePanel telemetry={stream.telemetry} />}
        {show("tdrs", "right") && <TdrsPanel orbital={stream.orbital} />}
        {show("moduleTemps", "right") && <ModuleTempsPanel telemetry={stream.telemetry} />}
        {show("airlock", "right") && <AirlockPanel telemetry={stream.telemetry} />}
        {show("upcomingEvents", "right") && <UpcomingEventsPanel />}
        {show("dayNight", "right") && <DayNightPanel orbital={stream.orbital} />}
      </div>

      {/* Bottom bar */}
      <BottomBar />

      {/* Gear button — fixed, bottom-left above bottom bar */}
      <button
        onClick={() => setModalOpen(true)}
        title="Customize panels (M)"
        aria-label="Customize panels"
        style={{
          position: "fixed",
          bottom: "40px",
          left: "8px",
          zIndex: 900,
          width: "30px",
          height: "30px",
          borderRadius: "50%",
          background: "var(--color-bg-panel, #1a1a2e)",
          border: "1px solid var(--color-border-accent, #333)",
          color: "var(--color-text-muted, #888)",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "0.9rem",
          lineHeight: 1,
          padding: 0,
          transition: "color 0.15s, border-color 0.15s",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.color = "var(--color-text-primary, #e0e0e0)";
          (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--color-border-active, #2255aa)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.color = "var(--color-text-muted, #888)";
          (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--color-border-accent, #333)";
        }}
      >
        ⚙
      </button>

      {/* Panel customization modal */}
      <PanelVisibilityModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        activePresetId={presetsState.activePresetId}
        presetOptions={presetOptions}
        onPresetChange={handlePresetChange}
        onSavePreset={handleSavePreset}
        onDeletePreset={handleDeletePreset}
        visibility={panelVisibility}
        onToggle={handleToggle}
        columns={panelColumns}
        onColumnChange={handleColumnChange}
      />
    </div>
  );
}
