export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getCurrentTle } from "@/lib/pollers/tle-poller";
import { propagateFromTle } from "@/lib/pollers/sgp4-propagator";

export async function GET() {
  const tle = getCurrentTle();
  if (!tle) {
    return NextResponse.json(
      { error: "TLE data not yet available" },
      { status: 503 }
    );
  }

  const orbital = propagateFromTle(tle, new Date());
  if (!orbital) {
    return NextResponse.json(
      { error: "Could not propagate orbital state from current TLE" },
      { status: 500 }
    );
  }

  return NextResponse.json(orbital);
}
