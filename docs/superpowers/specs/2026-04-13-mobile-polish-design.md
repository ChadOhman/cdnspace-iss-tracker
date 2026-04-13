# Mobile Browser Polish — Design

**Date:** 2026-04-13
**Scope:** Fix 10 concrete mobile browser issues at a 375px-wide viewport (iPhone SE and similar).

## Goal

Make the ISS Tracker look good and work well when viewed on a phone. The app already has substantial mobile support (single-column `.col-mobile` layout, mobile topbar/bottombar wrapping, tap targets on crew rows). This pass cleans up the remaining rough edges identified in the mobile audit.

## Approach

**Hybrid CSS + targeted component changes.** Global media queries in `src/app/globals.css` handle layout, spacing, and typography issues. Components change only where CSS cannot express the fix (ModuleTempsPanel schematic, PanelVisibilityModal row layout, BottomBar text swaps, TopBar crew-flags).

**Breakpoint:** The existing `@media (max-width: 768px)` block drives all mobile-specific rules. No new breakpoint introduced.

**No runtime JS viewport detection.** No `useMediaQuery`, no `window.matchMedia`. Pure CSS media queries so SSR hydration has no flash-of-wrong-layout.

## Non-Goals

- Redesigning the desktop layout
- Adding new features or panels
- Refactoring unrelated code in touched files
- Fixing item 12 (BuyMeACoffee landscape overlap) — explicitly out of scope; deferred
- Fixing item 10 (GroundTrack Leaflet, DayNight SVG) — verified already responsive; nothing to do
- Changing the gear button's position (it is only adjusted via panel padding on mobile)

## Changes

### CSS-only changes (in `src/app/globals.css` inside the existing `@media (max-width: 768px)` block)

#### Item 4 — Modal width
Add class `.modal-content` to the content wrapper in `src/components/shared/Modal.tsx`. Mobile media query sets `max-width: 95vw !important` to override the per-modal caps (560/600/720px).

#### Item 5 — OrbitalParamsPanel grid
Add class `.orbital-params-grid` to the grid container in `src/components/panels/OrbitalParamsPanel.tsx`. Mobile media query sets `grid-template-columns: 1fr !important` so rows stack instead of squeezing two params + sparklines side-by-side.

#### Item 7 — Gear button overlap
Mobile rule: `.col-mobile { padding-left: 44px; }`. The gear button is fixed at `left: 8px` with `width: 30px` (right edge at 38px). Pushing panel content to 44px clears it with a ~6px gap.

#### Item 8 — LiveEventBar long titles
Add class `.live-event-title` to the title span in `src/components/LiveEventBar.tsx`. Mobile media query sets `white-space: normal; line-height: 1.25; -webkit-line-clamp: 2` so long event names wrap to two lines instead of truncating silently. Bar height grows to fit.

#### Item 9 — TimelinePanel hour labels
Add class `.timeline-hour-labels` to the labels row in `src/components/panels/TimelinePanel.tsx`. Mobile media query hides labels at 04:00, 12:00, 20:00 via `:nth-child(2), :nth-child(4), :nth-child(6) { display: none; }`, leaving 00/08/16/24.

#### Item 11 — Tiny font sizes
Introduce a utility class `.panel-label-xs` with desktop `font-size: 8px` and mobile override `font-size: 10px`. Replace the ~5 inline `fontSize: 8` offenders (DayNightPanel sunrise/sunset labels, TimelinePanel hour labels, others found during implementation) with this class. Keep the visual identity on desktop; bump to 10px on mobile where screen density makes 8px unreadable.

### Component changes

#### Item 1 — ModuleTempsPanel (structural)
Current behavior: renders a horizontal schematic diagram of ISS modules with hardcoded `paddingLeft: 70` to align Node 3 below Node 1. At 375px this overflows horizontally and the hardcoded padding breaks alignment.

New behavior: render both a schematic view and a stacked list view. Schematic is shown on desktop via `.module-temps-schematic { display: block; }` and hidden on mobile. Stacked list is shown on mobile via `.module-temps-list { display: none; }` desktop, `display: flex` mobile. Each list row: `[icon] [name] ── [temp]°C` with the same color-coding as the schematic boxes.

No runtime branching — both views render in markup, CSS toggles visibility. Tree-shaking cost is negligible (both are already static JSX).

#### Item 2 — PanelVisibilityModal row layout
Two sub-issues:

**2a. Per-panel row stacking.** Current row layout (per panel): `[toggle] [name]         [L] [C] [R]` horizontal. On mobile, the L/C/R radio group gets squeezed when the modal is narrow.

