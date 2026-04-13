# Mobile Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix 10 mobile browser issues at a 375px viewport identified in the mobile audit, without altering desktop behavior.

**Architecture:** Hybrid — global CSS media queries in `src/app/globals.css` handle layout/spacing/typography; component changes only where CSS cannot express the fix (dual-markup for ModuleTempsPanel list view, TopBar crew-flags compact, BottomBar unit labels). No runtime viewport detection — pure CSS media queries avoid SSR hydration flash.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, vanilla CSS (no Tailwind for these changes — the existing mobile block in globals.css uses vanilla media queries).

**Testing model:** This is a visual polish pass. There are no unit tests for layout. Each task includes a manual verification step at 375×667 in Chrome DevTools (device toolbar → iPhone SE preset or custom width 375) AND a desktop-regression glance at 1440px before committing.

**Spec:** [docs/superpowers/specs/2026-04-13-mobile-polish-design.md](../specs/2026-04-13-mobile-polish-design.md)

---

## File Map

Files touched by this plan:

| File | Change |
|---|---|
| `src/app/globals.css` | Extend `@media (max-width: 768px)` block with new rules |
| `src/components/shared/Modal.tsx` | Add `.modal-content` class to dialog div |
| `src/components/panels/OrbitalParamsPanel.tsx` | Add `.orbital-params-grid` class to grid div |
| `src/components/LiveEventBar.tsx` | Add `.live-event-title` class to title span |
| `src/components/panels/TimelinePanel.tsx` | Add `.timeline-hour-labels` class; use `.panel-label-xs` |
| `src/components/panels/DayNightPanel.tsx` | Use `.panel-label-xs` on sunrise/sunset labels |
| `src/components/TopBar.tsx` | Add dual spans `.crew-flags-full` / `.crew-flags-compact` |
| `src/components/BottomBar.tsx` | Add dual unit-label spans; classes on Credits/Feedback |
| `src/components/modals/PanelVisibilityModal.tsx` | Add `.panel-row` + `.preset-controls-row` classes |
| `src/components/panels/ModuleTempsPanel.tsx` | Add stacked list view alongside schematic |

---

### Task 1: Modal width fix

Add a class to the modal dialog div so a mobile CSS rule can override the per-modal `maxWidth` prop (currently forces content to at most ~337px on mobile with `90vw`).

**Files:**
- Modify: `src/components/shared/Modal.tsx:53-68`
- Modify: `src/app/globals.css` (mobile media query block, after line 281)

- [ ] **Step 1: Read current state**

Read [src/components/shared/Modal.tsx](src/components/shared/Modal.tsx) lines 53–68. Confirm the dialog div has `width: "90vw"` and `maxWidth` from a prop, no className.

- [ ] **Step 2: Add className to the modal dialog div**

Edit `src/components/shared/Modal.tsx`. Replace:

```tsx
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        onClick={(e) => e.stopPropagation()}
        style={{
```

with:

```tsx
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{
```

- [ ] **Step 3: Add mobile CSS rule**

Edit `src/app/globals.css`. Inside the existing `@media (max-width: 768px) { ... }` block (which ends at line 281), before the closing brace, insert:

```css
  /* Modal: let content breathe on narrow screens — override per-modal maxWidth */
  .modal-content {
    max-width: 95vw !important;
  }
```

- [ ] **Step 4: Verify at 375px**

Start dev server (`pnpm dev` or `npm run dev`). In Chrome DevTools device toolbar (Ctrl+Shift+M), set width 375, height 667.

Navigate to `/`. Tap the gear button (⚙) bottom-left. Confirm the Panel Customization modal is noticeably wider than before (should be ~356px wide instead of ~337px).

Click Credits in BottomBar (desktop simulation — will fix BottomBar in Task 8; for now toggle device toolbar off temporarily). Confirm Credits modal at 375px is also at 95vw.

- [ ] **Step 5: Desktop regression check**

Toggle device toolbar off (Ctrl+Shift+M again). Confirm at 1440px width: gear modal still capped at 560px, Credits modal capped at 600px, CrewModal capped at 720px. The 95vw rule should be dormant.

- [ ] **Step 6: Commit**

```bash
git add src/components/shared/Modal.tsx src/app/globals.css
git commit -m "fix(mobile): allow modals to use 95vw on mobile

Per-modal maxWidth (560/600/720) plus the base 90vw width was forcing
modals to squeeze to ~337px on a 375px viewport. A .modal-content class
with !important override keeps desktop caps intact while letting mobile
breathe."
```

---

### Task 2: OrbitalParamsPanel grid collapse

On mobile, the 2-column grid squeezes each param row to ~165px, overlapping with the 80px sparklines on the full-width NASA ΔR/ΔV row. Collapse to 1 column on mobile.

**Files:**
- Modify: `src/components/panels/OrbitalParamsPanel.tsx:96-102`
- Modify: `src/app/globals.css` (mobile media query block)

