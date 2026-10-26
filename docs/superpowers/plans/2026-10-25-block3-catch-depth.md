# Block 3 Catch-Depth Correction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rewrite Block 3's snatch and clean prescriptions so every full lift is climbed only as high as the athlete still catches low, with no power variants, paused snatch balances, tall-lift openers and segment deadlifts (Edit Ledger 12–18).

**Architecture:** All program data is in `docs/src/program.js` (`BLOCK3_EXERCISES`, `b3WaveWeek`, `PROGRAM_B3`, goal strings). One new entry constructor, `b3Low`, carries the low-catch rule. The existing `b3Sn` and `b3Cj` route through it, so most cards change without touching the week tables. Cues for the three newly used exercises go into `EXERCISE_CATALOG` in `docs/src/app.jsx`. No UI code changes: `ExCard` already renders an entry's `note`, and `TestLiftCard` renders its `label`.

**Tech Stack:** plain JS data plus a React/JSX app built by esbuild (`npm run build`). Tests use `node --test "tests/js/*.test.mjs"`, which loads `program.js` in a `vm` context.

**Spec:** `docs/superpowers/specs/2026-10-25-block3-catch-depth-design.md` (amends `docs/superpowers/specs/2026-10-17-block3-design.md`)

## Global Constraints

- No Catalyst source text in the repo, comments or commits. Provenance comments cite the Edit number ("Edit 12"), never source wording.
- Loads are computed from the live `TRAINING_MAX`. **Do not change `TRAINING_MAX`.**
- l1 rules: `l1 === l2`; it leads with a number; no `light`, `BW`, `band` or `cable` (checked by `checkL1` in `tests/js/block3.test.mjs`). `generateWeights` averages the first two numbers in l1 to build the weight dropdown.
- At most **6 cards per session**.
- Start weights: snatch **45 kg**, C&J **55 kg**, clean **55 kg**.
- Opener load: **20–25 kg**, 3 × 3.
- Segment deadlift: pause **2 s just below the knee and 2 s at mid-thigh**, shoulders over the bar, arms long. Same sets × reps × % as the pull it replaces.
- Version **v3.20.0 · 2026-10-25** (string in `docs/src/app.jsx`, then `npm run build`). Update CLAUDE.md's "Current version".
- Never `git add -A`. Never print or commit `docs/key.js` or anything under `program_sources/`.
- Every Block 3 exercise needs a catalog `desc` whose every line ends in a source (`tests/js/cues.test.mjs`).

## Review Focus

1. **The weight dropdown must reach both ends of a low-catch range.** `generateWeights` builds its list from the average of the first two numbers, spanning ×0.80 to ×1.30. For each `b3Low` card, the list must contain the start weight and the ceiling rounded to 2.5. Test in Task 1.
2. **A future TM change can push a ceiling to or below the start.** That card must switch to the fixed-weight form ("42 kg — low catches only"), never show a backwards range like "45–42 kg". Test in Task 1, using a lowered snatch TM.
3. **Renaming the week-23 test card labels must not break PR history or logging.** Before changing the labels, confirm `label` is read only by `TestLiftCard`'s header (grep `\.label` in `app.jsx`). Step in Task 1.
4. **The rule text must reach the athlete.** It lives in `note`, which `ExCard` shows only when the card is expanded. The UI check in Task 4 expands a wk 18 snatch card and asserts the note text is present.
5. **Old Block 2 test days must be unaffected.** Week 16's `test:true` cards share `B2_TEST_LADDER` and `TestLiftCard`. The full suite in each task's verify step covers week 16 (existing tests).

---

### Task 1: Low-catch rule (Edits 12 and 17)

**Files:**
- Modify: `docs/src/program.js` (helpers ~502–533; `BLOCK3_EXERCISES` weeks 17, 20 d4, 23 d1/d2/d4, 24 d1/d4)
- Test: `tests/js/block3.test.mjs`

