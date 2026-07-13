# Block 1 Sustainability Redesign

**Date:** 2026-07-12
**Status:** Approved design, ready for implementation plan

## Problem

Block 1 (weeks 1–8) is a 5-day/week program. Weeks 1–3 (Phase 1, lighter loads)
were completed successfully. From week 4 onward (Phase 2: jerk daily max begins,
OHS goes to 4 sets, FS becomes dynamic/heavier), the athlete has been unable to
sustain 5 days/week — completing 3–4 of 5 days in recent weeks, with no
consistent pattern to which day gets dropped. As a result the athlete has been
stuck redoing week 4 multiple times.

Compounding this: `currentWeek` in the app is calculated purely from calendar
days elapsed since program start (`docs/src/app.jsx:3999-4000`), with zero
regard for what was actually completed. As of today the app reports "Week 8 —
Test" while the athlete has only actually trained through (a repeated) week 4.
The program has been silently drifting ahead of actual progress.

## Scope

This redesign covers **weeks 4–8 of Block 1 only**. Weeks 1–3 already worked at
5 days/week and are left untouched as historical record. Block 2 (weeks 9+,
currently only week-level summaries in `PROGRAM_OUTLINE`) is out of scope.

## Data model note (constraint on implementation)

The program is currently represented in two parallel places that must be kept
in sync by any change:

- `PROGRAM_B1` (`docs/src/app.jsx:308`) — drives the read-only week-by-week
  program view (`ProgramWeekView`).
- `DAYS_SUMMER` / `DAYS_SCHOOL` (`docs/src/app.jsx:226-306`) — drives the
  logging UI, carries per-exercise set/rep/load-range data.

Any exercise-list or set/rep change below must be applied to both.

## A. Frequency: 4 fixed days, effective immediately

Repurpose the existing SUMMER/SCHOOL toggle (`docs/src/app.jsx:4273-4279`,
`isSummer` state) rather than build a new mechanism. `ProgramWeekView` already
drops D5 when `isSummer=false` (`docs/src/app.jsx:3722`). The athlete switches
this toggle to school-term (4-day) mode now instead of waiting for August. D5
(Belt Squat / Split Squat / Face Pull / Ab Wheel) is dropped entirely — this
also removes the worst-recovery training day (post-shift, 5.5h sleep) from the
weekly schedule.

No season-relabeling of the toggle for now — same UI, just used earlier than
originally planned.

## B. Volume: 3–4 movements per session (weeks 4–8 only)

Each day trims to: MS opener (free, ~3 min, satisfies "touch competition
movement every session") + primary lift + 2 secondary exercises, each with a
clear named purpose. One exception: D1 keeps Back Squat single as a second
"cheap tier" item alongside the MS opener — it's an autoregulated, no-grinding
daily-max single (Torokhtiy's feel-based-loading principle), so it rides along
without adding real session time, and preserves weekly exposure to a PR lift
the athlete cares about tracking.

| Day | Cheap tier (opener) | Primary | Secondary (2) | Cut from weekly default |
|---|---|---|---|---|
| **D1** Mon | MS opener + BS single | HPS | OHS (priority weak point) · Pull-up (lat/snatch control) | Good Morning, GHR |
| **D2** Tue | MS opener | HPC | Clean Pull (pull strength) · Dips (triceps lockout → jerk carryover) | Incline Press, Trapi, Wide OHP, Dead Bug |
| **D3** Wed | MS opener | FS | OHS (2nd weekly exposure) · RDL (posterior chain/back) | Snatch Balance, Plank |
| **D4** Thu | MS opener | Jerk daily max | C&J (touches full competition lift) · Sots Press (jerk-specific) | Push Press, Behind Neck Press, Pallof |

Rationale for repeats/cuts:
- OHS appears twice weekly (Mon + Wed) — explicitly called out in CLAUDE.md as
  the snatch ceiling (50 kg, primary limiter).
- Dips stays on D2 specifically for triceps lockout carryover to the jerk —
  the other declared weak point — rather than as generic hypertrophy.
- Cut exercises are dropped from the weekly default outright (not rotated) —
  simplest option; can be reintroduced later if a specific weak point
  re-emerges.

## C. Cut accessories → "anytime" bucket

Plank, Dead Bug, Pallof, Ab Wheel, Face Pull are low-fatigue, no-bar,
low-CNS-cost. Reclassify as an **anytime bucket**: optional, doable on a rest
day or tacked onto a session with spare time, never required for a session to
count as complete. This keeps the injury-prevention/core value available
without it competing for session-time budget.

BS single, Good Morning, GHR, Trapi, Wide OHP, Snatch Balance, Push Press,
Behind Neck Press are dropped from the weekly default rather than moved to the
anytime bucket (they're barbell/loaded movements, not suited to ad-hoc use).

## D. Completion-based week advancement

Replace the calendar-based `currentWeek` calculation
(`docs/src/app.jsx:3999-4000`) with one derived from actual logged sessions,
using the existing `inferDaysFromLogs(week, dayList)` helper
(`docs/src/app.jsx:3351`), which already classifies each day as
`done` / `partial` / `skipped` from real session logs.

**Rule:** A week is complete once **all 4** scheduled days are `done` **or**
`partial` (i.e. the athlete showed up and trained — not gated on ticking every
last accessory set). `currentWeek` = the first week (starting from 1) that is
not yet complete. If a week falls short, the app does not advance —
`currentWeek` stays put and the athlete repeats that week's (now lighter)
content, instead of the program silently drifting ahead on the calendar while
actual training stalls.

## Out of scope

- Block 2 (weeks 9+) day-by-day design.
- Rotating cut accessories back in on a schedule (e.g. every-other-week BS
  single elsewhere) — noted as a possible future refinement, not needed now.
- Relabeling the summer/school toggle's copy/semantics.
