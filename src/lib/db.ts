/**
 * MySQL database layer for the ISS Tracker application.
 * Uses mysql2/promise with a lazy singleton connection pool.
 */

import mysql, { Pool, RowDataPacket } from "mysql2/promise";
import type {
  OrbitalState,
  SolarActivity,
  ISSEvent,
  Snapshot,
} from "@/lib/types";

// ─── Connection Pool ─────────────────────────────────────────────────────────

let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) {
    const url =
      process.env.MYSQL_URL ?? "mysql://root@localhost:3306/iss_tracker";

    // mysql2 supports URI strings directly in createPool
    // but some versions need it parsed. Try URI first, fall back to parsed.
    try {
      const parsed = new URL(url);
      pool = mysql.createPool({
        host: parsed.hostname,
        port: parseInt(parsed.port || "3306", 10),
        user: decodeURIComponent(parsed.username),
        password: decodeURIComponent(parsed.password),
        database: parsed.pathname.replace(/^\//, ""),
        connectionLimit: 10,
        timezone: "Z",
        waitForConnections: true,
      });
    } catch {
      // Fallback: pass URI directly
      pool = mysql.createPool({
        uri: url,
        connectionLimit: 10,
        timezone: "Z",
        waitForConnections: true,
      });
    }

    console.log("[db] Pool created for:", url.replace(/\/\/.*@/, "//<credentials>@"));
  }
  return pool;
}

// ─── Schema Initialization ───────────────────────────────────────────────────

/**
 * Idempotent column add. Checks information_schema first so it works on
 * MySQL versions without ADD COLUMN IF NOT EXISTS.
 */
