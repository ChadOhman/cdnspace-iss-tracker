# TDRS Region Abstraction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the hardcoded three-TDRS-satellite model (with specific designations like `TDRS-12/13`) with three coverage regions (Atlantic / Pacific / Indian), consolidated behind a single source of truth in `src/lib/tdrs.ts`.

**Architecture:** New module owns the region data and longitude/elevation math. The three current consumers — `TdrsPanel`, `TopBar`, `/track page` — delete their duplicated arrays and helpers and import from the module. No UI redesign beyond label swaps and copy changes. No new telemetry fields. No data-source changes.

**Tech Stack:** Next.js 16, React 19, TypeScript, Jest (v30) via `npx jest`. No CSS changes in this plan.

**Spec:** [docs/superpowers/specs/2026-04-14-tdrs-region-abstraction-design.md](../specs/2026-04-14-tdrs-region-abstraction-design.md)

**Branch:** Create a new branch `tdrs-region-abstraction` off `main` before starting Task 1. The `mobile-polish` PR is still open; this work is independent.

**Unrelated uncommitted file:** `src/app/api/telemetry/stream/route.ts` has a pre-existing WIP change on `main` — leave it unstaged and untouched for the entire plan.

---

## File Map

| File | Change |
|---|---|
| `src/lib/tdrs.ts` | **Create.** Module exporting `TDRS_REGIONS`, `TdrsRegion`, `TdrsRegionId`, `TdrsRegionVisibility`, `IN_VIEW_THRESHOLD_DEG`, `lonDelta`, `computeElevation`, `regionVisibility`, `formatLon`. |
| `src/lib/__tests__/tdrs.test.ts` | **Create.** Jest unit tests for the helpers and `regionVisibility`. |
| `src/components/panels/TdrsPanel.tsx` | **Modify.** Delete local `TDRS_SATELLITES`, `TdrsSatellite`, `lonDelta`, `computeElevation`, `formatLon`. Import from the module. Swap sat identity markup (labels like `WEST`, subtitles like `TDRS-12/13 · 171°W`) for region markup (`ATLANTIC` / `41°W`). Update header tooltip. Simplify band footer (drop `192 kbps` / `300 Mbps`). |
| `src/components/TopBar.tsx` | **Modify.** Delete local `TDRS` array. Use `regionVisibility` for the `N/3 IN VIEW` count. Update tooltip copy from "satellites" to "regions." |
| `src/app/track/page.tsx` | **Modify.** Delete local `TDRS_STATIONS` array. Import `TDRS_REGIONS` and use `region.label` as the footprint tooltip text. |

---

## Pre-Task Setup

- [ ] **Step 0: Create the working branch**

Run:

```bash
git checkout main
git checkout -b tdrs-region-abstraction
git status
```

Expected: on `tdrs-region-abstraction`, with `src/app/api/telemetry/stream/route.ts` listed as Modified (pre-existing, leave alone).

Do NOT `git add` the telemetry route file in any task of this plan. Each task's `git add` must name files explicitly.

---

### Task 1: Create `src/lib/tdrs.ts` (TDD)

Create the new module with region data and pure helper functions. Use TDD: write a failing test first.

**Files:**
- Create: `src/lib/tdrs.ts`
- Create: `src/lib/__tests__/tdrs.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/__tests__/tdrs.test.ts` with this content:

