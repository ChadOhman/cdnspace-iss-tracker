"use client";

import { useState } from "react";
import PanelFrame from "@/components/shared/PanelFrame";
import { useLocale } from "@/context/LocaleContext";

// NASA ISS live stream YouTube IDs
const STREAMS = {
  external: "xAieE-QtOeM",
  internal: "P9C25Un7xaM",
} as const;

type Camera = keyof typeof STREAMS;

export default function LiveVideoPanel() {
  const { t } = useLocale();
  const [camera, setCamera] = useState<Camera>("external");

  const cameraToggle = (
    <div style={{ display: "flex", gap: 4 }}>
      {(Object.keys(STREAMS) as Camera[]).map((cam) => (
        <button
          key={cam}
          onClick={() => setCamera(cam)}
          style={{
            padding: "1px 7px",
            borderRadius: 3,
            border:
              camera === cam
                ? "1px solid var(--color-accent-red)"
                : "1px solid var(--color-border-accent)",
            background:
              camera === cam ? "rgba(255,61,61,0.15)" : "transparent",
            color:
              camera === cam
                ? "var(--color-accent-red)"
                : "var(--color-text-muted)",
            cursor: "pointer",
            fontSize: 9,
            fontFamily: "inherit",
            textTransform: "capitalize",
          }}
        >
          {cam}
        </button>
      ))}
    </div>
  );

  return (
    <PanelFrame
      title={t("panels.liveVideo").toUpperCase()}
      icon="🔴"
      accentColor="var(--color-accent-red)"
      headerRight={cameraToggle}
      bodyClassName=""
    >
      <div style={{ position: "relative", paddingBottom: "56.25%", height: 0 }}>
        <iframe
          key={camera}
          src={`https://www.youtube.com/embed/${STREAMS[camera]}?autoplay=1&mute=1&controls=1&rel=0`}
          title={`NASA ISS Live — ${camera} camera`}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            border: "none",
            borderRadius: "0 0 4px 4px",
          }}
        />
      </div>
    </PanelFrame>
  );
}
