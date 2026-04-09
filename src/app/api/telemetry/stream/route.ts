export const dynamic = "force-dynamic";

import { initializeSchema } from "@/lib/db";
import { TelemetryCache } from "@/lib/telemetry/cache";
import { SseManager } from "@/lib/telemetry/sse-manager";
import { pollTle, getCurrentTle } from "@/lib/pollers/tle-poller";
import { propagateFromTle } from "@/lib/pollers/sgp4-propagator";
import { pollSolarActivity } from "@/lib/pollers/solar";
import { pollSchedule } from "@/lib/pollers/schedule-poller";
import { archiveOrbitalState, archiveSolar, archiveTelemetryChannel, pruneOldData, upsertEvent, activateScheduledEvents, getCurrentActiveEvent } from "@/lib/db";
import { connectLightstreamer, deriveTelemetry, getLatestChannels } from "@/lib/telemetry/lightstreamer-client";
import {
  TLE_POLL_INTERVAL_MS,
  SGP4_TICK_INTERVAL_MS,
  SOLAR_POLL_INTERVAL_MS,
  SCHEDULE_POLL_INTERVAL_MS,
  SSE_BROADCAST_INTERVAL_MS,
  VISITOR_COUNT_INTERVAL_MS,
} from "@/lib/constants";

const TELEMETRY_ARCHIVE_INTERVAL_MS = 10_000; // Archive Lightstreamer data every 10s
const PRUNE_INTERVAL_MS = 24 * 60 * 60 * 1000; // Run prune daily
const PRUNE_RETENTION_DAYS = 30;

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
  let lsUpdateCount = 0;
  connectLightstreamer((channels) => {
    cache.telemetry = deriveTelemetry(channels);
    lsUpdateCount++;
    if (lsUpdateCount <= 3 || lsUpdateCount % 100 === 0) {
      const keys = Object.keys(channels);
      console.log(`[lightstreamer] Update #${lsUpdateCount}: ${keys.length} channels, latest: ${keys.slice(-3).join(", ")}`);
    }
  }).then((connected) => {
    if (connected) {
      console.log("[stream] Lightstreamer connected successfully");
    } else {
      console.warn("[stream] Lightstreamer could not connect — ISS Systems panel will show 'Awaiting telemetry'");
    }
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

  // 6. Archive Lightstreamer telemetry every 10 seconds
  setInterval(() => {
    const channels = getLatestChannels();
    const keys = Object.keys(channels);
    if (keys.length === 0) return;

    const ts = Date.now();
    for (const channelId of keys) {
      const ch = channels[channelId];
      archiveTelemetryChannel(ts, channelId, ch.value, ch.status).catch(() => {});
    }
  }, TELEMETRY_ARCHIVE_INTERVAL_MS);

  // 7. Prune old data daily (keep 30 days)
  const runPrune = () => {
    pruneOldData(PRUNE_RETENTION_DAYS)
      .then((deleted) => {
        if (deleted > 0) console.log(`[prune] Removed ${deleted} old rows (>${PRUNE_RETENTION_DAYS}d)`);
      })
      .catch((err) => console.error("[prune] Failed:", err.message ?? err));
  };
  // Run once on startup (delayed 30s to let schema init finish), then daily
  setTimeout(runPrune, 30_000);
  setInterval(runPrune, PRUNE_INTERVAL_MS);

  // 8. Schedule poller: fetch ISS events from Space Devs, upsert, activate/complete
  const runSchedulePoll = () => {
    pollSchedule()
      .then(async (events) => {
        if (events.length > 0) {
          let upserted = 0;
          for (const event of events) {
            try {
              await upsertEvent(event);
              upserted++;
            } catch (err) {
              console.error("[schedule] upsertEvent failed:", err);
            }
          }
          console.log(`[schedule] Fetched ${events.length} ISS events, upserted ${upserted}`);
        } else {
          console.log("[schedule] No ISS events returned from Space Devs");
        }

        // Transition scheduled → active → completed based on time
        const changed = await activateScheduledEvents().catch((err) => {
          console.error("[schedule] activateScheduledEvents failed:", err);
          return 0;
        });
        if (changed > 0) {
          console.log(`[schedule] ${changed} event(s) transitioned status`);
        }

        // Update cache with the current active event (if any)
        const activeEvent = await getCurrentActiveEvent().catch(() => null);
        cache.activeEvent = activeEvent;
      })
      .catch((err) => {
        console.error("[schedule] Poll failed:", err);
      });
  };

  runSchedulePoll();
  setInterval(runSchedulePoll, SCHEDULE_POLL_INTERVAL_MS);

  // 9. Broadcast full telemetry payload on interval
  setInterval(() => {
    sseManager.broadcast("telemetry", cache.getPayload());
  }, SSE_BROADCAST_INTERVAL_MS);

  // 10. Visitor count broadcast
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
