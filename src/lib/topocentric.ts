// src/lib/topocentric.ts
// Compute topocentric (observer-relative) coordinates for the ISS.
// Given an observer location and the ISS geodetic position (lat/lon/alt),
// computes azimuth, elevation, range, and topocentric equatorial
// coordinates (RA/Dec) suitable for pointing a telescope.

const EARTH_RADIUS_KM = 6378.137; // WGS-84 equatorial radius
const EARTH_F = 1 / 298.257223563; // WGS-84 flattening
const EARTH_E2 = EARTH_F * (2 - EARTH_F);

export interface Observer {
  lat: number;     // degrees
  lon: number;     // degrees
  altitudeM?: number; // meters (optional, defaults to 0)
}

export interface IssGeodetic {
  lat: number;     // degrees
  lon: number;     // degrees
  altitudeKm: number;
}

export interface TopocentricResult {
  azimuth: number;   // degrees (0 = North, 90 = East)
  elevation: number; // degrees (0 = horizon, 90 = zenith)
  rangeKm: number;   // line-of-sight distance in km
  ra: number;        // Right Ascension (hours, 0-24)
  dec: number;       // Declination (degrees, -90 to +90)
  visible: boolean;  // true if elevation > 0
}

/** Greenwich Mean Sidereal Time in radians at the given UTC timestamp. */
export function gmst(utcMs: number): number {
  const jd = utcMs / 86400000 + 2440587.5;
  const t = (jd - 2451545.0) / 36525;
  let gmstDeg =
    280.46061837 +
    360.98564736629 * (jd - 2451545.0) +
    0.000387933 * t * t -
    (t * t * t) / 38710000;
  gmstDeg = ((gmstDeg % 360) + 360) % 360;
  return (gmstDeg * Math.PI) / 180;
}

/** Convert geodetic lat/lon/alt (WGS-84) to ECEF Cartesian coordinates (km). */
function geodeticToEcef(
  latDeg: number,
  lonDeg: number,
  altKm: number
): { x: number; y: number; z: number } {
  const lat = (latDeg * Math.PI) / 180;
  const lon = (lonDeg * Math.PI) / 180;
  const sinLat = Math.sin(lat);
  const cosLat = Math.cos(lat);
  const n = EARTH_RADIUS_KM / Math.sqrt(1 - EARTH_E2 * sinLat * sinLat);
  return {
    x: (n + altKm) * cosLat * Math.cos(lon),
    y: (n + altKm) * cosLat * Math.sin(lon),
    z: (n * (1 - EARTH_E2) + altKm) * sinLat,
  };
}

/**
 * Compute topocentric coordinates (az/el + RA/Dec) of the ISS as seen
 * from an observer on the ground.
 */
export function computeTopocentric(
  iss: IssGeodetic,
  observer: Observer,
  utcMs: number
): TopocentricResult {
  // Observer ECEF
  const obs = geodeticToEcef(
    observer.lat,
    observer.lon,
    (observer.altitudeM ?? 0) / 1000
  );
  // ISS ECEF
  const sat = geodeticToEcef(iss.lat, iss.lon, iss.altitudeKm);

  // Vector from observer to satellite, in ECEF
  const dx = sat.x - obs.x;
  const dy = sat.y - obs.y;
  const dz = sat.z - obs.z;

  // Rotate ECEF delta into local ENU (East, North, Up) frame at observer
  const latRad = (observer.lat * Math.PI) / 180;
  const lonRad = (observer.lon * Math.PI) / 180;
  const sinLat = Math.sin(latRad);
  const cosLat = Math.cos(latRad);
  const sinLon = Math.sin(lonRad);
  const cosLon = Math.cos(lonRad);

  const east = -sinLon * dx + cosLon * dy;
  const north = -sinLat * cosLon * dx - sinLat * sinLon * dy + cosLat * dz;
  const up = cosLat * cosLon * dx + cosLat * sinLon * dy + sinLat * dz;

  const rangeKm = Math.sqrt(dx * dx + dy * dy + dz * dz);
  const elevation = Math.asin(up / rangeKm) * (180 / Math.PI);
  let azimuth = Math.atan2(east, north) * (180 / Math.PI);
  if (azimuth < 0) azimuth += 360;

  // Compute topocentric RA/Dec from ECEF delta vector
  // Convert ECEF (delta) to ECI by rotating about Z by GMST (ECI is the
  // inertial equatorial frame — RA is measured from the vernal equinox).
  // For topocentric RA/Dec we want the apparent direction in equatorial.
  const gmstRad = gmst(utcMs);
  const cosGmst = Math.cos(gmstRad);
  const sinGmst = Math.sin(gmstRad);
  // ECEF -> ECI rotation (rotate by +gmst about Z)
  const xEci = dx * cosGmst - dy * sinGmst;
  const yEci = dx * sinGmst + dy * cosGmst;
  const zEci = dz;

  const rXY = Math.sqrt(xEci * xEci + yEci * yEci);
  const decRad = Math.atan2(zEci, rXY);
  let raRad = Math.atan2(yEci, xEci);
  if (raRad < 0) raRad += 2 * Math.PI;

  const dec = decRad * (180 / Math.PI);
  const ra = (raRad * 180 / Math.PI) / 15; // hours

  return {
    azimuth,
    elevation,
    rangeKm,
    ra,
    dec,
    visible: elevation > 0,
  };
}

/** Format RA (hours) as "HH:MM:SS.S". */
export function formatRA(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.floor((hours - h) * 60);
  const s = ((hours - h) * 60 - m) * 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${s.toFixed(1).padStart(4, "0")}`;
}

/** Format Dec (degrees) as "±DD°MM'SS"". */
export function formatDec(degrees: number): string {
  const sign = degrees >= 0 ? "+" : "-";
  const abs = Math.abs(degrees);
  const d = Math.floor(abs);
  const m = Math.floor((abs - d) * 60);
  const s = ((abs - d) * 60 - m) * 60;
  return `${sign}${String(d).padStart(2, "0")}°${String(m).padStart(2, "0")}'${s.toFixed(0).padStart(2, "0")}"`;
}
