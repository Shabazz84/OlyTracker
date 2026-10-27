// Run: node --test "tests/js/*.test.mjs"
// Loads docs/src/program.js as the browser would (a classic script of page
// globals) and checks Block 3's invariants from
// docs/superpowers/specs/2026-10-17-block3-design.md directly on the data.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const SRC = readFileSync(new URL("../../docs/src/program.js", import.meta.url), "utf8");
// LF-normalised: tests slice functions out of the source at a "}" line, and a
// Windows checkout (core.autocrlf) gives app.jsx CRLF line endings.
const APP = readFileSync(new URL("../../docs/src/app.jsx", import.meta.url), "utf8").replace(/\r\n/g, "\n");

// Top-level const/function declarations are not context properties, so the
// script's last expression hands them back explicitly.
function loadProgram(src = SRC) {
  const ctx = vm.createContext({ console });
  return vm.runInContext(src + `
;({TRAINING_MAX, B2_TEST_LADDER, PROGRAM_B3, weekPlan, completionDayIds, tm,
   planDayForLog: typeof planDayForLog !== "undefined" ? planDayForLog : null,
   remapDayIdx: typeof remapDayIdx !== "undefined" ? remapDayIdx : null,
   BLOCK3_EXERCISES: typeof BLOCK3_EXERCISES !== "undefined" ? BLOCK3_EXERCISES : null})`, ctx);
}

const P = loadProgram();
const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);

test("clean and snatchBalance TMs", () => {
  assert.equal(P.TRAINING_MAX.clean, 85);
  assert.equal(P.TRAINING_MAX.snatchBalance, 70);
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
    assert.equal(ids(w, "d3").includes("snatch_deadlift"), snatchWeek, `w${w} snatch_deadlift`);
    assert.equal(ids(w, "d3").includes("clean_deadlift"), !snatchWeek, `w${w} clean_deadlift`);
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
  assert.equal(sn.l1, `45–${P.tm("snatch", 0.80)} kg — low catches only`);
  assert.equal(sn.sets, 5); assert.equal(sn.reps, "1");
  assert.match(sn.note, /caught at or below parallel/);
  assert.equal(find(18, "d1", "clean_front_squat_jerk").l1, `55–${P.tm("cleanAndJerk", 0.80)} kg — low catches only — split jerk`);
  const bs = find(18, "d1", "back_squat");
  assert.ok(bs.l1.startsWith(String(P.tm("backSquat", 0.75))), bs.l1);
  assert.equal(bs.sets, 5); assert.equal(bs.reps, "5");
  const sn19 = find(19, "d1", "snatch");
  assert.equal(sn19.l1, `45–${P.tm("snatch", 0.90)} kg — low catches only`);
  assert.equal(sn19.sets, 3);
  const fs = find(18, "d3", "front_squat");
  assert.ok(fs.l1.startsWith(String(P.tm("frontSquat", 0.85))), fs.l1);
  assert.ok(fs.l1.endsWith("stop at the first grinding rep"), fs.l1);
  const cp = find(19, "d3", "clean_deadlift");
  assert.ok(cp.l1.startsWith(String(P.tm("clean", 0.90))), cp.l1);
});