async function addColumnIfMissing(
  table: string,
  column: string,
  definition: string
): Promise<void> {
  const db = getPool();
  const [rows] = await db.execute<RowDataPacket[]>(
    `SELECT COUNT(*) AS c
     FROM information_schema.COLUMNS
     WHERE table_schema = DATABASE()
       AND table_name = ?
       AND column_name = ?`,
    [table, column]
  );
  const exists = Number(rows[0]?.c ?? 0) > 0;
  if (!exists) {
    // Identifiers cannot be parameterized; values here are static constants.
    await db.execute(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
    console.log(`[db] Added column ${table}.${column}`);
  }
}

export async function initializeSchema(): Promise<void> {
  const db = getPool();

  await db.execute(`
    CREATE TABLE IF NOT EXISTS orbital_state (
      id                BIGINT AUTO_INCREMENT PRIMARY KEY,
      timestamp         DATETIME(3)  NOT NULL,
      latitude          DOUBLE       NOT NULL,
      longitude         DOUBLE       NOT NULL,
      altitude          DOUBLE       NOT NULL,
      velocity          DOUBLE       NOT NULL,
      speed_kmh         DOUBLE       NOT NULL,
      period_s          DOUBLE,
      inclination       DOUBLE,
      eccentricity      DOUBLE,
      apoapsis          DOUBLE,
      periapsis         DOUBLE,
      revolution_number INT          NOT NULL,
      is_in_sunlight    BOOLEAN      NOT NULL,
      beta_angle        DOUBLE,
      iss_mass_kg       DOUBLE,
      momentum_percent  DOUBLE,
      gnc_delta_r_km    DOUBLE,
      gnc_delta_v_ms    DOUBLE,
      INDEX idx_orbital_timestamp (timestamp)
    )
  `);

  // Migrate existing orbital_state tables that pre-date the new columns.
  // We cannot rely on ADD COLUMN IF NOT EXISTS (MySQL 8.0.29+ only), so we
  // check information_schema first.
  await addColumnIfMissing("orbital_state", "beta_angle", "DOUBLE");
  await addColumnIfMissing("orbital_state", "iss_mass_kg", "DOUBLE");
  await addColumnIfMissing("orbital_state", "momentum_percent", "DOUBLE");
  await addColumnIfMissing("orbital_state", "gnc_delta_r_km", "DOUBLE");
  await addColumnIfMissing("orbital_state", "gnc_delta_v_ms", "DOUBLE");

  await db.execute(`
    CREATE TABLE IF NOT EXISTS tle_history (
      id         BIGINT AUTO_INCREMENT PRIMARY KEY,
      fetched_at DATETIME(3) NOT NULL,
      line1      VARCHAR(80) NOT NULL,
      line2      VARCHAR(80) NOT NULL,
      epoch      DATETIME(3) NOT NULL,
      INDEX idx_tle_fetched_at (fetched_at)
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS space_weather (
      id                  BIGINT AUTO_INCREMENT PRIMARY KEY,
      timestamp           DATETIME(3)  NOT NULL,
      kp_index            DOUBLE       NOT NULL,
      kp_label            VARCHAR(32)  NOT NULL,
      xray_flux           DOUBLE       NOT NULL,
      xray_class          VARCHAR(8)   NOT NULL,
      proton_flux_1mev    DOUBLE       NOT NULL,
      proton_flux_10mev   DOUBLE       NOT NULL,
      proton_flux_100mev  DOUBLE       NOT NULL,
      radiation_risk      VARCHAR(16)  NOT NULL,
      INDEX idx_space_weather_timestamp (timestamp)
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS iss_telemetry (
      id         BIGINT AUTO_INCREMENT PRIMARY KEY,
      timestamp  DATETIME(3)  NOT NULL,
      channel_id VARCHAR(32)  NOT NULL,
      value      VARCHAR(255) NOT NULL,
      status     VARCHAR(32)  NOT NULL,
      INDEX idx_iss_telemetry_ts_channel (timestamp, channel_id)
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS events (
      id               VARCHAR(64)  NOT NULL PRIMARY KEY,
      type             VARCHAR(16)  NOT NULL,
      title            VARCHAR(255) NOT NULL,
      description      TEXT         NOT NULL,
      status           VARCHAR(16)  NOT NULL DEFAULT 'scheduled',
      scheduled_start  DATETIME(3)  NOT NULL,
      scheduled_end    DATETIME(3)  NOT NULL,
      actual_start     DATETIME(3),
      actual_end       DATETIME(3),
      metadata         JSON         NOT NULL,
      INDEX idx_events_status (status),
      INDEX idx_events_scheduled_start (scheduled_start)
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS timeline_activities (
      id         BIGINT AUTO_INCREMENT PRIMARY KEY,
      name       VARCHAR(255) NOT NULL,
      type       VARCHAR(16)  NOT NULL,
      start_time DATETIME(3)  NOT NULL,
      end_time   DATETIME(3)  NOT NULL,
      notes      TEXT,
      INDEX idx_timeline_start_end (start_time, end_time)
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS page_views (
      id    INT    NOT NULL PRIMARY KEY DEFAULT 1,
      count BIGINT NOT NULL DEFAULT 0
    )
  `);

  // Seed the single page_views row if it doesn't exist
  await db.execute(`INSERT IGNORE INTO page_views (id, count) VALUES (1, 0)`);
}

// ─── Row Mappers ─────────────────────────────────────────────────────────────

function rowToOrbitalState(row: RowDataPacket): OrbitalState {
  return {
    timestamp: new Date(row.timestamp as string).getTime(),
    lat: row.latitude as number,
    lon: row.longitude as number,
    altitude: row.altitude as number,
    velocity: row.velocity as number,
    speedKmH: row.speed_kmh as number,
    period: row.period_s != null ? (row.period_s as number) / 60 : 0,
    inclination: row.inclination as number ?? 0,
    eccentricity: row.eccentricity as number ?? 0,
    apoapsis: row.apoapsis as number ?? 0,
    periapsis: row.periapsis as number ?? 0,
    revolutionNumber: row.revolution_number as number,
    isInSunlight: Boolean(row.is_in_sunlight),
    sunriseIn: null,
    sunsetIn: null,
    betaAngle: row.beta_angle as number ?? 0,
  };
}

function rowToSolar(row: RowDataPacket): SolarActivity {
  return {
    timestamp: new Date(row.timestamp as string).getTime(),
    kpIndex: row.kp_index as number,
    kpLabel: row.kp_label as string,
    xrayFlux: row.xray_flux as number,
    xrayClass: row.xray_class as string,
    protonFlux1MeV: row.proton_flux_1mev as number,
    protonFlux10MeV: row.proton_flux_10mev as number,
    protonFlux100MeV: row.proton_flux_100mev as number,
    radiationRisk: row.radiation_risk as SolarActivity["radiationRisk"],
  };
}

function rowToEvent(row: RowDataPacket): ISSEvent {
  return {
    id: row.id as string,
    type: row.type as ISSEvent["type"],
    title: row.title as string,
    description: row.description as string,
    status: row.status as ISSEvent["status"],
    scheduledStart: new Date(row.scheduled_start as string).getTime(),
    scheduledEnd: new Date(row.scheduled_end as string).getTime(),
    actualStart:
      row.actual_start != null
        ? new Date(row.actual_start as string).getTime()
        : null,
    actualEnd:
      row.actual_end != null
        ? new Date(row.actual_end as string).getTime()
        : null,
    metadata:
      typeof row.metadata === "string"
        ? (JSON.parse(row.metadata) as Record<string, string>)
        : (row.metadata as Record<string, string>) ?? {},
  };
}

// ─── Archive Functions ────────────────────────────────────────────────────────

/**
 * Optional telemetry-sourced extras that can be archived alongside each
 * orbital state row. Passing undefined skips the column.
 */
export interface OrbitalArchiveExtras {
  betaAngle?: number | null;
  issMassKg?: number | null;
  momentumPercent?: number | null;
  /** Radial offset between our SGP4 position and NASA GNC state vector (km) */
  gncDeltaRKm?: number | null;
  /** Velocity-magnitude offset between SGP4 and NASA GNC state vector (m/s) */
  gncDeltaVMs?: number | null;
}

export async function archiveOrbitalState(
  state: Partial<OrbitalState>,
  extras: OrbitalArchiveExtras = {}
): Promise<void> {
  const db = getPool();
  const ts = state.timestamp != null ? new Date(state.timestamp) : new Date();
  // Prefer extras.betaAngle (from direct NASA channel) over state.betaAngle
  // (SGP4-derived), falling back to whichever is defined.
  const betaAngle =
    extras.betaAngle != null
      ? extras.betaAngle
      : (state.betaAngle != null && state.betaAngle !== 0 ? state.betaAngle : null);
  await db.execute(
    `INSERT INTO orbital_state
       (timestamp, latitude, longitude, altitude, velocity, speed_kmh,
        period_s, inclination, eccentricity, apoapsis, periapsis,
        revolution_number, is_in_sunlight,
        beta_angle, iss_mass_kg, momentum_percent,
        gnc_delta_r_km, gnc_delta_v_ms)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      ts,
      state.lat ?? 0,
      state.lon ?? 0,
      state.altitude ?? 0,
      state.velocity ?? 0,
      state.speedKmH ?? 0,
      state.period != null ? state.period * 60 : null,
      state.inclination ?? null,
      state.eccentricity ?? null,
      state.apoapsis ?? null,
      state.periapsis ?? null,
      state.revolutionNumber ?? 0,
      state.isInSunlight ? 1 : 0,
      betaAngle,
      extras.issMassKg ?? null,
      extras.momentumPercent ?? null,
      extras.gncDeltaRKm ?? null,
      extras.gncDeltaVMs ?? null,
    ]
  );
}

export async function archiveSolar(solar: SolarActivity): Promise<void> {
  const db = getPool();
  await db.execute(
    `INSERT INTO space_weather
       (timestamp, kp_index, kp_label, xray_flux, xray_class,
        proton_flux_1mev, proton_flux_10mev, proton_flux_100mev,
        radiation_risk)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      new Date(solar.timestamp),
      solar.kpIndex,
      solar.kpLabel,
      solar.xrayFlux,
      solar.xrayClass,
      solar.protonFlux1MeV,
      solar.protonFlux10MeV,
      solar.protonFlux100MeV,
      solar.radiationRisk,
    ]
  );
}

