# App UI Slim-Down: Design Spec

**Date:** 2026-10-17
**Status:** draft for athlete review (builder check done 2026-10-17)
**Mockups:** https://claude.ai/artifact/GYktKetnfqh684f8653JEW (private; Option A was chosen)

---

## Why

The athlete uses one tab, **Program**, and only its training-day cards. The app
has 10 tabs, and four of them sit off the right edge of a phone screen. The
Program tab puts about 2½ screens of setup above the first exercise card: a
summer/school banner, a 24-button week grid, a phase banner, notes and a
progress box. The daily ankle/core/spine routines (25–30 min, on the Mobility
tab) stopped entirely, "no time, also out of sight". Block 3 assumes they
continue, and Principle 17 (long-limbed squatters: ankle work daily) depends on
them.

Success: the gym screen goes straight to today's work, the warm-up happens
again because it sits inside the session, and the rest of the app fits in four
tabs without losing anything the athlete actually looks at.

## Goals

1. **Program tab (Option A, "Trimmed").**
   - Remove the summer/school toggle and its banner. The app runs the
     Mon/Tue/Thu/Sat school week permanently.
   - Remove the Back Pain Protocol box.
   - Remove the duplicate "WK 1–3 / WK 4–6" boxes in every exercise card.
   - Remove the Schedule sub-tab.
   - Replace the 24-button week grid **and** the phase banner with one stepper
     row: `‹  WEEK 18 · CYCLE WEEK 1  ›`, with the week's load line beneath it
     (e.g. `MON 80% · TUE 80% · SAT 80%`).
   - Reduce day title and notes to one line above the progress bar.
   - Keep Week Plan as the only other sub-tab.
2. **In-session warm-up (new).** Each Block 2+ session gets two extra cards:
   - **Before, ~12 min — the real ankle dose, fewer drills** (athlete's
     choice, 2026-10-17, over a 6-min primer that would have underdosed it):
     - **Loaded ankle dorsiflexion stretch, 2–3 × 90 s per side.** This is
       DAILY ANKLE's own effective dose; that routine warns "a light stretch
       does nothing". It is the drill the card exists to restore
       (Principle 17).
     - **One round of McGill curl-up, side plank and bird dog**, ~2 min,
       from DAILY CORE.

     Nothing else goes on the card. The empty-bar pause squats are dropped:
     the session's own snatch warm-up covers that pattern.
   - **After, ~4 min.** Spine stages 1–2: supine pelvic tilt and segmental
     cat-cow, from DAILY SPINE. The spine work goes **after** the session, never
     before (Principle 12, as the app's own spine note says).
   - Each drill is a tickable row, like a set.
   - Ticks persist like set ticks: synced and restored on reload.
   - They **do not count** toward the session's set total or completion %.
     *(My call: a rushed day that skips them must not read as an incomplete
     session.)*
3. **Tabs: 10 → 4.** `PROGRAM · LOG · PRs · MORE`.
   - **More** opens a small menu or sheet: Exercises, Mobility, System, Settings.
   - **Supps** is removed.
   - **Analytics** is removed as a tab (its PR progression chart moves to PRs).
   - **Reports** merges into Log.
4. **Log = Log + Reports.**
   - **Top:** a month calendar with training days marked and ‹ › between
     months.
   - **Tap a day:** that day's session opens below the grid. For each exercise,
     the weights logged for every set, then the session's notes.
   - Editing and deleting a log entry happen in the opened day.
   - **Below the calendar**, one section survives: **sessions per week**,
     with the target set to 4 (the hard-coded 5 is from summer). *(My call.)*
     Reports' Load Development is dropped, not ported. It sums every exercise
     into one number, gets no date for Block 2–3 sessions, and counts every
     Block 2–3 exercise as 3 reps. Per-lift trends live in the PRs progression
     chart instead. The rest of Reports, Analytics and the old flat log list
     go.
   - **Editing in the opened day** covers the session record only (notes,
     rating, pain, energy), via the existing log form, plus delete. Logged set
     weights are not editable here. *(My call: set editing writes to the
     synced `sets` table and would need a PR-correction rule. Out of scope.)*
   - Reports' **Supabase Sync** section (`SyncSection`) moves to Settings.
     It holds the manual push of sessions, sets and reviews to the cloud.
     Settings' own Cloud sync block only shows status, so the two are not
     duplicates.
5. **PRs: 10 lifts only.**
   - The lifts: Snatch, Clean & Jerk, Clean, Split Jerk, Back Squat, Front
     Squat, Snatch Balance, Overhead Squat, Snatch Pull, Clean Pull.
   - One row per lift: weight, reps, date.
   - Tapping a row shows that lift's progression over time (the chart from
     Analytics).
   - **Which stored ids feed each row** *(my call; the highest weight wins)*:

     | Row | Stored ids |
     |---|---|
     | Snatch | `snatch`, `snatch_from_floor` |
     | Clean & Jerk | `clean_and_jerk` |
     | Clean | `clean`, `clean_front_squat_floor` |
     | Split Jerk | `split_jerk_from_rack`, `jerk_from_rack` |
     | Back Squat | `back_squat` |
     | Front Squat | `front_squat` |
     | Snatch Balance | `snatch_balance` |
     | Overhead Squat | `overhead_squat` |
     | Snatch Pull | `snatch_pull` |
     | Clean Pull | `clean_pull` |

     Not mapped:
     - `split_jerk`, the empty-bar drill.
     - `push_jerk`, a different lift.
     - The jerk inside `clean_and_jerk`.
   - **No reps column.** The PR rebuild stores reps as 1 for everything, so a
     reps column would show wrong numbers. Rows show weight and date. *(My
     call; changing PR storage stays a non-goal.)*
   - **Keep "+ Add PR"** as a small button under the list. It is the only way
     to record a lift done outside a logged session. Drop the KEY / STRENGTH /
     OVERHEAD / ALL filters. *(My call.)*
   - PR detection and storage for every other exercise keep running unseen.
     Only the list is filtered.