```ts
import { describe, it, expect } from "@jest/globals";
import {
  TDRS_REGIONS,
  lonDelta,
  computeElevation,
  regionVisibility,
  formatLon,
  IN_VIEW_THRESHOLD_DEG,
} from "../tdrs";

describe("TDRS_REGIONS", () => {
  it("has exactly three regions with the expected ids", () => {
    const ids = TDRS_REGIONS.map((r) => r.id).sort();
    expect(ids).toEqual(["atlantic", "indian", "pacific"]);
  });

  it("uses nominal regional centres (Atlantic -41, Pacific -171, Indian 85)", () => {
    const byId = Object.fromEntries(TDRS_REGIONS.map((r) => [r.id, r]));
    expect(byId.atlantic.lon).toBe(-41);
    expect(byId.pacific.lon).toBe(-171);
    expect(byId.indian.lon).toBe(85);
  });

  it("exposes both short and long labels for each region", () => {
    for (const r of TDRS_REGIONS) {
      expect(r.label).toMatch(/^[A-Z]+$/);
      expect(r.longLabel).toContain("Ocean Region");
    }
  });
});

describe("lonDelta", () => {
  it("returns zero for equal longitudes", () => {
    expect(lonDelta(0, 0)).toBe(0);
    expect(lonDelta(-41, -41)).toBe(0);
  });

  it("returns the absolute difference for same-hemisphere longitudes", () => {
    expect(lonDelta(10, 30)).toBe(20);
    expect(lonDelta(-41, -60)).toBe(19);
  });

  it("handles the ±180 antimeridian wrap", () => {
    expect(lonDelta(175, -175)).toBe(10);
    expect(lonDelta(-171, 171)).toBe(18);
  });
});

describe("computeElevation", () => {
  it("gives a high positive elevation when ISS is near the region centre", () => {
    // ISS at 41°W, Atlantic region at 41°W → delta 0 → elevation ~90°
    const elev = computeElevation(-41, 420, -41);
    expect(elev).toBeGreaterThan(85);
  });

  it("clamps to -90° when ISS is more than 90° away from the region", () => {
    const elev = computeElevation(-171, 420, 85); // Pacific ISS vs Indian region
    expect(elev).toBe(-90);
  });

  it("drops to low positive at the edge of the in-view cone (~70°)", () => {
    const elev = computeElevation(0, 420, -70); // 70° delta
    expect(elev).toBeGreaterThan(0);
    expect(elev).toBeLessThan(40);
  });
});

describe("regionVisibility", () => {
  it("returns one entry per region in TDRS_REGIONS order", () => {
    const vis = regionVisibility(0, 420);
    expect(vis).toHaveLength(3);
    expect(vis.map((v) => v.region.id)).toEqual(
      TDRS_REGIONS.map((r) => r.id)
    );
  });

  it("marks the closest region in view and includes a computed elevation", () => {
    const vis = regionVisibility(-41, 420); // ISS at Atlantic centre
    const atlantic = vis.find((v) => v.region.id === "atlantic")!;
    expect(atlantic.inView).toBe(true);
    expect(atlantic.delta).toBe(0);
    expect(atlantic.elevation).toBeGreaterThan(85);
  });

  it("uses IN_VIEW_THRESHOLD_DEG (70°) as the in-view cutoff", () => {
    // Just inside the threshold: 69° delta → in view
    const justIn = regionVisibility(-41 + 69, 420);
    expect(justIn.find((v) => v.region.id === "atlantic")!.inView).toBe(true);
    // Just outside: 71° delta → out of view
    const justOut = regionVisibility(-41 + 71, 420);
    expect(justOut.find((v) => v.region.id === "atlantic")!.inView).toBe(false);
    expect(IN_VIEW_THRESHOLD_DEG).toBe(70);
  });

  it("covers the Indian Ocean Zone of Exclusion (ISS over Asia)", () => {
    // ISS at 85°E (Indian region centre) — Indian should be in view.
    // This is the case the old three-sat model got wrong.
    const vis = regionVisibility(85, 420);
    const indian = vis.find((v) => v.region.id === "indian")!;
    expect(indian.inView).toBe(true);
  });
});

describe("formatLon", () => {
  it("suffixes W for negative longitudes", () => {
    expect(formatLon(-41)).toBe("41°W");
    expect(formatLon(-171)).toBe("171°W");
  });

  it("suffixes E for positive longitudes", () => {
    expect(formatLon(85)).toBe("85°E");
    expect(formatLon(47.5)).toBe("47.5°E");
  });

  it("omits the hemisphere suffix at exactly zero", () => {
    expect(formatLon(0)).toBe("0°");
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail (no implementation yet)**

Run:

```bash
npx jest src/lib/__tests__/tdrs.test.ts
```

Expected: FAIL with `Cannot find module '../tdrs'` or similar. This confirms the tests would actually run.

- [ ] **Step 3: Implement the module**

Create `src/lib/tdrs.ts` with this content:

```ts
/**
 * TDRS (Tracking and Data Relay Satellite) coverage regions.
 *
 * NASA's Space Network organises TDRS geostationary satellites into three
 * ocean-region coverage zones. Individual satellites are re-stationed
 * between orbital slots without public coordination, so specific satellite
 * identities cannot be asserted reliably from the browser. We model the
 * regions instead — those are stable.
 *
 * Longitudes below are nominal regional centres, not current satellite
 * positions. They describe the coverage zone, not any specific vehicle.
 */

