export const dynamic = "force-dynamic";

import { type NextRequest, NextResponse } from "next/server";
import { getCurrentTle } from "@/lib/pollers/tle-poller";
import { predictPasses } from "@/lib/pollers/pass-predictor";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;

  const latStr = searchParams.get("lat");
  const lonStr = searchParams.get("lon");

  if (!latStr || !lonStr) {
    return NextResponse.json(
      { error: "Missing required query parameters: lat, lon" },
      { status: 400 }
    );
  }

  const lat = parseFloat(latStr);
  const lon = parseFloat(lonStr);

  if (isNaN(lat) || isNaN(lon)) {
    return NextResponse.json(
      { error: "Invalid lat/lon values — must be numeric" },
      { status: 400 }
    );
  }

  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    return NextResponse.json(
      { error: "lat must be -90 to 90 and lon must be -180 to 180" },
      { status: 400 }
    );
  }

  const tle = getCurrentTle();
  if (!tle) {
    return NextResponse.json(
      { error: "TLE data not yet available" },
      { status: 503 }
    );
  }

  try {
    const passes = predictPasses(tle, lat, lon);
    return NextResponse.json(passes);
  } catch (err) {
    console.error("[passes] predictPasses error:", err);
    return NextResponse.json(
      { error: "Failed to compute pass predictions" },
      { status: 500 }
    );
  }
}
