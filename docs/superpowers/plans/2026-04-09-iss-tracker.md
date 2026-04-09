# ISS Tracker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a 24/7 real-time ISS dashboard at iss.cdnspace.ca with event mode for spacewalks, dockings, and maneuvers.

**Architecture:** Fresh Next.js 16 build using cherry-picked patterns from the Artemis II tracker. NASA Lightstreamer provides ~297 live telemetry channels, SGP4 propagates orbital position from CelesTrak TLEs, NOAA SWPC provides space weather. Server-side pollers archive to MySQL and broadcast via SSE to browser clients.

**Tech Stack:** Next.js 16, TypeScript 5, React 19, Tailwind CSS 4, Three.js, Leaflet, MySQL, NASA Lightstreamer (`ISSLIVE` adapter), SGP4 (satellite.js), NOAA SWPC APIs.

**Design Spec:** `docs/superpowers/specs/2026-04-09-iss-tracker-design.md`

**Artemis Source Reference:** `c:/Users/ChadOhman/Documents/GitHub/artemis-tracker/src/`

---

## File Structure

```
src/
├── app/
│   ├── layout.tsx                          # Root layout, fonts, metadata, LocaleProvider
│   ├── page.tsx                            # Main dashboard route
│   ├── globals.css                         # Theme variables, dashboard grid, panel styles
│   ├── api/
│   │   ├── telemetry/stream/route.ts       # SSE endpoint, starts pollers, broadcasts
│   │   ├── orbit/route.ts                  # GET current orbital state
│   │   ├── systems/route.ts                # GET latest Lightstreamer telemetry
│   │   ├── passes/route.ts                 # GET pass predictions for lat/lon
│   │   ├── events/route.ts                 # GET upcoming/active events
│   │   ├── timeline/route.ts               # GET crew schedule
│   │   ├── weather/route.ts                # GET space weather
│   │   ├── history/route.ts                # GET downsampled time-series
│   │   ├── snapshot/route.ts               # GET point-in-time for SIM mode
│   │   └── admin/
│   │       ├── events/route.ts             # POST/PUT event management
│   │       └── override/route.ts           # POST manual overrides
│   ├── track/page.tsx                      # Full-page ground track map
│   ├── live/page.tsx                       # Full-page video experience
│   ├── stats/page.tsx                      # Cumulative ISS statistics
│   ├── admin/page.tsx                      # Protected admin panel
│   └── api-docs/page.tsx                   # API documentation
├── components/
│   ├── Dashboard.tsx                       # Main 3-column layout orchestrator
│   ├── TopBar.tsx                          # Orbital metrics bar
│   ├── BottomBar.tsx                       # Playback controls, links, language
│   ├── shared/
│   │   ├── PanelFrame.tsx                  # Collapsible panel wrapper
│   │   ├── Sparkline.tsx                   # Inline canvas chart
│   │   └── Modal.tsx                       # Accessible overlay dialog
│   └── panels/
│       ├── GroundTrackPanel.tsx            # 2D Leaflet map + 3D Three.js globe toggle
│       ├── OrbitalParamsPanel.tsx          # Apoapsis, periapsis, inclination, etc.
│       ├── SpaceWeatherPanel.tsx           # Kp, X-ray, proton flux
│       ├── PassPredictionPanel.tsx         # Next visible passes (geolocated)
│       ├── LiveVideoPanel.tsx              # NASA stream embed
│       ├── TimelinePanel.tsx               # Crew activity Gantt chart
│       ├── ISSSystemsPanel.tsx             # Power, thermal, attitude, atmosphere
│       ├── EventBannerPanel.tsx            # Active event display
│       ├── CrewRosterPanel.tsx             # Expedition crew list
│       ├── UpcomingEventsPanel.tsx         # Next 3-5 scheduled events
│       └── DayNightPanel.tsx               # Illumination state + cycle progress
├── context/
│   ├── TimeContext.tsx                     # LIVE/SIM mode, playback speed, time state
│   ├── LocaleContext.tsx                   # EN/FR i18n context
│   └── EventContext.tsx                    # Active event state, event mode transitions
├── hooks/
│   ├── useTelemetryStream.ts              # SSE connection + auto-reconnect
│   └── useSimTelemetry.ts                 # SIM mode snapshot fetching
├── lib/
│   ├── types.ts                           # All TypeScript interfaces
│   ├── constants.ts                       # URLs, intervals, orbital constants
│   ├── i18n.ts                            # EN/FR translation keys
│   ├── db.ts                              # MySQL connection + schema + queries
│   ├── telemetry/
│   │   ├── sse-manager.ts                 # SSE client management + broadcast
│   │   ├── cache.ts                       # In-memory telemetry cache
│   │   └── lightstreamer-client.ts        # Lightstreamer ISSLIVE connection
│   ├── pollers/
│   │   ├── tle-poller.ts                  # CelesTrak TLE fetcher
│   │   ├── sgp4-propagator.ts             # SGP4 position/velocity computation
│   │   ├── solar.ts                       # NOAA SWPC poller (ported from Artemis)
│   │   ├── schedule-poller.ts             # NASA ISS schedule/timeline fetcher
│   │   └── pass-predictor.ts              # Visible pass computation from TLE
│   └── orbital.ts                         # Orbital parameter derivation (alt, speed, period, etc.)
└── data/
    └── iss-modules.ts                     # Static ISS module/crew reference data
```

---

### Task 1: Project Scaffolding

**Files:**
- Create: `package.json`, `next.config.ts`, `tsconfig.json`, `.gitignore`, `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`

- [ ] **Step 1: Initialize Next.js project**

```bash
cd c:/Users/ChadOhman/Documents/GitHub/cdnspace-iss-tracker
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --no-import-alias --yes
```

If the directory is non-empty (has .git), create in a temp dir and move files:

```bash
npx create-next-app@latest temp-iss --typescript --tailwind --eslint --app --src-dir --no-import-alias --yes
cp -r temp-iss/* temp-iss/.* . 2>/dev/null || true
rm -rf temp-iss
```

- [ ] **Step 2: Install additional dependencies**

```bash
npm install three leaflet mysql2 lightstreamer-client satellite.js canvas-confetti
npm install -D @types/three @types/leaflet @types/node jest ts-jest @testing-library/react @testing-library/jest-dom @jest/globals
```

- [ ] **Step 3: Configure TypeScript path alias**

Update `tsconfig.json` to add the `@/` path alias:

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 4: Configure Next.js**

Replace `next.config.ts`:

```typescript
import { execSync } from "child_process";
import type { NextConfig } from "next";

let gitHash = "dev";
try {
  gitHash = execSync("git rev-parse --short HEAD").toString().trim();
} catch {}

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_BUILD_ID: gitHash,
  },
  headers: async () => [
    {
      source: "/api/:path*",
      headers: [
        { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
        { key: "Pragma", value: "no-cache" },
        { key: "Expires", value: "0" },
      ],
    },
  ],
};

export default nextConfig;
```

- [ ] **Step 5: Update .gitignore**

Append to `.gitignore`:

```
.superpowers/
.remember/
```

- [ ] **Step 6: Verify build**

```bash
npm run build
```

Expected: Build succeeds with default Next.js starter page.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json next.config.ts tsconfig.json .gitignore src/ public/ postcss.config.mjs eslint.config.mjs
git commit -m "feat: scaffold Next.js 16 project with ISS tracker dependencies"
```

---

### Task 2: Theme & Global Styles

**Files:**
- Modify: `src/app/globals.css`
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Write the theme CSS**

Replace `src/app/globals.css` with the ISS tracker theme. Port CSS variables and dashboard grid from Artemis (`c:/Users/ChadOhman/Documents/GitHub/artemis-tracker/src/app/globals.css`):

```css
@import "tailwindcss";

@font-face {
  font-family: "JetBrains Mono";
  src: url("https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&display=swap");
}

:root {
  --bg-primary: #0a0e14;
  --bg-secondary: #0d1117;
  --bg-panel: #111820;
  --bg-panel-header: #0f1621;
  --bg-surface: #161e2a;
  --bg-inset: #0d1520;

  --accent-cyan: #00e5ff;
  --accent-cyan-dim: #00b8cc;
  --accent-green: #00ff88;
  --accent-orange: #ff8c00;
  --accent-red: #ff3d3d;
  --accent-yellow: #ffd600;
  --accent-purple: #b388ff;

  --text-primary: #e8f0fe;
  --text-secondary: #a0b8cf;
  --text-dim: #94adc4;

  --border-panel: rgba(0, 229, 255, 0.12);
  --border-subtle: rgba(255, 255, 255, 0.06);

  --activity-sleep: #1a3a5c;
  --activity-science: #2d4a2d;
  --activity-maneuver: #3d2d1a;
  --activity-exercise: #4a2d3d;
  --activity-meal: #2d3a4a;
  --activity-eva: rgba(255, 61, 61, 0.2);
  --activity-off-duty: #1a2a1a;
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html, body {
  height: 100%;
  overflow: hidden;
  background: var(--bg-primary);
  color: var(--text-primary);
  font-family: "JetBrains Mono", "Fira Code", "Cascadia Code", monospace;
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  -webkit-font-smoothing: antialiased;
}

/* Dashboard grid */
.dashboard-grid {
  display: grid;
  grid-template-columns: 35fr 40fr 25fr;
  grid-template-rows: 48px auto 1fr 36px;
  grid-template-areas:
    "topbar   topbar   topbar"
    "timeline timeline timeline"
    "left     center   right"
    "bottombar bottombar bottombar";
  height: 100vh;
  gap: 0;
}

.dashboard-topbar { grid-area: topbar; }
.dashboard-timeline { grid-area: timeline; }
.dashboard-left { grid-area: left; overflow-y: auto; padding: 8px; display: flex; flex-direction: column; gap: 8px; }
.dashboard-center { grid-area: center; overflow-y: auto; padding: 8px; display: flex; flex-direction: column; gap: 8px; }
.dashboard-right { grid-area: right; overflow-y: auto; padding: 8px; display: flex; flex-direction: column; gap: 8px; }
.dashboard-bottombar { grid-area: bottombar; }

/* Panel styling */
.panel {
  border: 1px solid var(--border-panel);
  border-radius: 6px;
  background: var(--bg-panel);
  overflow: hidden;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 10px;
  background: var(--bg-panel-header);
  border-bottom: 1px solid var(--border-panel);
  font-size: 10px;
  user-select: none;
}

.panel-body {
  padding: 8px 10px;
}

/* Scrollbar styling */
.dashboard-left::-webkit-scrollbar,
.dashboard-center::-webkit-scrollbar,
.dashboard-right::-webkit-scrollbar {
  width: 4px;
}

.dashboard-left::-webkit-scrollbar-thumb,
.dashboard-center::-webkit-scrollbar-thumb,
.dashboard-right::-webkit-scrollbar-thumb {
  background: rgba(0, 229, 255, 0.15);
  border-radius: 2px;
}

.dashboard-left::-webkit-scrollbar-thumb:hover,
.dashboard-center::-webkit-scrollbar-thumb:hover,
.dashboard-right::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 229, 255, 0.3);
}

/* Live dot animation */
@keyframes pulse-live {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

.live-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--accent-red);
  animation: pulse-live 2s ease-in-out infinite;
}

/* Event mode border pulse */
@keyframes pulse-event {
  0%, 100% { border-color: var(--accent-red); }
  50% { border-color: rgba(255, 61, 61, 0.4); }
}

.event-active {
  animation: pulse-event 2s ease-in-out infinite;
}
```

- [ ] **Step 2: Update root layout**

Replace `src/app/layout.tsx`:

```tsx
import type { Metadata, Viewport } from "next";
import { JetBrains_Mono } from "next/font/google";
import "./globals.css";

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://iss.cdnspace.ca"),
  title: "ISS Tracker — Live Dashboard",
  description:
    "Real-time International Space Station dashboard with orbital tracking, crew timeline, live video, and systems telemetry.",
  icons: { icon: "/icon.png" },
  openGraph: {
    title: "ISS Tracker — Live Dashboard",
    description:
      "Real-time International Space Station dashboard with orbital tracking, crew timeline, live video, and systems telemetry.",
    url: "https://iss.cdnspace.ca",
    siteName: "ISS Tracker",
    type: "website",
  },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  themeColor: "#0a0e14",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={jetbrainsMono.variable}>
      <body>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:p-2 focus:bg-[var(--bg-panel)] focus:text-[var(--accent-cyan)]"
        >
          Skip to main content
        </a>
        <main id="main">{children}</main>
      </body>
    </html>
  );
}
```

- [ ] **Step 3: Stub out page.tsx**

Replace `src/app/page.tsx`:

```tsx
export default function Home() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
        color: "var(--text-dim)",
      }}
    >
      ISS Tracker — Coming Soon
    </div>
  );
}
```

- [ ] **Step 4: Verify build**

```bash
npm run build
```

Expected: Build succeeds. Page shows dark background with centered placeholder text.

- [ ] **Step 5: Commit**

```bash
git add src/app/globals.css src/app/layout.tsx src/app/page.tsx
git commit -m "feat: add ISS tracker theme, dashboard grid, and root layout"
```

---

### Task 3: TypeScript Types

**Files:**
- Create: `src/lib/types.ts`
- Test: `src/lib/__tests__/types.test.ts`

- [ ] **Step 1: Write type validation tests**

Create `src/lib/__tests__/types.test.ts`:

```typescript
import type {
  OrbitalState,
  ISSTelemetry,
  SolarActivity,
  ISSEvent,
  EventType,
  EventStatus,
  TimelineActivity,
  ActivityType,
  CrewMember,
  PassPrediction,
  SsePayload,
} from "../types";

