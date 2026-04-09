/**
 * Lightstreamer Client for NASA ISS Live telemetry.
 *
 * Connects to the NASA ISS Live Lightstreamer server and subscribes to a set
 * of telemetry channels.  The lightstreamer-client npm package is a CommonJS
 * bundle; it is imported dynamically so the module can be loaded in both the
 * Next.js edge/node runtime and in tests without breaking the build.
 *
 * Key design decisions:
 *   - Graceful degradation: if the Lightstreamer package cannot be loaded
 *     (e.g. during SSR in environments that don't support TCP sockets), all
 *     exported functions return safe fallback values without throwing.
 *   - The `deriveTelemetry` function is pure and always available.
 */

import {
  LIGHTSTREAMER_SERVER,
  LIGHTSTREAMER_ADAPTER,
} from "@/lib/constants";
import type { ISSTelemetry, LightstreamerChannel } from "@/lib/types";

// ─── Channel catalogue ───────────────────────────────────────────────────────

/** All Lightstreamer item names we subscribe to. */
export const CHANNEL_IDS = [
  // Power
  "USLAB000058", // Total power generation (kW)
  "S0000005",    // Solar array current
  "S4000001",    // Port solar array voltage
  "S4000002",    // Port solar array current
  "P4000001",    // Starboard solar array voltage
  "P4000002",    // Starboard solar array current
  // Thermal
  "NODE1000001", // Node 1 temperature
  "NODE2000001", // Node 2 temperature
  "NODE3000001", // Node 3 temperature
  "USLAB000001", // US Lab temperature
  // Atmosphere
  "NODE3000007", // CO₂ concentration
  "NODE3000008", // O₂ concentration
  "NODE3000009", // Cabin pressure (psi)
  "NODE3000010", // Humidity
  "NODE3000011", // Dew point
  // CMG / Attitude
  "USLAB000019", // CMG 1 speed
  "USLAB000020", // CMG 2 speed
  "USLAB000021", // CMG 3 speed
  "USLAB000022", // CMG 4 speed
  // Time
  "TIME_000001", // MET (Mission Elapsed Time)
] as const;

export type ChannelId = (typeof CHANNEL_IDS)[number];

/** Callback invoked on every Lightstreamer field update. */
export type TelemetryUpdateCallback = (channels: Record<string, LightstreamerChannel>) => void;

// ─── Module state ────────────────────────────────────────────────────────────

let lsClient: unknown = null;
let latestChannels: Record<string, LightstreamerChannel> = {};

// ─── Connect / Disconnect ────────────────────────────────────────────────────

/**
 * Create a Lightstreamer connection and subscribe to all ISS telemetry
 * channels.  `onUpdate` is called after every field change with the full
 * current channel map.
 *
 * Returns false if the Lightstreamer client package could not be loaded.
 */
export async function connectLightstreamer(
  onUpdate: TelemetryUpdateCallback
): Promise<boolean> {
  try {
    // Dynamic import avoids build-time errors when the CJS package cannot be
    // statically analysed by the bundler.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { LightstreamerClient, Subscription } = require("lightstreamer-client") as {
      LightstreamerClient: new (server: string, adapter: string) => {
        connect(): void;
        disconnect(): void;
        subscribe(sub: unknown): void;
        unsubscribe(sub: unknown): void;
      };
      Subscription: new (
        mode: string,
        items: string[],
        fields: string[]
      ) => {
        addListener(listener: Record<string, unknown>): void;
      };
    };

    const client = new LightstreamerClient(LIGHTSTREAMER_SERVER, LIGHTSTREAMER_ADAPTER);
    lsClient = client;

    const subscription = new Subscription(
      "MERGE",
      [...CHANNEL_IDS],
      ["Value", "Status.Quality"]
    );

    subscription.addListener({
      onItemUpdate(update: {
        getItemName(): string;
        getValue(field: string): string;
      }) {
        const item = update.getItemName();
        const value = update.getValue("Value") ?? "";
        const status = update.getValue("Status.Quality") ?? "OK";

        latestChannels = {
          ...latestChannels,
          [item]: {
            value,
            status,
            timestamp: Date.now(),
          },
        };

        onUpdate({ ...latestChannels });
      },
    });

    client.subscribe(subscription);
    client.connect();
    return true;
  } catch {
    return false;
  }
}

/** Disconnect from Lightstreamer and clear the cached channel data. */
export function disconnectLightstreamer(): void {
  try {
    if (lsClient) {
      (lsClient as { disconnect(): void }).disconnect();
      lsClient = null;
    }
  } catch {
    // swallow — best effort cleanup
  }
  latestChannels = {};
}

/** Return a shallow copy of the current channel snapshot. */
export function getLatestChannels(): Record<string, LightstreamerChannel> {
  return { ...latestChannels };
}

// ─── Telemetry derivation ────────────────────────────────────────────────────

/**
 * Convert a raw Lightstreamer channel map into a structured ISSTelemetry
 * object.  All numeric conversions fall back to 0 on missing or non-numeric
 * values so downstream code never receives NaN.
 */
export function deriveTelemetry(
  channels: Record<string, LightstreamerChannel>
): ISSTelemetry {
  function num(id: string): number {
    const raw = channels[id]?.value;
    if (!raw) return 0;
    const parsed = parseFloat(raw);
    return isNaN(parsed) ? 0 : parsed;
  }

  // Power: USLAB000058 is total power generation in kW
  const powerKw = num("USLAB000058");

  // Atmosphere: Node 3 channels
  const co2Percent = num("NODE3000007");
  const oxygenPercent = num("NODE3000008");
  const pressurePsi = num("NODE3000009");

  // Temperature: average of available temperature sensors
  const tempValues = [
    num("NODE1000001"),
    num("NODE2000001"),
    num("NODE3000001"),
    num("USLAB000001"),
  ].filter((v) => v !== 0);
  const temperatureC =
    tempValues.length > 0
      ? tempValues.reduce((a, b) => a + b, 0) / tempValues.length
      : 0;

  // Attitude: derive mode label from CMG speeds
  const cmgSpeeds = [
    num("USLAB000019"),
    num("USLAB000020"),
    num("USLAB000021"),
    num("USLAB000022"),
  ];
  const activeCmgs = cmgSpeeds.filter((s) => Math.abs(s) > 100).length;
  const attitudeMode =
    activeCmgs >= 3 ? "CMG" : activeCmgs >= 1 ? "CMG (partial)" : "THRUSTER";

  return {
    timestamp: Date.now(),
    powerKw,
    temperatureC,
    pressurePsi,
    oxygenPercent,
    co2Percent,
    attitudeMode,
    channels,
  };
}
