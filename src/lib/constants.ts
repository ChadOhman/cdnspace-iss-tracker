// ISS NORAD catalog number
export const ISS_NORAD_ID = 25544;

// Data source URLs
export const CELESTRAK_TLE_URL = "https://celestrak.org/NORAD/elements/gp.php?CATNR=25544&FORMAT=TLE";
export const LIGHTSTREAMER_SERVER = "https://push.lightstreamer.com";
export const LIGHTSTREAMER_ADAPTER = "ISSLIVE";

// NOAA SWPC endpoints
export const NOAA_KP_URL = "https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json";
export const NOAA_XRAY_URL = "https://services.swpc.noaa.gov/json/goes/primary/xrays-1-day.json";
export const NOAA_PROTON_URL = "https://services.swpc.noaa.gov/json/goes/primary/integral-protons-1-day.json";

// Polling intervals
export const TLE_POLL_INTERVAL_MS = 2 * 60 * 60 * 1000;      // 2 hours
export const SGP4_TICK_INTERVAL_MS = 1000;                     // 1 second
export const SOLAR_POLL_INTERVAL_MS = 60 * 1000;               // 60 seconds
export const SCHEDULE_POLL_INTERVAL_MS = 15 * 60 * 1000;       // 15 minutes
export const SSE_BROADCAST_INTERVAL_MS = 1000;                  // 1 second
export const SSE_KEEPALIVE_INTERVAL_MS = 30 * 1000;             // 30 seconds
export const VISITOR_COUNT_INTERVAL_MS = 5000;                  // 5 seconds

// Orbital constants
export const EARTH_RADIUS_KM = 6371;
export const ISS_MEAN_ALTITUDE_KM = 408;

// Playback speeds for SIM mode (max 100x)
export const PLAYBACK_SPEEDS = [0, 1, 10, 50, 100] as const;
