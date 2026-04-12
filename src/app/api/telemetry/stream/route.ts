export const dynamic = "force-dynamic";

import { initializeSchema } from "@/lib/db";
import { TelemetryCache } from "@/lib/telemetry/cache";
import { SseManager } from "@/lib/telemetry/sse-manager";
import { pollTle, getCurrentTle } from "@/lib/pollers/tle-poller";
import { propagateFromTle } from "@/lib/pollers/sgp4-propagator";
import { pollSolarActivity } from "@/lib/pollers/solar";
import { pollSchedule } from "@/lib/pollers/schedule-poller";
import { pollCrew } from "@/lib/pollers/crew-poller";
import { archiveOrbitalState, archiveSolar, archiveTelemetryChannel, pruneOldData, upsertEvent, activateScheduledEvents, getCurrentActiveEvent, incrementPageViews } from "@/lib/db";
import { connectLightstreamer, deriveTelemetry, getLatestChannels } from "@/lib/telemetry/lightstreamer-client";
import {
  TLE_POLL_INTERVAL_MS,
  SGP4_TICK_INTERVAL_MS,
  SOLAR_POLL_INTERVAL_MS,
  SCHEDULE_POLL_INTERVAL_MS,
  SSE_BROADCAST_INTERVAL_MS,
  VISITOR_COUNT_INTERVAL_MS,
  CREW_POLL_INTERVAL_MS,
} from "@/lib/constants";

const TELEMETRY_ARCHIVE_INTERVAL_MS = 10_000; // Archive Lightstreamer data every 10s
const PRUNE_INTERVAL_MS = 24 * 60 * 60 * 1000; // Run prune daily
const PRUNE_RETENTION_DAYS = 30;

/**
 * Convert WGS84 geodetic (lat, lon, alt) to geocentric distance |r| in km.
 * Duplicate of the client-side helper in OrbitalParamsPanel; |r| is
 * frame-invariant so the result is directly comparable to NASA's
 * J2000 state-vector magnitude.
 */
