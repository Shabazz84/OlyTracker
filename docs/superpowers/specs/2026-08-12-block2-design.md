# Block 2 — Technique Consolidation: Design Spec

**Date:** 2026-08-12
**Status:** approved, ready for implementation planning

Block 2 currently exists as eight one-line rows in `PROGRAM_OUTLINE`
(`docs/src/app.jsx:416`), written before the corpus could be queried by
decision. This spec replaces them with an evidence-cited block that ships into
the app.

---

## Why now

Block 1's evidence rebuild (2026-08-11) is merged but unapplied — deliberately,
because the athlete is finishing weeks 7–8 as written. Block 2 is the first
block that can be *built* from the corpus rather than corrected against it, and
it is the natural place to land Block 1's findings.

The rebuild's own verdict sets the expectation:

> the corpus can shape exercise selection, rep ranges, intensity zones, and
> progression *logic*; it cannot schedule around night shifts or manage a
> painful back.

Roughly two-thirds of a block is evidence-driven. The uncoverable third clusters
around shift work, back pain, and individual loading. This spec plans for that
split rather than pretending it away.

---

## Decisions taken (settled before design)

| Decision | Choice | Rationale |
|---|---|---|
| Evidence source | **New Block-2 questions appended to the existing catalog**, whole pack regenerated | The existing 30 were shaped around Block 1's decisions and never ask about floor lifting, intensification, or ATW |
| Deliverable | **Cited document, then shipped to the app** | Athlete needs a trainable block in ~2 weeks when Block 1 ends |
| Training week | **Mon/Tue/Thu/Sat**, school term, 4 days | Cited [E8.12] as fitting these exact shifts; satisfies "never more than two days in a row" [E8.9] |
| Block shape | **8 weeks — 6 loading (wks 9–14), 1 back-off (wk 15), 1 test (wk 16)** | Amateurs run 8 or 12 week blocks [E1.12]; shorter end indicated because this athlete can still PR frequently [E2.1]; roll straight in, no off-weeks [E1.12] |
| Block 1 carryovers | **All four accepted** — OHS dosing, back-squat primacy, pain gate, jerk/snatch fixes | See "Carryovers" below |
| Architecture | **A + citation manifest** — one catalog, one pack, one handle namespace, plus a committed per-passage manifest | Recurring decisions get answered once and cited by both blocks; the manifest closes STATUS open item 2 |

### The schedule inconsistency this settles

The school-term week was written three different ways in the repo:

- `CLAUDE.md` — Mon/Tue/Wed/Fri
- `docs/src/app.jsx:295` (`DAYS_SCHOOL`) — Mon/Tue/Wed/Sat
- `docs/src/app.jsx:1018` (on-screen note) — Mon/Tue/Wed/Thu

None satisfies [E8.9]. All three are corrected to **Mon/Tue/Thu/Sat**.

---

## 1. Evidence layer

### New questions — q31–q42

Appended to `synthesis/questions.py`. The existing 30 are untouched, so their
handles keep meaning the same thing and the recurring decisions (deload,
testing, squat, pulls, trunk, mobility) are cited by both block documents.

