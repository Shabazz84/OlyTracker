# Block 3 — Catch-Depth Correction: Design Spec

**Date:** 2026-10-25
**Status:** approved by the athlete 2026-10-25 (builder check done the same day; its two questions settled in Edit 12 as marked calls)
**Amends:** `docs/superpowers/specs/2026-10-17-block3-design.md` — adds Edit Ledger items 12–18
**Weeks affected:** 17–24 (first session Wed 2026-10-28)

---

## Why

The week-16 test (Sat 2026-10-24) made snatch 70 and C&J 85, but the athlete
reports both were lifted badly:

- **Arms bend early**, before the second pull, on both lifts — the athlete
  pulls the bar with the arms. On the C&J it is worse: an active arm pull.
  **This happens at every weight**, light ones included.
- **The catch is high** — higher than a power snatch, on both lifts.
  **This is a choice, driven by fear:** "a fear of being crushed by the bar in
  the bottom position." The athlete drops into a full squat comfortably only
  **up to about 50 kg on the snatch and 60 kg on the C&J** — ~71% of the new
  maxes for both lifts.

Bottom-position *strength* is not the problem: snatch balance 70, overhead
squat 72, front squat 120. What is missing is willingness to drop under a
moving bar above ~70%.

Block 3 as built puts ~110 snatch and C&J singles in weeks 18–23, every one at
80–95% of the TM (snatch 56–66.5 kg, C&J 68–80.5 kg) — all above that line.
Each would rehearse the high catch and the arm pull. It also schedules power
snatch (wk 20) and power clean (wk 23, 24). And the 70 / 85 TMs were set by
high catches, so the percentages are calibrated to a power-height max.

**Athlete decision (2026-10-25):** accept snatch and C&J working weights
dropping to roughly 50–60 kg for weeks so that every rep is caught low, even if
the week-23 test does not beat 70 / 85.

## Evidence

The Z840 corpus services were down on 2026-10-25 (host answers ping; Qdrant,
Ollama and SSH time out), so this rests on passages already saved under
`evidence/`. Re-query `python main.py ask` when the box is back — in particular
for Everett's article "Arm Bend in the Snatch & Clean: It's Still Not the
Solution to Your Bad Lifting" (in the corpus, not in the saved packs).

| Handle | Source | What it supports |
|---|---|---|
| E106.12 | Everett, Catalyst, "Ask Greg: Can't Receive the Snatch Low with Heavier Weights" | the athlete's exact problem. Overhead squat, then snatch balance received as deep as possible: slow smooth dip, minimal leg drive, speed of the punch under, 2–3 s hold in the bottom every rep — to make the position routine so there is no hesitation. Then high-hang, tall, and high-block (mid-thigh) snatches to emphasise the pull under. |
| E106.9 | Everett, comment reply, to a lifter whose power snatch beats his snatch | low-receive confidence → more overhead squat and snatch balance; "Stop power snatching and squat…" |
| E37.11 | Everett, "Ask Greg: Cleans Crashing at Heavier Weights" | heavier weight reduces confidence in getting under → the lifter tries to pull the bar higher |
| E105.6 | Everett, "Ask Greg: Slow Snatch Turnover" | high-hang / power-position snatches; start with weights you're confident with — rushing heavier reinforces the problem |
| E104.7 | Everett, comment reply | early arm bend is probably a strength issue: getting the bar to mid/high thigh with the shoulders still over it. Halting or segment deadlifts help |
| E103.1 | Sika Strength video (Karlos Nasar block snatch) | high-block snatches reduce early arm bend |
| E17.6 | Steve Pan, comment reply on Catalyst "Pull Down for a Better Turnover" | tall snatch/clean are light: ~25–30%, not worked to a heavy single |

Quotes must be checked with `python -m tools.check_citations` against the
saved packs before any of them appear in a `docs/programs/` document or a
catalog `desc`.

---

## Goals

| Lift | Week-23 target (was) | Week-23 target (now) |
|---|---|---|
| Snatch | 75 | **70, caught in a full squat** |
| Clean & jerk | 90 | **85, clean caught in a full squat** |
| Back squat | 140 | 140 (unchanged) |
| Front squat | 125 | 125 (unchanged) |

Success also means: the arms stay long until the legs finish driving, visible
on side-on video.

