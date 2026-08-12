# Block 1 Evidence Rebuild — Design

**Date:** 2026-08-10
**Status:** Approved for planning
**Scope:** Rebuild Block 1 from cited corpus evidence, diff it against the live
Block 1, and measure how much of a training block this corpus can actually
support. Block 2 is explicitly out of scope — it gets its own spec once the
diff tells us what the method can carry.

---

## Context

`PROGRAM_B1` (`docs/src/app.jsx:300`) is 8 weeks × 5 days, hand-authored before
the corpus was queryable. Every prescription in it — `Pause FS 4×6 (≤80% TM)`,
`OHS 4×4`, `Jerk daily max`, `Deload: sets −40%` — reads with equal authority,
and nothing in the document distinguishes a claim traceable to a coach from one
assembled from memory.

That is the exact failure mode already documented in this repo. The archived
`summaries_archive/master_synthesis.md` asserted "deload every 4th week" and
"drop 40% if back pain >3/10" in the same confident voice as claims that were
verbatim-accurate, with zero citations to tell them apart. Retrieval later showed
the real source saying deload frequency "can vary from person to person."

Since the Task 6 migration (2026-08-10) the corpus is queryable: `oly_transcripts`
holds 1,933 notes / 21,123 chunks, and `python main.py ask "<question>"` returns
verbatim passages with source URLs and makes **no LLM call**. Nothing sits between
the transcript and the reader, so no number can be invented.

This project is the first program artifact built on that.

## Goals

1. Produce a Block 1 where every prescription is either **cited to a real
   retrieved passage** or **explicitly tagged as uncited judgment**.
2. Diff it against the live Block 1 to find where hand-authored guesses diverge
   from what coaches actually said.
3. Measure the **uncovered fraction** — how much of a training block this corpus
   cannot speak to. That number, more than any individual finding, determines how
   much of Block 2 can be evidence-driven.

## Non-Goals

- **No changes to the live program.** The athlete is in week 6 of 8 and will
  finish weeks 7–8 as written. This is a paper artifact.
- **No Block 2 content.** Separate spec, after the diff.
- **No changes to retrieval tuning.** The 0.58 threshold was calibrated and
  deliberately left alone; this project consumes retrieval, it does not tune it.

---

## Fixed Inputs vs. Derived Content

**Fixed** — handed to the rebuild as constraints, never derived:

- The weekly schedule: 5-day summer split, per-day sleep quality, the Wednesday
  hard stop. The corpus has **confirmed zero coverage** of night-shift
  scheduling; deriving it would mean inventing it.
- Current training maxes and tested lifts.
- Chronic back pain as a standing condition.
- The athlete's goal and training age.

These come from `CLAUDE.md`'s Athlete Profile table, which is reference data.

**Derived** — must come from a cited passage or be tagged:

Exercise selection · set × rep schemes · %TM · week-to-week progression rate ·
deload timing and magnitude · testing protocol · jerk approach (prescribed vs
daily max) · hang vs floor · squat variant and rep range · pull loading relative
to the competition lift · accessory selection and dosing · mobility dosing.

Notably, the tall-lifter squat protocol is **derived, not carried over**, even
though it was synthesized from this corpus before (Sika + Telander, v3.2.0). Its
reappearance is a validation signal — see below.

---

## Architecture

Three artifacts, produced in order.

### 1. The Evidence Pack (deterministic)

A new `main.py evidence` subcommand, mirroring the existing `index` / `synthesize`
/ `ask` pattern.

**`synthesis/questions.py`** — a list of `Question(id, key, text)` organized by
*program decision*, not by generic topic. This is the fix for `TOPICS`, whose 7
broad themes covered ~5% of the corpus and produced a document useful as a map
but not as a program.

Questions are phrased *"what do these coaches say about X"* — never about this
athlete. Retrieval must stay topic-only so stored evidence carries no athlete
bias, the same rule `TOPICS` follows.

The catalog, grouped:

- **Block architecture** — does an amateur weightlifter need a dedicated
  hypertrophy block; how long should a block run before testing; how often and
  how deeply to deload; how to test maxes at the end of a block.
- **Session structure** — how many exercises per session; what a session should
  open with; how often per week to train the competition lifts.
- **Snatch** — hang vs floor while learning; overhead squat programming and
  dosing; fixing a weak overhead position; muscle snatch purpose and dosing.
- **Clean & jerk** — power vs split jerk; introducing the split jerk to a lifter
  who has never trained it; programming the jerk when it lags the clean; daily
  max singles vs prescribed sets; clean pull loading relative to the clean.
- **Squat** — front vs back squat with back pain; pause front squat purpose;
  squat rep ranges for long-limbed lifters; squat dosing inside a hypertrophy
  block.
- **Back health** — training around chronic low back pain; back-sparing exercise
  selection; trunk and core work for weightlifters.
- **Loading & progression** — percentages for a hypertrophy phase; week-to-week
  load increase rate; autoregulation vs fixed percentages.
- **Accessories & mobility** — upper-body accessory work for weightlifters; ankle
  mobility for squat depth; mobility frequency and dosing.

