# Supabase Sync + Analytics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add offline-first Supabase sync (sessions, sets, reviews), migrate existing localStorage data, and add an Analytics tab with PR progression, weekly completion, and exercise frequency charts.

**Architecture:** A plain JS `sbSync` module (loaded before the Babel block) wraps the Supabase JS v2 client and exposes fire-and-forget upsert methods. All existing write paths gain a one-line `sbSync.*()` call after the localStorage write — no existing logic changes. On app load, `pullAll()` fetches Supabase rows and merges them into localStorage then into React state. The Analytics tab reads from React state (`prs`, `logs`) and localStorage (`sets_*`) — same sources as the existing Reports tab.

**Tech Stack:** Supabase JS v2 (UMD CDN), Supabase PostgreSQL (hosted), existing React 18 + Babel standalone in `docs/index.html`.

---

## Files

| File | Change |
|------|--------|
| `docs/schema.sql` | **Create** — SQL to run in Supabase dashboard |
| `docs/index.html` | **Modify** — add CDN, sbSync module, dual-writes, Analytics tab |
| `gen_key.py` | **Modify** — also write SUPABASE_URL + SUPABASE_KEY to key.js |
| `.github/workflows/deploy.yml` | **Modify** — inject SUPABASE_URL + SUPABASE_ANON_KEY into key.js |

---

## User Prerequisite (do before Task 2)

