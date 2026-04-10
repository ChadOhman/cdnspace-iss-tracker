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
  /**
   * Beta angle in degrees — the angle between the ISS orbital plane and the
   * Sun-Earth vector.  Ranges roughly -75° to +75° for the ISS.
   * Positive values mean the Sun is north of the orbital plane.
   */
  betaAngle: number;
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

  // ── Power ──────────────────────────────────────────────────────────────────
  /** Total electrical power generation in kW */
  powerKw: number;
  /** Per-array voltage, current, BGA angles */
  solarArrays: {
    p4: { voltage2B: number; current2B: number; voltage4B: number; current4B: number; bgaRotation: number; bgaIncidence: number };
    p6: { voltage2B: number; current2B: number; voltage4B: number; current4B: number; bgaRotation: number; bgaIncidence: number };
    s4: { voltage2A: number; current2A: number; voltage4A: number; current4A: number; bgaRotation: number; bgaIncidence: number };
    s6: { voltage2A: number; current2A: number; voltage4A: number; current4A: number; bgaRotation: number; bgaIncidence: number };
    /** Port SARJ angle (degrees) */
    portSarj: number;
    /** Starboard SARJ angle (degrees) */
    starboardSarj: number;
    /** Port SARJ software mode (raw enum value) */
    portSarjMode: string;
    /** Starboard SARJ software mode (raw enum value) */
    starboardSarjMode: string;
  };

  // ── Thermal ────────────────────────────────────────────────────────────────
  /** Average cabin temperature in °C (derived) */
  temperatureC: number;
  /** Per-module temperatures and CCAA statuses */
  moduleTemps: {
    node1Cabin: number;
    node2Cabin: number; node2Avionics: number; node2MtlCoolant: number; node2LtlCoolant: number; node2Ccaa: string;
    node3Cabin: number; node3Avionics: number; node3MtlCoolant: number; node3LtlCoolant: number; node3Ccaa: string;
    uslabCabin: number; uslabAvionics: number; uslabCabinAir: number; uslabCcaa1: string; uslabCcaa2: string;
    /** Destiny ITCS Low Temperature Loop coolant fill (%) */
    destinyLtlPercent: number;
    /** Destiny ITCS Medium Temperature Loop coolant fill (%) */
    destinyMtlPercent: number;
  };
  /** External thermal control system data */
  externalThermal: {
    loopAFlow: number; loopAPressure: number; loopARadiatorTemp: number;
    loopBFlow: number; loopBPressure: number; loopBRadiatorTemp: number;
    /** Starboard TRRJ angle (degrees) */
    trrjStarboard: number;
    /** Port TRRJ angle (degrees) */
    trrjPort: number;
    /** TRRJ Loop A software mode (raw enum value) */
    trrjLoopAMode: string;
    /** TRRJ Loop B software mode (raw enum value) */
    trrjLoopBMode: string;
  };

  // ── Atmosphere / ECLSS ─────────────────────────────────────────────────────
  /** Cabin pressure in psi */
  pressurePsi: number;
  /** Oxygen concentration in percent */
  oxygenPercent: number;
  /** CO₂ concentration in percent */
  co2Percent: number;
  /** ECLSS subsystem data */
  eclss: {
    /** Node 3 O₂ partial pressure (mmHg) */
    o2Mmhg: number;
    /** Node 3 N₂ partial pressure (mmHg) */
    n2Mmhg: number;
    /** Node 3 CO₂ partial pressure (mmHg) */
    co2Mmhg: number;
    /** Total cabin pressure (mmHg), derived from partials */
    totalMmhg: number;
    /** Total cabin pressure (kPa), derived from partials */
    totalKpa: number;
    /** Destiny O₂ partial pressure (mmHg) */
    uslabO2Mmhg: number;
    /** Destiny N₂ partial pressure (mmHg) */
    uslabN2Mmhg: number;
    /** Destiny CO₂ partial pressure (mmHg) */
    uslabCo2Mmhg: number;
    /** Clean water tank fill (%) */
    cleanWaterPercent: number;
    /** Waste water tank fill (%) */
    wasteWaterPercent: number;
    /** Urine tank fill (%) */
    urinePercent: number;
    /** Urine Processing Assembly status */
    upaStatus: string;
    /** Water Processing Assembly status */
    wpaStatus: string;
    /** O₂ Generation System H₂ dome status */
    ogsStatus: string;
    /** O₂ generation rate (mg/sec) */
    o2GenRate: number;
  };

  // ── Attitude / CMG ─────────────────────────────────────────────────────────
  /** Human-readable attitude control mode (derived) */
  attitudeMode: string;
  /** Detailed GNC and attitude data */
  attitude: {
    gncMode: string;
    navSource: string;
    controlType: string;
    refFrame: string;
    stationMode: string;
    quaternion: { w: number; x: number; y: number; z: number };
    roll: number; pitch: number; yaw: number;
    rollRateErr: number; pitchRateErr: number; yawRateErr: number;
    cmdTorqueRoll: number; cmdTorquePitch: number; cmdTorqueYaw: number;
    /** Active CMG momentum in Nms (raw value) */
    momentumSaturation: number;
    /** CMG momentum as percentage of capacity (direct from NASA USLAB000010) */
    momentumPercent: number;
    /** Active CMG momentum capacity in Nms (USLAB000038) */
    momentumCapacity: number;
    /** True if desaturation is inhibited (USLAB000011 = 1) */
    desatInhibited: boolean;
    /** True if an attitude maneuver is in progress (USLAB000081 = 1) */
    maneuverInProgress: boolean;
    /** Solar beta angle in degrees (direct from NASA USLAB000040) */
    betaAngle: number;
    /** ISS total mass in kg (USLAB000039) */
    issMassKg: number;
    stationAlarm: number;
    gyroAlarm: number;
    gps1Status: string;
    gps2Status: string;
  };
  /** Per-CMG health data (index 0–3 = CMG 1–4) */
  cmgs: Array<{
    on: boolean;
    spinRate: number;
    vibration: number;
    wheelCurrent: number;
    spinMotorTemp: number;
    hallResolverTemp: number;
  }>;

  // ── Airlock / EVA ──────────────────────────────────────────────────────────
  /** Airlock and EMU data */
  airlock: {
    o2SupplyPressureA: number;
    o2SupplyPressureB: number;
    o2HighTank: number;
    o2LowTank: number;
    n2Tank: number;
    crewLockPump: string;
    emu1O2Pressure: number; emu1O2Current: number;
    emu2O2Pressure: number; emu2O2Current: number;
    emu3O2Pressure: number; emu3O2Current: number;
    /** EMU 1 secondary O₂ supply pressure (psi) */
    emu1SecO2Pressure: number;
    /** EMU 1 secondary O₂ supply current (A) */
    emu1SecO2Current: number;
    /** EMU 2 secondary O₂ supply pressure (psi) */
    emu2SecO2Pressure: number;
    /** EMU 2 secondary O₂ supply current (A) */
    emu2SecO2Current: number;
  };

  /** Communications systems (S-Band, Ku-Band SGANT) */
  comms: {
    /** S-Band RFG 1 (S1 truss) azimuth gimbal position (deg) */
    sband1Azimuth: number;
    /** S-Band RFG 1 elevation gimbal position (deg) */
    sband1Elevation: number;
    /** S-Band RFG 1 power state (0=off, 1=on) */
    sband1On: boolean;
    /** S-Band RFG 2 (P1 truss) azimuth gimbal position (deg) */
    sband2Azimuth: number;
    /** S-Band RFG 2 elevation gimbal position (deg) */
    sband2Elevation: number;
    /** S-Band RFG 2 power state */
    sband2On: boolean;
    /** Active S-Band string identifier */
    activeSband: string;
    /** Ku-Band SGANT Transmit state (0=reset, 1=normal) */
    kuTransmitOn: boolean;
    /** Ku-Band SGANT elevation position (deg) */
    kuElevation: number;
    /** Ku-Band SGANT cross-elevation position (deg) */
    kuCrossElevation: number;
  };

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