export async function archiveTelemetryChannel(
  timestamp: number,
  channelId: string,
  value: string,
  status: string
): Promise<void> {
  const db = getPool();
  await db.execute(
    `INSERT INTO iss_telemetry (timestamp, channel_id, value, status)
     VALUES (?, ?, ?, ?)`,
    [new Date(timestamp), channelId, value, status]
  );
}

export async function upsertEvent(event: ISSEvent): Promise<void> {
  const db = getPool();
  await db.execute(
    `INSERT INTO events
       (id, type, title, description, status,
        scheduled_start, scheduled_end,
        actual_start, actual_end, metadata)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       status       = VALUES(status),
       actual_start = VALUES(actual_start),
       actual_end   = VALUES(actual_end),
       metadata     = VALUES(metadata)`,
    [
      event.id,
      event.type,
      event.title,
      event.description,
      event.status,
      new Date(event.scheduledStart),
      new Date(event.scheduledEnd),
      event.actualStart != null ? new Date(event.actualStart) : null,
      event.actualEnd != null ? new Date(event.actualEnd) : null,
      JSON.stringify(event.metadata),
    ]
  );
}

// ─── Query Functions ──────────────────────────────────────────────────────────

const METRIC_COLUMN_ALLOWLIST = new Set([
  "altitude",
  "velocity",
  "speed_kmh",
  "latitude",
  "longitude",
  "inclination",
  "beta_angle",
  "iss_mass_kg",
  "momentum_percent",
  "gnc_delta_r_km",
  "gnc_delta_v_ms",
]);

