/**
 * Lightstreamer Client for NASA ISS Live telemetry.
 *
 * Connects to push.lightstreamer.com with the ISSLIVE adapter and subscribes
 * to ISS telemetry channels.
 */

import {
  LIGHTSTREAMER_SERVER,
  LIGHTSTREAMER_ADAPTER,
} from "@/lib/constants";
import type { ISSTelemetry, LightstreamerChannel } from "@/lib/types";

// ─── Channel catalogue ───────────────────────────────────────────────────────

const TELEMETRY_IDS = [
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
  "TIME_000001", // Station time
];

export const CHANNEL_IDS = TELEMETRY_IDS;
export type ChannelId = (typeof TELEMETRY_IDS)[number];

export type TelemetryUpdateCallback = (channels: Record<string, LightstreamerChannel>) => void;

// ─── Module state ────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let lsClient: any = null;
let latestChannels: Record<string, LightstreamerChannel> = {};

// ─── Connect / Disconnect ────────────────────────────────────────────────────

export async function connectLightstreamer(
  onUpdate: TelemetryUpdateCallback
): Promise<boolean> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const LS = require("lightstreamer-client-node");
    const { LightstreamerClient, Subscription } = LS;

    if (!LightstreamerClient) {
      // Try alternate package name
      console.error("[lightstreamer] LightstreamerClient not found in lightstreamer-client-node");
      return false;
    }

    const client = new LightstreamerClient(LIGHTSTREAMER_SERVER, LIGHTSTREAMER_ADAPTER);

    // Disable throttling
    try { client.connectionOptions.setSlowingEnabled(false); } catch { /* not all versions support this */ }

    // Connection status listener
    client.addListener({
      onStatusChange(status: string) {
        console.log(`[lightstreamer] Connection status: ${status}`);
      },
      onServerError(code: number, message: string) {
        console.error(`[lightstreamer] Server error ${code}: ${message}`);
      },
    });

    const sub = new Subscription(
      "MERGE",
      TELEMETRY_IDS,
      ["TimeStamp", "Value", "Status.Class", "CalibratedData"]
    );

    let updateCount = 0;

    sub.addListener({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      onItemUpdate(update: any) {
        const item = update.getItemName();
        const value = update.getValue("Value") ?? update.getValue("CalibratedData") ?? "";
        const status = update.getValue("Status.Class") ?? "OK";
        const tsStr = update.getValue("TimeStamp");
        const timestamp = tsStr ? parseFloat(tsStr) * 1000 : Date.now();

        latestChannels = {
          ...latestChannels,
          [item]: { value, status, timestamp },
        };

        onUpdate({ ...latestChannels });

        updateCount++;
        if (updateCount <= 5 || updateCount % 200 === 0) {
          console.log(`[lightstreamer] Update #${updateCount}: ${item} = ${value} (status: ${status})`);
        }
      },
      onSubscription() {
        console.log(`[lightstreamer] Subscription active — ${TELEMETRY_IDS.length} items`);
      },
      onSubscriptionError(code: number, message: string) {
        console.error(`[lightstreamer] Subscription error ${code}: ${message}`);
      },
      onUnsubscription() {
        console.log("[lightstreamer] Unsubscribed");
      },
    });

    client.subscribe(sub);
    client.connect();
    lsClient = client;

    console.log("[lightstreamer] Connecting to", LIGHTSTREAMER_SERVER, "adapter:", LIGHTSTREAMER_ADAPTER);
    return true;
  } catch (err) {
    console.error("[lightstreamer] Failed to initialize:", err instanceof Error ? err.message : err);

    // Fallback: try alternate package name
    try {
      return await connectLightstreamerFallback(onUpdate);
    } catch (err2) {
      console.error("[lightstreamer] Fallback also failed:", err2 instanceof Error ? err2.message : err2);
      return false;
    }
  }
}

async function connectLightstreamerFallback(
  onUpdate: TelemetryUpdateCallback
): Promise<boolean> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const LS = require("lightstreamer-client");
  const LightstreamerClient = LS.LightstreamerClient ?? LS.default?.LightstreamerClient ?? LS;
  const Subscription = LS.Subscription ?? LS.default?.Subscription;

  if (!Subscription) {
    console.error("[lightstreamer] Could not find Subscription class in lightstreamer-client");
    return false;
  }

  const client = new LightstreamerClient(LIGHTSTREAMER_SERVER, LIGHTSTREAMER_ADAPTER);

  try { client.connectionOptions.setSlowingEnabled(false); } catch { /* */ }

  client.addListener({
    onStatusChange(status: string) {
      console.log(`[lightstreamer-fallback] Connection status: ${status}`);
    },
    onServerError(code: number, message: string) {
      console.error(`[lightstreamer-fallback] Server error ${code}: ${message}`);
    },
  });

  const sub = new Subscription(
    "MERGE",
    TELEMETRY_IDS,
    ["TimeStamp", "Value", "Status.Class", "CalibratedData"]
  );

  let updateCount = 0;

  sub.addListener({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onItemUpdate(update: any) {
      const item = update.getItemName();
      const value = update.getValue("Value") ?? update.getValue("CalibratedData") ?? "";
      const status = update.getValue("Status.Class") ?? "OK";
      const tsStr = update.getValue("TimeStamp");
      const timestamp = tsStr ? parseFloat(tsStr) * 1000 : Date.now();

      latestChannels = {
        ...latestChannels,
        [item]: { value, status, timestamp },
      };

      onUpdate({ ...latestChannels });

      updateCount++;
      if (updateCount <= 5 || updateCount % 200 === 0) {
        console.log(`[lightstreamer-fallback] Update #${updateCount}: ${item} = ${value}`);
      }
    },
    onSubscription() {
      console.log(`[lightstreamer-fallback] Subscription active — ${TELEMETRY_IDS.length} items`);
    },
    onSubscriptionError(code: number, message: string) {
      console.error(`[lightstreamer-fallback] Subscription error ${code}: ${message}`);
    },
  });

  client.subscribe(sub);
  client.connect();
  lsClient = client;

  console.log("[lightstreamer-fallback] Connecting to", LIGHTSTREAMER_SERVER);
  return true;
}

export function disconnectLightstreamer(): void {
  try {
    if (lsClient) {
      lsClient.disconnect();
      lsClient = null;
    }
  } catch { /* best effort */ }
  latestChannels = {};
}

export function getLatestChannels(): Record<string, LightstreamerChannel> {
  return { ...latestChannels };
}

// ─── Telemetry derivation ────────────────────────────────────────────────────

export function deriveTelemetry(
  channels: Record<string, LightstreamerChannel>
): ISSTelemetry {
  function num(id: string): number {
    const raw = channels[id]?.value;
    if (!raw) return 0;
    const parsed = parseFloat(raw);
    return isNaN(parsed) ? 0 : parsed;
  }

  const powerKw = num("USLAB000058");
  const co2Percent = num("NODE3000007");
  const oxygenPercent = num("NODE3000008");
  const pressurePsi = num("NODE3000009");

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