- [ ] **Step 1: Add className to the grid div**

Edit `src/components/panels/OrbitalParamsPanel.tsx`. Replace:

```tsx
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "0 12px",
            }}
          >
```

with:

```tsx
          <div
            className="orbital-params-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "0 12px",
            }}
          >
```

- [ ] **Step 2: Add mobile CSS rule**

Edit `src/app/globals.css`. Inside the `@media (max-width: 768px)` block, add:

```css
  /* Orbital params: collapse to single column on mobile */
  .orbital-params-grid {
    grid-template-columns: 1fr !important;
  }
```

- [ ] **Step 3: Verify at 375px**

Reload at 375px. On the main dashboard, scroll to the ORBITAL PARAMS panel. Confirm each param row (apoapsis, periapsis, inclination, eccentricity, period, revolutions) occupies one full-width row instead of pairing two-per-line. NASA ΔR/ΔV row still full-width (it has `gridColumn: "1 / -1"` which continues to work). Sparkline row below is unchanged.

- [ ] **Step 4: Desktop regression check**

At 1440px: confirm the grid still shows 2 columns (apoapsis | periapsis on row 1, inclination | eccentricity on row 2, etc.).

- [ ] **Step 5: Commit**

```bash
git add src/components/panels/OrbitalParamsPanel.tsx src/app/globals.css
git commit -m "fix(mobile): stack orbital params single-column

Two-column grid was squeezing each row to ~165px at 375px viewport,
overlapping values with sparklines on the NASA delta-R / delta-V row."
```

---

### Task 3: Gear button clearance

The gear button is fixed at `left: 8px` with `width: 30px`, so its right edge is at 38px. On mobile the `.col-mobile` panels start at `padding: 6px`, meaning content can sit under the button at the left edge. Push panel content to clear it.

**Files:**
- Modify: `src/app/globals.css` (mobile `.col-mobile` rule)

- [ ] **Step 1: Edit mobile col-mobile rule**

Edit `src/app/globals.css`. Find the existing rule inside the mobile media query (around line 243):

```css
  .col-mobile {
    display: flex;
  }
```

Replace with:

```css
  .col-mobile {
    display: flex;
    padding-left: 44px;
  }
```

- [ ] **Step 2: Verify at 375px**

Reload at 375px. Confirm all panels in the single-column view are visually inset from the left by 44px and do not sit under the gear button. Scroll up and down — the gear button (bottom-left, position: fixed) should have clear air on its right at all scroll positions.

- [ ] **Step 3: Desktop regression check**

At 1440px: `.col-mobile` is `display: none` so the padding-left is ignored. Confirm desktop 3-column layout is unchanged.

- [ ] **Step 4: Commit**

```bash
git add src/app/globals.css
git commit -m "fix(mobile): inset col-mobile to clear the gear button

Gear button lives at left:8, width:30 (right edge 38px). Panels in
.col-mobile had 6px padding, so left-edge content sat under the
button. 44px left padding keeps a clean gap."
```

---

### Task 4: LiveEventBar title wrapping

Long event titles currently truncate with ellipsis on `whiteSpace: nowrap`. On mobile, allow 2-line wrap instead.

**Files:**
- Modify: `src/components/LiveEventBar.tsx:70-81`
- Modify: `src/app/globals.css` (mobile media query block)

- [ ] **Step 1: Add className to the title span**

Edit `src/components/LiveEventBar.tsx`. Replace:

```tsx
      {/* Icon + title */}
      <span style={{ fontSize: 14 }}>{icon}</span>
      <span
        style={{
          color: "var(--color-text-primary)",
          fontWeight: 700,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {event.title}
      </span>
```

with:

```tsx
      {/* Icon + title */}
      <span style={{ fontSize: 14 }}>{icon}</span>
      <span
        className="live-event-title"
        style={{
          color: "var(--color-text-primary)",
          fontWeight: 700,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {event.title}
      </span>
```

- [ ] **Step 2: Add mobile CSS rule**

Edit `src/app/globals.css`. Inside the mobile media query block, add:

```css
  /* Live event bar: let long titles wrap to 2 lines instead of truncating */
  .live-event-title {
    white-space: normal !important;
    line-height: 1.25;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
  }
```

- [ ] **Step 3: Verify at 375px**

Reload at 375px. If no active event is currently live, temporarily force the bar to render for testing: open DevTools, find the LiveEventBar component, or manually test by waiting for an event; alternatively check against a past/future event title. For the verification itself, if no event is active right now, read the rendered HTML and confirm the class is attached; the wrapping behavior can be trusted from the CSS rule alone.

If an event IS active: confirm that a long title like "Uncrewed Vehicle Docking Maneuver" wraps to two lines instead of being cut off with "…".

- [ ] **Step 4: Desktop regression check**

At 1440px: confirm long event titles still truncate with ellipsis on one line. The mobile rule should not apply.

- [ ] **Step 5: Commit**

