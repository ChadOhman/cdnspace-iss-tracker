# TDRS Region Abstraction — Design

**Date:** 2026-04-14
**Scope:** Replace the current three-hardcoded-satellite TDRS model (West / East / Pacific with specific designations like "TDRS-12/13") with a three-region abstraction (Atlantic / Pacific / Indian), consolidated behind a single source of truth.

## Goal

Stop asserting specific TDRS satellite identities in the UI. NASA re-stations satellites without coordination with this app, so claims like "TDRS-12/13" or "TDRS-6 (backup)" can silently drift from reality. Show the three standard TDRS ocean-region coverage zones, which are stable and verifiable, and fix the omission of the Indian Ocean Region (the current model has two Pacific-ish longitudes and nothing near 85°E).

This is driven by transparency feedback: the dashboard should show what we can verify, not what was true when the code was written.

## Approach

**Single source of truth.** A new module `src/lib/tdrs.ts` exports the region data and the longitude/elevation math. The three current consumers — [TopBar](src/components/TopBar.tsx), [TdrsPanel](src/components/panels/TdrsPanel.tsx), and [/track page](src/app/track/page.tsx) — delete their duplicated hardcoded arrays and import from the module.

**No satellite identities in the UI.** Every mention of specific TDRS numbers (e.g., `TDRS-10/11`, `TDRS-12/13`, `TDRS-6 (backup)`) is removed. Labels use region names only: `ATLANTIC`, `PACIFIC`, `INDIAN`.

**Longitudes are nominal region centres, documented as such.** The module comments explicitly label the longitudes as representing coverage zones, not specific satellite positions. The exact values chosen:

- Atlantic Ocean Region: **41°W**
- Pacific Ocean Region: **171°W**
- Indian Ocean Region: **85°E**

These are NASA's historical regional-centre conventions. They are stable in a way specific satellite longitudes are not, because NASA re-stations satellites within their region without changing the region's identity.

## Non-Goals

- No live data feed. No public API serves current TDRS positions; longitudes remain hardcoded.
- No new telemetry fields.
- No 4-region expansion. Three regions is the stable model.
- No changes to [CommsPanel](src/components/panels/CommsPanel.tsx) tooltips that say "via TDRS" generically — those are accurate.
- No UI redesign beyond label swaps and copy changes.
- No change to the in-view threshold (`delta < 70°`) or the elevation-angle approximation.

## Module Design

### New: `src/lib/tdrs.ts`

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
  label: string;   // Short display form, e.g. "ATLANTIC"
  longLabel: string; // Longer form, e.g. "Atlantic Ocean Region"
  lon: number;     // Nominal region centre, degrees. Negative = west.
}

export const TDRS_REGIONS: readonly TdrsRegion[] = [
  { id: "atlantic", label: "ATLANTIC", longLabel: "Atlantic Ocean Region", lon: -41 },
  { id: "pacific",  label: "PACIFIC",  longLabel: "Pacific Ocean Region",  lon: -171 },
  { id: "indian",   label: "INDIAN",   longLabel: "Indian Ocean Region",   lon:  85 },
];

/** Angular delta (degrees) between two longitudes, handling the ±180 wrap. */
export function lonDelta(a: number, b: number): number {
  const diff = Math.abs(a - b);
  return diff > 180 ? 360 - diff : diff;
}

/**
 * Approximate elevation angle (degrees) from the ISS to a geostationary
 * relay at the given longitude. Planar simplification; qualitative.
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
  delta: number;
  inView: boolean;
  elevation: number;
}

/** Whether a region is considered in-view given the ISS sub-satellite point. */
export const IN_VIEW_THRESHOLD_DEG = 70;

/**
 * Compute visibility of every TDRS region for a given ISS state.
 */
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

