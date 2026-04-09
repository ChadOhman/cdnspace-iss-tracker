"use client";

import { useState, useEffect, useRef } from "react";
import { useTime } from "@/context/TimeContext";
import type { Snapshot } from "@/lib/types";

const DEBOUNCE_MS = 1000;

export function useSimTelemetry(): Snapshot | null {
  const { mode, currentTime } = useTime();
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const unmountedRef = useRef(false);

  useEffect(() => {
    unmountedRef.current = false;
    return () => {
      unmountedRef.current = true;
    };
  }, []);

  useEffect(() => {
    if (mode !== "SIM") {
      setSnapshot(null);
      return;
    }

    // Debounce: wait DEBOUNCE_MS before actually fetching
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(() => {
      const timestamp = currentTime.toISOString();
      fetch(`/api/snapshot?timestamp=${encodeURIComponent(timestamp)}`)
        .then((res) => {
          if (!res.ok) return null;
          return res.json() as Promise<Snapshot>;
        })
        .then((data) => {
          if (!unmountedRef.current) {
            setSnapshot(data);
          }
        })
        .catch(() => {
          // swallow errors — SIM mode is best-effort
        });
    }, DEBOUNCE_MS);

    return () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [mode, currentTime]);

  return snapshot;
}