```bash
git add src/components/LiveEventBar.tsx src/app/globals.css
git commit -m "fix(mobile): let live event titles wrap to 2 lines

At 375px width, the event bar's fixed gap + icon + timer + watch-live
button leave ~150px for the title, silently truncating long event names.
Allow wrap to 2 lines on mobile; desktop still truncates on one line."
```

---

### Task 5: TimelinePanel hour label thinning

Seven hour labels (00, 04, 08, 12, 16, 20, 24) squeeze at 375px. On mobile, hide the odd-indexed ones (04, 12, 20), keeping 4 labels: 00, 08, 16, 24.

**Files:**
- Modify: `src/components/panels/TimelinePanel.tsx:73-89`
- Modify: `src/app/globals.css` (mobile media query block)

- [ ] **Step 1: Add className to the labels wrapper**

Edit `src/components/panels/TimelinePanel.tsx`. Replace:

```tsx
      {/* Hour labels */}
      <div
        style={{
          position: "relative",
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 2,
        }}
      >
        {hourLabels.map((h) => (
          <span
            key={h}
            style={{ color: "var(--color-text-muted)", fontSize: 8 }}
          >
            {String(h).padStart(2, "0")}:00
          </span>
        ))}
      </div>
```

with:

```tsx
      {/* Hour labels */}
      <div
        className="timeline-hour-labels"
        style={{
          position: "relative",
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 2,
        }}
      >
        {hourLabels.map((h) => (
          <span
            key={h}
            style={{ color: "var(--color-text-muted)", fontSize: 8 }}
          >
            {String(h).padStart(2, "0")}:00
          </span>
        ))}
      </div>
```

- [ ] **Step 2: Add mobile CSS rule**

Edit `src/app/globals.css`. Inside the mobile media query block, add:

```css
  /* Timeline: hide 04:00, 12:00, 20:00 labels on mobile (keep 00/08/16/24) */
  .timeline-hour-labels > :nth-child(2),
  .timeline-hour-labels > :nth-child(4),
  .timeline-hour-labels > :nth-child(6) {
    display: none;
  }
```

Note: `hourLabels = [0, 4, 8, 12, 16, 20, 24]` — 7 elements. `:nth-child` is 1-indexed, so 2=04, 4=12, 6=20. Elements 1, 3, 5, 7 correspond to 00, 08, 16, 24.

- [ ] **Step 3: Verify at 375px**

Reload at 375px. Confirm the timeline shows only 4 hour labels: `00:00   08:00   16:00   24:00`, spaced evenly (flex `justify-content: space-between` redistributes when siblings are `display: none`).

- [ ] **Step 4: Desktop regression check**

At 1440px: confirm all 7 labels still appear.

- [ ] **Step 5: Commit**

```bash
git add src/components/panels/TimelinePanel.tsx src/app/globals.css
git commit -m "fix(mobile): show 4 of 7 hour labels on timeline

Seven labels cramped at 375px. Hide 04/12/20 on mobile, keep 00/08/16/24."
```

---

### Task 6: Tiny font size utility

Bump the smallest labels from `font-size: 8px` to `font-size: 10px` on mobile via a shared utility class. Apply to the two currently-audited offenders (DayNightPanel sunrise/sunset, TimelinePanel legend labels) — limit scope to these two to avoid scope creep; additional panels can be addressed in a follow-up.

**Files:**
- Modify: `src/app/globals.css` (add utility class; add mobile override)
- Modify: `src/components/panels/DayNightPanel.tsx:128-133`
- Modify: `src/components/panels/TimelinePanel.tsx:171-173`

- [ ] **Step 1: Add utility class in globals.css**

Edit `src/app/globals.css`. Add this rule OUTSIDE any media query (near the existing panel styles around line 130):

```css
/* Utility: extra-small label text. Bumped on mobile for readability. */
.panel-label-xs {
  font-size: 8px;
}
```

- [ ] **Step 2: Add mobile override**

In `src/app/globals.css`, inside the `@media (max-width: 768px)` block, add:

```css
  .panel-label-xs {
    font-size: 10px;
  }
```

- [ ] **Step 3: Apply to DayNightPanel sunrise/sunset labels**

Edit `src/components/panels/DayNightPanel.tsx`. Replace the two spans at lines 128–133:

```tsx
            <span style={{ color: "var(--color-text-muted)", fontSize: 8 }}>
              {isInSunlight ? t("dayNight.sunrise") : t("dayNight.sunset")}
            </span>
            <span style={{ color: "var(--color-text-muted)", fontSize: 8 }}>
              {isInSunlight ? t("dayNight.sunset") : t("dayNight.sunrise")}
            </span>
```

with:

```tsx
            <span className="panel-label-xs" style={{ color: "var(--color-text-muted)" }}>
              {isInSunlight ? t("dayNight.sunrise") : t("dayNight.sunset")}
            </span>
            <span className="panel-label-xs" style={{ color: "var(--color-text-muted)" }}>
              {isInSunlight ? t("dayNight.sunset") : t("dayNight.sunrise")}
            </span>
```

