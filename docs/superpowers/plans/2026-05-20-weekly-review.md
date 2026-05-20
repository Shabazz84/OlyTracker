# Weekly Review Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a structured end-of-week review form to the WEEK PLAN tab that calls a local LM Studio model (OpenAI-compatible API) to generate training recommendations and flags for the following week.

**Architecture:** All code lives in `docs/index.html` (single-file React 18 + Babel standalone PWA). Two new global helper objects (`reviewStorage`, `lmCfgStorage`) read/write to localStorage. `WeekReviewForm` renders below the week's day cards; it calls LM Studio, parses structured JSON flags from the response, and saves them. `ProgramWeekView` reads the previous week's confirmed review and shows a flags banner + per-day indicators at the top of the next week's view. `LmSettingsPanel` lives in the Settings tab.

**Tech Stack:** React 18 (Babel standalone, no build step), localStorage, LM Studio OpenAI-compatible API at `localhost:1234/v1/chat/completions`.

---

## File Structure

Single file: `docs/index.html`

| What | Where to insert | Marker to find |
|------|-----------------|----------------|
| `reviewStorage`, `lmCfgStorage` | After `storage` object | `// ── Sleep quality badges` |
| `callLmStudio`, `parseAiResponse`, `buildReviewPrompt` | After storage helpers | same block |
| `LmSettingsPanel` component | Before `ProgramWeekView` | `function ProgramWeekView(` |
| `WeekReviewForm` component | Before `ProgramWeekView` | same |
| `ProgramWeekView` — flags banner + WeekReviewForm | Inside existing function | `return (` inside ProgramWeekView |
| LM settings UI | Inside Settings tab JSX | `{/* GitHub Sync */}` closing `</div>` |

---

## Data Shapes

```javascript
// localStorage key: "oly_reviews"  →  { [weekNum]: ReviewData }
ReviewData = {
  week: 1,
  savedAt: "ISO string",
  rating: "green" | "yellow" | "red",
  energyTrend: "good" | "stable" | "declining",
  days: {
    "d1": { status: "done" | "partial" | "skipped", notes: "string" },
    // ...one entry per day in DAYS_SUMMER or DAYS_SCHOOL
  },
  injuries: [{ bodyPart: "left bicep", type: "sharp" | "dull", severity: "mild" | "moderate" | "bad" }],
  generalNotes: "string",
  ai: {
    narrative: "string",
    loadRecommendation: "advance" | "hold" | "reduce",
    skipExercises: ["Exercise Name", ...],
    reduceLoadExercises: ["Exercise Name", ...],
    flags: [{ day: "d1", exercise: "Muscle Snatch", action: "skip" | "reduce", reason: "string" }],
    generatedAt: "ISO string",
  } | null,
  confirmed: boolean,
}

// localStorage key: "oly_lm_cfg"
LmCfg = { baseUrl: "http://localhost:1234/v1", model: "string" }
```

---

## Task 1: Storage helpers

**Files:**
- Modify: `docs/index.html` — insert after `// ── Sleep quality badges` comment

- [ ] **Step 1: Find insertion point**

Search for `// ── Sleep quality badges` in `docs/index.html`. Insert the block below immediately before that comment.

- [ ] **Step 2: Insert `reviewStorage` and `lmCfgStorage`**

```javascript
// ── Review storage ────────────────────────────────────────────────────────────
const REVIEWS_KEY = "oly_reviews";
const reviewStorage = {
  getAll: () => { try { return JSON.parse(localStorage.getItem(REVIEWS_KEY)||"{}"); } catch { return {}; } },
  get:    (week) => reviewStorage.getAll()[week] || null,
  save:   (week, data) => {
    const all = reviewStorage.getAll();
    all[week] = { ...data, week, savedAt: new Date().toISOString() };
    localStorage.setItem(REVIEWS_KEY, JSON.stringify(all));
    return all[week];
  },
};

const LM_CFG_KEY = "oly_lm_cfg";
const lmCfgStorage = {
  get:  () => { try { return JSON.parse(localStorage.getItem(LM_CFG_KEY)||"null") || { baseUrl:"http://localhost:1234/v1", model:"" }; } catch { return { baseUrl:"http://localhost:1234/v1", model:"" }; } },
  save: (cfg) => { localStorage.setItem(LM_CFG_KEY, JSON.stringify(cfg)); },
};
```

- [ ] **Step 3: Verify in browser console**

