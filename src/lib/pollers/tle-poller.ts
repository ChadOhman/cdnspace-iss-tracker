/**
 * TLE Poller
 *
 * Fetches the ISS Two-Line Element set and caches it in memory.
 * Tries CelesTrak first, falls back to celestrak.org OMM format,
 * then to tle.ivanstanojevic.me as a last resort.
 */

import { CELESTRAK_TLE_URL } from "@/lib/constants";

export interface TleData {
  line1: string;
  line2: string;
}

const USER_AGENT = "ISS-Tracker/1.0 (https://iss.cdnspace.ca; contact@cdnspace.ca)";

/** TLE sources in priority order */
const TLE_SOURCES = [
  CELESTRAK_TLE_URL,
  "https://celestrak.org/NORAD/elements/gp.php?CATNR=25544&FORMAT=TLE",
  "https://tle.ivanstanojevic.me/api/tle/25544",
];

/** In-memory cache of the most-recently fetched TLE. */
let currentTle: TleData | null = null;

/** Returns the cached TLE without triggering a network request. */
export function getCurrentTle(): TleData | null {
  return currentTle;
}

/**
 * Fetch the latest ISS TLE, trying multiple sources.
 * On error, the previous cached value is returned.
 */
export async function pollTle(): Promise<TleData | null> {
  for (const url of TLE_SOURCES) {
    const result = await tryFetchTle(url);
    if (result) {
      currentTle = result;
      console.log(`[tle] Fetched TLE from ${new URL(url).hostname}`);
      return currentTle;
    }
  }

  if (!currentTle) {
    console.error("[tle] All TLE sources failed, no cached TLE available");
  } else {
    console.warn("[tle] All TLE sources failed, using cached TLE");
  }

  return currentTle;
}

async function tryFetchTle(url: string): Promise<TleData | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": USER_AGENT },
    });

    if (!res.ok) {
      console.warn(`[tle] ${new URL(url).hostname} returned ${res.status}`);
      return null;
    }

    const contentType = res.headers.get("content-type") ?? "";
    const text = await res.text();

    // Handle JSON format (tle.ivanstanojevic.me)
    if (contentType.includes("json") || text.trimStart().startsWith("{")) {
      try {
        const json = JSON.parse(text);
        const line1 = json.line1 ?? json.tle_line1;
        const line2 = json.line2 ?? json.tle_line2;
        if (isValidTle(line1, line2)) {
          return { line1, line2 };
        }
      } catch {
        return null;
      }
    }

    // Handle text format (CelesTrak)
    const lines = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);

    let line1: string | undefined;
    let line2: string | undefined;

    if (lines.length >= 3) {
      line1 = lines[1];
      line2 = lines[2];
    } else if (lines.length >= 2) {
      line1 = lines[0];
      line2 = lines[1];
    }

    if (isValidTle(line1, line2)) {
      return { line1: line1!, line2: line2! };
    }

    console.warn(`[tle] ${new URL(url).hostname} returned unparseable response`);
    return null;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (!msg.includes("abort")) {
      console.warn(`[tle] ${new URL(url).hostname} failed: ${msg}`);
    }
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function isValidTle(line1?: string, line2?: string): boolean {
  return !!(
    line1?.startsWith("1 ") &&
    line2?.startsWith("2 ") &&
    line1.length >= 69 &&
    line2.length >= 69
  );
}
