/**
 * ISS Docking Port Poller
 *
 * Fetches currently docked spacecraft from the Corquaid API.
 * Returns null on failure — the caller keeps using previously cached data.
 */

import type { DockedSpacecraft } from "@/lib/types";

const DOCKING_API_URL =
  "https://corquaid.github.io/international-space-station-APIs/JSON/iss-docked-spacecraft.json";

interface CorquaidSpacecraft {
  name: string;
  flag_code: string;
  operator: string;
  docked: number;
  docking_port: string;
  mission_type: "Crew" | "Cargo";
  crew: string[] | null;
  image?: string;
  mission_patch?: string | null;
}

interface CorquaidDockingResponse {
  number: number;
  spacecraft: CorquaidSpacecraft[];
}

export async function pollDocking(): Promise<DockedSpacecraft[] | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);

  try {
    const res = await fetch(DOCKING_API_URL, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "ISS-Tracker/1.0 (https://iss.cdnspace.ca; contact@cdnspace.ca)",
      },
    });

    if (!res.ok) {
      console.error(`[docking] API returned ${res.status}`);
      return null;
    }

    const data = (await res.json()) as CorquaidDockingResponse;

    if (!data.spacecraft || data.spacecraft.length === 0) {
      console.warn("[docking] API returned 0 spacecraft — ignoring");
      return null;
    }

    const vehicles: DockedSpacecraft[] = data.spacecraft.map((s) => ({
      name: s.name,
      port: s.docking_port,
      type: s.mission_type,
      operator: s.operator,
      dockedAt: s.docked * 1000,
      crew: s.crew,
      image: s.image ?? undefined,
      patch: s.mission_patch ?? undefined,
      flagCode: s.flag_code,
    }));

    console.log(
      `[docking] Fetched ${vehicles.length} docked spacecraft`
    );
    return vehicles;
  } catch (err) {
    if ((err as Error).name === "AbortError") {
      console.error("[docking] Fetch timed out");
    } else {
      console.error("[docking] Fetch failed:", (err as Error).message ?? err);
    }
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