Open the app, open DevTools console, run:
```javascript
reviewStorage.save(99, { rating:"green", test:true });
console.log(reviewStorage.get(99)); // → {rating:"green",test:true,week:99,savedAt:"..."}
console.log(lmCfgStorage.get());    // → {baseUrl:"http://localhost:1234/v1", model:""}
```

- [ ] **Step 4: Commit**

```bash
git add docs/index.html
git commit -m "feat: add reviewStorage and lmCfgStorage helpers"
```

---

## Task 2: LM Studio client + prompt builder

**Files:**
- Modify: `docs/index.html` — insert in the same block, after `lmCfgStorage`

- [ ] **Step 1: Insert `callLmStudio`**

```javascript
// ── LM Studio client ──────────────────────────────────────────────────────────
async function callLmStudio(systemPrompt, userPrompt, cfg) {
  const res = await fetch(`${cfg.baseUrl}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: cfg.model || "local-model",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user",   content: userPrompt },
      ],
      temperature: 0.3,
      max_tokens: 1200,
    }),
  });
  if (!res.ok) throw new Error(`LM Studio ${res.status}: ${res.statusText}`);
  const data = await res.json();
  return data.choices[0].message.content;
}
```

- [ ] **Step 2: Insert `parseAiResponse`**

```javascript
function parseAiResponse(text) {
  const match = text.match(/```json\n?([\s\S]*?)\n?```/);
  if (match) {
    try {
      const p = JSON.parse(match[1]);
      return {
        narrative:             p.narrative             || text,
        loadRecommendation:    p.loadRecommendation    || "hold",
        skipExercises:         Array.isArray(p.skipExercises)        ? p.skipExercises        : [],
        reduceLoadExercises:   Array.isArray(p.reduceLoadExercises)  ? p.reduceLoadExercises  : [],
        flags:                 Array.isArray(p.flags)                ? p.flags                : [],
        generatedAt:           new Date().toISOString(),
      };
    } catch {}
  }
  // Fallback: no JSON block found — store raw text as narrative only
  return { narrative: text, loadRecommendation: "hold", skipExercises: [], reduceLoadExercises: [], flags: [], generatedAt: new Date().toISOString() };
}
```

- [ ] **Step 3: Insert `buildReviewPrompt`**

```javascript
function buildReviewPrompt(week, weekData, formData, isSummer) {
  const dayList = isSummer ? DAYS_SUMMER : DAYS_SCHOOL;

  const exerciseList = dayList.map(d =>
    `${d.label}: ${d.exercises.map(e => e.name).join(", ")}`
  ).join("\n");

  const weekLog = dayList.map(d => {
    const ds = formData.days[d.id] || { status: "done", notes: "" };
    return `${d.label}: ${ds.status.toUpperCase()}${ds.notes ? ` — ${ds.notes}` : ""}`;
  }).join("\n");

  const injuryText = formData.injuries.length > 0
    ? formData.injuries.map(inj => `${inj.bodyPart} (${inj.type} pain, severity: ${inj.severity})`).join("; ")
    : "None reported";

  const system = `You are an Olympic weightlifting coach reviewing a training week for a specific athlete. Give concrete, safe recommendations for the following week.

ATHLETE PROFILE:
- 102.5 kg bodyweight, intermediate strength background transitioning to Olympic weightlifting
- Bests: Back Squat 118 kg, Front Squat 102 kg, Clean 80 kg, Jerk ~65 kg, OHS 50 kg
- Jerk is far behind clean — priority weak point. OHS stability is the primary snatch ceiling.
- Chronic back pain (manageable). Push jerk only — NO split jerk.
- Night shifts Wed–Sun 7pm–7:30am (5.5h sleep Thu/Sat training days).
- Current block: Block 1 Hypertrophy Foundation — no full competition lifts from floor.

INJURY PROTOCOL (apply strictly):
- Sharp pain reported → skip ALL exercises loading that structure for minimum 7 days
- Left bicep / shoulder / elbow injury → skip all overhead pressing, pulling, and snatch-pattern exercises
- Lower back sharp pain → skip all spinal loading (squats, pulls, presses)
- Dull ache → reduce load 15%, monitor
- Jerk priority: preserve jerk work unless the injury directly involves the jerk mechanics (shoulder, elbow, wrist)

RESPONSE FORMAT — output a \`\`\`json block with this exact shape, then an optional coaching note after it:
{
  "narrative": "2-3 sentence plain-English summary of the week and key issue",
  "loadRecommendation": "advance" | "hold" | "reduce",
  "skipExercises": ["Exact Exercise Name As Listed Below", ...],
  "reduceLoadExercises": ["Exact Exercise Name As Listed Below", ...],
  "flags": [
    { "day": "d1", "exercise": "Exact Exercise Name", "action": "skip" | "reduce", "reason": "brief reason" }
  ]
}
Use ONLY exercise names exactly as they appear in PLANNED EXERCISES below.`;

  const user = `WEEK ${week} — ${weekData.phase} (${weekData.load})
Focus: ${weekData.focus}
Note: ${weekData.note}

PLANNED EXERCISES:
${exerciseList}

WEEK LOG:
${weekLog}

INJURIES THIS WEEK:
${injuryText}

ADDITIONAL NOTES:
${formData.generalNotes || "None"}`;

  return { system, user };
}
```

- [ ] **Step 4: Verify prompt builds without error**

In browser console:
```javascript
const w = PROGRAM_B1[0];
const form = { days: { d1:{status:"done",notes:""}, d2:{status:"done",notes:""}, d3:{status:"partial",notes:"stopped after MS — left bicep sharp pain"}, d4:{status:"done",notes:""}, d5:{status:"done",notes:""} }, injuries: [{bodyPart:"left bicep",type:"sharp",severity:"bad"}], generalNotes:"" };
const { system, user } = buildReviewPrompt(1, w, form, true);
console.log(user);  // should show week log, exercises, injury
```

- [ ] **Step 5: Commit**

```bash
git add docs/index.html
git commit -m "feat: add LM Studio client, prompt builder, and response parser"
```

---

## Task 3: WeekReviewForm component

**Files:**
- Modify: `docs/index.html` — insert immediately before `function ProgramWeekView(`

- [ ] **Step 1: Insert `LmSettingsPanel` component** (small, needed by Settings tab in Task 5)

```javascript
function LmSettingsPanel() {
  const [cfg, setCfg] = React.useState(lmCfgStorage.get);
  const [saved, setSaved] = React.useState(false);
  const save = () => { lmCfgStorage.save(cfg); setSaved(true); setTimeout(() => setSaved(false), 2000); };
  return (
    <div>
      <div style={{marginBottom:6}}>
        <div style={{fontSize:9,color:"var(--text3)",fontFamily:"'DM Mono',monospace",letterSpacing:1,marginBottom:3}}>BASE URL</div>
        <input value={cfg.baseUrl} onChange={e=>setCfg(c=>({...c,baseUrl:e.target.value}))}
          placeholder="http://localhost:1234/v1"
          style={{width:"100%",boxSizing:"border-box",background:"var(--bg3)",border:"1px solid var(--border2)",
            borderRadius:5,color:"var(--text)",padding:"6px 10px",fontSize:10,fontFamily:"'DM Mono',monospace"}}/>
      </div>
      <div style={{marginBottom:10}}>
        <div style={{fontSize:9,color:"var(--text3)",fontFamily:"'DM Mono',monospace",letterSpacing:1,marginBottom:3}}>MODEL NAME</div>
        <input value={cfg.model} onChange={e=>setCfg(c=>({...c,model:e.target.value}))}
          placeholder="e.g. qwen3.5-30b-a3b"
          style={{width:"100%",boxSizing:"border-box",background:"var(--bg3)",border:"1px solid var(--border2)",
            borderRadius:5,color:"var(--text)",padding:"6px 10px",fontSize:10,fontFamily:"'DM Mono',monospace"}}/>
      </div>
      <Btn small onClick={save} style={saved?{color:"#5a9e45",borderColor:"#5a9e45"}:{color:"var(--gold)",borderColor:"var(--gold)"}}>
        {saved ? "✓ SAVED" : "SAVE"}
      </Btn>
    </div>
  );
}
```

- [ ] **Step 2: Insert `WeekReviewForm` component**

```javascript
function WeekReviewForm({ week, weekData, isSummer, onSaved }) {
  const dayList = isSummer ? DAYS_SUMMER : DAYS_SCHOOL;
  const blankDays = {};
  dayList.forEach(d => { blankDays[d.id] = { status:"done", notes:"" }; });

  const [form, setForm] = React.useState(() => {
    const saved = reviewStorage.get(week);
    return saved
      ? { rating:"green", energyTrend:"stable", days:blankDays, injuries:[], generalNotes:"", ai:null, confirmed:false, ...saved }
      : { rating:"green", energyTrend:"stable", days:blankDays, injuries:[], generalNotes:"", ai:null, confirmed:false };
  });
  const [aiLoading, setAiLoading] = React.useState(false);
  const [aiError,   setAiError]   = React.useState(null);
  const [expanded,  setExpanded]  = React.useState(false);

  // Reset form state if week changes while component is mounted
  React.useEffect(() => {
    const saved = reviewStorage.get(week);
    setForm(saved
      ? { rating:"green", energyTrend:"stable", days:blankDays, injuries:[], generalNotes:"", ai:null, confirmed:false, ...saved }
      : { rating:"green", energyTrend:"stable", days:blankDays, injuries:[], generalNotes:"", ai:null, confirmed:false });
    setExpanded(false);
    setAiError(null);
  }, [week]);

  const setDay     = (id, patch) => setForm(f => ({ ...f, days:{ ...f.days, [id]:{ ...f.days[id], ...patch } } }));
  const addInjury  = ()          => setForm(f => ({ ...f, injuries:[...f.injuries,{ bodyPart:"", type:"sharp", severity:"moderate" }] }));
  const setInjury  = (i, patch)  => setForm(f => ({ ...f, injuries:f.injuries.map((inj,idx) => idx===i ? {...inj,...patch} : inj) }));
  const removeInj  = (i)         => setForm(f => ({ ...f, injuries:f.injuries.filter((_,idx) => idx!==i) }));

  const handleGenerate = async () => {
    const cfg = lmCfgStorage.get();
    if (!cfg.baseUrl) { setAiError("No LM Studio URL configured. Go to Settings → LM STUDIO."); return; }
    setAiLoading(true);
    setAiError(null);
    try {
      const { system, user } = buildReviewPrompt(week, weekData, form, isSummer);
      const raw    = await callLmStudio(system, user, cfg);
      const parsed = parseAiResponse(raw);
      setForm(f => ({ ...f, ai: parsed }));
    } catch (e) {
      setAiError(e.message || "LM Studio unreachable. Is it running on localhost:1234?");
    } finally {
      setAiLoading(false);
    }
  };

  const handleSave = () => {
    const saved = reviewStorage.save(week, { ...form, confirmed:true });
    setForm(prev => ({ ...prev, confirmed:true }));
    onSaved(saved);
  };

  const pill = (active, color) => ({
    padding:"4px 10px", borderRadius:12, fontSize:10, cursor:"pointer",
    fontFamily:"'DM Mono',monospace", letterSpacing:0.5, border:`1px solid ${active?color:"var(--border)"}`,
    background:active?`${color}22`:"transparent", color:active?color:"var(--text3)",
  });

  const STATUS_COLOR = { done:"#5a9e45", partial:"#d4a843", skipped:"#c94f3a" };

  if (!expanded) {
    return (
      <div style={{marginTop:16,borderTop:"1px solid var(--border)",paddingTop:14}}>
        <button onClick={()=>setExpanded(true)}
          style={{width:"100%",padding:"9px 14px",borderRadius:8,border:"1px solid var(--border)",
            background:"var(--bg2)",color:"var(--text2)",fontSize:11,
            fontFamily:"'DM Mono',monospace",letterSpacing:0.5,cursor:"pointer",textAlign:"left"}}>
          {form.confirmed ? "✓ WEEK REVIEW SAVED  ·  tap to edit" : "▸ WEEK REVIEW"}
        </button>
      </div>
    );
  }

  return (
    <div style={{marginTop:16,borderTop:"1px solid var(--border)",paddingTop:14}}>
      <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:14,letterSpacing:0.5,marginBottom:12,color:"var(--gold)"}}>
        WEEK {week} REVIEW
      </div>

      {/* Overall rating + energy */}
      <div style={{marginBottom:14}}>
        <div style={{fontSize:9,color:"var(--text3)",fontFamily:"'DM Mono',monospace",letterSpacing:1.5,marginBottom:6}}>OVERALL</div>
        <div style={{display:"flex",gap:6,marginBottom:6,flexWrap:"wrap"}}>
          {[{val:"green",label:"🟢 Good",color:"#5a9e45"},{val:"yellow",label:"🟡 OK",color:"#d4a843"},{val:"red",label:"🔴 Rough",color:"#c94f3a"}]
            .map(o => <button key={o.val} onClick={()=>setForm(f=>({...f,rating:o.val}))} style={pill(form.rating===o.val,o.color)}>{o.label}</button>)}
        </div>
        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
          {[{val:"good",label:"Energy full"},{val:"stable",label:"Stable"},{val:"declining",label:"Fading"}]
            .map(o => <button key={o.val} onClick={()=>setForm(f=>({...f,energyTrend:o.val}))} style={pill(form.energyTrend===o.val,"#888")}>{o.label}</button>)}
        </div>
      </div>

      {/* Sessions */}
      <div style={{marginBottom:14}}>
        <div style={{fontSize:9,color:"var(--text3)",fontFamily:"'DM Mono',monospace",letterSpacing:1.5,marginBottom:6}}>SESSIONS</div>
        {dayList.map(d => {
          const ds = form.days[d.id] || { status:"done", notes:"" };
          return (
            <div key={d.id} style={{marginBottom:6,padding:"8px 10px",background:"var(--bg3)",borderRadius:6}}>
              <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap",marginBottom:ds.status!=="done"?6:0}}>
                <span style={{fontSize:10,fontFamily:"'DM Mono',monospace",color:"var(--text2)",minWidth:56,flexShrink:0}}>{d.label.split(" ").slice(0,2).join(" ")}</span>
                {["done","partial","skipped"].map(s => (
                  <button key={s} onClick={()=>setDay(d.id,{status:s})} style={pill(ds.status===s, STATUS_COLOR[s])}>
                    {s.charAt(0).toUpperCase()+s.slice(1)}
                  </button>
                ))}
              </div>
              {ds.status!=="done" && (
                <input value={ds.notes} onChange={e=>setDay(d.id,{notes:e.target.value})}
                  placeholder="What happened / what was modified…"
                  style={{width:"100%",boxSizing:"border-box",background:"var(--bg2)",border:"1px solid var(--border)",
                    borderRadius:4,color:"var(--text)",padding:"5px 8px",fontSize:10}}/>
              )}
            </div>
          );
        })}
      </div>

      {/* Injuries */}
      <div style={{marginBottom:14}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6}}>
          <div style={{fontSize:9,color:"var(--text3)",fontFamily:"'DM Mono',monospace",letterSpacing:1.5}}>INJURIES / ISSUES</div>
          <button onClick={addInjury}
            style={{fontSize:9,padding:"2px 8px",borderRadius:10,border:"1px solid var(--border)",
              background:"transparent",color:"var(--text3)",cursor:"pointer",fontFamily:"'DM Mono',monospace"}}>+ ADD</button>
        </div>
        {form.injuries.length===0 && (
          <div style={{fontSize:10,color:"var(--text3)",fontStyle:"italic"}}>None — tap + ADD if needed</div>
        )}
        {form.injuries.map((inj,i) => (
          <div key={i} style={{marginBottom:6,padding:"8px 10px",background:"var(--bg3)",borderRadius:6,display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}>
            <input value={inj.bodyPart} onChange={e=>setInjury(i,{bodyPart:e.target.value})}
              placeholder="Body part (e.g. left bicep)"
              style={{flex:1,minWidth:90,background:"var(--bg2)",border:"1px solid var(--border)",
                borderRadius:4,color:"var(--text)",padding:"4px 7px",fontSize:10}}/>
            {["sharp","dull"].map(t => <button key={t} onClick={()=>setInjury(i,{type:t})} style={pill(inj.type===t,t==="sharp"?"#c94f3a":"#d4a843")}>{t}</button>)}
            {["mild","moderate","bad"].map(s => <button key={s} onClick={()=>setInjury(i,{severity:s})} style={pill(inj.severity===s,"#888")}>{s}</button>)}
            <button onClick={()=>removeInj(i)} style={{fontSize:11,background:"transparent",border:"none",color:"var(--text3)",cursor:"pointer"}}>✕</button>
          </div>
        ))}
      </div>

      {/* Notes */}
      <div style={{marginBottom:14}}>
        <div style={{fontSize:9,color:"var(--text3)",fontFamily:"'DM Mono',monospace",letterSpacing:1.5,marginBottom:4}}>NOTES FOR NEXT WEEK</div>
        <textarea value={form.generalNotes} onChange={e=>setForm(f=>({...f,generalNotes:e.target.value}))}
          placeholder="Anything else the coach should know…" rows={2}
          style={{width:"100%",boxSizing:"border-box",background:"var(--bg2)",border:"1px solid var(--border)",
            borderRadius:6,color:"var(--text)",padding:"7px 10px",fontSize:11,resize:"vertical"}}/>
      </div>

      {/* Generate AI Review button */}
      <button onClick={handleGenerate} disabled={aiLoading}
        style={{width:"100%",padding:"10px",borderRadius:8,
          border:`1px solid ${aiLoading?"var(--border)":"var(--gold)"}`,
          background:aiLoading?"transparent":"#d4a84311",
          color:aiLoading?"var(--text3)":"var(--gold)",
          fontSize:11,fontFamily:"'DM Mono',monospace",letterSpacing:0.5,
          cursor:aiLoading?"default":"pointer",marginBottom:8}}>
        {aiLoading ? "GENERATING…" : "⚡ GENERATE AI REVIEW"}
      </button>

      {aiError && (
        <div style={{fontSize:10,color:"#c94f3a",marginBottom:10,padding:"7px 10px",
          background:"#c94f3a11",borderRadius:6,border:"1px solid #c94f3a33"}}>
          {aiError}
        </div>
      )}

      {/* AI result */}
      {form.ai && (
        <div style={{marginBottom:14,padding:"12px 14px",background:"var(--bg2)",borderRadius:8,border:"1px solid var(--gold)33"}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
            <span style={{fontSize:9,color:"var(--gold)",fontFamily:"'DM Mono',monospace",letterSpacing:1.5}}>AI REVIEW</span>
            <span style={{fontSize:9,fontFamily:"'DM Mono',monospace",letterSpacing:0.5,
              color:form.ai.loadRecommendation==="advance"?"#5a9e45":form.ai.loadRecommendation==="reduce"?"#c94f3a":"#d4a843",
              background:form.ai.loadRecommendation==="advance"?"#5a9e4522":form.ai.loadRecommendation==="reduce"?"#c94f3a22":"#d4a84322",
              padding:"1px 7px",borderRadius:8}}>
              {form.ai.loadRecommendation.toUpperCase()}
            </span>
          </div>
          <div style={{fontSize:11,color:"var(--text2)",lineHeight:1.7,marginBottom:form.ai.flags.length>0?10:0}}>
            {form.ai.narrative}
          </div>
          {form.ai.flags.length > 0 && (
            <>
              <div style={{fontSize:9,color:"var(--text3)",fontFamily:"'DM Mono',monospace",letterSpacing:1,marginBottom:5}}>NEXT WEEK FLAGS</div>
              {form.ai.flags.map((f,i) => (
                <div key={i} style={{display:"flex",alignItems:"baseline",gap:6,marginBottom:4}}>
                  <span style={{fontSize:9,fontFamily:"'DM Mono',monospace",flexShrink:0,
                    color:f.action==="skip"?"#c94f3a":"#d4a843",
                    background:f.action==="skip"?"#c94f3a22":"#d4a84322",
                    padding:"1px 6px",borderRadius:8}}>
                    {f.action.toUpperCase()}
                  </span>
                  <span style={{fontSize:10,color:"var(--text)"}}>{f.exercise}</span>
                  <span style={{fontSize:9,color:"var(--text3)"}}>— {f.reason}</span>
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {/* Save + Close */}
      <div style={{display:"flex",gap:8}}>
        <button onClick={handleSave}
          style={{flex:1,padding:"10px",borderRadius:8,border:"1px solid #5a9e45",
            background:"#5a9e4511",color:"#5a9e45",fontSize:11,
            fontFamily:"'DM Mono',monospace",letterSpacing:0.5,cursor:"pointer"}}>
          {form.confirmed ? "✓ SAVED  ·  UPDATE" : "SAVE REVIEW"}
        </button>
        <button onClick={()=>setExpanded(false)}
          style={{padding:"10px 14px",borderRadius:8,border:"1px solid var(--border)",
            background:"transparent",color:"var(--text3)",fontSize:11,cursor:"pointer"}}>
          CLOSE
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verify in browser**

Navigate to WEEK PLAN tab, go to current week (week 1). Scroll to bottom — should see "▸ WEEK REVIEW" collapsed button. Tap it — form expands with 5 session rows (Done/Partial/Skipped), injuries section, notes, Generate button.

- [ ] **Step 4: Commit**

```bash
git add docs/index.html
git commit -m "feat: add WeekReviewForm and LmSettingsPanel components"
```

---

## Task 4: Flags banner in ProgramWeekView

**Files:**
- Modify: `docs/index.html` — inside `function ProgramWeekView(`

- [ ] **Step 1: Add `reviewVersion` state and `prevReview` memo**

Find the start of `function ProgramWeekView({viewWeek, onWeekChange, currentWeek, isSummer})`. After the line `if (!weekData) return null;`, add:

```javascript
  const [reviewVersion, setReviewVersion] = React.useState(0);
  const prevReview = React.useMemo(
    () => viewWeek > 1 ? reviewStorage.get(viewWeek - 1) : null,
    [viewWeek, reviewVersion]
  );
  const activeFlags = prevReview?.confirmed && prevReview?.ai?.flags?.length > 0
    ? prevReview.ai.flags
    : [];
```

- [ ] **Step 2: Add flags banner to JSX**

Find the block that renders `{isCurrentWeek && (...CURRENT WEEK...)}` in ProgramWeekView's return. Immediately after that block, insert:

```jsx
      {activeFlags.length > 0 && (
        <div style={{marginBottom:12,padding:"10px 14px",background:"#d4a84311",borderRadius:8,
          border:"1px solid #d4a84344"}}>
          <div style={{fontSize:9,color:"var(--gold)",fontFamily:"'DM Mono',monospace",letterSpacing:1.5,marginBottom:6}}>
            ⚠️ FROM WEEK {viewWeek-1} REVIEW
          </div>
          {activeFlags.map((f,i) => (
            <div key={i} style={{display:"flex",alignItems:"baseline",gap:6,marginBottom:3}}>
              <span style={{fontSize:9,fontFamily:"'DM Mono',monospace",flexShrink:0,
                color:f.action==="skip"?"#c94f3a":"#d4a843"}}>
                {f.action.toUpperCase()}
              </span>
              <span style={{fontSize:10,color:"var(--text)"}}>{f.exercise}</span>
              <span style={{fontSize:9,color:"var(--text3)"}}>— {f.reason}</span>
            </div>
          ))}
        </div>
      )}
```

- [ ] **Step 3: Add per-day flag indicators in day card**

Find the `{isB1 && days && days.map(d => (` block. Inside the day card `<div key={d.id}...>`, immediately after the opening div and before the label row, insert:

```jsx
          {(() => {
            const dayFlags = activeFlags.filter(f => f.day === d.id);
            return dayFlags.length > 0 ? (
              <div style={{display:"flex",gap:4,flexWrap:"wrap",marginBottom:6}}>
                {dayFlags.map((f,i) => (
                  <span key={i} style={{fontSize:8,fontFamily:"'DM Mono',monospace",
                    color:f.action==="skip"?"#c94f3a":"#d4a843",
                    background:f.action==="skip"?"#c94f3a22":"#d4a84322",
                    padding:"1px 6px",borderRadius:8}}>
                    {f.action.toUpperCase()}: {f.exercise}
                  </span>
                ))}
              </div>
            ) : null;
          })()}
```

- [ ] **Step 4: Add WeekReviewForm at the bottom of ProgramWeekView**

Find the closing `</div>` of the ProgramWeekView return (just before the final `);`). Before that closing div, insert:

```jsx
      {isB1 && viewWeek <= currentWeek && (
        <WeekReviewForm
          week={viewWeek}
          weekData={weekData}
          isSummer={isSummer}
          onSaved={()=>setReviewVersion(v=>v+1)}
        />
      )}
```

- [ ] **Step 5: Verify flags banner**

In browser console, save a fake confirmed review for week 1 with flags:
```javascript
reviewStorage.save(1, {
  confirmed: true,
  rating: "red",
  energyTrend: "declining",
  days: {},
  injuries: [{bodyPart:"left bicep", type:"sharp", severity:"bad"}],
  generalNotes: "",
  ai: {
    narrative: "Sharp bicep pain cut D3 short.",
    loadRecommendation: "hold",
    skipExercises: ["Muscle Snatch"],
    reduceLoadExercises: [],
    flags: [{ day:"d1", exercise:"Muscle Snatch", action:"skip", reason:"left bicep sharp pain" }],
    generatedAt: new Date().toISOString(),
  }
});
```
Then navigate to WEEK PLAN → Week 2. Should see "⚠️ FROM WEEK 1 REVIEW" banner with the skip flag. D1 card should show "SKIP: Muscle Snatch" badge.

- [ ] **Step 6: Commit**

```bash
git add docs/index.html
git commit -m "feat: add previous-week flags banner and per-day indicators to ProgramWeekView"
```

---

## Task 5: LM Studio settings UI in Settings tab

**Files:**
- Modify: `docs/index.html` — inside the Settings tab JSX

- [ ] **Step 1: Find insertion point**

Find the closing `</div>` that ends the `{/* GitHub Sync */}` block (search for `DISCONNECT</Btn>` — the block ends a few lines after that). Insert immediately after that closing `</div>`:

```jsx
              {/* LM Studio settings */}
              <div style={{marginTop:12,background:"#0a0a1a",border:"1px solid #2a2a4a",borderRadius:8,padding:"14px"}}>
                <div style={{fontFamily:"'DM Mono',monospace",fontSize:9,color:"var(--gold)",letterSpacing:1.5,marginBottom:8}}>
                  ⚡ LM STUDIO (AI REVIEW)
                </div>
                <p style={{fontSize:10,color:"var(--text3)",lineHeight:1.6,marginBottom:10}}>
                  Weekly review uses your local LM Studio instance. Start LM Studio, load a model, and enter its API details below.
                </p>
                <LmSettingsPanel />
              </div>
```

- [ ] **Step 2: Verify in browser**

Go to Settings tab. Below the GitHub Sync section should now be "⚡ LM STUDIO (AI REVIEW)" with Base URL and Model Name inputs. Enter `http://localhost:1234/v1` and a model name, click SAVE. Reload the page — the values should persist.

```javascript
// Console check after saving:
console.log(lmCfgStorage.get()); // → { baseUrl: "http://localhost:1234/v1", model: "qwen3.5-..." }
```

- [ ] **Step 3: Commit**

```bash
git add docs/index.html
git commit -m "feat: add LM Studio settings panel to Settings tab"
```

---

## Task 6: End-to-end test + push

**Files:**
- No code changes — verification + push only

- [ ] **Step 1: Full flow test**

1. Open Settings tab → enter LM Studio base URL and model name → SAVE
2. Start LM Studio and load the model
3. Go to WEEK PLAN → navigate to current week (Week 1)
4. Scroll to bottom → tap "▸ WEEK REVIEW"
5. Set D3 to Skipped, enter "Left bicep sharp pain — stopped after MS opener"
6. Tap + ADD under Injuries → enter "left bicep", sharp, bad
7. Tap "⚡ GENERATE AI REVIEW"
8. Review should appear with narrative + flags (expect Muscle Snatch, Hang Power Snatch, Snatch Balance, Overhead Squat flagged as skip)
9. Tap "SAVE REVIEW"
10. Navigate to Week 2 → "⚠️ FROM WEEK 1 REVIEW" banner should appear with the flags
11. D1 card and D3 card should show per-day skip badges

- [ ] **Step 2: Test offline fallback (LM Studio not running)**

Stop LM Studio. Open Week 1 review, tap "⚡ GENERATE AI REVIEW". Should show red error: "LM Studio unreachable. Is it running on localhost:1234?" — form should remain intact, no crash.

- [ ] **Step 3: Test week persistence across reload**

After saving Week 1 review, reload the page. Navigate to Week 1 review — should show "✓ WEEK REVIEW SAVED · tap to edit" collapsed. Expand — all fields should be pre-populated with what was saved.

- [ ] **Step 4: Push**

```bash
git add docs/index.html
git push origin master
```

---

## Self-Review

**Spec coverage:**
- ✅ Structured fields: rating, energy, per-session status, injuries, notes
- ✅ LM Studio (Qwen3.5 via localhost:1234/v1 OpenAI-compatible)
- ✅ AI generates narrative + structured flags
- ✅ Flags affect next week's WEEK PLAN view (banner + per-day badges)
- ✅ Falls back gracefully if LM Studio is offline
- ✅ Settings panel for base URL + model name
- ✅ Confirmed reviews persist across reloads

**Placeholder scan:** None found. All code blocks are complete.

**Type consistency:**
- `reviewStorage.save(week, data)` called from `WeekReviewForm.handleSave` ✅
- `reviewStorage.get(week-1)` called from `ProgramWeekView` ✅
- `lmCfgStorage.get()` called from `WeekReviewForm.handleGenerate` and `LmSettingsPanel` ✅
- `buildReviewPrompt(week, weekData, form, isSummer)` signature matches its call site ✅
- `parseAiResponse(raw)` returns `{narrative, loadRecommendation, skipExercises, reduceLoadExercises, flags, generatedAt}` — all fields used in the form's AI result block ✅
- `activeFlags` shape `[{day, exercise, action, reason}]` used consistently in banner and day cards ✅
