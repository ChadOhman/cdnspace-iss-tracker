export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { pollSolarActivity } from "@/lib/pollers/solar";
import type { SolarActivity } from "@/lib/types";

// Simple in-process cache with 60s TTL
let cached: SolarActivity | null = null;
let cachedAt = 0;
const CACHE_TTL_MS = 60_000;

export async function GET() {
  const now = Date.now();

  if (cached && now - cachedAt < CACHE_TTL_MS) {
    return NextResponse.json(cached);
  }

  const solar = await pollSolarActivity();

  if (!solar) {
    // Return stale cache if available, otherwise 503
    if (cached) {
      return NextResponse.json(cached);
    }
    return NextResponse.json(
      { error: "Solar activity data unavailable" },
      { status: 503 }
    );
  }

  cached = solar;
  cachedAt = now;

  return NextResponse.json(solar);
}