6. **Settings (under More).** Keep **Data backup** (export/import) and **Cloud
   sync (Supabase)**, now joined by Reports' manual-push `SyncSection`. Remove the **Claude API (AI review)** section, per the athlete
   (2026-10-17). With it goes the AI half of the weekly review form, which only
   ever ran for Block 1 weeks. A browser cannot hold that key safely anyway
   (`CLAUDE.md`, `docs/key.js` note). Any stored key value is simply no longer
   read.
7. **System (under More).** Keep only **Blocks** (the roadmap and the block
   goals). Drop the LMS phase selector (it changes nothing anywhere), the
   Principles section and the Pain section. Their text remains in `CLAUDE.md` /
   design docs.

## Non-goals

- Writing cues and descriptions for the exercise catalog. Only 18 of 150
  entries have any. That is a separate, later content project sourced from
  the corpus.
- Changing the program, loads, logging data model or sync.
- Redesigning Exercises, Mobility or Settings beyond moving them under More
  (and Settings gaining the Sync section).

## Anti-goals — failure even if it ships

- **Losing data or history.** Existing summer-mode (Block 1) sessions, logs,
  set ticks, PRs and supplement history stay in storage and in Supabase.
  Removing a view never deletes its data. Data-backup **import** must still
  accept old exports that contain `oly_summer` / supplement keys.
- **Breaking logging.** Week-completion, PR rebuild and the week-16 test day
  behave exactly as now. Block 1's day catalog (`DAYS_SUMMER` names) is still
  used to resolve old logs, so it stays even though the toggle goes.
- **Warm-up as a gate.** The warm-up must never block ticking sets or
  completing a session.

## Constraints

- `docs/src/app.jsx` is the source; rebuild `docs/app.js`. Bump the version.
- Verify every visible change with `olytracker-ui-verify` against a staged copy
  (never the real `docs/`). Add the week-16 regression and week-17 completion
  examples to the run.
- `isSummer` currently threads through ~24 places. Remove the **toggle** only.
  Weeks 1–8 (Block 1) keep rendering with the summer catalogue they were
  trained on, so D5 sessions and the Block 1 review form stay intact. Week 9
  onward uses the school week. Don't rip `isSummer` out wholesale where it feeds
  data paths (log resolution, PR rebuild, the Block 1 review form). *(My call.)*

## Left to the builder

- Calendar component details (week start day, marker style, empty-day tap).
- The exact drill doses on the warm-up card. Start from the app's own
  DAILY ANKLE / CORE / SPINE prescriptions, shortened to the stated minutes,
  and keep any `[E…]` / `[JUDGMENT]` tag in the drill's note.
- Whether More is a sheet or a fifth "tab" that opens a list.
- Splitting the work into tasks (Program tab, warm-up, tabs/More, Log
  calendar, PRs) and their order.
