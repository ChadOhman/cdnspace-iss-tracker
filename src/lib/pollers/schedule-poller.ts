/**
 * Space Devs Launch Library 2 – ISS Schedule Poller
 *
 * Fetches upcoming ISS events from the Space Devs API and returns them
 * as ISSEvent objects ready to be upserted into the database.
 */

import type { ISSEvent, EventType } from "@/lib/types";

const SPACE_DEVS_URL =
  "https://ll.thespacedevs.com/2.2.0/event/upcoming/?format=json&limit=20";

// Space Devs event type IDs and their mapping to our EventType
const TYPE_MAP: Record<number, EventType> = {
  2: "docking",
  3: "eva",
  8: "undocking",
  4: "maneuver",
  6: "maneuver",
  12: "maneuver",
  13: "maneuver",
  15: "maneuver",
  25: "maneuver",
  29: "maneuver",
};

// Only process events whose Space Devs type ID appears in our map
const RELEVANT_TYPE_IDS = new Set(Object.keys(TYPE_MAP).map(Number));

// ─── Space Devs API shape ─────────────────────────────────────────────────────

interface SpaceDevsEventType {
  id: number;
  name: string;
}

interface SpaceDevsSpacestation {
  id: number;
  name: string;
}

interface SpaceDevsEvent {
  id: number;
  name: string;
  type: SpaceDevsEventType;
  date: string;
  description: string | null;
  location: string | null;
  news_url: string | null;
  video_url: string | null;
  spacestations?: SpaceDevsSpacestation[];
}

interface SpaceDevsResponse {
  count: number;
  results: SpaceDevsEvent[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isIssRelated(event: SpaceDevsEvent): boolean {
  const loc = event.location ?? "";
  if (/International Space Station|ISS/i.test(loc)) return true;

  if (Array.isArray(event.spacestations)) {
    return event.spacestations.some((ss) =>
      /International Space Station|ISS/i.test(ss.name)
    );
  }

  return false;
}

function mapEvent(result: SpaceDevsEvent): ISSEvent {
  const type: EventType = TYPE_MAP[result.type.id] ?? "maneuver";

  const startMs = new Date(result.date).getTime();
  const endMs = startMs + 2 * 60 * 60 * 1000; // +2 hours estimated duration

  const rawDesc = result.description ?? "";
  const description = rawDesc.length > 500 ? rawDesc.slice(0, 497) + "..." : rawDesc;

  const metadata: Record<string, string> = {
    spaceDevsType: result.type.name,
  };
  if (result.news_url) metadata.sourceUrl = result.news_url;
  if (result.video_url) metadata.videoUrl = result.video_url;

  return {
    id: `spacedevs-${result.id}`,
    type,
    title: result.name,
    description,
    status: "scheduled",
    scheduledStart: startMs,
    scheduledEnd: endMs,
    actualStart: null,
    actualEnd: null,
    metadata,
  };
}

// ─── Main poller ──────────────────────────────────────────────────────────────

/**
 * Fetch upcoming ISS events from The Space Devs Launch Library 2 API.
 * Filters to ISS-related events with relevant type IDs.
 * Returns an empty array on any error.
 */
export async function pollSchedule(): Promise<ISSEvent[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);

  try {
    const res = await fetch(SPACE_DEVS_URL, {
      signal: controller.signal,
      headers: {
        "User-Agent": "cdnspace-iss-tracker/1.0 (https://github.com/cdnspace/iss-tracker)",
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      console.error(`[schedule-poller] HTTP ${res.status} ${res.statusText}`);
      return [];
    }

    const data = (await res.json()) as SpaceDevsResponse;

    const events = (data.results ?? [])
      .filter((r) => RELEVANT_TYPE_IDS.has(r.type.id) && isIssRelated(r))
      .map(mapEvent);

    return events;
  } catch (err) {
    console.error("[schedule-poller] Fetch failed:", err);
    return [];
  } finally {
    clearTimeout(timeout);
  }
}
