export type PanelColumn = "left" | "center" | "right";

export const PANEL_DEFINITIONS = [
  // Left column defaults
  { group: "left", id: "groundTrack", label: "Ground Track" },
  { group: "left", id: "orbitalParams", label: "Orbital Parameters" },
  { group: "left", id: "spaceWeather", label: "Space Weather" },
  { group: "left", id: "passPrediction", label: "Pass Predictions" },
  // Center column defaults
  { group: "center", id: "liveVideo", label: "Live Video" },
  { group: "center", id: "solarArrays", label: "Solar Arrays" },
  { group: "center", id: "eclss", label: "Life Support (ECLSS)" },
  // Right column defaults
  { group: "right", id: "eventBanner", label: "Active Event" },
  { group: "right", id: "crew", label: "Crew Roster" },
  { group: "right", id: "attitude", label: "Attitude Control" },
  { group: "right", id: "tdrs", label: "TDRS Communications" },
  { group: "right", id: "moduleTemps", label: "Module Temperatures" },
  { group: "right", id: "airlock", label: "Airlock — Quest" },
  { group: "right", id: "upcomingEvents", label: "Upcoming Events" },
  { group: "right", id: "dayNight", label: "Day/Night Cycle" },
  // Full-width
  { group: "timeline", id: "timeline", label: "Crew Timeline" },
] as const;

export type PanelId = (typeof PANEL_DEFINITIONS)[number]["id"];

export function isColumnAssignable(id: PanelId): boolean {
  return id !== "timeline";
}

export function defaultPanelVisibility(): Record<PanelId, boolean> {
  // All visible by default
  return Object.fromEntries(
    PANEL_DEFINITIONS.map((p) => [p.id, true])
  ) as Record<PanelId, boolean>;
}

export function defaultPanelColumns(): Record<PanelId, PanelColumn> {
  return Object.fromEntries(
    PANEL_DEFINITIONS.map((p) => [
      p.id,
      p.group === "timeline" ? "left" : (p.group as PanelColumn),
    ])
  ) as Record<PanelId, PanelColumn>;
}
