export const dynamic = "force-dynamic";

import { initializeSchema } from "@/lib/db";
import { TelemetryCache } from "@/lib/telemetry/cache";
import { SseManager } from "@/lib/telemetry/sse-manager";
import { pollTle, getCurrentTle } from "@/lib/pollers/tle-poller";
import { propagateFromTle } from "@/lib/pollers/sgp4-propagator";
import { pollSolarActivity } from "@/lib/pollers/solar";
import { archiveOrbitalState, archiveSolar } from "@/lib/db";
import { connectLightstreamer, deriveTelemetry } from "@/lib/telemetry/lightstreamer-client";
import {
  TLE_POLL_INTERVAL_MS,
  SGP4_TICK_INTERVAL_MS,
  SOLAR_POLL_INTERVAL_MS,
  SSE_BROADCAST_INTERVAL_MS,
  VISITOR_COUNT_INTERVAL_MS,
} from "@/lib/constants";

const cache = new TelemetryCache();
const sseManager = new SseManager();
let pollersStarted = false;

function ensurePollers() {
  if (pollersStarted) return;
  pollersStarted = true;

  // 1. Initialize DB schema
  initializeSchema()
    .then(() => console.log("[stream] DB schema initialized successfully"))
    .catch((err) => {
      console.error("[stream] DB schema init failed:", err.message ?? err);
      console.error("[stream] MYSQL_URL:", process.env.MYSQL_URL ? "(set)" : "(not set, using default)");
    });

  // 2. TLE poller: fetch immediately, then on interval
  pollTle().catch((err) => {
    console.error("[stream] Initial TLE poll failed:", err);
  });
  setInterval(() => {
    pollTle().catch((err) => {
      console.error("[stream] TLE poll failed:", err);
    });
  }, TLE_POLL_INTERVAL_MS);

  // 3. SGP4 tick: propagate position every second, archive every 10th tick
  let tickCount = 0;
  setInterval(() => {
    const tle = getCurrentTle();
    if (!tle) return;

    const orbital = propagateFromTle(tle, new Date());
    if (!orbital) return;

    cache.orbital = orbital;
    tickCount += 1;

    if (tickCount % 10 === 0) {
      archiveOrbitalState(orbital).catch((err) => {
        console.error("[stream] Orbital archive failed:", err);
      });
    }
  }, SGP4_TICK_INTERVAL_MS);

  // 4. Lightstreamer: connect and update cache on callback
  connectLightstreamer((channels) => {
    cache.telemetry = deriveTelemetry(channels);
  }).catch((err) => {
    console.error("[stream] Lightstreamer connect failed:", err);
  });

  // 5. Solar poller: fetch immediately, then on interval
  pollSolarActivity()
    .then((solar) => {
      if (solar) {
        cache.solar = solar;
        sseManager.broadcast("solar", solar);
        archiveSolar(solar).catch((err) => {
          console.error("[stream] Solar archive failed:", err);
        });
      }
    })
    .catch((err) => {
      console.error("[stream] Initial solar poll failed:", err);
    });

  setInterval(() => {
    pollSolarActivity()
      .then((solar) => {
        if (solar) {
          cache.solar = solar;
          sseManager.broadcast("solar", solar);
          archiveSolar(solar).catch((err) => {
            console.error("[stream] Solar archive failed:", err);
          });
        }
      })
      .catch((err) => {
        console.error("[stream] Solar poll failed:", err);
      });
  }, SOLAR_POLL_INTERVAL_MS);

  // 6. Broadcast full telemetry payload on interval
  setInterval(() => {
    sseManager.broadcast("telemetry", cache.getPayload());
  }, SSE_BROADCAST_INTERVAL_MS);

  // 7. Visitor count broadcast
  setInterval(() => {
    const count = sseManager.getClientCount();
    cache.visitorCount = count;
    sseManager.broadcast("visitors", count);
  }, VISITOR_COUNT_INTERVAL_MS);
}

export function GET() {
  ensurePollers();

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      const removeClient = sseManager.addClient(controller);

      // Send the current cached payload immediately on connect
      const initial = cache.getPayload();
      try {
        controller.enqueue(
          encoder.encode(SseManager.encodeEvent("telemetry", initial))
        );
      } catch {
        // client may have already disconnected
      }

      // Return cleanup so the stream close removes the client
      return () => {
        removeClient();
      };
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