**Interfaces:**
- Produces: `const B3_LOW_START = { snatch: 45, cleanAndJerk: 55, clean: 55 }`.
- Produces: `const B3_LOW_NOTE` (exact copy below).
- Produces: `b3Low(id, lift, sets, p, suffix = '', reps = '1')`, which returns a `b3e` entry plus `note: B3_LOW_NOTE`.
  - When `tm(lift, p) - B3_LOW_START[lift] >= 2.5`: `l1` is `` `${start}–${tm(lift,p)} kg — low catches only${suffix}` ``.
  - Otherwise `l1` is `` `${tm(lift,p)} kg — low catches only${suffix}` `` (no climb).
- Produces: `b3Sn(sets, p)` becomes `b3Low('snatch','snatch',sets,p)`, and `b3Cj(sets, p)` becomes `b3Low('clean_and_jerk','cleanAndJerk',sets,p,B3_SJ)`.
- Later tasks use `b3Low` for the block lifts (Task 2) and for week 24 Tue.

`B3_LOW_NOTE` (exact copy):
> Climb from the start weight in 2–3 kg jumps — warm-up, not logged. A single counts only if caught at or below parallel. Stop at the first high catch or at the ceiling, then do every work set at the last weight you caught low. Log only low catches. Film from the side.

- [ ] **Step 1: Write the failing tests** in `tests/js/block3.test.mjs`. Rewrite the existing assertions that pin the old format, and add the new tests.

```js
// replaces the snatch lines in "exact loads match the source percentages"
const sn = find(18, "d1", "snatch");
assert.equal(sn.l1, `45–${P.tm("snatch", 0.80)} kg — low catches only`);
assert.equal(sn.sets, 5); assert.equal(sn.reps, "1");
assert.match(sn.note, /caught at or below parallel/);
const sn19 = find(19, "d1", "snatch");
assert.equal(sn19.l1, `45–${P.tm("snatch", 0.90)} kg — low catches only`);
assert.equal(sn19.sets, 3);
assert.equal(find(18, "d1", "clean_and_jerk").l1, `55–${P.tm("cleanAndJerk", 0.80)} kg — low catches only — split jerk`);

// replaces the body of "a TM change propagates to Block 3 loads"
const P2 = loadProgram(SRC.replace("snatch: 70", "snatch: 75"));
assert.equal(P2.BLOCK3_EXERCISES[18].d1.find(e => e.id === "snatch").l1, "45–60 kg — low catches only");

test("ceiling under start + 2.5 drops the climb", () => {
  // wk17 Thu complex: 60% of 70 = 42 < 45; wk24 Mon snatch: 65% = 45.5
  assert.match(find(17, "d3", "snatch_ohs_complex").l1, /^42 kg — low catches only/);
  assert.match(find(24, "d1", "snatch").l1, /^45\.5 kg — low catches only/);
  assert.match(find(24, "d1", "clean_and_jerk").l1, /^51 kg — low catches only/);
  assert.match(find(17, "d4", "clean_fs_jerk_complex").l1, /^51 kg — low catches only/);
  const P3 = loadProgram(SRC.replace("snatch: 70", "snatch: 55"));
  for (const w of [18, 19, 21, 22]) {
    const l1 = P3.BLOCK3_EXERCISES[w].d1.find(e => e.id === "snatch").l1;
    const [a, b] = (l1.match(/^(\d+(?:\.\d+)?)–(\d+(?:\.\d+)?)/) || []).slice(1).map(Number);
    assert.ok(!(a >= b), `w${w} backwards range: ${l1}`);
  }
});

test("every wave-week snatch / C&J is a low-catch card", () => {
  for (const w of WAVE) for (const d of ["d1", "d2", "d4"]) for (const id of ["snatch", "clean_and_jerk"]) {
    const e = find(w, d, id);
    if (w === 23 && d === "d4") continue; // test card, checked below
    assert.ok(e && !e.test, `w${w} ${d} ${id}`);
    assert.match(e.l1, /low catches only/, `w${w} ${d} ${id}`);
  }
});

test("week 20 Saturday: low-catch checkpoint for the lifts, back squat max", () => {
  const d4 = day(20, "d4");
  assert.deepEqual([...d4.filter(e => e.test).map(e => e.id)], ["back_squat"]);
  for (const id of ["snatch", "clean_and_jerk"]) {
    const e = d4.find(x => x.id === id);
    assert.equal(e.sets, 1);
    assert.match(e.l1, new RegExp(`–${P.tm(TM_KEY[id], 0.95)} kg`));
  }
});

test("week 23 test labels say only low catches count", () => {
  for (const id of ["snatch", "clean_and_jerk"])
    assert.match(day(23, "d4").find(e => e.id === id).label, /low catches only/);
});

test("week 24 Saturday snatch / C&J: one single, ceiling 95%", () => {
  for (const id of ["snatch", "clean_and_jerk"]) {
    const e = find(24, "d4", id);
    assert.equal(e.sets, 1);
    assert.match(e.l1, new RegExp(`–${P.tm(TM_KEY[id], 0.95)} kg — low catches only`));
  }
});

// Review Focus 1 — evaluate app.jsx's generateWeights and check both ends are offered.
test("weight dropdown spans start and ceiling for every low-catch card", () => {
  const s = APP.indexOf("function generateWeights"), e = APP.indexOf("\n}\n", s) + 3;
  const gw = vm.runInContext(APP.slice(s, e) + ";generateWeights", vm.createContext({}));
  const r25 = x => Math.round(x / 2.5) * 2.5;
  for (const w of ALL) for (const d of daysOf(w)) for (const x of day(w, d)) {
    const m = !x.test && x.l1.match(/^(\d+(?:\.\d+)?)–(\d+(?:\.\d+)?) kg — low catches only/);
    if (!m) continue;
    const ws = gw(x.l1).weights;
    assert.ok(ws.includes(r25(+m[1])) && ws.includes(r25(+m[2])), `w${w} ${d} ${x.id}: ${x.l1} → ${ws[0]}..${ws.at(-1)}`);
  }
});
```

