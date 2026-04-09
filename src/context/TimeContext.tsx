"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
  type ReactNode,
} from "react";
import type { PlaybackSpeed } from "@/lib/types";

type TimeMode = "LIVE" | "SIM";
export type ClockFormat = "utc" | "local";

interface TimeContextValue {
  mode: TimeMode;
  setMode: (mode: TimeMode) => void;
  currentTime: Date;
  simTime: Date;
  setSimTime: (time: Date) => void;
  playbackSpeed: PlaybackSpeed;
  setPlaybackSpeed: (speed: PlaybackSpeed) => void;
  jumpTo: (time: Date) => void;
  clockFormat: ClockFormat;
  setClockFormat: (fmt: ClockFormat) => void;
  /** Format a Date to a time string based on current clockFormat */
  formatTime: (date: Date) => string;
  /** Format a Date to a date+time string based on current clockFormat */
  formatDateTime: (date: Date) => string;
  /** Label for the current clock format ("UTC" or timezone abbreviation) */
  clockLabel: string;
}

const TimeContext = createContext<TimeContextValue | null>(null);

export function TimeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<TimeMode>("LIVE");
  const [simTime, setSimTime] = useState<Date>(new Date());
  const [playbackSpeed, setPlaybackSpeed] = useState<PlaybackSpeed>(1);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  const modeRef = useRef(mode);
  const simTimeRef = useRef(simTime);
  const playbackSpeedRef = useRef(playbackSpeed);
  const lastFrameRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const unmountedRef = useRef(false);

  // Keep refs in sync with state
  useEffect(() => { modeRef.current = mode; }, [mode]);
  useEffect(() => { simTimeRef.current = simTime; }, [simTime]);
  useEffect(() => { playbackSpeedRef.current = playbackSpeed; }, [playbackSpeed]);

  useEffect(() => {
    unmountedRef.current = false;

    function tick(now: number) {
      if (unmountedRef.current) return;

      if (modeRef.current === "LIVE") {
        setCurrentTime(new Date());
        lastFrameRef.current = null;
      } else {
        // SIM mode: advance simTime by delta * playbackSpeed
        const speed = playbackSpeedRef.current;
        if (speed > 0 && lastFrameRef.current !== null) {
          const deltaMs = now - lastFrameRef.current;
          const newSimTime = new Date(
            simTimeRef.current.getTime() + deltaMs * speed
          );
          simTimeRef.current = newSimTime;
          setSimTime(newSimTime);
          setCurrentTime(newSimTime);
        } else if (speed === 0) {
          // Paused: keep currentTime synced to simTime without advancing
          setCurrentTime(new Date(simTimeRef.current));
        }
        lastFrameRef.current = now;
      }

      rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      unmountedRef.current = true;
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, []);

  const jumpTo = useCallback((time: Date) => {
    modeRef.current = "SIM";
    simTimeRef.current = time;
    playbackSpeedRef.current = 0;
    lastFrameRef.current = null;
    setMode("SIM");
    setSimTime(time);
    setCurrentTime(time);
    setPlaybackSpeed(0);
  }, []);

  const handleSetMode = useCallback((newMode: TimeMode) => {
    if (newMode === "LIVE") {
      lastFrameRef.current = null;
    }
    modeRef.current = newMode;
    setMode(newMode);
  }, []);

  // Clock format (UTC vs local)
  const [clockFormat, setClockFormat] = useState<ClockFormat>("utc");

  const pad2 = (n: number) => String(n).padStart(2, "0");

  const formatTime = useCallback((date: Date): string => {
    if (clockFormat === "utc") {
      return `${pad2(date.getUTCHours())}:${pad2(date.getUTCMinutes())}:${pad2(date.getUTCSeconds())}`;
    }
    return `${pad2(date.getHours())}:${pad2(date.getMinutes())}:${pad2(date.getSeconds())}`;
  }, [clockFormat]);

  const formatDateTime = useCallback((date: Date): string => {
    if (clockFormat === "utc") {
      return `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}-${pad2(date.getUTCDate())} ${formatTime(date)}`;
    }
    return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())} ${formatTime(date)}`;
  }, [clockFormat, formatTime]);

  const clockLabel = clockFormat === "utc"
    ? "UTC"
    : Intl.DateTimeFormat().resolvedOptions().timeZone.split("/").pop()?.replace(/_/g, " ") ?? "Local";

  return (
    <TimeContext.Provider
      value={{
        mode,
        setMode: handleSetMode,
        currentTime,
        simTime,
        setSimTime,
        playbackSpeed,
        setPlaybackSpeed,
        jumpTo,
        clockFormat,
        setClockFormat,
        formatTime,
        formatDateTime,
        clockLabel,
      }}
    >
      {children}
    </TimeContext.Provider>
  );
}

export function useTime(): TimeContextValue {
  const ctx = useContext(TimeContext);
  if (!ctx) {
    throw new Error("useTime must be used within a TimeProvider");
  }
  return ctx;
}
