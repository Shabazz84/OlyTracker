# Reports Page Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the REPORTS tab in `docs/index.html` to show an overview stats bar, 5-lift PR cards with history, ATW/tonnage load charts, a full exercise drill-down with set history, interactive quality chart tooltips, and calendar tap-to-session.

**Architecture:** Everything lives in the single `docs/index.html` file — React 18 + Babel standalone, no build step, no modules. New components are added in the "Reports helpers" section above the `Reports` function. The `Reports` function is rewritten to use the new components in the correct order. One data model change: `prs` entries gain a `history[]` array, migrated on load.

**Tech Stack:** React 18 (CDN), Babel standalone, localStorage via the existing `storage` adapter, CSS variables already defined in `:root`.

**Key file:** `docs/index.html` — all edits are to this file.

**Key patterns:**
- Sets localStorage key: `` `sets_${weekKey}_${ex.name.replace(/\s+/g,'_')}` `` e.g. `sets_w2_d1_Hang_Power_Snatch`
- Session key from sets key: regex `key.match(/^sets_(w\d+_d\d+)_(.+)$/)` → match[1] = `w2_d1`, match[2] = `Hang_Power_Snatch`
- Exercise display name: `exRaw.replace(/_/g,' ')` → `"Hang Power Snatch"`
- CSS color vars: `--gold:#d4a843`, `--blue:#4a90d9`, `--green:#5a9e45`, `--purple:#8b5cf6`, `--bg1:#111`, `--bg2:#161616`, `--bg3:#1c1c1c`, `--border:#222`, `--text:#e2e2e2`, `--text2:#888`, `--text3:#444`

---

## File Changes

**Modify only:** `docs/index.html`

Sections within the file (by content, not line number — lines will shift as you add code):
- **PR data model** — `load()` function + `handleAddPR()` function inside `OlyTracker`
- **Reports helpers section** (above `function Reports`) — add: `fmtMonthYear`, `PRCards`, `OverviewCards`, `LoadDevelopment`, `ExerciseBreakdown`
- **`SVGLineChart`** — add tooltip state + touch handler
- **`CalendarHeatmap`** — add tap handler + inline session popup
- **`Reports` function** — full rewrite of JSX body

---

## Task 1: PR data model — migrate + update handleAddPR

**Files:**
- Modify: `docs/index.html` — `load()` and `handleAddPR()` inside `function OlyTracker()`

- [ ] **Step 1: Update `load()` to migrate prs on startup**

Find the line in `load()`:
```js
if(p.status==="fulfilled"&&p.value) setPrs(JSON.parse(p.value.value));
else{setPrs(SEED_PRS);await storage.set("oly_prs",JSON.stringify(SEED_PRS));}
```

Replace with:
```js
if(p.status==="fulfilled"&&p.value){
  const raw=JSON.parse(p.value.value);
  const migrated={};
  Object.entries(raw).forEach(([lift,entry])=>{
    migrated[lift]=entry.history?entry:{...entry,history:[{weight:entry.weight,date:entry.date,reps:entry.reps}]};
  });
  setPrs(migrated);
}else{
  const seeded={};
  Object.entries(SEED_PRS).forEach(([lift,entry])=>{
    seeded[lift]={...entry,history:[{weight:entry.weight,date:entry.date,reps:entry.reps}]};
  });
  setPrs(seeded);await storage.set("oly_prs",JSON.stringify(seeded));
}
```

- [ ] **Step 2: Update `handleAddPR` to append to history only on new PRs**

Find `async function handleAddPR()` and replace the full function body:
```js
async function handleAddPR(){
  if(!newPR.weight||isNaN(newPR.weight)) return;
  const existing=prs[newPR.lift];
  const nw=parseFloat(newPR.weight);
  const nr=parseInt(newPR.reps)||1;
  const today=new Date().toISOString().slice(0,10);
  const isNew=!existing||nw>existing.weight;
  let entry;
  if(isNew){
    const history=[...(existing?.history||[]),{weight:nw,date:today,reps:nr}];
    entry={weight:nw,date:today,reps:nr,history};
  }else{
    entry={...existing};
  }
  const updated={...prs,[newPR.lift]:entry};
  setPrs(updated);
  try{await storage.set("oly_prs",JSON.stringify(updated));}catch{}
  setNewPR(p=>({...p,weight:"",reps:"1"}));
  showToast(isNew?`🏆 NEW PR — ${newPR.lift}: ${nw} kg!`:`Already at ${existing?.weight} kg — no PR logged`);
}
```

- [ ] **Step 3: Verify in browser**

Open `docs/index.html` locally. Go to PRs tab, add a weight for any lift. Open DevTools → Application → Local Storage → find `oly_prs`. Confirm the entry now has a `history` array with at least one item. Add a higher weight — confirm it appends to `history`. Add a lower weight — confirm `history` stays unchanged.

- [ ] **Step 4: Commit**
```bash
git add docs/index.html
git commit -m "feat: add PR history array to data model with migration"
```

---

## Task 2: Add `fmtMonthYear` helper

**Files:**
- Modify: `docs/index.html` — Reports helpers section (just above `function Reports`)

- [ ] **Step 1: Add helper function**

