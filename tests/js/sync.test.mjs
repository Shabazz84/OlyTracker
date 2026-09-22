// Run: node --test "tests/js/*.test.mjs"
// Loads docs/sync.js as the browser would (a classic script defining the
// global `sbSync`) against a fake localStorage and a fake Supabase client.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const SRC = readFileSync(new URL("../../docs/sync.js", import.meta.url), "utf8");

class FakeStorage {
  getItem(k) { return Object.hasOwn(this, k) ? this[k] : null; }
  setItem(k, v) { this[k] = String(v); }
  removeItem(k) { delete this[k]; }
}
// Methods live on the prototype, so Object.keys(ls) sees only stored keys —
// same as real localStorage.

function fakeSupabase(db) {
  return {
    failWrites: false,
    rows: db,
    createClient() {
      const self = this;
      return {
        from(table) {
          return {
            async upsert(rows) {
              if (self.failWrites) return { error: new Error("network down") };
              for (const r of [].concat(rows)) self.rows[table].set(r.id ?? r.week, r);
              return { error: null };
            },
            select() {
              let order;
              const q = {
                order(k) { order = k; return q; },
                async range(a, b) {
                  const all = [...self.rows[table].values()]
                    .sort((x, y) => String(x[order]).localeCompare(String(y[order])));
                  return { data: all.slice(a, b + 1), error: null };
                },
              };
              return q;
            },
          };
        },
      };
    },
  };
}

function load({ ls = new FakeStorage(), db } = {}) {
  db = db || { sessions: new Map(), sets: new Map(), reviews: new Map() };
  const supabase = fakeSupabase(db);
  const win = { __SUPABASE_URL: "https://x", __SUPABASE_KEY: "k", supabase };
  const ctx = vm.createContext({ window: win, localStorage: ls, console: { warn() {} } });
  vm.runInContext(SRC, ctx);
  return { sbSync: ctx.sbSync, ls, db, supabase };
}

const KEY = "sets_w10_d1_snatch_pull";

test("a set write that never reached Supabase survives the next launch's pull", async () => {
  // First run: the athlete logs two sets, but the network is down.
  const first = load();
  first.supabase.failWrites = true;
  const sets = [{ done: true, weight: "70" }, { done: true, weight: "75" }];
  first.ls.setItem(KEY, JSON.stringify(sets)); // what ExCard.updateSet does
  await first.sbSync.upsertSets(KEY, sets);

  // Cloud still holds the older state (only set 1, unticked).
  first.db.sets.set(`${KEY}_0`, { id: `${KEY}_0`, week: 10, day_id: "d1", exercise_id: "snatch_pull", set_index: 0, done: false, weight: null });

  // App is killed in the background; relaunch — network still bad, then pull.
  const second = load({ ls: first.ls, db: first.db });
  second.supabase.failWrites = true;
  assert.equal(await second.sbSync.flushPending(), false);
  const remote = await second.sbSync.pullAll();
  second.sbSync.applyRemoteSets(remote.sets);

  assert.deepEqual(JSON.parse(second.ls.getItem(KEY)), sets);
  assert.deepEqual([...second.sbSync.pendingSetKeys()], [KEY]);
});

test("pending writes reach Supabase once the network is back, then clear", async () => {
  const { sbSync, ls, db, supabase } = load();
  supabase.failWrites = true;
  const sets = [{ done: true, weight: "70" }];
  ls.setItem(KEY, JSON.stringify(sets));
  await sbSync.upsertSets(KEY, sets);
  assert.equal(db.sets.size, 0);

  supabase.failWrites = false;
  assert.equal(await sbSync.flushPending(), true);
  assert.equal(db.sets.get(`${KEY}_0`).weight, "70");
  assert.deepEqual([...sbSync.pendingSetKeys()], []);
});

test("rapid writes to one exercise land in order; the last one wins in the cloud", async () => {
  const { sbSync, db } = load();
  const a = sbSync.upsertSets(KEY, [{ done: false, weight: "70" }]);
  const b = sbSync.upsertSets(KEY, [{ done: true, weight: "70" }]);
  await Promise.all([a, b]);
  assert.equal(db.sets.get(`${KEY}_0`).done, true);
  assert.deepEqual([...sbSync.pendingSetKeys()], []);
});

test("the pull still prunes non-pending local keys that no longer exist remotely", async () => {
  const { sbSync, ls } = load();
  ls.setItem("sets_w3_d2_clean", "[{\"done\":true}]");
  sbSync.applyRemoteSets([{ week: 9, day_id: "d1", exercise_id: "snatch", set_index: 0, done: true, weight: 50 }]);
  assert.equal(ls.getItem("sets_w3_d2_clean"), null);
  assert.deepEqual(JSON.parse(ls.getItem("sets_w9_d1_snatch")), [{ done: true, weight: 50 }]);
});

test("pullAll pages past Supabase's 1000-row cap", async () => {
  const { sbSync, db } = load();
  for (let i = 0; i < 2300; i++) {
    const id = `sets_w1_d1_ex${String(i).padStart(5, "0")}_0`;
    db.sets.set(id, { id, week: 1, day_id: "d1", exercise_id: `ex${i}`, set_index: 0, done: true, weight: 1 });
  }
  const remote = await sbSync.pullAll();
  assert.equal(remote.sets.length, 2300);
});