**`synthesis/evidence.py`** — walks the catalog, calls the existing
`retrieve_topic` at `limit=12` per question (enough to see whether a claim is
one coach's opinion or a consensus, without burying the reader), at the
config-supplied `similarity_threshold`, and writes full untruncated passage text
— the CLI's 420-char snippet is for scanning, not for citation:

```
evidence/2026-08-10/
  manifest.json          # per question: text, threshold, limit, n_passages, n_sources, covered
  README.md              # index + the list of NO-COVERAGE questions
  q01-<key>.md           # verbatim passages: score, title, source URL, full text
  ...
```

**Citation handle: `E12.3`** = question 12, passage 3. Because the pack is on
disk, the handle stays resolvable. This closes the open item recorded in
`STATUS.md`: retrieval reorders near-tied results between runs, so citation
numbers were previously not reproducible and could not be audited after the fact.

Cost: ~29 retrieval calls, no LLM, on a 0.6b embedding model. The Z840 GPU lease
is checked before the batch runs.

**`evidence/` is gitignored.** The pack is verbatim transcript text, and
`CLAUDE.md` is unambiguous: never commit raw transcript text — the corpus
includes material pulled from a source with a known site-wide compromise. The
pack is therefore a **local** audit artifact: citations are resolvable on this
machine, and regenerable elsewhere by re-running `main.py evidence` against the
same collection. The committed rebuild and diff carry only citation handles and
short justifying quotes, not passage bodies.

### 2. The Rebuilt Block — `docs/programs/2026-08-10-block1-rebuild.md`

Structured to mirror `PROGRAM_B1` (week → phase → 5 days → primary / secondary /
notes) so the diff can run line-for-line rather than prose-against-prose.

Citation rules:

- Every prescription carries either `[E12.3]` or `[JUDGMENT — NO COVERAGE]`.
  There is no third category, so nothing hides in the middle.
- **Numbers may not be interpolated.** If the corpus supplies a rep range but no
  percentage, the rep range is cited and the percentage is tagged judgment.
  Silently bridging that gap is precisely what made the archived synthesis
  untrustworthy.
- A `[JUDGMENT]` tag is not a failure. It is the honest label for a decision the
  corpus cannot make, and the count of them is a primary output.

### 3. The Diff — `docs/programs/2026-08-10-block1-diff.md`

One row per prescription:

| Dimension | Live Block 1 | Evidence rebuild | Verdict | Cite |
|---|---|---|---|---|
| Deload magnitude | Sets −40%, wk 7 | … | AGREES / DIVERGES / OLD-UNSUPPORTED / NEW-UNCITED | E04.2 |

Verdicts:

- **AGREES** — live prescription is supported by a retrieved passage.
- **DIVERGES** — corpus says something materially different.
- **OLD-UNSUPPORTED** — live prescription has no corpus support (not
  contradicted, just unfounded).
- **NEW-UNCITED** — the rebuild needed a judgment call here too; neither version
  is evidence-based.

Then three roll-ups: percentage supported, percentage contradicted, percentage
uncovered.

---

## Validation

**The tall-lifter reproduction check.** The squat protocol shipped in v3.2.0
(pause front squat, back-sparing quad accessories, living in the rep range where
technique holds) was derived from this same corpus, from two independent sources.
A blind rebuild that reproduces it unprompted demonstrates the method reproduces a
known-good result. A rebuild that misses it is a *retrieval* finding — more
valuable than the program itself — and must be investigated before the output is
trusted.

## Guardrails

`pytest` coverage for `evidence.py`:

- Manifest fields match what was actually retrieved.
- A NO-COVERAGE question is **recorded as a gap**, never silently dropped.
- `BackendUnavailable` mid-run aborts non-zero rather than writing a partial pack
  reported as success — the same rule `index_dir` already follows.
- `questions.py` contains no athlete-profile markers.

`check_citations.py` — parses every `[EXX.Y]` handle in the rebuilt program and
fails if it does not resolve to a real passage in the pack. This catches a
fabricated citation, the one failure mode that would make the entire artifact
worthless.

## Leak-Guard Interaction

`tests/test_no_athlete_context_leak.py` scans all `.md` and `.py` outside its
excluded directories for the profile markers `102.5 kg`, `OHS 50 kg`,
`primary snatch limiter`.

`docs/superpowers/` is already excluded, so this spec is unaffected. But
`docs/programs/` is not, and the rebuilt program necessarily restates training
maxes and limiters in its Fixed Inputs section.

**Resolution:** add the rebuild's exact path to `ALLOWED`, exactly as
`summaries/master_synthesis.md` already is, with the same reasoning — this is a
*terminal output* where athlete context legitimately applies, not a stored-and-
retrieved artifact that would bias future retrieval. Adding `docs/programs/` as
an excluded *directory* is rejected: that would let any future file there carry
the profile undetected.

## Risks

- **The corpus under-covers more than expected.** If the uncovered fraction is
  large, the honest output is a mostly-`[JUDGMENT]` document. That is still a
  result — it bounds how much of Block 2 can be evidence-driven — but it is not
  the outcome the effort implies. Accepted.
- **Retrieval reordering between the pack build and the write-up.** Mitigated by
  building the pack once, up front, and citing only from the persisted files.
- **The pack is local-only, so citations are not auditable from the repo alone.**
  Unavoidable given the no-raw-transcripts rule. Mitigated by recording each
  passage's source URL and note path in the committed diff, so any single claim
  can be re-checked at its origin without the pack.
- **Question phrasing steers results.** Mitigated by keeping questions
  decision-shaped and athlete-free, and by persisting the question text in the
  manifest so any bias is auditable after the fact.

## Out of Scope

Block 2 design · any edit to `docs/src/app.jsx` or the live program · retrieval
threshold changes · re-running `main.py index`.
