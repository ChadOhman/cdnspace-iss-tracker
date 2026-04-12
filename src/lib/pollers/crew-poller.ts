/**
 * ISS Crew Roster Poller
 *
 * Fetches the current ISS crew from the Corquaid People-in-Space API
 * (a community-maintained, regularly updated static JSON on GitHub Pages).
 * Falls back to hardcoded data in src/data/iss-modules.ts if the fetch fails.
 */

import type { CrewMember } from "@/lib/types";
import { CURRENT_CREW, CURRENT_EXPEDITION } from "@/data/iss-modules";

const CREW_API_URL =
  "https://corquaid.github.io/international-space-station-APIs/JSON/people-in-space.json";

/** Shape of each person in the Corquaid API response */
interface CorquaidPerson {
  name: string;
  country: string;
  flag_code: string;
  agency: string;
  position: string;
  spacecraft: string;
  iss: boolean;
  url?: string;
  image?: string;
}

interface CorquaidResponse {
  number: number;
  iss_expedition: string;
  people: CorquaidPerson[];
}

export interface CrewRoster {
  expedition: number;
  crew: CrewMember[];
}

/** Normalize agency names from the API to the short labels used in the UI */
function normalizeAgency(agency: string): string {
  const map: Record<string, string> = {
    NASA: "NASA",
    Roscosmos: "RSA",
    ESA: "ESA",
    JAXA: "JAXA",
    CSA: "CSA",
    CMSA: "CMSA",
    SpaceX: "SpaceX",
  };
  return map[agency] ?? agency;
}

/** Normalize role/position from the API to compact abbreviations */
function normalizeRole(position: string): string {
  const lower = position.toLowerCase();
  if (lower.includes("commander")) return "CDR";
  if (lower.includes("pilot")) return "PLT";
  return "FE";
}

/**
 * Fetch the current ISS crew roster from the Corquaid API.
 * Returns null on failure (caller should keep using previously cached data).
 */
export async function pollCrew(): Promise<CrewRoster | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);

  try {
    const res = await fetch(CREW_API_URL, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "ISS-Tracker/1.0 (https://iss.cdnspace.ca; contact@cdnspace.ca)",
      },
    });

    if (!res.ok) {
      console.error(`[crew] API returned ${res.status}`);
      return null;
    }

    const data = (await res.json()) as CorquaidResponse;

    // Filter to ISS crew only (excludes Tiangong, etc.)
    const issCrew = data.people.filter((p) => p.iss);

    if (issCrew.length === 0) {
      console.warn("[crew] API returned 0 ISS crew members — ignoring");
      return null;
    }

    const expedition = parseInt(data.iss_expedition, 10) || CURRENT_EXPEDITION;

    const crew: CrewMember[] = issCrew.map((p) => ({
      name: p.name,
      role: normalizeRole(p.position),
      agency: normalizeAgency(p.agency),
      nationality: (p.flag_code ?? p.country ?? "").toLowerCase(),
      expedition,
      spacecraft: p.spacecraft,
      photo: p.image,
    }));

    console.log(
      `[crew] Fetched ${crew.length} ISS crew members (Expedition ${expedition})`
    );
    return { expedition, crew };
  } catch (err) {
    if ((err as Error).name === "AbortError") {
      console.error("[crew] Fetch timed out");
    } else {
      console.error("[crew] Fetch failed:", (err as Error).message ?? err);
    }
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

/** Return the hardcoded fallback roster */
export function getFallbackRoster(): CrewRoster {
  return { expedition: CURRENT_EXPEDITION, crew: CURRENT_CREW };
}