/** Format a longitude for display: -171 → "171°W", 85 → "85°E". */
export function formatLon(lon: number): string {
  const abs = Math.abs(lon);
  const dir = lon < 0 ? "W" : lon > 0 ? "E" : "";
  return `${abs}°${dir}`;
}
```

## Consumer Changes

### `src/components/panels/TdrsPanel.tsx`

- Delete the local `TDRS_SATELLITES` array, `TdrsSatellite` interface, the `lonDelta` and `computeElevation` helpers, and the local `formatLon`. Import the replacements from `@/lib/tdrs`.
- Replace `satellites = TDRS_SATELLITES.map(...)` logic with `const visibility = regionVisibility(issLon, issAlt);`.
- Card markup: render one card per `TdrsRegionVisibility` entry. Show `region.label` as the header (e.g., `ATLANTIC`) and `formatLon(region.lon)` as the subtitle (e.g., `41°W`). Drop the designation line entirely — no "TDRS-12/13" text.
- The `IN VIEW / OUT OF VIEW` badge, elevation bar, and signal-status block stay.
- S-band / Ku-band footer: keep the two tiles but drop the specific rate claims. Replace `"192 kbps"` and `"300 Mbps"` tile rows with nothing — each tile becomes just band name + brief purpose (e.g., `S-BAND / Voice · CMD` and `Ku-BAND / Science data`). Transparency: rate numbers are point-in-time facts that drift, same problem as satellite identities.
- Header badge copy: `{N} OF 3 IN VIEW` stays — still accurate (now 3 regions instead of 3 sats).
- Tooltip on the header badge: change "Tracking and Data Relay Satellites relay ISS communications to ground..." to describe the region model. Draft: *"Tracking and Data Relay Satellite coverage regions. NASA operates geostationary relays in three ocean zones — Atlantic, Pacific, Indian — that together provide ~100% ISS communications coverage. ISS uses S-band for voice/command and Ku-band for science data via these relays."*

### `src/components/TopBar.tsx`

- Delete the local `TDRS` array at lines 208-212. Replace with a call to `regionVisibility(orbital.lon, orbital.altitude)` (or a simpler helper if altitude isn't needed for just the count).
- Change the badge tooltip from `TDRS Relay: X of 3 satellites in view. Signal active.` / `Loss of signal.` to `TDRS coverage: X of 3 regions in view. Signal active.` / `Loss of signal.`
- The visible text (`N/3` or `LOS`) is unchanged.

### `src/app/track/page.tsx`

- Delete the local `TDRS_STATIONS` array at lines 30-34. Import `TDRS_REGIONS` from `@/lib/tdrs`.
- In the footprint rendering loop (around line 759), iterate `TDRS_REGIONS` and use `region.label` for the tooltip text instead of `"TDRS-West"` etc. So the map labels now read `ATLANTIC`, `PACIFIC`, `INDIAN`.
- Circle geometry, colours, and radius unchanged.

## Files Touched

- Create: `src/lib/tdrs.ts`
- Modify: `src/components/panels/TdrsPanel.tsx`
- Modify: `src/components/TopBar.tsx`
- Modify: `src/app/track/page.tsx`

Four files. No CSS changes.

## Testing

No unit tests exist for TDRS today. The existing math (`lonDelta`, `computeElevation`) is extracted verbatim, so numerical output at the same inputs is unchanged — this is a refactor-plus-rename, not an algorithm change.

**Manual verification:**

1. Run the app in LIVE mode. Confirm the `TdrsPanel` shows three cards labelled `ATLANTIC`, `PACIFIC`, `INDIAN` with longitudes `41°W`, `171°W`, `85°E`. No `TDRS-X/Y` strings anywhere.
2. As the ISS passes over Asia / Indian Ocean (longitude ~60°E to 100°E), confirm the INDIAN region flips to `IN VIEW` and the panel shows at least one in-view region (the ZOE previously showed all-LOS, which was misleading).
3. TopBar: hover the TDRS indicator. Tooltip mentions "regions," not "satellites."
4. `/track` page: map shows three footprint circles labelled `ATLANTIC`, `PACIFIC`, `INDIAN`. The Indian footprint appears over East Africa / Arabian Sea.
5. S-band and Ku-band footer tiles in the panel no longer show specific kbps/Mbps rates.
6. Desktop, tablet (800px), and mobile (375px) all render the new panel without regressions.

**Automated checks:**

- `tsc --noEmit` passes (no new type errors in touched files).
- `next build` passes.

## Rollout

Single PR, four files changed, merge to `main`, deploy normally. No database migrations, no environment changes, no data feed dependencies.

Rollback: `git revert` of the single merge commit restores the previous three-satellite model.

## Open Questions

None.
