// Deterministic checks for program.js's week arithmetic.
// program.js is a classic script (no exports), so it is evaluated in a
// function scope and the globals under test are handed back explicitly.
// Run: node tools/check_program.mjs
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";

const src = readFileSync("docs/src/program.js", "utf8");
const { BLOCK_BOUNDS, blockFor, weekPlan, DAYS_SCHOOL, PROGRAM_B1,
        PROGRAM_B2, PROGRAM_OUTLINE, TRAINING_MAX } =
  new Function(`${src}\nreturn {BLOCK_BOUNDS, blockFor, weekPlan, DAYS_SCHOOL, PROGRAM_B1, PROGRAM_B2, PROGRAM_OUTLINE, TRAINING_MAX};`)();

// --- block boundaries match the actual program arrays -----------------
assert.equal(PROGRAM_B1.length, 8, "Block 1 is eight weeks");
assert.equal(blockFor(1).block, 1);
assert.equal(blockFor(8).block, 1, "week 8 is still Block 1 - the shipped bug");
assert.equal(blockFor(9).block, 2);
assert.equal(blockFor(16).block, 2);
assert.equal(blockFor(17).block, 3);

// --- block progress reads correctly at the boundaries -----------------
const b8 = blockFor(8);
assert.equal(8 - b8.start + 1, 8, "week 8 is W8 of Block 1");
assert.equal(b8.end - b8.start + 1, 8, "Block 1 totals 8 weeks");
const b9 = blockFor(9);
assert.equal(9 - b9.start + 1, 1, "week 9 is W1 of Block 2");

// --- routing ----------------------------------------------------------
assert.equal(weekPlan(1), PROGRAM_B1[0]);
assert.equal(weekPlan(8), PROGRAM_B1[7]);
assert.ok(weekPlan(17), "week 17 falls through to the outline");
assert.equal(weekPlan(99), null, "out of range returns null, never undefined");

// --- school term ------------------------------------------------------
assert.deepEqual(
  DAYS_SCHOOL.map(d => d.schedule),
  ["Monday", "Tuesday", "Thursday", "Saturday"],
  "no more than two consecutive training days [E8.9]");

// --- Block 2 ----------------------------------------------------------
assert.equal(PROGRAM_B2.length, 8, "Block 2 is eight weeks");
assert.deepEqual(PROGRAM_B2.map(w => w.week), [9,10,11,12,13,14,15,16]);
for (const w of PROGRAM_B2) {
  assert.equal(w.days.length, 4, `week ${w.week} is authored as four days`);
  assert.deepEqual(w.days.map(d => d.id), ["d1","d2","d3","d4"],
    `week ${w.week} uses d1-d4`);
  for (const d of w.days) {
    for (const f of ["id","label","primary","load","secondary","notes"]) {
      assert.ok(f in d, `week ${w.week} ${d.id} is missing ${f}`);
    }
  }
}
assert.equal(PROGRAM_B2[6].phase, "Deload", "week 15 is the back-off week");
assert.equal(PROGRAM_B2[7].phase, "Test", "week 16 is the test week");

// --- the outline no longer covers weeks 9-16 --------------------------
assert.equal(PROGRAM_OUTLINE.filter(w => w.week >= 9 && w.week <= 16).length, 0,
  "superseded outline rows removed");
assert.equal(PROGRAM_OUTLINE[0].week, 17, "outline now starts at Block 3");

// --- weekPlan routes Block 2 to the real block, not the outline -------
assert.equal(weekPlan(9), PROGRAM_B2[0]);
assert.equal(weekPlan(16), PROGRAM_B2[7]);

// --- training maxes are the single source for Block 2 loads -----------
for (const lift of ["snatch","cleanAndJerk","frontSquat","backSquat","pushPress","cleanPull"]) {
  assert.equal(typeof TRAINING_MAX[lift], "number", `TRAINING_MAX.${lift}`);
}

// --- Block 2 carries none of Block 1's uncited or Wednesday strings ---
// The pain gate cites nothing in the corpus and is dropped as a coaching
// prescription; Wednesday is not a training day in Block 2.
for (const w of PROGRAM_B2) {
  for (const d of w.days) {
    const blob = `${d.label} ${d.primary} ${d.load} ${d.secondary} ${d.notes}`;
    assert.ok(!/pain[- ]gate/i.test(blob), `week ${w.week} ${d.id} carries the pain gate`);
    assert.ok(!/Hard stop 3pm/i.test(blob), `week ${w.week} ${d.id} carries the 3pm stop`);
    assert.ok(!/\bWed\b/.test(blob), `week ${w.week} ${d.id} labels a Wednesday`);
  }
  assert.deepEqual(w.days.map(d => d.label.split(" ")[1]), ["Mon","Tue","Thu","Sat"],
    `week ${w.week} runs Mon/Tue/Thu/Sat [E8.12]`);
}

console.log("program.js checks passed");