export async function getMetricHistory(
  column: string,
  hours: number,
  maxPoints: number
): Promise<{ timestamp: number; value: number }[]> {
  if (!METRIC_COLUMN_ALLOWLIST.has(column)) {
    throw new Error(`Column "${column}" is not allowed`);
  }

  const db = getPool();

  // Count total rows in the window first
  const [countRows] = await db.execute<RowDataPacket[]>(
    `SELECT COUNT(*) AS total
     FROM orbital_state
     WHERE timestamp >= DATE_SUB(NOW(), INTERVAL ? HOUR)`,
    [hours]
  );
  const total = (countRows[0]?.total as number) ?? 0;

  if (total === 0) return [];

  // Downsample using modulo row numbering when we have more rows than maxPoints
  const step = total > maxPoints ? Math.floor(total / maxPoints) : 1;

  // Use a safe column name (already validated above via allowlist)
  const safeColumn = column as string;

  const [rows] = await db.execute<RowDataPacket[]>(
    `SELECT timestamp, ${safeColumn} AS value
     FROM (
       SELECT timestamp, ${safeColumn},
              ROW_NUMBER() OVER (ORDER BY timestamp) AS rn
       FROM orbital_state
       WHERE timestamp >= DATE_SUB(NOW(), INTERVAL ? HOUR)
     ) ranked
     WHERE rn % ? = 1
     ORDER BY timestamp`,
    [hours, step]
  );

  return rows.map((r) => ({
    timestamp: new Date(r.timestamp as string).getTime(),
    value: r.value as number,
  }));
}

export async function getActiveEvents(): Promise<ISSEvent[]> {
  const db = getPool();
  const [rows] = await db.execute<RowDataPacket[]>(
    `SELECT * FROM events
     WHERE status IN ('scheduled', 'active')
     ORDER BY scheduled_start`
  );
  return rows.map(rowToEvent);
}

export async function getUpcomingEvents(limit = 5): Promise<ISSEvent[]> {
  const db = getPool();
  const [rows] = await db.execute<RowDataPacket[]>(
    `SELECT * FROM events
     WHERE scheduled_start >= NOW()
       AND status = 'scheduled'
     ORDER BY scheduled_start
     LIMIT ?`,
    [limit]
  );
  return rows.map(rowToEvent);
}

