"use client";

import { useState, useEffect } from "react";
import PanelFrame from "@/components/shared/PanelFrame";
import { useLocale } from "@/context/LocaleContext";

// NASA ISS external camera streams
const STREAMS = [
  { id: "xAieE-QtOeM", label: "Live Earth" },
  { id: "Y1qQFGrgRFo", label: "HD Views" },
  { id: "KGMpMn3bgxw", label: "NASA TV" },
] as const;

export default function LiveVideoPanel() {
  const { t } = useLocale();
  const [activeIdx, setActiveIdx] = useState(0);
  // Cache-buster forces fresh iframe on mount and stream switch
  const [cacheBuster, setCacheBuster] = useState(() => Date.now());

  useEffect(() => {
    setCacheBuster(Date.now());
  }, [activeIdx]);

  const cameraToggle = (
    <div style={{ display: "flex", gap: 3 }}>
      {STREAMS.map((stream, i) => (
        <button
          key={stream.id}
          onClick={() => setActiveIdx(i)}
          style={{
            padding: "1px 6px",
            borderRadius: 3,
            border:
              activeIdx === i
                ? "1px solid var(--color-accent-red)"
                : "1px solid var(--color-border-accent)",
            background:
              activeIdx === i ? "rgba(255,61,61,0.15)" : "transparent",
            color:
              activeIdx === i
                ? "var(--color-accent-red)"
                : "var(--color-text-muted)",
            cursor: "pointer",
            fontSize: 9,
            fontFamily: "inherit",
          }}
        >
          {stream.label}
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
          key={`${STREAMS[activeIdx].id}-${cacheBuster}`}
          src={`https://www.youtube.com/embed/${STREAMS[activeIdx].id}?autoplay=1&mute=1&controls=1&rel=0&_=${cacheBuster}`}
          title={`NASA ISS — ${STREAMS[activeIdx].label}`}
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