test("a TM change propagates to Block 3 loads", () => {
  const P2 = loadProgram(SRC.replace("snatch: 70", "snatch: 75"));
  assert.equal(P2.BLOCK3_EXERCISES[18].d1.find(e => e.id === "snatch").l1, "45–60 kg — low catches only");
  assert.equal(P2.tm("snatch", 0.80), 60);
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

// ── Review minors (2026-10-17) ────────────────────────────────────────────────
test("week 23 note does not call the block test a checkpoint; week 20's does", () => {
  assert.match(P.weekPlan(20).note, /checkpoint/);
  assert.doesNotMatch(P.weekPlan(23).note, /checkpoint/);
});

test("week 23 Mon/Tue plan load shows the range, not its top", () => {
  const [d1, d2] = P.weekPlan(23).days;
  assert.ok(d1.load.includes(`${P.tm("snatch", 0.90)}–${P.tm("snatch", 0.95)}`), d1.load);
  assert.ok(d2.load.includes(`${P.tm("snatch", 0.85)}–${P.tm("snatch", 0.90)}`), d2.load);
});

test("every Thursday jerk card carries the empty-bar warm-up note", () => {
  for (const w of range(18, 24)) {
    const jerk = day(w, "d3").find(e => ["split_jerk_from_rack", "power_jerk", "power_split_jerk_combo"].includes(e.id));
    assert.ok(jerk && /empty-bar split jerks/.test(jerk.l1), `w${w}: ${jerk?.l1}`);
  }
});

test("at most one accessory card per session (Edit 6)", () => {
  const ACC = ["trunk_static_strength", "ab_wheel", "plank", "good_morning", "stiff_legged_deadlift"];
  for (const w of ALL) for (const d of daysOf(w)) {
    const acc = ids(w, d).filter(i => ACC.includes(i));
    assert.ok(acc.length <= 1, `w${w} ${d}: ${acc}`);
  }
});

// Switching weeks keeps the same DAY, not the same tile position: week 17 has
// no d2, so position 1 is Thu there but Tue in week 18.
test("remapDayIdx keeps the selected day id across weeks", () => {
  assert.ok(P.remapDayIdx, "remapDayIdx is not defined");
  const four = ["d1", "d2", "d3", "d4"], three = ["d1", "d3", "d4"];
  assert.equal(P.remapDayIdx(four, 3, three), 2);   // wk16 Sat -> wk17 Sat
  assert.equal(P.remapDayIdx(three, 1, four), 2);   // wk17 Thu -> wk18 Thu
  assert.equal(P.remapDayIdx(four, 1, three), 0);   // Tue has no wk17 twin -> first day
  assert.equal(P.remapDayIdx(["d1","d2","d3","d4","d5"], 4, four), 0); // summer d5 -> first day
});

// ── Catch-depth correction (docs/superpowers/specs/2026-10-25-block3-catch-depth-design.md) ──
test("ceiling under start + 2.5 drops the climb", () => {
  // wk17 Thu complex: 60% of 70 = 42 < 45; wk24 Mon snatch: 65% = 45.5
  assert.match(find(17, "d3", "snatch_ohs_complex").l1, /^42 kg — low catches only/);
  assert.match(find(24, "d1", "snatch").l1, /^45\.5 kg — low catches only/);
  assert.match(find(24, "d1", "clean_front_squat_jerk").l1, /^51 kg — low catches only/);
  assert.match(find(17, "d4", "clean_fs_jerk_complex").l1, /^51 kg — low catches only/);
  const P3 = loadProgram(SRC.replace("snatch: 70", "snatch: 55"));
  for (const w of [18, 19, 21, 22]) {
    const l1 = P3.BLOCK3_EXERCISES[w].d1.find(e => e.id === "snatch").l1;
    const [a, b] = (l1.match(/^(\d+(?:\.\d+)?)–(\d+(?:\.\d+)?)/) || []).slice(1).map(Number);
    assert.ok(!(a >= b), `w${w} backwards range: ${l1}`);
  }
});

// Edit 25: training C&J cards are clean + front squat + jerk; the week-20
// checkpoint and the week-23 test stay a plain C&J.
const cjId = (w, d) => d === "d4" && (w === 20 || w === 23) ? "clean_and_jerk" : "clean_front_squat_jerk";
test("every wave-week snatch / C&J is a low-catch card", () => {
  for (const w of WAVE) for (const d of ["d1", "d2", "d4"]) for (const id of ["snatch", cjId(w, d)]) {
    if (w === 23 && d === "d4") continue; // test card, checked below
    const e = find(w, d, id);
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
  const cj = find(24, "d2", "clean_front_squat_jerk");
  assert.equal(cj.reps, "1+1+1"); assert.match(cj.l1, /power jerk/);
});

test("positional lifts are caught in a full squat", () => {
  const pos = ["three_position_snatch", "three_position_clean", "snatch_from_blocks", "clean_from_blocks", "two_position_snatch", "two_position_clean"];
  for (const w of ALL) for (const d of daysOf(w)) for (const e of day(w, d))
    if (pos.includes(e.id) && !/low catches only/.test(e.l1)) assert.match(e.l1, /every catch in a full squat/, `w${w} ${d} ${e.id}`);
});

test("every snatch balance and overhead squat carries the pause", () => {
  for (const w of ALL) for (const d of daysOf(w)) for (const e of day(w, d)) {
    if (e.id === "snatch_balance") assert.match(e.l1, /hold the bottom 2–3 s every rep/, `w${w} ${d}`);
    if (e.id === "overhead_squat" || e.id === "snatch_ohs_complex") assert.match(e.l1, /hold the bottom of each overhead squat two to three seconds/, `w${w} ${d} ${e.id}`);
  }
});

test("Thursday pulls are segment deadlifts at the old pull loads", () => {
  assert.equal(find(18, "d3", "snatch_deadlift").l1.split(" ")[0], String(P.tm("snatch", 0.85)));
  const cd = find(19, "d3", "clean_deadlift");
  assert.equal(cd.sets, 5); assert.equal(cd.reps, "4");
  assert.ok(cd.l1.startsWith(String(P.tm("clean", 0.90))), cd.l1);
  for (const w of WAVE) assert.ok(!ids(w, "d3").some(i => i === "snatch_pull" || i === "clean_pull"), `w${w}`);
  assert.match(find(17, "d3", "snatch_pull").l1, /until the legs finish/);
  assert.match(find(24, "d1", "snatch_pull").l1, /until the legs finish/);
});

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

test("week plans: film note every week, low-catch wording on classic days", () => {
  for (const w of ALL) assert.match(P.PROGRAM_B3[w - 17].note, /[Ff]ilm snatches and cleans from the side/, `w${w}`);
  assert.match(P.weekPlan(18).days[0].primary, /low catches only/);
  assert.match(P.weekPlan(20).days[3].primary, /caught low/);
});

test("goal strings: 70 / 85 caught low", () => {
  assert.match(SRC, /goal:"Snatch 70 · C&J 85 caught low · back squat 140 · front squat 125 \(week-23 test\)"/);
  assert.match(SRC, /text:"Goals met: snatch 70 · C&J 85 caught low · back squat 140 · front squat 125"/);
});

test("week 20 banner and load line call Saturday a checkpoint, not maxes", () => {
  const w20 = P.weekPlan(20);
  assert.doesNotMatch(w20.focus, /maxes/i);
  assert.match(w20.focus, /checkpoint/i);
  assert.doesNotMatch(w20.load, /MAX/);
  assert.match(P.weekPlan(23).focus, /maxes/i);
});

// ── Final-review fixes (catch-depth) ──────────────────────────────────────────
const gwOf = app => {
  const s = app.indexOf("function generateWeights"), e = app.indexOf("\n}\n", s) + 3;
  return vm.runInContext(app.slice(s, e) + ";generateWeights", vm.createContext({}));
};
// Every card whose load leads with kg must offer that weight (and both ends of a
// range) — at today's TMs and after a TM raise (a week-24 re-base).
test("dropdown offers every prescribed weight, at today's and at raised TMs", () => {
  const gw = gwOf(APP), r25 = x => Math.round(x / 2.5) * 2.5;
  const variants = [SRC, SRC.replace("snatch: 70", "snatch: 80"), SRC.replace("cleanAndJerk: 85", "cleanAndJerk: 95")];
  for (const src of variants) {
    const E2 = loadProgram(src).BLOCK3_EXERCISES;
    for (const w of ALL) for (const d of Object.keys(E2[w])) for (const x of E2[w][d]) {
      if (x.test || !/^\d/.test(x.l1) || /^\d+ ?(sec|min)/.test(x.l1)) continue;
      const m = x.l1.match(/^(\d+(?:\.\d+)?)(?:–(\d+(?:\.\d+)?))? kg/);
      if (!m) continue;
      const ws = gw(x.l1).weights;
      for (const v of [m[1], m[2]].filter(Boolean))
        assert.ok(ws.includes(r25(+v)), `w${w} ${d} ${x.id}: "${x.l1}" → ${ws[0]}..${ws.at(-1)} lacks ${r25(+v)}`);
    }
  }
});

test("fixed-weight low-catch cards carry a no-climb note", () => {
  for (const [w, d, id] of [[17, "d3", "snatch_ohs_complex"], [17, "d4", "clean_fs_jerk_complex"], [24, "d1", "snatch"], [24, "d1", "clean_front_squat_jerk"]]) {
    const e = find(w, d, id);
    assert.doesNotMatch(e.note, /Climb from the start/, `w${w} ${d} ${id}`);
    assert.match(e.note, /caught at or below parallel/, `w${w} ${d} ${id}`);
  }
  assert.match(find(18, "d1", "snatch").note, /Climb from the start/);
});

test("clean_deadlift cue keeps the source's hedge", () => {
  const line = APP.split("\n").find(l => /^\s*clean_deadlift:/.test(l)) + APP.split("\n")[APP.split("\n").findIndex(l => /^\s*clean_deadlift:/.test(l)) + 1];
  assert.match(line, /probably/);
  assert.doesNotMatch(line, /mostly a strength problem/);
});

// ── Everett "Can't Receive the Snatch Low" follow-ups (Edits 19-21) ───────────
test("low-catch notes: ride a high catch down, hold every bottom", () => {
  for (const [w, d, id] of [[18, "d1", "snatch"], [18, "d1", "clean_front_squat_jerk"], [17, "d3", "snatch_ohs_complex"], [24, "d1", "snatch"]]) {
    const n = find(w, d, id).note;
    assert.match(n, /ride it down into a full squat/i, `w${w} ${d} ${id}`);
    assert.match(n, /hold the bottom two to three seconds/i, `w${w} ${d} ${id}`);
  }
});

test("snatch days open with an overhead squat / snatch balance warm-up note", () => {
  for (const w of WAVE) for (const i of [0, 1, 3])
    assert.match(P.weekPlan(w).days[i].notes, /^Warm up with overhead squats and snatch balances/, `w${w} day ${i}`);
  assert.match(P.weekPlan(17).days[1].notes, /^Warm up with overhead squats and snatch balances/);
  for (const i of [0, 1, 3]) assert.match(P.weekPlan(24).days[i].notes, /^Warm up with overhead squats and snatch balances/, `w24 day ${i}`);
});

// ── Corpus re-query 2026-10-26: Everett articles 2068, 2108, 2124, 2058 (Edits 22-25) ──
test("Edit 22: low-catch notes ask for a full pull and one continuous squat", () => {
  for (const [w, d, id] of [[18, "d1", "snatch"], [18, "d1", "clean_front_squat_jerk"], [17, "d3", "snatch_ohs_complex"], [24, "d1", "snatch"]]) {
    const n = find(w, d, id).note;
    assert.match(n, /never pull softer to catch lower/i, `w${w} ${d} ${id}`);
    assert.match(n, /keep sitting to the bottom in one motion/i, `w${w} ${d} ${id}`);
    assert.match(n, /stopping in a power position doesn't count/i, `w${w} ${d} ${id}`);
  }
});

test("Edit 23: arm cues say long and loose, not locked", () => {
  for (const [w, d, id] of [[17, "d3", "snatch_pull"], [24, "d1", "snatch_pull"], [18, "d3", "snatch_deadlift"], [19, "d3", "clean_deadlift"]])
    assert.match(find(w, d, id).l1, /arms long and loose, not locked/, `w${w} ${d} ${id}`);
});

test("Edit 24: the climb goes in waves; a fixed weight has no climb", () => {
  assert.match(find(18, "d1", "snatch").note, /in waves: two jumps up, one back/);
  assert.doesNotMatch(find(24, "d1", "snatch").note, /waves/);
});

test("Edit 25: training C&J cards are clean + front squat + jerk", () => {
  for (const w of [...WAVE, 24]) for (const d of daysOf(w)) {
    if (d === "d3" || (d === "d4" && [20, 23, 24].includes(w))) continue;
    assert.ok(!ids(w, d).includes("clean_and_jerk"), `w${w} ${d}: ${ids(w, d)}`);
    const e = find(w, d, "clean_front_squat_jerk");
    assert.ok(e, `w${w} ${d}: ${ids(w, d)}`);
    assert.equal(e.reps, "1+1+1", `w${w} ${d}`);
  }
  assert.match(find(18, "d1", "clean_front_squat_jerk").l1, /low catches only — split jerk$/);
  for (const [w, d] of [[20, "d4"], [23, "d4"], [24, "d4"]])
    assert.ok(ids(w, d).includes("clean_and_jerk"), `w${w} ${d} keeps the plain C&J`);
  for (const w of [18, 24]) assert.match(P.weekPlan(w).days[0].notes, /clean \+ front squat \+ split jerk/, `w${w}`);
});
