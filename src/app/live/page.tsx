"use client";

import Link from "next/link";
import { useTelemetryStream } from "@/hooks/useTelemetryStream";
import { useLocale } from "@/context/LocaleContext";

export default function LivePage() {
  const { t } = useLocale();
  const { activeEvent, connected } = useTelemetryStream();

  return (
    <div style={{
      width: "100vw",
      minHeight: "100vh",
      background: "#0a0e14",
      display: "flex",
      flexDirection: "column",
      fontFamily: "var(--font-jetbrains-mono)",
    }}>
      {/* Header */}
      <div style={{
        height: 48,
        background: "rgba(0,0,0,0.6)",
        borderBottom: "1px solid rgba(0,229,255,0.2)",
        display: "flex",
        alignItems: "center",
        padding: "0 16px",
        gap: 16,
        flexShrink: 0,
      }}>
        <Link href="/" style={{
          color: "#00e5ff",
          textDecoration: "none",
          fontSize: 11,
          letterSpacing: "0.05em",
          border: "1px solid rgba(0,229,255,0.3)",
          padding: "2px 8px",
          borderRadius: 3,
        }}>
          &larr; {t("pages.dashboard")}
        </Link>
        <span style={{ color: "#00e5ff", fontSize: 13, letterSpacing: "0.1em" }}>
          {t("pages.liveVideo")}
        </span>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{
            width: 6, height: 6, borderRadius: "50%",
            background: connected ? "#00ff88" : "#ff3d3d",
            boxShadow: connected ? "0 0 6px #00ff88" : "none",
          }} />
          <span style={{ color: "#8892a4", fontSize: 10 }}>
            {connected ? t("pages.connected") : t("pages.offline")}
          </span>
        </div>
      </div>

      {/* Main content */}
      <div style={{
        flex: 1,
        display: "flex",
        gap: 0,
        padding: 0,
        overflow: "hidden",
      }}>
        {/* YouTube iframe — main area */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: 16 }}>
          <div style={{ fontSize: 10, color: "#8892a4", letterSpacing: "0.08em", marginBottom: 8 }}>
            {t("pages.nasaLiveStream")}
          </div>
          <div style={{ flex: 1, borderRadius: 6, overflow: "hidden", border: "1px solid rgba(0,229,255,0.15)", minHeight: 400 }}>
            <iframe
              src="https://www.youtube.com/embed/P9C25Un7xaM?autoplay=1&mute=1&modestbranding=1&rel=0"
              title="NASA ISS Live Stream"
              style={{ width: "100%", height: "100%", minHeight: 400, border: "none", display: "block" }}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
          <div style={{ marginTop: 8, fontSize: 9, color: "#4a5568", letterSpacing: "0.06em" }}>
            {t("pages.streamCourtesy")}
          </div>
        </div>

        {/* Event context sidebar */}
        <div style={{
          width: 280,
          borderLeft: "1px solid rgba(0,229,255,0.1)",
          padding: "16px 14px",
          display: "flex",
          flexDirection: "column",
          gap: 12,
          background: "rgba(0,0,0,0.3)",
        }}>
          <div style={{ fontSize: 10, color: "#00e5ff", letterSpacing: "0.1em", borderBottom: "1px solid rgba(0,229,255,0.15)", paddingBottom: 6 }}>
            {t("pages.currentEvent")}
          </div>

          {activeEvent ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{
                background: "rgba(0,229,255,0.08)",
                border: "1px solid rgba(0,229,255,0.2)",
                borderRadius: 4,
                padding: "8px 10px",
              }}>
                <div style={{ fontSize: 9, color: "#00e5ff", letterSpacing: "0.08em", marginBottom: 4 }}>
                  {activeEvent.type?.toUpperCase() ?? "EVENT"}
                </div>
                <div style={{ fontSize: 12, color: "#e2e8f0", fontWeight: 600, marginBottom: 4 }}>
                  {activeEvent.title}
                </div>
                {activeEvent.description && (
                  <div style={{ fontSize: 10, color: "#8892a4", lineHeight: 1.5 }}>
                    {activeEvent.description}
                  </div>
                )}
              </div>
              {activeEvent.scheduledStart && (
                <div style={{ fontSize: 9, color: "#8892a4" }}>
                  {t("pages.start")}: {new Date(activeEvent.scheduledStart).toUTCString()}
                </div>
              )}
              {activeEvent.scheduledEnd && (
                <div style={{ fontSize: 9, color: "#8892a4" }}>
                  {t("pages.end2")}: {new Date(activeEvent.scheduledEnd).toUTCString()}
                </div>
              )}
            </div>
          ) : (
            <div style={{ fontSize: 10, color: "#4a5568", lineHeight: 1.6 }}>
              {t("pages.noActiveEvent")}
            </div>
          )}

          {/* Info section */}
          <div style={{ marginTop: "auto", fontSize: 9, color: "#4a5568", lineHeight: 1.6, borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: 10 }}>
            {t("pages.issOrbitInfo")}
          </div>
        </div>
      </div>
    </div>
  );
}