export type TdrsRegionId = "atlantic" | "pacific" | "indian";

export interface TdrsRegion {
  id: TdrsRegionId;
  /** Short display form, e.g. "ATLANTIC" */
  label: string;
  /** Longer form, e.g. "Atlantic Ocean Region" */
  longLabel: string;
  /** Nominal region centre in degrees. Negative = west. */
  lon: number;
}

export const TDRS_REGIONS: readonly TdrsRegion[] = [
  { id: "atlantic", label: "ATLANTIC", longLabel: "Atlantic Ocean Region", lon: -41 },
  { id: "pacific",  label: "PACIFIC",  longLabel: "Pacific Ocean Region",  lon: -171 },
  { id: "indian",   label: "INDIAN",   longLabel: "Indian Ocean Region",   lon:  85 },
];

/** A region is considered in-view when ISS is within this angular delta of its centre. */
export const IN_VIEW_THRESHOLD_DEG = 70;

/** Angular delta (degrees) between two longitudes, handling the ±180 wrap. */
export function lonDelta(a: number, b: number): number {
  const diff = Math.abs(a - b);
  return diff > 180 ? 360 - diff : diff;
}

/**
 * Approximate elevation angle (degrees) from the ISS to a geostationary
 * relay at the given longitude. Planar simplification; qualitative.
 *
 * Geostationary altitude ~35 786 km, ISS altitude ~420 km, Earth radius
 * 6 371 km. Returns -90 when the region centre is more than 90° away.
 */
export function computeElevation(issLon: number, issAltKm: number, regionLon: number): number {
  const delta = lonDelta(issLon, regionLon);
  if (delta >= 90) return -90;
  const R_E = 6371;
  const h_GEO = 35786;
  const deltaRad = (delta * Math.PI) / 180;
  const groundDist = R_E * deltaRad;
  const heightDiff = h_GEO - issAltKm;
  return (Math.atan2(heightDiff, groundDist) * 180) / Math.PI;
}

export interface TdrsRegionVisibility {
  region: TdrsRegion;
  /** Angular delta in degrees between ISS longitude and the region centre. */
  delta: number;
  /** True when the region is within `IN_VIEW_THRESHOLD_DEG` of ISS. */
  inView: boolean;
  /** Approximate elevation angle from ISS to a relay in this region. */
  elevation: number;
}

/** Compute visibility of every TDRS region for a given ISS state. */
export function regionVisibility(issLon: number, issAltKm: number): TdrsRegionVisibility[] {
  return TDRS_REGIONS.map((region) => {
    const delta = lonDelta(issLon, region.lon);
    return {
      region,
      delta,
      inView: delta < IN_VIEW_THRESHOLD_DEG,
      elevation: computeElevation(issLon, issAltKm, region.lon),
    };
  });
}