describe("ISS Tracker Types", () => {
  it("OrbitalState has required fields", () => {
    const state: OrbitalState = {
      timestamp: "2026-04-09T14:32:07Z",
      latitude: 32.4,
      longitude: -118.7,
      altitude: 408.2,
      velocity: 7.66,
      speedKmH: 27580,
      period: 5554,
      inclination: 51.64,
      eccentricity: 0.00078,
      apoapsis: 413.8,
      periapsis: 403.1,
      revolutionNumber: 172584,
      isInSunlight: true,
      sunriseIn: null,
      sunsetIn: 1680,
    };
    expect(state.latitude).toBe(32.4);
    expect(state.isInSunlight).toBe(true);
  });

  it("ISSTelemetry has Lightstreamer channel values", () => {
    const telemetry: ISSTelemetry = {
      timestamp: "2026-04-09T14:32:07Z",
      powerKw: 96.4,
      temperatureC: 21.3,
      pressurePsi: 14.7,
      oxygenPercent: 21.1,
      co2Percent: 0.3,
      attitudeMode: "TEA",
      channels: { USLAB000001: { value: "96.4", status: "Normal", timestamp: 1712672000 } },
    };
    expect(telemetry.powerKw).toBe(96.4);
  });

  it("ISSEvent transitions through statuses", () => {
    const event: ISSEvent = {
      id: "eva-92",
      type: "eva",
      title: "US EVA #92",
      description: "Spacewalk to replace solar array",
      status: "active",
      scheduledStart: "2026-04-09T10:00:00Z",
      scheduledEnd: "2026-04-09T16:30:00Z",
      actualStart: "2026-04-09T10:05:00Z",
      actualEnd: null,
      metadata: { ev1: "A. Hague", ev2: "J. Meir" },
    };
    expect(event.status).toBe("active");
    expect(event.metadata.ev1).toBe("A. Hague");
  });

  it("PassPrediction has visibility data", () => {
    const pass: PassPrediction = {
      riseTime: "2026-04-09T21:14:00Z",
      riseAzimuth: 220,
      maxTime: "2026-04-09T21:18:00Z",
      maxElevation: 67,
      setTime: "2026-04-09T21:22:00Z",
      setAzimuth: 45,
      magnitude: -3.2,
      quality: "bright",
    };
    expect(pass.maxElevation).toBe(67);
    expect(pass.quality).toBe("bright");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx jest src/lib/__tests__/types.test.ts --no-cache
```

Expected: FAIL — cannot find module `../types`.

- [ ] **Step 3: Create types file**

Create `src/lib/types.ts`:

```typescript
// --- Orbital State (derived from SGP4 propagation) ---

export interface OrbitalState {
  timestamp: string;
  latitude: number;
  longitude: number;
  altitude: number;        // km above sea level
  velocity: number;        // km/s
  speedKmH: number;        // km/h
  period: number;          // seconds
  inclination: number;     // degrees
  eccentricity: number;
  apoapsis: number;        // km
  periapsis: number;       // km
  revolutionNumber: number;
  isInSunlight: boolean;
  sunriseIn: number | null;  // seconds until next sunrise (null if in sunlight)
  sunsetIn: number | null;   // seconds until next sunset (null if in shadow)
}

// --- ISS Systems Telemetry (from Lightstreamer) ---

export interface LightstreamerChannel {
  value: string;
  status: string;
  timestamp: number;
}

export interface ISSTelemetry {
  timestamp: string;
  powerKw: number;
  temperatureC: number;
  pressurePsi: number;
  oxygenPercent: number;
  co2Percent: number;
  attitudeMode: string;
  channels: Record<string, LightstreamerChannel>;
}

// --- Space Weather (from NOAA SWPC) ---

export interface SolarActivity {
  timestamp: string;
  kpIndex: number;
  kpLabel: string;
  xrayFlux: number;
  xrayClass: string;
  protonFlux1MeV: number;
  protonFlux10MeV: number;
  protonFlux100MeV: number;
  radiationRisk: "low" | "moderate" | "high" | "severe";
}

// --- Events ---

export type EventType = "eva" | "docking" | "undocking" | "reboost" | "maneuver";
export type EventStatus = "scheduled" | "active" | "completed" | "cancelled";

export interface ISSEvent {
  id: string;
  type: EventType;
  title: string;
  description: string;
  status: EventStatus;
  scheduledStart: string;
  scheduledEnd: string;
  actualStart: string | null;
  actualEnd: string | null;
  metadata: Record<string, string>;
}

// --- Timeline ---

export type ActivityType =
  | "sleep"
  | "science"
  | "exercise"
  | "meal"
  | "eva"
  | "maneuver"
  | "dpc"
  | "off-duty"
  | "other";

export interface TimelineActivity {
  name: string;
  type: ActivityType;
  startTime: string;
  endTime: string;
  notes?: string;
}

// --- Crew ---

export interface CrewMember {
  name: string;
  role: string;          // CDR, FE, etc.
  agency: string;        // NASA, RSA, JAXA, ESA, CSA
  nationality: string;   // country code for flag emoji
  expedition: number;
  bio?: string;
  photo?: string;
}

// --- Pass Predictions ---

export type PassQuality = "bright" | "good" | "fair" | "poor";

export interface PassPrediction {
  riseTime: string;
  riseAzimuth: number;
  maxTime: string;
  maxElevation: number;
  setTime: string;
  setAzimuth: number;
  magnitude: number;
  quality: PassQuality;
}

// --- SSE Payload ---

export interface SsePayload {
  orbital: OrbitalState;
  telemetry: ISSTelemetry | null;
  solar: SolarActivity | null;
  activeEvent: ISSEvent | null;
  visitorCount: number;
}

// --- SIM Mode ---

export type PlaybackSpeed = 0 | 1 | 10 | 50 | 100;

export interface Snapshot {
  timestamp: string;
  orbital: OrbitalState;
  telemetry: ISSTelemetry | null;
  solar: SolarActivity | null;
  activeEvent: ISSEvent | null;
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx jest src/lib/__tests__/types.test.ts --no-cache
```

Expected: PASS — all type checks compile correctly.

- [ ] **Step 5: Commit**

```bash
git add src/lib/types.ts src/lib/__tests__/types.test.ts
git commit -m "feat: add core TypeScript interfaces for ISS tracker"
```

---

### Task 4: Constants

**Files:**
- Create: `src/lib/constants.ts`

- [ ] **Step 1: Create constants file**

Create `src/lib/constants.ts`:

```typescript
// ISS NORAD catalog number
export const ISS_NORAD_ID = 25544;

// Data source URLs
export const CELESTRAK_TLE_URL =
  "https://celestrak.org/NORAD/elements/gp.php?CATNR=25544&FORMAT=TLE";
export const LIGHTSTREAMER_SERVER = "https://push.lightstreamer.com";
export const LIGHTSTREAMER_ADAPTER = "ISSLIVE";

// NOAA SWPC endpoints (same as Artemis)
export const NOAA_KP_URL =
  "https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json";
export const NOAA_XRAY_URL =
  "https://services.swpc.noaa.gov/json/goes/primary/xrays-1-day.json";
export const NOAA_PROTON_URL =
  "https://services.swpc.noaa.gov/json/goes/primary/integral-protons-1-day.json";

// Polling intervals
export const TLE_POLL_INTERVAL_MS = 2 * 60 * 60 * 1000;      // 2 hours
export const SGP4_TICK_INTERVAL_MS = 1000;                     // 1 second
export const SOLAR_POLL_INTERVAL_MS = 60 * 1000;               // 60 seconds
export const SCHEDULE_POLL_INTERVAL_MS = 15 * 60 * 1000;       // 15 minutes
export const SSE_BROADCAST_INTERVAL_MS = 1000;                  // 1 second
export const SSE_KEEPALIVE_INTERVAL_MS = 30 * 1000;             // 30 seconds
export const VISITOR_COUNT_INTERVAL_MS = 5000;                  // 5 seconds

// Orbital constants
export const EARTH_RADIUS_KM = 6371;
export const ISS_MEAN_ALTITUDE_KM = 408;

// Playback speeds for SIM mode (max 100x)
export const PLAYBACK_SPEEDS = [0, 1, 10, 50, 100] as const;
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/constants.ts
git commit -m "feat: add ISS tracker constants and configuration"
```

---

### Task 5: Shared Components (PanelFrame, Sparkline, Modal)

**Files:**
- Create: `src/components/shared/PanelFrame.tsx`
- Create: `src/components/shared/Sparkline.tsx`
- Create: `src/components/shared/Modal.tsx`
- Test: `src/components/shared/__tests__/PanelFrame.test.tsx`

- [ ] **Step 1: Write PanelFrame test**

Create `src/components/shared/__tests__/PanelFrame.test.tsx`:

```tsx
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { PanelFrame } from "../PanelFrame";

describe("PanelFrame", () => {
  it("renders title and children", () => {
    render(
      <PanelFrame title="Test Panel">
        <p>Panel content</p>
      </PanelFrame>
    );
    expect(screen.getByText("Test Panel")).toBeInTheDocument();
    expect(screen.getByText("Panel content")).toBeInTheDocument();
  });

  it("collapses when header is clicked", () => {
    render(
      <PanelFrame title="Collapsible" collapsible>
        <p>Hidden content</p>
      </PanelFrame>
    );
    const header = screen.getByRole("button");
    fireEvent.click(header);
    expect(screen.queryByText("Hidden content")).not.toBeVisible();
  });

  it("renders headerRight content", () => {
    render(
      <PanelFrame title="With Right" headerRight={<span>Extra</span>}>
        <p>Body</p>
      </PanelFrame>
    );
    expect(screen.getByText("Extra")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx jest src/components/shared/__tests__/PanelFrame.test.tsx --no-cache
```

Expected: FAIL — cannot find module `../PanelFrame`.

- [ ] **Step 3: Create PanelFrame component**

Create `src/components/shared/PanelFrame.tsx`. Port from Artemis (`artemis-tracker/src/components/shared/PanelFrame.tsx`):

```tsx
"use client";

import { useState, type ReactNode } from "react";

interface PanelFrameProps {
  title: string;
  icon?: ReactNode;
  headerRight?: ReactNode;
  accentColor?: string;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}

export function PanelFrame({
  title,
  icon,
  headerRight,
  accentColor = "var(--accent-cyan)",
  collapsible = false,
  defaultCollapsed = false,
  children,
  className = "",
  bodyClassName = "",
}: PanelFrameProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  return (
    <div
      className={`panel ${className}`}
      style={{ borderLeftWidth: 2, borderLeftColor: accentColor }}
    >
      <div
        className="panel-header"
        role={collapsible ? "button" : undefined}
        tabIndex={collapsible ? 0 : undefined}
        aria-expanded={collapsible ? !collapsed : undefined}
        onClick={collapsible ? () => setCollapsed((c) => !c) : undefined}
        onKeyDown={
          collapsible
            ? (e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setCollapsed((c) => !c);
                }
              }
            : undefined
        }
        style={{ cursor: collapsible ? "pointer" : "default" }}
      >
        <span style={{ color: accentColor, display: "flex", alignItems: "center", gap: 6 }}>
          {collapsible && (
            <span
              style={{
                display: "inline-block",
                transform: collapsed ? "rotate(-90deg)" : "rotate(0deg)",
                transition: "transform 0.15s",
                fontSize: 8,
              }}
            >
              ▼
            </span>
          )}
          {icon && <span>{icon}</span>}
          {title}
        </span>
        {headerRight && <span>{headerRight}</span>}
      </div>
      <div
        className={`panel-body ${bodyClassName}`}
        style={{ display: collapsed ? "none" : undefined }}
      >
        {children}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run PanelFrame test**

```bash
npx jest src/components/shared/__tests__/PanelFrame.test.tsx --no-cache
```

Expected: PASS.

- [ ] **Step 5: Create Sparkline component**

Create `src/components/shared/Sparkline.tsx`. Port from Artemis (`artemis-tracker/src/components/shared/Sparkline.tsx`):

```tsx
"use client";

import { useRef, useEffect, useState } from "react";

interface SparklineProps {
  metric: string;
  hours?: number;
  color?: string;
  width?: number;
  height?: number;
  showArea?: boolean;
}

interface Point {
  ts: number;
  value: number;
}

const cache = new Map<string, { data: Point[]; ts: number }>();
const CACHE_TTL = 5 * 60 * 1000;

export function Sparkline({
  metric,
  hours = 24,
  color = "var(--accent-cyan)",
  width = 48,
  height = 14,
  showArea = true,
}: SparklineProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [data, setData] = useState<Point[]>([]);

  useEffect(() => {
    let cancelled = false;
    const key = `${metric}-${hours}`;
    const cached = cache.get(key);

    if (cached && Date.now() - cached.ts < CACHE_TTL) {
      setData(cached.data);
      return;
    }

    fetch(`/api/history?metric=${metric}&hours=${hours}&points=60`)
      .then((r) => r.json())
      .then((points: Point[]) => {
        if (cancelled) return;
        cache.set(key, { data: points, ts: Date.now() });
        setData(points);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [metric, hours]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || data.length < 2) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const resolvedColor = getComputedStyle(canvas).getPropertyValue("--sparkline-color").trim() || color;

    const values = data.map((p) => p.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;

    const xStep = width / (data.length - 1);

    ctx.beginPath();
    data.forEach((p, i) => {
      const x = i * xStep;
      const y = height - 1 - ((p.value - min) / range) * (height - 2);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });

    if (showArea) {
      ctx.lineTo(width, height);
      ctx.lineTo(0, height);
      ctx.closePath();
      ctx.fillStyle = resolvedColor + "38";
      ctx.fill();
    }

    ctx.beginPath();
    data.forEach((p, i) => {
      const x = i * xStep;
      const y = height - 1 - ((p.value - min) / range) * (height - 2);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = resolvedColor;
    ctx.lineWidth = 1;
    ctx.stroke();
  }, [data, width, height, color, showArea]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{ width, height, display: "inline-block", verticalAlign: "middle" }}
    />
  );
}
```

- [ ] **Step 6: Create Modal component**

Create `src/components/shared/Modal.tsx`. Port from Artemis (`artemis-tracker/src/components/shared/Modal.tsx`):

```tsx
"use client";

import { useEffect, useRef, type ReactNode } from "react";

interface ModalProps {
  title: string;
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  maxWidth?: string;
}

export function Modal({
  title,
  isOpen,
  onClose,
  children,
  maxWidth = "800px",
}: ModalProps) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isOpen) closeRef.current?.focus();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.8)",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "var(--bg-panel)",
          border: "1px solid var(--border-panel)",
          borderRadius: 8,
          maxWidth,
          width: "90%",
          maxHeight: "80vh",
          display: "flex",
          flexDirection: "column",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "12px 16px",
            borderBottom: "1px solid var(--border-panel)",
            position: "sticky",
            top: 0,
            background: "var(--bg-panel)",
          }}
        >
          <h2 id="modal-title" style={{ fontSize: 14, color: "var(--text-primary)", margin: 0 }}>
            {title}
          </h2>
          <button
            ref={closeRef}
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: "var(--text-dim)",
              fontSize: 18,
              cursor: "pointer",
              padding: "0 4px",
            }}
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <div style={{ padding: 16, overflowY: "auto", flex: 1 }}>{children}</div>
      </div>
    </div>
  );
}
```

- [ ] **Step 7: Run all tests**

```bash
npx jest src/components/shared/ --no-cache
```

Expected: PASS — PanelFrame tests pass.

- [ ] **Step 8: Commit**

```bash
git add src/components/shared/
git commit -m "feat: add shared components (PanelFrame, Sparkline, Modal)"
```

---

### Task 6: i18n System

**Files:**
- Create: `src/lib/i18n.ts`
- Create: `src/context/LocaleContext.tsx`

- [ ] **Step 1: Create i18n translations**

Create `src/lib/i18n.ts`:

```typescript
export type Locale = "en" | "fr";

export const TRANSLATIONS: Record<Locale, Record<string, Record<string, string>>> = {
  en: {
    common: {
      live: "LIVE",
      sim: "SIM",
      panels: "Panels",
      loading: "Loading...",
      error: "Error",
      close: "Close",
      save: "Save",
      cancel: "Cancel",
    },
    topbar: {
      altitude: "ALT",
      speed: "SPD",
      latitude: "LAT",
      longitude: "LON",
      orbit: "ORBIT",
      period: "PERIOD",
    },
    panels: {
      groundTrack: "GROUND TRACK",
      orbitalParams: "ORBITAL PARAMETERS",
      spaceWeather: "SPACE WEATHER",
      passPredictions: "NEXT VISIBLE PASSES",
      liveVideo: "LIVE VIDEO",
      crewTimeline: "CREW TIMELINE",
      issSystems: "ISS SYSTEMS",
      activeEvent: "ACTIVE EVENT",
      crew: "CREW",
      upcoming: "UPCOMING",
      dayNight: "DAY/NIGHT CYCLE",
    },
    systems: {
      power: "POWER",
      thermal: "THERMAL",
      attitude: "ATTITUDE",
      atmosphere: "ATMOSPHERE",
    },
    weather: {
      kpIndex: "Kp Index",
      xray: "X-Ray",
      protonFlux: "Proton Flux",
      radiation: "Radiation",
      quiet: "Quiet",
      active: "Active",
      storm: "Storm",
      low: "LOW",
      moderate: "MODERATE",
      high: "HIGH",
      severe: "SEVERE",
    },
    events: {
      eva: "EVA",
      docking: "Docking",
      undocking: "Undocking",
      reboost: "Reboost",
      maneuver: "Maneuver",
      duration: "Duration",
      scheduled: "Scheduled",
      active: "Active",
      completed: "Completed",
    },
    passes: {
      tonight: "Tonight",
      tomorrow: "Tomorrow",
      maxElev: "Max elev",
      magnitude: "Mag",
      bright: "Bright",
      good: "Good",
      fair: "Fair",
      poor: "Poor",
      changeLocation: "Change",
      basedOnLocation: "Based on your location",
    },
    dayNight: {
      daylight: "DAYLIGHT",
      shadow: "SHADOW",
      sunriseAgo: "Sunrise {0} ago",
      sunsetIn: "Sunset in {0}",
    },
    bottomBar: {
      playback: "Playback",
      builtBy: "Built by",
    },
  },
  fr: {
    common: {
      live: "EN DIRECT",
      sim: "SIM",
      panels: "Panneaux",
      loading: "Chargement...",
      error: "Erreur",
      close: "Fermer",
      save: "Sauvegarder",
      cancel: "Annuler",
    },
    topbar: {
      altitude: "ALT",
      speed: "VIT",
      latitude: "LAT",
      longitude: "LON",
      orbit: "ORBITE",
      period: "PÉRIODE",
    },
    panels: {
      groundTrack: "TRACE AU SOL",
      orbitalParams: "PARAMÈTRES ORBITAUX",
      spaceWeather: "MÉTÉO SPATIALE",
      passPredictions: "PROCHAINS PASSAGES",
      liveVideo: "VIDÉO EN DIRECT",
      crewTimeline: "CALENDRIER ÉQUIPAGE",
      issSystems: "SYSTÈMES ISS",
      activeEvent: "ÉVÉNEMENT EN COURS",
      crew: "ÉQUIPAGE",
      upcoming: "À VENIR",
      dayNight: "CYCLE JOUR/NUIT",
    },
    systems: {
      power: "ÉNERGIE",
      thermal: "THERMIQUE",
      attitude: "ATTITUDE",
      atmosphere: "ATMOSPHÈRE",
    },
    weather: {
      kpIndex: "Indice Kp",
      xray: "Rayons X",
      protonFlux: "Flux de protons",
      radiation: "Radiation",
      quiet: "Calme",
      active: "Actif",
      storm: "Tempête",
      low: "FAIBLE",
      moderate: "MODÉRÉ",
      high: "ÉLEVÉ",
      severe: "SÉVÈRE",
    },
    events: {
      eva: "EVA",
      docking: "Arrimage",
      undocking: "Désarrimage",
      reboost: "Rehaussement",
      maneuver: "Manœuvre",
      duration: "Durée",
      scheduled: "Prévu",
      active: "En cours",
      completed: "Terminé",
    },
    passes: {
      tonight: "Ce soir",
      tomorrow: "Demain",
      maxElev: "Élév. max",
      magnitude: "Mag",
      bright: "Brillant",
      good: "Bon",
      fair: "Correct",
      poor: "Faible",
      changeLocation: "Modifier",
      basedOnLocation: "Selon votre position",
    },
    dayNight: {
      daylight: "JOUR",
      shadow: "OMBRE",
      sunriseAgo: "Lever il y a {0}",
      sunsetIn: "Coucher dans {0}",
    },
    bottomBar: {
      playback: "Lecture",
      builtBy: "Créé par",
    },
  },
};
```

- [ ] **Step 2: Create LocaleContext**

Create `src/context/LocaleContext.tsx`:

```tsx
"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { TRANSLATIONS, type Locale } from "@/lib/i18n";

interface LocaleContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string) => string;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>("en");

  const t = useCallback(
    (key: string): string => {
      const parts = key.split(".");
      if (parts.length !== 2) return key;
      const [section, field] = parts;
      return TRANSLATIONS[locale]?.[section]?.[field] ?? key;
    },
    [locale]
  );

  return (
    <LocaleContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale must be used within LocaleProvider");
  return ctx;
}
```

- [ ] **Step 3: Wrap layout with LocaleProvider**

In `src/app/layout.tsx`, add the import and wrap `{children}`:

```tsx
import { LocaleProvider } from "@/context/LocaleContext";

// In the return, wrap main content:
<LocaleProvider>
  <main id="main">{children}</main>
</LocaleProvider>
```

- [ ] **Step 4: Verify build**

```bash
npm run build
```

Expected: Build succeeds.

- [ ] **Step 5: Commit**

```bash
git add src/lib/i18n.ts src/context/LocaleContext.tsx src/app/layout.tsx
git commit -m "feat: add EN/FR i18n system with LocaleContext"
```

---

### Task 7: Database Layer (MySQL)

**Files:**
- Create: `src/lib/db.ts`
- Test: `src/lib/__tests__/db.test.ts`

- [ ] **Step 1: Write database schema test**

Create `src/lib/__tests__/db.test.ts`:

```typescript
import { getPool, initializeSchema, archiveOrbitalState, getMetricHistory } from "../db";

// These tests require a running MySQL instance.
// Set TEST_MYSQL_URL=mysql://user:pass@localhost:3306/iss_tracker_test
// Skip if not available.
const MYSQL_URL = process.env.TEST_MYSQL_URL;

const describeDb = MYSQL_URL ? describe : describe.skip;

describeDb("Database Layer", () => {
  beforeAll(async () => {
    await initializeSchema();
  });

  afterAll(async () => {
    const pool = getPool();
    await pool.end();
  });

  it("archives and retrieves orbital state", async () => {
    const state = {
      timestamp: new Date().toISOString(),
      latitude: 32.4,
      longitude: -118.7,
      altitude: 408.2,
      velocity: 7.66,
      speedKmH: 27580,
    };
    await archiveOrbitalState(state);

    const history = await getMetricHistory("altitude", 1, 10);
    expect(history.length).toBeGreaterThan(0);
    expect(history[0].value).toBeCloseTo(408.2, 1);
  });
});
```

- [ ] **Step 2: Create database module**

Create `src/lib/db.ts`:

```typescript
import mysql from "mysql2/promise";
import type { OrbitalState, ISSTelemetry, SolarActivity, ISSEvent, TimelineActivity, Snapshot } from "./types";

let pool: mysql.Pool | null = null;

export function getPool(): mysql.Pool {
  if (!pool) {
    pool = mysql.createPool({
      uri: process.env.MYSQL_URL || "mysql://root@localhost:3306/iss_tracker",
      waitForConnections: true,
      connectionLimit: 10,
      timezone: "+00:00",
    });
  }
  return pool;
}

export async function initializeSchema(): Promise<void> {
  const db = getPool();

  await db.execute(`
    CREATE TABLE IF NOT EXISTS orbital_state (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      timestamp DATETIME(3) NOT NULL,
      latitude DOUBLE NOT NULL,
      longitude DOUBLE NOT NULL,
      altitude DOUBLE NOT NULL,
      velocity DOUBLE NOT NULL,
      speed_kmh DOUBLE NOT NULL,
      period_s DOUBLE,
      inclination DOUBLE,
      eccentricity DOUBLE,
      apoapsis DOUBLE,
      periapsis DOUBLE,
      revolution_number INT,
      is_in_sunlight BOOLEAN,
      INDEX idx_timestamp (timestamp)
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS tle_history (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      fetched_at DATETIME(3) NOT NULL,
      line1 VARCHAR(80) NOT NULL,
      line2 VARCHAR(80) NOT NULL,
      epoch DATETIME(3) NOT NULL,
      INDEX idx_fetched (fetched_at)
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS space_weather (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      timestamp DATETIME(3) NOT NULL,
      kp_index DOUBLE NOT NULL,
      kp_label VARCHAR(32),
      xray_flux DOUBLE,
      xray_class VARCHAR(8),
      proton_flux_1mev DOUBLE,
      proton_flux_10mev DOUBLE,
      proton_flux_100mev DOUBLE,
      radiation_risk VARCHAR(16),
      INDEX idx_timestamp (timestamp)
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS iss_telemetry (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      timestamp DATETIME(3) NOT NULL,
      channel_id VARCHAR(32) NOT NULL,
      value VARCHAR(255),
      status VARCHAR(32),
      INDEX idx_ts_channel (timestamp, channel_id)
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS events (
      id VARCHAR(64) PRIMARY KEY,
      type VARCHAR(16) NOT NULL,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      status VARCHAR(16) NOT NULL DEFAULT 'scheduled',
      scheduled_start DATETIME(3) NOT NULL,
      scheduled_end DATETIME(3) NOT NULL,
      actual_start DATETIME(3),
      actual_end DATETIME(3),
      metadata JSON,
      INDEX idx_status (status),
      INDEX idx_scheduled (scheduled_start)
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS timeline_activities (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      type VARCHAR(16) NOT NULL,
      start_time DATETIME(3) NOT NULL,
      end_time DATETIME(3) NOT NULL,
      notes TEXT,
      INDEX idx_time (start_time, end_time)
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS page_views (
      id INT PRIMARY KEY DEFAULT 1,
      count BIGINT NOT NULL DEFAULT 0
    )
  `);

  await db.execute(`
    INSERT IGNORE INTO page_views (id, count) VALUES (1, 0)
  `);
}

// --- Archive functions ---

export async function archiveOrbitalState(state: Partial<OrbitalState>): Promise<void> {
  const db = getPool();
  await db.execute(
    `INSERT INTO orbital_state
      (timestamp, latitude, longitude, altitude, velocity, speed_kmh, period_s, inclination, eccentricity, apoapsis, periapsis, revolution_number, is_in_sunlight)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      state.timestamp,
      state.latitude,
      state.longitude,
      state.altitude,
      state.velocity,
      state.speedKmH,
      state.period ?? null,
      state.inclination ?? null,
      state.eccentricity ?? null,
      state.apoapsis ?? null,
      state.periapsis ?? null,
      state.revolutionNumber ?? null,
      state.isInSunlight ?? null,
    ]
  );
}

export async function archiveSolar(solar: SolarActivity): Promise<void> {
  const db = getPool();
  await db.execute(
    `INSERT INTO space_weather
      (timestamp, kp_index, kp_label, xray_flux, xray_class, proton_flux_1mev, proton_flux_10mev, proton_flux_100mev, radiation_risk)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      solar.timestamp,
      solar.kpIndex,
      solar.kpLabel,
      solar.xrayFlux,
      solar.xrayClass,
      solar.protonFlux1MeV,
      solar.protonFlux10MeV,
      solar.protonFlux100MeV,
      solar.radiationRisk,
    ]
  );
}

export async function archiveTelemetryChannel(
  timestamp: string,
  channelId: string,
  value: string,
  status: string
): Promise<void> {
  const db = getPool();
  await db.execute(
    `INSERT INTO iss_telemetry (timestamp, channel_id, value, status) VALUES (?, ?, ?, ?)`,
    [timestamp, channelId, value, status]
  );
}

export async function upsertEvent(event: ISSEvent): Promise<void> {
  const db = getPool();
  await db.execute(
    `INSERT INTO events (id, type, title, description, status, scheduled_start, scheduled_end, actual_start, actual_end, metadata)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       status = VALUES(status),
       actual_start = VALUES(actual_start),
       actual_end = VALUES(actual_end),
       metadata = VALUES(metadata)`,
    [
      event.id,
      event.type,
      event.title,
      event.description,
      event.status,
      event.scheduledStart,
      event.scheduledEnd,
      event.actualStart,
      event.actualEnd,
      JSON.stringify(event.metadata),
    ]
  );
}

// --- Query functions ---

export async function getMetricHistory(
  column: string,
  hours: number,
  maxPoints: number
): Promise<{ ts: number; value: number }[]> {
  const db = getPool();
  const allowedColumns = ["altitude", "velocity", "speed_kmh", "latitude", "longitude", "inclination"];
  if (!allowedColumns.includes(column)) return [];

  const [rows] = await db.execute(
    `SELECT UNIX_TIMESTAMP(timestamp) * 1000 AS ts, ${column} AS value
     FROM orbital_state
     WHERE timestamp >= DATE_SUB(NOW(), INTERVAL ? HOUR)
     ORDER BY timestamp ASC`,
    [hours]
  );

  const results = rows as { ts: number; value: number }[];
  if (results.length <= maxPoints) return results;

  const step = Math.ceil(results.length / maxPoints);
  return results.filter((_, i) => i % step === 0);
}

export async function getActiveEvents(): Promise<ISSEvent[]> {
  const db = getPool();
  const [rows] = await db.execute(
    `SELECT * FROM events WHERE status IN ('scheduled', 'active') ORDER BY scheduled_start ASC`
  );
  return (rows as Record<string, unknown>[]).map(rowToEvent);
}

export async function getUpcomingEvents(limit: number = 5): Promise<ISSEvent[]> {
  const db = getPool();
  const [rows] = await db.execute(
    `SELECT * FROM events WHERE scheduled_start >= NOW() AND status = 'scheduled' ORDER BY scheduled_start ASC LIMIT ?`,
    [limit]
  );
  return (rows as Record<string, unknown>[]).map(rowToEvent);
}

export async function getSnapshotAt(timestamp: string): Promise<Snapshot | null> {
  const db = getPool();

  const [orbRows] = await db.execute(
    `SELECT * FROM orbital_state WHERE timestamp <= ? ORDER BY timestamp DESC LIMIT 1`,
    [timestamp]
  );
  const orbRow = (orbRows as Record<string, unknown>[])[0];
  if (!orbRow) return null;

  const [solRows] = await db.execute(
    `SELECT * FROM space_weather WHERE timestamp <= ? ORDER BY timestamp DESC LIMIT 1`,
    [timestamp]
  );
  const solRow = (solRows as Record<string, unknown>[])[0];

  const [evtRows] = await db.execute(
    `SELECT * FROM events WHERE actual_start <= ? AND (actual_end IS NULL OR actual_end >= ?) LIMIT 1`,
    [timestamp, timestamp]
  );
  const evtRow = (evtRows as Record<string, unknown>[])[0];

  return {
    timestamp,
    orbital: rowToOrbitalState(orbRow),
    telemetry: null,
    solar: solRow ? rowToSolar(solRow) : null,
    activeEvent: evtRow ? rowToEvent(evtRow) : null,
  };
}

export async function incrementPageViews(): Promise<number> {
  const db = getPool();
  await db.execute(`UPDATE page_views SET count = count + 1 WHERE id = 1`);
  const [rows] = await db.execute(`SELECT count FROM page_views WHERE id = 1`);
  return (rows as { count: number }[])[0]?.count ?? 0;
}

// --- Row mappers ---

function rowToOrbitalState(row: Record<string, unknown>): OrbitalState {
  return {
    timestamp: String(row.timestamp),
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    altitude: Number(row.altitude),
    velocity: Number(row.velocity),
    speedKmH: Number(row.speed_kmh),
    period: Number(row.period_s ?? 0),
    inclination: Number(row.inclination ?? 51.64),
    eccentricity: Number(row.eccentricity ?? 0),
    apoapsis: Number(row.apoapsis ?? 0),
    periapsis: Number(row.periapsis ?? 0),
    revolutionNumber: Number(row.revolution_number ?? 0),
    isInSunlight: Boolean(row.is_in_sunlight),
    sunriseIn: null,
    sunsetIn: null,
  };
}

function rowToSolar(row: Record<string, unknown>): SolarActivity {
  return {
    timestamp: String(row.timestamp),
    kpIndex: Number(row.kp_index),
    kpLabel: String(row.kp_label ?? ""),
    xrayFlux: Number(row.xray_flux ?? 0),
    xrayClass: String(row.xray_class ?? ""),
    protonFlux1MeV: Number(row.proton_flux_1mev ?? 0),
    protonFlux10MeV: Number(row.proton_flux_10mev ?? 0),
    protonFlux100MeV: Number(row.proton_flux_100mev ?? 0),
    radiationRisk: (row.radiation_risk as SolarActivity["radiationRisk"]) ?? "low",
  };
}

function rowToEvent(row: Record<string, unknown>): ISSEvent {
  return {
    id: String(row.id),
    type: row.type as ISSEvent["type"],
    title: String(row.title),
    description: String(row.description ?? ""),
    status: row.status as ISSEvent["status"],
    scheduledStart: String(row.scheduled_start),
    scheduledEnd: String(row.scheduled_end),
    actualStart: row.actual_start ? String(row.actual_start) : null,
    actualEnd: row.actual_end ? String(row.actual_end) : null,
    metadata: typeof row.metadata === "string" ? JSON.parse(row.metadata) : (row.metadata as Record<string, string>) ?? {},
  };
}
```

- [ ] **Step 3: Verify build**

```bash
npm run build
```

Expected: Build succeeds (mysql2 is a server-side dependency, no client bundle issues).

- [ ] **Step 4: Commit**

```bash
git add src/lib/db.ts src/lib/__tests__/db.test.ts
git commit -m "feat: add MySQL database layer with schema and query functions"
```

---

### Task 8: SSE Infrastructure

**Files:**
- Create: `src/lib/telemetry/sse-manager.ts`
- Create: `src/lib/telemetry/cache.ts`
- Test: `src/lib/telemetry/__tests__/sse-manager.test.ts`

- [ ] **Step 1: Write SSE manager test**

Create `src/lib/telemetry/__tests__/sse-manager.test.ts`:

```typescript
import { SseManager } from "../sse-manager";

describe("SseManager", () => {
  it("tracks client count", () => {
    const mgr = new SseManager();
    expect(mgr.getClientCount()).toBe(0);

    const mockController = {
      enqueue: jest.fn(),
      close: jest.fn(),
    } as unknown as ReadableStreamDefaultController;

    const cleanup = mgr.addClient(mockController);
    expect(mgr.getClientCount()).toBe(1);

    cleanup();
    expect(mgr.getClientCount()).toBe(0);
  });

  it("broadcasts to all clients", () => {
    const mgr = new SseManager();
    const enqueue1 = jest.fn();
    const enqueue2 = jest.fn();

    mgr.addClient({ enqueue: enqueue1, close: jest.fn() } as unknown as ReadableStreamDefaultController);
    mgr.addClient({ enqueue: enqueue2, close: jest.fn() } as unknown as ReadableStreamDefaultController);

    mgr.broadcast("telemetry", { altitude: 408 });

    expect(enqueue1).toHaveBeenCalled();
    expect(enqueue2).toHaveBeenCalled();
  });

  it("encodes SSE event format correctly", () => {
    const encoded = SseManager.encodeEvent("test", { value: 42 });
    expect(encoded).toBe('event: test\ndata: {"value":42}\n\n');
  });

  it("removes clients that error on enqueue", () => {
    const mgr = new SseManager();
    const badController = {
      enqueue: jest.fn(() => { throw new Error("closed"); }),
      close: jest.fn(),
    } as unknown as ReadableStreamDefaultController;

    mgr.addClient(badController);
    expect(mgr.getClientCount()).toBe(1);

    mgr.broadcast("test", {});
    expect(mgr.getClientCount()).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx jest src/lib/telemetry/__tests__/sse-manager.test.ts --no-cache
```

Expected: FAIL — cannot find module `../sse-manager`.

- [ ] **Step 3: Create SSE manager**

Create `src/lib/telemetry/sse-manager.ts`:

```typescript
const SHARED_ENCODER = new TextEncoder();
const KEEPALIVE_BYTES = SHARED_ENCODER.encode(":keepalive\n\n");

interface SseClient {
  controller: ReadableStreamDefaultController;
}

export class SseManager {
  private clients = new Set<SseClient>();
  private keepaliveTimer: ReturnType<typeof setInterval> | null = null;

  addClient(controller: ReadableStreamDefaultController): () => void {
    const client: SseClient = { controller };
    this.clients.add(client);
    this.ensureKeepalive();

    return () => {
      this.clients.delete(client);
      if (this.clients.size === 0 && this.keepaliveTimer) {
        clearInterval(this.keepaliveTimer);
        this.keepaliveTimer = null;
      }
    };
  }

  broadcast(event: string, data: unknown): void {
    const bytes = SHARED_ENCODER.encode(SseManager.encodeEvent(event, data));
    const toRemove: SseClient[] = [];

    for (const client of this.clients) {
      try {
        client.controller.enqueue(bytes);
      } catch {
        toRemove.push(client);
      }
    }

    for (const client of toRemove) {
      this.clients.delete(client);
    }
  }

  getClientCount(): number {
    return this.clients.size;
  }

  static encodeEvent(event: string, data: unknown): string {
    return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  }

  static encodeKeepAlive(): Uint8Array {
    return KEEPALIVE_BYTES;
  }

  private ensureKeepalive(): void {
    if (this.keepaliveTimer) return;
    this.keepaliveTimer = setInterval(() => {
      const toRemove: SseClient[] = [];
      for (const client of this.clients) {
        try {
          client.controller.enqueue(KEEPALIVE_BYTES);
        } catch {
          toRemove.push(client);
        }
      }
      for (const client of toRemove) {
        this.clients.delete(client);
      }
    }, 30_000);
  }
}
```

- [ ] **Step 4: Run SSE manager test**

```bash
npx jest src/lib/telemetry/__tests__/sse-manager.test.ts --no-cache
```

Expected: PASS — all 4 tests pass.

- [ ] **Step 5: Create telemetry cache**

Create `src/lib/telemetry/cache.ts`:

```typescript
import type { OrbitalState, ISSTelemetry, SolarActivity, ISSEvent } from "../types";

export class TelemetryCache {
  orbital: OrbitalState | null = null;
  telemetry: ISSTelemetry | null = null;
  solar: SolarActivity | null = null;
  activeEvent: ISSEvent | null = null;
  visitorCount = 0;

  getPayload() {
    return {
      orbital: this.orbital,
      telemetry: this.telemetry,
      solar: this.solar,
      activeEvent: this.activeEvent,
      visitorCount: this.visitorCount,
    };
  }
}
```

- [ ] **Step 6: Commit**

```bash
git add src/lib/telemetry/
git commit -m "feat: add SSE manager and telemetry cache"
```

---

### Task 9: NOAA SWPC Poller (Direct Port from Artemis)

**Files:**
- Create: `src/lib/pollers/solar.ts`
- Test: `src/lib/pollers/__tests__/solar.test.ts`

- [ ] **Step 1: Write solar poller test**

Create `src/lib/pollers/__tests__/solar.test.ts`:

```typescript
import { classifyKp, classifyXray, classifyRadiationRisk } from "../solar";

describe("Solar Activity Classification", () => {
  it("classifies Kp index correctly", () => {
    expect(classifyKp(2)).toBe("Quiet");
    expect(classifyKp(4)).toBe("Active");
    expect(classifyKp(6)).toBe("Storm");
    expect(classifyKp(8)).toBe("Severe Storm");
  });

  it("classifies X-ray flux correctly", () => {
    expect(classifyXray(1e-8)).toBe("A");
    expect(classifyXray(1e-7)).toBe("B");
    expect(classifyXray(1e-6)).toBe("C");
    expect(classifyXray(1e-5)).toBe("M");
    expect(classifyXray(1e-4)).toBe("X");
  });

  it("classifies radiation risk correctly", () => {
    expect(classifyRadiationRisk(2, 0.5, 1e-7)).toBe("low");
    expect(classifyRadiationRisk(5, 5, 1e-5)).toBe("moderate");
    expect(classifyRadiationRisk(7, 100, 1e-4)).toBe("severe");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx jest src/lib/pollers/__tests__/solar.test.ts --no-cache
```

Expected: FAIL — cannot find module `../solar`.

- [ ] **Step 3: Create solar poller**

Create `src/lib/pollers/solar.ts`. Port from Artemis (`artemis-tracker/src/lib/pollers/solar.ts`):

```typescript
import type { SolarActivity } from "../types";
import {
  NOAA_KP_URL,
  NOAA_XRAY_URL,
  NOAA_PROTON_URL,
} from "../constants";

export function classifyKp(kp: number): string {
  if (kp < 4) return "Quiet";
  if (kp < 5) return "Active";
  if (kp < 7) return "Storm";
  return "Severe Storm";
}

export function classifyXray(flux: number): string {
  if (flux < 1e-7) return "A";
  if (flux < 1e-6) return "B";
  if (flux < 1e-5) return "C";
  if (flux < 1e-4) return "M";
  return "X";
}

export function classifyRadiationRisk(
  kp: number,
  proton10MeV: number,
  xrayFlux: number
): "low" | "moderate" | "high" | "severe" {
  if (kp >= 7 || proton10MeV >= 100 || xrayFlux >= 1e-4) return "severe";
  if (kp >= 5 || proton10MeV >= 10 || xrayFlux >= 1e-5) return "high";
  if (kp >= 4 || proton10MeV >= 1 || xrayFlux >= 1e-6) return "moderate";
  return "low";
}

export async function pollSolarActivity(): Promise<SolarActivity | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);

    const [kpRes, xrayRes, protonRes] = await Promise.all([
      fetch(NOAA_KP_URL, { signal: controller.signal }),
      fetch(NOAA_XRAY_URL, { signal: controller.signal }),
      fetch(NOAA_PROTON_URL, { signal: controller.signal }),
    ]);

    clearTimeout(timeout);

    const kpData = await kpRes.json();
    const xrayData = await xrayRes.json();
    const protonData = await protonRes.json();

    // Kp index: last row, column index 1
    const latestKp = kpData[kpData.length - 1];
    const kpIndex = parseFloat(latestKp[1]) || 0;

    // X-ray: last entry with flux value
    const latestXray = xrayData[xrayData.length - 1];
    const xrayFlux = parseFloat(latestXray?.flux) || 0;

    // Proton flux: last entry per energy channel
    const proton1MeV = parseFloat(protonData.filter((d: { energy: string }) => d.energy === ">=1 MeV").pop()?.flux) || 0;
    const proton10MeV = parseFloat(protonData.filter((d: { energy: string }) => d.energy === ">=10 MeV").pop()?.flux) || 0;
    const proton100MeV = parseFloat(protonData.filter((d: { energy: string }) => d.energy === ">=100 MeV").pop()?.flux) || 0;

    return {
      timestamp: new Date().toISOString(),
      kpIndex,
      kpLabel: classifyKp(kpIndex),
      xrayFlux,
      xrayClass: classifyXray(xrayFlux),
      protonFlux1MeV: proton1MeV,
      protonFlux10MeV: proton10MeV,
      protonFlux100MeV: proton100MeV,
      radiationRisk: classifyRadiationRisk(kpIndex, proton10MeV, xrayFlux),
    };
  } catch {
    return null;
  }
}
```

- [ ] **Step 4: Run tests**

```bash
npx jest src/lib/pollers/__tests__/solar.test.ts --no-cache
```

Expected: PASS — all classification tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/pollers/solar.ts src/lib/pollers/__tests__/solar.test.ts
git commit -m "feat: add NOAA SWPC space weather poller (ported from Artemis)"
```

---

### Task 10: TLE Poller & SGP4 Propagator

**Files:**
- Create: `src/lib/pollers/tle-poller.ts`
- Create: `src/lib/pollers/sgp4-propagator.ts`
- Create: `src/lib/orbital.ts`
- Test: `src/lib/pollers/__tests__/sgp4-propagator.test.ts`

- [ ] **Step 1: Write SGP4 propagator test**

Create `src/lib/pollers/__tests__/sgp4-propagator.test.ts`:

```typescript
import { propagateFromTle, type TleData } from "../sgp4-propagator";

// Real ISS TLE from CelesTrak (epoch doesn't matter for structure test)
const SAMPLE_TLE: TleData = {
  line1: "1 25544U 98067A   24100.50000000  .00016717  00000-0  10270-3 0  9009",
  line2: "2 25544  51.6400 200.0000 0007417  35.5000 325.0000 15.49000000000009",
};

describe("SGP4 Propagator", () => {
  it("returns a valid position from TLE", () => {
    const result = propagateFromTle(SAMPLE_TLE, new Date());
    expect(result).not.toBeNull();
    if (result) {
      expect(result.latitude).toBeGreaterThanOrEqual(-90);
      expect(result.latitude).toBeLessThanOrEqual(90);
      expect(result.longitude).toBeGreaterThanOrEqual(-180);
      expect(result.longitude).toBeLessThanOrEqual(180);
      expect(result.altitude).toBeGreaterThan(300);
      expect(result.altitude).toBeLessThan(500);
      expect(result.velocity).toBeGreaterThan(7);
      expect(result.velocity).toBeLessThan(8);
    }
  });

  it("computes orbital parameters", () => {
    const result = propagateFromTle(SAMPLE_TLE, new Date());
    expect(result).not.toBeNull();
    if (result) {
      expect(result.inclination).toBeCloseTo(51.64, 1);
      expect(result.period).toBeGreaterThan(5400);
      expect(result.period).toBeLessThan(5700);
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx jest src/lib/pollers/__tests__/sgp4-propagator.test.ts --no-cache
```

Expected: FAIL — cannot find module `../sgp4-propagator`.

- [ ] **Step 3: Create SGP4 propagator**

Create `src/lib/pollers/sgp4-propagator.ts`:

```typescript
import {
  twoline2satrec,
  propagate,
  gstime,
  eciToGeodetic,
  degreesLong,
  degreesLat,
} from "satellite.js";
import { EARTH_RADIUS_KM } from "../constants";
import type { OrbitalState } from "../types";

export interface TleData {
  line1: string;
  line2: string;
}

export function propagateFromTle(
  tle: TleData,
  date: Date
): OrbitalState | null {
  try {
    const satrec = twoline2satrec(tle.line1, tle.line2);
    const result = propagate(satrec, date);

    if (typeof result.position === "boolean" || typeof result.velocity === "boolean") {
      return null;
    }

    const posEci = result.position;
    const velEci = result.velocity;
    const gmst = gstime(date);
    const geo = eciToGeodetic(posEci, gmst);

    const latitude = degreesLat(geo.latitude);
    const longitude = degreesLong(geo.longitude);
    const altitude = geo.height;
    const velocity = Math.sqrt(
      velEci.x ** 2 + velEci.y ** 2 + velEci.z ** 2
    );

    // Orbital parameters from TLE
    const inclination = parseFloat(tle.line2.substring(8, 16).trim());
    const eccentricity = parseFloat("0." + tle.line2.substring(26, 33).trim());
    const meanMotion = parseFloat(tle.line2.substring(52, 63).trim());
    const revolutionNumber = parseInt(tle.line2.substring(63, 68).trim(), 10) || 0;

    // Period in seconds from mean motion (revolutions per day)
    const period = (24 * 60 * 60) / meanMotion;

    // Semi-major axis from period: a = (GM * T^2 / 4π²)^(1/3)
    const GM = 398600.4418; // km³/s²
    const semiMajorAxis = Math.pow(
      (GM * period * period) / (4 * Math.PI * Math.PI),
      1 / 3
    );
    const apoapsis = semiMajorAxis * (1 + eccentricity) - EARTH_RADIUS_KM;
    const periapsis = semiMajorAxis * (1 - eccentricity) - EARTH_RADIUS_KM;

    // Day/night: check if satellite is in Earth's shadow
    const sunPos = computeSunPosition(date);
    const isInSunlight = checkSunlight(posEci, sunPos);

    return {
      timestamp: date.toISOString(),
      latitude,
      longitude,
      altitude,
      velocity,
      speedKmH: velocity * 3600,
      period,
      inclination,
      eccentricity,
      apoapsis,
      periapsis,
      revolutionNumber,
      isInSunlight,
      sunriseIn: null, // computed separately in orbital.ts
      sunsetIn: null,
    };
  } catch {
    return null;
  }
}

function computeSunPosition(date: Date): { x: number; y: number; z: number } {
  // Simplified solar position in ECI (adequate for shadow calculation)
  const JD =
    date.getTime() / 86400000 + 2440587.5;
  const T = (JD - 2451545.0) / 36525;
  const L = (280.46646 + 36000.76983 * T) % 360;
  const M = (357.52911 + 35999.05029 * T) % 360;
  const Mrad = (M * Math.PI) / 180;
  const C = 1.9146 * Math.sin(Mrad) + 0.02 * Math.sin(2 * Mrad);
  const sunLon = ((L + C) * Math.PI) / 180;
  const obliq = (23.439 - 0.013 * T) * (Math.PI / 180);
  const AU_KM = 149597870.7;

  return {
    x: AU_KM * Math.cos(sunLon),
    y: AU_KM * Math.cos(obliq) * Math.sin(sunLon),
    z: AU_KM * Math.sin(obliq) * Math.sin(sunLon),
  };
}

function checkSunlight(
  satPos: { x: number; y: number; z: number },
  sunPos: { x: number; y: number; z: number }
): boolean {
  // Check if satellite is in Earth's cylindrical shadow
  const satToSun = {
    x: sunPos.x - satPos.x,
    y: sunPos.y - satPos.y,
    z: sunPos.z - satPos.z,
  };
  const satDist = Math.sqrt(satPos.x ** 2 + satPos.y ** 2 + satPos.z ** 2);

  // Dot product of satellite position and satellite-to-sun vector
  const dot = satPos.x * satToSun.x + satPos.y * satToSun.y + satPos.z * satToSun.z;

  // If satellite is on the sun side of Earth, it's lit
  if (dot > 0) return true;

  // Check if satellite is within Earth's shadow cylinder
  const crossMag = Math.sqrt(
    (satPos.y * satToSun.z - satPos.z * satToSun.y) ** 2 +
    (satPos.z * satToSun.x - satPos.x * satToSun.z) ** 2 +
    (satPos.x * satToSun.y - satPos.y * satToSun.x) ** 2
  );
  const sunDist = Math.sqrt(satToSun.x ** 2 + satToSun.y ** 2 + satToSun.z ** 2);
  const perpDist = crossMag / sunDist;

  return perpDist > EARTH_RADIUS_KM;
}
```

- [ ] **Step 4: Create TLE poller**

Create `src/lib/pollers/tle-poller.ts`:

```typescript
import { CELESTRAK_TLE_URL } from "../constants";
import type { TleData } from "./sgp4-propagator";

let currentTle: TleData | null = null;

export function getCurrentTle(): TleData | null {
  return currentTle;
}

export async function pollTle(): Promise<TleData | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);

    const res = await fetch(CELESTRAK_TLE_URL, { signal: controller.signal });
    clearTimeout(timeout);

    if (!res.ok) return currentTle;

    const text = await res.text();
    const lines = text.trim().split("\n").map((l) => l.trim());

    // CelesTrak returns: name\nline1\nline2
    if (lines.length >= 3) {
      currentTle = { line1: lines[1], line2: lines[2] };
    } else if (lines.length >= 2) {
      currentTle = { line1: lines[0], line2: lines[1] };
    }

    return currentTle;
  } catch {
    return currentTle;
  }
}
```

- [ ] **Step 5: Run tests**

```bash
npx jest src/lib/pollers/__tests__/sgp4-propagator.test.ts --no-cache
```

Expected: PASS — position is within valid ISS ranges, orbital params are reasonable.

- [ ] **Step 6: Commit**

```bash
git add src/lib/pollers/tle-poller.ts src/lib/pollers/sgp4-propagator.ts src/lib/pollers/__tests__/sgp4-propagator.test.ts
git commit -m "feat: add TLE poller and SGP4 propagator for ISS position tracking"
```

---

### Task 11: Lightstreamer Client

**Files:**
- Create: `src/lib/telemetry/lightstreamer-client.ts`

- [ ] **Step 1: Create Lightstreamer client**

Create `src/lib/telemetry/lightstreamer-client.ts`:

```typescript
import { LightstreamerClient, Subscription } from "lightstreamer-client";
import { LIGHTSTREAMER_SERVER, LIGHTSTREAMER_ADAPTER } from "../constants";
import type { ISSTelemetry, LightstreamerChannel } from "../types";

// Key telemetry channel IDs to subscribe to
// Reference: github.com/sensedata/space-telemetry data_dictionary.js
const TELEMETRY_IDS = [
  // Power
  "USLAB000058", // Total solar array output (kW)
  "S0000005",    // Battery charge/discharge
  "S4000001",    // SAW 1A
  "S4000002",    // SAW 3A
  "P4000001",    // SAW 2B
  "P4000002",    // SAW 4B
  // Thermal
  "NODE1000001", // Node 1 temp
  "NODE2000001", // Node 2 temp
  "NODE3000001", // Node 3 temp
  "USLAB000001", // US Lab temp
  // Atmosphere
  "NODE3000007", // Cabin pressure (psia)
  "NODE3000008", // ppO2 (mmHg)
  "NODE3000009", // ppCO2 (mmHg)
  "NODE3000010", // Temperature
  "NODE3000011", // Humidity
  // Attitude / CMG
  "USLAB000019", // CMG 1 speed
  "USLAB000020", // CMG 2 speed
  "USLAB000021", // CMG 3 speed
  "USLAB000022", // CMG 4 speed
  // Time
  "TIME_000001", // Station time
];

type ChannelCallback = (channels: Record<string, LightstreamerChannel>) => void;

let client: LightstreamerClient | null = null;
let subscription: Subscription | null = null;
let channelData: Record<string, LightstreamerChannel> = {};
let listener: ChannelCallback | null = null;

export function connectLightstreamer(onUpdate: ChannelCallback): void {
  if (client) return;

  listener = onUpdate;
  client = new LightstreamerClient(LIGHTSTREAMER_SERVER, LIGHTSTREAMER_ADAPTER);
  client.connect();

  subscription = new Subscription("MERGE", TELEMETRY_IDS, [
    "TimeStamp",
    "Value",
    "Status.Class",
    "CalibratedData",
  ]);

  subscription.addListener({
    onItemUpdate(update) {
      const itemName = update.getItemName();
      const value = update.getValue("Value") ?? update.getValue("CalibratedData") ?? "";
      const status = update.getValue("Status.Class") ?? "Normal";
      const tsStr = update.getValue("TimeStamp") ?? "";
      const ts = tsStr ? parseFloat(tsStr) : Date.now() / 1000;

      channelData[itemName] = { value, status, timestamp: ts };

      if (listener) {
        listener({ ...channelData });
      }
    },
  });

  client.subscribe(subscription);
}

export function disconnectLightstreamer(): void {
  if (subscription && client) {
    client.unsubscribe(subscription);
  }
  if (client) {
    client.disconnect();
  }
  client = null;
  subscription = null;
  channelData = {};
  listener = null;
}

export function getLatestChannels(): Record<string, LightstreamerChannel> {
  return { ...channelData };
}

export function deriveTelemetry(channels: Record<string, LightstreamerChannel>): ISSTelemetry {
  const val = (id: string) => parseFloat(channels[id]?.value ?? "0") || 0;

  return {
    timestamp: new Date().toISOString(),
    powerKw: val("USLAB000058"),
    temperatureC: val("USLAB000001"),
    pressurePsi: val("NODE3000007"),
    oxygenPercent: val("NODE3000008") > 0 ? (val("NODE3000008") / 760) * 100 : 21,
    co2Percent: val("NODE3000009") > 0 ? (val("NODE3000009") / 760) * 100 : 0.04,
    attitudeMode: "TEA", // derived from CMG state in practice
    channels,
  };
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```

Expected: Build succeeds (lightstreamer-client is server-only).

- [ ] **Step 3: Commit**

```bash
git add src/lib/telemetry/lightstreamer-client.ts
git commit -m "feat: add Lightstreamer client for NASA ISS Live telemetry"
```

---

### Task 12: Pass Predictor

**Files:**
- Create: `src/lib/pollers/pass-predictor.ts`
- Test: `src/lib/pollers/__tests__/pass-predictor.test.ts`

- [ ] **Step 1: Write pass predictor test**

Create `src/lib/pollers/__tests__/pass-predictor.test.ts`:

```typescript
import { predictPasses, classifyPassQuality } from "../pass-predictor";
import type { TleData } from "../sgp4-propagator";

const SAMPLE_TLE: TleData = {
  line1: "1 25544U 98067A   24100.50000000  .00016717  00000-0  10270-3 0  9009",
  line2: "2 25544  51.6400 200.0000 0007417  35.5000 325.0000 15.49000000000009",
};

describe("Pass Predictor", () => {
  it("finds passes for a given location", () => {
    const passes = predictPasses(SAMPLE_TLE, 45.5, -73.6, 24);
    expect(Array.isArray(passes)).toBe(true);
    // ISS should have at least a few passes in 24 hours from anywhere
    expect(passes.length).toBeGreaterThan(0);
    passes.forEach((p) => {
      expect(p.maxElevation).toBeGreaterThan(0);
      expect(p.maxElevation).toBeLessThanOrEqual(90);
    });
  });

  it("classifies pass quality correctly", () => {
    expect(classifyPassQuality(70, -3.0)).toBe("bright");
    expect(classifyPassQuality(40, -2.0)).toBe("good");
    expect(classifyPassQuality(25, -1.0)).toBe("fair");
    expect(classifyPassQuality(10, 0.5)).toBe("poor");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx jest src/lib/pollers/__tests__/pass-predictor.test.ts --no-cache
```

Expected: FAIL — cannot find module `../pass-predictor`.

- [ ] **Step 3: Create pass predictor**

Create `src/lib/pollers/pass-predictor.ts`:

```typescript
import {
  twoline2satrec,
  propagate,
  gstime,
  eciToGeodetic,
  eciToEcf,
  ecfToLookAngles,
  degreesLong,
  degreesLat,
} from "satellite.js";
import { EARTH_RADIUS_KM } from "../constants";
import type { TleData } from "./sgp4-propagator";
import type { PassPrediction, PassQuality } from "../types";

const MIN_ELEVATION = 10; // degrees above horizon
const STEP_SECONDS = 30; // coarse scan step
const FINE_STEP_SECONDS = 5; // fine scan step

export function classifyPassQuality(
  maxElevation: number,
  magnitude: number
): PassQuality {
  if (maxElevation >= 50 && magnitude <= -2.5) return "bright";
  if (maxElevation >= 30 && magnitude <= -1.5) return "good";
  if (maxElevation >= 15) return "fair";
  return "poor";
}

export function predictPasses(
  tle: TleData,
  observerLat: number,
  observerLon: number,
  hoursAhead: number = 48
): PassPrediction[] {
  const satrec = twoline2satrec(tle.line1, tle.line2);
  const observerGd = {
    longitude: (observerLon * Math.PI) / 180,
    latitude: (observerLat * Math.PI) / 180,
    height: 0,
  };

  const passes: PassPrediction[] = [];
  const now = new Date();
  const endTime = new Date(now.getTime() + hoursAhead * 3600000);

  let time = new Date(now);
  let wasAboveHorizon = false;
  let passStart: Date | null = null;
  let maxEl = 0;
  let maxElTime: Date | null = null;
  let riseAz = 0;

  while (time <= endTime && passes.length < 20) {
    const result = propagate(satrec, time);
    if (typeof result.position === "boolean") {
      time = new Date(time.getTime() + STEP_SECONDS * 1000);
      continue;
    }

    const gmst = gstime(time);
    const ecf = eciToEcf(result.position, gmst);
    const lookAngles = ecfToLookAngles(observerGd, ecf);
    const elevation = (lookAngles.elevation * 180) / Math.PI;
    const azimuth = (lookAngles.azimuth * 180) / Math.PI;

    const isAbove = elevation >= MIN_ELEVATION;

    if (isAbove && !wasAboveHorizon) {
      // Pass started
      passStart = new Date(time);
      riseAz = azimuth;
      maxEl = elevation;
      maxElTime = new Date(time);
    }

    if (isAbove && elevation > maxEl) {
      maxEl = elevation;
      maxElTime = new Date(time);
    }

    if (!isAbove && wasAboveHorizon && passStart && maxElTime) {
      // Pass ended
      // Approximate ISS magnitude based on altitude and phase angle
      const geo = eciToGeodetic(result.position, gmst);
      const alt = geo.height;
      const magnitude = estimateMagnitude(alt, maxEl);

      passes.push({
        riseTime: passStart.toISOString(),
        riseAzimuth: Math.round(riseAz),
        maxTime: maxElTime.toISOString(),
        maxElevation: Math.round(maxEl),
        setTime: time.toISOString(),
        setAzimuth: Math.round(azimuth),
        magnitude: Math.round(magnitude * 10) / 10,
        quality: classifyPassQuality(maxEl, magnitude),
      });

      passStart = null;
      maxEl = 0;
      maxElTime = null;
    }

    wasAboveHorizon = isAbove;
    time = new Date(time.getTime() + STEP_SECONDS * 1000);
  }

  return passes;
}

function estimateMagnitude(altitudeKm: number, elevationDeg: number): number {
  // ISS base magnitude ~= -3.5 at zenith, dimmer at lower elevations
  // Rough approximation based on range
  const rangeKm = altitudeKm / Math.sin((elevationDeg * Math.PI) / 180);
  const baseMag = -3.5;
  const rangeFactor = 5 * Math.log10(rangeKm / 400);
  return baseMag + rangeFactor;
}
```

- [ ] **Step 4: Run tests**

```bash
npx jest src/lib/pollers/__tests__/pass-predictor.test.ts --no-cache
```

Expected: PASS — passes found and quality classified correctly.

- [ ] **Step 5: Commit**

```bash
git add src/lib/pollers/pass-predictor.ts src/lib/pollers/__tests__/pass-predictor.test.ts
git commit -m "feat: add ISS pass predictor with SGP4-based visibility computation"
```

---

### Task 13: Time Context & Event Context

**Files:**
- Create: `src/context/TimeContext.tsx`
- Create: `src/context/EventContext.tsx`

- [ ] **Step 1: Create TimeContext**

Create `src/context/TimeContext.tsx`:

```tsx
"use client";

import { createContext, useContext, useState, useRef, useEffect, useCallback, type ReactNode } from "react";
import type { PlaybackSpeed } from "@/lib/types";

type TimeMode = "LIVE" | "SIM";

interface TimeContextValue {
  mode: TimeMode;
  setMode: (mode: TimeMode) => void;
  currentTime: Date;
  simTime: Date;
  setSimTime: (time: Date) => void;
  playbackSpeed: PlaybackSpeed;
  setPlaybackSpeed: (speed: PlaybackSpeed) => void;
  jumpTo: (time: Date) => void;
}

const TimeContext = createContext<TimeContextValue | null>(null);

export function TimeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<TimeMode>("LIVE");
  const [currentTime, setCurrentTime] = useState(new Date());
  const [simTime, setSimTime] = useState(new Date());
  const [playbackSpeed, setPlaybackSpeed] = useState<PlaybackSpeed>(1);
  const lastFrameRef = useRef(Date.now());
  const rafRef = useRef<number | null>(null);

  const tick = useCallback(() => {
    const now = Date.now();
    const delta = now - lastFrameRef.current;
    lastFrameRef.current = now;

    setCurrentTime(new Date());

    if (mode === "SIM" && playbackSpeed > 0) {
      setSimTime((prev) => new Date(prev.getTime() + delta * playbackSpeed));
    }

    rafRef.current = requestAnimationFrame(tick);
  }, [mode, playbackSpeed]);

  useEffect(() => {
    lastFrameRef.current = Date.now();
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [tick]);

  const jumpTo = useCallback((time: Date) => {
    setMode("SIM");
    setPlaybackSpeed(0);
    setSimTime(time);
  }, []);

  const effectiveTime = mode === "LIVE" ? currentTime : simTime;

  return (
    <TimeContext.Provider
      value={{
        mode,
        setMode,
        currentTime: effectiveTime,
        simTime,
        setSimTime,
        playbackSpeed,
        setPlaybackSpeed,
        jumpTo,
      }}
    >
      {children}
    </TimeContext.Provider>
  );
}

export function useTime() {
  const ctx = useContext(TimeContext);
  if (!ctx) throw new Error("useTime must be used within TimeProvider");
  return ctx;
}
```

- [ ] **Step 2: Create EventContext**

Create `src/context/EventContext.tsx`:

```tsx
"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import type { ISSEvent } from "@/lib/types";

interface EventContextValue {
  activeEvent: ISSEvent | null;
  setActiveEvent: (event: ISSEvent | null) => void;
  isEventMode: boolean;
  upcomingEvents: ISSEvent[];
  setUpcomingEvents: (events: ISSEvent[]) => void;
}

const EventContext = createContext<EventContextValue | null>(null);

export function EventProvider({ children }: { children: ReactNode }) {
  const [activeEvent, setActiveEventState] = useState<ISSEvent | null>(null);
  const [upcomingEvents, setUpcomingEvents] = useState<ISSEvent[]>([]);

  const setActiveEvent = useCallback((event: ISSEvent | null) => {
    setActiveEventState(event);
  }, []);

  return (
    <EventContext.Provider
      value={{
        activeEvent,
        setActiveEvent,
        isEventMode: activeEvent !== null && activeEvent.status === "active",
        upcomingEvents,
        setUpcomingEvents,
      }}
    >
      {children}
    </EventContext.Provider>
  );
}

export function useEvent() {
  const ctx = useContext(EventContext);
  if (!ctx) throw new Error("useEvent must be used within EventProvider");
  return ctx;
}
```

- [ ] **Step 3: Wire contexts into layout**

Update `src/app/layout.tsx` to include TimeProvider and EventProvider:

```tsx
import { LocaleProvider } from "@/context/LocaleContext";
import { TimeProvider } from "@/context/TimeContext";
import { EventProvider } from "@/context/EventContext";

// In the body:
<LocaleProvider>
  <TimeProvider>
    <EventProvider>
      <main id="main">{children}</main>
    </EventProvider>
  </TimeProvider>
</LocaleProvider>
```

- [ ] **Step 4: Verify build**

```bash
npm run build
```

Expected: Build succeeds.

- [ ] **Step 5: Commit**

```bash
git add src/context/TimeContext.tsx src/context/EventContext.tsx src/app/layout.tsx
git commit -m "feat: add TimeContext (LIVE/SIM mode) and EventContext providers"
```

---

### Task 14: Client-Side SSE Hook

**Files:**
- Create: `src/hooks/useTelemetryStream.ts`
- Create: `src/hooks/useSimTelemetry.ts`

- [ ] **Step 1: Create useTelemetryStream hook**

Create `src/hooks/useTelemetryStream.ts`:

```typescript
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { OrbitalState, ISSTelemetry, SolarActivity, ISSEvent } from "@/lib/types";

interface TelemetryStreamState {
  orbital: OrbitalState | null;
  telemetry: ISSTelemetry | null;
  solar: SolarActivity | null;
  activeEvent: ISSEvent | null;
  connected: boolean;
  reconnecting: boolean;
  lastUpdate: number | null;
  visitorCount: number;
}

const INITIAL_STATE: TelemetryStreamState = {
  orbital: null,
  telemetry: null,
  solar: null,
  activeEvent: null,
  connected: false,
  reconnecting: false,
  lastUpdate: null,
  visitorCount: 0,
};

export function useTelemetryStream(enabled: boolean = true): TelemetryStreamState {
  const [state, setState] = useState<TelemetryStreamState>(INITIAL_STATE);
  const backoffRef = useRef(1000);
  const unmountedRef = useRef(false);

  const connect = useCallback(() => {
    if (unmountedRef.current || !enabled) return;

    const es = new EventSource("/api/telemetry/stream");

    es.addEventListener("telemetry", (e) => {
      if (unmountedRef.current) return;
      try {
        const data = JSON.parse(e.data);
        setState((prev) => ({
          ...prev,
          orbital: data.orbital ?? prev.orbital,
          telemetry: data.telemetry ?? prev.telemetry,
          solar: data.solar ?? prev.solar,
          activeEvent: data.activeEvent ?? prev.activeEvent,
          lastUpdate: Date.now(),
        }));
        backoffRef.current = 1000;
      } catch {}
    });

    es.addEventListener("solar", (e) => {
      if (unmountedRef.current) return;
      try {
        setState((prev) => ({ ...prev, solar: JSON.parse(e.data) }));
      } catch {}
    });

    es.addEventListener("event", (e) => {
      if (unmountedRef.current) return;
      try {
        setState((prev) => ({ ...prev, activeEvent: JSON.parse(e.data) }));
      } catch {}
    });

    es.addEventListener("visitors", (e) => {
      if (unmountedRef.current) return;
      try {
        setState((prev) => ({ ...prev, visitorCount: JSON.parse(e.data).count }));
      } catch {}
    });

    es.onopen = () => {
      if (unmountedRef.current) return;
      setState((prev) => ({ ...prev, connected: true, reconnecting: false }));
    };

    es.onerror = () => {
      if (unmountedRef.current) return;
      es.close();
      setState((prev) => ({ ...prev, connected: false, reconnecting: true }));
      setTimeout(connect, backoffRef.current);
      backoffRef.current = Math.min(backoffRef.current * 2, 30_000);
    };

    return es;
  }, [enabled]);

  useEffect(() => {
    unmountedRef.current = false;
    const es = connect();
    return () => {
      unmountedRef.current = true;
      es?.close();
    };
  }, [connect]);

  return state;
}
```

- [ ] **Step 2: Create useSimTelemetry hook**

Create `src/hooks/useSimTelemetry.ts`:

```typescript
"use client";

import { useState, useEffect, useRef } from "react";
import { useTime } from "@/context/TimeContext";
import type { Snapshot } from "@/lib/types";

export function useSimTelemetry(): Snapshot | null {
  const { mode, simTime } = useTime();
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const lastFetchRef = useRef<string>("");

  useEffect(() => {
    if (mode !== "SIM") return;

    const ts = simTime.toISOString();
    // Debounce: don't refetch for the same second
    const rounded = ts.substring(0, 19);
    if (rounded === lastFetchRef.current) return;
    lastFetchRef.current = rounded;

    let cancelled = false;

    fetch(`/api/snapshot?timestamp=${encodeURIComponent(ts)}`)
      .then((r) => r.json())
      .then((data: Snapshot) => {
        if (!cancelled) setSnapshot(data);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [mode, simTime]);

  return mode === "SIM" ? snapshot : null;
}
```

- [ ] **Step 3: Verify build**

```bash
npm run build
```

Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/hooks/useTelemetryStream.ts src/hooks/useSimTelemetry.ts
git commit -m "feat: add SSE telemetry stream hook and SIM mode snapshot hook"
```

---

### Task 15: SSE Route Handler

**Files:**
- Create: `src/app/api/telemetry/stream/route.ts`

- [ ] **Step 1: Create SSE stream route**

Create `src/app/api/telemetry/stream/route.ts`:

```typescript
import { SseManager } from "@/lib/telemetry/sse-manager";
import { TelemetryCache } from "@/lib/telemetry/cache";
import { pollTle, getCurrentTle } from "@/lib/pollers/tle-poller";
import { propagateFromTle } from "@/lib/pollers/sgp4-propagator";
import { pollSolarActivity } from "@/lib/pollers/solar";
import { connectLightstreamer, deriveTelemetry } from "@/lib/telemetry/lightstreamer-client";
import { archiveOrbitalState, archiveSolar, initializeSchema } from "@/lib/db";
import {
  TLE_POLL_INTERVAL_MS,
  SGP4_TICK_INTERVAL_MS,
  SOLAR_POLL_INTERVAL_MS,
  SSE_BROADCAST_INTERVAL_MS,
  VISITOR_COUNT_INTERVAL_MS,
} from "@/lib/constants";

export const dynamic = "force-dynamic";

const cache = new TelemetryCache();
const sseManager = new SseManager();
let pollersStarted = false;

function ensurePollers(): void {
  if (pollersStarted) return;
  pollersStarted = true;

  // Initialize database
  initializeSchema().catch(console.error);

  // TLE poller: fetch every 2 hours
  pollTle().then(() => console.log("[TLE] Initial fetch complete"));
  setInterval(() => pollTle(), TLE_POLL_INTERVAL_MS);

  // SGP4 tick: propagate position every second
  setInterval(() => {
    const tle = getCurrentTle();
    if (!tle) return;

    const orbital = propagateFromTle(tle, new Date());
    if (orbital) {
      cache.orbital = orbital;
      // Archive every 10th tick (10 seconds)
      if (Date.now() % 10000 < SGP4_TICK_INTERVAL_MS) {
        archiveOrbitalState(orbital).catch(() => {});
      }
    }
  }, SGP4_TICK_INTERVAL_MS);

  // Lightstreamer: connect for ISS telemetry
  connectLightstreamer((channels) => {
    cache.telemetry = deriveTelemetry(channels);
  });

  // Solar poller
  const solarPoll = async () => {
    const solar = await pollSolarActivity();
    if (solar) {
      cache.solar = solar;
      archiveSolar(solar).catch(() => {});
      sseManager.broadcast("solar", solar);
    }
  };
  solarPoll();
  setInterval(solarPoll, SOLAR_POLL_INTERVAL_MS);

  // Broadcast telemetry every second
  setInterval(() => {
    const payload = cache.getPayload();
    if (payload.orbital) {
      sseManager.broadcast("telemetry", payload);
    }
  }, SSE_BROADCAST_INTERVAL_MS);

  // Visitor count broadcast
  setInterval(() => {
    sseManager.broadcast("visitors", { count: sseManager.getClientCount() });
  }, VISITOR_COUNT_INTERVAL_MS);
}

export async function GET(): Promise<Response> {
  ensurePollers();

  const stream = new ReadableStream({
    start(controller) {
      const cleanup = sseManager.addClient(controller);

      // Send initial cached data
      const payload = cache.getPayload();
      if (payload.orbital) {
        const bytes = new TextEncoder().encode(
          SseManager.encodeEvent("telemetry", payload)
        );
        try {
          controller.enqueue(bytes);
        } catch {}
      }

      // Cleanup on disconnect
      const checkInterval = setInterval(() => {
        try {
          controller.enqueue(SseManager.encodeKeepAlive());
        } catch {
          clearInterval(checkInterval);
          cleanup();
        }
      }, 30_000);
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
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```

Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/telemetry/stream/route.ts
git commit -m "feat: add SSE telemetry stream route with polling orchestration"
```

---

### Task 16: REST API Routes

**Files:**
- Create: `src/app/api/orbit/route.ts`
- Create: `src/app/api/weather/route.ts`
- Create: `src/app/api/passes/route.ts`
- Create: `src/app/api/events/route.ts`
- Create: `src/app/api/history/route.ts`
- Create: `src/app/api/snapshot/route.ts`
- Create: `src/app/api/admin/events/route.ts`

- [ ] **Step 1: Create orbit route**

Create `src/app/api/orbit/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { getCurrentTle } from "@/lib/pollers/tle-poller";
import { propagateFromTle } from "@/lib/pollers/sgp4-propagator";

export const dynamic = "force-dynamic";

export async function GET() {
  const tle = getCurrentTle();
  if (!tle) {
    return NextResponse.json({ error: "No TLE data available" }, { status: 503 });
  }

  const orbital = propagateFromTle(tle, new Date());
  if (!orbital) {
    return NextResponse.json({ error: "Propagation failed" }, { status: 500 });
  }

  return NextResponse.json(orbital);
}
```

- [ ] **Step 2: Create weather route**

Create `src/app/api/weather/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { pollSolarActivity } from "@/lib/pollers/solar";

export const dynamic = "force-dynamic";

let cached: Awaited<ReturnType<typeof pollSolarActivity>> = null;
let lastFetch = 0;

export async function GET() {
  if (Date.now() - lastFetch > 60_000 || !cached) {
    cached = await pollSolarActivity();
    lastFetch = Date.now();
  }

  if (!cached) {
    return NextResponse.json({ error: "Space weather unavailable" }, { status: 503 });
  }

  return NextResponse.json(cached);
}
```

- [ ] **Step 3: Create passes route**

Create `src/app/api/passes/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getCurrentTle } from "@/lib/pollers/tle-poller";
import { predictPasses } from "@/lib/pollers/pass-predictor";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const lat = parseFloat(searchParams.get("lat") ?? "");
  const lon = parseFloat(searchParams.get("lon") ?? "");

  if (isNaN(lat) || isNaN(lon)) {
    return NextResponse.json({ error: "lat and lon query params required" }, { status: 400 });
  }

  const tle = getCurrentTle();
  if (!tle) {
    return NextResponse.json({ error: "No TLE data available" }, { status: 503 });
  }

  const hours = parseInt(searchParams.get("hours") ?? "48", 10);
  const passes = predictPasses(tle, lat, lon, Math.min(hours, 168));

  return NextResponse.json(passes);
}
```

- [ ] **Step 4: Create events route**

Create `src/app/api/events/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { getUpcomingEvents, getActiveEvents } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [active, upcoming] = await Promise.all([
      getActiveEvents(),
      getUpcomingEvents(5),
    ]);
    return NextResponse.json({ active, upcoming });
  } catch {
    return NextResponse.json({ active: [], upcoming: [] });
  }
}
```

- [ ] **Step 5: Create history route**

Create `src/app/api/history/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getMetricHistory } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const metric = searchParams.get("metric") ?? "altitude";
  const hours = parseInt(searchParams.get("hours") ?? "24", 10);
  const points = parseInt(searchParams.get("points") ?? "60", 10);

  const history = await getMetricHistory(metric, Math.min(hours, 168), Math.min(points, 500));
  return NextResponse.json(history);
}
```

- [ ] **Step 6: Create snapshot route**

Create `src/app/api/snapshot/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getSnapshotAt } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const timestamp = searchParams.get("timestamp");

  if (!timestamp) {
    return NextResponse.json({ error: "timestamp query param required" }, { status: 400 });
  }

  const snapshot = await getSnapshotAt(timestamp);
  if (!snapshot) {
    return NextResponse.json({ error: "No data for timestamp" }, { status: 404 });
  }

  return NextResponse.json(snapshot);
}
```

- [ ] **Step 7: Create admin events route**

Create `src/app/api/admin/events/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { upsertEvent } from "@/lib/db";
import type { ISSEvent } from "@/lib/types";

export const dynamic = "force-dynamic";

const ADMIN_TOKEN = process.env.ADMIN_TOKEN ?? "changeme";

function checkAuth(request: NextRequest): boolean {
  const token = request.headers.get("Authorization")?.replace("Bearer ", "");
  return token === ADMIN_TOKEN;
}

export async function POST(request: NextRequest) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const event = (await request.json()) as ISSEvent;
  await upsertEvent(event);
  return NextResponse.json({ ok: true });
}

export async function PUT(request: NextRequest) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const event = (await request.json()) as ISSEvent;
  await upsertEvent(event);
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 8: Verify build**

```bash
npm run build
```

Expected: Build succeeds.

- [ ] **Step 9: Commit**

```bash
git add src/app/api/
git commit -m "feat: add REST API routes (orbit, weather, passes, events, history, snapshot, admin)"
```

---

### Task 17: Dashboard Shell (TopBar, BottomBar, Dashboard)

**Files:**
- Create: `src/components/TopBar.tsx`
- Create: `src/components/BottomBar.tsx`
- Create: `src/components/Dashboard.tsx`
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Create TopBar**

Create `src/components/TopBar.tsx`:

```tsx
"use client";

import { useLocale } from "@/context/LocaleContext";
import type { OrbitalState } from "@/lib/types";

interface TopBarProps {
  orbital: OrbitalState | null;
  connected: boolean;
  reconnecting: boolean;
  lastUpdate: number | null;
  visitorCount: number;
}

export function TopBar({ orbital, connected, reconnecting, lastUpdate, visitorCount }: TopBarProps) {
  const { t } = useLocale();
  const now = new Date();
  const utc = now.toISOString().substring(11, 19);

  const stale = lastUpdate ? Date.now() - lastUpdate > 600_000 : false;

  return (
    <div className="dashboard-topbar" style={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      padding: "0 16px",
      background: "var(--bg-panel)",
      borderBottom: "1px solid var(--border-panel)",
      fontSize: 10,
      color: "var(--text-dim)",
    }}>
      <div style={{ display: "flex", gap: 24, alignItems: "center" }}>
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {connected ? (
            <span className="live-dot" />
          ) : reconnecting ? (
            <span style={{ color: "var(--accent-orange)" }}>RECONNECTING</span>
          ) : (
            <span style={{ color: "var(--accent-red)" }}>OFFLINE</span>
          )}
          <span style={{ color: "var(--accent-cyan)", fontWeight: 600 }}>🛰️ ISS</span>
          {visitorCount > 0 && (
            <span style={{ color: "var(--text-dim)" }}>👁 {visitorCount}</span>
          )}
        </span>

        {orbital && (
          <>
            <Metric label={t("topbar.altitude")} value={`${orbital.altitude.toFixed(1)} km`} />
            <Metric label={t("topbar.speed")} value={`${Math.round(orbital.speedKmH).toLocaleString()} km/h`} />
            <Metric label={t("topbar.latitude")} value={`${orbital.latitude >= 0 ? "+" : ""}${orbital.latitude.toFixed(1)}°`} />
            <Metric label={t("topbar.longitude")} value={`${orbital.longitude >= 0 ? "+" : ""}${orbital.longitude.toFixed(1)}°`} />
            <Metric label={t("topbar.orbit")} value={`#${orbital.revolutionNumber.toLocaleString()}`} />
          </>
        )}
      </div>

      <div style={{ display: "flex", gap: 24 }}>
        {orbital && (
          <Metric label={t("topbar.period")} value={`${Math.floor(orbital.period / 60)}m ${Math.round(orbital.period % 60)}s`} />
        )}
        {stale && <span style={{ color: "var(--accent-orange)" }}>DELAYED</span>}
        <span>UTC <span style={{ color: "var(--accent-cyan)" }}>{utc}</span></span>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <span>
      {label} <span style={{ color: "var(--text-primary)" }}>{value}</span>
    </span>
  );
}
```

- [ ] **Step 2: Create BottomBar**

Create `src/components/BottomBar.tsx`:

```tsx
"use client";

import { useTime } from "@/context/TimeContext";
import { useLocale } from "@/context/LocaleContext";
import { PLAYBACK_SPEEDS } from "@/lib/constants";
import type { PlaybackSpeed } from "@/lib/types";

export function BottomBar() {
  const { mode, setMode, playbackSpeed, setPlaybackSpeed } = useTime();
  const { locale, setLocale } = useLocale();

  return (
    <div className="dashboard-bottombar" style={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      padding: "0 16px",
      background: "var(--bg-panel)",
      borderTop: "1px solid var(--border-panel)",
      fontSize: 9,
      color: "var(--text-dim)",
    }}>
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <button
          onClick={() => setMode("LIVE")}
          style={{
            padding: "2px 8px",
            background: mode === "LIVE" ? "var(--accent-green)" : "var(--bg-surface)",
            color: mode === "LIVE" ? "var(--bg-primary)" : "var(--text-dim)",
            border: "none",
            borderRadius: 3,
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: "inherit",
            fontSize: 9,
          }}
        >
          LIVE
        </button>
        <button
          onClick={() => setMode("SIM")}
          style={{
            padding: "2px 8px",
            background: mode === "SIM" ? "var(--accent-cyan)" : "var(--bg-surface)",
            color: mode === "SIM" ? "var(--bg-primary)" : "var(--text-dim)",
            border: "none",
            borderRadius: 3,
            cursor: "pointer",
            fontFamily: "inherit",
            fontSize: 9,
          }}
        >
          SIM
        </button>

        {mode === "SIM" && (
          <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
            {PLAYBACK_SPEEDS.map((speed) => (
              <button
                key={speed}
                onClick={() => setPlaybackSpeed(speed as PlaybackSpeed)}
                style={{
                  padding: "2px 6px",
                  background: playbackSpeed === speed ? "var(--accent-cyan)" : "var(--bg-surface)",
                  color: playbackSpeed === speed ? "var(--bg-primary)" : "var(--text-dim)",
                  border: "none",
                  borderRadius: 3,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  fontSize: 9,
                }}
              >
                {speed === 0 ? "⏸" : `${speed}×`}
              </button>
            ))}
          </div>
        )}
      </div>

      <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
        <button
          onClick={() => setLocale(locale === "en" ? "fr" : "en")}
          style={{
            background: "none",
            border: "none",
            color: "var(--text-dim)",
            cursor: "pointer",
            fontFamily: "inherit",
            fontSize: 9,
          }}
        >
          {locale === "en" ? "EN / FR" : "FR / EN"}
        </button>
        <span>iss.cdnspace.ca</span>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create Dashboard component**

Create `src/components/Dashboard.tsx`:

```tsx
"use client";

import { memo } from "react";
import { TopBar } from "./TopBar";
import { BottomBar } from "./BottomBar";
import { useTelemetryStream } from "@/hooks/useTelemetryStream";
import { useTime } from "@/context/TimeContext";
import { useEvent } from "@/context/EventContext";

const MemoTopBar = memo(TopBar);
const MemoBottomBar = memo(BottomBar);

export function Dashboard() {
  const { mode } = useTime();
  const stream = useTelemetryStream(mode === "LIVE");
  const { activeEvent } = useEvent();

  return (
    <div className="dashboard-grid">
      <MemoTopBar
        orbital={stream.orbital}
        connected={stream.connected}
        reconnecting={stream.reconnecting}
        lastUpdate={stream.lastUpdate}
        visitorCount={stream.visitorCount}
      />

      <div className="dashboard-timeline">
        {/* TimelinePanel will go here */}
      </div>

      <div className="dashboard-left">
        {/* GroundTrackPanel */}
        {/* OrbitalParamsPanel */}
        {/* SpaceWeatherPanel */}
        {/* PassPredictionPanel */}
        <div className="panel">
          <div className="panel-header" style={{ color: "var(--accent-cyan)" }}>
            🗺️ GROUND TRACK
          </div>
          <div className="panel-body" style={{ height: 200, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-dim)" }}>
            Ground track map coming soon
          </div>
        </div>
      </div>

      <div className="dashboard-center">
        {/* LiveVideoPanel */}
        {/* ISSSystemsPanel */}
        <div className="panel">
          <div className="panel-header" style={{ color: "var(--accent-red)" }}>
            🔴 LIVE VIDEO
          </div>
          <div className="panel-body" style={{ height: 200, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-dim)" }}>
            Live video coming soon
          </div>
        </div>
      </div>

      <div className="dashboard-right">
        {/* EventBannerPanel (conditional) */}
        {activeEvent && activeEvent.status === "active" && (
          <div className="panel event-active" style={{ borderColor: "var(--accent-red)" }}>
            <div className="panel-header" style={{ color: "var(--accent-red)", fontWeight: 600 }}>
              🚀 {activeEvent.title}
            </div>
            <div className="panel-body">Active event placeholder</div>
          </div>
        )}
        {/* CrewRosterPanel */}
        {/* UpcomingEventsPanel */}
        {/* DayNightPanel */}
        <div className="panel">
          <div className="panel-header" style={{ color: "var(--accent-cyan)" }}>
            👨‍🚀 CREW
          </div>
          <div className="panel-body" style={{ color: "var(--text-dim)" }}>
            Crew roster coming soon
          </div>
        </div>
      </div>

      <MemoBottomBar />
    </div>
  );
}
```

- [ ] **Step 4: Update page.tsx to render Dashboard**

Replace `src/app/page.tsx`:

```tsx
import { Dashboard } from "@/components/Dashboard";

export default function Home() {
  return <Dashboard />;
}
```

- [ ] **Step 5: Verify build**

```bash
npm run build
```

Expected: Build succeeds. Page shows the 3-column dashboard grid with TopBar, BottomBar, and placeholder panels.

- [ ] **Step 6: Commit**

```bash
git add src/components/TopBar.tsx src/components/BottomBar.tsx src/components/Dashboard.tsx src/app/page.tsx
git commit -m "feat: add dashboard shell with TopBar, BottomBar, and 3-column grid layout"
```

---

### Task 18: Dashboard Panels (All 11 Panels)

**Files:**
- Create: `src/components/panels/GroundTrackPanel.tsx`
- Create: `src/components/panels/OrbitalParamsPanel.tsx`
- Create: `src/components/panels/SpaceWeatherPanel.tsx`
- Create: `src/components/panels/PassPredictionPanel.tsx`
- Create: `src/components/panels/LiveVideoPanel.tsx`
- Create: `src/components/panels/TimelinePanel.tsx`
- Create: `src/components/panels/ISSSystemsPanel.tsx`
- Create: `src/components/panels/EventBannerPanel.tsx`
- Create: `src/components/panels/CrewRosterPanel.tsx`
- Create: `src/components/panels/UpcomingEventsPanel.tsx`
- Create: `src/components/panels/DayNightPanel.tsx`
- Modify: `src/components/Dashboard.tsx`

This is a large task. Each panel is an independent component that reads from the telemetry stream or context. They should be implemented one at a time and wired into Dashboard.tsx.

**Note:** Due to the volume of panels, this task covers the implementation pattern for each. The implementing agent should create each panel file following the PanelFrame pattern, then wire it into Dashboard.tsx. Each panel commit should be separate.

- [ ] **Step 1: Create GroundTrackPanel (2D Leaflet map)**

Create `src/components/panels/GroundTrackPanel.tsx`:

```tsx
"use client";

import { useRef, useEffect, useState } from "react";
import { PanelFrame } from "../shared/PanelFrame";
import type { OrbitalState } from "@/lib/types";

interface GroundTrackPanelProps {
  orbital: OrbitalState | null;
}

export function GroundTrackPanel({ orbital }: GroundTrackPanelProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const [mode, setMode] = useState<"2d" | "3d">("2d");

  useEffect(() => {
    if (!mapRef.current || leafletRef.current || mode !== "2d") return;

    import("leaflet").then((L) => {
      if (!mapRef.current) return;

      const map = L.map(mapRef.current, {
        center: [0, 0],
        zoom: 2,
        zoomControl: false,
        attributionControl: false,
      });

      L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png", {
        maxZoom: 18,
      }).addTo(map);

      const issIcon = L.divIcon({
        html: '<div style="color: #ff3d3d; font-size: 16px; text-shadow: 0 0 6px rgba(255,61,61,0.8);">●</div>',
        className: "",
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      });

      markerRef.current = L.marker([0, 0], { icon: issIcon }).addTo(map);
      leafletRef.current = map;

      // Fix tile rendering on late mount
      setTimeout(() => map.invalidateSize(), 100);
    });

    return () => {
      leafletRef.current?.remove();
      leafletRef.current = null;
      markerRef.current = null;
    };
  }, [mode]);

  useEffect(() => {
    if (!orbital || !markerRef.current || !leafletRef.current) return;
    markerRef.current.setLatLng([orbital.latitude, orbital.longitude]);
  }, [orbital]);

  const modeToggle = (
    <div style={{ display: "flex", gap: 4, fontSize: 9 }}>
      <button
        onClick={() => setMode("2d")}
        style={{
          padding: "2px 6px",
          background: mode === "2d" ? "var(--accent-cyan)" : "var(--bg-surface)",
          color: mode === "2d" ? "var(--bg-primary)" : "var(--text-dim)",
          border: "none",
          borderRadius: 3,
          cursor: "pointer",
          fontFamily: "inherit",
          fontSize: 9,
        }}
      >
        2D
      </button>
      <button
        onClick={() => setMode("3d")}
        style={{
          padding: "2px 6px",
          background: mode === "3d" ? "var(--accent-cyan)" : "var(--bg-surface)",
          color: mode === "3d" ? "var(--bg-primary)" : "var(--text-dim)",
          border: "none",
          borderRadius: 3,
          cursor: "pointer",
          fontFamily: "inherit",
          fontSize: 9,
        }}
      >
        3D
      </button>
    </div>
  );

  return (
    <PanelFrame title="GROUND TRACK" icon="🗺️" headerRight={modeToggle}>
      {mode === "2d" ? (
        <div ref={mapRef} style={{ height: 200, background: "var(--bg-inset)", borderRadius: 4 }} />
      ) : (
        <div style={{ height: 200, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-dim)", background: "var(--bg-inset)", borderRadius: 4 }}>
          3D Globe — Three.js (Task 19)
        </div>
      )}
    </PanelFrame>
  );
}
```

- [ ] **Step 2: Create OrbitalParamsPanel**

Create `src/components/panels/OrbitalParamsPanel.tsx`:

```tsx
"use client";

import { PanelFrame } from "../shared/PanelFrame";
import { Sparkline } from "../shared/Sparkline";
import type { OrbitalState } from "@/lib/types";

interface OrbitalParamsPanelProps {
  orbital: OrbitalState | null;
}

export function OrbitalParamsPanel({ orbital }: OrbitalParamsPanelProps) {
  if (!orbital) {
    return (
      <PanelFrame title="ORBITAL PARAMETERS" icon="📐" accentColor="var(--accent-cyan)">
        <div style={{ color: "var(--text-dim)", fontSize: 10, padding: 8 }}>Waiting for data...</div>
      </PanelFrame>
    );
  }

  return (
    <PanelFrame title="ORBITAL PARAMETERS" icon="📐" accentColor="var(--accent-cyan)">
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4, fontSize: 10 }}>
        <Param label="Apoapsis" value={`${orbital.apoapsis.toFixed(1)} km`} color="var(--accent-green)" />
        <Param label="Periapsis" value={`${orbital.periapsis.toFixed(1)} km`} color="var(--accent-green)" />
        <Param label="Inclination" value={`${orbital.inclination.toFixed(2)}°`} />
        <Param label="Eccentricity" value={orbital.eccentricity.toFixed(5)} />
        <Param label="Period" value={`${Math.floor(orbital.period / 60)}m ${Math.round(orbital.period % 60)}s`} />
        <Param label="Revolutions" value={orbital.revolutionNumber.toLocaleString()} color="var(--text-dim)" />
      </div>
      <div style={{ display: "flex", gap: 12, marginTop: 8, fontSize: 9, color: "var(--text-dim)" }}>
        <span>Alt <Sparkline metric="altitude" color="var(--accent-cyan)" /></span>
        <span>Spd <Sparkline metric="speed_kmh" color="var(--accent-green)" /></span>
      </div>
    </PanelFrame>
  );
}

function Param({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div>
      {label}{" "}
      <span style={{ float: "right", color: color ?? "var(--text-primary)" }}>{value}</span>
    </div>
  );
}
```

- [ ] **Step 3: Create remaining panels**

Create the following panels using the same PanelFrame pattern. Each is a standalone file under `src/components/panels/`:

- `SpaceWeatherPanel.tsx` — displays SolarActivity (Kp, X-ray, proton, radiation risk)
- `PassPredictionPanel.tsx` — fetches `/api/passes?lat=X&lon=Y`, uses geolocation API, lists passes
- `LiveVideoPanel.tsx` — YouTube iframe embed for NASA ISS stream, external/internal toggle
- `TimelinePanel.tsx` — Canvas Gantt chart stub (detailed canvas rendering follows Artemis pattern)
- `ISSSystemsPanel.tsx` — 4 sub-panels (power, thermal, attitude, atmosphere) from ISSTelemetry
- `EventBannerPanel.tsx` — active event display with timer, type-specific metadata
- `CrewRosterPanel.tsx` — crew list from static data with agency flags
- `UpcomingEventsPanel.tsx` — fetches `/api/events`, lists next 5
- `DayNightPanel.tsx` — sunlight/shadow indicator with cycle progress bar

Each panel follows this structure:
```tsx
import { PanelFrame } from "../shared/PanelFrame";

export function XxxPanel({ ...props }) {
  return (
    <PanelFrame title="TITLE" icon="🔮" accentColor="var(--accent-xxx)">
      {/* Panel content */}
    </PanelFrame>
  );
}
```

The implementing agent should create each panel individually, following the design spec for content and the Artemis source for Canvas/visualization patterns. Commit after each panel.

- [ ] **Step 4: Wire all panels into Dashboard.tsx**

Update `src/components/Dashboard.tsx` to import and render all panels in the correct columns, replacing the placeholder content. Pass `stream.orbital`, `stream.telemetry`, `stream.solar` as props to relevant panels.

- [ ] **Step 5: Verify build**

```bash
npm run build
```

Expected: Build succeeds with all panels rendered.

- [ ] **Step 6: Commit**

```bash
git add src/components/panels/ src/components/Dashboard.tsx
git commit -m "feat: add all dashboard panels and wire into 3-column layout"
```

---

### Task 19: 3D Globe (Three.js)

**Files:**
- Create: `src/components/panels/Globe3D.tsx`
- Modify: `src/components/panels/GroundTrackPanel.tsx`

- [ ] **Step 1: Create Globe3D component**

Create `src/components/panels/Globe3D.tsx`:

```tsx
"use client";

import { useRef, useEffect } from "react";
import * as THREE from "three";
import type { OrbitalState } from "@/lib/types";
import { EARTH_RADIUS_KM } from "@/lib/constants";

interface Globe3DProps {
  orbital: OrbitalState | null;
  width: number;
  height: number;
}

export function Globe3D({ orbital, width, height }: Globe3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const issMarkerRef = useRef<THREE.Mesh | null>(null);
  const orbitLineRef = useRef<THREE.Line | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 0, 3.5);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    containerRef.current.appendChild(renderer.domElement);

    // Earth sphere
    const earthGeo = new THREE.SphereGeometry(1, 64, 64);
    const earthMat = new THREE.MeshPhongMaterial({
      color: 0x1a3a5c,
      emissive: 0x0a1520,
      wireframe: false,
      transparent: true,
      opacity: 0.9,
    });
    const earth = new THREE.Mesh(earthGeo, earthMat);
    scene.add(earth);

    // Wireframe overlay
    const wireGeo = new THREE.SphereGeometry(1.001, 24, 24);
    const wireMat = new THREE.MeshBasicMaterial({
      color: 0x00e5ff,
      wireframe: true,
      transparent: true,
      opacity: 0.08,
    });
    scene.add(new THREE.Mesh(wireGeo, wireMat));

    // ISS marker
    const issGeo = new THREE.SphereGeometry(0.03, 8, 8);
    const issMat = new THREE.MeshBasicMaterial({ color: 0xff3d3d });
    const issMarker = new THREE.Mesh(issGeo, issMat);
    scene.add(issMarker);
    issMarkerRef.current = issMarker;

    // Orbit path
    const orbitGeo = new THREE.BufferGeometry();
    const orbitMat = new THREE.LineBasicMaterial({
      color: 0x00e5ff,
      transparent: true,
      opacity: 0.4,
    });
    const orbitLine = new THREE.Line(orbitGeo, orbitMat);
    scene.add(orbitLine);
    orbitLineRef.current = orbitLine;

    // Lighting
    scene.add(new THREE.AmbientLight(0x404040, 0.5));
    const sunLight = new THREE.DirectionalLight(0xffffff, 1);
    sunLight.position.set(5, 3, 5);
    scene.add(sunLight);

    sceneRef.current = scene;
    cameraRef.current = camera;
    rendererRef.current = renderer;

    // Slow auto-rotation
    const animate = () => {
      earth.rotation.y += 0.001;
      renderer.render(scene, camera);
      rafRef.current = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      renderer.dispose();
      containerRef.current?.removeChild(renderer.domElement);
    };
  }, [width, height]);

  // Update ISS position
  useEffect(() => {
    if (!orbital || !issMarkerRef.current) return;

    const scale = 1 + orbital.altitude / EARTH_RADIUS_KM;
    const latRad = (orbital.latitude * Math.PI) / 180;
    const lonRad = (orbital.longitude * Math.PI) / 180;

    issMarkerRef.current.position.set(
      scale * Math.cos(latRad) * Math.cos(lonRad),
      scale * Math.sin(latRad),
      scale * Math.cos(latRad) * Math.sin(lonRad)
    );
  }, [orbital]);

  return (
    <div ref={containerRef} style={{ width, height, background: "var(--bg-inset)", borderRadius: 4 }} />
  );
}
```

- [ ] **Step 2: Integrate Globe3D into GroundTrackPanel**

Update `src/components/panels/GroundTrackPanel.tsx` to render `<Globe3D>` when `mode === "3d"`, replacing the placeholder:

```tsx
import { Globe3D } from "./Globe3D";

// Replace the 3D placeholder div with:
{mode === "3d" && (
  <Globe3D orbital={orbital} width={containerWidth} height={200} />
)}
```

Use a ResizeObserver or fixed dimensions for the container width.

- [ ] **Step 3: Verify build**

```bash
npm run build
```

Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/components/panels/Globe3D.tsx src/components/panels/GroundTrackPanel.tsx
git commit -m "feat: add Three.js 3D globe with ISS position marker"
```

---

### Task 20: Additional Pages

**Files:**
- Create: `src/app/track/page.tsx`
- Create: `src/app/live/page.tsx`
- Create: `src/app/stats/page.tsx`
- Create: `src/app/admin/page.tsx`
- Create: `src/app/api-docs/page.tsx`

- [ ] **Step 1: Create /track page**

Create `src/app/track/page.tsx` — full-page Leaflet map with ISS ground track, orbit path, and day/night terminator. Uses the same SSE stream for real-time position updates. Include Leaflet CSS import and a full-viewport map.

- [ ] **Step 2: Create /live page**

Create `src/app/live/page.tsx` — full-page NASA ISS live stream (YouTube embed) with event context sidebar showing active event details, crew info, and timeline.

- [ ] **Step 3: Create /stats page**

Create `src/app/stats/page.tsx` — cumulative ISS statistics (years in orbit since 1998-11-20, total orbits, total EVAs, total crew visitors, distance traveled). Mix of static reference data and computed values.

- [ ] **Step 4: Create /admin page**

Create `src/app/admin/page.tsx` — token-protected admin panel for event management (create, activate, extend, end events), manual telemetry overrides, and system status. Includes a token input form and API calls to `/api/admin/events`.

- [ ] **Step 5: Create /api-docs page**

Create `src/app/api-docs/page.tsx` — documentation page listing all REST and SSE endpoints with parameters, response formats, and examples.

- [ ] **Step 6: Verify build**

```bash
npm run build
```

Expected: Build succeeds with all routes.

- [ ] **Step 7: Commit**

```bash
git add src/app/track/ src/app/live/ src/app/stats/ src/app/admin/ src/app/api-docs/
git commit -m "feat: add additional pages (track, live, stats, admin, api-docs)"
```

---

### Task 21: Static Data & Crew Info

**Files:**
- Create: `src/data/iss-modules.ts`

- [ ] **Step 1: Create ISS reference data**

Create `src/data/iss-modules.ts`:

```typescript
import type { CrewMember } from "@/lib/types";

// ISS launch date
export const ISS_LAUNCH_DATE = "1998-11-20T06:40:00Z";

// Current expedition (update as needed)
export const CURRENT_EXPEDITION = 74;

// Current crew (update as needed)
export const CURRENT_CREW: CrewMember[] = [
  {
    name: "Sunita Williams",
    role: "CDR",
    agency: "NASA",
    nationality: "us",
    expedition: 74,
  },
  {
    name: "Oleg Kononenko",
    role: "FE",
    agency: "RSA",
    nationality: "ru",
    expedition: 74,
  },
  {
    name: "Nick Hague",
    role: "FE",
    agency: "NASA",
    nationality: "us",
    expedition: 74,
  },
  {
    name: "Satoshi Furukawa",
    role: "FE",
    agency: "JAXA",
    nationality: "jp",
    expedition: 74,
  },
  {
    name: "Samantha Cristoforetti",
    role: "FE",
    agency: "ESA",
    nationality: "it",
    expedition: 74,
  },
  {
    name: "Dmitri Petelin",
    role: "FE",
    agency: "RSA",
    nationality: "ru",
    expedition: 74,
  },
];

// Docking ports
export const DOCKING_PORTS = [
  { name: "PMA-2 (Harmony Forward)", vehicle: "Crew Dragon" },
  { name: "PMA-3 (Harmony Zenith)", vehicle: "Crew Dragon / Starliner" },
  { name: "Node 2 Nadir", vehicle: "Cargo Dragon / HTV" },
  { name: "Prichal", vehicle: "Soyuz / Progress" },
  { name: "MRM-2 (Poisk)", vehicle: "Soyuz / Progress" },
  { name: "MRM-1 (Rassvet)", vehicle: "Progress" },
];

// Country flag emoji map
export const FLAG_EMOJI: Record<string, string> = {
  us: "🇺🇸",
  ru: "🇷🇺",
  jp: "🇯🇵",
  it: "🇮🇹",
  ca: "🇨🇦",
  de: "🇩🇪",
  fr: "🇫🇷",
  gb: "🇬🇧",
  ae: "🇦🇪",
  dk: "🇩🇰",
  se: "🇸🇪",
};
```

- [ ] **Step 2: Commit**

```bash
git add src/data/iss-modules.ts
git commit -m "feat: add ISS static reference data (crew, docking ports, flags)"
```

---

### Task 22: Leaflet CSS & Final Integration

**Files:**
- Modify: `src/app/globals.css`
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Add Leaflet CSS import**

In `src/app/layout.tsx`, add the Leaflet CSS CDN link in the `<head>`:

```tsx
<link
  rel="stylesheet"
  href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
  integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
  crossOrigin=""
/>
```

- [ ] **Step 2: Verify full build and dev server**

```bash
npm run build && npm run start
```

Expected: Build succeeds. Dashboard loads at localhost:3000 with all panels, TopBar, BottomBar, and SSE connection attempt.

- [ ] **Step 3: Commit**

```bash
git add src/app/layout.tsx src/app/globals.css
git commit -m "feat: add Leaflet CSS and finalize integration"
```

---

### Task 23: Jest Configuration

**Files:**
- Create: `jest.config.ts`

- [ ] **Step 1: Create Jest config**

Create `jest.config.ts`:

```typescript
import type { Config } from "jest";

const config: Config = {
  testEnvironment: "jsdom",
  transform: {
    "^.+\\.tsx?$": ["ts-jest", { tsconfig: "tsconfig.json" }],
  },
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  setupFilesAfterSetup: [],
  testPathIgnorePatterns: ["/node_modules/", "/.next/"],
};

export default config;
```

- [ ] **Step 2: Run all tests**

```bash
npx jest --no-cache
```

Expected: All tests pass (types, PanelFrame, SSE manager, solar classifier, SGP4, pass predictor).

- [ ] **Step 3: Commit**

```bash
git add jest.config.ts
git commit -m "feat: add Jest configuration with path aliases"
```

---

### Task 24: Environment Configuration

**Files:**
- Create: `.env.example`

- [ ] **Step 1: Create environment example**

Create `.env.example`:

```bash
# MySQL connection string
MYSQL_URL=mysql://user:password@localhost:3306/iss_tracker

# Admin panel authentication token
ADMIN_TOKEN=your-secure-admin-token

# Optional: test database for integration tests
TEST_MYSQL_URL=mysql://user:password@localhost:3306/iss_tracker_test
```

- [ ] **Step 2: Commit**

```bash
git add .env.example
git commit -m "feat: add environment configuration example"
```
