# Evidence Pack Coverage — 2026-08-11

What the corpus can and cannot speak to, per program decision.

The pack itself (`evidence/2026-08-11/`) is gitignored — it is verbatim
transcript text. This is the committed record of its shape, so the coverage
result survives without the raw text.

- **Collection:** `oly_transcripts` (1,933 notes / 21,123 chunks)
- **Retrieval:** hybrid dense+BM25, threshold 0.58, limit 12 per question
- **Result: 30/30 questions covered**

## Coverage is a low bar — read the source column

"Covered" means at least one passage cleared 0.58. It says nothing about
whether coaches *agree*, or even whether more than one coach spoke. The
column that matters for a program decision is **sources**, not passages:
twelve passages from two sources is one coach's opinion quoted twelve times.

| # | Key | Passages | Sources | Note |
|---|-----|----------|---------|------|
| 1 | hypertrophy_block_need | 12 | 9 | |
| 2 | block_length | 4 | 4 | thin |
| 3 | deload_frequency | 12 | 6 | |
| 4 | deload_magnitude | 12 | **2** | **single-voice — see below** |
| 5 | testing_protocol | 12 | 9 | |
| 6 | exercises_per_session | 6 | 6 | thin |
| 7 | session_opener | 12 | 11 | |
| 8 | competition_lift_frequency | 12 | 9 | |
| 9 | hang_vs_floor | 12 | 9 | |
| 10 | ohs_programming | 12 | 8 | |
| 11 | weak_overhead | 12 | 9 | |
| 12 | muscle_snatch | 12 | 10 | |
| 13 | power_vs_split_jerk | 12 | 11 | |
| 14 | learning_split_jerk | 12 | 9 | |
| 15 | jerk_behind_clean | 12 | 9 | |
| 16 | daily_max_vs_prescribed | 12 | 9 | |
| 17 | pull_loading | 12 | 7 | |
| 18 | front_vs_back_squat | 12 | 6 | |
| 19 | pause_squat | 12 | 10 | |
| 20 | squat_reps_long_limbs | 12 | 5 | narrow |
| 21 | squat_dosing | 12 | 8 | |
| 22 | training_with_back_pain | 4 | 4 | thin |
| 23 | back_sparing_selection | 7 | 6 | thin |
| 24 | trunk_work | 12 | 10 | |
| 25 | hypertrophy_loading | 7 | 6 | thin |
| 26 | weekly_progression | 12 | 9 | |
| 27 | autoregulation | 12 | 12 | broadest |
| 28 | upper_body_accessories | 12 | 11 | |
| 29 | ankle_mobility | 12 | 8 | |
| 30 | mobility_dosing | 12 | 7 | |

## Concentration: deload magnitude is one voice *within q4*

Question 4 filled its entire 12-passage budget, which in the table looks like
the strongest possible coverage. It is not. **All twelve passages are
Torokhtiy** — ten from a single article
(`torokhtiy.com/blogs/guides/what-is-a-deload-week-in-weightlifting`) and two
from another page on the same site.

Any deload claim resting on **q4 alone** must be attributed to Torokhtiy by
name, never phrased as what "coaches say."

### Correction, after reading the pack (2026-08-11)

The paragraph above originally continued: *"at best it can be checked against
one coach."* **That was wrong**, and the error is instructive enough to leave
visible rather than quietly delete.

It was inferred from q4's source count without reading q3 and q5, which retrieve
deload material too. Read whole, the pack holds a genuine **three-way
disagreement** on deload magnitude:

- **Torokhtiy** — cut both: weight by 40–60%, sets/reps from 5×5 to 2–3×3–5
  [E4.3, E3.9]; sample week at 40–50% of 1RM [E4.1, E3.1].
- **Catalyst / Mike Gray's back-off week** — keep load high, cut reps only; a
  reader notes exactly this contrast [E3.2].
- **Greg Everett** — a mild cut of both: weights 10–15%, volume 15–25% [E5.11].

The lesson generalizes: **per-question source counts detect concentration, but
they cannot detect a topic spread across several questions.** A decision-shaped
catalog deliberately asks about one decision from multiple angles, so evidence
for it accumulates across question files. Read the pack, not the manifest.

It is also a direct echo of the archived synthesis's failure. That document
asserted "deload every 4th week" in the same confident voice as claims that
were verbatim-accurate. Deload dosing is evidently a thin part of this corpus,
and it is exactly where an unsourced number slipped in last time.

## Thin questions, and how they relate to the known gaps

Five questions returned fewer passages than the budget allowed, meaning the
0.58 threshold cut in rather than the limit:

- **q2 `block_length` (4)** — four distinct sources, so thin but not narrow.
- **q22 `training_with_back_pain` (4)** — four distinct sources: three YouTube,
  one Torokhtiy mobility guide.
- **q6 `exercises_per_session` (6)**, **q23 `back_sparing_selection` (7)**,
  **q25 `hypertrophy_loading` (7)** — thin, reasonably diverse.

Against the three gaps previously confirmed in `master_synthesis.md` and
`STATUS.md`:

1. **Night-shift scheduling** — no question in this catalog asks it, by design.
   Scheduling is a fixed input to the rebuild, not a derived one, precisely
   because the corpus was already known not to cover it. Unchanged.
2. **Programming for a heavier athlete transitioning from strength sports** —
   likewise not asked; it is an athlete-specific question and the catalog is
   deliberately athlete-free. Unchanged.
3. **Return-to-load protocols for existing chronic back pain** — q22 is the
   closest probe. It *is* covered (4 passages, 4 sources), but coverage of
   "training around back pain" as a general topic is not the same as a
   return-to-load protocol. Whether the retrieved material actually answers the
   programming question is a judgment call deferred to the rebuild, where any
   shortfall becomes a `[JUDGMENT — NO COVERAGE]` tag rather than an invented
   protocol.

**No new gaps.** Nothing in the catalog came back empty, which is itself worth
recording: the previous 7-topic synthesis reached ~5% of the corpus, and a
decision-shaped catalog reaches every decision it asks about. The limitation
this pack exposes is not absence — it is **concentration**, which the old
topic-level view could not have shown at all.

## Reading this before the rebuild

- Passage count measures retrieval depth. Source count measures whether anyone
  agrees within that question. Cite the second.
- But source count is per-question, and a decision can be spread across several
  questions — deload evidence sits in q3, q4 and q5. **Read the files, not the
  table.** The table narrows where to look; it does not settle anything.
- Any claim resting on q4 alone is Torokhtiy's position, stated as his.
- Thin questions are not licences to fill from memory. A question that returned
  four passages answers what those four passages answer, and no more.
- Expect noise. q1 returned 12 passages of which ~5 are on topic (four are about
  choosing a coach); q2's four include competition banter. Retrieval clearing
  0.58 is not the same as a passage answering the question asked.