Find the comment `// ── Reports helpers ─` and add this function right below `parseRepsNum`:
```js
function fmtMonthYear(isoDate) {
  if(!isoDate) return '';
  const [y,m]=isoDate.slice(0,7).split('-');
  const mon=new Date(+y,+m-1).toLocaleString('default',{month:'short'});
  return `${mon}'${y.slice(2)}`;
}
```

- [ ] **Step 2: Verify**

In browser DevTools console: `fmtMonthYear("2025-03-15")` → `"Mar'25"`. `fmtMonthYear("2026-01-01")` → `"Jan'26"`.

---

## Task 3: `PRCards` component

**Files:**
- Modify: `docs/index.html` — add `PRCards` in Reports helpers section, replacing `PRBarChart`

- [ ] **Step 1: Delete the existing `PRBarChart` function**

Find and remove the entire `function PRBarChart({groups})` block (it starts at `function PRBarChart({groups}) {` and ends with its closing `}`).

- [ ] **Step 2: Add `PRCards` in its place**

```js
function PRCards({prs}) {
  const MAIN=[
    {key:'Snatch (Floor)',    label:'SNATCH',       color:'var(--gold)'},
    {key:'Clean & Jerk',     label:'CLEAN & JERK',  color:'var(--gold)'},
    {key:'Back Squat',       label:'BACK SQUAT',    color:'var(--blue)'},
    {key:'Deadlift',         label:'DEADLIFT',      color:'var(--green)'},
    {key:'Flat Bench Press', label:'BENCH PRESS',   color:'var(--purple)'},
  ];
  return (
    <div style={{display:'flex',flexDirection:'column',gap:8}}>
      {MAIN.map(({key,label,color})=>{
        const entry=prs[key];
        if(!entry) return (
          <div key={key} style={{background:'var(--bg1)',borderRadius:8,padding:'12px 14px',border:'1px solid var(--border)'}}>
            <div style={{fontSize:8,color:'var(--text3)',letterSpacing:2,fontFamily:"'DM Mono',monospace"}}>{label}</div>
            <div style={{fontSize:12,color:'var(--text3)',fontFamily:"'DM Mono',monospace",marginTop:4}}>— not logged yet</div>
          </div>
        );
        const history=entry.history||[{weight:entry.weight,date:entry.date,reps:entry.reps}];
        const weights=history.map(h=>h.weight);
        const minW=Math.min(...weights)*0.9, maxW=Math.max(...weights);
        const W=80,H=36,pad=4;
        const xi=i=>history.length===1?W/2:pad+i*(W-2*pad)/(history.length-1);
        const yi=w=>H-pad-((w-minW)/(maxW-minW||1))*(H-2*pad);
        return (
          <div key={key} style={{background:'var(--bg1)',borderRadius:8,padding:'12px 14px',border:`1px solid ${color}33`}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
              <div>
                <div style={{fontSize:8,color:'var(--text3)',letterSpacing:2,fontFamily:"'DM Mono',monospace"}}>{label}</div>
                <div style={{fontSize:28,fontWeight:700,color,lineHeight:1.1,fontFamily:"'Bebas Neue',sans-serif"}}>
                  {entry.weight}<span style={{fontSize:13,color:'var(--text2)',marginLeft:3,fontFamily:"'DM Mono',monospace"}}>kg ×{entry.reps}</span>
                </div>
                <div style={{fontSize:9,color:'var(--text3)',fontFamily:"'DM Mono',monospace",marginTop:2}}>{entry.date}</div>
              </div>
              {history.length>1&&(
                <svg viewBox={`0 0 ${W} ${H}`} style={{width:W,height:H,flexShrink:0}}>
                  <polyline points={history.map((h,i)=>`${xi(i)},${yi(h.weight)}`).join(' ')}
                    fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"/>
                  {history.map((h,i)=>(
                    <circle key={i} cx={xi(i)} cy={yi(h.weight)} r={i===history.length-1?3:2}
                      fill={color} opacity={i===history.length-1?1:0.5}/>
                  ))}
                </svg>
              )}
            </div>
            {history.length>0&&(
              <div style={{marginTop:8,paddingTop:6,borderTop:'1px solid var(--border)',display:'flex',gap:8,flexWrap:'wrap',alignItems:'center'}}>
                {history.map((h,i)=>(
                  <span key={i} style={{fontSize:9,fontFamily:"'DM Mono',monospace",
                    color:i===history.length-1?color:'var(--text3)',
                    fontWeight:i===history.length-1?600:400}}>
                    {h.weight}kg{i===history.length-1?' ★':` ${fmtMonthYear(h.date)}`}
                  </span>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 3: Verify**

Load app in browser. The REPORTS tab should not crash. You'll wire it in Task 9 — for now just check there are no parse errors (check DevTools console).

---

## Task 4: `OverviewCards` component

**Files:**
- Modify: `docs/index.html` — add `OverviewCards` in Reports helpers section

- [ ] **Step 1: Add `OverviewCards`**

Add this function after `PRCards`:

```js
function OverviewCards({logs,week,setsData,dateMap}){
  const today=new Date().toISOString().slice(0,10);
  const monthPfx=today.slice(0,7);

  // Days this month
  const daysThisMonth=Object.values(logs).filter(e=>e.date?.startsWith(monthPfx)).length;

  // Current streak (consecutive days ending today)
  const trainedSet=new Set(Object.values(logs).filter(e=>e.date).map(e=>e.date));
  let streak=0;
  const sd=new Date();
  while(trainedSet.has(sd.toISOString().slice(0,10))){streak++;sd.setDate(sd.getDate()-1);}

  // Back pain 7d avg
  const cutoff=new Date();cutoff.setDate(cutoff.getDate()-7);
  const cutStr=cutoff.toISOString().slice(0,10);
  const bpLogs=Object.values(logs).filter(e=>e.date>=cutStr&&e.backPain!=null&&e.backPain!=='');
  const bpAvg=bpLogs.length?(bpLogs.reduce((a,e)=>a+(parseFloat(e.backPain)||0),0)/bpLogs.length).toFixed(1):null;

  // ATW last 30d vs prev 30d
  const exRepsMap={};
  DAYS_SUMMER.forEach(day=>day.exercises.forEach(ex=>{exRepsMap[ex.name]=parseRepsNum(ex.reps);}));
  function calcATW(fromStr,toStr){
    let ton=0,reps=0;
    Object.entries(setsData).forEach(([key,setArr])=>{
      const m=key.match(/^sets_(w\d+_d\d+)_(.+)$/);
      if(!m||!Array.isArray(setArr))return;
      const date=dateMap[m[1]];
      if(!date||date<fromStr||date>toStr)return;
      const exReps=exRepsMap[m[2].replace(/_/g,' ')]||3;
      setArr.forEach(s=>{if(s.done&&parseFloat(s.weight)>0){ton+=parseFloat(s.weight)*exReps;reps+=exReps;}});
    });
    return reps>0?(ton/reps):null;
  }
  const d30=new Date();d30.setDate(d30.getDate()-30);
  const d60=new Date();d60.setDate(d60.getDate()-60);
  const atwNow=calcATW(d30.toISOString().slice(0,10),today);
  const atwPrev=calcATW(d60.toISOString().slice(0,10),d30.toISOString().slice(0,10));
  const atwDelta=atwNow&&atwPrev?((atwNow-atwPrev)/atwPrev*100).toFixed(1):null;

  // Block info
  const blockWeek=week<=6?week:week<=10?week-6:week-10;
  const blockTotal=week<=6?6:week<=10?4:6;
  const blockName=week<=6?'HYPERTROPHY':week<=10?'TECHNIQUE':'STRENGTH';

  const card=(color,label,value,sub)=>(
    <div style={{background:'var(--bg1)',border:`1px solid ${color}33`,borderRadius:8,padding:'12px 14px'}}>
      <div style={{fontSize:8,color:'var(--text3)',letterSpacing:1.5,fontFamily:"'DM Mono',monospace",marginBottom:4}}>{label}</div>
      <div style={{fontSize:24,fontWeight:700,color,lineHeight:1,fontFamily:"'Bebas Neue',sans-serif"}}>{value}</div>
      {sub&&<div style={{fontSize:9,color:'var(--text3)',fontFamily:"'DM Mono',monospace",marginTop:3}}>{sub}</div>}
    </div>
  );

  return (
    <div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:8}}>
        {card('var(--gold)','BLOCK PROGRESS',`W${blockWeek} / ${blockTotal}`,`Block · ${blockName}`)}
        {card('var(--blue)','DAYS THIS MONTH',daysThisMonth,'sessions logged')}
        {card('var(--green)','CURRENT STREAK',streak>0?`${streak}d`:'0','consecutive days')}
        {card('var(--red)','BACK PAIN (7D AVG)',bpAvg!=null?`${bpAvg}/10`:'—',bpLogs.length?`${bpLogs.length} sessions`:'no data')}
      </div>
      <div style={{background:'var(--bg1)',border:'1px solid #8b5cf633',borderRadius:8,padding:'12px 14px'}}>
        <div style={{fontSize:8,color:'var(--text3)',letterSpacing:1.5,fontFamily:"'DM Mono',monospace",marginBottom:4}}>AVG TRAINING WEIGHT (LAST 30D)</div>
        <div style={{display:'flex',alignItems:'baseline',gap:12}}>
          <div style={{fontSize:24,fontWeight:700,color:'var(--purple)',lineHeight:1,fontFamily:"'Bebas Neue',sans-serif"}}>
            {atwNow?`${(+atwNow).toFixed(1)} kg`:'—'}
          </div>
          {atwDelta&&(
            <div style={{fontSize:11,color:atwDelta>0?'var(--green)':'var(--red)'}}>
              {atwDelta>0?'↑':'↓'} {Math.abs(atwDelta)}% vs prev month
            </div>
          )}
        </div>
        <div style={{fontSize:9,color:'var(--text3)',fontFamily:"'DM Mono',monospace",marginTop:3}}>
          target: +4% for +10kg to total (Torokhtiy)
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify no parse errors**

Reload app in browser. DevTools console must show zero errors.

---

## Task 5: `LoadDevelopment` component

**Files:**
- Modify: `docs/index.html` — add `LoadDevelopment` in Reports helpers section

- [ ] **Step 1: Add `LoadDevelopment`**

Add this function after `OverviewCards`:

```js
function LoadDevelopment({setsData,dateMap}){
  const exRepsMap=useMemo(()=>{
    const m={};DAYS_SUMMER.forEach(day=>day.exercises.forEach(ex=>{m[ex.name]=parseRepsNum(ex.reps);}));return m;
  },[]);

  const sessions=useMemo(()=>{
    const s={};
    Object.entries(setsData).forEach(([key,setArr])=>{
      const m=key.match(/^sets_(w(\d+)_(d\d+))_(.+)$/);
      if(!m||!Array.isArray(setArr))return;
      const[,sk,,, exRaw]=m;
      const exName=exRaw.replace(/_/g,' ');
      const exReps=exRepsMap[exName]||3;
      if(!s[sk])s[sk]={key:sk,week:+m[2],dayId:m[3],tonnage:0,reps:0};
      setArr.forEach(st=>{
        if(st.done&&parseFloat(st.weight)>0){
          s[sk].tonnage+=parseFloat(st.weight)*exReps;
          s[sk].reps+=exReps;
        }
      });
    });
    return Object.values(s)
      .map(s=>({...s,date:dateMap[s.key]||null,atw:s.reps>0?+(s.tonnage/s.reps).toFixed(1):null,label:`W${s.week} ${s.dayId.toUpperCase()}`}))
      .filter(s=>s.reps>0)
      .sort((a,b)=>(a.date||a.label).localeCompare(b.date||b.label));
  },[setsData,dateMap,exRepsMap]);

  const [tooltip,setTooltip]=useState(null);

  if(sessions.length===0) return (
    <div style={{color:'var(--text3)',fontSize:12,padding:'16px 0',fontFamily:"'DM Mono',monospace"}}>
      No volume data yet — check off sets with weights to populate this.
    </div>
  );

  function BarChart({data,valueKey,color,height=120,label}){
    const max=Math.max(...data.map(d=>d[valueKey]||0),1);
    const barW=Math.max(8,Math.min(28,Math.floor(320/data.length)-2));
    return (
      <div>
        <div style={{fontSize:8,color:'var(--text3)',fontFamily:"'DM Mono',monospace",letterSpacing:1.5,marginBottom:6}}>{label}</div>
        <div style={{position:'relative',display:'flex',alignItems:'flex-end',gap:2,height,background:'var(--bg)',borderRadius:4,padding:'8px 4px 4px'}}>
          {data.map((d,i)=>{
            const val=d[valueKey]||0;
            const h=Math.max(2,(val/max)*(height-20));
            const isHovered=tooltip?.key===d.key&&tooltip?.chart===valueKey;
            return (
              <div key={d.key} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',cursor:'pointer'}}
                onMouseEnter={()=>setTooltip({key:d.key,chart:valueKey,val,date:d.date,label:d.label})}
                onMouseLeave={()=>setTooltip(null)}
                onTouchStart={e=>{e.preventDefault();setTooltip({key:d.key,chart:valueKey,val,date:d.date,label:d.label});}}
                onTouchEnd={()=>setTimeout(()=>setTooltip(null),1500)}>
                <div style={{width:'100%',height:h,background:isHovered?'#fff':color,borderRadius:'2px 2px 0 0',opacity:isHovered?1:0.85,transition:'all 0.1s'}}/>
              </div>
            );
          })}
          {tooltip&&(
            <div style={{position:'absolute',top:4,left:'50%',transform:'translateX(-50%)',
              background:'var(--bg2)',border:'1px solid var(--border2)',borderRadius:6,padding:'4px 8px',
              fontSize:10,color:'var(--text)',fontFamily:"'DM Mono',monospace",pointerEvents:'none',whiteSpace:'nowrap',zIndex:10}}>
              {tooltip.label}{tooltip.date?` · ${tooltip.date.slice(5)}`:''} · {tooltip.chart==='atw'?`ATW: ${tooltip.val} kg`:`${Math.round(tooltip.val)} kg`}
            </div>
          )}
        </div>
        <div style={{display:'flex',justifyContent:'space-between',marginTop:3}}>
          {[0,Math.floor(data.length/2),data.length-1].filter((v,i,a)=>a.indexOf(v)===i).map(i=>(
            <div key={i} style={{fontSize:8,color:'var(--text3)',fontFamily:"'DM Mono',monospace"}}>
              {String(data[i]?.date||data[i]?.label||'').slice(-5)}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{display:'flex',flexDirection:'column',gap:16}}>
      <BarChart data={sessions} valueKey="atw" color="var(--purple)" height={120} label="AVG TRAINING WEIGHT PER SESSION (kg)"/>
      <BarChart data={sessions} valueKey="tonnage" color="var(--gold)" height={100} label="TONNAGE PER SESSION (kg × reps)"/>
    </div>
  );
}
```

- [ ] **Step 2: Verify no parse errors**

Reload in browser. No console errors.

---

## Task 6: `ExerciseBreakdown` component

**Files:**
- Modify: `docs/index.html` — add `ExerciseBreakdown` in Reports helpers section

- [ ] **Step 1: Add `ExerciseBreakdown`**

Add after `LoadDevelopment`:

```js
function ExerciseBreakdown({setsData,dateMap}){
  const [openEx,setOpenEx]=useState(null);

  const exRepsMap=useMemo(()=>{
    const m={};DAYS_SUMMER.forEach(day=>day.exercises.forEach(ex=>{m[ex.name]=parseRepsNum(ex.reps);}));return m;
  },[]);

  const exercises=useMemo(()=>{
    const map={};
    Object.entries(setsData).forEach(([key,setArr])=>{
      const m=key.match(/^sets_(w(\d+)_(d\d+))_(.+)$/);
      if(!m||!Array.isArray(setArr))return;
      const[,sk,wk,dk,exRaw]=m;
      const exName=exRaw.replace(/_/g,' ');
      const exReps=exRepsMap[exName]||3;
      const date=dateMap[sk]||null;
      const doneSets=setArr.filter(s=>s.done&&parseFloat(s.weight)>0);
      if(doneSets.length===0)return;
      if(!map[exName])map[exName]={name:exName,sessions:[],best:0,totalTon:0,totalReps:0};
      const maxW=Math.max(...doneSets.map(s=>parseFloat(s.weight)));
      map[exName].sessions.push({sk,week:+wk,dayId:dk,date,label:`W${wk} ${dk.toUpperCase()}`,sets:setArr,maxW});
      map[exName].best=Math.max(map[exName].best,maxW);
      doneSets.forEach(s=>{map[exName].totalTon+=parseFloat(s.weight)*exReps;map[exName].totalReps+=exReps;});
    });
    return Object.values(map)
      .map(ex=>({...ex,
        atw:ex.totalReps>0?+(ex.totalTon/ex.totalReps).toFixed(1):null,
        sessions:ex.sessions.sort((a,b)=>(a.date||a.label).localeCompare(b.date||b.label)),
      }))
      .sort((a,b)=>b.sessions.length-a.sessions.length);
  },[setsData,dateMap,exRepsMap]);

  if(exercises.length===0) return (
    <div style={{color:'var(--text3)',fontSize:12,padding:'16px 0',fontFamily:"'DM Mono',monospace"}}>
      No exercise data yet — log sets with weights to see breakdown.
    </div>
  );

  return (
    <div style={{display:'flex',flexDirection:'column',gap:1}}>
      {exercises.map((ex,ei)=>{
        const isOpen=openEx===ex.name;
        const exReps=exRepsMap[ex.name]||3;
        const sparkSessions=[...ex.sessions].slice(-12);
        const sparkMax=Math.max(...sparkSessions.map(s=>s.maxW),1);
        const sparkMin=Math.min(...sparkSessions.map(s=>s.maxW))*0.9;
        const W=120,H=36,pad=4;
        const xi=i=>sparkSessions.length===1?W/2:pad+i*(W-2*pad)/(sparkSessions.length-1);
        const yi=w=>H-pad-((w-sparkMin)/(sparkMax-sparkMin||1))*(H-2*pad);
        return (
          <div key={ex.name} style={{background:'var(--bg1)',border:'1px solid var(--border)',
            borderRadius:ei===0?'8px 8px 0 0':ei===exercises.length-1?'0 0 8px 8px':'0',borderTop:ei>0?'none':undefined}}>
            <div onClick={()=>setOpenEx(isOpen?null:ex.name)}
              style={{padding:'10px 14px',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
              <div>
                <div style={{fontSize:9,color:isOpen?'var(--gold)':'var(--text)',fontFamily:"'DM Mono',monospace",fontWeight:isOpen?600:400,letterSpacing:0.5}}>
                  {ex.name.toUpperCase()}
                </div>
                <div style={{fontSize:8,color:'var(--text3)',fontFamily:"'DM Mono',monospace",marginTop:1}}>
                  best: {ex.best} kg · {ex.sessions.length} session{ex.sessions.length!==1?'s':''}
                </div>
              </div>
              <span style={{fontSize:10,color:'var(--text3)'}}>{isOpen?'▾':'▸'}</span>
            </div>
            {isOpen&&(
              <div style={{padding:'0 14px 14px',borderTop:'1px solid var(--border)'}}>
                {/* Summary cards */}
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:6,margin:'12px 0 10px'}}>
                  {[
                    ['BEST',`${ex.best} kg`,'var(--gold)'],
                    ['VOLUME',`${(ex.totalTon/1000).toFixed(1)} t`,'var(--text)'],
                    ['ATW',ex.atw?`${ex.atw} kg`:'—','var(--purple)'],
                  ].map(([lbl,val,col])=>(
                    <div key={lbl} style={{background:'var(--bg)',borderRadius:6,padding:'8px',textAlign:'center'}}>
                      <div style={{fontSize:7,color:'var(--text3)',fontFamily:"'DM Mono',monospace",letterSpacing:1,marginBottom:2}}>{lbl}</div>
                      <div style={{fontSize:16,fontWeight:700,color:col,fontFamily:"'Bebas Neue',sans-serif"}}>{val}</div>
                    </div>
                  ))}
                </div>
                {/* Sparkline */}
                {sparkSessions.length>1&&(
                  <div style={{marginBottom:10}}>
                    <div style={{fontSize:7,color:'var(--text3)',fontFamily:"'DM Mono',monospace",letterSpacing:1,marginBottom:4}}>MAX WEIGHT PER SESSION</div>
                    <svg viewBox={`0 0 ${W} ${H}`} style={{width:'100%',height:'auto',display:'block',background:'var(--bg)',borderRadius:4}}>
                      <polyline points={sparkSessions.map((s,i)=>`${xi(i)},${yi(s.maxW)}`).join(' ')}
                        fill="none" stroke="var(--gold)" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round"/>
                      {sparkSessions.map((s,i)=>(
                        <circle key={i} cx={xi(i)} cy={yi(s.maxW)} r={i===sparkSessions.length-1?2.5:1.5}
                          fill="var(--gold)" opacity={i===sparkSessions.length-1?1:0.5}/>
                      ))}
                    </svg>
                  </div>
                )}
                {/* Session history */}
                <div style={{fontSize:7,color:'var(--text3)',fontFamily:"'DM Mono',monospace",letterSpacing:1,marginBottom:6}}>SESSION HISTORY</div>
                <div style={{display:'flex',flexDirection:'column',gap:4}}>
                  {[...ex.sessions].reverse().map((sess,si)=>{
                    const isBest=sess.maxW===ex.best;
                    const doneSets=sess.sets.filter(s=>s.done&&parseFloat(s.weight)>0);
                    const sessReps=exRepsMap[ex.name]||3;
                    const sessTon=doneSets.reduce((a,s)=>a+parseFloat(s.weight)*sessReps,0);
                    const sessATW=doneSets.length>0?(sessTon/(doneSets.length*sessReps)).toFixed(1):null;
                    return (
                      <div key={si} style={{background:'var(--bg)',borderRadius:6,padding:'8px 10px',
                        borderLeft:`2px solid ${isBest?'var(--gold)':'var(--border2)'}`,}}>
                        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:4}}>
                          <span style={{fontSize:9,color:isBest?'var(--gold)':'var(--text2)',fontFamily:"'DM Mono',monospace",fontWeight:isBest?600:400}}>
                            {sess.date||sess.label}{sess.date?` · ${sess.label}`:''}
                          </span>
                          {isBest&&<span style={{fontSize:8,color:'var(--gold)',fontFamily:"'DM Mono',monospace"}}>★ best</span>}
                        </div>
                        <div style={{display:'flex',gap:4,flexWrap:'wrap'}}>
                          {sess.sets.map((s,i)=>{
                            const w=parseFloat(s.weight);
                            const isMax=w===sess.maxW&&s.done;
                            return s.done&&w>0?(
                              <span key={i} style={{fontSize:10,fontFamily:"'DM Mono',monospace",padding:'2px 6px',borderRadius:3,
                                background:isMax?'rgba(212,168,67,0.12)':'var(--bg1)',
                                color:isMax?'var(--gold)':'var(--text2)'}}>
                                {w}×{sessReps}
                              </span>
                            ):null;
                          })}
                        </div>
                        {sessTon>0&&<div style={{fontSize:8,color:'var(--text3)',fontFamily:"'DM Mono',monospace",marginTop:4}}>
                          vol: {Math.round(sessTon)} kg{sessATW?` · ATW: ${sessATW} kg`:''}
                        </div>}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Verify no parse errors**

Reload in browser. DevTools console: zero errors.

---

## Task 7: Add tooltips to `SVGLineChart`

**Files:**
- Modify: `docs/index.html` — `function SVGLineChart`

- [ ] **Step 1: Replace `SVGLineChart` with tooltip-enabled version**

Find `function SVGLineChart({data, series, height=160, yMax:yMaxProp})` and replace the entire function:

```js
function SVGLineChart({data, series, height=160, yMax:yMaxProp}){
  const [tip,setTip]=useState(null);
  if(!data||data.length===0) return (
    <div style={{color:'var(--text3)',fontSize:11,textAlign:'center',padding:20,fontFamily:"'DM Mono',monospace"}}>No data yet</div>
  );
  const W=600,H=height,PL=36,PR=12,PT=14,PB=28;
  const cw=W-PL-PR,ch=H-PT-PB;
  const allVals=series.flatMap(s=>data.map(d=>d[s.key]).filter(v=>v!=null));
  const yMax=yMaxProp||(Math.max(...allVals,1)*1.15);
  const xi=i=>PL+(data.length===1?cw/2:i*cw/(data.length-1));
  const yi=v=>PT+ch-(v/yMax)*ch;
  function segs(key){
    const r=[];let c=[];
    data.forEach((d,i)=>{
      if(d[key]!=null)c.push([xi(i),yi(d[key])]);
      else{if(c.length>1)r.push([...c]);c=[];}
    });
    if(c.length>1)r.push(c);
    return r;
  }
  const xTicks=data.length<=8?data.map((_,i)=>i):[0,Math.floor(data.length/2),data.length-1];
  const yTicks=[0,0.25,0.5,0.75,1];

  function handlePointer(e){
    const svg=e.currentTarget;
    const rect=svg.getBoundingClientRect();
    const clientX=e.touches?e.touches[0].clientX:e.clientX;
    const px=(clientX-rect.left)/rect.width*W;
    const idx=Math.round((px-PL)/cw*(data.length-1));
    const i=Math.max(0,Math.min(data.length-1,idx));
    setTip({i,x:xi(i),d:data[i]});
  }

  return (
    <div style={{position:'relative'}}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{width:'100%',height:'auto',display:'block',cursor:'crosshair'}}
        onMouseMove={handlePointer} onMouseLeave={()=>setTip(null)}
        onTouchMove={e=>{e.preventDefault();handlePointer(e);}} onTouchEnd={()=>setTimeout(()=>setTip(null),1500)}>
        {yTicks.map(f=>{
          const v=yMax*f;
          return <g key={f}>
            <line x1={PL} x2={W-PR} y1={yi(v)} y2={yi(v)} stroke="#1e1e2e" strokeWidth="1"/>
            <text x={PL-4} y={yi(v)+4} textAnchor="end" fill="#555" fontSize="9" fontFamily="'DM Mono',monospace">{Math.round(v)}</text>
          </g>;
        })}
        {xTicks.map(i=>(
          <text key={i} x={xi(i)} y={H-5} textAnchor="middle" fill="#555" fontSize="9" fontFamily="'DM Mono',monospace">
            {String(data[i].date||data[i].label||i+1).slice(-5)}
          </text>
        ))}
        {series.map(s=>(
          <g key={s.key}>
            {segs(s.key).map((seg,si)=>(
              <polyline key={si} points={seg.map(p=>p.join(',')).join(' ')} fill="none" stroke={s.color} strokeWidth="2" strokeLinejoin="round"/>
            ))}
            {data.map((d,i)=>d[s.key]!=null&&(
              <circle key={i} cx={xi(i)} cy={yi(d[s.key])} r={tip?.i===i?4:3} fill={s.color} opacity={tip?.i===i?1:0.85}/>
            ))}
          </g>
        ))}
        {tip&&<line x1={tip.x} x2={tip.x} y1={PT} y2={H-PB} stroke="#ffffff22" strokeWidth="1" strokeDasharray="3,3"/>}
      </svg>
      {tip&&(
        <div style={{position:'absolute',top:4,left:0,right:0,pointerEvents:'none',display:'flex',justifyContent:'center'}}>
          <div style={{background:'var(--bg2)',border:'1px solid var(--border2)',borderRadius:6,padding:'4px 10px',
            fontSize:10,color:'var(--text)',fontFamily:"'DM Mono',monospace",whiteSpace:'nowrap'}}>
            {tip.d.date||tip.d.label}
            {series.map(s=>tip.d[s.key]!=null&&(
              <span key={s.key} style={{color:s.color,marginLeft:8}}>{s.label}: {tip.d[s.key]}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify tooltip works**

Load app → REPORTS tab. Hover (or tap on mobile) over the SESSION QUALITY charts. A tooltip should appear with the date + values for that data point. No console errors.

---

## Task 8: Calendar tap-to-session

**Files:**
- Modify: `docs/index.html` — `function CalendarHeatmap({logs})`

- [ ] **Step 1: Replace `CalendarHeatmap` with tap-enabled version**

Find `function CalendarHeatmap({logs})` and replace the entire function:

```js
function CalendarHeatmap({logs}){
  const [selected,setSelected]=useState(null);
  const entries=Object.values(logs).filter(e=>e.date);
  const trainedSet=new Set(entries.map(e=>e.date));
  const ratingOf=date=>{const e=entries.find(x=>x.date===date);return e?(e.rating?e.rating.length:3):0;};
  const entryOf=date=>entries.find(x=>x.date===date)||null;
  const today=new Date();
  const days=Array.from({length:91},(_,i)=>{const d=new Date(today);d.setDate(d.getDate()-(90-i));return d.toISOString().slice(0,10);});
  const dow0=new Date(days[0]).getDay();
  const pad=(dow0===0?6:dow0-1);
  const cells=[...Array(pad).fill(null),...days];
  const weeks=[];
  for(let i=0;i<cells.length;i+=7)weeks.push(cells.slice(i,i+7));
  const cellColor=date=>{
    if(!date||!trainedSet.has(date))return 'var(--bg3)';
    const r=ratingOf(date);
    return r>=4?'var(--green)':r>=3?'var(--blue)':r>=2?'var(--gold)':'var(--text3)';
  };
  const monthLabels=[];
  weeks.forEach((wk,wi)=>{
    const fd=wk.find(d=>d);if(!fd)return;
    const m=fd.split('-')[1];
    const prev=weeks[wi-1]?.find(d=>d);
    if(!prev||prev.split('-')[1]!==m)monthLabels.push([wi,new Date(fd).toLocaleString('default',{month:'short'})]);
  });
  const sel=selected?entryOf(selected):null;
  return (
    <div>
      <div style={{overflowX:'auto'}}>
        <div style={{position:'relative',paddingTop:18,minWidth:'fit-content'}}>
          <div style={{display:'flex',gap:3,position:'absolute',top:0,left:0}}>
            {weeks.map((_,wi)=>{
              const ml=monthLabels.find(([w])=>w===wi);
              return <div key={wi} style={{width:14,fontSize:9,color:'var(--text3)',fontFamily:"'DM Mono',monospace"}}>{ml?ml[1]:''}</div>;
            })}
          </div>
          <div style={{display:'flex',gap:3}}>
            {weeks.map((wk,wi)=>(
              <div key={wi} style={{display:'flex',flexDirection:'column',gap:3}}>
                {wk.map((d,di)=>(
                  <div key={di} title={d||''} onClick={()=>d&&trainedSet.has(d)&&setSelected(selected===d?null:d)}
                    style={{width:14,height:14,borderRadius:2,background:cellColor(d),opacity:d?1:0,
                      cursor:d&&trainedSet.has(d)?'pointer':'default',
                      outline:selected===d?'2px solid var(--gold)':'none',outlineOffset:1}}/>
                ))}
              </div>
            ))}
          </div>
        </div>
        <div style={{display:'flex',gap:12,marginTop:10,flexWrap:'wrap'}}>
          {[['5★','var(--green)'],['3–4★','var(--blue)'],['1–2★','var(--gold)'],['No rating','var(--text3)'],['Rest','var(--bg3)']].map(([l,c])=>(
            <div key={l} style={{display:'flex',alignItems:'center',gap:4}}>
              <div style={{width:10,height:10,borderRadius:2,background:c,border:'1px solid var(--border2)'}}/>
              <span style={{fontSize:9,color:'var(--text3)',fontFamily:"'DM Mono',monospace"}}>{l}</span>
            </div>
          ))}
        </div>
      </div>
      {sel&&(
        <div style={{marginTop:12,background:'var(--bg1)',borderRadius:8,padding:'12px 14px',border:'1px solid var(--border2)'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
            <div style={{fontSize:11,color:'var(--gold)',fontFamily:"'DM Mono',monospace",fontWeight:600}}>{selected} · {sel.dayName||''}</div>
            <div onClick={()=>setSelected(null)} style={{cursor:'pointer',fontSize:14,color:'var(--text3)',lineHeight:1}}>×</div>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6,fontSize:10,fontFamily:"'DM Mono',monospace"}}>
            {sel.rating&&<div><span style={{color:'var(--text3)'}}>rating </span><span style={{color:'var(--gold)'}}>{sel.rating}</span></div>}
            {sel.energyLevel&&<div><span style={{color:'var(--text3)'}}>energy </span><span style={{color:'var(--text)'}}>{sel.energyLevel}</span></div>}
            {sel.backPain!=null&&sel.backPain!==''&&<div><span style={{color:'var(--text3)'}}>back </span><span style={{color:'var(--red)'}}>{sel.backPain}/10</span></div>}
            {sel.techniqueFeel&&<div><span style={{color:'var(--text3)'}}>tech </span><span style={{color:'var(--text)'}}>{sel.techniqueFeel}</span></div>}
            {sel.nightShift&&<div style={{gridColumn:'1/-1'}}><span style={{color:'var(--text3)'}}>🌙 post-shift session</span></div>}
          </div>
          {sel.notes&&<div style={{marginTop:8,fontSize:10,color:'var(--text2)',fontFamily:"'DM Mono',monospace"}}>{sel.notes}</div>}
          {sel.focusNext&&<div style={{marginTop:4,fontSize:9,color:'var(--text3)',fontFamily:"'DM Mono',monospace"}}>next: {sel.focusNext}</div>}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify**

Load app → REPORTS → Training Frequency. Click any green/blue/gold day on the calendar. A card should appear below showing that session's details. Click the same day again or × to close. No console errors.

---

## Task 9: Rewire `Reports` component

**Files:**
- Modify: `docs/index.html` — `function Reports({prs, logs})`

- [ ] **Step 1: Replace `Reports` function**

Find `function Reports({prs, logs})` and replace the entire function:

```js
function Reports({prs, logs, week}){
  const setsData=useMemo(()=>{
    const d={};
    Object.keys(localStorage).filter(k=>k.startsWith('sets_')).forEach(k=>{
      try{d[k]=JSON.parse(localStorage.getItem(k)||'[]');}catch{}
    });
    return d;
  },[]);

  const dateMap=useMemo(()=>{
    const m={};
    Object.values(logs).forEach(entry=>{
      if(!entry.week)return;
      const day=DAYS_SUMMER.find(d=>d.name===entry.dayName||d.id===entry.dayName);
      if(day)m[`w${entry.week}_${day.id}`]=entry.date;
    });
    return m;
  },[logs]);

  const qualityData=useMemo(()=>{
    const EL={'High':4,'Normal':3,'Low':2,'Post-shift':1};
    const TF={'Clicked':4,'Decent':3,'Inconsistent':2,'Off today':1};
    return Object.values(logs)
      .filter(e=>e.date)
      .sort((a,b)=>a.date.localeCompare(b.date))
      .map(e=>({
        date:e.date,label:e.date.slice(5),
        rating:e.rating?e.rating.length:null,
        energy:EL[e.energyLevel]??null,
        backPain:e.backPain?parseInt(e.backPain)||null:null,
        tech:TF[e.techniqueFeel]??null,
        nightShift:e.nightShift,
      }));
  },[logs]);

  const shiftStats=useMemo(()=>{
    const s=qualityData.filter(d=>d.nightShift&&d.rating!=null);
    const r=qualityData.filter(d=>!d.nightShift&&d.rating!=null);
    const avg=arr=>arr.length?(arr.reduce((a,d)=>a+d.rating,0)/arr.length).toFixed(1):null;
    const avgBP=arr=>arr.length?(arr.reduce((a,d)=>a+(d.backPain||0),0)/arr.length).toFixed(1):null;
    return{shifted:{data:s,avgRating:avg(s),avgBP:avgBP(s)},rested:{data:r,avgRating:avg(r),avgBP:avgBP(r)}};
  },[qualityData]);

  const sec={marginBottom:28};
  const hd={fontFamily:"'Bebas Neue',sans-serif",fontSize:20,letterSpacing:1,color:'var(--text)',marginBottom:14};
  const sub={fontSize:9,color:'var(--text3)',fontFamily:"'DM Mono',monospace",marginBottom:8,letterSpacing:1.5};

  return (
    <div className="fade">

      <div style={sec}>
        <div style={hd}>OVERVIEW</div>
        <OverviewCards logs={logs} week={week} setsData={setsData} dateMap={dateMap}/>
      </div>

      <div style={sec}>
        <div style={hd}>PERSONAL RECORDS</div>
        <PRCards prs={prs}/>
      </div>

      <div style={sec}>
        <div style={hd}>LOAD DEVELOPMENT</div>
        <LoadDevelopment setsData={setsData} dateMap={dateMap}/>
      </div>

      <div style={sec}>
        <div style={hd}>EXERCISE BREAKDOWN</div>
        <ExerciseBreakdown setsData={setsData} dateMap={dateMap}/>
      </div>

      <div style={sec}>
        <div style={hd}>SESSION QUALITY</div>
        {qualityData.length>0?(<>
          <div style={sub}>RATING (1–5★) · ENERGY (4=HIGH→1=POST-SHIFT) · BACK PAIN (0–10)</div>
          <SVGLineChart data={qualityData} height={160} yMax={10}
            series={[
              {key:'rating',color:'var(--gold)',label:'Rating'},
              {key:'energy',color:'var(--green)',label:'Energy'},
              {key:'backPain',color:'var(--red)',label:'Back pain'},
            ]}/>
          <div style={{...sub,marginTop:14}}>TECHNIQUE FEEL (4=CLICKED→1=OFF)</div>
          <SVGLineChart data={qualityData} height={100} yMax={4}
            series={[{key:'tech',color:'var(--blue)',label:'Technique'}]}/>
        </>):(
          <div style={{color:'var(--text3)',fontSize:12,padding:'16px 0'}}>No session logs yet.</div>
        )}
      </div>

      <div style={sec}>
        <div style={hd}>TRAINING FREQUENCY</div>
        <div style={sub}>LAST 90 DAYS — TAP A DAY TO SEE SESSION DETAILS</div>
        <CalendarHeatmap logs={logs}/>
      </div>

      {(shiftStats.shifted.data.length>0||shiftStats.rested.data.length>0)&&(
        <div style={sec}>
          <div style={hd}>NIGHT SHIFT IMPACT</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
            {[['POST-SHIFT',shiftStats.shifted,'var(--gold)'],['RESTED',shiftStats.rested,'var(--green)']].map(([lbl,stat,col])=>(
              <div key={lbl} style={{background:'var(--bg1)',borderRadius:8,padding:14,border:`1px solid ${col}44`}}>
                <div style={{fontSize:9,color:'var(--text3)',letterSpacing:2,fontFamily:"'DM Mono',monospace",marginBottom:8}}>{lbl}</div>
                <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:30,color:col,lineHeight:1}}>
                  {stat.avgRating!=null?`${stat.avgRating}★`:'—'}
                </div>
                <div style={{fontSize:10,color:'var(--text2)',fontFamily:"'DM Mono',monospace",marginTop:6}}>
                  avg back pain: {stat.avgBP!=null?`${stat.avgBP}/10`:'—'}
                </div>
                <div style={{fontSize:9,color:'var(--text3)',fontFamily:"'DM Mono',monospace",marginTop:2}}>
                  n = {stat.data.length}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Update the Reports call site to pass `week`**

Find the line:
```jsx
{tab==="reports" && <Reports prs={prs} logs={logs}/>}
```

Replace with:
```jsx
{tab==="reports" && <Reports prs={prs} logs={logs} week={week}/>}
```

- [ ] **Step 3: Full integration test in browser**

Open `docs/index.html`. Go to REPORTS tab. Verify:
1. OVERVIEW section shows 5 cards (block progress, days, streak, back pain, ATW)
2. PERSONAL RECORDS shows exactly 5 lifts (Snatch, C&J, Back Squat, Deadlift, Bench). Lifts with no data show "— not logged yet".
3. LOAD DEVELOPMENT shows bar charts (empty state if no sets logged with weights)
4. EXERCISE BREAKDOWN shows a list of exercises. Tap one to expand — should show best/volume/ATW summary + sparkline + session history.
5. SESSION QUALITY charts show tooltips on hover/tap
6. TRAINING FREQUENCY calendar: tap a trained day → session card appears below
7. No console errors

- [ ] **Step 4: Commit**
```bash
git add docs/index.html
git commit -m "feat: redesign reports page with overview cards, PR history, ATW charts, exercise drill-down, chart tooltips, calendar tap"
```

---

## Self-Review

**Spec coverage check:**
- ✅ Overview cards: block progress, days, streak, back pain, ATW (Task 4)
- ✅ PR section: 5 lifts, cards with sparkline + history chips (Tasks 1, 2, 3)
- ✅ Load Development: ATW + tonnage bars per session with tooltips (Task 5)
- ✅ Exercise Breakdown: collapsible, one open at a time, best/vol/ATW + sparkline + session history (Task 6)
- ✅ Session quality: tooltip on hover/tap (Task 7)
- ✅ Calendar: tap to see session log (Task 8)
- ✅ Night shift cards: preserved unchanged (Task 9)
- ✅ `Reports` gets `week` prop (Task 9)
- ✅ `fmtMonthYear` helper used in PRCards history chips (Task 2, used in Task 3)

**Type/name consistency:**
- `setsData` and `dateMap` computed in `Reports`, passed to `OverviewCards`, `LoadDevelopment`, `ExerciseBreakdown` — consistent across all tasks
- `exRepsMap` built locally in each component that needs it (no cross-component dependency) — intentional, avoids prop-drilling a static map
- `parseRepsNum` used in Tasks 4, 5, 6 — function defined in Reports helpers section, available to all
- `DAYS_SUMMER` referenced in Tasks 4, 5, 6 — global const, always available
