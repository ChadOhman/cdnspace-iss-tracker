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
  // ── Power / Solar Arrays ──────────────────────────────────────────────────
  "USLAB000058", // Total power generation (kW)
  // Port 4 solar array
  "P4000001",    // P4 2B channel voltage (V)
  "P4000002",    // P4 2B channel current (A)
  "P4000004",    // P4 4B channel voltage (V)
  "P4000005",    // P4 4B channel current (A)
  "P4000007",    // P4 BGA rotation (deg)
  "P4000008",    // P4 BGA incidence (deg)
  // Port 6 solar array
  "P6000001",    // P6 2B channel voltage (V)
  "P6000002",    // P6 2B channel current (A)
  "P6000004",    // P6 4B channel voltage (V)
  "P6000005",    // P6 4B channel current (A)
  "P6000007",    // P6 BGA rotation (deg)
  "P6000008",    // P6 BGA incidence (deg)
  // Starboard 4 solar array
  "S4000001",    // S4 2A channel voltage (V)
  "S4000002",    // S4 2A channel current (A)
  "S4000004",    // S4 4A channel voltage (V)
  "S4000005",    // S4 4A channel current (A)
  "S4000007",    // S4 BGA rotation (deg)
  "S4000008",    // S4 BGA incidence (deg)
  // Starboard 6 solar array
  "S6000001",    // S6 2A channel voltage (V)
  "S6000002",    // S6 2A channel current (A)
  "S6000004",    // S6 4A channel voltage (V)
  "S6000005",    // S6 4A channel current (A)
  "S6000007",    // S6 BGA rotation (deg)
  "S6000008",    // S6 BGA incidence (deg)
  // SARJ angles and modes
  "S0000003",    // SARJ Starboard angle position (deg)
  "S0000004",    // SARJ Port angle position (deg)
  "S0000008",    // SARJ Port mode (enum)
  "S0000009",    // SARJ Starboard mode (enum)
  // TRRJ modes (loop A/B software mode)
  "S0000006",    // TRRJ Loop B software mode (enum)
  "S0000007",    // TRRJ Loop A software mode (enum)

  // ── CMG / Attitude ────────────────────────────────────────────────────────
  "USLAB000001", // CMG 1 on/off status
  "USLAB000002", // CMG 2 on/off status
  "USLAB000003", // CMG 3 on/off status
  "USLAB000004", // CMG 4 on/off status
  "USLAB000006", // Command torque roll (Nm)
  "USLAB000007", // Command torque pitch (Nm)
  "USLAB000008", // Command torque yaw (Nm)
  "USLAB000009", // Active CMG Momentum (Nms)
  "USLAB000010", // CMG Momentum Percentage (%) — direct from NASA
  "USLAB000011", // Desaturation Request (0=Enabled, 1=Inhibited)
  "USLAB000012", // GNC attitude control mode (enumerated)
  "USLAB000013", // GNC nav source (enumerated)
  "USLAB000016", // Attitude control type (enumerated)
  "USLAB000017", // Reference frame (enumerated)
  "USLAB000018", // Attitude quaternion W (actual)
  "USLAB000019", // Attitude quaternion X (actual)
  "USLAB000020", // Attitude quaternion Y (actual)
  "USLAB000021", // Attitude quaternion Z (actual)
  "USLAB000022", // Attitude roll (deg)
  "USLAB000023", // Attitude pitch (deg)
  "USLAB000024", // Attitude yaw (deg)
  "USLAB000025", // Attitude rate error roll (deg/s)
  "USLAB000026", // Attitude rate error pitch (deg/s)
  "USLAB000027", // Attitude rate error yaw (deg/s)
  "USLAB000041", // Station attitude alarm
  "USLAB000042", // Gyro attitude alarm
  "USLAB000043", // GPS 1 status
  "USLAB000044", // GPS 2 status
  "USLAB000045", // CMG 1 spin motor temp (°C)
  "USLAB000046", // CMG 1 hall resolver temp (°C)
  "USLAB000047", // CMG 2 spin motor temp (°C)
  "USLAB000048", // CMG 2 hall resolver temp (°C)
  "USLAB000049", // CMG 3 spin motor temp (°C)
  "USLAB000050", // CMG 3 hall resolver temp (°C)
  "USLAB000051", // CMG 4 spin motor temp (°C)
  "USLAB000052", // CMG 4 hall resolver temp (°C)
  "USLAB000038", // Active CMG Momentum Capacity (Nms)
  "USLAB000039", // ISS Total Mass (kg)
  "USLAB000040", // Solar Beta Angle (degrees) — direct from NASA
  "USLAB000081", // Attitude Maneuver In Progress (0/1)
  "USLAB000086", // ISS station mode (enumerated)
  // Z1 CMG vibration, wheel current, spin rate
  "Z1000001",    // CMG 1 vibration (g)
  "Z1000002",    // CMG 2 vibration (g)
  "Z1000003",    // CMG 3 vibration (g)
  "Z1000004",    // CMG 4 vibration (g)
  "Z1000005",    // CMG 1 wheel current (A)
  "Z1000006",    // CMG 2 wheel current (A)
  "Z1000007",    // CMG 3 wheel current (A)
  "Z1000008",    // CMG 4 wheel current (A)
  "Z1000009",    // CMG 1 spin rate (RPM)
  "Z1000010",    // CMG 2 spin rate (RPM)
  "Z1000011",    // CMG 3 spin rate (RPM)
  "Z1000012",    // CMG 4 spin rate (RPM)

  // ── Atmosphere / ECLSS ────────────────────────────────────────────────────
  "NODE3000001", // Node 3 O₂ partial pressure (mmHg)
  "NODE3000002", // Node 3 N₂ partial pressure (mmHg)
  "NODE3000003", // Node 3 CO₂ partial pressure (mmHg)
  "NODE3000004", // UPA status (enumerated)
  "NODE3000005", // Urine tank fill (%)
  "NODE3000006", // WPA status (enumerated)
  "NODE3000007", // Water Processor Step (enum)
  "NODE3000008", // Waste Water Tank Qty (%)
  "NODE3000009", // Clean Water Tank Qty (%)
  "NODE3000010", // OGS H₂ dome status (enumerated)
  "NODE3000011", // O₂ generation rate (mg/sec)
  "NODE3000012", // Tranquility avionics air temp (°C)
  "NODE3000013", // Tranquility cabin air temp (°C)
  "NODE3000017", // Tranquility MTL coolant temp (°C)
  "NODE3000018", // Tranquility CCAA status (enumerated)
  "NODE3000019", // Tranquility LTL coolant temp (°C)
  "USLAB000053", // Destiny O₂ partial pressure (mmHg)
  "USLAB000054", // Destiny N₂ partial pressure (mmHg)
  "USLAB000055", // Destiny CO₂ partial pressure (mmHg)

  // ── Thermal / Module Temps ────────────────────────────────────────────────
  "NODE1000001", // Node 1 cabin temp (°C)
  "NODE2000001", // Node 2 MTL coolant temp (°C)
  "NODE2000002", // Node 2 LTL coolant temp (°C)
  "NODE2000003", // Node 2 CCAA status (enumerated)
  "NODE2000006", // Node 2 cabin air temp (°C)
  "NODE2000007", // Node 2 avionics air temp (°C)
  "USLAB000059", // Destiny cabin temp (°C)
  "USLAB000060", // Destiny avionics temp (°C)
  "USLAB000061", // Destiny cabin air temp (°C)
  "USLAB000064", // Destiny CCAA 1 status (enumerated)
  "USLAB000065", // Destiny CCAA 2 status (enumerated)
  // ETCS Loop A (Starboard 1 truss)
  "S1000001",    // ETCS Loop A flow rate (lb/hr)
  "S1000002",    // ETCS Loop A pressure (psi)
  "S1000003",    // ETCS Loop A radiator outlet temp (°C)
  // ETCS Loop B (Port 1 truss)
  "P1000001",    // ETCS Loop B flow rate (lb/hr)
  "P1000002",    // ETCS Loop B pressure (psi)
  "P1000003",    // ETCS Loop B radiator outlet temp (°C)
  // TRRJ angles
  "S0000001",    // Starboard TRRJ angle (deg)
  "S0000002",    // Port TRRJ angle (deg)

  // ── Airlock / EVA ─────────────────────────────────────────────────────────
  "AIRLOCK000001", // EMU 1 O₂ supply pressure (psi)
  "AIRLOCK000002", // EMU 1 O₂ supply current (A)
  "AIRLOCK000003", // EMU 2 O₂ supply pressure (psi)
  "AIRLOCK000004", // EMU 2 O₂ supply current (A)
  "AIRLOCK000005", // EMU 3 O₂ supply pressure (psi)
  "AIRLOCK000006", // EMU 3 O₂ supply current (A)
  // EMU secondary O₂ supply (per data dictionary)
  "AIRLOCK000007", // EMU 1 secondary O₂ supply pressure (psi)
  "AIRLOCK000008", // EMU 1 secondary O₂ supply current (A)
  "AIRLOCK000009", // EMU 2 secondary O₂ supply pressure (psi)
  "AIRLOCK000010", // EMU 2 secondary O₂ supply current (A)
  // NOTE: AIRLOCK000011-046 are NOT documented — excluded from UI, not subscribed
  "AIRLOCK000047", // Crew lock pump status (enumerated)
  "AIRLOCK000049", // Crewlock pressure (mmHg)
  "AIRLOCK000050", // Hi P O₂ supply valve position (enum)
  "AIRLOCK000051", // Lo P O₂ supply valve position (enum)
  "AIRLOCK000052", // N₂ supply valve position (enum)
  "AIRLOCK000053", // Airlock Air Conditioner State (enum)
  "AIRLOCK000054", // Airlock (Equipment lock) pressure (mmHg)
  "AIRLOCK000055", // O₂ high pressure tank (psi)
  "AIRLOCK000056", // O₂ low pressure tank (psi)
  "AIRLOCK000057", // N₂ tank pressure (psi)

  // ── Destiny Lab Coolant Loops ──────────────────────────────────────────────
  "USLAB000056", // Destiny ITCS Low Temperature Loop coolant fill (%)
  "USLAB000057", // Destiny ITCS Medium Temperature Loop coolant fill (%)

  // ── Communications (CATO) ─────────────────────────────────────────────────
  // S-Band RFG 1 (on S1 truss) and RFG 2 (on P1 truss) antenna gimbal angles
  "S1000004", // S-Band RFG 1 Azimuth Gimbal Position (deg)
  "S1000005", // S-Band RFG 1 Elevation Gimbal Position (deg)
  "S1000009", // S-Band RFG 1 on/off status (bool)
  "P1000004", // S-Band RFG 2 Azimuth Gimbal Position (deg)
  "P1000005", // S-Band RFG 2 Elevation Gimbal Position (deg)
  "P1000007", // S-Band RFG 2 on/off status (bool)
  // Ku-Band SGANT (Space-to-Ground Antenna) — high-rate data relay
  "Z1000013", // Ku-Band Transmit (0=Reset, 1=Normal)
  "Z1000014", // Ku-Band SGANT Elevation Position (deg)
  "Z1000015", // Ku-Band SGANT Cross-Elevation Position (deg)
  // Ku-Band video downlink channel activity (1-4)
  "USLAB000088", // Ku-Band Video Downlink Channel 1 Activity (0=inactive, 1=active)
  "USLAB000089", // Ku-Band Video Downlink Channel 2 Activity
  "USLAB000090", // Ku-Band Video Downlink Channel 3 Activity
  "USLAB000091", // Ku-Band Video Downlink Channel 4 Activity
  // US active S-Band string
  "USLAB000092", // Active String of S-Band
  // UHF EVA voice radios
  "USLAB000099", // UHF 1 Power (enum)
  "USLAB000100", // UHF 2 Power (enum)
  // Destiny lab Vacuum Resource System / Vacuum Exhaust System valve positions
  "USLAB000062", // Vacuum Resource System (VRS) valve position
  "USLAB000063", // Vacuum Exhaust System (VES) valve position

  // ── Canadarm2 / SSRMS (Space Station Remote Manipulator System) ───────────
  "CSASSRMS002", // SSRMS Base Location (enum)
  "CSASSRMS003", // SSRMS Operating Base — which LEE is base (0=LEE A, 5=LEE B)
  "CSASSRMS004", // Shoulder Roll joint angle (deg)
  "CSASSRMS005", // Shoulder Yaw joint angle (deg)
  "CSASSRMS006", // Shoulder Pitch joint angle (deg)
  "CSASSRMS007", // Elbow Pitch joint angle (deg)
  "CSASSRMS008", // Wrist Pitch joint angle (deg)
  "CSASSRMS009", // Wrist Yaw joint angle (deg)
  "CSASSRMS010", // Wrist Roll joint angle (deg)
  "CSASSRMS011", // Tip LEE payload status (0=Released, 1=Captive, 2=Captured)
  // Mobile Transporter position
  "CSAMT000001", // MT Position (cm) or Worksite ID — dual-ID in upstream README

  // ── Russian Segment ────────────────────────────────────────────────────────
  "RUSSEG000001", // RS Station Mode (enum: 1=Crew Rescue … 7=Standard)
  "RUSSEG000002", // KURS Equipment Set 1 Operating (bool)
  "RUSSEG000003", // KURS Equipment Set 2 Operating (bool)
  "RUSSEG000004", // KURS P1/P2 Failure (bool)
  "RUSSEG000005", // KURS Range (m)
  "RUSSEG000006", // KURS Range Rate (m/s)
  "RUSSEG000007", // KURS-P Test Mode (bool)
  "RUSSEG000008", // KURS-P Capture Signal (bool)
  "RUSSEG000009", // KURS-P Target Acquisition Signal (bool)
  "RUSSEG000010", // KURS-P Functional Mode Signal (bool)
  "RUSSEG000011", // KURS-P Standby Mode (bool)
  "RUSSEG000012", // SM Docking Flag (bool)
  "RUSSEG000013", // SM Forward Docking Port (bool)
  "RUSSEG000014", // SM Aft Docking Port (bool)
  "RUSSEG000015", // SM Nadir (-Y) Docking Port (bool)
  "RUSSEG000016", // FGB Nadir (-Y) Docking Port (bool)
  "RUSSEG000017", // SM Nadir UDM Docking Port (bool)
  "RUSSEG000018", // MRM1 (Rassvet) Docking Port (bool)
  "RUSSEG000019", // MRM2 (Poisk) Docking Port (bool)
  "RUSSEG000020", // Docked Vehicle Hooks Closed (bool)
  "RUSSEG000021", // Active Attitude Mode (enum: 0=Inertial … 7=X-POP)
  "RUSSEG000022", // SM SUDN Controls the Motion — RS master (bool)
  "RUSSEG000023", // SM SUDN Prepared to Free Drift Mode Transition (bool)
  "RUSSEG000024", // Thruster Operation Mode Terminated (0=Ready, 1=Terminated)
  "RUSSEG000025", // Current Dynamic Mode (enum: 0=Reserved … 7=Free Drift)

  // ── Time ──────────────────────────────────────────────────────────────────
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

  function str(id: string): string {
    return channels[id]?.value ?? "";
  }

  // ── Power ──────────────────────────────────────────────────────────────────
  const powerKw = num("USLAB000058");

  const solarArrays = {
    p4: {
      voltage2B:   num("P4000001"),
      current2B:   num("P4000002"),
      voltage4B:   num("P4000004"),
      current4B:   num("P4000005"),
      bgaRotation: num("P4000007"),
      bgaIncidence: num("P4000008"),
    },
    p6: {
      voltage2B:   num("P6000001"),
      current2B:   num("P6000002"),
      voltage4B:   num("P6000004"),
      current4B:   num("P6000005"),
      bgaRotation: num("P6000007"),
      bgaIncidence: num("P6000008"),
    },
    s4: {
      voltage2A:   num("S4000001"),
      current2A:   num("S4000002"),
      voltage4A:   num("S4000004"),
      current4A:   num("S4000005"),
      bgaRotation: num("S4000007"),
      bgaIncidence: num("S4000008"),
    },
    s6: {
      voltage2A:   num("S6000001"),
      current2A:   num("S6000002"),
      voltage4A:   num("S6000004"),
      current4A:   num("S6000005"),
      bgaRotation: num("S6000007"),
      bgaIncidence: num("S6000008"),
    },
    // Note: S0000003 is STARBOARD per README; S0000004 is PORT
    starboardSarj: num("S0000003"),
    portSarj:      num("S0000004"),
    portSarjMode:      str("S0000008"),
    starboardSarjMode: str("S0000009"),
  };

  // ── Thermal ────────────────────────────────────────────────────────────────
  const moduleTemps = {
    node1Cabin:     num("NODE1000001"),
    node2MtlCoolant: num("NODE2000001"),
    node2LtlCoolant: num("NODE2000002"),
    node2Ccaa:      str("NODE2000003"),
    node2Cabin:     num("NODE2000006"),
    node2Avionics:  num("NODE2000007"),
    node3MtlCoolant: num("NODE3000017"),
    node3LtlCoolant: num("NODE3000019"),
    node3Ccaa:      str("NODE3000018"),
    node3Avionics:  num("NODE3000012"),
    node3Cabin:     num("NODE3000013"),
    uslabCabin:     num("USLAB000059"),
    uslabAvionics:  num("USLAB000060"),
    uslabCabinAir:  num("USLAB000061"),
    uslabCcaa1:     str("USLAB000064"),
    uslabCcaa2:     str("USLAB000065"),
    destinyLtlPercent: num("USLAB000056"),
    destinyMtlPercent: num("USLAB000057"),
  };

  // Derive average cabin temperature from available module readings
  const tempValues = [
    moduleTemps.node1Cabin,
    moduleTemps.node2Cabin,
    moduleTemps.node3Cabin,
    moduleTemps.uslabCabin,
  ].filter((v) => v !== 0);
  const temperatureC =
    tempValues.length > 0
      ? tempValues.reduce((a, b) => a + b, 0) / tempValues.length
      : 0;

  const externalThermal = {
    loopAFlow:        num("S1000001"),
    loopAPressure:    num("S1000002"),
    loopARadiatorTemp: num("S1000003"),
    loopBFlow:        num("P1000001"),
    loopBPressure:    num("P1000002"),
    loopBRadiatorTemp: num("P1000003"),
    trrjStarboard:    num("S0000001"),
    trrjPort:         num("S0000002"),
    trrjLoopAMode:    str("S0000007"),
    trrjLoopBMode:    str("S0000006"),
  };

  // ── Atmosphere / ECLSS ─────────────────────────────────────────────────────
  // Partial pressures from NODE3000001-003 (mmHg)
  const o2Mmhg  = num("NODE3000001");
  const n2Mmhg  = num("NODE3000002");
  const co2Mmhg = num("NODE3000003");

  // Derive total pressure and percentages from partial pressures
  const totalMmhg = o2Mmhg + n2Mmhg + co2Mmhg;
  const totalKpa = totalMmhg * 0.133322;
  const oxygenPercent = totalMmhg > 0 ? (o2Mmhg / totalMmhg) * 100 : 0;
  const co2Percent    = totalMmhg > 0 ? (co2Mmhg / totalMmhg) * 100 : 0;
  // Keep pressurePsi for backward compat (derived from mmHg)
  const pressurePsi   = totalMmhg * 0.0193368;

  const eclss = {
    o2Mmhg,
    n2Mmhg,
    co2Mmhg,
    totalMmhg,
    totalKpa,
    uslabO2Mmhg:       num("USLAB000053"),
    uslabN2Mmhg:       num("USLAB000054"),
    uslabCo2Mmhg:      num("USLAB000055"),
    cleanWaterPercent:  num("NODE3000009"),
    wasteWaterPercent:  num("NODE3000008"),
    urinePercent:       num("NODE3000005"),
    upaStatus:          str("NODE3000004"),
    wpaStatus:          str("NODE3000006"),
    ogsStatus:          str("NODE3000010"),
    o2GenRate:          num("NODE3000011"),
  };

  // ── Attitude / CMG ─────────────────────────────────────────────────────────
  const gncModeRaw = num("USLAB000012");
  const GNC_MODES = [
    "Default", "Wait", "Standby", "CMG Attitude Control",
    "CMG Thruster Assist", "User Data Gen", "Free Drift",
  ];
  const gncMode = GNC_MODES[gncModeRaw] ?? `Unknown (${gncModeRaw})`;

  const stationModeRaw = num("USLAB000086");
  const stationModeFlags: string[] = [];
  if (stationModeRaw & 1)  stationModeFlags.push("Standard");
  if (stationModeRaw & 2)  stationModeFlags.push("Microgravity");
  if (stationModeRaw & 4)  stationModeFlags.push("Reboost");
  if (stationModeRaw & 8)  stationModeFlags.push("Proximity Ops");
  if (stationModeRaw & 16) stationModeFlags.push("External Ops");
  if (stationModeRaw & 32) stationModeFlags.push("Survival");
  if (stationModeRaw & 64) stationModeFlags.push("ASCR");
  const stationMode = stationModeFlags.length > 0 ? stationModeFlags.join(", ") : "Standard";

  // Nav source (USLAB000013): 0=None, 1=GPS 1, 2=GPS 2, 3=Russian, 4=Ku Band
  const NAV_SOURCES: Record<string, string> = {
    "0": "None", "1": "GPS 1", "2": "GPS 2", "3": "Russian", "4": "Ku Band",
  };
  // Control type (USLAB000016): 0=Attitude Hold, 1=Momentum Management
  const CONTROL_TYPES: Record<string, string> = {
    "0": "Attitude Hold", "1": "Momentum Mgmt",
  };
  // Reference frame (USLAB000017): 0=LVLH, 1=J2000, 2=XPOP
  const REF_FRAMES: Record<string, string> = {
    "0": "LVLH", "1": "J2000", "2": "XPOP",
  };

  const navSourceRaw = str("USLAB000013").trim();
  const controlTypeRaw = str("USLAB000016").trim();
  const refFrameRaw = str("USLAB000017").trim();

  const attitude = {
    gncMode,
    navSource:    NAV_SOURCES[navSourceRaw] ?? navSourceRaw,
    controlType:  CONTROL_TYPES[controlTypeRaw] ?? controlTypeRaw,
    refFrame:     REF_FRAMES[refFrameRaw] ?? refFrameRaw,
    stationMode,
    quaternion: {
      w: num("USLAB000018"),
      x: num("USLAB000019"),
      y: num("USLAB000020"),
      z: num("USLAB000021"),
    },
    roll:          num("USLAB000022"),
    pitch:         num("USLAB000023"),
    yaw:           num("USLAB000024"),
    rollRateErr:   num("USLAB000025"),
    pitchRateErr:  num("USLAB000026"),
    yawRateErr:    num("USLAB000027"),
    cmdTorqueRoll:  num("USLAB000006"),
    cmdTorquePitch: num("USLAB000007"),
    cmdTorqueYaw:   num("USLAB000008"),
    momentumSaturation: num("USLAB000009"),     // absolute Nms
    momentumPercent:    num("USLAB000010"),     // direct from NASA (%)
    momentumCapacity:   num("USLAB000038"),     // total capacity (Nms)
    desatInhibited:     num("USLAB000011") === 1, // 1 = inhibited
    maneuverInProgress: num("USLAB000081") === 1,
    betaAngle:          num("USLAB000040"),     // degrees (direct from NASA)
    issMassKg:          num("USLAB000039"),
    stationAlarm:  num("USLAB000041"),
    gyroAlarm:     num("USLAB000042"),
    gps1Status:    str("USLAB000043"),
    gps2Status:    str("USLAB000044"),
  };

  // CMGs 1-4: index maps to CMG number - 1
  // Spin motor temp channels: USLAB000045,047,049,051 (CMG 1-4)
  // Hall resolver temp channels: USLAB000046,048,050,052 (CMG 1-4)
  const cmgs = [1, 2, 3, 4].map((n) => {
    const motorTempId    = `USLAB${String(43 + (n - 1) * 2 + 2).padStart(6, "0")}`; // 45,47,49,51
    const resolverTempId = `USLAB${String(43 + (n - 1) * 2 + 3).padStart(6, "0")}`; // 46,48,50,52
    return {
      on:               num(`USLAB${String(n).padStart(6, "0")}`) !== 0,
      spinRate:         num(`Z1${String(8 + n).padStart(6, "0")}`),
      vibration:        num(`Z1${String(n).padStart(6, "0")}`),
      wheelCurrent:     num(`Z1${String(4 + n).padStart(6, "0")}`),
      spinMotorTemp:    num(motorTempId),
      hallResolverTemp: num(resolverTempId),
    };
  });

  // Derive attitudeMode from GNC mode and CMG spin rates
  const activeCmgs = cmgs.filter((c) => Math.abs(c.spinRate) > 100).length;
  const attitudeMode =
    gncMode !== "Default" && gncMode !== "Unknown" ? gncMode
    : activeCmgs >= 3 ? "CMG"
    : activeCmgs >= 1 ? "CMG (partial)"
    : "THRUSTER";

  // ── Airlock / EVA ──────────────────────────────────────────────────────────
  const airlock = {
    emu1O2Pressure:   num("AIRLOCK000001"),
    emu1O2Current:    num("AIRLOCK000002"),
    emu2O2Pressure:   num("AIRLOCK000003"),
    emu2O2Current:    num("AIRLOCK000004"),
    emu3O2Pressure:   num("AIRLOCK000005"),
    emu3O2Current:    num("AIRLOCK000006"),
    emu1SecO2Pressure: num("AIRLOCK000007"),
    emu1SecO2Current:  num("AIRLOCK000008"),
    emu2SecO2Pressure: num("AIRLOCK000009"),
    emu2SecO2Current:  num("AIRLOCK000010"),
    crewLockPump:        str("AIRLOCK000047"),
    crewLockPressureMmhg: num("AIRLOCK000049"),
    hiO2ValvePosition:   str("AIRLOCK000050"),
    loO2ValvePosition:   str("AIRLOCK000051"),
    n2ValvePosition:     str("AIRLOCK000052"),
    acState:             str("AIRLOCK000053"),
    equipLockPressureMmhg: num("AIRLOCK000054"),
    o2HighTank:       num("AIRLOCK000055"),
    o2LowTank:        num("AIRLOCK000056"),
    n2Tank:           num("AIRLOCK000057"),
  };

  // ── Communications (CATO) ──────────────────────────────────────────────────
  const comms = {
    sband1Azimuth:   num("S1000004"),
    sband1Elevation: num("S1000005"),
    sband1On:        num("S1000009") === 1,
    sband2Azimuth:   num("P1000004"),
    sband2Elevation: num("P1000005"),
    sband2On:        num("P1000007") === 1,
    activeSband:     str("USLAB000092"),
    kuTransmitOn:    num("Z1000013") === 1,
    kuElevation:     num("Z1000014"),
    kuCrossElevation: num("Z1000015"),
    uhf1Power:       str("USLAB000099"),
    uhf2Power:       str("USLAB000100"),
    videoChannel1:   num("USLAB000088") > 0,
    videoChannel2:   num("USLAB000089") > 0,
    videoChannel3:   num("USLAB000090") > 0,
    videoChannel4:   num("USLAB000091") > 0,
  };

  // ── Destiny lab vacuum systems (VRS / VES) ────────────────────────────────
  const lab = {
    vrsValvePosition: str("USLAB000062"),
    vesValvePosition: str("USLAB000063"),
  };

  // ── Canadarm2 (SSRMS) ──────────────────────────────────────────────────────
  const robotics = {
    ssrms: {
      baseLocation:   str("CSASSRMS002"),
      operatingBase:  str("CSASSRMS003"),
      shoulderRoll:   num("CSASSRMS004"),
      shoulderYaw:    num("CSASSRMS005"),
      shoulderPitch:  num("CSASSRMS006"),
      elbowPitch:     num("CSASSRMS007"),
      wristPitch:     num("CSASSRMS008"),
      wristYaw:       num("CSASSRMS009"),
      wristRoll:      num("CSASSRMS010"),
      tipLeeStatus:   str("CSASSRMS011"),
    },
    mtPosition: num("CSAMT000001"),
  };

  return {
    timestamp: Date.now(),
    powerKw,
    solarArrays,
    temperatureC,
    moduleTemps,
    externalThermal,
    pressurePsi,
    oxygenPercent,
    co2Percent,
    eclss,
    attitudeMode,
    attitude,
    cmgs,
    airlock,
    comms,
    lab,
    robotics,
    channels,
  };
}
