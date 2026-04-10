"use client";

import { useEffect } from "react";

const BUILD_ID = process.env.NEXT_PUBLIC_BUILD_ID ?? "";
const BUILD_CHECK_INTERVAL = 60_000;

/**
 * Polls /api/build every 60 seconds. When the server's buildId differs
 * from the client's, saves scroll positions for the given CSS selectors
 * to sessionStorage and reloads the page. On next mount, scroll positions
 * are restored.
 *
 * @param scrollSelectors - CSS selectors of scrollable containers whose
 *   scrollTop should be preserved across the reload. Defaults to the
 *   dashboard columns.
 */
export function useBuildCheck(
  scrollSelectors: string[] = [".col-left", ".col-center", ".col-right"]
) {
  // Restore scroll positions after a build-triggered reload
  useEffect(() => {
    const saved = sessionStorage.getItem("scrollRestore");
    if (saved) {
      sessionStorage.removeItem("scrollRestore");
      try {
        const parsed = JSON.parse(saved) as Record<string, number>;
        requestAnimationFrame(() => {
          for (const [selector, top] of Object.entries(parsed)) {
            const el = document.querySelector(selector) as HTMLElement | null;
            if (el) el.scrollTop = top;
          }
          // Also restore window scroll
          if (parsed.__window !== undefined) {
            window.scrollTo(0, parsed.__window);
          }
        });
      } catch {
        /* ignore malformed */
      }
    }
  }, []);

  // Poll /api/build every 60s, reload if buildId changed
  useEffect(() => {
    if (!BUILD_ID) return;
    const id = setInterval(async () => {
      try {
        const res = await fetch("/api/build");
        const data = await res.json();
        if (data.buildId && data.buildId !== BUILD_ID) {
          // Save scroll state before reloading
          const scrollState: Record<string, number> = {};
          for (const sel of scrollSelectors) {
            const el = document.querySelector(sel) as HTMLElement | null;
            if (el) scrollState[sel] = el.scrollTop;
          }
          scrollState.__window = window.scrollY;
          sessionStorage.setItem("scrollRestore", JSON.stringify(scrollState));
          window.location.reload();
        }
      } catch {
        /* network error — ignore, try again next interval */
      }
    }, BUILD_CHECK_INTERVAL);
    return () => clearInterval(id);
  }, [scrollSelectors]);
}
