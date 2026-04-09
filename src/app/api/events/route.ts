export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getActiveEvents, getUpcomingEvents } from "@/lib/db";

export async function GET() {
  try {
    const [active, upcoming] = await Promise.all([
      getActiveEvents(),
      getUpcomingEvents(5),
    ]);

    return NextResponse.json({ active, upcoming });
  } catch (err) {
    console.error("[events] query error:", err);
    return NextResponse.json(
      { error: "Failed to fetch events" },
      { status: 500 }
    );
  }
}
