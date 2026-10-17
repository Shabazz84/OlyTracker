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
