"use client";

import { memo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Modal } from "@/components/shared/Modal";
import { useTime } from "@/context/TimeContext";
import { useLocale } from "@/context/LocaleContext";
import { useUnits } from "@/context/UnitsContext";
import { useEvent } from "@/context/EventContext";
import { PLAYBACK_SPEEDS } from "@/lib/constants";
import type { PlaybackSpeed } from "@/lib/types";

const NAV_LINKS = [
  { href: "/track", label: "TRACK" },
  { href: "/stats", label: "STATS" },
  { href: "/api-docs", label: "API" },
] as const;

function BottomBarInner() {
  const { mode, setMode, playbackSpeed, setPlaybackSpeed } = useTime();
  const { locale, setLocale } = useLocale();
  const { units, setUnits } = useUnits();
  const { isEventMode } = useEvent();
  const pathname = usePathname();
  const [creditsOpen, setCreditsOpen] = useState(false);

  const isLive = mode === "LIVE";
  const isSim = mode === "SIM";

  return (
    <div
      className="dashboard-bottombar"
      style={{
        gridArea: "bottombar",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 16px",
        background: "var(--color-bg-panel)",
        borderTop: "1px solid var(--color-border-accent)",
        fontSize: 10,
        color: "var(--color-text-muted)",
        gap: 12,
      }}
    >
      {/* Left side: playback controls */}
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        {/* LIVE button */}
        <button
          onClick={() => setMode("LIVE")}
          style={{
            padding: "2px 8px",
            borderRadius: 3,
            border: isLive
              ? "1px solid var(--color-accent-green)"
              : "1px solid var(--color-border-accent)",
            background: isLive ? "rgba(0,255,136,0.15)" : "transparent",
            color: isLive ? "var(--color-accent-green)" : "var(--color-text-muted)",
            cursor: "pointer",
            fontSize: 10,
            fontFamily: "inherit",
            fontWeight: isLive ? 700 : 400,
            letterSpacing: "0.05em",
          }}
        >
          {isLive && (
            <span
              className="animate-pulse-live"
              style={{
                display: "inline-block",
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "var(--color-accent-green)",
                marginRight: 4,
                verticalAlign: "middle",
              }}
            />
          )}
          LIVE
        </button>

        {/* SIM button */}
        <button
          onClick={() => setMode("SIM")}
          style={{
            padding: "2px 8px",
            borderRadius: 3,
            border: isSim
              ? "1px solid var(--color-accent-cyan)"
              : "1px solid var(--color-border-accent)",
            background: isSim ? "rgba(0,229,255,0.15)" : "transparent",
            color: isSim ? "var(--color-accent-cyan)" : "var(--color-text-muted)",
            cursor: "pointer",
            fontSize: 10,
            fontFamily: "inherit",
            fontWeight: isSim ? 700 : 400,
            letterSpacing: "0.05em",
          }}
        >
          SIM
        </button>

        {/* Speed pills — only visible in SIM mode */}
        {isSim && (
          <div style={{ display: "flex", alignItems: "center", gap: 3, marginLeft: 4 }}>
            {PLAYBACK_SPEEDS.map((speed) => (
              <button
                key={speed}
                onClick={() => setPlaybackSpeed(speed as PlaybackSpeed)}
                style={{
                  padding: "2px 6px",
                  borderRadius: 3,
                  border:
                    playbackSpeed === speed
                      ? "1px solid var(--color-accent-cyan)"
                      : "1px solid var(--color-border-subtle)",
                  background:
                    playbackSpeed === speed
                      ? "rgba(0,229,255,0.15)"
                      : "transparent",
                  color:
                    playbackSpeed === speed
                      ? "var(--color-accent-cyan)"
                      : "var(--color-text-muted)",
                  cursor: "pointer",
                  fontSize: 10,
                  fontFamily: "inherit",
                }}
              >
                {speed}x
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Center: page navigation links */}
      <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
        {NAV_LINKS.map(({ href, label }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              style={{
                padding: "2px 7px",
                borderRadius: 3,
                border: active
                  ? "1px solid rgba(0,229,255,0.35)"
                  : "1px solid transparent",
                background: active ? "rgba(0,229,255,0.08)" : "transparent",
                color: active ? "var(--color-accent-cyan)" : "var(--color-text-muted)",
                fontSize: 10,
                fontFamily: "inherit",
                letterSpacing: "0.05em",
                textDecoration: "none",
                transition: "color 0.15s, border-color 0.15s",
              }}
              onMouseEnter={(e) => {
                if (!active) {
                  (e.currentTarget as HTMLAnchorElement).style.color = "var(--color-accent-cyan)";
                }
              }}
              onMouseLeave={(e) => {
                if (!active) {
                  (e.currentTarget as HTMLAnchorElement).style.color = "var(--color-text-muted)";
                }
              }}
            >
              {label}
            </Link>
          );
        })}

        {/* LIVE link — only shown during active events, styled prominently */}
        {isEventMode && (
          <Link
            href="/live"
            style={{
              padding: "2px 8px",
              borderRadius: 3,
              border: pathname === "/live"
                ? "1px solid var(--color-accent-red)"
                : "1px solid rgba(255,61,61,0.4)",
              background: pathname === "/live"
                ? "rgba(255,61,61,0.15)"
                : "rgba(255,61,61,0.08)",
              color: "var(--color-accent-red)",
              fontSize: 10,
              fontFamily: "inherit",
              fontWeight: 700,
              letterSpacing: "0.05em",
              textDecoration: "none",
              display: "flex",
              alignItems: "center",
              gap: 4,
              animation: "pulse-live 2s ease-in-out infinite",
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "var(--color-accent-red)",
              }}
            />
            LIVE EVENT
          </Link>
        )}
      </div>

      {/* Right side: language toggle + site name */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {/* Unit system toggle */}
        <div style={{ display: "flex", gap: 2 }}>
          <button
            onClick={() => setUnits("metric")}
            style={{
              padding: "2px 6px",
              borderRadius: "3px 0 0 3px",
              border: units === "metric"
                ? "1px solid var(--color-accent-cyan)"
                : "1px solid var(--color-border-accent)",
              background: units === "metric" ? "rgba(0,229,255,0.15)" : "transparent",
              color: units === "metric" ? "var(--color-accent-cyan)" : "var(--color-text-muted)",
              cursor: "pointer",
              fontSize: 10,
              fontFamily: "inherit",
              fontWeight: units === "metric" ? 700 : 400,
            }}
          >
            METRIC
          </button>
          <button
            onClick={() => setUnits("imperial")}
            style={{
              padding: "2px 6px",
              borderRadius: "0 3px 3px 0",
              border: units === "imperial"
                ? "1px solid var(--color-accent-orange)"
                : "1px solid var(--color-border-accent)",
              borderLeft: "none",
              background: units === "imperial" ? "rgba(255,140,0,0.15)" : "transparent",
              color: units === "imperial" ? "var(--color-accent-orange)" : "var(--color-text-muted)",
              cursor: "pointer",
              fontSize: 10,
              fontFamily: "inherit",
              fontWeight: units === "imperial" ? 700 : 400,
            }}
          >
            IMPERIAL
          </button>
        </div>
        {/* Language toggle */}
        <button
          onClick={() => setLocale(locale === "en" ? "fr" : "en")}
          style={{
            padding: "2px 8px",
            borderRadius: 3,
            border: "1px solid var(--color-border-accent)",
            background: "transparent",
            color: "var(--color-text-muted)",
            cursor: "pointer",
            fontSize: 10,
            fontFamily: "inherit",
            letterSpacing: "0.05em",
          }}
        >
          {locale === "en" ? "FR" : "EN"}
        </button>
        <button
          onClick={() => setCreditsOpen(true)}
          style={{
            background: "none",
            border: "none",
            color: "var(--color-text-muted)",
            cursor: "pointer",
            fontSize: 10,
            fontFamily: "inherit",
            letterSpacing: "0.02em",
            padding: 0,
          }}
        >
          Credits
        </button>
        <span style={{ color: "var(--color-text-muted)", letterSpacing: "0.02em" }}>
          iss.cdnspace.ca
        </span>
        <span style={{ color: "var(--color-border-accent)", fontSize: 9, letterSpacing: "0.02em", opacity: 0.5 }}>
          {process.env.NEXT_PUBLIC_BUILD_ID ?? ""}
        </span>
      </div>

      {/* Credits Modal */}
      <Modal title="Credits & Acknowledgements" isOpen={creditsOpen} onClose={() => setCreditsOpen(false)} maxWidth="600px">
        <div style={{ fontSize: 12, lineHeight: 1.8, color: "var(--text-primary, #e8f0fe)" }}>
          <p style={{ marginBottom: 16 }}>
            <strong style={{ color: "var(--color-accent-cyan, #00e5ff)" }}>ISS Tracker</strong> is an open-source real-time dashboard for the International Space Station.
          </p>

          <h3 style={{ color: "var(--color-accent-cyan, #00e5ff)", fontSize: 11, letterSpacing: "0.1em", marginBottom: 8 }}>BUILT BY</h3>
          <p style={{ marginBottom: 16 }}>
            <a href="https://github.com/ChadOhman" target="_blank" rel="noopener noreferrer" style={{ color: "var(--color-accent-cyan, #00e5ff)", textDecoration: "none" }}>Chad Ohman</a>
            {" "}— Edmonton, Alberta, Canada
          </p>

          <h3 style={{ color: "var(--color-accent-cyan, #00e5ff)", fontSize: 11, letterSpacing: "0.1em", marginBottom: 8 }}>DATA SOURCES</h3>
          <ul style={{ paddingLeft: 20, marginBottom: 16 }}>
            <li><strong>NASA Lightstreamer</strong> — live ISS telemetry (~175 channels) via <code style={{ fontSize: 10, color: "var(--color-accent-cyan, #00e5ff)" }}>push.lightstreamer.com</code></li>
            <li><strong>CelesTrak / TLE.ivanstanojevic.me</strong> — ISS Two-Line Elements for orbital propagation</li>
            <li><strong>NOAA Space Weather Prediction Center</strong> — Kp index, X-ray flux, proton flux</li>
            <li><strong>The Space Devs</strong> — upcoming ISS events (dockings, EVAs, maneuvers)</li>
            <li><strong>satellite.js</strong> — SGP4 orbital propagation</li>
          </ul>

          <h3 style={{ color: "var(--color-accent-cyan, #00e5ff)", fontSize: 11, letterSpacing: "0.1em", marginBottom: 8 }}>TECHNOLOGY</h3>
          <ul style={{ paddingLeft: 20, marginBottom: 16 }}>
            <li>Next.js 16, TypeScript, React 19</li>
            <li>Leaflet (maps), Three.js (viz), Tailwind CSS 4</li>
            <li>MySQL (telemetry archive), Server-Sent Events</li>
          </ul>

          <h3 style={{ color: "var(--color-accent-cyan, #00e5ff)", fontSize: 11, letterSpacing: "0.1em", marginBottom: 8 }}>COMPANION PROJECT</h3>
          <p style={{ marginBottom: 16 }}>
            <a href="https://artemis.cdnspace.ca" target="_blank" rel="noopener noreferrer" style={{ color: "var(--color-accent-cyan, #00e5ff)", textDecoration: "none" }}>Artemis II Tracker</a>
            {" "}— real-time mission control dashboard for NASA&apos;s Artemis II lunar mission
          </p>

          <h3 style={{ color: "var(--color-accent-cyan, #00e5ff)", fontSize: 11, letterSpacing: "0.1em", marginBottom: 8 }}>SOURCE CODE</h3>
          <p style={{ marginBottom: 16 }}>
            <a href="https://github.com/ChadOhman/cdnspace-iss-tracker" target="_blank" rel="noopener noreferrer" style={{ color: "var(--color-accent-cyan, #00e5ff)", textDecoration: "none" }}>github.com/ChadOhman/cdnspace-iss-tracker</a>
            {" "}— MIT License
          </p>

          <h3 style={{ color: "var(--color-accent-cyan, #00e5ff)", fontSize: 11, letterSpacing: "0.1em", marginBottom: 8 }}>LAND ACKNOWLEDGEMENT</h3>
          <p style={{ fontSize: 11, color: "var(--color-text-muted, #94adc4)" }}>
            This project was created on Treaty 6 territory, the traditional lands of the Cree, Dene, Blackfoot, Saulteaux, Nakota Sioux, and Métis peoples — Edmonton, Alberta, Canada.
          </p>
        </div>
      </Modal>
    </div>
  );
}

export const BottomBar = memo(BottomBarInner);
