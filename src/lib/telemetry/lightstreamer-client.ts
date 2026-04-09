/**
 * Lightstreamer Client for NASA ISS Live telemetry.
 *
 * Uses a two-phase subscription strategy matching NASA's reference implementation:
 *   1. Subscribe to TIME_000001 as a heartbeat
 *   2. When Status.Class === '24' (feed is live), subscribe to all channels
 *   3. Unsubscribe (with grace period) when status leaves '24'
 *
 * Reference: github.com/sensedata/space-telemetry/blob/develop/server/lightstreamer.js
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
];

export const CHANNEL_IDS = ["TIME_000001", ...TELEMETRY_IDS] as const;
export type ChannelId = (typeof CHANNEL_IDS)[number];

export type TelemetryUpdateCallback = (channels: Record<string, LightstreamerChannel>) => void;

// ─── Module state ────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let lsClient: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let telemetrySub: any = null;
let latestChannels: Record<string, LightstreamerChannel> = {};
let isLive = false;
let gracePeriodTimer: ReturnType<typeof setTimeout> | null = null;

const GRACE_PERIOD_MS = 10_000;

// ─── Connect / Disconnect ────────────────────────────────────────────────────

export async function connectLightstreamer(
  onUpdate: TelemetryUpdateCallback
): Promise<boolean> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const LS = require("lightstreamer-client");
    const { LightstreamerClient, Subscription } = LS;

    const client = new LightstreamerClient(LIGHTSTREAMER_SERVER, LIGHTSTREAMER_ADAPTER);
    // Prevent Lightstreamer from throttling rapid updates
    if (client.connectionOptions?.setSlowingEnabled) {
      client.connectionOptions.setSlowingEnabled(false);
    }
    lsClient = client;

    // Phase 1: Subscribe to TIME_000001 heartbeat to detect live status
    const heartbeatSub = new Subscription(
      "MERGE",
      ["TIME_000001"],
      ["TimeStamp", "Value", "Status.Class"]
    );

    heartbeatSub.addListener({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      onItemUpdate(update: any) {
        const statusClass = update.getValue("Status.Class");
        console.log(`[lightstreamer] TIME_000001 Status.Class = ${statusClass}`);

        if (statusClass === "24" && !isLive) {
          // Feed went live — subscribe to all telemetry
          if (gracePeriodTimer) {
            clearTimeout(gracePeriodTimer);
            gracePeriodTimer = null;
          }
          isLive = true;
          subscribeTelemetry(client, Subscription, onUpdate);
        } else if (statusClass !== "24" && isLive) {
          // Feed went offline — unsubscribe after grace period
          if (!gracePeriodTimer) {
            gracePeriodTimer = setTimeout(() => {
              console.log("[lightstreamer] Feed offline, unsubscribing telemetry");
              unsubscribeTelemetry(client);
              isLive = false;
              gracePeriodTimer = null;
            }, GRACE_PERIOD_MS);
          }
        }

        // Also update the TIME channel in our data
        const value = update.getValue("Value") ?? "";
        const tsStr = update.getValue("TimeStamp");
        const timestamp = tsStr ? parseFloat(tsStr) * 1000 : Date.now();
        latestChannels = {
          ...latestChannels,
          TIME_000001: { value, status: statusClass ?? "OK", timestamp },
        };
        onUpdate({ ...latestChannels });
      },
    });

    client.subscribe(heartbeatSub);
    client.connect();
    console.log("[lightstreamer] Connected to", LIGHTSTREAMER_SERVER, "adapter:", LIGHTSTREAMER_ADAPTER);
    console.log("[lightstreamer] Waiting for TIME_000001 Status.Class = 24 (feed live)...");
    return true;
  } catch (err) {
    console.error("[lightstreamer] Failed to connect:", err instanceof Error ? err.message : err);
    return false;
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function subscribeTelemetry(client: any, Subscription: any, onUpdate: TelemetryUpdateCallback) {
  if (telemetrySub) return; // already subscribed

  telemetrySub = new Subscription(
    "MERGE",
    [...TELEMETRY_IDS],
    ["TimeStamp", "Value", "Status.Class", "CalibratedData"]
  );

  let updateCount = 0;
  telemetrySub.addListener({
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
      if (updateCount <= 3 || updateCount % 100 === 0) {
        console.log(`[lightstreamer] Telemetry update #${updateCount}: ${item} = ${value}`);
      }
    },
  });

  client.subscribe(telemetrySub);
  console.log(`[lightstreamer] Feed is LIVE — subscribed to ${TELEMETRY_IDS.length} telemetry channels`);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function unsubscribeTelemetry(client: any) {
  if (!telemetrySub) return;
  try {
    client.unsubscribe(telemetrySub);
  } catch { /* best effort */ }
  telemetrySub = null;
}

export function disconnectLightstreamer(): void {
  try {
    if (lsClient) {
      lsClient.disconnect();
      lsClient = null;
    }
  } catch { /* best effort */ }
  telemetrySub = null;
  latestChannels = {};
  isLive = false;
  if (gracePeriodTimer) {
    clearTimeout(gracePeriodTimer);
    gracePeriodTimer = null;
  }
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
