// Run: node --test "tests/js/*.test.mjs"
// Loads docs/src/program.js as the browser would (a classic script of page
// globals) and checks Block 3's invariants from
// docs/superpowers/specs/2026-10-17-block3-design.md directly on the data.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const SRC = readFileSync(new URL("../../docs/src/program.js", import.meta.url), "utf8");
const APP = readFileSync(new URL("../../docs/src/app.jsx", import.meta.url), "utf8");

// Top-level const/function declarations are not context properties, so the
// script's last expression hands them back explicitly.
function loadProgram(src = SRC) {
  const ctx = vm.createContext({ console });
  return vm.runInContext(src + `
;({TRAINING_MAX, B2_TEST_LADDER, PROGRAM_B3, weekPlan, completionDayIds, tm,
   planDayForLog: typeof planDayForLog !== "undefined" ? planDayForLog : null,
   BLOCK3_EXERCISES: typeof BLOCK3_EXERCISES !== "undefined" ? BLOCK3_EXERCISES : null})`, ctx);
}

const P = loadProgram();
const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);

test("clean and snatchBalance TMs", () => {
  assert.equal(P.TRAINING_MAX.clean, 80);
  assert.equal(P.TRAINING_MAX.snatchBalance, 60);
});

test("ladder lives in program.js", () => {
  assert.deepEqual([...P.B2_TEST_LADDER], [0.50, 0.60, 0.70, 0.80, 0.85, 0.90, 0.95]);
});

test("block 3 routes to PROGRAM_B3", () => {
  for (const w of range(17, 24)) assert.equal(P.weekPlan(w)?.week, w, `week ${w}`);
});

test("week 17 is three sessions, the first on Wednesday", () => {
  const days = P.weekPlan(17).days;
  assert.deepEqual([...days.map(d => d.id)], ["d1", "d3", "d4"]);
  assert.match(days[0].label, /Wed/);
  // inferDaysFromLogs maps a logged session to a day by the label's first digit.
  for (const d of days) assert.equal(`d${d.label.match(/(\d+)/)[1]}`, d.id);
});

test("weeks 18-24 are four sessions", () => {
  for (const w of range(18, 24))
    assert.deepEqual([...P.weekPlan(w).days.map(d => d.id)], ["d1", "d2", "d3", "d4"], `week ${w}`);
});

test("completionDayIds follows the week's own days", () => {
  assert.deepEqual([...P.completionDayIds(17)], ["d1", "d3", "d4"]);
  assert.deepEqual([...P.completionDayIds(12)], ["d1", "d2", "d3", "d4"]);
  assert.deepEqual([...P.completionDayIds(3)], ["d1", "d2", "d3", "d4"]);
});

test("every Block 3 week credits the source", () => {
  for (const w of range(17, 24))
    assert.match(P.PROGRAM_B3[w - 17].note,
      /catalystathletics\.com\/olympic-weightlifting-training-program\/34\/General-Cycle/, `week ${w}`);
});

// ── Task 2: weeks 18-23 per-exercise entries ──────────────────────────────────
const E = P.BLOCK3_EXERCISES;
const day = (w, d) => (E?.[w]?.[d] || []);
const ids = (w, d) => day(w, d).map(e => e.id);
const find = (w, d, id) => day(w, d).find(e => e.id === id);
const WAVE = range(18, 23);
const SQUATS = ["back_squat", "front_squat", "pause_back_squat"];

test("BLOCK3_EXERCISES exists", () => assert.ok(E, "BLOCK3_EXERCISES is not defined"));

test("card limit: no session over 6 cards", () => {
  for (const w of WAVE) for (const d of ["d1", "d2", "d3", "d4"]) {
    assert.ok(day(w, d).length > 0, `w${w} ${d} empty`);
    assert.ok(day(w, d).length <= 6, `w${w} ${d} has ${day(w, d).length}`);
  }
});

test("squat placement: Mon back, Thu front, Sat paused back, none Tue", () => {
  for (const w of WAVE) {
    assert.ok(ids(w, "d1").includes("back_squat"), `w${w} d1`);
    assert.ok(ids(w, "d3").includes("front_squat"), `w${w} d3`);
    assert.ok(ids(w, "d4").some(i => i === "pause_back_squat" || i === "back_squat"), `w${w} d4`);
    assert.ok(!ids(w, "d2").some(i => SQUATS.includes(i)), `w${w} d2 has a squat`);
  }
});

