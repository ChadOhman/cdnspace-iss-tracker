export const dynamic = "force-dynamic";

import { type NextRequest, NextResponse } from "next/server";
import { getCurrentTle } from "@/lib/pollers/tle-poller";
import { predictPasses } from "@/lib/pollers/pass-predictor";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;

  const latStr = searchParams.get("lat");
  const lonStr = searchParams.get("lon");
  const minElevStr = searchParams.get("minElev");

  if (!latStr || !lonStr) {
    return NextResponse.json(
      { error: "Missing required query parameters: lat, lon" },
      { status: 400 }
    );
  }

  const lat = parseFloat(latStr);
  const lon = parseFloat(lonStr);
  // Clamp minElev to a sane 0..45° range; default 10° matches the previous
  // hardcoded behaviour so existing callers get the same results.
  let minElev = 10;
  if (minElevStr !== null && minElevStr !== "") {
    const parsed = parseFloat(minElevStr);
    if (!Number.isNaN(parsed)) {
      minElev = Math.max(0, Math.min(45, parsed));
    }
  }

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
    const passes = predictPasses(tle, lat, lon, 48, minElev);
    return NextResponse.json(passes);
  } catch (err) {
    console.error("[passes] predictPasses error:", err);
    return NextResponse.json(
      { error: "Failed to compute pass predictions" },
      { status: 500 }
    );
  }
}
