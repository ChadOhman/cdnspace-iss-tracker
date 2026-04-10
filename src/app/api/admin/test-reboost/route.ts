export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { upsertEvent } from "@/lib/db";
import type { ISSEvent } from "@/lib/types";

const ADMIN_TOKEN = process.env.ADMIN_TOKEN ?? "changeme";

function checkAuth(request: NextRequest): boolean {
  const token = request.headers.get("Authorization")?.replace("Bearer ", "");
  return token === ADMIN_TOKEN;
}

/**
 * Insert a fabricated reboost event for UI verification. Matches the shape
 * the auto-detector writes (same metadata keys), but marked with
 * `source: "manual-test"` so it can be distinguished.
 */
export async function POST(request: NextRequest) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = Date.now();
    // Simulate a 25-minute reboost that started 20 minutes ago
    const start = now - 25 * 60 * 1000;
    const end = now - 5 * 60 * 1000;
    const climbKm = 2.4;
    const apoapsis = 420.3;
    const periapsis = 418.7;

    const eventId = `reboost-test-${Math.floor(start / 1000)}`;
    const event: ISSEvent = {
      id: eventId,
      type: "reboost",
      title: `ISS Reboost (+${climbKm.toFixed(1)} km) [TEST]`,
      description:
        `Manual test reboost inserted from /admin. Orbital altitude raised by ` +
        `${climbKm.toFixed(2)} km over 25 minutes. Apoapsis: ${apoapsis.toFixed(1)} km, ` +
        `periapsis: ${periapsis.toFixed(1)} km.`,
      status: "completed",
      scheduledStart: start,
      scheduledEnd: end,
      actualStart: start,
      actualEnd: end,
      metadata: {
        source: "manual-test",
        climbKm: climbKm.toFixed(2),
        apoapsisKm: apoapsis.toFixed(1),
        periapsisKm: periapsis.toFixed(1),
      },
    };

    await upsertEvent(event);
    return NextResponse.json({ ok: true, eventId });
  } catch (err) {
    console.error("[admin-test-reboost] failed:", err);
    return NextResponse.json(
      { error: "Failed to insert test reboost" },
      { status: 500 }
    );
  }
}
