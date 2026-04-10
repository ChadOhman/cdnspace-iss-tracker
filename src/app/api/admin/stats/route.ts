export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getPageViews } from "@/lib/db";

const ADMIN_TOKEN = process.env.ADMIN_TOKEN ?? "changeme";

function checkAuth(request: NextRequest): boolean {
  const token = request.headers.get("Authorization")?.replace("Bearer ", "");
  return token === ADMIN_TOKEN;
}

export async function GET(request: NextRequest) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const pageViews = await getPageViews();
    return NextResponse.json({ pageViews });
  } catch (err) {
    console.error("[admin-stats] query error:", err);
    return NextResponse.json(
      { error: "Failed to fetch admin stats" },
      { status: 500 }
    );
  }
}