test("thursday alternation: snatch weeks 18/20/22, clean weeks 19/21/23", () => {
  for (const w of WAVE) {
    const snatchWeek = (w - 17) % 2 === 1;
    assert.equal(ids(w, "d3").includes("snatch_pull"), snatchWeek, `w${w} snatch_pull`);
    assert.equal(ids(w, "d3").includes("clean_pull"), !snatchWeek, `w${w} clean_pull`);
    assert.ok(ids(w, "d3").includes("snatch_balance"), `w${w} snatch_balance`);
    const jerks = ids(w, "d3").filter(i => ["split_jerk_from_rack", "power_jerk", "power_split_jerk_combo"].includes(i));
    assert.equal(jerks.length, 1, `w${w} jerk variants: ${jerks}`);
  }
});

// generateWeights() averages the first two numbers in l1 and bails on these words.
function checkL1(w, d, e) {
  assert.equal(e.l1, e.l2, `w${w} ${d} ${e.id} l1 !== l2`);
  assert.ok(!/light|\bBW\b|band|cable/i.test(e.l1), `w${w} ${d} ${e.id}: banned word in "${e.l1}"`);
  assert.ok(/^\d/.test(e.l1) || e.l1 === "Bodyweight" || /^\d+ ?(sec|min)/.test(e.l1),
    `w${w} ${d} ${e.id}: l1 must lead with kg: "${e.l1}"`);
}
test("l1 leads with kg (weeks 18-23)", () => {
  for (const w of WAVE) for (const d of ["d1", "d2", "d3", "d4"])
    for (const e of day(w, d)) if (!e.test) checkL1(w, d, e);
});

test("exact loads match the source percentages", () => {
  const sn = find(18, "d1", "snatch");
  assert.ok(sn.l1.startsWith(String(P.tm("snatch", 0.80))), sn.l1);
  assert.equal(sn.sets, 5); assert.equal(sn.reps, "1");
  const bs = find(18, "d1", "back_squat");
  assert.ok(bs.l1.startsWith(String(P.tm("backSquat", 0.75))), bs.l1);
  assert.equal(bs.sets, 5); assert.equal(bs.reps, "5");
  const sn19 = find(19, "d1", "snatch");
  assert.ok(sn19.l1.startsWith(String(P.tm("snatch", 0.90))), sn19.l1);
  assert.equal(sn19.sets, 3);
  const fs = find(18, "d3", "front_squat");
  assert.ok(fs.l1.startsWith(String(P.tm("frontSquat", 0.85))), fs.l1);
  assert.ok(fs.l1.endsWith("stop at the first grinding rep"), fs.l1);
  const cp = find(19, "d3", "clean_pull");
  assert.ok(cp.l1.startsWith(String(P.tm("clean", 0.90))), cp.l1);
});

test("a TM change propagates to Block 3 loads", () => {
  const P2 = loadProgram(SRC.replace("snatch: 63", "snatch: 70"));
  const sn = P2.BLOCK3_EXERCISES[18].d1.find(e => e.id === "snatch");
  assert.ok(sn.l1.startsWith(String(P2.tm("snatch", 0.80))), sn.l1);
  assert.equal(P2.tm("snatch", 0.80), 56);
});

// ── Task 3: transition weeks, test days, catalog ──────────────────────────────
const ALL = range(17, 24);
const daysOf = w => Object.keys(E?.[w] || {});
const TM_KEY = { snatch: "snatch", clean_and_jerk: "cleanAndJerk", back_squat: "backSquat", front_squat: "frontSquat" };

test("card limit and l1 rules hold for every Block 3 week", () => {
  for (const w of ALL) {
    assert.ok(daysOf(w).length > 0, `w${w} missing`);
    for (const d of daysOf(w)) {
      assert.ok(day(w, d).length <= 6, `w${w} ${d} has ${day(w, d).length}`);
      for (const e of day(w, d)) if (!e.test) checkL1(w, d, e);
    }
  }
});

