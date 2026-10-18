// Run: node --test "tests/js/*.test.mjs"
// Pure helpers behind the slimmed UI (docs/superpowers/specs/2026-10-17-ui-slim-design.md),
// loaded from docs/src/program.js as the browser would.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const SRC = readFileSync(new URL("../../docs/src/program.js", import.meta.url), "utf8");
const NAMES = ["PR_ROWS", "prRow", "WARMUP", "WARMUP_IDS", "doneSetsFor", "logEntryDayId",
  "logDaySets", "logsOnDate", "monthCells"];
const P = vm.runInContext(SRC + `\n;({${NAMES.map(n => `${n}: typeof ${n} !== "undefined" ? ${n} : null`).join(",")}})`,
  vm.createContext({ console }));
const need = n => assert.ok(P[n], `${n} is not defined`);
const plain = v => JSON.parse(JSON.stringify(v));  // vm-realm values -> this realm, for deepEqual

// A fake localStorage view: the helpers take (keys, getItem) so they never touch globals.
const store = o => [Object.keys(o), k => (k in o ? JSON.stringify(o[k]) : null)];

test("PR_ROWS is the spec's 10 rows", () => {
  need("PR_ROWS");
  assert.deepEqual(plain(P.PR_ROWS.map(r => r.label)), ["Snatch", "Clean & Jerk", "Clean", "Split Jerk",
    "Back Squat", "Front Squat", "Snatch Balance", "Overhead Squat", "Snatch Pull", "Clean Pull"]);
  const sj = P.PR_ROWS.find(r => r.label === "Split Jerk");
  assert.deepEqual(plain(sj.ids), ["split_jerk_from_rack", "jerk_from_rack"]);
});

test("prRow takes the heaviest across ids and merges history by date", () => {
  need("prRow");
  const prs = {
    snatch: { weight: 55, date: "2025-11-10", history: [{ weight: 55, date: "2025-11-10" }] },
    snatch_from_floor: { weight: 58, date: "2026-10-24", history: [{ weight: 50, date: "2026-09-01" }, { weight: 58, date: "2026-10-24" }] },
  };
  const r = P.prRow(prs, P.PR_ROWS[0]);
  assert.equal(r.weight, 58);
  assert.equal(r.date, "2026-10-24");
  assert.deepEqual(plain(r.history.map(h => h.date)), ["2025-11-10", "2026-09-01", "2026-10-24"]);
});

test("prRow empty", () => {
  const r = P.prRow({}, P.PR_ROWS.find(x => x.label === "Snatch Pull"));
  assert.deepEqual(plain(r), { weight: null, date: null, history: [] });
});

test("doneSetsFor excludes warm-up", () => {
  need("doneSetsFor");
  const [keys, get] = store({
    sets_w18_d1_snatch: [{ done: true }, { done: true }, { done: false }],
    sets_w18_d1_warmup_before: [{ done: true }, { done: true }],
    sets_w18_d2_snatch: [{ done: true }],
  });
  assert.equal(P.doneSetsFor("sets_w18_d1_", keys, get), 2);
});

test("logEntryDayId reads the label's first digit", () => {
  need("logEntryDayId");
  assert.equal(P.logEntryDayId({ dayLabel: "D3 Thu ⭐⭐" }), "d3");
  assert.equal(P.logEntryDayId({ dayLabel: "" }), null);
});

test("logDaySets returns that day's exercises, no warm-up", () => {
  need("logDaySets");
  const [keys, get] = store({
    sets_w18_d3_front_squat: [{ done: true, weight: 98 }, { done: false, weight: null }],
    sets_w18_d3_warmup_after: [{ done: true }],
    sets_w18_d1_snatch: [{ done: true, weight: 50.5 }],
  });
  const rows = plain(P.logDaySets({ week: 18, dayLabel: "D3 Thu ⭐⭐" }, keys, get));
  assert.deepEqual(rows, [{ exId: "front_squat", sets: [{ done: true, weight: 98 }] }]);
});

test("logsOnDate returns every entry on that date", () => {
  need("logsOnDate");
  const logs = { a: { date: "2026-10-05" }, b: { date: "2026-10-05" }, c: { date: "2026-10-06" } };
  assert.deepEqual(plain(P.logsOnDate(logs, "2026-10-05").map(([k]) => k)).sort(), ["a", "b"]);
});

test("monthCells builds a Monday-first grid", () => {
  need("monthCells");
  const cells = plain(P.monthCells(2026, 9));   // October 2026
  assert.equal(cells.length % 7, 0);
  assert.equal(cells.findIndex(c => c !== null), 3);   // Oct 1 2026 is a Thursday
  assert.equal(cells[3], "2026-10-01");
  assert.equal(cells.filter(Boolean).length, 31);
  assert.equal(cells.filter(Boolean).at(-1), "2026-10-31");
});

test("WARMUP: ankle + core before, two spine drills after", () => {
  need("WARMUP"); need("WARMUP_IDS");
  assert.equal(P.WARMUP.before.length, 2);
  assert.equal(P.WARMUP.after.length, 2);
  assert.match(P.WARMUP.before[0].dose, /90 s/);
  assert.deepEqual(plain(P.WARMUP_IDS), ["warmup_before", "warmup_after"]);
});