export async function getSnapshotAt(timestamp: number): Promise<Snapshot> {
  const db = getPool();
  const ts = new Date(timestamp);

  const [orbitalRows] = await db.execute<RowDataPacket[]>(
    `SELECT * FROM orbital_state
     WHERE timestamp <= ?
     ORDER BY timestamp DESC
     LIMIT 1`,
    [ts]
  );

  const [solarRows] = await db.execute<RowDataPacket[]>(
    `SELECT * FROM space_weather
     WHERE timestamp <= ?
     ORDER BY timestamp DESC
     LIMIT 1`,
    [ts]
  );

  const [eventRows] = await db.execute<RowDataPacket[]>(
    `SELECT * FROM events
     WHERE scheduled_start <= ?
       AND status IN ('scheduled', 'active', 'completed')
     ORDER BY scheduled_start DESC
     LIMIT 1`,
    [ts]
  );

  const orbital =
    orbitalRows.length > 0 ? rowToOrbitalState(orbitalRows[0]) : null;

  if (!orbital) {
    throw new Error(`No orbital state found at or before ${ts.toISOString()}`);
  }

  return {
    timestamp,
    orbital,
    telemetry: null,
    solar: solarRows.length > 0 ? rowToSolar(solarRows[0]) : null,
    activeEvent: eventRows.length > 0 ? rowToEvent(eventRows[0]) : null,
  };
}

/**
 * Transition scheduled → active and active → completed based on wall-clock time.
 * Returns the total number of rows updated across both statements.
 */
export async function activateScheduledEvents(): Promise<number> {
  const db = getPool();
  let total = 0;

  const [activateResult] = await db.execute(
    `UPDATE events
     SET status = 'active', actual_start = NOW()
     WHERE status = 'scheduled' AND scheduled_start <= NOW()`
  );
  total += (activateResult as { affectedRows?: number }).affectedRows ?? 0;

  const [completeResult] = await db.execute(
    `UPDATE events
     SET status = 'completed', actual_end = NOW()
     WHERE status = 'active' AND scheduled_end <= NOW()`
  );
  total += (completeResult as { affectedRows?: number }).affectedRows ?? 0;

  return total;
}

/**
 * Return the single currently active ISS event, or null if none.
 */
export async function getCurrentActiveEvent(): Promise<ISSEvent | null> {
  const db = getPool();
  const [rows] = await db.execute<RowDataPacket[]>(
    `SELECT * FROM events
     WHERE status = 'active'
     ORDER BY scheduled_start
     LIMIT 1`
  );
  return rows.length > 0 ? rowToEvent(rows[0]) : null;
}

/**
 * Delete rows older than `retentionDays` from all time-series tables.
 * Returns the total number of rows deleted.
 */
export async function pruneOldData(retentionDays: number): Promise<number> {
  const db = getPool();
  let total = 0;

  const tables = [
    { name: "orbital_state", col: "timestamp" },
    { name: "space_weather", col: "timestamp" },
    { name: "iss_telemetry", col: "timestamp" },
  ];

  for (const { name, col } of tables) {
    const [result] = await db.execute(
      `DELETE FROM ${name} WHERE ${col} < DATE_SUB(NOW(), INTERVAL ? DAY)`,
      [retentionDays]
    );
    const affected = (result as { affectedRows?: number }).affectedRows ?? 0;
    total += affected;
  }

  return total;
}

export async function incrementPageViews(): Promise<number> {
  const db = getPool();
  await db.execute(
    `UPDATE page_views SET count = count + 1 WHERE id = 1`
  );
  const [rows] = await db.execute<RowDataPacket[]>(
    `SELECT count FROM page_views WHERE id = 1`
  );
  return rows[0]?.count as number ?? 0;
}

/** Read the current page view count without incrementing. */
export async function getPageViews(): Promise<number> {
  const db = getPool();
  const [rows] = await db.execute<RowDataPacket[]>(
    `SELECT count FROM page_views WHERE id = 1`
  );
  return rows[0]?.count as number ?? 0;
}
