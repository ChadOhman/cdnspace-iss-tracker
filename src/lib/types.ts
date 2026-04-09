/**
 * Core TypeScript interfaces for the ISS Tracker application.
 */

// ─── Orbital & Telemetry ────────────────────────────────────────────────────

export interface OrbitalState {
  /** Unix timestamp (ms) of this position fix */
  timestamp: number;
  /** Latitude in decimal degrees */
  lat: number;
  /** Longitude in decimal degrees */
  lon: number;
  /** Altitude above sea level in km */
  altitude: number;
  /** Orbital velocity in km/s */
  velocity: number;
  /** Ground speed in km/h */
  speedKmH: number;
  /** Orbital period in minutes */
  period: number;
  /** Orbital inclination in degrees */
  inclination: number;
  /** Orbital eccentricity (dimensionless) */
  eccentricity: number;
  /** Apoapsis altitude in km */
  apoapsis: number;
  /** Periapsis altitude in km */
  periapsis: number;
  /** Revolution (orbit) number since launch */
  revolutionNumber: number;
  /** Whether the ISS is currently illuminated by the Sun */
  isInSunlight: boolean;
  /** Seconds until next orbital sunrise (null if currently in sunlight) */
  sunriseIn: number | null;
  /** Seconds until next orbital sunset (null if currently in shadow) */
  sunsetIn: number | null;
}

export interface LightstreamerChannel {
  /** Raw string value from Lightstreamer */
  value: string;
  /** Channel status string (e.g. "OK", "STALE") */
  status: string;
  /** Unix timestamp (ms) of the last update */
  timestamp: number;
}

export interface ISSTelemetry {
  /** Unix timestamp (ms) of this telemetry snapshot */
  timestamp: number;
  /** Total electrical power generation in kW */
  powerKw: number;
  /** Cabin temperature in °C */
  temperatureC: number;
  /** Cabin pressure in psi */
  pressurePsi: number;
  /** Oxygen concentration in percent */
  oxygenPercent: number;
  /** CO₂ concentration in percent */
  co2Percent: number;
  /** Current attitude control mode */
  attitudeMode: string;
  /** Raw Lightstreamer channel values keyed by channel name */
  channels: Record<string, LightstreamerChannel>;
}

// ─── Space Weather ───────────────────────────────────────────────────────────

export type RadiationRisk = "low" | "moderate" | "high" | "severe";

export interface SolarActivity {
  /** Unix timestamp (ms) of this reading */
  timestamp: number;
  /** Kp geomagnetic index (0–9) */
  kpIndex: number;
  /** Human-readable Kp label */
  kpLabel: string;
  /** X-ray flux in W/m² */
  xrayFlux: number;
  /** GOES X-ray class (e.g. "B1.2", "M5.3") */
  xrayClass: string;
  /** Proton flux at ≥1 MeV (pfu) */
  protonFlux1MeV: number;
  /** Proton flux at ≥10 MeV (pfu) */
  protonFlux10MeV: number;
  /** Proton flux at ≥100 MeV (pfu) */
  protonFlux100MeV: number;
  /** Derived radiation risk level for crew */
  radiationRisk: RadiationRisk;
}

// ─── ISS Events ──────────────────────────────────────────────────────────────

export type EventType =
  | "eva"
  | "docking"
  | "undocking"
  | "reboost"
  | "maneuver";

export type EventStatus = "scheduled" | "active" | "completed" | "cancelled";

export interface ISSEvent {
  /** Unique event identifier */
  id: string;
  /** Category of the event */
  type: EventType;
  /** Short human-readable title */
  title: string;
  /** Detailed description */
  description: string;
  /** Current lifecycle status */
  status: EventStatus;
  /** Scheduled start time as Unix timestamp (ms) */
  scheduledStart: number;
  /** Scheduled end time as Unix timestamp (ms) */
  scheduledEnd: number;
  /** Actual start time, or null if not yet begun */
  actualStart: number | null;
  /** Actual end time, or null if not yet finished */
  actualEnd: number | null;
  /** Arbitrary key/value metadata */
  metadata: Record<string, string>;
}

// ─── Crew & Timeline ─────────────────────────────────────────────────────────

export type ActivityType =
  | "sleep"
  | "science"
  | "exercise"
  | "meal"
  | "eva"
  | "maneuver"
  | "dpc"
  | "off-duty"
  | "other";

export interface TimelineActivity {
  /** Activity name */
  name: string;
  /** Category of activity */
  type: ActivityType;
  /** Start time as Unix timestamp (ms) */
  startTime: number;
  /** End time as Unix timestamp (ms) */
  endTime: number;
  /** Optional free-text notes */
  notes?: string;
}

export interface CrewMember {
  /** Full name of the crew member */
  name: string;
  /** Job role or title on the ISS */
  role: string;
  /** Space agency (e.g. "NASA", "ESA", "Roscosmos") */
  agency: string;
  /** Nationality */
  nationality: string;
  /** Expedition number */
  expedition: number;
  /** Optional biographical text */
  bio?: string;
  /** Optional URL to a portrait photo */
  photo?: string;
}

// ─── Pass Predictions ────────────────────────────────────────────────────────

export type PassQuality = "bright" | "good" | "fair" | "poor";

export interface PassPrediction {
  /** Rise time as Unix timestamp (ms) */
  riseTime: number;
  /** Azimuth at rise in degrees (0–360) */
  riseAzimuth: number;
  /** Time of maximum elevation as Unix timestamp (ms) */
  maxTime: number;
  /** Maximum elevation angle in degrees */
  maxElevation: number;
  /** Set time as Unix timestamp (ms) */
  setTime: number;
  /** Azimuth at set in degrees (0–360) */
  setAzimuth: number;
  /** Estimated visual magnitude (lower = brighter) */
  magnitude: number;
  /** Human-readable pass quality */
  quality: PassQuality;
}

// ─── SSE & Playback ──────────────────────────────────────────────────────────

export interface SsePayload {
  /** Current orbital state */
  orbital: OrbitalState;
  /** Latest telemetry snapshot, or null if unavailable */
  telemetry: ISSTelemetry | null;
  /** Latest solar activity, or null if unavailable */
  solar: SolarActivity | null;
  /** Currently active ISS event, or null if none */
  activeEvent: ISSEvent | null;
  /** Number of connected SSE clients */
  visitorCount: number;
}

/**
 * Playback speed multiplier for the timeline replay feature.
 * 0 = paused; 1 = real-time; higher values = fast-forward.
 */
export type PlaybackSpeed = 0 | 1 | 10 | 50 | 100;

export interface Snapshot {
  /** Unix timestamp (ms) when the snapshot was captured */
  timestamp: number;
  /** Orbital state at snapshot time */
  orbital: OrbitalState;
  /** Telemetry at snapshot time, or null */
  telemetry: ISSTelemetry | null;
  /** Solar activity at snapshot time, or null */
  solar: SolarActivity | null;
  /** Active event at snapshot time, or null */
  activeEvent: ISSEvent | null;
}
