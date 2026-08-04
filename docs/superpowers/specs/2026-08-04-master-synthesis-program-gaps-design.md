# Master Synthesis Program Gaps

**Date:** 2026-08-04
**Status:** Approved design, ready for implementation plan

## Problem

This session fixed a bug in `generate_master_synthesis()`: it silently
truncated combined source summaries at a 24k-token cap and ran on
`config.CLAUDE_MODEL` (Haiku), tuned for cheap per-video summarization, not
for synthesizing 21 sources into one coherent document. Both are fixed
(commit `96c9841`) and `summaries/master_synthesis.md` has been regenerated —
substantially richer, with sources (Zack Telander, Max Aita, Sika) that were
previously dropped now correctly represented.

Comparing the regenerated synthesis against the live program
(`PROGRAM_B1`/`DAYS_SUMMER` in `docs/src/app.jsx`) surfaced two real gaps and
two apparent conflicts. The conflicts turned out to be deliberate existing
decisions the synthesis simply didn't know about (documented via user Q&A
during brainstorming — see Decisions below); only the two gaps warrant a
change.

## Decisions (conflicts resolved, no code change)

- **Back squat stays a weekly feel-based max single on D1.** The synthesis
  recommended 1x/week moderate/pain-gated load instead. Athlete has run the
  max-single format without issue (137.5 kg PR logged) and wants to keep it.
- **5-day summer schedule stays.** The synthesis converged on "4
  sessions/week" as a cross-source consensus, but that consensus didn't
  account for this athlete's actual per-day sleep windows (documented in
  CLAUDE.md's Weekly Schedule & Sleep Analysis). The existing 5-day structure
  is the informed choice, not an oversight.

## Data model note (constraint on implementation, per prior specs)

The program is represented in two parallel places that must be kept in sync:

- `PROGRAM_B1` (`docs/src/app.jsx:297`) — week-by-week program view text
  (`primary`/`secondary`/`notes` strings per day, weeks 1–8).
- `DAYS_SUMMER` / `DAYS_SCHOOL` (`docs/src/app.jsx:226–295`) — logging UI +
  weight-dropdown ranges, keyed by `EXERCISE_CATALOG` ids. `DAYS_SCHOOL`
  derives from `DAYS_SUMMER.slice(0,4)` and needs no separate edits.

`split_jerk`, `pallof_press`, and `bird_dog` already exist in
`EXERCISE_CATALOG` (`docs/src/app.jsx:454–563`) — unwired into either
program structure until now.

## A. Gap: no split-jerk work anywhere in the program

v3.5.0 removed the hard "no split jerk" constraint from the athlete profile
but never added split-jerk work to the program itself. Fix:

- **`DAYS_SUMMER` D4**: replace the `sots_press` entry with `split_jerk` —
  4 sets × 3 reps, unloaded (empty bar), footwork-only. No load progression
  needed (positional drill, not a strength movement).
- **`PROGRAM_B1` D4 secondary**, weeks 1–7: drop `Sots 3×5·XX`, add
  `Split Jerk 4×3 (empty bar)` (constant text every week — no numbers to
  progress). Week 8 (test week) is unaffected — it already has no Sots entry.

D4 remains at 5 exercises (MS opener, Jerk-from-rack/daily-max, the new OHS
touch from §B, Split Jerk, C&J) — within the 4–6 exercise guideline.

## B. Gap: OHS trains only 2x/week (D1, D3) against a #1-limiter priority

- **`DAYS_SUMMER` D2 and D4**: add `overhead_squat`, 2 sets × 3 reps, same
  40–48 kg / 46–54 kg (l1/l2) band already used on D1/D3 — a light technical
  touch, not a new main lift.
- **`PROGRAM_B1` D2 and D4 secondary**, weeks 1–7: append `, OHS 2×3·XX`,
  where XX mirrors that week's D3 OHS number for that week (40/42/44/46/48/
  50/44 kg, weeks 1–7 respectively) — reuses an existing progression instead
  of inventing a second one to track.

## C. Secondary addition: pain-gate note on back-loaded days

- **`PROGRAM_B1` D1 and D3 `notes`**, weeks 1–7: append —
  *"Pain-gate: back pain >3/10 pre-session → drop load ~40% or sub
  machine-equivalent."*
  Matches the existing pattern (D3 already carries a standing "Hard stop 3pm,
  max 80%" note) — no new UI.

## D. Secondary addition: more anti-rotation core work

- **`DAYS_SUMMER` D3**: add `pallof_press`, 3 sets × 10 reps, light–medium
  band (same style as D5's `face_pull` l1/l2 convention).
- **`PROGRAM_B1` D3 secondary**, weeks 1–7: append `, Pallof 3×10`.
- D5's existing `ab_wheel` is left untouched — this gives 2x/week
  anti-rotation work (D3 + D5) instead of the current ~1x, without
  overcrowding D5 past its existing 5 exercises.

## E. New "DAILY CORE" mobility tab

Mirrors the existing "DAILY ANKLE" tab pattern exactly (`docs/src/app.jsx`,
`MOBILITY.ankle` + its `MobilityTab` `sections` entry) — same drills every
day regardless of session type, so it gets the same daily-recurring tab
treatment rather than being duplicated into the four per-day `MOBILITY.pre.*`
sections.

- New `MOBILITY.core` entry: McGill Curl-Up (3×8, ~8s hold each), Side Plank
  (3×20–30s/side), Bird Dog Hold (3×8/side, ~5–8s hold each rep) — standard
  "McGill Big Three" spinal-endurance/anti-rotation warm-up, addresses the
  synthesis's "daily non-negotiable warm-up" recommendation directly.
- Add `{id:"core", label:"DAILY CORE", data:MOBILITY.core}` to `MobilityTab`'s
  `sections` array.

## Verification

- `npm run build` (esbuild JSX → `docs/app.js`) — must succeed with no errors.
- Version bump the `PROGRAM v<X.Y.Z> · <date>` header string in `app.jsx`
  per the CLAUDE.md rule (this touches `docs/src/app.jsx`/`docs/app.js`).
- Manual spot-check: Mobility tab shows the new "DAILY CORE" section with all
  three drills rendering; a couple of `PROGRAM_B1` weeks (e.g. week 1 and
  week 6) render D2/D3/D4 with the new entries and no broken text.
- This is a data-only change (no new logic/components beyond one tab-array
  entry) — the main failure mode is a mistyped `EXERCISE_CATALOG` id in
  `DAYS_SUMMER`, which `getEx()` would silently resolve to a blank/missing
  name rather than crash, so the visual spot-check is what actually catches
  it.

## Out of scope

- RPE/pain-gated autoregulation as a system-wide replacement for fixed
  percentages (declined during brainstorming — a bigger change than this
  pass warranted).
- Weekly video-review cadence formalization (VideoReview.html already exists
  as a separate tool; not touched here).
- Block 2 / Block 3 (only week-level summaries currently exist for those).
