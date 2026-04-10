"use client";

import { useRef, useEffect } from "react";

interface SparklineProps {
  metric: string;
  hours?: number;
  color?: string;
  width?: number;
  height?: number;
  showArea?: boolean;
}

interface CacheEntry {
  data: number[];
  ts: number;
}

const cache = new Map<string, CacheEntry>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function hexToRgba(color: string, alpha: number): string {
  // Handle CSS variables by falling back to a default
  if (color.startsWith("var(")) {
    return `rgba(0,220,220,${alpha})`;
  }
  const hex = color.replace("#", "");
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

export default function Sparkline({
  metric,
  hours = 24,
  color = "var(--accent-cyan)",
  width = 48,
  height = 14,
  showArea = true,
}: SparklineProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchAndDraw() {
      const cacheKey = `${metric}:${hours}`;
      const cached = cache.get(cacheKey);
      let data: number[];

      if (cached && Date.now() - cached.ts < CACHE_TTL) {
        data = cached.data;
      } else {
        try {
          const res = await fetch(
            `/api/history?metric=${encodeURIComponent(metric)}&hours=${hours}&points=60`
          );
          if (!res.ok) return;
          const json = await res.json();
          // /api/history returns Array<{timestamp: number, value: number}>;
          // extract the values and drop null/undefined entries so the
          // chart can render correctly.
          const raw: unknown[] = Array.isArray(json)
            ? json
            : Array.isArray((json as { data?: unknown[] })?.data)
              ? ((json as { data: unknown[] }).data)
              : [];
          data = raw
            .map((p) =>
              typeof p === "number"
                ? p
                : typeof (p as { value?: unknown })?.value === "number"
                  ? (p as { value: number }).value
                  : NaN
            )
            .filter((v) => Number.isFinite(v));
          cache.set(cacheKey, { data, ts: Date.now() });
        } catch {
          return;
        }
      }

      if (cancelled || !canvasRef.current || data.length < 2) return;

      const canvas = canvasRef.current;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.scale(dpr, dpr);

      const min = Math.min(...data);
      const max = Math.max(...data);
      const range = max - min || 1;

      const stepX = width / (data.length - 1);

      const points = data.map((v, i) => ({
        x: i * stepX,
        y: height - ((v - min) / range) * (height - 2) - 1,
      }));

      ctx.clearRect(0, 0, width, height);

      if (showArea) {
        ctx.beginPath();
        ctx.moveTo(points[0].x, height);
        points.forEach((p) => ctx.lineTo(p.x, p.y));
        ctx.lineTo(points[points.length - 1].x, height);
        ctx.closePath();
        ctx.fillStyle = hexToRgba(color, 0.25);
        ctx.fill();
      }

      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      points.slice(1).forEach((p) => ctx.lineTo(p.x, p.y));
      ctx.strokeStyle = color.startsWith("var(") ? "rgb(0,220,220)" : color;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    fetchAndDraw();

    return () => {
      cancelled = true;
    };
  }, [metric, hours, color, width, height, showArea]);

  return <canvas ref={canvasRef} width={width} height={height} />;
}