The existing test "week 20 Saturday tests snatch, C&J, back squat, then SLDL" is replaced by the week-20 test above. Delete it.

- [ ] **Step 2: Run the tests and confirm they fail**

Run: `node --test "tests/js/*.test.mjs"`
Expected: the new and rewritten tests FAIL. They see the old `56 kg` format and three test cards on wk 20 d4. Everything else passes.

- [ ] **Step 3: Implement `B3_LOW_START`, `B3_LOW_NOTE` and `b3Low` in `docs/src/program.js`, next to `b3Sn`/`b3Cj`, and point `b3Sn`/`b3Cj` at `b3Low`.** Then edit the cards that don't go through `b3Sn`/`b3Cj`. Each line gets an `// Edit 12` or `// Edit 17` provenance comment.
  - wk 17 d3 `snatch_ohs_complex`: `b3Low('snatch_ohs_complex','snatch',5,0.60,'','1+2')`. Task 2 appends the OHS pause.
  - wk 17 d4 `clean_fs_jerk_complex`: `b3Low('clean_fs_jerk_complex','clean',5,0.60,B3_SJ,'1+2+1')`.
  - wk 20 d4: replace the snatch and C&J `b3Test` cards with `b3Low(…,1,0.95,' — heaviest low catch today')`. The C&J card also gets `B3_SJ` before the suffix. Back squat stays `b3Test`.
  - wk 23 d1/d2: replace the explicit `kgr` range cards with `b3Sn(1, 0.95)`/`b3Cj(1, 0.95)` on d1 and `b3Sn(1, 0.90)`/`b3Cj(1, 0.90)` on d2. The ceiling is the top of the old range.
  - wk 23 d4: labels become `'Snatch — low catches only'` and `'Clean & Jerk — low catches only'`. First grep `\.label` in `docs/src/app.jsx` and confirm the only reader is the `TestLiftCard` header (Review Focus 3). If anything else reads it, stop and report.
  - wk 24 d1: `b3Sn(3, 0.65)` and `b3Cj(3, 0.60)` go through `b3Low` automatically.
  - wk 24 d4: the snatch and C&J `b3Heavy` cards become `b3Low(…,1,0.95,' — heaviest low catch today')`, with `B3_SJ` on the C&J. `front_squat` stays `b3Heavy`.

- [ ] **Step 4: Run the tests and confirm they pass**

