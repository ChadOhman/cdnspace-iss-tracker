"use client";

import { useState } from "react";
import Modal from "@/components/shared/Modal";
import {
  PANEL_DEFINITIONS,
  PanelId,
  PanelColumn,
  isColumnAssignable,
} from "@/lib/panel-visibility";

interface PanelVisibilityModalProps {
  isOpen: boolean;
  onClose: () => void;
  activePresetId: string;
  presetOptions: { id: string; name: string }[];
  onPresetChange: (presetId: string) => void;
  onSavePreset: (name: string) => boolean;
  onDeletePreset: () => void;
  visibility: Record<PanelId, boolean>;
  onToggle: (id: PanelId, visible: boolean) => void;
  columns: Record<PanelId, PanelColumn>;
  onColumnChange: (id: PanelId, col: PanelColumn) => void;
}

const COLUMN_LABELS: { value: PanelColumn; label: string }[] = [
  { value: "left", label: "L" },
  { value: "center", label: "C" },
  { value: "right", label: "R" },
];

const GROUP_LABELS: Record<string, string> = {
  left: "Left Column",
  center: "Center Column",
  right: "Right Column",
  timeline: "Full-Width",
};

export default function PanelVisibilityModal({
  isOpen,
  onClose,
  activePresetId,
  presetOptions,
  onPresetChange,
  onSavePreset,
  onDeletePreset,
  visibility,
  onToggle,
  columns,
  onColumnChange,
}: PanelVisibilityModalProps) {
  const [newPresetName, setNewPresetName] = useState("");
  const [saveError, setSaveError] = useState("");

  const isDefaultPreset = activePresetId === "default";

  function handleSave() {
    const trimmed = newPresetName.trim();
    if (!trimmed) {
      setSaveError("Enter a preset name.");
      return;
    }
    const ok = onSavePreset(trimmed);
    if (ok) {
      setNewPresetName("");
      setSaveError("");
    } else {
      setSaveError("Could not save preset.");
    }
  }

  // Group panels by their default group
  const groups = ["left", "center", "right", "timeline"] as const;

  const panelsByGroup = groups.map((group) => ({
    group,
    panels: PANEL_DEFINITIONS.filter((p) => p.group === group),
  }));

  const labelStyle: React.CSSProperties = {
    fontSize: "0.7rem",
    fontWeight: 600,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: "var(--color-text-muted, #888)",
    marginBottom: "6px",
    marginTop: "14px",
  };

  const sectionStyle: React.CSSProperties = {
    borderBottom: "1px solid var(--color-border-accent, #333)",
    paddingBottom: "12px",
    marginBottom: "4px",
  };

  const rowStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "4px 0",
  };

  const panelLabelStyle: React.CSSProperties = {
    flex: 1,
    fontSize: "0.85rem",
    color: "var(--color-text-primary, #e0e0e0)",
  };

  const radioGroupStyle: React.CSSProperties = {
    display: "flex",
    gap: "4px",
    marginLeft: "auto",
  };

  return (
    <Modal title="Panel Customization" isOpen={isOpen} onClose={onClose} maxWidth="560px">
      {/* Presets section */}
      <div style={sectionStyle}>
        <div style={labelStyle}>Layout Presets</div>

        {/* Preset selector */}
        <div className="preset-controls-row" style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "8px" }}>
          <select
            value={activePresetId}
            onChange={(e) => onPresetChange(e.target.value)}
            style={{
              flex: 1,
              background: "var(--color-bg-input, #111)",
              border: "1px solid var(--color-border-accent, #444)",
              borderRadius: "4px",
              color: "inherit",
              padding: "4px 8px",
              fontSize: "0.85rem",
            }}
          >
            {presetOptions.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <button
            onClick={onDeletePreset}
            disabled={isDefaultPreset}
            title={isDefaultPreset ? "Cannot delete the default preset" : "Delete preset"}
            style={{
              background: isDefaultPreset ? "transparent" : "var(--color-bg-danger, #3a1a1a)",
              border: "1px solid var(--color-border-danger, #6b2222)",
              borderRadius: "4px",
              color: isDefaultPreset ? "var(--color-text-muted, #555)" : "var(--color-text-danger, #f08080)",
              padding: "4px 10px",
              fontSize: "0.8rem",
              cursor: isDefaultPreset ? "not-allowed" : "pointer",
              opacity: isDefaultPreset ? 0.5 : 1,
            }}
          >
            Delete
          </button>
        </div>

        {/* Save new preset */}
        <div className="preset-controls-row" style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <input
            type="text"
            value={newPresetName}
            onChange={(e) => {
              setNewPresetName(e.target.value);
              if (saveError) setSaveError("");
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSave();
            }}
            placeholder="New preset name…"
            style={{
              flex: 1,
              background: "var(--color-bg-input, #111)",
              border: "1px solid var(--color-border-accent, #444)",
              borderRadius: "4px",
              color: "inherit",
              padding: "4px 8px",
              fontSize: "0.85rem",
            }}
          />
          <button
            onClick={handleSave}
            style={{
              background: "var(--color-bg-accent, #1a2a3a)",
              border: "1px solid var(--color-border-active, #2255aa)",
              borderRadius: "4px",
              color: "var(--color-text-accent, #7ab4f5)",
              padding: "4px 12px",
              fontSize: "0.8rem",
              cursor: "pointer",
            }}
          >
            Save
          </button>
        </div>
        {saveError && (
          <div style={{ color: "var(--color-text-danger, #f08080)", fontSize: "0.75rem", marginTop: "4px" }}>
            {saveError}
          </div>
        )}
      </div>

      {/* Panels section */}
      <div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr auto",
            alignItems: "center",
            paddingBottom: "4px",
            borderBottom: "1px solid var(--color-border-accent, #333)",
            marginBottom: "4px",
          }}
        >
          <span style={{ fontSize: "0.7rem", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--color-text-muted, #888)" }}>
            Panel
          </span>
          <span
            style={{
              fontSize: "0.7rem",
              fontWeight: 600,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "var(--color-text-muted, #888)",
              paddingRight: "2px",
            }}
          >
            Column
          </span>
        </div>

        {panelsByGroup.map(({ group, panels }) => (
          <div key={group}>
            <div style={{ ...labelStyle, marginTop: "10px" }}>{GROUP_LABELS[group]}</div>
            {panels.map((panel) => {
              const id = panel.id as PanelId;
              const assignable = isColumnAssignable(id);
              return (
                <div key={id} className="panel-row" style={rowStyle}>
                  <input
                    type="checkbox"
                    id={`panel-vis-${id}`}
                    checked={visibility[id]}
                    onChange={(e) => onToggle(id, e.target.checked)}
                    style={{ cursor: "pointer", accentColor: "var(--color-accent, #2255aa)" }}
                  />
                  <label
                    htmlFor={`panel-vis-${id}`}
                    style={{
                      ...panelLabelStyle,
                      cursor: "pointer",
                      opacity: visibility[id] ? 1 : 0.5,
                    }}
                  >
                    {panel.label}
                  </label>
                  <div style={radioGroupStyle}>
                    {assignable ? (
                      COLUMN_LABELS.map(({ value, label }) => (
                        <label
                          key={value}
                          title={`Move to ${value} column`}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            width: "26px",
                            height: "22px",
                            borderRadius: "3px",
                            border: "1px solid",
                            borderColor:
                              columns[id] === value
                                ? "var(--color-border-active, #2255aa)"
                                : "var(--color-border-accent, #444)",
                            background:
                              columns[id] === value
                                ? "var(--color-bg-accent, #1a2a3a)"
                                : "transparent",
                            color:
                              columns[id] === value
                                ? "var(--color-text-accent, #7ab4f5)"
                                : "var(--color-text-muted, #666)",
                            fontSize: "0.7rem",
                            fontWeight: 600,
                            cursor: "pointer",
                            userSelect: "none",
                          }}
                        >
                          <input
                            type="radio"
                            name={`col-${id}`}
                            value={value}
                            checked={columns[id] === value}
                            onChange={() => onColumnChange(id, value)}
                            style={{ display: "none" }}
                          />
                          {label}
                        </label>
                      ))
                    ) : (
                      <span
                        style={{
                          fontSize: "0.7rem",
                          color: "var(--color-text-muted, #555)",
                          fontStyle: "italic",
                          width: "86px",
                          textAlign: "right",
                        }}
                      >
                        full-width
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </Modal>
  );
}