/** Format a longitude for display: -171 → "171°W", 85 → "85°E", 0 → "0°". */
export function formatLon(lon: number): string {
  const abs = Math.abs(lon);
  const dir = lon < 0 ? "W" : lon > 0 ? "E" : "";
  return `${abs}°${dir}`;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run:

```bash
npx jest src/lib/__tests__/tdrs.test.ts
```

Expected: PASS, 5 describe blocks, all tests green. If any fail, read the failure and fix the module (not the test) unless the test itself is wrong.

- [ ] **Step 5: Typecheck**

Run:

```bash
npx tsc --noEmit
```

Expected: Any errors should be pre-existing (unrelated test fixture files). No new errors in `src/lib/tdrs.ts` or `src/lib/__tests__/tdrs.test.ts`.

- [ ] **Step 6: Commit**

```bash
git add src/lib/tdrs.ts src/lib/__tests__/tdrs.test.ts
git commit -m "feat(tdrs): add region-abstraction module with tests

Single source of truth for TDRS coverage regions (Atlantic / Pacific /
Indian) plus the longitude/elevation math previously duplicated across
TdrsPanel, TopBar, and the track page. Jest tests cover helpers and the
Indian Ocean ZOE case the old three-sat model got wrong."
```

---

### Task 2: Refactor `TdrsPanel.tsx` to use the module

Switch the panel from the three-satellite model to the three-region model. Delete the local duplicates. Drop the `TDRS-12/13` designation text. Simplify the band footer.

**Files:**
- Modify: `src/components/panels/TdrsPanel.tsx`

- [ ] **Step 1: Rewrite the panel**

Replace the entire contents of `src/components/panels/TdrsPanel.tsx` with:

```tsx
"use client";

import PanelFrame from "@/components/shared/PanelFrame";
import type { OrbitalState } from "@/lib/types";
import { regionVisibility, formatLon } from "@/lib/tdrs";

interface TdrsPanelProps {
  orbital: OrbitalState | null;
}

export default function TdrsPanel({ orbital }: TdrsPanelProps) {
  if (!orbital) {
    return (
      <PanelFrame
        title="COMMUNICATIONS — TDRS"
        icon="📡"
        accentColor="var(--color-accent-cyan)"
      >
        <div
          style={{
            color: "var(--color-text-muted)",
            fontSize: 10,
            textAlign: "center",
            padding: "12px 0",
          }}
        >
          Awaiting data...
        </div>
      </PanelFrame>
    );
  }

  const { lon: issLon, altitude: issAlt } = orbital;
  const regions = regionVisibility(issLon, issAlt);
  const inViewCount = regions.filter((r) => r.inView).length;
  const hasSignal = inViewCount >= 1;

  return (
    <PanelFrame
      title="COMMUNICATIONS — TDRS"
      icon="📡"
      accentColor="var(--color-accent-cyan)"
      headerRight={
        <div
          title="Tracking and Data Relay Satellite coverage regions. NASA operates geostationary relays in three ocean zones — Atlantic, Pacific, Indian — that together provide near-continuous ISS communications coverage. ISS uses S-band for voice/command and Ku-band for science data via these relays."
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            cursor: "help",
          }}
        >
          <span
            style={{
              fontSize: 9,
              color: "var(--color-text-muted)",
              letterSpacing: "0.04em",
            }}
          >
            {inViewCount} OF 3 IN VIEW
          </span>
          <span
            style={{
              display: "inline-block",
              width: 7,
              height: 7,
              borderRadius: "50%",
              background: inViewCount >= 1
                ? "var(--color-accent-green)"
                : "var(--color-accent-orange)",
            }}
          />
        </div>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {/* Overall signal status */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "4px 6px",
            borderRadius: 4,
            background: "var(--color-bg-tertiary)",
            border: `1px solid ${hasSignal ? "rgba(0,255,136,0.15)" : "rgba(255,61,61,0.15)"}`,
          }}
        >
          <span style={{ fontSize: 9, color: "var(--color-text-muted)", letterSpacing: "0.06em" }}>
            SIGNAL STATUS
          </span>
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.08em",
              color: hasSignal
                ? "var(--color-accent-green)"
                : "var(--color-accent-red)",
            }}
          >
            {hasSignal ? "ACTIVE" : "LOS"}
          </span>
        </div>

        {/* Region cards */}
        {regions.map(({ region, inView, elevation }) => (
          <div
            key={region.id}
            style={{
              borderRadius: 4,
              padding: "6px 8px",
              background: "var(--color-bg-tertiary)",
              border: `1px solid ${inView
                ? "rgba(0,229,255,0.15)"
                : "var(--color-border-subtle)"}`,
              opacity: inView ? 1 : 0.6,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 3,
              }}
            >
              {/* Left: region label + centre longitude */}
              <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: "0.06em",
                    color: inView
                      ? "var(--color-text-primary)"
                      : "var(--color-text-muted)",
                  }}
                >
                  {region.label}
                </span>
                <span style={{ fontSize: 8, color: "var(--color-text-muted)" }}>
                  {formatLon(region.lon)}
                </span>
              </div>

              {/* Right: IN VIEW / OUT OF VIEW badge */}
              <span
                style={{
                  fontSize: 8,
                  fontWeight: 700,
                  letterSpacing: "0.07em",
                  color: inView
                    ? "var(--color-accent-green)"
                    : "var(--color-text-muted)",
                  background: inView
                    ? "rgba(0,255,136,0.1)"
                    : "rgba(255,255,255,0.04)",
                  border: `1px solid ${inView
                    ? "rgba(0,255,136,0.25)"
                    : "rgba(255,255,255,0.08)"}`,
                  borderRadius: 3,
                  padding: "1px 5px",
                }}
              >
                {inView ? "IN VIEW" : "OUT OF VIEW"}
              </span>
            </div>

            {/* Elevation row */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <span style={{ fontSize: 8, color: "var(--color-text-muted)" }}>
                ELEV
              </span>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                {/* Mini elevation bar */}
                <div
                  style={{
                    width: 48,
                    height: 3,
                    borderRadius: 2,
                    background: "var(--color-border-subtle)",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${Math.max(0, Math.min(100, (elevation / 90) * 100))}%`,
                      background: inView
                        ? "var(--color-accent-cyan)"
                        : "var(--color-text-muted)",
                      borderRadius: 2,
                    }}
                  />
                </div>
                <span
                  style={{
                    fontSize: 9,
                    color: inView
                      ? "var(--color-accent-cyan)"
                      : "var(--color-text-muted)",
                    fontVariantNumeric: "tabular-nums",
                    minWidth: 32,
                    textAlign: "right",
                  }}
                >
                  {elevation >= 0
                    ? `${Math.round(elevation)}°`
                    : `< 0°`}
                </span>
              </div>
            </div>
          </div>
        ))}

        {/* Band info footer */}
        <div
          style={{
            display: "flex",
            gap: 6,
            marginTop: 2,
          }}
        >
          {[
            { band: "S-BAND", desc: "Voice · CMD" },
            { band: "Ku-BAND", desc: "Science data" },
          ].map((b) => (
            <div
              key={b.band}
              style={{
                flex: 1,
                padding: "3px 5px",
                borderRadius: 3,
                background: "var(--color-bg-overlay)",
                border: "1px solid var(--color-border-subtle)",
              }}
            >
              <div style={{ fontSize: 8, fontWeight: 700, color: "var(--color-accent-cyan)", letterSpacing: "0.06em" }}>
                {b.band}
              </div>
              <div style={{ fontSize: 8, color: "var(--color-text-muted)" }}>
                {b.desc}
              </div>
            </div>
          ))}
        </div>
      </div>
    </PanelFrame>
  );
}
```

Changes summary:
- Deleted `TdrsSatellite` interface, `TDRS_SATELLITES` array, local `lonDelta`, local `computeElevation`, local `formatLon`.
- Added imports from `@/lib/tdrs`.
- Main render loop iterates `TdrsRegionVisibility[]` from `regionVisibility(...)` instead of the sat array.
- Card subtitle dropped the `{sat.designation}` text (e.g., `TDRS-12/13`) — now just longitude.
- Header tooltip copy updated to describe region model.
- Band footer tiles dropped the `rate` field entirely — each tile now shows only `band` + `desc`.

- [ ] **Step 2: Typecheck**

Run:

```bash
npx tsc --noEmit
```

Expected: no new type errors in `src/components/panels/TdrsPanel.tsx`.

- [ ] **Step 3: Run existing tests**

Run:

```bash
npx jest
```

Expected: the `tdrs.test.ts` tests from Task 1 still pass. Any pre-existing fixture errors are unchanged.

- [ ] **Step 4: Commit**

```bash
git add src/components/panels/TdrsPanel.tsx
git commit -m "refactor(tdrs): switch TdrsPanel to region model