Run: `node --test "tests/js/*.test.mjs"`
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add docs/src/program.js tests/js/block3.test.mjs
git commit -m "feat(block3): low-catch rule on every full snatch, clean and C&J (Edits 12, 17)"
```

---

### Task 2: Thursday changes: full lifts, paused balances, segment deadlifts (Edits 13, 14, 16)

**Files:**
- Modify: `docs/src/program.js` (helpers; `BLOCK3_EXERCISES` d3 of weeks 18–23, wk 17 d3, wk 24 d1/d2/d3)
- Modify: `docs/src/app.jsx` (`EXERCISE_CATALOG.clean_deadlift.desc`)
- Modify: `docs/programs/2026-10-18-block3-cues.md` (handles for the new cue)
- Test: `tests/js/block3.test.mjs`

**Interfaces:**
- Consumes: `b3Low(id, lift, sets, p, suffix, reps)` from Task 1.
- Produces these suffix constants:
  - `B3_FULL = " — every catch in a full squat"`
  - `B3_HIGH_BLOCKS = " · blocks at mid-thigh or higher"`
  - `B3_SB_CUE = " · slow dip, minimal leg drive, punch under fast, hold the bottom 2–3 s every rep"`
  - `B3_OHS_PAUSE = " · hold the bottom of each overhead squat 2–3 s"`
  - `B3_ARMS = " — arms long until the legs finish"`
- Produces: `b3Seg(grip, lift, sets, reps, p)`, where `grip` is `'snatch'` or `'clean'`. It returns `b3e(grip === 'snatch' ? 'snatch_deadlift' : 'clean_deadlift', sets, reps, kg(lift, p) + B3_SEG)`, with `B3_SEG = " — segment: pause 2 s just below the knee and 2 s at mid-thigh, shoulders over the bar, arms long"`.

- [ ] **Step 1: Write the failing tests**

```js
test("no power snatch or power clean anywhere in weeks 17-24", () => {
  const banned = ["power_snatch", "power_clean", "power_clean_power_jerk"];
  for (const w of ALL) for (const d of daysOf(w))
    assert.ok(!ids(w, d).some(i => banned.includes(i)), `w${w} ${d}: ${ids(w, d)}`);
});

test("power swaps: high-block lifts on Thursday, full lifts in week 24", () => {
  const sfb = find(20, "d3", "snatch_from_blocks");
  assert.equal(sfb.sets, 5); assert.equal(sfb.reps, "2");
  assert.match(sfb.l1, new RegExp(`^45–${P.tm("snatch", 0.75)} kg — low catches only.*mid-thigh or higher`));
  assert.match(find(23, "d3", "clean_from_blocks").l1, new RegExp(`^55–${P.tm("clean", 0.75)} kg — low catches only.*mid-thigh or higher`));
  assert.match(find(24, "d2", "snatch").l1, new RegExp(`^45–${P.tm("snatch", 0.70)} kg — low catches only`));
  const cj = find(24, "d2", "clean_and_jerk");
  assert.equal(cj.reps, "1+1"); assert.match(cj.l1, /power jerk/);
});

test("positional lifts are caught in a full squat", () => {
  const pos = ["three_position_snatch", "three_position_clean", "snatch_from_blocks", "clean_from_blocks", "two_position_snatch", "two_position_clean"];
  for (const w of ALL) for (const d of daysOf(w)) for (const e of day(w, d))
    if (pos.includes(e.id) && !/low catches only/.test(e.l1)) assert.match(e.l1, /every catch in a full squat/, `w${w} ${d} ${e.id}`);
});

test("every snatch balance and overhead squat carries the pause", () => {
  for (const w of ALL) for (const d of daysOf(w)) for (const e of day(w, d)) {
    if (e.id === "snatch_balance") assert.match(e.l1, /hold the bottom 2–3 s every rep/, `w${w} ${d}`);
    if (e.id === "overhead_squat" || e.id === "snatch_ohs_complex") assert.match(e.l1, /hold the bottom of each overhead squat 2–3 s/, `w${w} ${d} ${e.id}`);
  }
});