- [ ] **Step 4: Apply to TimelinePanel legend labels**

Edit `src/components/panels/TimelinePanel.tsx`. Replace the legend label span at lines 171–173:

```tsx
            <span style={{ color: "var(--color-text-muted)", fontSize: 8 }}>
              {label}
            </span>
```

with:

```tsx
            <span className="panel-label-xs" style={{ color: "var(--color-text-muted)" }}>
              {label}
            </span>
```

Also apply to the hour labels span at lines 82–86. Replace:

```tsx
          <span
            key={h}
            style={{ color: "var(--color-text-muted)", fontSize: 8 }}
          >
            {String(h).padStart(2, "0")}:00
          </span>
```

with:

```tsx
          <span
            key={h}
            className="panel-label-xs"
            style={{ color: "var(--color-text-muted)" }}
          >
            {String(h).padStart(2, "0")}:00
          </span>
```

- [ ] **Step 5: Verify at 375px**

Reload at 375px. Go to DayNight panel — sunrise/sunset labels should be noticeably larger (10px vs 8px). Timeline hour labels (00:00, 08:00, 16:00, 24:00) and legend labels (Sleep, Science, Exercise, etc.) should also be 10px.

- [ ] **Step 6: Desktop regression check**

At 1440px: labels should still be 8px (unchanged from before).

- [ ] **Step 7: Commit**

```bash
git add src/app/globals.css src/components/panels/DayNightPanel.tsx src/components/panels/TimelinePanel.tsx
git commit -m "fix(mobile): bump 8px labels to 10px on mobile via .panel-label-xs

Panel label text at 8px is below accessibility floor on phones. Add a
reusable utility class that's 8px desktop / 10px mobile; apply to
DayNightPanel and TimelinePanel."
```

---

### Task 7: TopBar crew-flags compact

Replace the flag emoji string with a compact count on mobile. The flag list can grow unbounded with crew size and pushes time off-screen.

**Files:**
- Modify: `src/components/TopBar.tsx:130-163`
- Modify: `src/app/globals.css` (mobile + desktop class rules)

- [ ] **Step 1: Add two spans inside the crew button**

Edit `src/components/TopBar.tsx`. Replace the button content at lines 158–163:

```tsx
          <span style={{ fontSize: 11, letterSpacing: 1 }}>{crewFlags}</span>
          <span style={{ fontSize: 9, letterSpacing: "0.05em" }}>
            {t("panels.crew")}
          </span>
```

with:

```tsx
          <span className="crew-flags-full" style={{ fontSize: 11, letterSpacing: 1 }}>
            {crewFlags}
          </span>
          <span className="crew-flags-compact" style={{ fontSize: 11, letterSpacing: 1, display: "none" }}>
            👥 {crewMembers.length}
          </span>
          <span style={{ fontSize: 9, letterSpacing: "0.05em" }}>
            {t("panels.crew")}
          </span>
```

- [ ] **Step 2: Add mobile CSS rule**

Edit `src/app/globals.css`. Inside the mobile media query block, add:

```css
  /* TopBar crew button: show compact count instead of flag list on mobile */
  .crew-flags-full {
    display: none !important;
  }
  .crew-flags-compact {
    display: inline !important;
  }
```

- [ ] **Step 3: Verify at 375px**

Reload at 375px. The crew button should now show `👥 7 CREW` (or whatever the count is), not a flag list. Confirm the time on the right side is visible and not pushed off.

- [ ] **Step 4: Desktop regression check**

At 1440px: confirm the button still shows the flag list (e.g., `🇺🇸🇷🇺🇺🇸🇯🇵🇷🇺🇺🇸🇺🇸 CREW`). The `.crew-flags-compact` span stays `display: none` via its inline style.

- [ ] **Step 5: Commit**

```bash
git add src/components/TopBar.tsx src/app/globals.css
git commit -m "fix(mobile): show crew count on mobile TopBar instead of flag list

At 375px, a 7-flag emoji string took enough width to push the time
display off-screen. Dual markup: flags on desktop, count on mobile."
```

---

### Task 8: BottomBar mobile trim

Three changes: shorten METRIC/IMPERIAL to M/I, hide Credits button, hide Feedback link.

**Files:**
- Modify: `src/components/BottomBar.tsx:253-289` (unit buttons)
- Modify: `src/components/BottomBar.tsx:308-322` (Credits button)
- Modify: `src/components/BottomBar.tsx:323-334` (Feedback link)
- Modify: `src/app/globals.css` (mobile media query block)

- [ ] **Step 1: Replace METRIC button text with dual spans**

Edit `src/components/BottomBar.tsx`. Replace the METRIC button children (the literal text `METRIC` at line 269):

```tsx
            METRIC
```

with:

```tsx
            <span className="unit-label-full">METRIC</span>
            <span className="unit-label-short" style={{ display: "none" }}>M</span>
```