test("week 20 Saturday tests snatch, C&J, back squat, then SLDL", () => {
  const d4 = day(20, "d4");
  assert.deepEqual([...d4.filter(e => e.test).map(e => e.id)], ["snatch", "clean_and_jerk", "back_squat"]);
  const firstNonTest = d4.findIndex(e => !e.test);
  assert.equal(d4[firstNonTest].id, "stiff_legged_deadlift");
  assert.ok(d4.slice(firstNonTest).every(e => !e.test), "test cards come first");
});

test("week 23 Saturday tests four lifts, front squat last", () => {
  assert.deepEqual([...day(23, "d4").filter(e => e.test).map(e => e.id)],
    ["snatch", "clean_and_jerk", "back_squat", "front_squat"]);
});

test("test cards are sized from the ladder and target the live TM", () => {
  for (const w of [20, 23]) for (const e of day(w, "d4").filter(e => e.test)) {
    assert.equal(e.sets, P.B2_TEST_LADDER.length + 1, `w${w} ${e.id} sets`);
    assert.equal(e.reps, "1");
    assert.equal(e.target, P.TRAINING_MAX[TM_KEY[e.id]], `w${w} ${e.id} target`);
  }
});

test("week 17: Wed/Thu/Sat only, back squat ramp capped at 5 reps", () => {
  assert.deepEqual([...daysOf(17)], ["d1", "d3", "d4"]);
  const bs = find(17, "d1", "back_squat");
  assert.equal(bs.sets, 4);
  assert.ok(!(bs.reps.match(/\d+/g) || []).some(n => +n > 5), `reps "${bs.reps}"`);
});

test("week 24: no back squat; front squat Mon and Sat", () => {
  for (const d of daysOf(24)) assert.ok(!ids(24, d).includes("back_squat"), `w24 ${d}`);
  assert.ok(ids(24, "d1").includes("front_squat"));
  assert.ok(ids(24, "d4").includes("front_squat"));
});

test("every Block 3 exercise id is in EXERCISE_CATALOG", () => {
  const start = APP.indexOf("const EXERCISE_CATALOG");
  const end = APP.indexOf("\n};", start);
  const catalog = new Set([...APP.slice(start, end).matchAll(/^\s{2}(\w+):\s*\{\s*id:/gm)].map(m => m[1]));
  for (const w of ALL) for (const d of daysOf(w)) for (const e of day(w, d))
    assert.ok(catalog.has(e.id), `w${w} ${d}: ${e.id} not in EXERCISE_CATALOG`);
});

// ── Final-review fixes ────────────────────────────────────────────────────────
// Wave weeks give d1/d2/d4 the same `primary`, so matching a logged session by
// primary text sent Tue and Sat sessions to Monday and dropped them from PR
// history. The label's digit is unambiguous.
test("planDayForLog resolves same-primary days by label digit", () => {
  assert.ok(P.planDayForLog, "planDayForLog is not defined");
  const days = P.weekPlan(18).days;
  assert.equal(days[0].primary, days[1].primary, "precondition: d1/d2 share a primary");
  for (const d of days)
    assert.equal(P.planDayForLog(18, { dayName: d.primary, dayLabel: d.label })?.id, d.id, d.label);
});

test("planDayForLog still matches a Block 2 session by primary alone", () => {
  const d3 = P.weekPlan(12).days.find(d => d.id === "d3");
  assert.equal(P.planDayForLog(12, { dayName: d3.primary, dayLabel: "" })?.id, "d3");
});

// The week-plan text must read sets×reps, the same order as the cards.
test("week-plan squat text agrees with the cards' sets×reps", () => {
  for (const w of range(18, 23)) {
    const plan = P.weekPlan(w).days;
    const bs = find(w, "d1", "back_squat");
    assert.ok(plan[0].secondary.includes(`${bs.sets}×${bs.reps}`), `w${w} d1 "${plan[0].secondary}" vs ${bs.sets}×${bs.reps}`);
    const fs = find(w, "d3", "front_squat");
    assert.ok(plan[2].secondary.includes(`${fs.sets}×${fs.reps}`), `w${w} d3 "${plan[2].secondary}" vs ${fs.sets}×${fs.reps}`);
  }
});