Consume the new lib/tdrs module. Cards now show ATLANTIC / PACIFIC /
INDIAN with their nominal region centre longitudes, dropping the
TDRS-10/11 and TDRS-12/13 designation text that could go stale if
NASA re-stationed a satellite. Band footer tiles no longer claim
specific bitrates."
```

---

### Task 3: Refactor `TopBar.tsx` to use the module

The TopBar renders a small `N/3 IN VIEW` badge on desktop. Remove the local hardcoded TDRS array and use `regionVisibility`. Update the tooltip copy.

**Files:**
- Modify: `src/components/TopBar.tsx`

- [ ] **Step 1: Replace the local TDRS array and update the tooltip**

Open `src/components/TopBar.tsx`. Near line 206-233 is the TDRS signal status block, currently:

```tsx
      {/* TDRS signal status — hidden on mobile */}
      {orbital && (() => {
        const TDRS = [
          { name: "W", lon: -171 },
          { name: "E", lon: -41 },
          { name: "P", lon: -150 },
        ];
        const inView = TDRS.filter(({ lon }) => {
          const delta = Math.abs(orbital.lon - lon);
          return (delta > 180 ? 360 - delta : delta) < 70;
        }).length;
        const hasSignal = inView > 0;
        return (
          <span
            className="topbar-metrics"
            style={{ display: "flex", alignItems: "center", gap: 4, cursor: "help" }}
            title={`TDRS Relay: ${inView} of 3 satellites in view. ${hasSignal ? "Signal active." : "Loss of signal."}`}
          >
            <span style={{ color: "var(--color-text-muted)" }}>📡</span>
            <span style={{
              color: hasSignal ? "var(--color-accent-green)" : "var(--color-accent-red)",
              fontWeight: 600,
            }}>
              {hasSignal ? `${inView}/3` : "LOS"}
            </span>
          </span>
        );
      })()}