test("Thursday pulls are segment deadlifts at the old pull loads", () => {
  assert.equal(find(18, "d3", "snatch_deadlift").l1.split(" ")[0], String(P.tm("snatch", 0.85)));
  const cd = find(19, "d3", "clean_deadlift");
  assert.equal(cd.sets, 5); assert.equal(cd.reps, "4");
  assert.ok(cd.l1.startsWith(String(P.tm("clean", 0.90))), cd.l1);
  for (const w of WAVE) assert.ok(!ids(w, "d3").some(i => i === "snatch_pull" || i === "clean_pull"), `w${w}`);
  assert.match(find(17, "d3", "snatch_pull").l1, /arms long until the legs finish/);
  assert.match(find(24, "d1", "snatch_pull").l1, /arms long until the legs finish/);
});
```

Also update the existing tests:
- "thursday alternation": `snatch_pull` becomes `snatch_deadlift`, and `clean_pull` becomes `clean_deadlift`.
- "exact loads": its `clean_pull` line becomes `clean_deadlift`.

- [ ] **Step 2: Run the tests and confirm they fail**

Run: `node --test "tests/js/*.test.mjs"`
Expected: the five new tests and the two updated ones FAIL. Task 1's tests still pass.

- [ ] **Step 3: Implement the constants and `b3Seg`, then edit the cards.** Each edit gets an `// Edit 13`, `// Edit 14` or `// Edit 16` comment.
  - **Edit 13:**
    - wk 20 d3 `power_snatch` → `b3Low('snatch_from_blocks','snatch',5,0.75,B3_HIGH_BLOCKS,'2')`.
    - wk 23 d3 `power_clean` → `b3Low('clean_from_blocks','clean',5,0.75,B3_HIGH_BLOCKS,'2')`.
    - wk 24 d2 `power_snatch` → `b3Low('snatch','snatch',3,0.70)`.
    - wk 24 d2 `power_clean_power_jerk` → `b3Low('clean_and_jerk','clean',3,0.70,' — power jerk','1+1')`.
    - Existing positional cards (wk 18 three_position_snatch, wk 19 clean_from_blocks, wk 21 three_position_clean, wk 22 snatch_from_blocks, wk 24 two_position_snatch/clean) append `B3_FULL`. The two block cards also append `B3_HIGH_BLOCKS`.
  - **Edit 14:**
    - `b3SbThen` and `b3SbMax` append `B3_SB_CUE` to their l1.
    - wk 17 d3 `snatch_ohs_complex` and wk 24 d2 `overhead_squat` append `B3_OHS_PAUSE`.
  - **Edit 16:**
    - Weeks 18–23 d3 pulls → `b3Seg`, keeping each card's sets, reps and %. Snatch weeks use `('snatch','snatch',…)`; clean weeks use `('clean','clean',…)`.
    - wk 17 d3 and wk 24 d1 `snatch_pull` append `B3_ARMS`.

- [ ] **Step 4: Add the `clean_deadlift` cue.** Use the `olytracker-exercise-cues` skill (load it first). Write `EXERCISE_CATALOG.clean_deadlift.desc` from these saved passages (the corpus may be offline; use these handles):
  - "Arms bending early is mostly a strength problem: getting the bar to mid/high thigh with the shoulders still over it. Halting and segment deadlifts build it. [E104.7]"
  - "Pause at mid-thigh, where the final explosion starts; hold the position, don't drift back. [E105.8]"

  Record both lines and their handles in `docs/programs/2026-10-18-block3-cues.md`, in that doc's existing format. Then run the skill's citation check against `evidence/2026-10-18-cues`.
  Run: `python -m tools.check_citations docs/programs/2026-10-18-block3-cues.md evidence/2026-10-18-cues`
  Expected: no failures for the new lines.

- [ ] **Step 5: Run the tests and confirm they pass**

Run: `node --test "tests/js/*.test.mjs"`
Expected: all PASS, including `cues.test.mjs`, which now sees `clean_deadlift` in Block 3.

- [ ] **Step 6: Commit**