**Non-goals:** changing training maxes; Block 4; new app UI (no "caught low"
checkbox — see Edit 12); the squats, push press, jerk variants and trunk work.

**Anti-goals** — fails even if it ships if:
- any session exceeds **6 cards** (original anti-goal, still binding — D3 is
  already at 6, so D3 changes are swaps only);
- any snatch or clean in weeks 17–24 is still prescribed so that the athlete is
  told to *reach* a weight rather than to stop at the first high catch;
- a power snatch or power clean remains anywhere in weeks 17–24.

---

## Edit Ledger additions (12–18)

### Edit 12 — Low-catch rule on every full snatch, clean and C&J

Applies to the Mon/Tue/Sat `snatch` and `clean_and_jerk` cards in weeks 18–24,
and to the full-lift complexes in week 17.

- **Start weight:** snatch **45 kg**, C&J **55 kg** *(my call — just under the
  athlete's reported 50 / 60 line)*. Fixed for the block; progress shows in the
  logged weights, not in a moving start.
- **Ceiling:** the card's existing Block 3 percentage of the live TM (e.g. wk 18
  snatch 80% = 56 kg). The load string becomes a range, start → ceiling, with
  the kg leading (`generateWeights` rules).
- **Climb (warm-up, not counted):** singles from the start weight in 2–3 kg
  jumps. **A single is "low" only if caught at or below parallel.** The climb
  stops at the **first high catch** or at the ceiling, whichever comes first.
  Never chase the ceiling.
- **Work sets (counted):** the card's sets, all at the **day's top weight** —
  the last weight caught low, or the ceiling if every climbing single was low.
  *(My call, settled after the builder check: counting the climb as the sets
  would cap the day at start + a few jumps — wk 19 snatch could never pass
  ~54 kg against a 63 ceiling — and flatten the wave. The intent the athlete
  approved is "climb only as high as you can still catch low", then work
  there.)*
- **Set counts stay as the source wrote them** (5 / 3 / 4 singles at the top
  weight). One-single days (wk 20 Mon/Tue, wk 23 Mon/Tue) stay one single: the
  climb is the warm-up and the single is the heaviest low catch for today.
- **Ceiling at or below the start** (wk 17 Thu snatch complex 42 kg, wk 17 Sat
  clean complex 51 kg, wk 24 Mon C&J 51 kg, wk 24 Mon snatch 45.5 kg): **no
  climb** — the existing fixed weight, plus the low-catch line *(my call)*.
- **Week 24 Sat "heaviest single for today"** cards come under this rule too:
  ceiling 95%, **one** work single at the heaviest low catch *(my call;
  replaces the 3–5 band, which was itself a judgment value)*.
- **Logging:** log the work sets only, and only if caught low. No new UI.
- The rule's text appears on the cards in short form (e.g. "climb 2–3 kg;
  only low catches count; first high catch → back down"). Card copy is the
  builder's.

Reason: E105.6, E106.12; athlete decision above.

### Edit 13 — No power snatch or power clean

| Week / day | Was | Becomes |
|---|---|---|
| 20 D3 | power snatch 5 × 2 at 75% | **snatch from high blocks** (mid-thigh or higher), 5 × 2, Edit-12 rule, ceiling 75% snatch TM |
| 23 D3 | power clean 5 × 2 at 75% clean | **clean from high blocks**, 5 × 2, Edit-12 rule, ceiling 75% clean max |
| 24 D2 | power snatch 3 × 1 at 70%; power clean + power jerk 3 × 1+1 at 70% clean | **snatch** 3 × 1, Edit-12 rule, ceiling 70%; **squat clean + power jerk** 3 × 1+1, Edit-12 rule, ceiling 70% clean (the jerk stays a power jerk per Edit 5) |

Existing Thursday positional lifts (3-position snatch/clean, snatch/clean from
blocks, week-24 2-position lifts) already sit below the 50 / 60 line; they keep
their loads and gain one line: every catch in a full squat. Blocks are
**mid-thigh or higher** (E106.12).

Reason: E106.9.

### Edit 14 — Snatch balance and overhead squat: slow dip, pause in the bottom