```

Replace with:

```tsx
      {/* TDRS signal status — hidden on mobile */}
      {orbital && (() => {
        const regions = regionVisibility(orbital.lon, orbital.altitude);
        const inView = regions.filter((r) => r.inView).length;
        const hasSignal = inView > 0;
        return (
          <span
            className="topbar-metrics"
            style={{ display: "flex", alignItems: "center", gap: 4, cursor: "help" }}
            title={`TDRS coverage: ${inView} of 3 regions in view. ${hasSignal ? "Signal active." : "Loss of signal."}`}
          >
            <span style={{ color: "var(--color-text-muted)" }}>📡</span>
            <span style={{
              color: hasSignal ? "var(--color-accent-green)" : "var(--color-accent-red)",
              fontWeight: 600,
            }}>
              {hasSignal ? `${inView}/3` : "LOS"}
            </span>
          </span>
        );
      })()}
```

- [ ] **Step 2: Add the import**

At the top of `src/components/TopBar.tsx`, find the imports block (the existing imports include `FLAG_EMOJI`, `CrewModal`, `CrewRoster` etc.). Add this import alongside:

```tsx
import { regionVisibility } from "@/lib/tdrs";
```

Put it with the other `@/lib/...` imports if any exist, otherwise near the top with the other `@/` imports.

- [ ] **Step 3: Typecheck**

Run:

```bash
npx tsc --noEmit
```

Expected: no new type errors in `src/components/TopBar.tsx`.

- [ ] **Step 4: Commit**

```bash
git add src/components/TopBar.tsx
git commit -m "refactor(tdrs): use region model in TopBar

Remove the local hardcoded TDRS longitude array. Tooltip copy now
references coverage regions rather than specific satellites to match
the updated panel."
```

---

### Task 4: Refactor `/track` page to use the module

The `/track` map shows three TDRS footprint circles labelled `TDRS-West`, `TDRS-East`, `TDRS-Pacific`. Relabel them to `ATLANTIC`, `PACIFIC`, `INDIAN` using the shared module. Circle geometry unchanged.

**Files:**
- Modify: `src/app/track/page.tsx`

- [ ] **Step 1: Replace the local TDRS_STATIONS array**

Open `src/app/track/page.tsx`. Near lines 30-34 is:

```tsx
const TDRS_STATIONS = [
  { lon: -171, label: "TDRS-West" },
  { lon: -41,  label: "TDRS-East" },
  { lon: -150, label: "TDRS-Pacific" },
];
```

Delete those lines entirely.

- [ ] **Step 2: Add the import**

At the top of `src/app/track/page.tsx`, add:

```tsx
import { TDRS_REGIONS } from "@/lib/tdrs";
```

Put it alongside the other `@/lib/...` imports if any exist; otherwise near the other `@/` imports.

- [ ] **Step 3: Update the footprint loop**

Near line 758-768, the footprint rendering currently reads:

```tsx
      // TDRS footprints
      const tdrsGroup = L.layerGroup().addTo(map);
      TDRS_STATIONS.forEach(({ lon: tdrsLon, label }) => {
        const circle = L.circle([0, tdrsLon], {
          radius: 2_500_000,
          color: "#00e5ff", weight: 1, opacity: 0.2,
          fillColor: "#00e5ff", fillOpacity: 0.05,
        }).addTo(tdrsGroup);
        circle.bindTooltip(label, {
          permanent: true, direction: "center", className: "tdrs-label",
        });
      });
```

Replace with:

```tsx
      // TDRS region footprints
      const tdrsGroup = L.layerGroup().addTo(map);
      TDRS_REGIONS.forEach((region) => {
        const circle = L.circle([0, region.lon], {
          radius: 2_500_000,
          color: "#00e5ff", weight: 1, opacity: 0.2,
          fillColor: "#00e5ff", fillOpacity: 0.05,
        }).addTo(tdrsGroup);
        circle.bindTooltip(region.label, {
          permanent: true, direction: "center", className: "tdrs-label",
        });
      });
