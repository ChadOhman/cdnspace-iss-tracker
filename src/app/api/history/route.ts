export const dynamic = "force-dynamic";

import { type NextRequest, NextResponse } from "next/server";
import { getMetricHistory } from "@/lib/db";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;

  const metric = searchParams.get("metric");
  const hoursStr = searchParams.get("hours") ?? "24";
  const pointsStr = searchParams.get("points") ?? "200";

  if (!metric) {
    return NextResponse.json(
      { error: "Missing required query parameter: metric" },
      { status: 400 }
    );
  }

  const hours = parseFloat(hoursStr);
  const points = parseInt(pointsStr, 10);

  if (isNaN(hours) || hours <= 0) {
    return NextResponse.json(
      { error: "Invalid hours value — must be a positive number" },
      { status: 400 }
    );
  }

  if (isNaN(points) || points <= 0) {
    return NextResponse.json(
      { error: "Invalid points value — must be a positive integer" },
      { status: 400 }
    );
  }

  try {
    const history = await getMetricHistory(metric, hours, points);
    return NextResponse.json(history);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    // getMetricHistory throws on disallowed column names
    if (message.includes("not allowed")) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    console.error("[history] query error:", err);
    return NextResponse.json(
      { error: "Failed to fetch metric history" },
      { status: 500 }
    );
  }
}