```bash
git add docs/src/program.js docs/src/app.jsx docs/programs/2026-10-18-block3-cues.md tests/js/block3.test.mjs
git commit -m "feat(block3): no power variants, paused snatch balance, segment deadlifts (Edits 13, 14, 16)"
```

---

### Task 3: Tall-lift openers (Edit 15)

**Files:**
- Modify: `docs/src/program.js` (`BLOCK3_EXERCISES` d1/d2/d4 of weeks 18–23)
- Modify: `docs/src/app.jsx` (`EXERCISE_CATALOG.tall_snatch.desc`, `.tall_clean.desc`)
- Modify: `docs/programs/2026-10-18-block3-cues.md`
- Test: `tests/js/block3.test.mjs`

**Interfaces:**
- Produces: `b3Tall(id)`, which returns `b3e(id, 3, '3', '20–25 kg — never worked heavy')`. The entry is always first in its day.

- [ ] **Step 1: Write the failing test**

```js
test("tall-lift opener first on non-test classic days", () => {
  const want = { d1: () => "tall_snatch", d2: () => "tall_clean",
                 d4: w => ({ 18: "tall_snatch", 22: "tall_snatch", 19: "tall_clean", 21: "tall_clean" })[w] };
  for (const w of WAVE) for (const d of ["d1", "d2", "d4"]) {
    const exp = want[d](w);
    if (!exp) { assert.ok(!ids(w, d).some(i => i.startsWith("tall_")), `w${w} ${d} test day has an opener`); continue; }
    assert.equal(ids(w, d)[0], exp, `w${w} ${d}`);
    assert.equal(day(w, d)[0].l1, "20–25 kg — never worked heavy");
  }
});
```

- [ ] **Step 2: Run the tests and confirm they fail**

Run: `node --test "tests/js/*.test.mjs"`
Expected: the new test FAILS (no openers).

- [ ] **Step 3: Prepend `b3Tall(...)` to each listed day**, per the test's table, each with an `// Edit 15` comment. The existing card-limit test enforces ≤ 6 cards.

- [ ] **Step 4: Write the `tall_snatch` and `tall_clean` cues** using the `olytracker-exercise-cues` skill.
  - `tall_snatch`:
    - "Trains the pull under the bar, used for lifters who won't receive low at heavier weights. [E106.12]"
    - "Keep it light, about 25–30%, and never work up to a heavy single. [E17.6]"
  - `tall_clean`:
    - "Keep it light, about 25–30%, and never work up to a heavy single. [E17.6]"

  Record them in `docs/programs/2026-10-18-block3-cues.md`. **E17.6 lives in `evidence/2026-08-12/q17-pull_loading.md`, not in the cues pack.** Run the citation check against both packs:
  Run: `python -m tools.check_citations docs/programs/2026-10-18-block3-cues.md evidence/2026-10-18-cues` and `python -m tools.check_citations docs/programs/2026-10-18-block3-cues.md evidence/2026-08-12`
  Expected: every new line verifies in one of the two runs. If the tool can only check one pack per document, note in the doc that E17.6 is from the 2026-08-12 pack, rather than copying the passage across.

- [ ] **Step 5: Run the tests and confirm they pass**

Run: `node --test "tests/js/*.test.mjs"`
Expected: all PASS (including `cues.test.mjs` for `tall_snatch` and `tall_clean`).

- [ ] **Step 6: Commit**

```bash
git add docs/src/program.js docs/src/app.jsx docs/programs/2026-10-18-block3-cues.md tests/js/block3.test.mjs
git commit -m "feat(block3): tall snatch / tall clean openers (Edit 15)"
```

---

### Task 4: Week plans, goals, docs, version, verify, ship (Edit 18 and goal changes)

