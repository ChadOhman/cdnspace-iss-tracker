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
import { useBuildCheck } from "@/hooks/useBuildCheck";

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
import SystemsHealthPanel from "@/components/panels/SystemsHealthPanel";
import EvaBatteryPanel from "@/components/panels/EvaBatteryPanel";
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
import CommsPanel from "@/components/panels/CommsPanel";
import Canadarm2Panel from "@/components/panels/Canadarm2Panel";
import RussianSegmentPanel from "@/components/panels/RussianSegmentPanel";

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
        crew={stream.crew}
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

      {/* Mobile column — curated single-column layout, hidden on desktop */}
      <div className="col-mobile">
        {panelVisibility.eventBanner && <EventBannerPanel event={stream.activeEvent ?? activeEvent} />}
        {panelVisibility.groundTrack && <GroundTrackPanel orbital={stream.orbital} />}
        {panelVisibility.crew && <CrewRosterPanel crew={stream.crew} />}
        {panelVisibility.liveVideo && <LiveVideoPanel />}
        {panelVisibility.upcomingEvents && <UpcomingEventsPanel />}
        {panelVisibility.orbitalParams && <OrbitalParamsPanel orbital={stream.orbital} telemetry={stream.telemetry} />}
        {panelVisibility.spaceWeather && <SpaceWeatherPanel solar={stream.solar} />}
        {panelVisibility.dayNight && <DayNightPanel orbital={stream.orbital} />}
        {panelVisibility.passPrediction && <PassPredictionPanel />}
        {panelVisibility.solarArrays && <SolarArrayPanel telemetry={stream.telemetry} />}
        {panelVisibility.eclss && <EclssPanel telemetry={stream.telemetry} />}
        {panelVisibility.attitude && <AttitudePanel telemetry={stream.telemetry} />}
      </div>

      {/* Left column — Where is the ISS? (navigation & environment) */}
      <div className="col-left">
        {show("eventBanner", "left") && <EventBannerPanel event={stream.activeEvent ?? activeEvent} />}
        {show("groundTrack", "left") && <GroundTrackPanel orbital={stream.orbital} />}
        {show("orbitalParams", "left") && <OrbitalParamsPanel orbital={stream.orbital} telemetry={stream.telemetry} />}
        {show("dayNight", "left") && <DayNightPanel orbital={stream.orbital} />}
        {show("passPrediction", "left") && <PassPredictionPanel />}
        {show("liveVideo", "left") && <LiveVideoPanel />}
        {show("crew", "left") && <CrewRosterPanel crew={stream.crew} />}
        {show("upcomingEvents", "left") && <UpcomingEventsPanel />}
        {show("spaceWeather", "left") && <SpaceWeatherPanel solar={stream.solar} />}
        {show("solarArrays", "left") && <SolarArrayPanel telemetry={stream.telemetry} />}
        {show("eclss", "left") && <EclssPanel telemetry={stream.telemetry} />}
        {show("attitude", "left") && <AttitudePanel telemetry={stream.telemetry} />}
        {show("moduleTemps", "left") && <ModuleTempsPanel telemetry={stream.telemetry} />}
        {show("tdrs", "left") && <TdrsPanel orbital={stream.orbital} />}
        {show("comms", "left") && <CommsPanel telemetry={stream.telemetry} />}
        {show("canadarm", "left") && <Canadarm2Panel telemetry={stream.telemetry} />}
        {show("airlock", "left") && <AirlockPanel telemetry={stream.telemetry} />}
        {show("russianSegment", "left") && <RussianSegmentPanel telemetry={stream.telemetry} />}
        {show("systemsHealth", "left") && <SystemsHealthPanel telemetry={stream.telemetry} />}
        {show("evaBattery", "left") && <EvaBatteryPanel telemetry={stream.telemetry} evaActive={(stream.activeEvent?.type ?? activeEvent?.type) === "eva"} />}
      </div>

      {/* Center column — What's happening? (crew & media) */}
      <div className="col-center">
        {show("eventBanner", "center") && <EventBannerPanel event={stream.activeEvent ?? activeEvent} />}
        {show("liveVideo", "center") && <LiveVideoPanel />}
        {show("crew", "center") && <CrewRosterPanel crew={stream.crew} />}
        {show("upcomingEvents", "center") && <UpcomingEventsPanel />}
        {show("spaceWeather", "center") && <SpaceWeatherPanel solar={stream.solar} />}
        {show("groundTrack", "center") && <GroundTrackPanel orbital={stream.orbital} />}
        {show("orbitalParams", "center") && <OrbitalParamsPanel orbital={stream.orbital} telemetry={stream.telemetry} />}
        {show("dayNight", "center") && <DayNightPanel orbital={stream.orbital} />}
        {show("passPrediction", "center") && <PassPredictionPanel />}
        {show("solarArrays", "center") && <SolarArrayPanel telemetry={stream.telemetry} />}
        {show("eclss", "center") && <EclssPanel telemetry={stream.telemetry} />}
        {show("attitude", "center") && <AttitudePanel telemetry={stream.telemetry} />}
        {show("moduleTemps", "center") && <ModuleTempsPanel telemetry={stream.telemetry} />}
        {show("tdrs", "center") && <TdrsPanel orbital={stream.orbital} />}
        {show("comms", "center") && <CommsPanel telemetry={stream.telemetry} />}
        {show("canadarm", "center") && <Canadarm2Panel telemetry={stream.telemetry} />}
        {show("airlock", "center") && <AirlockPanel telemetry={stream.telemetry} />}
        {show("russianSegment", "center") && <RussianSegmentPanel telemetry={stream.telemetry} />}
        {show("systemsHealth", "center") && <SystemsHealthPanel telemetry={stream.telemetry} />}
        {show("evaBattery", "center") && <EvaBatteryPanel telemetry={stream.telemetry} evaActive={(stream.activeEvent?.type ?? activeEvent?.type) === "eva"} />}
      </div>

      {/* Right column — How are the systems? (engineering telemetry) */}
      <div className="col-right">
        {show("eventBanner", "right") && <EventBannerPanel event={stream.activeEvent ?? activeEvent} />}
        {show("solarArrays", "right") && <SolarArrayPanel telemetry={stream.telemetry} />}
        {show("eclss", "right") && <EclssPanel telemetry={stream.telemetry} />}
        {show("attitude", "right") && <AttitudePanel telemetry={stream.telemetry} />}
        {show("moduleTemps", "right") && <ModuleTempsPanel telemetry={stream.telemetry} />}
        {show("tdrs", "right") && <TdrsPanel orbital={stream.orbital} />}
        {show("comms", "right") && <CommsPanel telemetry={stream.telemetry} />}
        {show("canadarm", "right") && <Canadarm2Panel telemetry={stream.telemetry} />}
        {show("airlock", "right") && <AirlockPanel telemetry={stream.telemetry} />}
        {show("russianSegment", "right") && <RussianSegmentPanel telemetry={stream.telemetry} />}
        {show("systemsHealth", "right") && <SystemsHealthPanel telemetry={stream.telemetry} />}
        {show("evaBattery", "right") && <EvaBatteryPanel telemetry={stream.telemetry} evaActive={(stream.activeEvent?.type ?? activeEvent?.type) === "eva"} />}
        {show("groundTrack", "right") && <GroundTrackPanel orbital={stream.orbital} />}
        {show("orbitalParams", "right") && <OrbitalParamsPanel orbital={stream.orbital} telemetry={stream.telemetry} />}
        {show("dayNight", "right") && <DayNightPanel orbital={stream.orbital} />}
        {show("passPrediction", "right") && <PassPredictionPanel />}
        {show("liveVideo", "right") && <LiveVideoPanel />}
        {show("crew", "right") && <CrewRosterPanel crew={stream.crew} />}
        {show("upcomingEvents", "right") && <UpcomingEventsPanel />}
        {show("spaceWeather", "right") && <SpaceWeatherPanel solar={stream.solar} />}
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
          transition: "color 0.15s, border-color 0.15s, box-shadow 0.15s",
          boxShadow: "0 0 12px 3px rgba(0, 229, 255, 0.25), 0 2px 8px rgba(0, 0, 0, 0.5)",
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