- [ ] **Step 2: Replace IMPERIAL button text with dual spans**

In `src/components/BottomBar.tsx`, replace `IMPERIAL` at line 288:

```tsx
            IMPERIAL
```

with:

```tsx
            <span className="unit-label-full">IMPERIAL</span>
            <span className="unit-label-short" style={{ display: "none" }}>I</span>
```

- [ ] **Step 3: Add class to Credits button**

In `src/components/BottomBar.tsx`, replace the Credits button opening tag at line 308:

```tsx
        <button
          onClick={() => setCreditsOpen(true)}
          style={{
```

with:

```tsx
        <button
          className="bottombar-credits"
          onClick={() => setCreditsOpen(true)}
          style={{
```

- [ ] **Step 4: Add class to Feedback link**

In `src/components/BottomBar.tsx`, replace the Feedback link opening tag at line 323:

```tsx
        <a
          href="mailto:cdnspace@chadohman.ca?subject=ISS%20Tracker%20Feedback"
          style={{
```

with:

```tsx
        <a
          className="bottombar-feedback"
          href="mailto:cdnspace@chadohman.ca?subject=ISS%20Tracker%20Feedback"
          style={{
```

- [ ] **Step 5: Add mobile CSS rules**

Edit `src/app/globals.css`. Inside the mobile media query block, add:

```css
  /* BottomBar: shorten unit labels and hide secondary actions on mobile */
  .unit-label-full {
    display: none !important;
  }
  .unit-label-short {
    display: inline !important;
  }
  .bottombar-credits,
  .bottombar-feedback {
    display: none !important;
  }
```

- [ ] **Step 6: Verify at 375px**

Reload at 375px. BottomBar should show: `LIVE` `SIM` … `TRACK` `STATS` `API` … `M` `I` `FR`. No Credits, no Feedback. The bar should fit on one or two rows cleanly without the tight wrap problems from before.

- [ ] **Step 7: Desktop regression check**

At 1440px: confirm BottomBar shows `LIVE` `SIM` … `TRACK` `STATS` `API` … `METRIC` `IMPERIAL` `FR` `Credits` `Feedback` `Created by Canadian Space` `iss.cdnspace.ca`. Unchanged from before.

- [ ] **Step 8: Commit**

```bash
git add src/components/BottomBar.tsx src/app/globals.css
git commit -m "fix(mobile): trim BottomBar for 375px viewport

Shorten METRIC/IMPERIAL to M/I and hide Credits + Feedback on mobile.
Core controls (LIVE/SIM, TRACK/STATS/API, units, language) still
present and fit cleanly. Credits and Feedback remain on desktop."
```

---

### Task 9: PanelVisibilityModal row stacking

Two sub-fixes in one task: (2a) stack each panel row so the L/C/R radio group moves to its own line below the name; (2b) stack the preset dropdown row so the dropdown gets full width and buttons sit below.

**Files:**
- Modify: `src/components/modals/PanelVisibilityModal.tsx:122` (preset row)
- Modify: `src/components/modals/PanelVisibilityModal.tsx:162` (save-new row)
- Modify: `src/components/modals/PanelVisibilityModal.tsx:242` (per-panel row)
- Modify: `src/app/globals.css` (mobile media query block)

- [ ] **Step 1: Add class to the preset selector row**

Edit `src/components/modals/PanelVisibilityModal.tsx`. Replace at line 122:

```tsx
        <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "8px" }}>
```

with:

```tsx
        <div className="preset-controls-row" style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "8px" }}>
```

- [ ] **Step 2: Add class to the save-new row**

In the same file, replace at line 162:

```tsx
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
```

with:

```tsx
        <div className="preset-controls-row" style={{ display: "flex", gap: "8px", alignItems: "center" }}>
```

- [ ] **Step 3: Add class to the per-panel row**

In the same file, replace at line 242:

```tsx
                <div key={id} style={rowStyle}>
```

with:

```tsx
                <div key={id} className="panel-row" style={rowStyle}>
```

- [ ] **Step 4: Add mobile CSS rules**

Edit `src/app/globals.css`. Inside the mobile media query block, add:

```css
  /* PanelVisibilityModal: stack rows on mobile for fingers-friendly layout */
  .preset-controls-row {
    flex-direction: column !important;
    align-items: stretch !important;
    gap: 6px !important;
  }
  .panel-row {
    flex-direction: column !important;
    align-items: stretch !important;
    gap: 6px !important;
  }
  /* Radio group: push to full width, spread evenly */
  .panel-row > div:last-child {
    margin-left: 0 !important;
    justify-content: flex-start;
    gap: 6px !important;
  }
  .panel-row > div:last-child > label {
    flex: 1;
    width: auto !important;
  }
```

Note: `rowStyle` on the per-panel row sets `gap: "8px"` and a horizontal flex. The last child is either the radio group (`radioGroupStyle` with `marginLeft: auto` pushing it right) or the "full-width" span. The CSS above removes the auto-margin and stretches the radios full-width on mobile.