| # | key | Decision it settles |
|---|-----|---|
| 31 | `full_vs_power` | When a lifter moves from power variations to the full (squat) snatch and clean |
| 32 | `start_position_floor` | Setup and first-pull mechanics from the floor |
| 33 | `lead_up_exercises` | What precedes the competition lift in a session (Berestov's подводящие) |
| 34 | `load_distribution` | How training time distributes across intensity zones |
| 35 | `average_training_weight` | ATW as a metric — how it is tracked and raised |
| 36 | `accumulation_vs_intensification` | How volume and intensity trade off across a block |
| 37 | `technique_under_load` | What happens to technique as load climbs |
| 38 | `missed_attempts` | Handling misses — retry, drop, or end the session |
| 39 | `warmup_to_max` | Warm-up ramp to a working or maximal single |
| 40 | `accessory_volume_intensification` | Whether accessories get cut as intensity rises |
| 41 | `block_transition` | What changes when rolling from one block into the next |
| 42 | `second_pull_timing` | Timing and extension of the second pull |

Every question asks what **coaches say**. None mentions the athlete —
`tests/test_synthesis_questions.py` enforces this.

### Citation manifest

`synthesis/evidence.py::build_manifest` gains a per-passage record:

```
{ "handle": "E31.4", "note_path": "...", "source": "https://...",
  "score": 0.64, "sha256": "..." }
```

Written as `citations.json` in the pack directory, committed via a
`!evidence/*/citations.json` negation in `.gitignore`.

**Hash, not quote.** The hash proves `E31.4` is the same passage on a later run
without committing transcript text, so CLAUDE.md's rule holds. Human-readable
auditing comes from the document, which quotes verbatim inline the way the
Block 1 rebuild does. A ~15-word locator quote per passage would read better but
puts transcript text in git, and is rejected for that reason.

This closes STATUS.md open item 2: retrieval reorders near-tied results between
runs, so a bare citation number has not been auditable after the fact.

### Regeneration

`python main.py evidence` → `evidence/2026-08-12/`, all 42 questions, retrieval
only, no LLM call. Requires the Z840 (Qdrant + Ollama); exits 3 if unreachable.

The 2026-08-11 pack stays in place and the Block 1 document keeps citing it,
with a note recording that its handles predate the manifest and are therefore
not independently verifiable. That is the honest state, not a defect introduced
here.

**Handles in this spec are provisional.** Every `E*.n` quoted above comes from
the 2026-08-11 pack. Regeneration reorders near-tied passages, so a handle may
point at different text in `evidence/2026-08-12/`. Implementation must re-resolve
each one against the new pack before the document repeats it, and
`tools.check_citations` is what proves it. This spec's handles locate the
argument; they do not license it.

---

## 2. The Block 2 document

`docs/programs/2026-08-12-block2.md`. Every prescription carries either a
citation handle resolving to `evidence/2026-08-12/`, or **[JUDGMENT — NO
COVERAGE]**. There is no third category.

### Structure

1. **Fixed inputs** — TMs, schedule, back pain. Flagged **provisional**: the
   week-8 test rewrites the TMs, so percentages are primary and kilos are
   illustrative at current TMs.
2. **Entry gate** — Block 2 is entered on the hang:floor relationship
   [E9.5, E9.7], not on a calendar date, with an explicit branch for what to do
   if the week-8 test says the athlete is not there yet.
3. **The floor transition** — the block's central thesis and the one place the
   corpus states something close to a protocol: hang work drops to 3–4 × 2 at
   super-light loads while the full lift takes over [E8.8]; hang caps at ~90% of
   the floor lift [E9.5]; the crutch and psychological-barrier risk [E8.5,
   E9.5]; pause > hang > blocks for technical correction [E9.2].
4. **Block architecture** — 8 weeks, 6 loading + 1 back-off + 1 test, rolling
   straight in from Block 1 [E1.12, E2.1]. Accumulation → intensification split
   per q36. Back-off depth restated as **Everett's position, attributed by
   name** [E5.11] — the corpus holds a genuine three-way split (Torokhtiy
   [E4.3, E3.9], Catalyst [E3.2], Everett [E5.11]) and the document must not
   launder that into consensus.
5. **Per-decision prescriptions** — squat, pulls, overhead, jerk, trunk,
   accessories, mobility. Each cited or tagged.
6. **Carryovers from Block 1** — see below.
7. **Day-by-day session template** — 4 days, Mon/Tue/Thu/Sat, slot table per day.
8. **Week-by-week loading table** — 8 rows × 4 days, percentages of TM.
9. **Judgment ledger** — every decision the corpus could not make.

### Carryovers

Each shown as *what the live program does now → what changes in Block 2 → why*.

| Carryover | Change |
|---|---|
| **OHS dosing** | Live: 4 days/wk, 11–12 sets, standalone in D1's primary slot. Sources: 1–2×/wk, 5–7 sets of 2–3, never standalone [E10.8]; heavy OHS steals recovery from snatch and jerk [E10.5]. The live volume was added in v3.5.2–3.5.6 on `master_synthesis.md`'s advice, contradicted by the sources it was built from |
| **Back squat primary ~2:1** | Back squat primary [E18.3, E18.5], front squat as one quality session. The athlete's ~98% front:back ratio against an 85–90% norm [E18.7] says the back squat has the room. The athlete's ≥3×/wk heavy squat tolerance override (2026-08-11) stands and is recorded as an override, not as evidence |
| **Pain gate** | "Back pain >3/10 → drop load ~40%" cites nothing in the corpus — the same shape as the archived synthesis's invented rule. Removed as a coaching prescription. If retained, it is labelled as the athlete's own rule, with the note that managing chronic back pain under load needs a clinician |
| **Jerk + snatch fixes** | Daily empty-bar split jerk practice [E14.4]; jerk-drive/dip work [E15.11]; snatch-balance target of best snatch +10–15 kg [E10.3]; overhead-mobility safety screen before any behind-neck pressing [E30.12] |

### The diff

`docs/programs/2026-08-12-block2-diff.md`. The eight `PROGRAM_OUTLINE` rows were
written pre-evidence, which makes them a **pre-registered prediction**. Diffing
the cited block against them measures whether pre-evidence planning was any
good — the same test that caught the OHS error in Block 1.

---

## 3. App layer

### A live bug this must fix first

`docs/src/app.jsx:2046` computes `blockWeek` / `blockTotal` / `blockName` from
`programWeek<=6 ? … : programWeek<=10 ? …` — a stale 6-week-Block-1 /
4-week-Block-2 model. `PROGRAM_B1` has eight weeks. At program week 7–8 the
dashboard therefore reads *"W1/4 · Block · TECHNIQUE"* while the athlete is
still finishing Block 1. Block 2 cannot be added on top of this.

### Changes

**Extract program data to `docs/src/program.js`.** `app.jsx` is 5,017 lines and
adding an 8×4 block makes it worse. `PROGRAM_B1`, `PROGRAM_B2`,
`PROGRAM_OUTLINE`, `BLOCKS`, `DAYS_SUMMER`, `DAYS_SCHOOL`, `BLOCK_COLORS` and
`PHASE_COLORS` move to one module that exports them; `app.jsx` imports. esbuild
already bundles, so the shape of `docs/app.js` is unchanged. This lands as its
own commit — a pure move, so the Block 2 addition diffs cleanly.

**Add `TRAINING_MAX`.** Block 1's loads are hardcoded kilos across 40 day
strings. Block 2's loads depend on the week-8 test, so `PROGRAM_B2` stores
percentages against a `TRAINING_MAX` object and renders kilos. Updating TMs
after the test becomes a one-line edit. Block 1's existing strings are left
alone — out of scope.

**`PROGRAM_B2`** — 8 weeks × 4 days (`d1` Mon, `d2` Tue, `d3` Thu, `d4` Sat),
same day-object shape as `PROGRAM_B1` so every existing consumer works
unchanged.

**Week routing.** `viewWeek <= 8 ? PROGRAM_B1[…] : PROGRAM_OUTLINE.find(…)`
becomes a `weekPlan(week)` function: 1–8 → B1, 9–16 → B2, 17–28 → outline. The
eight superseded outline rows (weeks 9–16) are deleted.

**Block progress.** `blockWeek` / `blockTotal` / `blockName` derive from the
same block boundaries `weekPlan` uses, rather than from separate inline
literals.

**School/summer.** `DAYS_SCHOOL` corrected to Mon/Tue/Thu/Sat. `CLAUDE.md` and
the on-screen note at `app.jsx:1018` corrected to match. The
`days.filter(d => d.id !== "d5")` school filter is **scoped to Block 1 only** —
Block 2 is authored natively as four days, and filtering it would silently
delete Saturday.

**`BLOCKS[1]` advancement criteria** rewritten from the evidence. The current
ones (`OHS ≥ 65 kg`, `jerk gap ≤ 10 kg`) are unsourced numbers of exactly the
shape this project exists to catch.

**Version bump** to `v3.6.0 · 2026-08-12` in `docs/src/app.jsx`, then
`npm run build`. `CLAUDE.md`'s claim that the current version is `v3.3.2` is
stale — it is `v3.5.8` — and is corrected in the same pass.

---

## 4. Verification

### Python

- `tests/test_synthesis_questions.py::test_catalog_has_thirty_questions`
  **will fail** — it asserts exactly 30. Updated to 42. The contiguous-ids,
  unique-keys, filename-safe, no-athlete-mention and asks-what-coaches-say
  assertions extend to q31–q42 automatically.
- `tests/test_no_athlete_context_leak.py` scans the repo for the athlete
  profile's markers. The Block 2 document carries athlete-specific application
  exactly as the Block 1 rebuild does; commit `87ea544` already allowlisted that
  path. The new document goes in the same allowance — reviewed deliberately, not
  by reflexively widening the pattern.
- New `tests/test_synthesis_evidence.py` cases: every passage record carries a
  handle, source, score and hash; the hash is stable for identical text;
  `citations.json` is written next to `manifest.json`.
- `git check-ignore -v evidence/2026-08-12/citations.json` confirms the
  `.gitignore` negation actually works.

### Citations

`python -m tools.check_citations docs/programs/2026-08-12-block2.md evidence/2026-08-12`
must resolve every handle in both the document and the diff. **Zero unresolved
is the gate on the document being done.** In Block 1 this caught a real error on
its first run.

### App

- `npm run build` succeeds and `docs/app.js` carries `v3.6.0`.
- The program-extraction commit is verified as a pure move: no semantic change
  in the build output beyond the version string.
- `visual-verify` on the Week Plan — render weeks 8, 9, 12, 16 and 17 to confirm
  B1 → B2 → outline routing, that Block 2 shows four days in both summer and
  school mode, and that BLOCK PROGRESS reads correctly at weeks 7, 9 and 16.

### Failure modes

- **Z840 down** — `main.py evidence` exits 3. The document is blocked and there
  is no fallback to writing it from memory. Work stops at the
  questions-and-tests commit and resumes when the box is up.
- **Covered but unanswered** — the Block 1 pack had this (q1 returned 12
  passages, ~5 on topic). Coverage is not an answer. Anything returning passages
  without usable material becomes a judgment tag, never a filled gap.
- **The week-8 test has not happened yet.** Block 2's kilos rest on TMs that
  change in ~2 weeks. This is why loads are percentages against `TRAINING_MAX`:
  the block ships trainable and takes one TM edit after the test.

---

## Out of scope

- Applying Block 1's corrections to the **live** Block 1 weeks 7–8. The athlete
  finishes those as written; the corrections land in Block 2.
- Rewriting Block 1's hardcoded kilo strings to percentages.
- Blocks 3 and 4 — `PROGRAM_OUTLINE` rows 17–28 stay as they are.
- The Telegram token rotation, Brain_Dump deploy drift, and the `last-man.org`
  corpus purge (STATUS open items, tracked separately).
