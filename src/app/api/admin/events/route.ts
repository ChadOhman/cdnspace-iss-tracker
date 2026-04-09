export const dynamic = "force-dynamic";

import { type NextRequest, NextResponse } from "next/server";
import { upsertEvent } from "@/lib/db";
import type { ISSEvent } from "@/lib/types";

function isAuthorized(request: NextRequest): boolean {
  const adminToken = process.env.ADMIN_TOKEN;
  if (!adminToken) return false;

  const authHeader = request.headers.get("Authorization");
  if (!authHeader) return false;

  const [scheme, token] = authHeader.split(" ");
  return scheme === "Bearer" && token === adminToken;
}

async function handleUpsert(request: NextRequest): Promise<NextResponse> {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const event = body as Partial<ISSEvent>;

  if (
    !event.id ||
    !event.type ||
    !event.title ||
    !event.description ||
    !event.status ||
    event.scheduledStart == null ||
    event.scheduledEnd == null
  ) {
    return NextResponse.json(
      {
        error:
          "Missing required fields: id, type, title, description, status, scheduledStart, scheduledEnd",
      },
      { status: 400 }
    );
  }

  const fullEvent: ISSEvent = {
    id: event.id,
    type: event.type,
    title: event.title,
    description: event.description,
    status: event.status,
    scheduledStart: event.scheduledStart,
    scheduledEnd: event.scheduledEnd,
    actualStart: event.actualStart ?? null,
    actualEnd: event.actualEnd ?? null,
    metadata: event.metadata ?? {},
  };

  try {
    await upsertEvent(fullEvent);
    return NextResponse.json({ ok: true, id: fullEvent.id });
  } catch (err) {
    console.error("[admin/events] upsert error:", err);
    return NextResponse.json(
      { error: "Failed to upsert event" },
      { status: 500 }
    );
  }
}

export function POST(request: NextRequest) {
  return handleUpsert(request);
}

export function PUT(request: NextRequest) {
  return handleUpsert(request);
}