- [ ] **Step 5: Verify at 375px**

Reload at 375px. Tap the gear button (⚙). In the Panel Customization modal:
- The "Layout Presets" section: preset dropdown on its own row, Delete button on the row below at full width; "New preset name…" input on its own row, Save button below at full width.
- Each panel row: checkbox + name on line 1, three buttons `L C R` stretched across line 2 (easy to tap).
- The "full-width" italic label (for panels like timeline) still appears on its own line too.

- [ ] **Step 6: Desktop regression check**

At 1440px: confirm the modal layout is unchanged — dropdown + Delete on one row, input + Save on one row, each panel row shows `[check] [name] ........ [L] [C] [R]` horizontal.

- [ ] **Step 7: Commit**

```bash
git add src/components/modals/PanelVisibilityModal.tsx src/app/globals.css
git commit -m "fix(mobile): stack PanelVisibilityModal rows on mobile

Per-panel rows: checkbox+name on top, L/C/R radios full-width below as
big tap targets. Preset controls: dropdown and input get full-width,
their buttons sit below. Desktop layout unchanged."
```

---

### Task 10: ModuleTempsPanel list view on mobile

The module schematic (horizontal chain Node1 → Destiny → Harmony plus Node 3 below Node 1 via hardcoded `paddingLeft: 70`) doesn't fit 375px and the hardcoded padding breaks alignment. On mobile, show a stacked vertical list of modules with `[name] [temp]` rows and hide the schematic. Keep the external-thermal-loops, coolant-fill-levels, and CCAA sections unchanged (they already stack vertically).

**Files:**
- Modify: `src/components/panels/ModuleTempsPanel.tsx:176-262`
- Modify: `src/app/globals.css` (mobile media query block)

- [ ] **Step 1: Wrap existing schematic in a className div**

Edit `src/components/panels/ModuleTempsPanel.tsx`. Replace the section starting at line 178 (`{/* Module schematic */}`) through line 262 (the closing `</div>` of the schematic block — before `{/* External thermal loops */}` at line 264):

```tsx
          {/* Module schematic */}
          <div style={{ marginBottom: 10 }}>
            <div style={{ color: "var(--color-text-muted)", fontSize: 8, marginBottom: 5 }}>
              {t("moduleTemps.schematic").toUpperCase()}
            </div>

            {/* Main chain: Russian → Node 1 → US Lab → Node 2 */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 3,
                overflowX: "auto",
                paddingBottom: 4,
              }}
            >
              {/* Russian segment (proxy: use Node 1 cabin as stand-in since no Russian field) */}
              <div
                style={{
                  background: "var(--color-bg-secondary)",
                  border: "1px solid var(--color-border-subtle)",
                  borderRadius: 4,
                  padding: "5px 6px",
                  minWidth: 58,
                  textAlign: "center",
                  opacity: 0.7,
                }}
              >
                <div style={{ color: "var(--color-text-muted)", fontSize: 8, marginBottom: 3 }}>RUS SEG</div>
                <div style={{ color: "var(--color-text-muted)", fontSize: 11 }}>—</div>
              </div>

              <div style={{ color: "var(--color-border-subtle)", fontSize: 10 }}>—</div>

              {/* Node 1 (FGB/Unity) */}
              <ModuleBox
                name="NODE 1"
                cabinTemp={telemetry.moduleTemps.node1Cabin}
                temperature={temperature}
              />

              <div style={{ color: "var(--color-border-subtle)", fontSize: 10 }}>—</div>

              {/* US Lab (Destiny) */}
              <ModuleBox
                name="DESTINY"
                cabinTemp={telemetry.moduleTemps.uslabCabin}
                avionicsTemp={telemetry.moduleTemps.uslabAvionics}
                accent="var(--color-accent-cyan)"
                temperature={temperature}
              />

              <div style={{ color: "var(--color-border-subtle)", fontSize: 10 }}>—</div>

              {/* Node 2 (Harmony) */}
              <ModuleBox
                name="HARMONY"
                cabinTemp={telemetry.moduleTemps.node2Cabin}
                avionicsTemp={telemetry.moduleTemps.node2Avionics}
                accent="var(--color-accent-cyan)"
                temperature={temperature}
              />
            </div>

            {/* Node 3 (Tranquility) hangs below Node 1 */}
            <div style={{ display: "flex", alignItems: "flex-start", marginTop: 4, paddingLeft: 70 }}>
              <div
                style={{
                  width: 1,
                  height: 12,
                  background: "var(--color-border-subtle)",
                  marginLeft: 30,
                  marginRight: 0,
                }}
              />
            </div>
            <div style={{ display: "flex", paddingLeft: 58 }}>
              <ModuleBox
                name="NODE 3"
                cabinTemp={telemetry.moduleTemps.node3Cabin}
                avionicsTemp={telemetry.moduleTemps.node3Avionics}
                accent="var(--color-accent-cyan)"
                temperature={temperature}
              />
            </div>
          </div>
```

