// Run: node --test "tests/js/*.test.mjs"
// Every exercise Block 3 puts on a card carries a coaching cue, and every cue
// line names where it came from. The cues are written from the evidence pack
// (python main.py evidence --catalog cues); the line-by-line handles are in
// docs/programs/2026-10-18-block3-cues.md.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const SRC = readFileSync(new URL("../../docs/src/program.js", import.meta.url), "utf8");
const APP = readFileSync(new URL("../../docs/src/app.jsx", import.meta.url), "utf8");

const B3 = vm.runInContext(SRC + "\n;BLOCK3_EXERCISES", vm.createContext({ console }));

// The catalog is a plain object literal — evaluate it rather than regex the strings.
const start = APP.indexOf("const EXERCISE_CATALOG");
const end = APP.indexOf("\n};", start) + 3;
const CATALOG = vm.runInContext(APP.slice(start, end) + "\n;EXERCISE_CATALOG", vm.createContext({}));

const block3Ids = [...new Set(Object.values(B3).flatMap(w => Object.values(w).flat().map(e => e.id)))];

// A line ends with "(Coach…)" or an evidence handle like "[E10.3]".
const COACHES = /\b(Everett|Dozer|Sika|Webster|Torokhtiy|Telander|Foreman|Klokov|Berestov|Pavlukhin|Golovinsky|Gregory)\b/;
const endsWithSource = line =>
  /\[E\d+\.\d+\]\.?$/.test(line) || (/\(([^()]*)\)\.?$/.test(line) && COACHES.test(line.match(/\(([^()]*)\)\.?$/)[1]));

test("the catalog evaluated", () => {
  assert.ok(Object.keys(CATALOG).length > 100);
  assert.ok(block3Ids.length > 30);
});

test("every Block 3 exercise has a cue", () => {
  const missing = block3Ids.filter(id => !CATALOG[id]?.desc?.trim());
  assert.deepEqual(missing, []);
});

test("every Block 3 cue line names its source", () => {
  for (const id of block3Ids)
    for (const line of CATALOG[id].desc.split("\n"))
      assert.ok(endsWithSource(line.trim()), `${id}: "${line}"`);
});