1. Go to [supabase.com](https://supabase.com) → New project → note the **Project URL** and **anon/public key** (Project Settings → API).
2. Open the SQL Editor in your project and run the contents of `docs/schema.sql` (created in Task 1).
3. Add two GitHub Actions secrets: `SUPABASE_URL` and `SUPABASE_ANON_KEY`.
4. Add both vars to your local `.env` file as `SUPABASE_URL=` and `SUPABASE_ANON_KEY=`.

---

## Task 1: SQL Schema

**Files:**
- Create: `docs/schema.sql`

- [ ] **Step 1: Create the schema file**

```sql
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New query)

create table sessions (
  id text primary key,
  week integer not null,
  day_name text,
  day_label text,
  date date,
  notes text,
  weights text,
  back_pain text,
  night_shift boolean default false,
  technique_feel text,
  energy_level text,
  focus_next text,
  rating text,
  created_at timestamptz default now()
);

create table sets (
  id text primary key,
  week integer not null,
  day_id text not null,
  exercise_name text not null,
  set_index integer not null,
  done boolean default false,
  weight numeric,
  updated_at timestamptz default now()
);

create table reviews (
  week integer primary key,
  rating text,
  energy_trend text,
  injuries jsonb default '[]',
  general_notes text,
  ai_response text,
  confirmed boolean default false,
  days jsonb default '{}',
  updated_at timestamptz default now()
);

-- Row Level Security — allow anonymous read/write (single-user personal app)
alter table sessions enable row level security;
alter table sets enable row level security;
alter table reviews enable row level security;

create policy "allow all" on sessions for all to anon using (true) with check (true);
create policy "allow all" on sets for all to anon using (true) with check (true);
create policy "allow all" on reviews for all to anon using (true) with check (true);
```

- [ ] **Step 2: Write the file**

Save the SQL above to `docs/schema.sql`.

- [ ] **Step 3: Verify the file exists**

Run: `ls docs/schema.sql`
Expected: file listed

- [ ] **Step 4: Commit**

```bash
git add docs/schema.sql
git commit -m "feat: add supabase schema SQL"
```

---

## Task 2: Credentials Injection

**Files:**
- Modify: `gen_key.py`
- Modify: `.github/workflows/deploy.yml`
- Modify: `docs/index.html` (line 38 — the `window.__CLAUDE_KEY=undefined` script tag)

- [ ] **Step 1: Update gen_key.py**

Replace the entire contents of `gen_key.py` with:

```python
"""Generate docs/key.js from .env — gitignored, never committed."""
import re, pathlib

env = pathlib.Path(".env").read_text()

def get(name):
    m = re.search(rf"{name}=(.+)", env)
    return m.group(1).strip() if m else ""

claude_key = get("ANTHROPIC_API_KEY")
if not claude_key:
    raise SystemExit("ANTHROPIC_API_KEY not found in .env")

sb_url = get("SUPABASE_URL")
sb_key = get("SUPABASE_ANON_KEY")

lines = [f'window.__CLAUDE_KEY="{claude_key}";\n']
if sb_url:
    lines.append(f'window.__SUPABASE_URL="{sb_url}";\n')
if sb_key:
    lines.append(f'window.__SUPABASE_KEY="{sb_key}";\n')

pathlib.Path("docs/key.js").write_text("".join(lines))
print(f"docs/key.js written (claude: {claude_key[:12]}..., supabase: {'✓' if sb_url else '✗'})")
```

- [ ] **Step 2: Update deploy.yml inject step**

Find the "Inject API key" step in `.github/workflows/deploy.yml`. Replace it with:

```yaml
      - name: Inject API keys
        run: |
          printf 'window.__CLAUDE_KEY="%s";\n' "$ANTHROPIC_API_KEY" > docs/key.js
          printf 'window.__SUPABASE_URL="%s";\n' "$SUPABASE_URL" >> docs/key.js
          printf 'window.__SUPABASE_KEY="%s";\n' "$SUPABASE_ANON_KEY" >> docs/key.js
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
```

- [ ] **Step 3: Update the fallback initializer in index.html**

Find line 38 in `docs/index.html`:
```html
<script>window.__CLAUDE_KEY=undefined;</script>
```

Replace with:
```html
<script>window.__CLAUDE_KEY=undefined;window.__SUPABASE_URL=undefined;window.__SUPABASE_KEY=undefined;</script>
```

This ensures the variables exist even when key.js hasn't been generated locally.

- [ ] **Step 4: Run gen_key.py and verify key.js**

Run: `python gen_key.py`
Expected output: `docs/key.js written (claude: sk-ant-api0...., supabase: ✓)`

Open `docs/key.js` — it should have 3 lines now:
```
window.__CLAUDE_KEY="sk-ant-...";
window.__SUPABASE_URL="https://xxx.supabase.co";
window.__SUPABASE_KEY="eyJ...";
```

- [ ] **Step 5: Commit**

```bash
git add gen_key.py .github/workflows/deploy.yml docs/index.html
git commit -m "feat: inject supabase credentials via key.js and CI"
```

---

## Task 3: Supabase Client + sbSync Module

**Files:**
- Modify: `docs/index.html` (add CDN script tag + sbSync script block between key.js and the Babel block)

- [ ] **Step 1: Add Supabase CDN**

In `docs/index.html`, find:
```html
<script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
<script>window.__CLAUDE_KEY=undefined;window.__SUPABASE_URL=undefined;window.__SUPABASE_KEY=undefined;</script>
<script src="key.js"></script>
<script type="text/babel">
```

Replace with:
```html
<script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js"></script>
<script>window.__CLAUDE_KEY=undefined;window.__SUPABASE_URL=undefined;window.__SUPABASE_KEY=undefined;</script>
<script src="key.js"></script>
<script>
// ── Supabase sync ─────────────────────────────────────────────────────────────
const sbSync = (() => {
  const url = window.__SUPABASE_URL;
  const key = window.__SUPABASE_KEY;
  const noop = () => {};
  const noopAsync = async () => null;

  if (!url || !key || url === 'undefined' || key === 'undefined') {
    return { ready: false, upsertSession: noop, upsertSets: noop, upsertReview: noop, deleteSession: noop, pullAll: noopAsync };
  }

  const sb = window.supabase.createClient(url, key);

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

  async function upsertSets(lsKey, setsArr) {
    try {
      const m = lsKey.match(/^sets_(w(\d+)_(d\d+))_(.+)$/);
      if (!m) return;
      const week = parseInt(m[2]), dayId = m[3], exName = m[4];
      const rows = setsArr.map((s, i) => ({
        id: `${lsKey}_${i}`, week, day_id: dayId, exercise_name: exName,
        set_index: i, done: !!s.done, weight: s.weight ?? null,
      }));
      await sb.from('sets').upsert(rows);
    } catch(err) { console.warn('sbSync.upsertSets:', err); }
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

  async function pullAll() {
    try {
      const [sess, sets, revs] = await Promise.all([
        sb.from('sessions').select('*'),
        sb.from('sets').select('*'),
        sb.from('reviews').select('*'),
      ]);
      return { sessions: sess.data || [], sets: sets.data || [], reviews: revs.data || [] };
    } catch(err) {
      console.warn('sbSync.pullAll:', err);
      return null;
    }
  }

  return { ready: true, upsertSession, upsertSets, upsertReview, deleteSession, pullAll };
})();
</script>
<script type="text/babel">
```

- [ ] **Step 2: Verify sbSync is accessible**

Open `docs/index.html` in a browser (after running `python gen_key.py`). Open the console and run:
```javascript
sbSync.ready  // should be true if Supabase vars are set, false otherwise
```

Expected: `true` (with real keys) or `false` (local dev without keys — that's fine)

- [ ] **Step 3: Commit**

```bash
git add docs/index.html
git commit -m "feat: add supabase client and sbSync module"
```

---

## Task 4: App Startup Pull

**Files:**
- Modify: `docs/index.html` — inside `OlyTracker` function, add `applySupabaseData` and call it in `load()`

- [ ] **Step 1: Add applySupabaseData function**

Inside the `OlyTracker` function in `docs/index.html`, find the existing `applyRemoteData` function (around line 3356). Add the following function immediately after it (after the closing `}`):

```javascript
  async function applySupabaseData(remote) {
    if (remote.sessions.length > 0) {
      const logsObj = {};
      remote.sessions.forEach(s => {
        logsObj[s.id] = {
          week: s.week, dayName: s.day_name, dayLabel: s.day_label,
          date: s.date, notes: s.notes || '', weights: s.weights || '',
          backPain: s.back_pain || '0', nightShift: !!s.night_shift,
          techniqueFeel: s.technique_feel || '', energyLevel: s.energy_level || '',
          focusNext: s.focus_next || '', rating: s.rating || '',
        };
      });
      setLogs(logsObj);
      await storage.set('oly_logs', JSON.stringify(logsObj));
    }
    if (remote.sets.length > 0) {
      const setsMap = {};
      remote.sets.forEach(s => {
        const k = `sets_w${s.week}_${s.day_id}_${s.exercise_name}`;
        if (!setsMap[k]) setsMap[k] = [];
        setsMap[k][s.set_index] = { done: s.done, weight: s.weight };
      });
      Object.entries(setsMap).forEach(([k, arr]) => {
        localStorage.setItem(k, JSON.stringify(arr.filter(Boolean)));
      });
      setSyncRevision(r => r + 1);
    }
    if (remote.reviews.length > 0) {
      const revObj = {};
      remote.reviews.forEach(r => {
        revObj[r.week] = {
          rating: r.rating, energyTrend: r.energy_trend,
          injuries: r.injuries || [], generalNotes: r.general_notes || '',
          ai: r.ai_response || null, confirmed: r.confirmed, days: r.days || {},
        };
      });
      localStorage.setItem('oly_reviews', JSON.stringify(revObj));
    }
  }
```

- [ ] **Step 2: Call applySupabaseData in load()**

Inside the `load()` function, find the block that currently calls Gist pull on startup (around line 3320):
```javascript
      const gcfg=JSON.parse(localStorage.getItem("oly_gist")||"null");
      if(gcfg?.token&&gcfg?.id){
```

Add a Supabase pull call **before** that Gist block:
```javascript
      // Pull from Supabase on startup (takes priority over localStorage)
      if (sbSync.ready) {
        try {
          const remote = await sbSync.pullAll();
          if (remote) await applySupabaseData(remote);
        } catch { /* silent — continue with localStorage data */ }
      }
      const gcfg=JSON.parse(localStorage.getItem("oly_gist")||"null");
```

- [ ] **Step 3: Test startup pull**

Open the app. Open browser DevTools → Network tab. Look for requests to `supabase.co`. You should see 3 `GET` requests to `/rest/v1/sessions`, `/rest/v1/sets`, `/rest/v1/reviews`.

If Supabase tables are empty, nothing changes on screen (expected). If you previously pushed data, it should appear.

- [ ] **Step 4: Commit**

```bash
git add docs/index.html
git commit -m "feat: pull from supabase on app startup and merge into localstorage"
```

---

## Task 5: Dual-Write on All Write Paths

**Files:**
- Modify: `docs/index.html` — 4 locations

There are 4 places where training data is written to localStorage. Each gets a one-line fire-and-forget sync call after the write.

- [ ] **Step 1: Dual-write in ExCard.updateSet (sets checkboxes)**

Find `updateSet` inside `ExCard` (around line 615). The current code:
```javascript
  async function updateSet(idx, field, value) {
    const updated = sets.map((s, i) => i === idx ? {...s, [field]: value} : s);
    setSets(updated);
    if (sessionKey) {
      try {
        const key = `sets_${sessionKey}_${ex.name.replace(/\s+/g,'_')}`;
        await storage.set(key, JSON.stringify(updated));
        if (onSetsChange) onSetsChange();
      } catch {}
    }
  }
```

Replace with:
```javascript
  async function updateSet(idx, field, value) {
    const updated = sets.map((s, i) => i === idx ? {...s, [field]: value} : s);
    setSets(updated);
    if (sessionKey) {
      try {
        const key = `sets_${sessionKey}_${ex.name.replace(/\s+/g,'_')}`;
        await storage.set(key, JSON.stringify(updated));
        sbSync.upsertSets(key, updated);
        if (onSetsChange) onSetsChange();
      } catch {}
    }
  }
```

- [ ] **Step 2: Dual-write in handleLog (session completion)**

Find `handleLog` inside `OlyTracker` (around line 3441). Find the line:
```javascript
    try{await storage.set("oly_logs",JSON.stringify(updated));}catch{}
```

Replace with:
```javascript
    try{await storage.set("oly_logs",JSON.stringify(updated));}catch{}
    sbSync.upsertSession(key, updated[key]);
```

Note: `key` is already defined 2 lines above as `const key = logEditKey || \`${Date.now()}\``;

- [ ] **Step 3: Dual-write in deleteLog**

Find `deleteLog` (around line 3463):
```javascript
  async function deleteLog(key){
    const updated={...logs};
    delete updated[key];
    setLogs(updated);
    try{await storage.set("oly_logs",JSON.stringify(updated));}catch{}
  }
```

Replace with:
```javascript
  async function deleteLog(key){
    const updated={...logs};
    delete updated[key];
    setLogs(updated);
    try{await storage.set("oly_logs",JSON.stringify(updated));}catch{}
    sbSync.deleteSession(key);
  }
```

- [ ] **Step 4: Dual-write in reviewStorage.save**

Find `reviewStorage` near the top of the Babel block (around line 131). The current `save` method:
```javascript
  save:   (week, data) => {
    const all = reviewStorage.getAll();
    all[week] = { ...data, week, savedAt: new Date().toISOString() };
    try { localStorage.setItem(REVIEWS_KEY, JSON.stringify(all)); } catch { return null; }
    return all[week];
  },
```

Replace with:
```javascript
  save:   (week, data) => {
    const all = reviewStorage.getAll();
    all[week] = { ...data, week, savedAt: new Date().toISOString() };
    try { localStorage.setItem(REVIEWS_KEY, JSON.stringify(all)); } catch { return null; }
    sbSync.upsertReview(week, data);
    return all[week];
  },
```

- [ ] **Step 5: Test dual-write end to end**

1. Open the app. Open DevTools → Network tab, filter by `supabase`.
2. Tick a set checkbox on any exercise. You should see a `POST` to `/rest/v1/sets`.
3. Press COMPLETE SESSION and submit. You should see a `POST` to `/rest/v1/sessions`.
4. Open your Supabase dashboard → Table Editor → `sessions` table. Your session should appear.
5. Open `sets` table. The set rows should appear.

- [ ] **Step 6: Commit**

```bash
git add docs/index.html
git commit -m "feat: dual-write sets, sessions, and reviews to supabase on every change"
```

---

## Task 6: Migration Button in System Tab

**Files:**
- Modify: `docs/index.html` — add `SyncSection` component and include it in `SystemTab`

- [ ] **Step 1: Add SyncSection component**

In `docs/index.html`, find `function SystemTab({week})` (around line 2364). Add the following function **immediately before** `function SystemTab`:

```javascript
function SyncSection() {
  const [migrating, setMigrating] = React.useState(false);
  const [status, setStatus] = React.useState(null);

  async function migrate() {
    if (!sbSync.ready) { setStatus('Supabase not configured — check key.js'); return; }
    setMigrating(true);
    setStatus(null);
    try {
      const logs = JSON.parse(localStorage.getItem('oly_logs') || '{}');
      await Promise.all(Object.entries(logs).map(([id, e]) => sbSync.upsertSession(id, e)));

      const setKeys = Object.keys(localStorage).filter(k => k.startsWith('sets_'));
      await Promise.all(setKeys.map(k => {
        try { return sbSync.upsertSets(k, JSON.parse(localStorage.getItem(k) || '[]')); }
        catch { return Promise.resolve(); }
      }));

      const reviews = JSON.parse(localStorage.getItem('oly_reviews') || '{}');
      await Promise.all(Object.entries(reviews).map(([w, r]) => sbSync.upsertReview(parseInt(w), r)));

      const sCount = Object.keys(logs).length;
      const rCount = Object.keys(reviews).length;
      setStatus(`✓ Migrated ${sCount} sessions · ${setKeys.length} set records · ${rCount} reviews`);
    } catch(err) {
      setStatus(`Error: ${err.message}`);
    }
    setMigrating(false);
  }

  return (
    <div style={{marginTop:24,paddingTop:20,borderTop:"1px solid var(--border)"}}>
      <div style={{fontSize:9,color:"var(--text3)",fontFamily:"'DM Mono',monospace",letterSpacing:1.5,marginBottom:10}}>SUPABASE SYNC</div>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
        <div style={{width:7,height:7,borderRadius:"50%",background:sbSync.ready?"var(--green)":"var(--text3)"}}/>
        <span style={{fontSize:10,color:sbSync.ready?"var(--text2)":"var(--text3)",fontFamily:"'DM Mono',monospace"}}>
          {sbSync.ready ? "Connected" : "Not configured"}
        </span>
      </div>
      {sbSync.ready && (
        <button onClick={migrate} disabled={migrating}
          style={{padding:"9px 16px",borderRadius:7,border:"1px solid var(--border)",
            background:migrating?"var(--bg2)":"var(--bg1)",color:migrating?"var(--text3)":"var(--text2)",
            fontSize:10,fontFamily:"'DM Mono',monospace",letterSpacing:0.5,cursor:migrating?"default":"pointer"}}>
          {migrating ? "Migrating…" : "Migrate localStorage → Supabase"}
        </button>
      )}
      {status && (
        <div style={{marginTop:10,fontSize:10,color:status.startsWith("✓")?"var(--green)":"var(--red)",
          fontFamily:"'DM Mono',monospace",lineHeight:1.6}}>
          {status}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Include SyncSection in SystemTab**

Inside `SystemTab`, find the closing `</div>` of the return statement (the last `</div>` before the function ends). Before that closing tag, add:

```javascript
      <SyncSection />
```

- [ ] **Step 3: Test migration**

1. Open the app → SYSTEM tab → scroll to bottom.
2. You should see "SUPABASE SYNC" section with a green dot ("Connected") or grey dot ("Not configured").
3. Click "Migrate localStorage → Supabase".
4. Expected: button shows "Migrating…" for a few seconds, then status line appears: `✓ Migrated N sessions · M set records · R reviews`.
5. Open Supabase dashboard → Table Editor → verify rows exist in `sessions`, `sets`, `reviews`.

- [ ] **Step 4: Commit**

```bash
git add docs/index.html
git commit -m "feat: add supabase migration button to system tab"
```

---

## Task 7: Analytics Tab

**Files:**
- Modify: `docs/index.html` — add `AnalyticsTab` component, add tab to nav, render it

- [ ] **Step 1: Add AnalyticsTab component**

In `docs/index.html`, find `function Reports({prs, logs, week})` (around line 2179). Add the following component **immediately before** it:

```javascript
function AnalyticsTab({ prs, logs, week }) {
  const setsData = useMemo(() => {
    const d = {};
    Object.keys(localStorage).filter(k => k.startsWith('sets_')).forEach(k => {
      try { d[k] = JSON.parse(localStorage.getItem(k) || '[]'); } catch {}
    });
    return d;
  }, []);

  const completionByWeek = useMemo(() => {
    const counts = {};
    Object.values(logs).forEach(l => { if (l.week) counts[l.week] = (counts[l.week] || 0) + 1; });
    const maxW = Math.max(week, ...Object.keys(counts).map(Number), 1);
    return Array.from({ length: maxW }, (_, i) => ({ label: `W${i+1}`, sessions: counts[i+1] || 0 }));
  }, [logs, week]);

  const exFreq = useMemo(() => {
    const m = {};
    Object.entries(setsData).forEach(([key, arr]) => {
      const match = key.match(/^sets_w\d+_d\d+_(.+)$/);
      if (!match) return;
      const exName = match[1].replace(/_/g, ' ').split(' — ')[0];
      if (!m[exName]) m[exName] = 0;
      arr.forEach(s => { if (s.done) m[exName]++; });
    });
    return Object.entries(m).filter(([,v]) => v > 0).sort((a,b) => b[1]-a[1]).slice(0, 12)
      .map(([name, sets]) => ({ name, sets }));
  }, [setsData]);

  const PR_LIFTS = [
    { key: 'Snatch (Floor)', label: 'SNATCH', color: 'var(--gold)' },
    { key: 'Clean & Jerk', label: 'C&J', color: 'var(--blue)' },
    { key: 'Clean', label: 'CLEAN', color: 'var(--green)' },
    { key: 'Back Squat', label: 'BACK SQUAT', color: 'var(--purple)' },
    { key: 'Hang Power Snatch', label: 'HNG PWR SNATCH', color: 'var(--red)' },
  ];

  const sec = { marginBottom: 28 };
  const hd = { fontFamily: "'Bebas Neue',sans-serif", fontSize: 20, letterSpacing: 1, color: 'var(--text)', marginBottom: 14 };
  const sub = { fontSize: 9, color: 'var(--text3)', fontFamily: "'DM Mono',monospace", marginBottom: 8, letterSpacing: 1.5 };

  return (
    <div className="fade">

      {/* Sync status pill */}
      <div style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 12px',
        borderRadius:8, background:'var(--bg1)', border:'1px solid var(--border)', marginBottom:20 }}>
        <div style={{ width:7, height:7, borderRadius:'50%', background: sbSync.ready ? 'var(--green)' : 'var(--text3)', flexShrink:0 }}/>
        <span style={{ fontSize:10, color: sbSync.ready ? 'var(--text2)' : 'var(--text3)', fontFamily:"'DM Mono',monospace" }}>
          {sbSync.ready ? 'SUPABASE CONNECTED · DATA PERSISTED' : 'SUPABASE NOT CONFIGURED · LOCALSTORAGE ONLY'}
        </span>
      </div>

      {/* Weekly sessions chart */}
      <div style={sec}>
        <div style={hd}>SESSIONS PER WEEK</div>
        <div style={sub}>LOGGED SESSIONS (TARGET: 5)</div>
        {completionByWeek.length > 0 ? (
          <>
            <div style={{ display:'flex', gap:3, alignItems:'flex-end', height:80, background:'var(--bg)', borderRadius:6, padding:'8px 6px 4px' }}>
              {completionByWeek.map((w, i) => {
                const h = Math.max(0, (w.sessions / 5) * 60);
                const col = w.sessions >= 5 ? 'var(--green)' : w.sessions >= 3 ? 'var(--gold)' : w.sessions > 0 ? 'var(--red)' : 'var(--bg3)';
                return (
                  <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'flex-end', height:64 }}>
                    <div style={{ width:'100%', height:h, background:col, borderRadius:'2px 2px 0 0', minHeight: w.sessions > 0 ? 3 : 0, transition:'height 0.2s' }}/>
                  </div>
                );
              })}
            </div>
            <div style={{ display:'flex', justifyContent:'space-between', marginTop:4 }}>
              {[0, Math.floor(completionByWeek.length/2), completionByWeek.length-1]
                .filter((v,i,a) => a.indexOf(v)===i)
                .map(i => (
                  <span key={i} style={{ fontSize:8, color:'var(--text3)', fontFamily:"'DM Mono',monospace" }}>
                    {completionByWeek[i]?.label}
                  </span>
                ))}
            </div>
          </>
        ) : (
          <div style={{ color:'var(--text3)', fontSize:12, fontFamily:"'DM Mono',monospace" }}>No sessions logged yet.</div>
        )}
      </div>

      {/* PR Progression */}
      <div style={sec}>
        <div style={hd}>PR PROGRESSION</div>
        {PR_LIFTS.map(lift => {
          const entry = prs[lift.key];
          if (!entry?.history?.length || entry.history.length < 2) return null;
          const chartData = [...entry.history]
            .sort((a, b) => (a.date||'').localeCompare(b.date||''))
            .map(h => ({ date: h.date, weight: h.weight, label: h.date?.slice(5)||'' }));
          return (
            <div key={lift.key} style={{ marginBottom:20 }}>
              <div style={sub}>{lift.label}</div>
              <SVGLineChart data={chartData} height={100}
                series={[{ key:'weight', color:lift.color, label:`${lift.label} (kg)` }]} />
            </div>
          );
        })}
        {PR_LIFTS.every(l => !prs[l.key]?.history || prs[l.key].history.length < 2) && (
          <div style={{ color:'var(--text3)', fontSize:12, fontFamily:"'DM Mono',monospace" }}>Log PRs to see progression charts.</div>
        )}
      </div>

      {/* Exercise frequency */}
      <div style={sec}>
        <div style={hd}>TOP EXERCISES</div>
        <div style={sub}>COMPLETED SETS ACROSS ALL WEEKS</div>
        {exFreq.length > 0 ? (
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {exFreq.map((ex, i) => {
              const pct = Math.round((ex.sets / exFreq[0].sets) * 100);
              return (
                <div key={ex.name} style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <span style={{ width:16, fontSize:9, color:'var(--text3)', fontFamily:"'DM Mono',monospace", textAlign:'right', flexShrink:0 }}>{i+1}</span>
                  <div style={{ flex:1 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                      <span style={{ fontSize:12, color:'var(--text)', fontFamily:"'Bebas Neue',sans-serif", letterSpacing:0.3 }}>{ex.name}</span>
                      <span style={{ fontSize:9, color:'var(--text2)', fontFamily:"'DM Mono',monospace" }}>{ex.sets} sets</span>
                    </div>
                    <div style={{ height:4, background:'var(--bg2)', borderRadius:2 }}>
                      <div style={{ height:'100%', width:`${pct}%`, background:'var(--gold)', borderRadius:2 }}/>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ color:'var(--text3)', fontSize:12, fontFamily:"'DM Mono',monospace" }}>Complete sets to see exercise rankings.</div>
        )}
      </div>

    </div>
  );
}
```

- [ ] **Step 2: Add "ANALYTICS" to the tab nav**

Find the tab list in `docs/index.html` (around line 3541):
```javascript
{[["program","PROGRAM"],["mobility","MOBILITY"],["supps","SUPPS"],["log","LOG"],["prs","PRs"],["reports","REPORTS"],["system","SYSTEM"]].map(([id,lbl])=>(
```

Replace with:
```javascript
{[["program","PROGRAM"],["mobility","MOBILITY"],["supps","SUPPS"],["log","LOG"],["prs","PRs"],["reports","REPORTS"],["analytics","ANALYTICS"],["system","SYSTEM"]].map(([id,lbl])=>(
```

- [ ] **Step 3: Render AnalyticsTab**

Find the line that renders the Reports tab (around line 4123):
```javascript
        {tab==="reports" && <Reports prs={prs} logs={logs} week={week}/>}
```

Add immediately after it:
```javascript
        {tab==="analytics" && <AnalyticsTab prs={prs} logs={logs} week={week}/>}
```

- [ ] **Step 4: Bump version to v2.7**

Find `PROGRAM v2.6 · 2026-05-25` in the header and change to `PROGRAM v2.7 · 2026-05-25`.

- [ ] **Step 5: Test Analytics tab**

1. Open the app → ANALYTICS tab.
2. Verify the Supabase status pill shows correct state (green dot if configured).
3. Sessions per week: bars should appear for any weeks you've logged sessions.
4. PR Progression: charts appear for lifts that have ≥2 PR history entries.
5. Top Exercises: ranked list appears for any exercises with completed sets.
6. All sections show "no data" placeholders if empty — not blank or broken.

- [ ] **Step 6: Commit**

```bash
git add docs/index.html
git commit -m "feat: add analytics tab with weekly sessions, PR progression, and exercise frequency"
```

---

## Self-Review

**Spec coverage check:**
- ✅ Offline-first dual-write (Tasks 3, 5) — all writes go to localStorage first, Supabase is fire-and-forget
- ✅ 3-table schema — `sessions`, `sets`, `reviews` in Task 1
- ✅ On-load pull + merge — Task 4
- ✅ One-time migration — Task 6
- ✅ PR tracking — Task 7 (PR Progression chart)
- ✅ Weekly volume/load — already in existing Reports tab (LoadDevelopment), now backed by durable Supabase data after sync
- ✅ Session completion rate — Task 7 (Sessions Per Week chart)
- ✅ Exercise frequency — Task 7 (Top Exercises chart)

**Placeholder scan:** None found. All code blocks are complete.

**Type consistency:**
- `sbSync.upsertSession(id, entry)` — `id` is the log key string, `entry` is the log object. Consistent across Task 3 (definition), Task 5 Steps 1-2 (calls), Task 6 (migration).
- `sbSync.upsertSets(lsKey, setsArr)` — `lsKey` is `sets_w1_d1_Muscle_Snatch`, `setsArr` is `[{done, weight}]`. Consistent throughout.
- `applySupabaseData(remote)` — `remote` has `.sessions[]`, `.sets[]`, `.reviews[]`. Matches `pullAll()` return shape.
- `AnalyticsTab({ prs, logs, week })` — same prop signature as `Reports`. Consistent with call site in Step 3.