**Files:**
- Modify: `docs/src/program.js` (`b3WaveWeek`, `PROGRAM_B3` week 17/24 notes, the Block 3 goal strings at ~767/771)
- Modify: `docs/src/app.jsx` (version string), then `npm run build` (regenerates `docs/app.js` and `docs/program.js`)
- Modify: `docs/superpowers/specs/2026-10-17-block3-design.md` (Goals table, plus Edit Ledger rows 12–18 pointing to the catch-depth spec)
- Modify: `CLAUDE.md` (current version; the Estimated Training Maxes paragraph's goals sentence)
- Modify: `STATUS.md` (phase / next_step)
- Test: `tests/js/block3.test.mjs`

- [ ] **Step 1: Write the failing tests**

```js
test("week plans: film note every week, low-catch wording on classic days", () => {
  for (const w of ALL) assert.match(P.PROGRAM_B3[w - 17].note, /[Ff]ilm snatches and cleans from the side/, `w${w}`);
  assert.match(P.weekPlan(18).days[0].primary, /low catches only/);
  assert.match(P.weekPlan(20).days[3].primary, /caught low/);
});

test("goal strings: 70 / 85 caught low", () => {
  assert.match(SRC, /goal:"Snatch 70 · C&J 85 caught low · back squat 140 · front squat 125 \(week-23 test\)"/);
  assert.match(SRC, /text:"Goals met: snatch 70 · C&J 85 caught low · back squat 140 · front squat 125"/);
});
```

- [ ] **Step 2: Run the tests and confirm they fail**

Run: `node --test "tests/js/*.test.mjs"`
Expected: both new tests FAIL.

- [ ] **Step 3: Implement**
  - **Film note:** add one constant `B3_FILM = "Film snatches and cleans from the side — catch depth and arm bend are judged on video, not by feel. "` and prepend it to every Block 3 week `note` (`b3WaveWeek`, and weeks 17 and 24).
  - **Classic-day primaries:** in `b3WaveWeek`, the d1/d2/d4 `primary` for non-test days reads `` `Snatch + C&J — low catches only, ceiling ${pct} ${w.single}` ``.
  - **Test-week Saturdays:**
    - Week 20 Sat `primary`: `"CHECKPOINT — heaviest snatch and C&J caught low · back squat max"`, and its note says the snatch and C&J are the heaviest low catch for today.
    - Week 23 Sat note adds: only low catches count; stop the climb at the first high catch.
  - **Goal strings:** set them to the exact copy in the test.
  - **Version:** `PROGRAM v3.20.0 · 2026-10-25` in `docs/src/app.jsx`.
  - **Docs:**
    - Block 3 design: Goals table snatch `~~75~~ → **70 caught low**`, C&J `~~90~~ → **85 caught low**`, plus a dated note. Add ledger rows 12–18, one line each, naming the edit and "see `2026-10-25-block3-catch-depth-design.md`".
    - CLAUDE.md: current version v3.20.0, and the goals sentence ("…raised them to snatch 75 · C&J 90…") followed by "then, after the athlete reported high catches and early arm bend, reset to 70 / 85 caught in a full squat (2026-10-25)".
    - STATUS.md: phase and next_step reflect the catch-depth change.

- [ ] **Step 4: Build and run the full suite**

Run: `npm run build && node --test "tests/js/*.test.mjs"`
Expected: build succeeds; all tests PASS.

- [ ] **Step 5: Verify the rendered app** with the `olytracker-ui-verify` skill. It runs against a neutered copy, so nothing writes to live Supabase. Check:
  - **Week 18 D1:** 5 cards, `tall_snatch` first.
  - **Expanding the snatch card** shows "caught at or below parallel" (Review Focus 4), and the dropdown offers 45 and 56.
  - **Week 20 D3:** shows Snatch from Blocks, not Power Snatch.
  - **Week 20 D4:** one TestLiftCard (back squat) plus two normal cards.
  - **Week 23 D4:** TestLiftCard header reads "Snatch — low catches only".
  - **Header:** reads v3.20.0.
  - **Console:** no errors.

  Expected: every check passes. Report any that fail; don't change the plan's values to make them pass.

- [ ] **Step 6: Commit and push**

```bash
git add docs/src/program.js docs/src/app.jsx docs/app.js docs/program.js tests/js/block3.test.mjs docs/superpowers/specs/2026-10-17-block3-design.md CLAUDE.md STATUS.md
git commit -m "feat(block3): catch-depth week plans, goals 70/85 caught low (v3.20.0)"
git push
```

Expected: push succeeds. Check the Pages deploy run finishes green (`gh run list --limit 1`).
