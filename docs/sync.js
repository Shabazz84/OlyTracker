// ── Supabase sync ─────────────────────────────────────────────────────────────
// Hand-written, not generated. Loaded by index.html after key.js; exposes the
// page global `sbSync` that app.js calls.
//
// Set writes are local-first: every upsertSets records its payload in
// localStorage under PENDING_KEY *before* the network call, and the entry is
// cleared only once Supabase confirms that exact payload. The startup pull
// rebuilds local set state from Supabase, so without this a write that never
// reached the cloud (bad gym signal, or Android killing the backgrounded PWA
// mid-request) was wiped on the next launch — the "switch apps, come back,
// half my sets are gone" bug. Pending keys are skipped by the pull and pushed
// again on launch, on reconnect, and when the app returns to the foreground.
function createSbSync(win, ls) {
  const url = win.__SUPABASE_URL;
  const key = win.__SUPABASE_KEY;
  const noop = () => {};
  const noopAsync = async () => null;

  if (!url || !key || url === 'undefined' || key === 'undefined') {
    return { ready: false, upsertSession: noop, upsertSets: noop, upsertReview: noop, deleteSession: noop,
             pullAll: noopAsync, flushPending: noopAsync, pendingSetKeys: () => [], applyRemoteSets: noop };
  }

  const sb = win.supabase.createClient(url, key);
  const PENDING_KEY = 'oly_sync_pending';
  const PAGE = 1000; // PostgREST's default max rows per request

  function readPending() {
    try { return JSON.parse(ls.getItem(PENDING_KEY) || '{}') || {}; } catch { return {}; }
  }
  function writePending(p) {
    try { ls.setItem(PENDING_KEY, JSON.stringify(p)); } catch {}
  }

  async function upsertSession(id, e) {
    try {
      await sb.from('sessions').upsert({
        id, week: e.week,
        day_name: e.dayName || null, day_label: e.dayLabel || null,
        date: e.date || null, notes: e.notes || null, weights: e.weights || null,
        back_pain: e.backPain || null, night_shift: !!e.nightShift,
        technique_feel: e.techniqueFeel || null, energy_level: e.energyLevel || null,
        focus_next: e.focusNext || null, rating: e.rating || null,
      });
    } catch(err) { console.warn('sbSync.upsertSession:', err); }
  }

  // One promise chain per key, so two quick taps on the same exercise can't
  // land in Supabase out of order and leave the older state as the cloud copy.
  const chains = {};

  async function pushSets(lsKey) {
    const payload = readPending()[lsKey];
    if (payload === undefined) return true;
    const m = lsKey.match(/^sets_(w(\d+)_(d\d+))_(.+)$/);
    if (!m) {
      console.warn('sbSync.upsertSets: bad key format:', lsKey);
      const p = readPending(); delete p[lsKey]; writePending(p);
      return true;
    }
    const week = parseInt(m[2]), dayId = m[3], exId = m[4];
    try {
      const rows = JSON.parse(payload).map((s, i) => ({
        id: `${lsKey}_${i}`, week, day_id: dayId, exercise_id: exId,
        set_index: i, done: !!s.done, weight: s.weight ?? null,
      }));
      // supabase-js reports failures in the result, it doesn't throw
      const { error } = await sb.from('sets').upsert(rows);
      if (error) throw error;
    } catch(err) {
      console.warn('sbSync.upsertSets (kept pending):', err);
      return false;
    }
    // Only clear if no newer write for this key arrived while we were pushing.
    const p = readPending();
    if (p[lsKey] === payload) { delete p[lsKey]; writePending(p); }
    return true;
  }

  function queuePush(lsKey) {
    const next = (chains[lsKey] || Promise.resolve()).then(() => pushSets(lsKey));
    chains[lsKey] = next;
    return next;
  }

  function upsertSets(lsKey, setsArr) {
    const p = readPending();
    p[lsKey] = JSON.stringify(setsArr);
    writePending(p);
    return queuePush(lsKey);
  }

  // Resolves true only if every pending write reached Supabase.
  async function flushPending() {
    const results = await Promise.all(Object.keys(readPending()).map(queuePush));
    return results.every(Boolean);
  }

  function pendingSetKeys() { return Object.keys(readPending()); }

  // Rebuilds local set state from a pull. Supabase is the source of truth, so
  // local keys absent remotely are pruned — except pending ones, which hold
  // writes the cloud hasn't confirmed yet and are newer than anything pulled.
  function applyRemoteSets(remoteSets) {
    const pending = readPending();
    Object.keys(ls).forEach(k => {
      if (k.startsWith('sets_w') && !(k in pending)) ls.removeItem(k);
    });
    const setsMap = {};
    remoteSets.forEach(s => {
      const k = `sets_w${s.week}_${s.day_id}_${s.exercise_id}`;
      if (k in pending) return;
      if (!setsMap[k]) setsMap[k] = [];
      setsMap[k][s.set_index] = { done: s.done, weight: s.weight };
    });
    Object.entries(setsMap).forEach(([k, arr]) => {
      ls.setItem(k, JSON.stringify(arr.filter(Boolean)));
    });
  }

  async function upsertReview(week, r) {
    try {
      await sb.from('reviews').upsert({
        week, rating: r.rating || null, energy_trend: r.energyTrend || null,
        injuries: r.injuries || [], general_notes: r.generalNotes || null,
        ai_response: r.ai || null, confirmed: !!r.confirmed, days: r.days || {},
      });
    } catch(err) { console.warn('sbSync.upsertReview:', err); }
  }

  async function deleteSession(id) {
    try { await sb.from('sessions').delete().eq('id', id); }
    catch(err) { console.warn('sbSync.deleteSession:', err); }
  }

  // Pages through a table. Any error means the whole pull is unusable — a
  // partial set list would make the caller wipe the rows it didn't get.
  // Ordered by primary key so pages can't overlap or skip rows.
  async function selectAll(table, pk) {
    const out = [];
    for (let from = 0; ; from += PAGE) {
      const { data, error } = await sb.from(table).select('*').order(pk).range(from, from + PAGE - 1);
      if (error) throw error;
      out.push(...(data || []));
      if (!data || data.length < PAGE) return out;
    }
  }

  async function pullAll() {
    try {
      const [sessions, sets, reviews] = await Promise.all([
        selectAll('sessions', 'id'), selectAll('sets', 'id'), selectAll('reviews', 'week'),
      ]);
      return { sessions, sets, reviews };
    } catch(err) {
      console.warn('sbSync.pullAll:', err);
      return { sessions: [], sets: [], reviews: [] };
    }
  }

  // Retry anything still pending whenever the app gets a second chance.
  if (win.addEventListener) {
    win.addEventListener('online', () => { flushPending(); });
    if (win.document && win.document.addEventListener) {
      win.document.addEventListener('visibilitychange', () => {
        if (win.document.visibilityState === 'visible') flushPending();
      });
    }
  }

  return { ready: true, upsertSession, upsertSets, upsertReview, deleteSession, pullAll, flushPending, pendingSetKeys, applyRemoteSets };
}

var sbSync = createSbSync(window, localStorage);