function geocentricRadiusKm(latDeg: number, lonDeg: number, altKm: number): number {
  const a = 6378.137;
  const e2 = 0.00669437999014;
  const lat = (latDeg * Math.PI) / 180;
  const lon = (lonDeg * Math.PI) / 180;
  const sinLat = Math.sin(lat);
  const cosLat = Math.cos(lat);
  const N = a / Math.sqrt(1 - e2 * sinLat * sinLat);
  const x = (N + altKm) * cosLat * Math.cos(lon);
  const y = (N + altKm) * cosLat * Math.sin(lon);
  const z = (N * (1 - e2) + altKm) * sinLat;
  return Math.sqrt(x * x + y * y + z * z);
}

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

  // 3. SGP4 tick: propagate position every second, archive every 10th tick.
  // Also maintain a sliding window of altitudes for reboost detection.
  let tickCount = 0;
  // Altitude history: 60 min × 60 samples/min = 3600 entries max (1 Hz)
  const ALTITUDE_WINDOW_MS = 60 * 60 * 1000;
  const altitudeHistory: { t: number; alt: number }[] = [];
  let lastReboostDetection = 0;
  const REBOOST_COOLDOWN_MS = 6 * 60 * 60 * 1000; // don't re-detect for 6h
  const REBOOST_THRESHOLD_KM = 2; // minimum sustained altitude gain

  setInterval(() => {
    const tle = getCurrentTle();
    if (!tle) return;

    const orbital = propagateFromTle(tle, new Date());
    if (!orbital) return;

    cache.orbital = orbital;
    tickCount += 1;

    if (tickCount % 10 === 0) {
      // Pull live-telemetry-sourced extras from the cache so sparklines
      // can chart beta angle, ISS mass, CMG momentum %, and the running
      // GNC state-vector offset between SGP4 and NASA's onboard propagator.
      const attitude = cache.telemetry?.attitude;
      const sv = cache.telemetry?.lab.gncStateVector;
      let gncDeltaRKm: number | null = null;
      let gncDeltaVMs: number | null = null;
      if (sv && (sv.xKm !== 0 || sv.yKm !== 0 || sv.zKm !== 0)) {
        const nasaR = Math.sqrt(sv.xKm * sv.xKm + sv.yKm * sv.yKm + sv.zKm * sv.zKm);
        const nasaV = Math.sqrt(sv.vxMs * sv.vxMs + sv.vyMs * sv.vyMs + sv.vzMs * sv.vzMs);
        const ourR = geocentricRadiusKm(orbital.lat, orbital.lon, orbital.altitude);
        const ourV = orbital.velocity * 1000; // km/s → m/s
        gncDeltaRKm = nasaR - ourR;
        gncDeltaVMs = nasaV - ourV;
      }
      archiveOrbitalState(orbital, {
        betaAngle: attitude?.betaAngle,
        issMassKg: attitude?.issMassKg,
        momentumPercent: attitude?.momentumPercent,
        gncDeltaRKm,
        gncDeltaVMs,
      }).catch((err) => {
        console.error("[stream] Orbital archive failed:", err);
      });
    }

    // Track altitude history (use apoapsis + periapsis mean to smooth the
    // once-per-orbit oscillation; this approximates semi-major axis offset)
    const meanAlt = (orbital.apoapsis + orbital.periapsis) / 2;
    const now = Date.now();
    altitudeHistory.push({ t: now, alt: meanAlt });
    // Trim to window
    while (altitudeHistory.length > 0 && now - altitudeHistory[0].t > ALTITUDE_WINDOW_MS) {
      altitudeHistory.shift();
    }

    // Reboost detection: compare current mean altitude to the minimum mean
    // altitude observed in the past hour. A sustained rise of more than
    // REBOOST_THRESHOLD_KM means the orbit got raised — that's a reboost.
    if (
      tickCount % 60 === 0 && // check once per minute
      altitudeHistory.length > 300 && // need ~5 min of data minimum
      now - lastReboostDetection > REBOOST_COOLDOWN_MS
    ) {
      const minEntry = altitudeHistory.reduce(
        (min, e) => (e.alt < min.alt ? e : min),
        altitudeHistory[0]
      );
      const climb = meanAlt - minEntry.alt;
      // Only flag if the minimum occurred at least 10 min ago (i.e. we're still
      // in the rise phase, not just catching a recent dip).
      const minAge = now - minEntry.t;
      if (climb >= REBOOST_THRESHOLD_KM && minAge > 10 * 60 * 1000) {
        lastReboostDetection = now;
        const eventId = `reboost-${Math.floor(minEntry.t / 1000)}`;
        const event = {
          id: eventId,
          type: "reboost" as const,
          title: `ISS Reboost (+${climb.toFixed(1)} km)`,
          description:
            `Orbital altitude raised by ${climb.toFixed(2)} km over the past ` +
            `${Math.round(minAge / 60000)} minutes. Detected from SGP4-propagated ` +
            `mean altitude. Apoapsis: ${orbital.apoapsis.toFixed(1)} km, ` +
            `periapsis: ${orbital.periapsis.toFixed(1)} km.`,
          status: "completed" as const,
          scheduledStart: minEntry.t,
          scheduledEnd: now,
          actualStart: minEntry.t,
          actualEnd: now,
          metadata: {
            source: "auto-detected",
            climbKm: climb.toFixed(2),
            apoapsisKm: orbital.apoapsis.toFixed(1),
            periapsisKm: orbital.periapsis.toFixed(1),
          },
        };
        upsertEvent(event)
          .then(() =>
            console.log(
              `[reboost] Detected: +${climb.toFixed(2)} km over ${Math.round(minAge / 60000)} min → ${eventId}`
            )
          )
          .catch((err) => console.error("[reboost] upsert failed:", err));
      }
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

  // 9. Crew roster poller: fetch immediately, then every 6 hours
  const runCrewPoll = () => {
    pollCrew()
      .then((roster) => {
        if (roster) {
          cache.crew = roster;
          sseManager.broadcast("crew", roster);
        }
      })
      .catch((err) => {
        console.error("[stream] Crew poll failed:", err);
      });
  };

  runCrewPoll();
  setInterval(runCrewPoll, CREW_POLL_INTERVAL_MS);

  // 11. Broadcast lightweight telemetry payload on interval (no crew/solar/channels)
  setInterval(() => {
    sseManager.broadcast("telemetry", cache.getTickPayload());
  }, SSE_BROADCAST_INTERVAL_MS);

  // 12. Visitor count broadcast
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

      // Increment page view counter on each new connection
      incrementPageViews().catch((err) => {
        console.error("[stream] Page view increment failed:", err.message ?? err);
      });

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
