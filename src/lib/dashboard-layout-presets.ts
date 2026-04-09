import {
  PanelId,
  PanelColumn,
  defaultPanelVisibility,
  defaultPanelColumns,
} from "@/lib/panel-visibility";

export interface DashboardLayoutSnapshot {
  panelVisibility: Record<PanelId, boolean>;
  panelColumns: Record<PanelId, PanelColumn>;
}

export interface PresetEntry {
  id: string;
  name: string;
  snapshot: DashboardLayoutSnapshot;
}

export interface StoredPresetsState {
  activePresetId: string;
  presets: PresetEntry[];
}

export const STORAGE_KEY = "iss-dashboard-layout-presets";

const DEFAULT_PRESET_ID = "default";

function defaultSnapshot(): DashboardLayoutSnapshot {
  return {
    panelVisibility: defaultPanelVisibility(),
    panelColumns: defaultPanelColumns(),
  };
}

function defaultState(): StoredPresetsState {
  return {
    activePresetId: DEFAULT_PRESET_ID,
    presets: [
      {
        id: DEFAULT_PRESET_ID,
        name: "Default",
        snapshot: defaultSnapshot(),
      },
    ],
  };
}

export function normalizeSnapshot(
  snapshot: Partial<DashboardLayoutSnapshot>
): DashboardLayoutSnapshot {
  const defVis = defaultPanelVisibility();
  const defCols = defaultPanelColumns();

  const panelVisibility = { ...defVis, ...snapshot.panelVisibility } as Record<
    PanelId,
    boolean
  >;
  const panelColumns = { ...defCols, ...snapshot.panelColumns } as Record<
    PanelId,
    PanelColumn
  >;

  return { panelVisibility, panelColumns };
}

export function parseStoredPresetsState(raw: unknown): StoredPresetsState {
  if (!raw || typeof raw !== "object") return defaultState();

  const obj = raw as Record<string, unknown>;

  const activePresetId =
    typeof obj.activePresetId === "string"
      ? obj.activePresetId
      : DEFAULT_PRESET_ID;

  const rawPresets = Array.isArray(obj.presets) ? obj.presets : [];

  const presets: PresetEntry[] = rawPresets
    .filter(
      (p): p is Record<string, unknown> => !!p && typeof p === "object"
    )
    .map((p) => ({
      id: typeof p.id === "string" ? p.id : crypto.randomUUID(),
      name: typeof p.name === "string" ? p.name : "Unnamed",
      snapshot: normalizeSnapshot(
        (p.snapshot as Partial<DashboardLayoutSnapshot>) ?? {}
      ),
    }));

  // Always ensure the default preset exists
  if (!presets.find((p) => p.id === DEFAULT_PRESET_ID)) {
    presets.unshift({
      id: DEFAULT_PRESET_ID,
      name: "Default",
      snapshot: defaultSnapshot(),
    });
  }

  return { activePresetId, presets };
}

export function readStoredPresetsState(): StoredPresetsState {
  if (typeof window === "undefined") return defaultState();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    return parseStoredPresetsState(JSON.parse(raw));
  } catch {
    return defaultState();
  }
}

export function writeStoredPresetsState(state: StoredPresetsState): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore quota errors
  }
}

export function getSnapshotForPresetId(
  state: StoredPresetsState,
  presetId: string
): DashboardLayoutSnapshot {
  const preset = state.presets.find((p) => p.id === presetId);
  return preset ? preset.snapshot : defaultSnapshot();
}

export function saveNewPreset(
  state: StoredPresetsState,
  name: string,
  snapshot: DashboardLayoutSnapshot
): StoredPresetsState {
  const id = crypto.randomUUID();
  const newPreset: PresetEntry = { id, name: name.trim() || "Unnamed", snapshot };
  const presets = [...state.presets, newPreset];
  return { activePresetId: id, presets };
}

export function deletePreset(
  state: StoredPresetsState,
  presetId: string
): StoredPresetsState {
  // Cannot delete the default preset
  if (presetId === DEFAULT_PRESET_ID) return state;

  const presets = state.presets.filter((p) => p.id !== presetId);
  const activePresetId =
    state.activePresetId === presetId ? DEFAULT_PRESET_ID : state.activePresetId;

  return { activePresetId, presets };
}

export function setActivePresetId(
  state: StoredPresetsState,
  presetId: string
): StoredPresetsState {
  if (!state.presets.find((p) => p.id === presetId)) return state;
  return { ...state, activePresetId: presetId };
}
