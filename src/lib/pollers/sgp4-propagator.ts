/**
 * SGP4 Propagator
 *
 * Converts a TLE into a full OrbitalState at an arbitrary point in time using
 * the satellite.js SGP4 implementation.  Also computes orbital elements parsed
 * directly from TLE line 2, and a simplified sunlight / shadow determination.
 */

import {
  twoline2satrec,
  propagate,
  gstime,
  eciToGeodetic,
  eciToEcf,
  degreesLat,
  degreesLong,
  sunPos,
  shadowFraction,
} from "satellite.js";

import { EARTH_RADIUS_KM } from "@/lib/constants";
import type { OrbitalState } from "@/lib/types";
import type { TleData } from "./tle-poller";

// Re-export so consumers can import from a single place if needed.
export type { TleData };

/** GM of Earth (km³/s²) used for Kepler's third law */
const GM_KM3_S2 = 398600.4418;

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Propagate an ISS TLE to a given date and return a complete OrbitalState.
 * Returns null if satellite.js cannot propagate (e.g. decayed or bad TLE).
 */
export function propagateFromTle(tle: TleData, date: Date): OrbitalState | null {
  const satrec = twoline2satrec(tle.line1, tle.line2);
  const result = propagate(satrec, date);

  const position = result.position;
  const velocity = result.velocity;

  if (
    !position ||
    typeof position === "boolean" ||
    !velocity ||
    typeof velocity === "boolean" ||
    isNaN((position as { x: number }).x) ||
    isNaN((velocity as { x: number }).x)
  ) {
    return null;
  }

  // ── Geodetic position ─────────────────────────────────────────────────────
  const gmst = gstime(date);
  const geodetic = eciToGeodetic(position, gmst);
  const lat = degreesLat(geodetic.latitude);
  const lon = degreesLong(geodetic.longitude);
  const altitude = geodetic.height; // km

  // ── Velocity ──────────────────────────────────────────────────────────────
  const velocityKms = Math.sqrt(
    velocity.x ** 2 + velocity.y ** 2 + velocity.z ** 2
  );
  const speedKmH = velocityKms * 3600;

  // ── Orbital elements from TLE line 2 ─────────────────────────────────────
  // TLE line 2 column positions (0-indexed):
  //   9–16   inclination (degrees)
  //  26–32   eccentricity (decimal point assumed before digits)
  //  52–62   mean motion (revolutions per day)
  const inclination = parseFloat(tle.line2.substring(8, 16).trim());
  const eccentricity = parseFloat("0." + tle.line2.substring(26, 33).trim());
  const meanMotionRevPerDay = parseFloat(tle.line2.substring(52, 63).trim());

  // Revolution number — compute from ISS launch date (Nov 20, 1998) since
  // the TLE field is only 5 digits and wraps at 99999.
  const ISS_LAUNCH_MS = Date.UTC(1998, 10, 20, 6, 40, 0); // Nov 20, 1998 06:40 UTC
  const daysSinceLaunch = (date.getTime() - ISS_LAUNCH_MS) / 86_400_000;
  const revolutionNumber = Math.floor(daysSinceLaunch * meanMotionRevPerDay);

  // ── Period & semi-major axis ──────────────────────────────────────────────
  const periodSeconds = 86400 / meanMotionRevPerDay;
  const periodMinutes = periodSeconds / 60;

  // Kepler's third law: a³ = GM * T² / (4π²)
  const semiMajorAxisKm =
    Math.cbrt((GM_KM3_S2 * periodSeconds ** 2) / (4 * Math.PI ** 2));

  const apoapsis = semiMajorAxisKm * (1 + eccentricity) - EARTH_RADIUS_KM;
  const periapsis = semiMajorAxisKm * (1 - eccentricity) - EARTH_RADIUS_KM;

  // ── Sunlight determination ────────────────────────────────────────────────
  const jd = dateToJulian(date);
  const { rsun } = sunPos(jd);
  const fraction = shadowFraction(rsun, position);
  const isInSunlight = fraction < 0.5;

  return {
    timestamp: date.getTime(),
    lat,
    lon,
    altitude,
    velocity: velocityKms,
    speedKmH,
    period: periodMinutes,
    inclination,
    eccentricity,
    apoapsis,
    periapsis,
    revolutionNumber,
    isInSunlight,
    sunriseIn: isInSunlight ? null : null, // computed by orbit manager if needed
    sunsetIn: isInSunlight ? null : null,
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Convert a JavaScript Date to a Julian Day Number as expected by satellite.js sunPos(). */
function dateToJulian(date: Date): number {
  return date.getTime() / 86400000 + 2440587.5;
}
