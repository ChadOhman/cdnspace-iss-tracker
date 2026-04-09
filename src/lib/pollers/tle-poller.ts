/**
 * TLE Poller
 *
 * Fetches the ISS Two-Line Element set from CelesTrak and caches it in memory.
 * Consumers call getCurrentTle() to retrieve the latest cached value without
 * incurring a network round-trip.
 */

import { CELESTRAK_TLE_URL } from "@/lib/constants";

export interface TleData {
  line1: string;
  line2: string;
}

/** In-memory cache of the most-recently fetched TLE. */
let currentTle: TleData | null = null;

/** Returns the cached TLE without triggering a network request. */
export function getCurrentTle(): TleData | null {
  return currentTle;
}

/**
 * Fetch the latest ISS TLE from CelesTrak, parse it, update the cache and
 * return the result.  On error, the previous cached value is returned so
 * callers always have a usable TLE as long as one has ever succeeded.
 *
 * Supports both 3-line format (name + line1 + line2) and 2-line format
 * (line1 + line2).
 */
export async function pollTle(): Promise<TleData | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);

  try {
    const res = await fetch(CELESTRAK_TLE_URL, { signal: controller.signal });
    if (!res.ok) {
      return currentTle;
    }

    const text = await res.text();
    const lines = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);

    let line1: string | undefined;
    let line2: string | undefined;

    if (lines.length >= 3) {
      // 3-line format: [name, line1, line2]
      line1 = lines[1];
      line2 = lines[2];
    } else if (lines.length === 2) {
      // 2-line format: [line1, line2]
      line1 = lines[0];
      line2 = lines[1];
    }

    if (
      line1?.startsWith("1 ") &&
      line2?.startsWith("2 ") &&
      line1.length >= 69 &&
      line2.length >= 69
    ) {
      currentTle = { line1, line2 };
    }

    return currentTle;
  } catch {
    return currentTle;
  } finally {
    clearTimeout(timeout);
  }
}