with:

```tsx
          {/* Module schematic (desktop) + stacked list (mobile) */}
          <div style={{ marginBottom: 10 }}>
            <div style={{ color: "var(--color-text-muted)", fontSize: 8, marginBottom: 5 }}>
              {t("moduleTemps.schematic").toUpperCase()}
            </div>

            {/* Desktop schematic — hidden on mobile via CSS */}
            <div className="module-temps-schematic">
              {/* Main chain: Russian → Node 1 → US Lab → Node 2 */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 3,
                  overflowX: "auto",
                  paddingBottom: 4,
                }}
              >
                <div
                  style={{
                    background: "var(--color-bg-secondary)",
                    border: "1px solid var(--color-border-subtle)",
                    borderRadius: 4,
                    padding: "5px 6px",
                    minWidth: 58,
                    textAlign: "center",
                    opacity: 0.7,
                  }}
                >
                  <div style={{ color: "var(--color-text-muted)", fontSize: 8, marginBottom: 3 }}>RUS SEG</div>
                  <div style={{ color: "var(--color-text-muted)", fontSize: 11 }}>—</div>
                </div>

                <div style={{ color: "var(--color-border-subtle)", fontSize: 10 }}>—</div>

                <ModuleBox
                  name="NODE 1"
                  cabinTemp={telemetry.moduleTemps.node1Cabin}
                  temperature={temperature}
                />

                <div style={{ color: "var(--color-border-subtle)", fontSize: 10 }}>—</div>

                <ModuleBox
                  name="DESTINY"
                  cabinTemp={telemetry.moduleTemps.uslabCabin}
                  avionicsTemp={telemetry.moduleTemps.uslabAvionics}
                  accent="var(--color-accent-cyan)"
                  temperature={temperature}
                />

                <div style={{ color: "var(--color-border-subtle)", fontSize: 10 }}>—</div>

                <ModuleBox
                  name="HARMONY"
                  cabinTemp={telemetry.moduleTemps.node2Cabin}
                  avionicsTemp={telemetry.moduleTemps.node2Avionics}
                  accent="var(--color-accent-cyan)"
                  temperature={temperature}
                />
              </div>

              {/* Node 3 (Tranquility) hangs below Node 1 */}
              <div style={{ display: "flex", alignItems: "flex-start", marginTop: 4, paddingLeft: 70 }}>
                <div
                  style={{
                    width: 1,
                    height: 12,
                    background: "var(--color-border-subtle)",
                    marginLeft: 30,
                    marginRight: 0,
                  }}
                />
              </div>
              <div style={{ display: "flex", paddingLeft: 58 }}>
                <ModuleBox
                  name="NODE 3"
                  cabinTemp={telemetry.moduleTemps.node3Cabin}
                  avionicsTemp={telemetry.moduleTemps.node3Avionics}
                  accent="var(--color-accent-cyan)"
                  temperature={temperature}
                />
              </div>
            </div>

            {/* Mobile list — hidden on desktop via CSS */}
            <div className="module-temps-list" style={{ display: "none", flexDirection: "column", gap: 4 }}>
              {[
                { name: "NODE 1", cabin: telemetry.moduleTemps.node1Cabin, avn: undefined as number | undefined },
                { name: "DESTINY", cabin: telemetry.moduleTemps.uslabCabin, avn: telemetry.moduleTemps.uslabAvionics },
                { name: "HARMONY", cabin: telemetry.moduleTemps.node2Cabin, avn: telemetry.moduleTemps.node2Avionics },
                { name: "NODE 3", cabin: telemetry.moduleTemps.node3Cabin, avn: telemetry.moduleTemps.node3Avionics },
              ].map((m) => {
                const c = temperature(m.cabin);
                return (
                  <div
                    key={m.name}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "4px 8px",
                      background: "var(--color-bg-secondary)",
                      border: "1px solid var(--color-accent-cyan)",
                      borderRadius: 4,
                    }}
                  >
                    <span style={{ color: "var(--color-text-muted)", fontSize: 10, fontWeight: 600 }}>
                      {m.name}
                    </span>
                    <span style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
                      <span style={{ color: "var(--color-accent-cyan)", fontSize: 12, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
                        {c.value.toFixed(1)}{c.unit}
                      </span>
                      {m.avn !== undefined && (
                        <span style={{ color: "var(--color-text-muted)", fontSize: 9 }}>
                          AVN {temperature(m.avn).value.toFixed(1)}{temperature(m.avn).unit}
                        </span>
                      )}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
```

- [ ] **Step 2: Add mobile CSS rules**

Edit `src/app/globals.css`. Inside the mobile media query block, add:

```css
  /* ModuleTempsPanel: swap schematic for stacked list on mobile */
  .module-temps-schematic {
    display: none !important;
  }
  .module-temps-list {
    display: flex !important;
  }
```

