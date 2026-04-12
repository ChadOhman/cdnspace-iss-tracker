/**
 * ISS Crew Roster Poller
 *
 * Fetches the current ISS crew from the Corquaid People-in-Space API
 * (a community-maintained, regularly updated static JSON on GitHub Pages).
 * Then enriches each crew member with a short bio from the Wikipedia API.
 * Returns null on failure — the caller keeps using previously cached data.
 */

import type { CrewMember } from "@/lib/types";

const CREW_API_URL =
  "https://corquaid.github.io/international-space-station-APIs/JSON/people-in-space.json";

const WIKIPEDIA_API_URL =
  "https://en.wikipedia.org/api/rest_v1/page/summary/";

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
 * Extract the Wikipedia article title from a full Wikipedia URL.
 * e.g. "https://en.wikipedia.org/wiki/Jessica_Meir" → "Jessica_Meir"
 */
function wikiTitleFromUrl(url: string): string | null {
  const match = url.match(/wikipedia\.org\/wiki\/(.+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

/**
 * Fetch a short bio extract from the Wikipedia REST API.
 * Uses the page summary endpoint which returns a plain-text extract.
 */
async function fetchWikiBio(titleOrName: string): Promise<string | null> {
  const title = titleOrName.replace(/ /g, "_");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5_000);

  try {
    const res = await fetch(`${WIKIPEDIA_API_URL}${encodeURIComponent(title)}`, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "ISS-Tracker/1.0 (https://iss.cdnspace.ca; contact@cdnspace.ca)",
      },
    });

    if (!res.ok) return null;

    const data = (await res.json()) as { extract?: string };
    return data.extract ?? null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
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

    const expedition = parseInt(data.iss_expedition, 10) || 0;

    // Fetch Wikipedia bios in parallel for all crew members
    const bioResults = await Promise.allSettled(
      issCrew.map((p) => {
        const title = p.url ? wikiTitleFromUrl(p.url) : null;
        return fetchWikiBio(title ?? p.name);
      })
    );

    const crew: CrewMember[] = issCrew.map((p, i) => {
      const bioResult = bioResults[i];
      const bio =
        bioResult.status === "fulfilled" ? bioResult.value : null;

      return {
        name: p.name,
        role: normalizeRole(p.position),
        agency: normalizeAgency(p.agency),
        nationality: (p.flag_code ?? p.country ?? "").toLowerCase(),
        expedition,
        spacecraft: p.spacecraft,
        photo: p.image,
        bio: bio ?? undefined,
      };
    });

    const biosFound = crew.filter((c) => c.bio).length;
    console.log(
      `[crew] Fetched ${crew.length} ISS crew members (Expedition ${expedition}), ${biosFound} bios from Wikipedia`
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

