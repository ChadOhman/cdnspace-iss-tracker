export const dynamic = "force-dynamic";

import { type NextRequest, NextResponse } from "next/server";
import { getSnapshotAt } from "@/lib/db";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;

  const timestampStr = searchParams.get("timestamp");
  if (!timestampStr) {
    return NextResponse.json(
      { error: "Missing required query parameter: timestamp" },
      { status: 400 }
    );
  }

  const ms = Date.parse(timestampStr);
  if (isNaN(ms)) {
    return NextResponse.json(
      { error: "Invalid timestamp — must be a valid ISO 8601 date string" },
      { status: 400 }
    );
  }

  try {
    const snapshot = await getSnapshotAt(ms);
    return NextResponse.json(snapshot);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    if (message.includes("No orbital state found")) {
      return NextResponse.json({ error: message }, { status: 404 });
    }
    console.error("[snapshot] query error:", err);
    return NextResponse.json(
      { error: "Failed to fetch snapshot" },
      { status: 500 }
    );
  }
}