Add class `.panel-row` to each row wrapper. Mobile media query sets `flex-direction: column; align-items: stretch` so the row becomes two lines: line 1 shows `[toggle] [name]`, line 2 shows the `[L] [C] [R]` radio group stretched to full row width for easy tap targets.

**2b. Preset controls row stacking.** Current top-of-modal row: `[preset dropdown] [save] [delete]` horizontal. On mobile this squeezes the dropdown.

Add class `.preset-controls-row` to the wrapper. Mobile media query sets `flex-direction: column; align-items: stretch; gap: 6px` so the dropdown gets full width and the buttons stack below at full width.

#### Item 3 — BottomBar mobile trim
Mobile changes (CSS-only where possible):

1. Shorten unit buttons: swap `METRIC` → `M` and `IMPERIAL` → `I`. Use two spans per button — a `.unit-label-full` (hidden on mobile) and `.unit-label-short` (hidden on desktop).
2. Hide `Credits` button on mobile via a new class `.bottombar-credits { display: none; }` inside the mobile media query.
3. Hide `Feedback` link on mobile via a new class `.bottombar-feedback { display: none; }` inside the mobile media query.

Rationale for hiding Credits + Feedback on mobile: they are secondary and the bar is otherwise unusable. Credits content is accessible on desktop and via the GitHub repo link; feedback via email is available on desktop. Mobile users still get all core controls (LIVE/SIM, time picker, units, language, nav).

Remaining mobile buttons in LIVE mode: `LIVE` `SIM` — `TRACK` `STATS` `API` — `M` `I` `FR`. Eight items. Fits one row at 375px or wraps cleanly to two.

#### Item 6 — TopBar crew-flags button
Current: button shows `🇺🇸 🇷🇺 🇺🇸 🇯🇵 🇷🇺 🇺🇸 🇺🇸` (flag list). Grows with crew count, can push the time display off-screen on mobile.

New: add two spans inside the button — `.crew-flags-full` (the current flag list, hidden on mobile) and `.crew-flags-compact` (hidden on desktop) which renders `👥 {count}`. Crew list is still accessible via the modal that opens when the button is tapped.

## Files Touched

- `src/app/globals.css` — extend mobile media query block
- `src/components/shared/Modal.tsx` — add `.modal-content` class
- `src/components/panels/OrbitalParamsPanel.tsx` — add `.orbital-params-grid` class
- `src/components/LiveEventBar.tsx` — add `.live-event-title` class
- `src/components/panels/TimelinePanel.tsx` — add `.timeline-hour-labels` class, use `.panel-label-xs`
- `src/components/panels/DayNightPanel.tsx` — use `.panel-label-xs`
- `src/components/panels/ModuleTempsPanel.tsx` — add stacked list view alongside schematic
- `src/components/modals/PanelVisibilityModal.tsx` — add `.panel-row` and `.preset-controls-row` classes
- `src/components/BottomBar.tsx` — add dual-label spans for units, classes on Credits/Feedback
- `src/components/TopBar.tsx` — add dual-span rendering for crew-flags button

## Testing

**Manual mobile verification:** After implementation, open the app in Chrome DevTools at iPhone SE size (375 × 667) and walk:

1. `/` main dashboard — confirm gear button does not overlap leftmost panel content; OrbitalParams stacks single-column; ModuleTemps shows list view with no horizontal scroll; TopBar shows compact crew button with count; BottomBar shows M/I and no Credits/Feedback; no horizontal scroll at any vertical scroll position.
2. Open panel customization modal (⚙️) — confirm each row stacks with L/C/R on second line; modal fits 95vw; preset dropdown + delete button stack cleanly.
3. Open Credits modal on desktop only (it is hidden on mobile) — confirm it still works.
4. Trigger or fake an active event (or view during one) — confirm LiveEventBar title wraps to two lines for a long event name; TimelinePanel shows 4 hour labels (00/08/16/24) instead of 7; panel label text readable (>= 10px).
5. Rotate to landscape (667 × 375) — confirm the gear-button padding does not create a visually weird gutter (44px left padding is acceptable).

**Desktop regression:** Open at 1440px and confirm: TopBar flags list still shows; BottomBar shows METRIC/IMPERIAL/Credits/Feedback; ModuleTemps shows schematic; OrbitalParams is two-column; Modals still capped at their desktop max-widths; LiveEventBar still truncates long titles with ellipsis on desktop (unchanged).

**Tablet check:** Open at 800px (between 769 and 1024) — confirm the existing 2-column tablet layout is unchanged; none of the new mobile rules leak in.

No automated tests added — this is a CSS/visual polish pass and existing test suite does not cover visual layout.

## Rollout

Single PR, merge to `main`, deploy normally. All changes are additive (new classes, new media query rules); desktop behavior is unchanged. Rollback is `git revert` of the single commit.