Every `snatch_balance` card (weeks 18–23 Thursday) keeps its sets and loads and
adds: **slow dip, minimal leg drive, punch under fast, hold the bottom 2–3 s
every rep.** Same pause on every overhead squat (week 17 Thu complex, week 24
Tue). "Max for the day" weeks stay max-for-the-day — under the new technique.

Reason: E106.12.

### Edit 15 — Tall lift opener on the classic days

One opener card first on each non-test classic day, weeks 18–23:

| Day | Opener |
|---|---|
| D1 Mon | `tall_snatch` 3 × 3 |
| D2 Tue | `tall_clean` 3 × 3 |
| D4 Sat | alternates: `tall_snatch` in weeks 18, 22; `tall_clean` in weeks 19, 21 (wk 20 and 23 Sat are tests — no opener) |

Load **20–25 kg** for both *(judgment: Catalyst guidance of ~25–30% of the
lift; 30% of the 70 snatch TM is 21 kg)*. Not worked heavy. Card counts become
D1 5, D2 4, D4 5 — within 6.

Both IDs exist in `EXERCISE_CATALOG` with **no `desc`**. Cues come through the
`olytracker-exercise-cues` skill (cited); if the corpus is still down, the
builder ships the cards and leaves the cue as a tracked follow-up, rather than
writing an uncited one.

Reason: E106.12 (tall snatches), E17.6 (load).

### Edit 16 — Thursday pulls become segment deadlifts

Weeks 18–23 Thursday: the snatch pull / clean pull card becomes a **segment
deadlift** with the matching grip — `snatch_deadlift` in snatch weeks,
`clean_deadlift` in clean weeks *(reuse the existing IDs; my call, to avoid new
catalog entries)* — pausing **2 s just below the knee and 2 s at mid-thigh**,
shoulders over the bar, **arms long**, then stand. Same sets × reps and the
same percentages as the pull it replaces *(judgment — no corpus load for
segment deadlifts; the slower pauses make the old pull loads conservative)*.

Weeks 17 and 24 pulls stay pulls (80% — not the heavy ones), with one added
line: arms long until the legs finish.

Reason: E104.7 (arm bend as a position-strength problem), Everett's principle
in CLAUDE.md that pulls in bad positions build strength in bad positions.

### Edit 17 — Week-20 checkpoint and week-23 test count only low catches

- **Week 20 Sat:** the snatch and C&J test cards become "heaviest single caught
  low today" — Edit-12 climb, one work single, ceiling 95%. Back squat
  stays a true max (TestLiftCard).
- **Week 23 Sat:** the TestLiftCard ladder stays, with the instruction **only
  low catches count; stop the climb at the first high catch.** The made max is
  the heaviest low catch. Front squat and back squat unchanged.
- Goal strings change per the Goals table (`program.js` Block 3 goal and the
  `b3_goals` item), and the Block 3 design's Goals table records the revision.

### Edit 18 — Film every classic day from the side

One line in the week-plan notes for weeks 17–24: film snatches and cleans from
the side; catch depth and arm bend are judged on video, not by feel.

Reason: Klokov's video self-review principle (CLAUDE.md Principle 8).

### Edits 19–21 — added 2026-10-25, after reading the full article (athlete-approved)

The full text of Everett's "Ask Greg: Can't Receive the Snatch Low with Heavier
Weights" (catalystathletics.com/article/1948) was found locally in the gitignored
`transcripts/web/catalystathleticscom/`. The evidence packs held only its last
paragraph (E106.12). It is not in a pack, so these three lines cite the article by
name and URL, not by a checked handle.

