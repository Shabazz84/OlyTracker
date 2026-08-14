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
//
// These match the PRESCRIPTION, not its label. An earlier version tested only
// for the literal "pain-gate", which the rule itself never contains - "back
// pain >3/10 pre-session -> drop load ~40%" would have sailed through with its
// label prefix stripped. The serialized week covers week-level note/focus/load
// as well as every day field; the day-only scan left half the object open.
for (const w of PROGRAM_B2) {
  const blob = JSON.stringify(w);
  assert.ok(!/\d\s*\/\s*10/.test(blob),
    `week ${w.week} carries a numeric pain-score threshold`);
  assert.ok(!/drop\s+(the\s+)?load/i.test(blob),
    `week ${w.week} carries the uncited load-reduction rule`);
  assert.ok(!/pain[- ]gate/i.test(blob), `week ${w.week} carries the pain gate by name`);
  assert.ok(!/Hard stop 3pm/i.test(blob), `week ${w.week} carries the 3pm stop`);
  assert.ok(!/\bWed\b/.test(blob), `week ${w.week} labels a Wednesday`);
  assert.deepEqual(w.days.map(d => d.label.split(" ")[1]), ["Mon","Tue","Thu","Sat"],
    `week ${w.week} runs Mon/Tue/Thu/Sat [E8.12]`);
}

// The guard must actually catch the string it exists to catch.
{
  const poisoned = JSON.parse(JSON.stringify(PROGRAM_B2[0]));
  poisoned.days[0].notes += " back pain >3/10 pre-session, drop load ~40%.";
  const blob = JSON.stringify(poisoned);
  assert.ok(/\d\s*\/\s*10/.test(blob) && /drop\s+(the\s+)?load/i.test(blob),
    "the pain-gate guard does not detect the unlabelled prescription");
}

// --- E25.4's band -> rep-scheme pairing, on the jerk slot ------------------
// "70 to 80% ... The optimum range is 3 repetitions for 4-5 sets; The hardest
// work with modest volumes is between 80 and 90%, for example, 1-3 reps for
// 2-4 sets; Competitive and extreme loads of 90% and higher. Recommended from
// 2 and up to 6 singles." When the 2026-08-14 ruling moved the jerk down to
// 70-80%, the reps did not follow, leaving singles printed beside a citation
// that assigns them to 90%+. check_citations cannot see that: the handle
// resolves, it just no longer supports the pairing next to it. This does.
for (const w of PROGRAM_B2) {
  if (w.phase === "Deload" || w.phase === "Test") continue;  // E5.11 / E3.12 govern
  const d3 = w.days[2];
  if (/\b7\d–80%|\b70–7\d%/.test(d3.load)) {
    assert.match(d3.primary, /4–5×3/,
      `week ${w.week} d3 sits in E25.4's 70-80% bracket, which it assigns 3 reps x 4-5 sets`);
    assert.doesNotMatch(d3.primary, /single|double/i,
      `week ${w.week} d3 pairs singles/doubles with the 70-80% band`);
  }
}

// --- Block 2 loads the split jerk on Thursday only -------------------------
// The source document's Prescription calls it "the week's jerk primary" -
// singular - and its table/prose conflict was resolved at 70-80%, Thu only.
for (const w of PROGRAM_B2) {
  const [, d2] = w.days;
  assert.ok(!/Split jerk[^·]*\d+(\.\d+)?–\d+(\.\d+)? kg/.test(d2.secondary),
    `week ${w.week} d2 carries a percentaged split jerk - Thursday owns that slot`);
}

console.log("program.js checks passed");
