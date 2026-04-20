/**
 * TDRS (Tracking and Data Relay Satellite) coverage regions.
 *
 * NASA's Space Network organises TDRS geostationary satellites into three
 * ocean-region coverage zones. Individual satellites are re-stationed
 * between orbital slots without public coordination, so specific satellite
 * identities cannot be asserted reliably from the browser. We model the
 * regions instead — those are stable.
 *
 * Longitudes below are nominal regional centres, not current satellite
 * positions. They describe the coverage zone, not any specific vehicle.
 */

export type TdrsRegionId = "atlantic" | "pacific" | "indian";

export interface TdrsRegion {
  id: TdrsRegionId;
  /** Short display form, e.g. "ATLANTIC" */
  label: string;
  /** Longer form, e.g. "Atlantic Ocean Region" */
  longLabel: string;
  /** Nominal region centre in degrees. Negative = west. */
  lon: number;
}

export const TDRS_REGIONS: readonly TdrsRegion[] = [
  { id: "atlantic", label: "ATLANTIC", longLabel: "Atlantic Ocean Region", lon: -41 },
  { id: "pacific",  label: "PACIFIC",  longLabel: "Pacific Ocean Region",  lon: -171 },
  { id: "indian",   label: "INDIAN",   longLabel: "Indian Ocean Region",   lon:  85 },
];

/** A region is considered in-view when ISS is within this angular delta of its centre. */
export const IN_VIEW_THRESHOLD_DEG = 70;

/** Angular delta (degrees) between two longitudes, handling the ±180 wrap. */
export function lonDelta(a: number, b: number): number {
  const diff = Math.abs(a - b);
  return diff > 180 ? 360 - diff : diff;
}

/**
 * Approximate elevation angle (degrees) from the ISS to a geostationary
 * relay at the given longitude. Planar simplification; qualitative.
 *
 * Geostationary altitude ~35 786 km, ISS altitude ~420 km, Earth radius
 * 6 371 km. Returns -90 when the region centre is more than 90° away.
 */
export function computeElevation(issLon: number, issAltKm: number, regionLon: number): number {
  const delta = lonDelta(issLon, regionLon);
  if (delta >= 90) return -90;
  const R_E = 6371;
  const h_GEO = 35786;
  const deltaRad = (delta * Math.PI) / 180;
  const groundDist = R_E * deltaRad;
  const heightDiff = h_GEO - issAltKm;
  return (Math.atan2(heightDiff, groundDist) * 180) / Math.PI;
}

export interface TdrsRegionVisibility {
  region: TdrsRegion;
  /** Angular delta in degrees between ISS longitude and the region centre. */
  delta: number;
  /** True when the region is within `IN_VIEW_THRESHOLD_DEG` of ISS. */
  inView: boolean;
  /** Approximate elevation angle from ISS to a relay in this region. Qualitative; see `computeElevation`. */
  elevation: number;
}

/** Compute visibility of every TDRS region for a given ISS state. */
export function regionVisibility(issLon: number, issAltKm: number): TdrsRegionVisibility[] {
  return TDRS_REGIONS.map((region) => {
    const delta = lonDelta(issLon, region.lon);
    return {
      region,
      delta,
      inView: delta < IN_VIEW_THRESHOLD_DEG,
      elevation: computeElevation(issLon, issAltKm, region.lon),
    };
  });
}

/** Format a longitude for display: -171 → "171°W", 85 → "85°E", 0 → "0°W". */
export function formatLon(lon: number): string {
  const abs = Math.abs(lon);
  const dir = lon <= 0 ? "W" : "E";
  return `${abs}°${dir}`;
}