- **Edit 19 — squat a high catch down.** Both low-catch notes add: caught high,
  ride it down into a full squat before standing (it still doesn't count). Source:
  "The times when you do power snatch unintentionally, squat it after you receive it."
- **Edit 20 — hold the bottom on every catch.** Both notes add: hold the bottom two
  to three seconds on every catch. Source: "Hold the bottom position for two to
  three seconds every time." The article is about the snatch; applying it to the
  clean as well is *my call*, since the athlete's C&J catch has the same fault.
- **Edit 21 — warm up in the bottom.** Every snatch day (wave-week D1/D2/D4, week 17
  Thu, week 24 Mon/Tue/Sat) opens its day note with an overhead squat and snatch
  balance warm-up, holding the bottom. Source: "Warm-up with overhead squats and
  snatch balances."

Not adopted from the companion article ("Arm Bend in the Snatch & Clean",
catalystathletics.com/article/1904): "focus on arching your back forcefully" —
conflicts with the back-pain rule (no exaggerated arch). Its clean-grip check
(forearms vertical in the rack, hands half a fist to a fist outside the shoulders)
is passed to the athlete as a video check, not a program change.

### Edits 22–25 — added 2026-10-26, after the corpus came back online (athlete-approved)

With the Z840 back, ten `python main.py ask` queries on early arm bend, high
catches and fear of the bottom surfaced four Everett articles not read for
Edits 12–21. Their full text was read locally (`transcripts/web/catalystathleticscom/`,
gitignored). None contradicts Edits 12–21 except where Edit 22 now refines the
low-catch rule. The athlete approved all four ("Add all").

- **Edit 22 — full pull, one continuous squat.** "Ask Greg: Should Snatches Be
  Received as High or Low as Possible?" (catalystathletics.com/article/2068): the
  only way to catch lower at the same weight is to put less into the second pull,
  which Everett calls a bad habit; he wants the bar fixed overhead early while the
  lifter keeps squatting to the bottom. Edit 12's rule, read literally at 45–50 kg,
  could teach a softer pull. Both low-catch notes now say: pull all the way, never
  pull softer to catch lower; fixing the bar early and sitting to the bottom in one
  motion counts as a low catch; stopping in a power position doesn't count, even if
  ridden down afterwards (Edit 19 kept). **Transfer:** the article is about the
  snatch; the notes apply the same rule to the clean ("overhead or in the rack").
- **Edit 23 — arms long and loose, not locked.** "Don't Lock Your Elbows in the
  Pull" (article 2108): locking the elbows to avoid early bend is a common
  overcorrection that swings the bar forward; the arms should be straight only
  because they are not bent. Edit 16's "arms long" (snatch pull wks 17/24, every
  segment deadlift) becomes "arms long and loose, not locked". Article 1904's
  "elbows loose" agrees.
- **Edit 24 — climb in waves.** "Ask Greg: Getting Over Fear in the Snatch"
  (article 2124): approach the weight where fear starts in progressively rising
  waves rather than a straight line. The low-catch climb is now two jumps up, one
  back, then up again; the stop-at-the-first-high-catch rule is unchanged. Fixed-
  weight cards have no climb and no wave.
- **Edit 25 — clean + front squat + jerk.** "How to Fix Powering More Than You
  Squat" (article 2058) lists a front squat added to every clean or C&J set among
  its general corrections. Every training C&J card (wave-week D1/D2/D4, week 24
  Mon/Tue) becomes `clean_front_squat_jerk`, reps 1+1+1, same start / ceiling.
  **My call:** the week-20 checkpoint, the week-23 test and the week-24 Saturday
  heavy single stay a plain `clean_and_jerk` — they measure the lift, and those ids
  feed PR history. The new catalog entry reuses the two cited cues of
  `clean_fs_jerk_complex`, singular (provenance: `docs/programs/2026-10-25-catch-depth-cues.md`).

Confirmed, no change: article 2058 also asks for no power variations, high-block
lifts in their place, tall snatch / clean, squatting any inadvertent power catch
and holding snatches in the bottom — all already shipped (Edits 13, 15, 19, 20). It
gives 3–5 s for the snatch hold; the cards keep article 1948's 2–3 s. An Everett
comment reply (article 1718) says the same: stop power snatching, squat
everything, hold the bottom.

---

## Constraints carried from the Block 3 design

- No Catalyst source text in the repo, comments or commits; provenance
  comments cite the Edit number.
- Loads stay computed from live `TRAINING_MAX`; TMs are **not** changed.
- `olytracker-lift-review` parses `l1` strings — keep the entry shape.
- Tests: extend `tests/js/block3.test.mjs` (no power_snatch / power_clean in
  weeks 17–24; every wk 18–23 snatch / C&J card carries the low-catch range;
  card count ≤ 6 per session).
- Version bump to **v3.20.0**; update CLAUDE.md's current version and the
  goals sentence; verify rendering with `olytracker-ui-verify`.

## Left to the builder

Card copy and how much of the rule each card repeats; helper names
(e.g. a `b3Low(...)` constructor); whether the week-plan `primary` lines name
the rule; the exact string for week 20's checkpoint cards.
