/**
 * NOAA SWPC Space Weather Poller
 * Ported from the Artemis tracker pattern.
 *
 * Fetches geomagnetic Kp index, X-ray flux, and proton flux from NOAA SWPC
 * and derives a crew radiation risk level.
 */

import {
  NOAA_KP_URL,
  NOAA_XRAY_URL,
  NOAA_PROTON_URL,
} from "@/lib/constants";
import type { SolarActivity, RadiationRisk } from "@/lib/types";

// ─── Classification helpers ──────────────────────────────────────────────────

/**
 * Classify a Kp geomagnetic index into a human-readable label.
 * <4 → "Quiet", 4–5 → "Active", 5–7 → "Storm", ≥7 → "Severe Storm"
 */
export function classifyKp(kp: number): string {
  if (kp >= 7) return "Severe Storm";
  if (kp >= 5) return "Storm";
  if (kp >= 4) return "Active";
  return "Quiet";
}

/**
 * Classify an X-ray flux (W/m²) into a GOES solar flare class letter.
 * <1e-7 → "A", <1e-6 → "B", <1e-5 → "C", <1e-4 → "M", else → "X"
 */
export function classifyXray(flux: number): string {
  if (flux < 1e-7) return "A";
  if (flux < 1e-6) return "B";
  if (flux < 1e-5) return "C";
  if (flux < 1e-4) return "M";
  return "X";
}

/**
 * Derive crew radiation risk level from three sensor inputs.
 *
 * @param kp            - Kp geomagnetic index
 * @param proton10MeV   - Proton flux at ≥10 MeV (pfu)
 * @param xrayFlux      - X-ray flux (W/m²)
 * @returns "severe" | "high" | "moderate" | "low"
 */
export function classifyRadiationRisk(
  kp: number,
  proton10MeV: number,
  xrayFlux: number
): RadiationRisk {
  if (kp >= 7 || proton10MeV >= 100 || xrayFlux >= 1e-4) return "severe";
  if (kp >= 5 || proton10MeV >= 10 || xrayFlux >= 1e-5) return "high";
  if (kp >= 4 || proton10MeV >= 1 || xrayFlux >= 1e-6) return "moderate";
  return "low";
}

// ─── Internal NOAA response shapes ───────────────────────────────────────────

type KpEntry = [string, string]; // [time_tag, kp_index]

interface XrayEntry {
  time_tag: string;
  flux: number;
  energy: string;
}

interface ProtonEntry {
  time_tag: string;
  flux: number;
  energy: string;
}

// ─── Poller ──────────────────────────────────────────────────────────────────

/**
 * Fetch space weather data from three NOAA SWPC endpoints in parallel.
 * Returns a SolarActivity snapshot, or null on any unrecoverable error.
 */
export async function pollSolarActivity(): Promise<SolarActivity | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);

  try {
    const [kpRes, xrayRes, protonRes] = await Promise.all([
      fetch(NOAA_KP_URL, { signal: controller.signal }),
      fetch(NOAA_XRAY_URL, { signal: controller.signal }),
      fetch(NOAA_PROTON_URL, { signal: controller.signal }),
    ]);

    const [kpData, xrayData, protonData]: [
      KpEntry[],
      XrayEntry[],
      ProtonEntry[]
    ] = await Promise.all([
      kpRes.json(),
      xrayRes.json(),
      protonRes.json(),
    ]);

    // ── Kp: last non-header entry ─────────────────────────────────────────
    // NOAA returns an array where index 0 is a header row; real data follows.
    const kpEntries = kpData.filter((row) => row[0] !== "time_tag");
    const latestKp = kpEntries[kpEntries.length - 1];
    const kpIndex = parseFloat(latestKp?.[1] ?? "0");

    // ── X-ray: last entry with flux (short-wavelength 0.1–0.8 nm band) ───
    const xrayEntries = xrayData.filter(
      (e) => e.energy === "0.1-0.8nm" && typeof e.flux === "number"
    );
    const latestXray = xrayEntries[xrayEntries.length - 1];
    const xrayFlux = latestXray?.flux ?? 0;

    // ── Proton: separate channels by energy band ──────────────────────────
    const latestProton1 = protonData
      .filter((e) => e.energy === ">=1 MeV")
      .at(-1);
    const latestProton10 = protonData
      .filter((e) => e.energy === ">=10 MeV")
      .at(-1);
    const latestProton100 = protonData
      .filter((e) => e.energy === ">=100 MeV")
      .at(-1);

    const protonFlux1MeV = latestProton1?.flux ?? 0;
    const protonFlux10MeV = latestProton10?.flux ?? 0;
    const protonFlux100MeV = latestProton100?.flux ?? 0;

    const kpLabel = classifyKp(kpIndex);
    const xrayClass = classifyXray(xrayFlux);
    const radiationRisk = classifyRadiationRisk(kpIndex, protonFlux10MeV, xrayFlux);

    return {
      timestamp: Date.now(),
      kpIndex,
      kpLabel,
      xrayFlux,
      xrayClass,
      protonFlux1MeV,
      protonFlux10MeV,
      protonFlux100MeV,
      radiationRisk,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
