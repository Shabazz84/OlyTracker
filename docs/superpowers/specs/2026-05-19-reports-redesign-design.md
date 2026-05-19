# Reports Page Redesign — Design Spec
**Date:** 2026-05-19

## Summary

Full redesign of the REPORTS tab in OlyTracker. Current page has an unfocused PR section (too many lifts), no summary stats, no exercise-level history, and uninteractive charts. This spec covers all six improvement areas identified by the user.

---

## Section Order (top → bottom)

1. Overview Cards
2. Personal Records
3. Load Development
4. Exercise Breakdown
5. Session Quality
6. Training Frequency + Night Shift Impact

---

## 1. Overview Cards

Five stat cards at the top. Four in a 2×2 grid, ATW spanning full width below.

| Card | Value | Color |
|------|-------|-------|
| Block Progress | "W3 / 6 · Block 1 · Hypertrophy" | gold |
| Days This Month | count of log entries this calendar month | blue |
| Current Streak | consecutive days trained (no gap) | green |
| Back Pain (7d avg) | mean `backPain` across last 7 session logs | red/orange |
| Avg Training Weight | last 30 days: total tonnage ÷ total reps for done sets with weight > 0 | purple |

**ATW card** shows last-30-day ATW, delta vs previous 30 days (e.g. "↑ +2.3% vs last month"), and the note: *"target: +4% for +10kg to total (Torokhtiy)"*.

**Streak logic:** count backwards from today through `logs` entries by date; reset on any gap day.

**ATW computation (overview card):** filter `sets_*` keys to sessions whose date falls within last 30 days, sum `weight × reps` for done sets with weight > 0, divide by total done reps. Repeat for previous 30-day window to compute delta.

---

## 2. Personal Records

**Lifts displayed (exactly 5):**
- Snatch (Floor)
- Clean & Jerk
- Back Squat
- Deadlift
- Flat Bench Press

All other lifts removed from this section (Clean Pull, OHS, etc. move to Exercise Breakdown).

**Layout:** One card per lift. Cards are always expanded (no collapse).

**Each card contains:**
- Lift name (small label, monospace)
- Current PR: large weight number + `×reps` + date
- Mini sparkline (right side): progression of PR weights over time, newest = rightmost
- History chips below a divider: `50kg Mar'25 · 60kg Jan'26 · 63kg ★` — oldest left, current rightmost with ★

**Data model change required:** current schema `{weight, date, reps}` must become `{weight, date, reps, history: [{weight, date, reps}]}`. Migration: on first load, if existing entry has no `history`, seed `history: [{weight, date, reps}]` from existing values. `handleAddPR` appends to history only when `nw > existing.weight`.

**Colors:** OLY lifts (Snatch, C&J) — gold. Squat — blue. Deadlift — green. Bench — purple.

---

## 3. Load Development

Two stacked charts with tap-to-tooltip interactivity.

**Chart 1 — Average Training Weight per session:**
- Y axis: kg
- X axis: sessions chronologically
- Bar or line chart (bar preferred — easier to compare sessions at a glance)
- Color: purple (`#aa66cc`)
- Tap a bar → tooltip: "W2 D1 · May 5 · ATW: 55 kg"

**Chart 2 — Tonnage per session:**
- Y axis: kg (total weight × reps)
- Same X axis
- Color: gold
- Tap → tooltip with date + value

**ATW per session computation:** for each session key `sets_w{n}_{d}_*`, sum done sets with weight > 0, compute tonnage and reps separately, divide for ATW.

---

## 4. Exercise Breakdown

Collapsible list of all exercises that have at least one logged set with a weight.

**Collapsed row** (always visible):
- Exercise name (monospace, uppercase)
- Best weight ever + session count
- Expand chevron (▸ / ▾)

**Expanded panel** (tap to toggle):

*Summary row (3 cards):*
- BEST: highest weight logged for this exercise
- VOLUME: total kg across all sessions (sum of weight × reps for all done sets)
- ATW: total tonnage ÷ total done reps

*Max weight sparkline:* one dot per session showing highest weight used that session. X = sessions chronologically, Y = max weight.

*Session history list (newest first):*
Each session entry shows:
- Date + week/day label (e.g. "2026-05-12 · W3 D1")
- ★ best marker on the session with the highest weight ever
- Set chips: `55×3`, `58×3`, `62×2` — weight × reps per set. Best-weight set highlighted in gold.
- Footer: `vol: 462 kg · ATW: 58 kg`

**Ordering of exercise list:** by total sessions logged, descending (most-used first).

**Only one exercise expanded at a time** (collapsing others on open keeps the list manageable).

---

## 5. Session Quality

Three line charts, unchanged layout but with tap/touch tooltips added.

**Chart 1** (height 160): Rating (gold), Energy (green), Back Pain (red). Y max = 10.
**Chart 2** (height 100): Technique Feel (blue). Y max = 4.

**Tooltip on tap:** nearest data point highlighted with a larger circle; tooltip bubble shows date, value label, numeric value. Tooltip dismisses on tap elsewhere.

**Touch implementation:** SVG `onMouseMove` / `onTouchMove` → find nearest X point → show tooltip state.

---

## 6. Training Frequency + Night Shift Impact

**Calendar heatmap:** unchanged design. Add tap interaction — tapping a trained day opens a bottom sheet (or inline expansion) showing that session's log entry: day name, rating, energy, back pain, technique feel, notes.

**Night Shift Impact cards:** unchanged. Two cards (POST-SHIFT / RESTED) with avg rating + avg back pain.

---

## Data Model Changes

| Change | Scope |
|--------|-------|
| PR history array | `oly_prs` — migrate on load, update `handleAddPR` |
| No other storage changes | Exercise data already in `sets_*` keys |

---

## What Does NOT Change

- Calendar heatmap colors and legend
- Night Shift Impact card layout (just adds to Training Frequency section)
- Session Quality chart data (just adds tooltips)
- Gist sync (no new keys needed — `oly_prs` already synced, `sets_*` already synced)
- All other tabs (PROGRAM, MOBILITY, SUPPS, LOG, PRs)

---

## Out of Scope

- Filtering exercise breakdown by date range
- Exporting data
- Comparing blocks (Block 1 vs Block 2)
- Push jerk vs split jerk breakdown (no split jerk anyway)
