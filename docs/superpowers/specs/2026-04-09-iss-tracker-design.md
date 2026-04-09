# ISS Tracker Design Spec

**URL:** iss.cdnspace.ca  
**Repo:** github.com/ChadOhman/cdnspace-iss-tracker  
**Date:** 2026-04-09  
**Approach:** Fresh build with cherry-picked patterns from the Artemis II tracker (artemis.cdnspace.ca)

## Overview

A 24/7 real-time ISS dashboard with event mode for spacewalks, dockings, and maneuvers. Built on the same architectural patterns as the Artemis II tracker but purpose-built for ISS in low Earth orbit, with MySQL for persistence and NASA Lightstreamer for live telemetry.

## Tech Stack

- **Framework:** Next.js 16 (App Router), TypeScript 5, React 19
- **Styling:** Tailwind CSS 4, CSS custom properties for theming
- **Visualization:** Three.js (3D globe), Leaflet (2D ground track), HTML5 Canvas (sparklines, timeline Gantt), SVG
- **Database:** MySQL (replacing Artemis's SQLite)
- **Real-time:** SSE broadcast to clients (same pattern as Artemis)
- **Telemetry upstream:** NASA Lightstreamer (`push.lightstreamer.com`, adapter `ISSLIVE`)
- **Orbital mechanics:** SGP4 propagation from CelesTrak TLEs
- **Font:** JetBrains Mono (monospace command-center aesthetic)
- **i18n:** English and French from day one (reuse Artemis i18n pattern)

## Architecture

### Data Pipeline

```
External Sources → Server-side pollers → MySQL (archive) + In-memory cache → SSE broadcast → Browser clients
```

The SSE route (`/api/telemetry/stream`) starts all pollers and manages client subscriptions. A shared TextEncoder encodes each broadcast once for all clients (proven at 1000+ concurrent in Artemis). Auto-reconnect with exponential backoff on the client side.

### Data Sources

| Source | Data Provided | Frequency |
|---|---|---|
| **NASA Lightstreamer** (`ISSLIVE` adapter) | ~297 ISS telemetry channels: power, thermal, atmosphere, attitude, module systems | Real-time push (on value change) |
| **CelesTrak TLEs** | Two-Line Elements for ISS (NORAD 25544) | Every 2 hours |
| **SGP4 propagation** (server-side) | Derived: lat/lon, altitude, speed, ground track, orbital params, day/night, pass predictions | Every 1 second |
| **NOAA SWPC** | Kp index, X-ray flux, proton flux, radiation risk | Every 60 seconds |
| **NASA ISS schedule** | Crew activities, EVA windows, docking events | Every 15 minutes |

The Lightstreamer connection is a persistent WebSocket from the Node.js server — not polled. It subscribes to telemetry channels in `MERGE` mode (push only on change). Fields per channel: `TimeStamp`, `Value`, `Status.Class`, `CalibratedData`. Reference: [github.com/sensedata/space-telemetry](https://github.com/sensedata/space-telemetry) (MIT, uses the same NASA Lightstreamer source).

### MySQL Schema

| Table | Purpose |
|---|---|
| `orbital_state` | Timestamped position/velocity/altitude from SGP4 propagation |
| `tle_history` | TLE archive for historical propagation and SIM mode |
| `space_weather` | NOAA SWPC readings (Kp, X-ray, proton flux) |
| `iss_telemetry` | Lightstreamer channel values (power, thermal, atmosphere, attitude) |
| `events` | Scheduled and active events (EVAs, dockings, reboosts) with `status: scheduled → active → completed` |
| `timeline_activities` | Crew schedule entries (sleep, science, exercise, meals, etc.) |

### API Routes

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/telemetry/stream` | SSE | Real-time firehose: orbital, systems, weather, events, visitor count |
| `/api/orbit` | GET | Current orbital state (position, velocity, altitude, speed) |
| `/api/systems` | GET | Latest ISS systems telemetry from Lightstreamer |
| `/api/passes` | GET | Pass predictions for given lat/lon (query params) |
| `/api/events` | GET | Upcoming and active events |
| `/api/timeline` | GET | Crew schedule / activity timeline |
| `/api/weather` | GET | Current space weather |
| `/api/history` | GET | Downsampled time-series (metric, hours, points params) |
| `/api/snapshot` | GET | Point-in-time snapshot for SIM mode replay (timestamp param) |
| `/api/admin/events` | POST/PUT | Create, update, activate, end events (token-protected) |
| `/api/admin/override` | POST | Manual telemetry overrides (token-protected) |

## Dashboard Layout

Three-column grid layout with top bar and bottom bar, matching the Artemis dashboard pattern. All panels use the `PanelFrame` component (collapsible headers, accent color borders, error boundaries).

### Top Bar (48px)

Real-time orbital quick-glance metrics:
- ISS identifier
- Altitude (km)
- Speed (km/h)
- Latitude / Longitude
- Orbit count
- Orbital period
- UTC clock

### Left Column (35%)

1. **Ground Track Map** — Leaflet 2D map with sinusoidal ground track (past orbit + predicted path). Toggle to Three.js 3D globe showing ISS position, orbit path, and day/night terminator. ISS marker with real-time position updates.
2. **Orbital Parameters** — Apoapsis, periapsis, inclination, eccentricity, period, revolution count. Sparklines for altitude and speed history.
3. **Space Weather** — Kp index, X-ray flux, proton flux, radiation risk classification. Direct port from Artemis NOAA SWPC poller.
4. **Next Visible Passes** — Geolocated pass predictions with max elevation, visual magnitude, and quality rating (Bright/Good/Fair). User can set or change their location. Computed server-side via SGP4.

### Center Column (40%)

1. **Live Video** — Embedded NASA ISS live stream (YouTube iframe). Toggle between external and internal cameras. Note displayed when signal is unavailable (LOS / blue screen during shadow passes).
2. **Crew Timeline** — Canvas Gantt chart showing crew activities (sleep, science ops, exercise, meals, DPC, EVA windows). Color-coded by activity type. Zoom/pan with mouse wheel. Current time indicator.
3. **ISS Systems** — Four sub-panels from Lightstreamer telemetry:
   - **Power:** Solar array output in kW, charge/discharge status, battery levels
   - **Thermal:** Internal temperature, radiator status
   - **Attitude:** Current attitude mode (TEA, LVLH, etc.), orientation
   - **Atmosphere:** Cabin pressure (psi), O2 percentage, CO2 levels

### Right Column (25%)

1. **Active Event Banner** (conditional) — Appears only during active events. Red accent border, event type, duration timer, event-specific details (crew for EVA, vehicle for docking, delta-V for reboost). Always pinned to top of right column when active.
2. **Crew Roster** — Current expedition number, crew members with name, role (CDR/FE), agency, and country flag. Click for crew bio modal.
3. **Upcoming Events** — Next 3-5 scheduled events (dockings, EVAs, reboosts, crew rotations) with date and short description.
4. **Day/Night Cycle** — Current illumination state (daylight/shadow), progress bar through current cycle, time since sunrise / time to sunset. ISS crosses the terminator every ~45 minutes.

### Bottom Bar (36px)

- LIVE/SIM mode toggle
- Playback speed controls: 0x, 1x, 10x, 50x, 100x
- Panel visibility manager (M key shortcut) — toggle any panel, reorder columns
- Language selector (EN/FR)
- Site identifier

### Panel Customization

Same system as Artemis: press M to open the panel visibility modal. Users can toggle individual panels on/off, rearrange panels within columns, and save/load layout presets. Presets stored in localStorage.

## Event Mode

The dashboard transforms during significant ISS events to spotlight relevant information.

### Event Types

**EVA (Spacewalk):**
- Duration timer (count-up from EVA start)
- EV1/EV2 crew identification
- Live video auto-promotes to larger size, switches to external camera
- Event-specific panel with task progress if available

**Docking / Undocking:**
- Approaching vehicle info (Dragon, Soyuz, Starliner, Progress, HTV)
- Docking port identification
- Timeline to contact / separation

**Reboost / Maneuver:**
- Delta-V budget
- Burn duration countdown
- Altitude change (current → target)
- Engine/thruster source

### Activation Flow

1. **Auto-detection:** The schedule poller checks NASA's ISS timeline every 15 minutes. When a scheduled event window opens, the system transitions the event from `scheduled` to `active` in MySQL and broadcasts the state change via SSE.
2. **Dashboard transformation:** Event banner appears in right column. Live video promotes and enlarges. Event-specific panels surface. Lower-priority panels shift down (not removed — still accessible via scroll).
3. **Admin override:** Via `/admin` panel (token-protected): manually trigger event mode for unscheduled events, extend or end active events, override event details, cancel false-positive auto-detections.
4. **Auto-completion:** When the scheduled event window closes (or admin manually ends it), the dashboard transitions back to normal mode. Event data is archived in MySQL for SIM mode replay.

## Additional Pages

| Route | Purpose |
|---|---|
| `/track` | Full-page ground track map (Leaflet). Expanded view with ground station footprints, orbit path history, day/night terminator overlay. |
| `/live` | Full-page video experience with event context sidebar. Primary destination during events. |
| `/stats` | Cumulative ISS statistics: years in orbit, total orbits, total EVAs, total crew visitors, distance traveled, current expedition info. |
| `/admin` | Protected admin panel (token auth). Event management (create, activate, extend, end), manual telemetry overrides, system status. |
| `/api-docs` | REST and SSE endpoint documentation. |

## SIM Mode

Replay historical ISS data from MySQL archive. Same concept as Artemis but capped at 100x playback (ISS orbits every ~90 minutes, so 100x replays a full orbit in under a minute).

- Playback speeds: 0x (paused), 1x, 10x, 50x, 100x
- Time scrubber to jump to specific timestamps
- Fetches point-in-time snapshots from `/api/snapshot?timestamp=X`
- Can replay past events (EVAs, dockings) with full event mode transformation

## Design System

Dark command-center aesthetic, matching the Artemis tracker theme:

- **Backgrounds:** `#0a0e14` (primary), `#111820` (bars), `#161e2a` (panel headers), `#0d1520` (panel insets)
- **Text:** `#e8f0fe` (primary), `#94adc4` (dim/secondary)
- **Accents:** Cyan `#00e5ff` (primary accent), Green `#00ff88` (nominal/good), Orange `#ff8c00` (warning/upcoming), Red `#ff3d3d` (alert/active event)
- **Activity colors:** Sleep=blue, Science=green, Maneuver=orange, Exercise=purple, EVA=red
- **Typography:** JetBrains Mono, tabular-nums for metric alignment, sizes 9-14px
- **Panels:** `PanelFrame` wrapper with collapsible headers, accent color left border, error boundary support

## Components Ported from Artemis

These components/patterns are cherry-picked from the Artemis tracker and adapted for ISS:

| Component | Artemis Source | ISS Adaptation |
|---|---|---|
| `PanelFrame` | `src/components/shared/PanelFrame.tsx` | Direct port, no changes needed |
| `Sparkline` | `src/components/shared/Sparkline.tsx` | Direct port |
| `MetClock` | `src/components/shared/MetClock.tsx` | Adapt to show orbit elapsed time or UTC |
| `Modal` | `src/components/shared/Modal.tsx` | Direct port |
| SSE pipeline | `src/lib/telemetry/sse-manager.ts` | Same architecture, different data sources |
| `useTelemetryStream` | `src/hooks/useTelemetryStream.ts` | Same hook pattern, different event types |
| `useSimTelemetry` | `src/hooks/useSimTelemetry.ts` | Adapt for MySQL snapshots |
| Dashboard layout | `src/components/Dashboard.tsx` | Same grid system, different panel set |
| Layout presets | `src/lib/dashboard-layout-presets.ts` | Same preset system, ISS-specific defaults |
| Timeline Gantt | `src/components/panels/TimelinePanel.tsx` | Adapt for ISS crew activities |
| i18n system | `src/lib/i18n.ts` | Same structure, new translation keys |
| Theme/CSS vars | `src/globals.css` | Direct port of color system |
| NOAA SWPC poller | `src/lib/pollers/solar.ts` | Direct port |
| Bottom bar | `src/components/BottomBar.tsx` | Same controls, remove 1000x speed |
| Top bar | `src/components/TopBar.tsx` | Adapt metrics for ISS orbital data |

## New Components (ISS-Specific)

| Component | Purpose |
|---|---|
| `LightstreamerClient` | Server-side Lightstreamer connection to `ISSLIVE` adapter |
| `SGP4Propagator` | TLE parsing + SGP4 position/velocity computation |
| `PassPredictor` | Compute visible ISS passes for observer location |
| `GroundTrackMap` | Leaflet 2D map with sinusoidal orbit path |
| `Globe3D` | Three.js 3D Earth with ISS position and orbit |
| `MapToggle` | 2D/3D switch within the ground track panel |
| `ISSSystemsPanel` | Four sub-panels (power, thermal, attitude, atmosphere) from Lightstreamer data |
| `EventBanner` | Active event display with type-specific content |
| `EventModeManager` | Context provider managing event state transitions |
| `DayNightIndicator` | Current illumination state and cycle progress |
| `CrewRoster` | Expedition crew list with agency flags |
| `LiveVideoPanel` | NASA stream embed with camera switching |
| `PassPredictionPanel` | Geolocated pass list with quality ratings |
