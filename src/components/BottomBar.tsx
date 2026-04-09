"use client";

import { memo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
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
        <span style={{ color: "var(--color-text-muted)", letterSpacing: "0.02em" }}>
          iss.cdnspace.ca
        </span>
        <span style={{ color: "var(--color-border-accent)", fontSize: 9, letterSpacing: "0.02em", opacity: 0.5 }}>
          {process.env.NEXT_PUBLIC_BUILD_ID ?? ""}
        </span>
      </div>
    </div>
  );
}

export const BottomBar = memo(BottomBarInner);
