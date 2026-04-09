/**
 * ISS Pass Predictor
 *
 * Computes visible ISS passes for a given observer location by propagating
 * the ISS orbit in discrete time steps and checking the elevation angle above
 * the local horizon.
 *
 * Algorithm:
 *   1. Step through time at STEP_SECONDS intervals.
 *   2. At each step compute the ISS position with SGP4 and convert to
 *      look-angles (azimuth, elevation) from the observer.
 *   3. Detect pass start (elevation crosses MIN_ELEVATION rising) and end
 *      (elevation falls back below MIN_ELEVATION).
 *   4. Track the peak elevation and derive a visual magnitude estimate.
 *   5. Classify each pass with classifyPassQuality.
 */

import {
  twoline2satrec,
  propagate,
  gstime,
  eciToEcf,
  ecfToLookAngles,
  degreesToRadians,
} from "satellite.js";

import type { PassPrediction, PassQuality } from "@/lib/types";
import type { TleData } from "./tle-poller";

// ─── Constants ───────────────────────────────────────────────────────────────

/** Propagation step size in seconds */
const STEP_SECONDS = 30;

/** Minimum elevation (degrees) for a pass to be considered visible */
const MIN_ELEVATION = 10;

/** Maximum number of passes returned per call */
const MAX_PASSES = 20;

/** Approximate ISS cross-section area factor used for magnitude estimate */
const ISS_MAGNITUDE_BASE = -1.8;

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Classify a pass by its peak elevation and estimated visual magnitude.
 */
export function classifyPassQuality(
  maxElevation: number,
  magnitude: number
): PassQuality {
  if (maxElevation >= 50 && magnitude <= -2.5) return "bright";
  if (maxElevation >= 30 && magnitude <= -1.5) return "good";
  if (maxElevation >= 15) return "fair";
  return "poor";
}

/**
 * Predict upcoming ISS passes visible from the given observer location.
 *
 * @param tle          - Current ISS TLE
 * @param lat          - Observer latitude in decimal degrees
 * @param lon          - Observer longitude in decimal degrees
 * @param hoursAhead   - How many hours into the future to search (default 48)
 * @returns            - Up to MAX_PASSES pass predictions, sorted by rise time
 */
export function predictPasses(
  tle: TleData,
  lat: number,
  lon: number,
  hoursAhead = 48
): PassPrediction[] {
  const satrec = twoline2satrec(tle.line1, tle.line2);

  // Observer geodetic (radians for satellite.js)
  const observerGeodetic = {
    latitude: degreesToRadians(lat),
    longitude: degreesToRadians(lon),
    height: 0, // sea level
  };

  const passes: PassPrediction[] = [];
  const now = Date.now();
  const endTime = now + hoursAhead * 3600 * 1000;
  const stepMs = STEP_SECONDS * 1000;

  // State machine for detecting passes
  let inPass = false;
  let riseTime = 0;
  let riseAzimuth = 0;
  let maxElevationDeg = 0;
  let maxTime = 0;
  let maxAzimuth = 0;
  let minRangeSat = Infinity;

  for (let t = now; t <= endTime; t += stepMs) {
    const date = new Date(t);
    const result = propagate(satrec, date);

    const position = result.position;
    if (!position || typeof position === "boolean") continue;

    const gmst = gstime(date);
    const ecf = eciToEcf(position, gmst);
    const lookAngles = ecfToLookAngles(observerGeodetic, ecf);

    const elevationDeg = (lookAngles.elevation * 180) / Math.PI;
    const azimuthDeg = (lookAngles.azimuth * 180) / Math.PI;
    const rangeSat = lookAngles.rangeSat;

    if (elevationDeg >= MIN_ELEVATION) {
      if (!inPass) {
        // Pass start
        inPass = true;
        riseTime = t;
        riseAzimuth = azimuthDeg;
        maxElevationDeg = elevationDeg;
        maxTime = t;
        maxAzimuth = azimuthDeg;
        minRangeSat = rangeSat;
      } else {
        // Update peak
        if (elevationDeg > maxElevationDeg) {
          maxElevationDeg = elevationDeg;
          maxTime = t;
          maxAzimuth = azimuthDeg;
        }
        if (rangeSat < minRangeSat) {
          minRangeSat = rangeSat;
        }
      }
    } else if (inPass) {
      // Pass end
      inPass = false;

      const setTime = t;
      const setAzimuth = azimuthDeg;

      const magnitude = estimateMagnitude(minRangeSat);
      const quality = classifyPassQuality(maxElevationDeg, magnitude);

      passes.push({
        riseTime,
        riseAzimuth,
        maxTime,
        maxElevation: maxElevationDeg,
        setTime,
        setAzimuth,
        magnitude,
        quality,
      });

      if (passes.length >= MAX_PASSES) break;
    }
  }

  // Close any pass still open at the end of the search window
  if (inPass && passes.length < MAX_PASSES) {
    const magnitude = estimateMagnitude(minRangeSat);
    const quality = classifyPassQuality(maxElevationDeg, magnitude);
    passes.push({
      riseTime,
      riseAzimuth,
      maxTime,
      maxElevation: maxElevationDeg,
      setTime: endTime,
      setAzimuth: maxAzimuth,
      magnitude,
      quality,
    });
  }

  return passes;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Estimate the visual magnitude of the ISS based on the range to the observer.
 * Uses a simple model: magnitude decreases (gets brighter) with closer range.
 * Reference: ISS at ~400 km directly overhead is roughly magnitude -3 to -4.
 */
function estimateMagnitude(rangeSat: number): number {
  // Simplified magnitude model: m = base + 5 * log10(range / 400)
  // At 400 km range → magnitude ≈ base
  const m = ISS_MAGNITUDE_BASE + 5 * Math.log10(rangeSat / 400);
  // Clamp to a physically plausible range
  return Math.max(-4.5, Math.min(6, Math.round(m * 10) / 10));
}
