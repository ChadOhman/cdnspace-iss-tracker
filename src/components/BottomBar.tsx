"use client";

import { memo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTime } from "@/context/TimeContext";
import { useLocale } from "@/context/LocaleContext";
import { PLAYBACK_SPEEDS } from "@/lib/constants";
import type { PlaybackSpeed } from "@/lib/types";

const NAV_LINKS = [
  { href: "/track", label: "TRACK" },
  { href: "/live", label: "LIVE" },
  { href: "/stats", label: "STATS" },
  { href: "/api-docs", label: "API" },
] as const;

function BottomBarInner() {
  const { mode, setMode, playbackSpeed, setPlaybackSpeed } = useTime();
  const { locale, setLocale } = useLocale();
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
      </div>

      {/* Right side: language toggle + site name */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
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
      </div>
    </div>
  );
}

export const BottomBar = memo(BottomBarInner);
