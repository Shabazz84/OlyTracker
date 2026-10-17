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
