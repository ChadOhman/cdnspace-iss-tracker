"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import PanelFrame from "@/components/shared/PanelFrame";
import type { PassPrediction } from "@/lib/types";
import { useLocale } from "@/context/LocaleContext";

type GeoState = "idle" | "requesting" | "granted" | "denied";
type NotifyState = "off" | "requesting" | "on" | "denied";

const NOTIFY_STORAGE_KEY = "passPredictor.notify";
const NOTIFY_LEAD_TIME_MS = 10 * 60 * 1000; // 10 minutes before pass
const NOTIFY_CHECK_INTERVAL_MS = 60 * 1000; // check every minute

interface Coords {
  lat: number;
  lon: number;
}

const MIN_ELEV_OPTIONS = [5, 10, 20] as const;
type MinElev = (typeof MIN_ELEV_OPTIONS)[number];
const MIN_ELEV_STORAGE_KEY = "passPredictor.minElev";
const DEFAULT_MIN_ELEV: MinElev = 10;

function readStoredMinElev(): MinElev {
  if (typeof window === "undefined") return DEFAULT_MIN_ELEV;
  try {
    const raw = window.localStorage.getItem(MIN_ELEV_STORAGE_KEY);
    const parsed = raw ? parseInt(raw, 10) : NaN;
    if ((MIN_ELEV_OPTIONS as readonly number[]).includes(parsed)) {
      return parsed as MinElev;
    }
  } catch {
    // ignore
  }
  return DEFAULT_MIN_ELEV;
}

const QUALITY_COLOR: Record<string, string> = {
  bright: "var(--color-accent-green)",
  good: "var(--color-accent-cyan)",
  fair: "var(--color-accent-orange)",
  poor: "var(--color-text-muted)",
};

function formatTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString("en-CA", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function formatDate(ts: number, tonight: string, tomorrow: string): string {
  const d = new Date(ts);
  const today = new Date();
  const tomorrowDate = new Date(today);
  tomorrowDate.setDate(today.getDate() + 1);

  if (d.toDateString() === today.toDateString()) return tonight;
  if (d.toDateString() === tomorrowDate.toDateString()) return tomorrow;
  return d.toLocaleDateString("en-CA", { month: "short", day: "numeric" });
}

export default function PassPredictionPanel() {
  const { t } = useLocale();
  const [geoState, setGeoState] = useState<GeoState>("idle");
  const [coords, setCoords] = useState<Coords | null>(null);
  const [passes, setPasses] = useState<PassPrediction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [minElev, setMinElev] = useState<MinElev>(DEFAULT_MIN_ELEV);
  const [notifyState, setNotifyState] = useState<NotifyState>("off");
  const notifiedRef = useRef<Set<number>>(new Set());

  // Load saved minElev and notification preference on mount
  useEffect(() => {
    setMinElev(readStoredMinElev());
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(NOTIFY_STORAGE_KEY);
      if (saved === "on" && Notification.permission === "granted") {
        setNotifyState("on");
      }
    }
  }, []);

  const fetchPasses = useCallback(
    async (lat: number, lon: number, minElevDeg: number) => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/passes?lat=${lat}&lon=${lon}&minElev=${minElevDeg}`
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setPasses(Array.isArray(data) ? data.slice(0, 3) : []);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to fetch passes");
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const handleMinElevChange = useCallback(
    (value: MinElev) => {
      setMinElev(value);
      try {
        window.localStorage.setItem(MIN_ELEV_STORAGE_KEY, String(value));
      } catch {
        // ignore
      }
      if (coords) {
        fetchPasses(coords.lat, coords.lon, value);
      }
    },
    [coords, fetchPasses]
  );

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setGeoState("denied");
      return;
    }
    setGeoState("requesting");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const c = { lat: pos.coords.latitude, lon: pos.coords.longitude };
        setCoords(c);
        setGeoState("granted");
        fetchPasses(c.lat, c.lon, minElev);
      },
      () => {
        setGeoState("denied");
      }
    );
  }, [fetchPasses, minElev]);

  useEffect(() => {
    if (coords) {
      fetchPasses(coords.lat, coords.lon, minElev);
    }
  }, [coords, fetchPasses, minElev]);

  // Notification check interval
  useEffect(() => {
    if (notifyState !== "on" || passes.length === 0) return;

    const check = () => {
      const now = Date.now();
      for (const pass of passes) {
        const timeUntil = pass.riseTime - now;
        if (
          timeUntil > 0 &&
          timeUntil <= NOTIFY_LEAD_TIME_MS &&
          !notifiedRef.current.has(pass.riseTime)
        ) {
          notifiedRef.current.add(pass.riseTime);
          const mins = Math.round(timeUntil / 60000);
          new Notification("ISS Pass Alert", {
            body: `ISS passes over your location in ${mins} min — max ${pass.maxElevation.toFixed(0)}° elevation (${pass.quality})`,
            icon: "/ISS_emblem.png",
            tag: `iss-pass-${pass.riseTime}`,
          });
        }
      }
    };

    check();
    const id = setInterval(check, NOTIFY_CHECK_INTERVAL_MS);
    return () => clearInterval(id);
  }, [notifyState, passes]);

  const toggleNotify = useCallback(() => {
    if (notifyState === "on") {
      setNotifyState("off");
      localStorage.setItem(NOTIFY_STORAGE_KEY, "off");
      return;
    }

    if (!("Notification" in window)) {
      setNotifyState("denied");
      return;
    }

    if (Notification.permission === "granted") {
      setNotifyState("on");
      localStorage.setItem(NOTIFY_STORAGE_KEY, "on");
      return;
    }

    setNotifyState("requesting");
    Notification.requestPermission().then((perm) => {
      if (perm === "granted") {
        setNotifyState("on");
        localStorage.setItem(NOTIFY_STORAGE_KEY, "on");
      } else {
        setNotifyState("denied");
      }
    });
  }, [notifyState]);

  const footer = (
    <div
      style={{
        marginTop: 6,
        paddingTop: 6,
        borderTop: "1px solid var(--color-border-subtle)",
        color: "var(--color-text-muted)",
        fontSize: 9,
        display: "flex",
        flexDirection: "column",
        gap: 4,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span>
          {coords ? t("passes.basedOnLocation") : t("passes.enableLocation")}
        </span>
        <button
          onClick={requestLocation}
          style={{
            background: "none",
            border: "none",
            color: "var(--color-accent-cyan)",
            cursor: "pointer",
            fontSize: 9,
            fontFamily: "inherit",
            padding: 0,
          }}
        >
          {coords ? t("passes.change") : t("passes.enable")}
        </button>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span>Pass alerts</span>
        <button
          onClick={toggleNotify}
          style={{
            padding: "1px 6px",
            borderRadius: 2,
            border: `1px solid ${notifyState === "on" ? "var(--color-accent-green)" : "var(--color-border-subtle)"}`,
            background: notifyState === "on" ? "rgba(0,255,136,0.12)" : "transparent",
            color: notifyState === "on" ? "var(--color-accent-green)" : notifyState === "denied" ? "var(--color-accent-red)" : "var(--color-text-muted)",
            cursor: notifyState === "denied" ? "not-allowed" : "pointer",
            fontSize: 9,
            fontFamily: "inherit",
            fontWeight: notifyState === "on" ? 700 : 400,
          }}
          title={
            notifyState === "denied"
              ? "Notifications blocked by browser"
              : notifyState === "on"
                ? "Alerts enabled — you'll be notified 10 min before each pass"
                : "Enable browser notifications for upcoming passes"
          }
          disabled={notifyState === "denied"}
        >
          {notifyState === "on" ? "ON" : notifyState === "denied" ? "BLOCKED" : notifyState === "requesting" ? "..." : "OFF"}
        </button>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span
          style={{ cursor: "help" }}
          title="Minimum elevation threshold for a pass to be listed. 5° catches horizon-skimming passes for urban viewers with open horizons; 10° is the standard visibility cutoff; 20° only shows well-elevated passes worth going outside for."
        >
          Min elevation
        </span>
        <div style={{ display: "flex", gap: 2 }}>
          {MIN_ELEV_OPTIONS.map((opt) => {
            const active = opt === minElev;
            return (
              <button
                key={opt}
                onClick={() => handleMinElevChange(opt)}
                style={{
                  padding: "1px 6px",
                  borderRadius: 2,
                  border: `1px solid ${active ? "var(--color-accent-cyan)" : "var(--color-border-subtle)"}`,
                  background: active ? "rgba(0,229,255,0.12)" : "transparent",
                  color: active ? "var(--color-accent-cyan)" : "var(--color-text-muted)",
                  cursor: "pointer",
                  fontSize: 9,
                  fontFamily: "inherit",
                  fontWeight: active ? 700 : 400,
                }}
              >
                {opt}°
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );

  return (
    <PanelFrame
      title={t("panels.passPredictions").toUpperCase()}
      icon="👁️"
      accentColor="var(--color-accent-cyan)"
    >
      {geoState === "idle" ? (
        <div style={{ textAlign: "center", padding: "12px 0" }}>
          <p style={{ color: "var(--color-text-muted)", fontSize: 10, marginBottom: 8 }}>
            {t("passes.enableLocation")}
          </p>
          <button
            onClick={requestLocation}
            style={{
              padding: "4px 12px",
              borderRadius: 3,
              border: "1px solid var(--color-accent-cyan)",
              background: "rgba(0,229,255,0.1)",
              color: "var(--color-accent-cyan)",
              cursor: "pointer",
              fontSize: 10,
              fontFamily: "inherit",
            }}
          >
            {t("passes.useMyLocation")}
          </button>
        </div>
      ) : geoState === "requesting" ? (
        <div style={{ color: "var(--color-text-muted)", fontSize: 10, textAlign: "center", padding: "12px 0" }}>
          {t("passes.requestingLocation")}
        </div>
      ) : geoState === "denied" ? (
        <div style={{ color: "var(--color-text-muted)", fontSize: 10, textAlign: "center", padding: "12px 0" }}>
          {t("passes.locationDenied")}
        </div>
      ) : loading ? (
        <div style={{ color: "var(--color-text-muted)", fontSize: 10, textAlign: "center", padding: "12px 0" }}>
          {t("passes.loadingPasses")}
        </div>
      ) : error ? (
        <div style={{ color: "var(--color-accent-red)", fontSize: 10, textAlign: "center", padding: "12px 0" }}>
          {error}
        </div>
      ) : passes.length === 0 ? (
        <div style={{ color: "var(--color-text-muted)", fontSize: 10, textAlign: "center", padding: "12px 0" }}>
          {t("passes.noPassesFound")}
        </div>
      ) : (
        <>
          {passes.map((pass, i) => (
            <div
              key={i}
              style={{
                padding: "5px 0",
                borderBottom:
                  i < passes.length - 1
                    ? "1px solid var(--color-border-subtle)"
                    : "none",
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                gap: 4,
                alignItems: "center",
              }}
            >
              <div>
                <div style={{ color: "var(--color-accent-orange)", fontSize: 9 }}>
                  {formatDate(pass.riseTime, t("passes.tonight"), t("passes.tomorrow"))}
                </div>
                <div style={{ color: "var(--color-text-primary)", fontSize: 10 }}>
                  {formatTime(pass.riseTime)}
                </div>
              </div>
              <div>
                <div style={{ color: "var(--color-text-muted)", fontSize: 9 }}>{t("passes.maxElev")}</div>
                <div style={{ color: "var(--color-accent-cyan)", fontSize: 10 }}>
                  {pass.maxElevation.toFixed(0)}°
                </div>
              </div>
              <div style={{ textAlign: "right", display: "flex", alignItems: "center", gap: 6 }}>
                <div>
                  <div
                    style={{
                      color: QUALITY_COLOR[pass.quality] ?? "var(--color-text-muted)",
                      fontSize: 9,
                      textTransform: "uppercase",
                    }}
                  >
                    {t(`passes.${pass.quality}`) ?? pass.quality}
                  </div>
                  <div style={{ color: "var(--color-text-muted)", fontSize: 9 }}>
                    {t("passes.magnitude").toLowerCase()} {pass.magnitude.toFixed(1)}
                  </div>
                </div>
                <button
                  onClick={() => {
                    const dur = Math.round(
                      (pass.setTime - pass.riseTime) / 60000
                    );
                    const url = `${window.location.origin}/?pass=${pass.riseTime}`;
                    if (navigator.share) {
                      navigator.share({
                        title: "ISS Pass Alert",
                        text: `ISS passes over at ${formatTime(pass.riseTime)} — ${pass.maxElevation.toFixed(0)}° max elevation (${pass.quality})`,
                        url,
                      }).catch(() => {});
                    } else {
                      navigator.clipboard.writeText(url).catch(() => {});
                    }
                  }}
                  title="Share this pass"
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--color-text-muted)",
                    cursor: "pointer",
                    fontSize: 12,
                    padding: 2,
                    lineHeight: 1,
                  }}
                >
                  ↗
                </button>
              </div>
            </div>
          ))}
          {footer}
        </>
      )}
    </PanelFrame>
  );
}