- [ ] **Step 3: Verify at 375px**

Reload at 375px. Scroll to MODULE TEMPS panel (may need to enable it in the gear menu if not in default). Confirm:
- No horizontal scroll inside the panel.
- Each of 4 modules (Node 1, Destiny, Harmony, Node 3) shows as its own row with the module name on the left and the cabin temperature (plus AVN where applicable) on the right.
- External thermal loops section below is unchanged.
- Coolant fill levels and CCAA sections below are unchanged.

- [ ] **Step 4: Desktop regression check**

At 1440px: confirm the schematic view appears as before — horizontal chain `RUS SEG — NODE 1 — DESTINY — HARMONY` with NODE 3 below Node 1. The list view is hidden.

- [ ] **Step 5: Commit**

```bash
git add src/components/panels/ModuleTempsPanel.tsx src/app/globals.css
git commit -m "fix(mobile): show stacked list for module temps on mobile

The schematic diagram with hardcoded paddingLeft: 70 for Node 3 breaks
alignment and overflows at 375px. Keep schematic for desktop; show a
clean vertical list of [name] [cabin temp] [AVN?] rows on mobile."
```

---

### Task 11: Final verification pass

Walk through the full app at mobile and desktop widths to catch any issues missed by per-task verification and check for interactions between changes.

**Files:** (read-only — this task is verification; only fix if issues found)

- [ ] **Step 1: Mobile walkthrough at 375 × 667 (Chrome DevTools)**

Start dev server. Open Chrome DevTools device toolbar. Set width 375, height 667.

Walk these routes and verify each:

1. `/` (main dashboard):
   - TopBar: connection badge, 🛰️ ISS, ALPHA, visitor count (if >0), crew button shows `👥 N CREW`, time visible on right.
   - Timeline hour labels: 4 visible (00/08/16/24), 10px, readable.
   - Gear button at bottom-left does not overlap any panel content.
   - First panel left edge sits at 44px.
   - OrbitalParams: single column; each param row full width.
   - ModuleTemps: vertical list; no horizontal scroll.
   - BottomBar: shows LIVE, SIM, TRACK, STATS, API, M, I, FR. No Credits, no Feedback.
   - No horizontal page scroll at any vertical scroll position.

2. Tap gear button:
   - Modal width ~95vw.
   - Preset dropdown full-width; Delete below full-width.
   - Input full-width; Save below full-width.
   - Each panel row: checkbox + name on top; L/C/R buttons stretched below.
   - Close modal.

3. Navigate to `/live` (via bottom bar):
   - Page loads without horizontal scroll at 375px. (If this page was already mobile-friendly it stays so; no changes were made to it this pass.)

4. Navigate to `/track`, `/stats`, `/api-docs`:
   - Each loads without horizontal scroll at 375px. Note any remaining issues for a follow-up pass.

5. Rotate to 667 × 375 (landscape):
   - Dashboard should still be single-column mobile layout (both dimensions under or equal to 768 width gate — yes 667 < 768).
   - Gear button left padding still creates a left gutter; acceptable.

- [ ] **Step 2: Desktop regression at 1440 × 900**

Toggle device toolbar off. Confirm:

- TopBar shows crew flag emoji list + orbital metrics + TDRS + period + DELAYED? + time.
- BottomBar shows METRIC IMPERIAL FR Credits Feedback + branding.
- Dashboard is 3-column layout.
- Timeline shows all 7 hour labels.
- OrbitalParams is 2-column grid.
- ModuleTemps schematic visible (horizontal chain with Node 3 below).
- Gear modal at 560px max-width, Credits modal at 600px, CrewModal at 720px.
- Panel customization modal rows horizontal (checkbox, name, L/C/R aligned right).

- [ ] **Step 3: Tablet at 900 × 700**

Set width 900. Confirm: 2-column layout appears (per existing rule `@media (min-width: 769px) and (max-width: 1024px)`). None of the new mobile rules should apply. TopBar shows flags not compact count. BottomBar shows METRIC/Credits/Feedback.

- [ ] **Step 4: Fix any issues found**

If any issue is found during verification, fix it inline, verify again, commit with message `fix(mobile): <specific issue>`. Do NOT proceed to Step 5 with known issues.

- [ ] **Step 5: Final commit (only if verification fixes were made)**

If no extra fixes were needed, skip this step. Otherwise:

```bash
git add -A
git commit -m "fix(mobile): final verification pass tweaks"
```

- [ ] **Step 6: Summary check**

Confirm `git log --oneline` shows 10 commits from this plan (one per task 1–10) plus any Task 11 fix commits. The spec and plan were committed earlier; they should also appear.

---

## Rollback

All changes are additive (new CSS classes + new media query rules + one markup duplicate in ModuleTempsPanel). If a regression is found after merge:

```bash
git revert <commit-sha>
```

Per-task commits allow reverting individual fixes without losing others.