```

- [ ] **Step 4: Typecheck**

Run:

```bash
npx tsc --noEmit
```

Expected: no new type errors in `src/app/track/page.tsx`.

- [ ] **Step 5: Commit**

```bash
git add src/app/track/page.tsx
git commit -m "refactor(tdrs): use region model on /track map

The three map footprints are now labelled ATLANTIC / PACIFIC / INDIAN
and source their longitudes from lib/tdrs. The INDIAN footprint now
appears over East Africa / Arabian Sea instead of a second
Pacific-ish circle."
```

---

### Task 5: Final verification

Run the full test suite, typecheck, and build. This catches any cross-file integration issues missed by per-task checks.

**Files:** (read-only — verification only; only fix if issues found)

- [ ] **Step 1: Run Jest**

Run:

```bash
npx jest
```

Expected: `tdrs.test.ts` tests PASS. Pre-existing test fixture issues are unchanged.

- [ ] **Step 2: Typecheck whole project**

Run:

```bash
npx tsc --noEmit
```

Expected: any errors are pre-existing and unrelated to the four files touched in this plan. If there are new errors in `src/lib/tdrs.ts`, `src/components/panels/TdrsPanel.tsx`, `src/components/TopBar.tsx`, or `src/app/track/page.tsx`, fix them inline and commit with `fix(tdrs): resolve typecheck after refactor`.

- [ ] **Step 3: Build**

Run:

```bash
npm run build
```

Expected: build succeeds. If it fails on any of the four files, read the error, fix the issue, and commit.

- [ ] **Step 4: Lint**

Run:

```bash
npm run lint
```

Expected: no NEW lint errors in the four files. Pre-existing lint findings elsewhere are unchanged and not this plan's concern.

- [ ] **Step 5: Grep sweep for stale sat identity strings**

Run these commands one at a time and confirm each produces no matches:

```bash
grep -rn "TDRS-12/13\|TDRS-10/11\|TDRS-6 (backup)" src/
grep -rn "TDRS-West\|TDRS-East\|TDRS-Pacific" src/
grep -rn "TDRS_STATIONS\|TDRS_SATELLITES" src/
```

Expected: all three commands return zero matches. If any match is found outside the four planned files, stop and investigate — it means there's another consumer we didn't know about.

- [ ] **Step 6: Commit audit**

Run:

```bash
git log --oneline main..HEAD
```

Expected: exactly four commits (one per Task 1-4), plus any fix commits from Step 2-4 of this task. No commits to unrelated files.

- [ ] **Step 7: Confirm the unrelated telemetry file is still unstaged**

Run:

```bash
git status
```

Expected: `src/app/api/telemetry/stream/route.ts` shown as Modified but unstaged. No other unstaged or untracked files from this plan's work.

- [ ] **Step 8: Visual verification hand-off**

This step is for the human — subagents stop here.

Manual visual checks at runtime:
1. Start dev server (`npm run dev`). Visit `/`.
2. Confirm TDRS panel shows three region cards labelled `ATLANTIC` (subtitle `41°W`), `PACIFIC` (`171°W`), `INDIAN` (`85°E`). No `TDRS-N/M` text anywhere in the panel.
3. In LIVE mode, wait for ISS to pass over Asia (~60-100°E longitude). Confirm INDIAN flips to IN VIEW during that pass. The old three-sat model showed all-LOS here.
4. Hover the TopBar TDRS badge. Tooltip says "TDRS coverage: N of 3 regions in view" (the word "regions," not "satellites").
5. Visit `/track`. Map has three footprint circles labelled `ATLANTIC`, `PACIFIC`, `INDIAN`. Indian footprint sits over East Africa / Arabian Sea.
6. Band footer tiles in TDRS panel show only `S-BAND / Voice · CMD` and `Ku-BAND / Science data` — no `192 kbps` or `300 Mbps`.
7. Check mobile 375px and desktop 1440px — no layout regressions on the panel.

---

## Rollback

All changes are in one feature branch, `tdrs-region-abstraction`. If a regression ships:

```bash
git revert <merge-commit-sha>
```

Per-task commits allow selective revert. The `lib/tdrs.ts` module is a pure addition — reverting any consumer refactor (Task 2, 3, or 4) leaves the module harmlessly present but unused.
