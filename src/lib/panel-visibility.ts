export type PanelColumn = "left" | "center" | "right";

export const PANEL_DEFINITIONS = [
  // Full-width
  { group: "timeline", id: "timeline", label: "Crew Timeline" },

  // Left column — Where is the ISS? (navigation & environment)
  { group: "left", id: "groundTrack", label: "Ground Track" },
  { group: "left", id: "orbitalParams", label: "Orbital Parameters" },
  { group: "left", id: "dayNight", label: "Day/Night Cycle" },
  { group: "left", id: "passPrediction", label: "Pass Predictions" },

  // Center column — What's happening? (crew & media)
  { group: "center", id: "liveVideo", label: "Live Video" },
  { group: "center", id: "crew", label: "Crew Roster" },
  { group: "center", id: "upcomingEvents", label: "Upcoming Events" },
  { group: "center", id: "spaceWeather", label: "Space Weather" },

  // Right column — How are the systems? (engineering telemetry)
  { group: "right", id: "eventBanner", label: "Active Event" },
  { group: "right", id: "solarArrays", label: "Solar Arrays" },
  { group: "right", id: "eclss", label: "Life Support (ECLSS)" },
  { group: "right", id: "attitude", label: "Attitude Control" },
  { group: "right", id: "moduleTemps", label: "Module Temperatures" },
  { group: "right", id: "tdrs", label: "TDRS Communications" },
  { group: "right", id: "airlock", label: "Airlock — Quest" },
  { group: "right", id: "russianSegment", label: "Russian Segment" },
] as const;

export type PanelId = (typeof PANEL_DEFINITIONS)[number]["id"];

export function isColumnAssignable(id: PanelId): boolean {
  return id !== "timeline";
}

// Panels hidden by default (available via panel customization modal)
const DEFAULT_HIDDEN: PanelId[] = ["crew"];

export function defaultPanelVisibility(): Record<PanelId, boolean> {
  return Object.fromEntries(
    PANEL_DEFINITIONS.map((p) => [p.id, !DEFAULT_HIDDEN.includes(p.id as PanelId)])
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
