# Block 3 — One Program, Adapted: Design Spec

**Date:** 2026-10-17
**Status:** draft for athlete review (builder check done 2026-10-17)
**Weeks:** 17–24 (2026-10-26 → 2026-12-20), Mon/Tue/Thu/Sat

---

## Why this block is built differently

Blocks 1 and 2 were assembled slot by slot from the whole corpus: every cited
principle earned an exercise, and nothing removed one. Each slot was
defensible; no one designed the day. Block 2's Thursday reached nine
exercises on a 3.5-hour post-shift nap (week 14 D3). The athlete's verdict on
Block 2: everything worked, but Day 3 had too many exercises.

Block 3 inverts the method. **One complete, tested program is the spine** —
its exercise selection, volume and progression were designed together by one
coach. The athlete's specifics are **named edits on top**, each listed in the
Edit Ledger below with its reason. Other sources enter only to answer a
specific question, never to add a slot.

### Choosing the spine

A corpus + web search for *complete* week-by-week programs (2026-10-17) found:

| Program | Complete? | Why not / why |
|---|---|---|
| **Catalyst Athletics "General Cycle"** (Everett) | yes, 8 weeks | **chosen** — written "for athletes with limited recovery ability or training time"; its first week already trains Mon/Tue/Thu/Sat; ends in snatch/C&J testing |
| Everett "Sample Masters Program" (in corpus) | yes, 6 weeks | runner-up; 3 days, same author and style |
| Ian Moir, Queensland WL, intermediate 3d × 12wk | yes | 180–210 reps/week, all work ≥80% — too much for night shifts |
| Kyle Pierce, LSUS intermediate (Boostcamp) | app only | hip snatch/clean (undoes the floor transition); 3×10 squats (Principle 18) |
| Foreman masters 14-week (Catalyst) | yes | 2 days; author says it works because of ~20 years of technique |
| Torokhtiy 4-day page / free intro | one sample week / beginner | no week-to-week progression |
| Berestov, Pavlukhin, Klokov, Dozer, Sika, Webster | — | philosophy, not programs (Pavlukhin's Telegram: 4 set×rep notations in 2,510 messages) |

### Licensing constraint (shapes how this is stored)

The source page says *"Please do not distribute or publish Catalyst Athletics
programs without permission."* The repo and the GitHub Pages app are public.
Athlete decision (2026-10-17): keep the app public and ship an **adapted**
program, not a copy. Therefore:

- The source text lives **only** in `program_sources/catalyst_general_cycle.txt`
  (gitignored, local). It is the builder's reference for every number.
- **Never copy the source text into the repo** — not into this spec, not into
  `app.jsx` comments, not into commit messages. This spec describes the mapping
  in its own words; the app carries the adapted prescriptions.
- The app credits the source by name and URL on the block header / week plan.

---

## Goals

Athlete-stated targets for the end of Block 3 (week-23 Saturday test):

| Lift | Now | Target |
|---|---|---|
| Snatch from the floor | TM 63 (floor never retested since 55 in Nov 2025) | ~~60–65~~ → ~~75~~ → **70 caught low** |
| Clean & jerk | TM 72 (best clean 80, best jerk 72.5) | ~~80 — i.e. a jerk of 80~~ → ~~90~~ → **85 caught low** |
| Back squat | 137 | 140 |
| Front squat | 115 | 125 |

**Revised 2026-10-25.** The week-16 test (Sat 2026-10-24) made snatch 70 and C&J 85 — both original goals beaten before Block 3 started. The athlete chose snatch 75 · C&J 90 (+5 kg each over the block). Back squat 140 and front squat 125 (test: 120) are unchanged.

**Revised again 2026-10-25.** The athlete reported both test lifts were caught high — by choice, from fear of the bottom above ~50 snatch / 60 C&J — with early arm bend at every weight. The goal is now 70 / 85 *caught in a full squat*; see Edits 12–18 and `2026-10-25-block3-catch-depth-design.md`.

These replace the current Block 3 goals in `program.js` (the `b3_atw`
"ATW risen 4%" set and the `PROGRAM_OUTLINE` week 17–24 rows).

**Non-goals:** Block 4 (weeks 25–28) design; changing sync, logging or the
test-card machinery; new evidence-pack questions.

**Anti-goals** — the block fails even if it ships if:
- any session carries more than **6 exercise cards** (Day 3 bloat again);
- two heavy squat days land on consecutive calendar days;
- source text is published verbatim.

---

## Structure

The source has a light transition-in week, two 3-week waves (singles in the
classic lifts climbing to Saturday maxes at the end of each wave), and a
transition-out week.

| App week | Dates | Source week | Role |
|---|---|---|---|
| 17 | Oct 26 – Nov 1 | transition-in (source days 1–7) | easy week, absorbs the 72-h fast |
| 18–20 | Nov 2 – 22 | cycle weeks 1–3 | wave 1; **week 20 Sat = max singles** (checkpoint) |
| 21–23 | Nov 23 – Dec 13 | cycle weeks 4–6 | wave 2; **week 23 Sat = block test** |
| 24 | Dec 14 – 20 | transition-out (source days 50–56) | light, leads into Block 4 |

### Day mapping for weeks 18–23 (athlete-approved)

The source trains five days: three heavy (snatch + C&J + a squat) and two
technique days (positional lift + pull + jerk variant / snatch balance).

| App day | Built from | Content |
|---|---|---|
| **D1 Mon** | source **Tuesday** | Snatch, C&J, **back squat** (source's straight back-squat progression) |
| **D2 Tue** | source **Thursday**, minus its front squat | Snatch, C&J, push press *(Edit 6)* |
| **D3 Thu** | source **Monday + Wednesday merged**, plus source Thursday's front squat | positional lift + matching pull (alternating, below), jerk variant, snatch balance, **front squat**, ab finisher |
| **D4 Sat** | source **Saturday** | Snatch, C&J, **paused back squat** to the day's rep max, stiff-legged deadlift |

Heavy squats land Mon / Thu / Sat — never consecutive days, which is also the
source's own spacing (Tue / Thu / Sat). The athlete explicitly kept all three
heavy squat days.

**Thursday alternation** — so the merged day stays at five lifts, the
positional lift and its pull alternate by week; the jerk variant and snatch
balance run every week:

| App week | Positional lift + pull (from) | Jerk variant (source Monday of that week) |
|---|---|---|
| 18 | snatch version + snatch pull (source Mon wk 1) | ✓ |
| 19 | clean version + clean pull (source Wed wk 2) | ✓ |
| 20 | snatch version + snatch pull (source Mon wk 3) | ✓ |
| 21 | clean version + clean pull (source Wed wk 4) | ✓ |
| 22 | snatch version + snatch pull (source Mon wk 5) | ✓ |
| 23 | clean version + clean pull (source Wed wk 6) | ✓ |

Snatch balance on every Thursday takes the source **Wednesday** prescription of
the same cycle week (including its "max for the day" weeks).

Snatch/C&J percentages follow the source day each app day is built from: D1
uses the source Tuesday %, D2 the source Thursday %, D4 the source Saturday %.

### Week 17 — fitted around the fast

The 72-hour fast starts after the week-16 test (Sat Oct 24) and ends Tuesday
evening; Mon and Tue are fasting days.

| App day | Built from | Notes |
|---|---|---|
| Mon, Tue | — | no session (fasting) |
| **Wed** | source transition **Tuesday** | back-squat ramp capped at 5 reps per set *(Edit 8)*; press; row; circuit dropped |
| **Thu** | source transition **Thursday** | as written |
| **Sat** | source transition **Saturday** | as written; the row conditioning is dropped |

Source transition Monday (hang power work) is dropped. The Wednesday session
needs a day label that says **Wednesday**, not Monday — Wed is a full-night-
sleep day with a 7 pm shift; hard stop by 3 pm.

### Week 24 — transition-out

Source transition-out has five days; the app keeps four on Mon/Tue/Thu/Sat
from the source Mon / Tue / Thu / Sat. Source Wednesday is dropped *(my call —
it is a second light C&J + squat day the transition does not need)*. Back
squat therefore does not appear in week 24; front squat does (Mon light, Sat
heavy single).

### Tests

- **Week 20 Sat** and **week 23 Sat** use the existing `test:true` /
  `TestLiftCard` pattern from week 16 (ladder + free-entry max): snatch, C&J,
  back squat, in that order. **Week 23 adds front squat fourth** (athlete goal).
  Stiff-legged deadlift follows as a normal card.
- **Training maxes stay fixed through weeks 18–23** *(my call)*. The source's
  wave 2 restarts at 80% of the same base by design; week 20's maxes are a
  checkpoint, not a re-base. The athlete may override after seeing week 20.

---

## Edit Ledger — every change from the source

| # | Edit | Reason |
|---|---|---|
| 1 | 5 days → 4 (mapping above) | school-term week Mon/Tue/Thu/Sat; heavy classic days on the two full-sleep days + Sat |
| 2 | Front squat moved from source Thursday's heavy day to the app's technique Thursday | three heavy squats, none consecutive (athlete decision) |
| 3 | **Thursday front squat is a ceiling, not a target** — stop at the first grinding rep; that week's top set is whatever was made cleanly | post-shift 3.5-h sleep; same rule Block 2 used for back-squat singles (Judgment Ledger 16). Athlete accepted as a trial: **if Thursday front squats keep stopping well short by week 20, move the front squat for weeks 21–23** |
| 4 | Thursday positional lift + pull alternate snatch/clean by week | keep Thursday at five lifts |
| 5 | Every jerk inside a C&J is a **split jerk**; source "jerk" sets are split jerk from the rack; power-jerk sets stay as written | Block 2's split-jerk transition continues; the C&J goal needs a jerk of 80 |
| 6 | All conditioning circuits (kettlebell, sandbag, dumbbell, rope, bear crawl, row, box jump, push-up/pull-up/squat-jump) removed. In their place, **at most one accessory per session**: D1 Block 2's static trunk work; **D2 push press** (Block 2 prescription: 3 × 3 at 60–70 % push-press TM, add weight only while fast) because D2 has no squat and the jerk is the limiter; D3 the source's ab finisher; D4 the stiff-legged deadlift is already the posterior slot | equipment-specific filler that adds cards; back-safe trunk work already exists |
| 7 | **Thursday's ab finisher is one card.** It takes the anti-extension / hanging work from the source Monday or Wednesday of that cycle week — ab wheel, hanging leg raise, planks — whichever that week has. Anything else in the source finishers — high-rep sit-ups, loaded side bends, knees-to-elbows, loaded halfmoons — is replaced by Block 2's static trunk work. A source A1/A2 pair stays one card. Light good mornings (source D4/week-24 slots) stay. | Principle 12: no loaded or high-rep spinal flexion, lateral flexion or rotation with chronic back pain. One card keeps Thursday at the 6-card limit *(my call; the athlete should check)* |
| 8 | Week-17 back-squat ramp sets capped at 5 reps (same %s) | Principle 18 — long-limbed squatters lose position at high reps |
| 9 | Week 17 Mon/Tue sessions removed; source transition Tuesday moved to Wednesday | 72-h fast |
| 10 | Week 23 test adds front squat (fourth) | athlete goal 125 |
| 11 | Clean pulls and clean-percentage work use a **clean** max (best clean 80), not the C&J TM | clean is ahead of the C&J; the source writes pulls as % of the clean |
| 12 | **Low-catch rule** on every full snatch, clean and C&J: climb from 45 / 55 kg, the % is a ceiling, work sets at the last low catch | see `2026-10-25-block3-catch-depth-design.md` |
| 13 | No power snatch / power clean: high-block or full lifts instead; positional lifts caught in a full squat | same |
| 14 | Snatch balance and overhead squat: slow dip, minimal leg drive, 2–3 s pause in the bottom | same |
| 15 | Tall snatch / tall clean opener on non-test classic days | same |
| 16 | Thursday pulls (wks 18–23) become segment deadlifts at the same loads; wk 17/24 pulls keep arms long | same |
| 17 | Week 20 Sat: heaviest low catch (checkpoint); week 23 test counts only low catches | same |
| 18 | Film every classic day from the side | same |
| 19 | Caught high → ride it down into a full squat before standing (still doesn't count) | same (addendum) |
| 20 | Hold the bottom two to three seconds on every snatch and clean catch | same (addendum) |
| 21 | Snatch days open with an overhead squat / snatch balance warm-up | same (addendum) |
| 22 | Low-catch notes: pull all the way, never softer to catch lower; fix the bar early and sit to the bottom in one motion counts; stopping in a power position doesn't | same (addendum 22–25) |
| 23 | Arm cue becomes "arms long and loose, not locked" | same (addendum 22–25) |
| 24 | Low-catch climb goes in waves: two jumps up, one back | same (addendum 22–25) |
| 25 | Training C&J cards become clean + front squat + jerk; checkpoint, test and wk-24 Sat stay a plain C&J | same (addendum 22–25) |

### Carried over from Blocks 1–2 (outside the session cards)

Daily ankle protocol (DAILY ANKLE tab) and spine mobility (DAILY SPINE)
continue unchanged.

**Empty-bar split-jerk practice is no longer a card** *(my call)*. Block 2
listed it as a 2 × 3 card on every day, because the split jerk was otherwise
barely loaded. In Block 3, every C&J ends in a split jerk (Edit 5) and Thursday
carries a jerk variant. So the split jerk is now loaded, and logged, three to
four times a week, and the C&J logs track the transition. The empty-bar drill
survives only as a one-line note on the Thursday jerk-variant card ("empty-bar
split jerks any day, as warm-up"). It is not logged, and it does not count
toward the card limit or the set total.

---

## Loading

- All percentages are of `TRAINING_MAX` values read **live**, so updating the
  TMs after the week-16 test (Sat Oct 24) moves all of Block 3. The builder
  ships before the test with current TMs; the post-test TM update is a
  separate one-line change.
- `TRAINING_MAX` gains a **`clean`** key (Edit 11), initial value 80.
- Snatch-balance "max for the day" → free-entry like a test max; the
  following "% of that" sets have no precomputed weight.
- Paused back squat "work up to an N-rep max" → no precomputed weight; show
  the rep target only.
- Round displayed loads the way Block 2 entries do.

---

## App integration (left to the builder, with constraints)

- Block 3 entries live alongside `BLOCK2_EXERCISES` (e.g. a `BLOCK3_EXERCISES`
  or a week-17–24 extension) and a week-plan source for weeks 17–24 so the
  WEEK PLAN tab stops showing the one-line outline. `weekPlan()` and the
  block header route block 3 accordingly. `BLOCK_BOUNDS` already has
  block 3 = weeks 17–24 ("STRENGTH").
- Every entry carries a provenance comment: the source day/week it came from,
  or the Edit-Ledger number that changed it — **no source text**.
- Exercise IDs: reuse existing catalog IDs; add only those that are missing
  (e.g. paused back squat, stiff-legged deadlift, 3-position clean, clean from
  blocks, power clean, jerk if absent).
- `olytracker-lift-review` parses `l1` strings — keep Block 2's entry shape.
- Version bump to **v3.17.0** (CLAUDE.md rule).
- Verify with `olytracker-ui-verify`: week 17 shows three sessions with the
  first labelled Wednesday; a week-18–23 sample of each day; no session over
  6 cards; week 20 and 23 Saturday render TestLiftCards (3 and 4); no console
  errors.

- Week 17 has three sessions. The week-completion logic (which advances
  `currentWeek` once d1–d4 are logged) must treat week 17 as complete
  after its three.
- Block 2 add-ons not in this spec (the Tuesday snatch-balance opener, the
  light snatch opener) do **not** carry into Block 3. Jerk percentages use
  the C&J TM. Positional and power cleans use the `clean` max (Edit 11).

## What is left to the builder

Data-structure shape, card labels and copy, how the week-17 Wednesday is
represented, rounding helper, and whether week plan notes are per week or
per wave.
