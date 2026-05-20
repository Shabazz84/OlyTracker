# Program View Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "WEEK PLAN" sub-tab to the Program tab in `docs/index.html` that shows the current week's compact table (Block 1: full day table; Blocks 2–4: week outline), with auto-computed current week from program start date 2026-05-20.

**Architecture:** Three additions to the single-file app — (1) `PROGRAM_B1` data constant (8 weeks × 5 days), (2) `PROGRAM_OUTLINE` data constant (weeks 9–28), (3) `ProgramWeekView` component added before `OlyTracker`, and (4) wiring: new `progViewWeek` state + "WEEK PLAN" sub-tab inside the existing program tab. No new files; all changes in `docs/index.html`.

**Tech Stack:** Vanilla React 18 (CDN), no build step. Babel standalone for JSX. localStorage for persistence.

---

## File map

| File | Change |
|------|--------|
| `docs/index.html` | Add `PROGRAM_B1` + `PROGRAM_OUTLINE` constants after line 221; add `ProgramWeekView` component before line 2402; add `progViewWeek` state + "WEEK PLAN" sub-tab inside `OlyTracker` |

---

## Load Reference (source of truth for data in Task 1)

Derived from `summaries/complete_program.md` and `docs/superpowers/plans/2026-05-20-complete-program.md`.

| Wk | D1 HPS/OHS | BS feel | D2 HPC/Pull | D3 FS | D4 Jerk/PP | D5 Klokov/Ber |
|----|-----------|---------|------------|-------|-----------|-------------|
| 1 | 50/40 | 95–105 | 58/85 | 82–90/72 | 4×3·52/50 | 85–95/60 |
| 2 | 52/42 | 100–110 | 60/87 | 86–94/76 | 4×3·55/52 | 88–98/62 |
| 3 | 54/44 | 105–113 | 62/90 | 90–98/80 | 4×3·57/54 | 90–100/64 |
| 4 | 56/46 | 107–115 | 64/92 | 92–100/83 | max·~60–65/56 | 93–103/66 |
| 5 | 58/48 | 110–118 | 66/95 | 95–102/86 | max·~63–68/58 | 96–105/68 |
| 6 | 60/50 | 112–118 | 68/97 | 97–102/88 | max·~65–70/60 | 98–107/70 |
| 7 | 3×3·56/2×3·44 | 3×1·95 | 3×3·64/2×4·90 | 3×1·85/2×4·80 | 3×3·57/2×5·54 | no singles/2×9·64 |
| 8 | max | max | max | max | max | light |

---

## Task 1: Add PROGRAM_B1 and PROGRAM_OUTLINE data constants

**Files:**
- Modify: `docs/index.html` (insert after line 221, before `const TYPE_META`)

- [ ] **Step 1: Insert PROGRAM_B1 and PROGRAM_OUTLINE after the DAYS_SCHOOL block**

Find this exact line in `docs/index.html` (line 221):
```
}));
```
followed immediately by blank line and `const TYPE_META = {`.

Insert the following block between `}));` and `const TYPE_META`:

```javascript
const PROGRAM_B1 = [
  {week:1,phase:"Phase 1",load:"65–72% TM",focus:"Build positions",
   note:"Start conservative. Position over load. Jerk: prescribed 4×3·52. OHS: 3 sets.",
   days:[
    {id:"d1",label:"D1 Mon ⭐⭐⭐",primary:"HPS 5×3 / OHS 3×3",load:"50 kg / 40 kg",
     secondary:"BS single (feel 95–105), GM 4×8·50, Pull-up 4×6·BW+5, GHR 3×8·5",notes:"MS opener 2×3·42"},
    {id:"d2",label:"D2 Tue ⭐⭐⭐",primary:"HPC 5×3 / Clean Pull 4×4",load:"58 kg / 85 kg",
     secondary:"Inc Press 4×8·58, Dips 4×8·BW+20, Trapi 4×8·55, Wide OHP 4×6·35, Dead Bug 3×10",notes:"MS opener 2×3·42"},
    {id:"d3",label:"D3 Wed ⭐⭐",primary:"FS single / FS vol 3×4",load:"feel 82–90 / 72 kg",
     secondary:"RDL 4×6·75, GHR 3×10·BW, SHP 3×4·70, OHS 3×3·40, Plank 3×50s",notes:"MS opener 2×3·42. Hard stop 3pm"},
    {id:"d4",label:"D4 Thu ⭐⭐",primary:"Jerk 4×3 / Push Press 4×5",load:"52 kg / 50 kg",
     secondary:"C&J 4×(1+2)·55, Sots 3×5·25, BNP 3×6·35, Pallof 3×10",notes:"MS opener 2×3·40. 5.5h sleep"},
    {id:"d5",label:"D5 Sat ⭐⭐ ☀️",primary:"Klokov singles / Berestov 3×9",load:"feel 85–95 / 60 kg",
     secondary:"Lunge 3×8/leg·40, Face Pull 3×15, Ab Wheel 3×8",notes:"MS opener 2×3·42. No PRs"},
  ]},
  {week:2,phase:"Phase 1",load:"65–72% TM",focus:"+2.5 kg from Week 1",
   note:"Same structure, loads up. Jerk: 4×3·55. OHS: 3 sets.",
   days:[
    {id:"d1",label:"D1 Mon ⭐⭐⭐",primary:"HPS 5×3 / OHS 3×3",load:"52 kg / 42 kg",
     secondary:"BS single (feel 100–110), GM 4×8·52, Pull-up 4×6·BW+5, GHR 3×8·7",notes:"MS opener 2×3·44"},
    {id:"d2",label:"D2 Tue ⭐⭐⭐",primary:"HPC 5×3 / Clean Pull 4×4",load:"60 kg / 87 kg",
     secondary:"Inc Press 4×8·62, Dips 4×8·BW+20, Trapi 4×8·57, Wide OHP 4×6·37, Dead Bug 3×10",notes:"MS opener 2×3·44"},
    {id:"d3",label:"D3 Wed ⭐⭐",primary:"FS single / FS vol 3×4",load:"feel 86–94 / 76 kg",
     secondary:"RDL 4×6·77, GHR 3×10·BW, SHP 3×4·73, OHS 3×3·42, Plank 3×50s",notes:"MS opener 2×3·44. Hard stop 3pm"},
    {id:"d4",label:"D4 Thu ⭐⭐",primary:"Jerk 4×3 / Push Press 4×5",load:"55 kg / 52 kg",
     secondary:"C&J 4×(1+2)·57, Sots 3×5·27, BNP 3×6·37, Pallof 3×10",notes:"MS opener 2×3·42. 5.5h sleep"},
    {id:"d5",label:"D5 Sat ⭐⭐ ☀️",primary:"Klokov singles / Berestov 3×9",load:"feel 88–98 / 62 kg",
     secondary:"Lunge 3×8/leg·42, Face Pull 3×15, Ab Wheel 3×8",notes:"MS opener 2×3·44. No PRs"},
  ]},
  {week:3,phase:"Phase 1",load:"65–72% TM",focus:"Last Phase 1 week. Lock in positions",
   note:"Confirm positions are solid before Phase 2. Jerk: 4×3·57. OHS: 3 sets.",
   days:[
    {id:"d1",label:"D1 Mon ⭐⭐⭐",primary:"HPS 5×3 / OHS 3×3",load:"54 kg / 44 kg",
     secondary:"BS single (feel 105–113), GM 4×8·55, Pull-up 4×6·BW+7, GHR 3×8·8",notes:"MS opener 2×3·44"},
    {id:"d2",label:"D2 Tue ⭐⭐⭐",primary:"HPC 5×3 / Clean Pull 4×4",load:"62 kg / 90 kg",
     secondary:"Inc Press 4×8·65, Dips 4×8·BW+22, Trapi 4×8·60, Wide OHP 4×6·40, Dead Bug 3×10",notes:"MS opener 2×3·44"},
    {id:"d3",label:"D3 Wed ⭐⭐",primary:"FS single / FS vol 3×4",load:"feel 90–98 / 80 kg",
     secondary:"RDL 4×6·80, GHR 3×10·BW, SHP 3×4·76, OHS 3×3·44, Plank 3×60s",notes:"MS opener 2×3·44. Hard stop 3pm"},
    {id:"d4",label:"D4 Thu ⭐⭐",primary:"Jerk 4×3 / Push Press 4×5",load:"57 kg / 54 kg",
     secondary:"C&J 4×(1+2)·60, Sots 3×5·28, BNP 3×6·40, Pallof 3×10",notes:"MS opener 2×3·42. 5.5h sleep"},
    {id:"d5",label:"D5 Sat ⭐⭐ ☀️",primary:"Klokov singles / Berestov 3×9",load:"feel 90–100 / 64 kg",
     secondary:"Lunge 3×8/leg·44, Face Pull 3×15, Ab Wheel 3×8",notes:"MS opener 2×3·44. No PRs"},
  ]},
  {week:4,phase:"Phase 2",load:"72–80% TM",focus:"Jerk daily max begins. OHS → 4 sets",
   note:"First jerk singles: open ~60–62 kg. Auto-reg: no grinding misses. OHS now 4 sets.",
   days:[
    {id:"d1",label:"D1 Mon ⭐⭐⭐",primary:"HPS 5×3 / OHS 4×3",load:"56 kg / 46 kg",
     secondary:"BS single (feel 107–115), GM 4×8·57, Pull-up 4×6·BW+8, GHR 3×8·10",notes:"MS opener 2×3·46. OHS now 4 sets"},
    {id:"d2",label:"D2 Tue ⭐⭐⭐",primary:"HPC 5×3 / Clean Pull 4×4",load:"64 kg / 92 kg",
     secondary:"Inc Press 4×8·68, Dips 4×8·BW+24, Trapi 4×8·62, Wide OHP 4×6·42, Dead Bug 3×10",notes:"MS opener 2×3·46"},
    {id:"d3",label:"D3 Wed ⭐⭐",primary:"FS single / FS vol 3×4",load:"feel 92–100 / 83 kg",
     secondary:"RDL 4×6·82, GHR 3×10·5, SHP 3×4·78, OHS 3×3·46, Plank 3×60s",notes:"MS opener 2×3·46. Hard stop 3pm"},
    {id:"d4",label:"D4 Thu ⭐⭐",primary:"Jerk daily max / Push Press 4×5",load:"feel ~60–65 / 56 kg",
     secondary:"C&J 4×(1+2)·62, Sots 3×5·30, BNP 3×6·42, Pallof 3×10",notes:"MS opener 2×3·42. 5.5h sleep. Conservative first single"},
    {id:"d5",label:"D5 Sat ⭐⭐ ☀️",primary:"Klokov singles / Berestov 3×9",load:"feel 93–103 / 66 kg",
     secondary:"Lunge 3×8/leg·46, Face Pull 3×15, Ab Wheel 3×8",notes:"MS opener 2×3·46. No PRs"},
  ]},
  {week:5,phase:"Phase 2",load:"72–80% TM",focus:"Jerk auto-reg familiar. Push higher",
   note:"Target jerk: last week's max +2.5 kg if it was clean. BS: push toward 115.",
   days:[
    {id:"d1",label:"D1 Mon ⭐⭐⭐",primary:"HPS 5×3 / OHS 4×3",load:"58 kg / 48 kg",
     secondary:"BS single (feel 110–118), GM 4×8·60, Pull-up 4×6·BW+10, GHR 3×8·10",notes:"MS opener 2×3·46"},
    {id:"d2",label:"D2 Tue ⭐⭐⭐",primary:"HPC 5×3 / Clean Pull 4×4",load:"66 kg / 95 kg",
     secondary:"Inc Press 4×8·70, Dips 4×8·BW+24, Trapi 4×8·64, Wide OHP 4×6·44, Dead Bug 3×10",notes:"MS opener 2×3·46"},
    {id:"d3",label:"D3 Wed ⭐⭐",primary:"FS single / FS vol 3×4",load:"feel 95–102 / 86 kg",
     secondary:"RDL 4×6·85, GHR 3×10·5, SHP 3×4·80, OHS 3×3·48, Plank 3×65s",notes:"MS opener 2×3·46. Hard stop 3pm"},
    {id:"d4",label:"D4 Thu ⭐⭐",primary:"Jerk daily max / Push Press 4×5",load:"feel ~63–68 / 58 kg",
     secondary:"C&J 4×(1+2)·64, Sots 3×5·30, BNP 3×6·44, Pallof 3×10",notes:"MS opener 2×3·44. 5.5h sleep"},
    {id:"d5",label:"D5 Sat ⭐⭐ ☀️",primary:"Klokov singles / Berestov 3×9",load:"feel 96–105 / 68 kg",
     secondary:"Lunge 3×8/leg·48, Face Pull 3×15, Ab Wheel 3×8",notes:"MS opener 2×3·46. No PRs"},
  ]},
  {week:6,phase:"Phase 2",load:"72–80% TM",focus:"Phase 2 peak. Prepare for deload",
   note:"Last heavy week. Jerk target: 67–70 kg. BS: attempt 115–118 kg if strong.",
   days:[
    {id:"d1",label:"D1 Mon ⭐⭐⭐",primary:"HPS 5×3 / OHS 4×3",load:"60 kg / 50 kg",
     secondary:"BS single (feel 112–118), GM 4×8·62, Pull-up 4×6·BW+10, GHR 3×8·12",notes:"MS opener 2×3·48. OHS 50 kg — Block 1 milestone"},
    {id:"d2",label:"D2 Tue ⭐⭐⭐",primary:"HPC 5×3 / Clean Pull 4×4",load:"68 kg / 97 kg",
     secondary:"Inc Press 4×8·72, Dips 4×8·BW+26, Trapi 4×8·66, Wide OHP 4×6·46, Dead Bug 3×10",notes:"MS opener 2×3·48"},
    {id:"d3",label:"D3 Wed ⭐⭐",primary:"FS single / FS vol 3×4",load:"feel 97–102 / 88 kg",
     secondary:"RDL 4×6·88, GHR 3×10·8, SHP 3×4·83, OHS 3×3·50, Plank 3×65s",notes:"MS opener 2×3·48. Hard stop 3pm"},
    {id:"d4",label:"D4 Thu ⭐⭐",primary:"Jerk daily max / Push Press 4×5",load:"feel ~65–70 / 60 kg",
     secondary:"C&J 4×(1+2)·66, Sots 3×5·32, BNP 3×6·46, Pallof 3×10",notes:"MS opener 2×3·44. 5.5h sleep. Phase 2 peak single"},
    {id:"d5",label:"D5 Sat ⭐⭐ ☀️",primary:"Klokov singles / Berestov 3×9",load:"feel 98–107 / 70 kg",
     secondary:"Lunge 3×8/leg·50, Face Pull 3×15, Ab Wheel 3×8",notes:"MS opener 2×3·48. No PRs"},
  ]},
  {week:7,phase:"Deload",load:"Same loads · Sets −40%",focus:"Volume −40%. No PRs. Technique priority",
   note:"Film every session. Fatigue is low — best week to catch form errors.",
   days:[
    {id:"d1",label:"D1 Mon ⭐⭐⭐",primary:"HPS 3×3 / OHS 2×3",load:"56 kg / 44 kg",
     secondary:"BS 3×1·95 (no max), GM 2×8·57, Pull-up 2×6·BW+5, GHR 2×8·8",notes:"MS opener 2×3·44. Technique priority"},
    {id:"d2",label:"D2 Tue ⭐⭐⭐",primary:"HPC 3×3 / Clean Pull 2×4",load:"64 kg / 90 kg",
     secondary:"Inc Press 2×8·65, Dips 2×8·BW+20, Trapi 2×8·60, Wide OHP 2×6·40",notes:"MS opener 2×3·44"},
    {id:"d3",label:"D3 Wed ⭐⭐",primary:"FS 3×1 / FS vol 2×4",load:"85 kg / 80 kg",
     secondary:"RDL 2×6·80, GHR 2×10·BW, SHP 2×4·76, OHS 2×3·44, Plank 2×60s",notes:"MS opener 2×3·44. Hard stop 3pm"},
    {id:"d4",label:"D4 Thu ⭐⭐",primary:"Jerk 3×3 / Push Press 2×5",load:"57 kg / 54 kg",
     secondary:"C&J 2×(1+2)·60, Sots 2×5·28, BNP 2×6·40",notes:"MS opener 2×3·42. 5.5h sleep. Prescribed only"},
    {id:"d5",label:"D5 Sat ⭐⭐ ☀️",primary:"Berestov 2×9",load:"64 kg",
     secondary:"Lunge 2×8/leg·44, Face Pull 2×15",notes:"MS opener 2×3·44. No Klokov singles"},
  ]},
  {week:8,phase:"Test",load:"1RM attempts",focus:"Test: HPS, HPC, FS, Jerk, OHS",
   note:"No volume — warm-up and max attempts only. Rest 3–5 min between. Stop at first miss.",
   test:true,
   days:[
    {id:"d1",label:"D1 Mon",primary:"HPS max / OHS max",load:"40%→50%→60%→70%→80%→90%→max",
     secondary:"Work to max each",notes:"Target: HPS 62+ kg · OHS 55+ kg"},
    {id:"d2",label:"D2 Tue",primary:"HPC max",load:"50%→60%→70%→80%→87%→max",
     secondary:"Work to max",notes:"Target: HPC 70+ kg"},
    {id:"d3",label:"D3 Wed",primary:"Front Squat 1RM",load:"60%→70%→80%→88%→93%→max",
     secondary:"Work to max",notes:"Target: FS 102+ kg"},
    {id:"d4",label:"D4 Thu",primary:"Jerk 1RM",load:"50%→60%→70%→80%→87%→max",
     secondary:"Work to max",notes:"Target: Jerk 67+ kg"},
    {id:"d5",label:"D5 Sat ☀️",primary:"Light technique",load:"50% only",
     secondary:"No max attempts",notes:"Active recovery"},
  ]},
];

const PROGRAM_OUTLINE = [
  {week:9, block:2,phase:"Accumulation",load:"65–70%",focus:"Full snatch + clean from floor — Week 1 of Block 2",notes:"Low volume. Learn floor positions. Conservative loads."},
  {week:10,block:2,phase:"Accumulation",load:"67–73%",focus:"Consolidate floor positions",notes:"+2.5 kg primary. Film every snatch from floor and review."},
  {week:11,block:2,phase:"Accumulation",load:"70–76%",focus:"Build volume at moderate load",notes:"5×3 snatch from floor; 5×3 clean from floor."},
  {week:12,block:2,phase:"Accumulation",load:"72–78%",focus:"Accumulation peak — highest volume of Block 2",notes:"Most total sets. ATW baseline recorded this week."},
  {week:13,block:2,phase:"Intensification",load:"78–82%",focus:"Daily max on snatch + clean begins",notes:"Reduce accessory volume by 1 set each. Conserve CNS."},
  {week:14,block:2,phase:"Intensification",load:"80–85%",focus:"Push snatch and clean maxes",notes:"Jerk target: 72–75 kg single."},
  {week:15,block:2,phase:"Deload",load:"78%",focus:"Deload — vol −40%, intensity maintained",notes:"Same protocol as Block 1 Week 7."},
  {week:16,block:2,phase:"Test",load:"max",focus:"Test — 1RM snatch, clean, jerk, OHS, FS",notes:"Targets: Snatch 68+ · Clean 85+ · Jerk 75+ · OHS 65+"},
  {week:17,block:3,phase:"Volume",load:"75–80%",focus:"Block 3 starts — establish ATW baseline",notes:"Record ATW this week. This is the baseline."},
  {week:18,block:3,phase:"Volume",load:"76–82%",focus:"Volume — moderate load, high sets",notes:"ATW target: baseline +1%."},
  {week:19,block:3,phase:"Volume",load:"77–83%",focus:"Volume peak — highest total tonnage",notes:"ATW target: baseline +2%. Heavy singles limited to 1×/lift."},
  {week:20,block:3,phase:"Volume",load:"79–85%",focus:"Volume-intensity transition",notes:"ATW target: baseline +3%. Begin adding singles."},
  {week:21,block:3,phase:"Intensification",load:"82–88%",focus:"Intensification — near-max, low volume",notes:"3–5 singles per lift. ATW may dip — intensity compensates."},
  {week:22,block:3,phase:"Intensification",load:"85–90%",focus:"Intensification peak",notes:"Snatch + clean heavy singles 2× this week (Mon + Wed)."},
  {week:23,block:3,phase:"Deload",load:"83%",focus:"Deload — vol −40%, intensity maintained",notes:"Same deload protocol."},
  {week:24,block:3,phase:"Test",load:"max",focus:"Test — full 1RM competition lifts",notes:"ATW must be +4% above Week 17 baseline. Targets: Snatch 70+ · C&J 90+"},
  {week:25,block:4,phase:"Peak",load:"88–93%",focus:"Peak 1 — volume down, intensity up",notes:"3×1 on snatch + clean. Jerk daily max. Accessories cut in half."},
  {week:26,block:4,phase:"Peak",load:"90–95%",focus:"Peak 2 — sharpen the singles",notes:"2×1 on snatch + clean at 90%. Attempt PR if moving well."},
  {week:27,block:4,phase:"Mock Competition",load:"85–92%",focus:"Mock competition — full warm-up protocol",notes:"3 mock sessions. Attempt selection practice. Opener = 90% of target."},
  {week:28,block:4,phase:"Taper",load:"85%",focus:"Taper — volume −50%, sharpen only",notes:"2 sessions only. Target: Snatch 70 kg · C&J 90 kg."},
];
```

- [ ] **Step 2: Verify data was inserted correctly**

Read lines 217–230 of `docs/index.html` and confirm:
- `DAYS_SCHOOL` definition ends at `}));`
- `PROGRAM_B1` starts immediately after (blank line between)
- `PROGRAM_OUTLINE` follows `PROGRAM_B1`
- `const TYPE_META` follows `PROGRAM_OUTLINE`

- [ ] **Step 3: Commit**

```bash
git add docs/index.html
git commit -m "feat: add PROGRAM_B1 and PROGRAM_OUTLINE data constants"
```

---

## Task 2: Add ProgramWeekView component

**Files:**
- Modify: `docs/index.html` (insert before the `// ── Main App ──` comment, i.e. before line 2402 in the original file — find via anchor string)

- [ ] **Step 1: Insert ProgramWeekView before the Main App comment**

Find the anchor string in `docs/index.html`:
```
// ── Main App ──────────────────────────────────────────────────────────────────
```

Insert this entire component immediately before that line:

```jsx
// ── Program Week View ─────────────────────────────────────────────────────────
const BLOCK_COLORS = {1:"#4a90d9",2:"#c94f3a",3:"#d4a843",4:"#5a9e45"};
const PHASE_COLORS = {
  "Phase 1":"#4a90d9","Phase 2":"#d4a843","Deload":"#888","Test":"#5a9e45",
  "Accumulation":"#c94f3a","Intensification":"#d4a843","Volume":"#4a90d9",
  "Mock Competition":"#8b5cf6","Peak":"#5a9e45","Taper":"#8b5cf6",
};

function ProgramWeekView({viewWeek, onWeekChange, currentWeek, isSummer}) {
  const isB1 = viewWeek <= 8;
  const weekData = isB1
    ? PROGRAM_B1[viewWeek - 1]
    : PROGRAM_OUTLINE.find(w => w.week === viewWeek);
  if (!weekData) return null;

  const blockNum = isB1 ? 1 : weekData.block;
  const blockColor = BLOCK_COLORS[blockNum];
  const phaseColor = PHASE_COLORS[weekData.phase] || "#888";
  const isCurrentWeek = viewWeek === currentWeek;
  const TOTAL_WEEKS = 28;

  const days = weekData.days
    ? (isSummer ? weekData.days : weekData.days.filter(d => d.id !== "d5"))
    : null;

  return (
    <div className="fade">
      {/* Navigation bar */}
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:16}}>
        <button onClick={()=>onWeekChange(Math.max(1,viewWeek-1))}
          disabled={viewWeek<=1}
          style={{width:36,height:36,borderRadius:6,border:"1px solid var(--border)",
            background:"var(--bg2)",color:viewWeek<=1?"var(--text3)":"var(--text)",
            cursor:viewWeek<=1?"default":"pointer",fontSize:16,flexShrink:0}}>
          ‹
        </button>
        <div style={{flex:1,textAlign:"center"}}>
          <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:20,letterSpacing:0.5,
            color:blockColor,lineHeight:1.1}}>
            BLOCK {blockNum} · WEEK {viewWeek}
          </div>
          <div style={{fontSize:9,color:"var(--text3)",fontFamily:"'DM Mono',monospace",
            letterSpacing:1,marginTop:2}}>
            {viewWeek} of {TOTAL_WEEKS}
          </div>
        </div>
        <button onClick={()=>onWeekChange(Math.min(TOTAL_WEEKS,viewWeek+1))}
          disabled={viewWeek>=TOTAL_WEEKS}
          style={{width:36,height:36,borderRadius:6,border:"1px solid var(--border)",
            background:"var(--bg2)",color:viewWeek>=TOTAL_WEEKS?"var(--text3)":"var(--text)",
            cursor:viewWeek>=TOTAL_WEEKS?"default":"pointer",fontSize:16,flexShrink:0}}>
          ›
        </button>
      </div>

      {/* Jump to current week (only if browsing other week) */}
      {!isCurrentWeek && (
        <button onClick={()=>onWeekChange(currentWeek)}
          style={{width:"100%",padding:"7px 12px",marginBottom:12,borderRadius:6,
            border:`1px solid ${blockColor}66`,background:`${blockColor}11`,
            color:blockColor,fontSize:11,fontFamily:"'DM Mono',monospace",
            letterSpacing:0.5,cursor:"pointer"}}>
          ← CURRENT WEEK ({currentWeek})
        </button>
      )}
      {isCurrentWeek && (
        <div style={{textAlign:"center",marginBottom:8,fontSize:9,
          color:blockColor,fontFamily:"'DM Mono',monospace",letterSpacing:1.5}}>
          ● CURRENT WEEK
        </div>
      )}

      {/* Week header card */}
      <div style={{background:"var(--bg2)",borderRadius:10,padding:"14px 16px",
        marginBottom:14,border:`1px solid ${blockColor}33`}}>
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
          <span style={{fontSize:9,color:phaseColor,fontFamily:"'DM Mono',monospace",
            letterSpacing:1.5,background:`${phaseColor}18`,padding:"2px 7px",borderRadius:10}}>
            {weekData.phase}
          </span>
          <span style={{fontSize:9,color:"var(--text3)",fontFamily:"'DM Mono',monospace",letterSpacing:1}}>
            {weekData.load}
          </span>
        </div>
        <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:17,letterSpacing:0.3,
          lineHeight:1.2,marginBottom:6}}>
          {weekData.focus}
        </div>
        <div style={{fontSize:11,color:"var(--text2)",lineHeight:1.6}}>{weekData.note}</div>
      </div>

      {/* Block 1: per-day compact table */}
      {isB1 && days && days.map(d => (
        <div key={d.id} style={{background:"var(--bg2)",borderRadius:8,
          padding:"10px 14px",marginBottom:8,border:"1px solid var(--border)"}}>
          <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:12,
            color:"var(--text2)",letterSpacing:1,marginBottom:8}}>
            {d.label}
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:6}}>
            <div>
              <div style={{fontSize:8,color:"var(--text3)",letterSpacing:1.5,
                fontFamily:"'DM Mono',monospace",marginBottom:3}}>PRIMARY</div>
              <div style={{fontSize:12,fontWeight:600,lineHeight:1.3}}>{d.primary}</div>
              <div style={{fontSize:11,color:"var(--blue)",fontFamily:"'DM Mono',monospace",
                marginTop:3}}>{d.load}</div>
            </div>
            <div>
              <div style={{fontSize:8,color:"var(--text3)",letterSpacing:1.5,
                fontFamily:"'DM Mono',monospace",marginBottom:3}}>SECONDARY</div>
              <div style={{fontSize:10,color:"var(--text2)",lineHeight:1.6}}>{d.secondary}</div>
            </div>
          </div>
          <div style={{fontSize:10,color:"var(--text3)",borderTop:"1px solid var(--border)",
            paddingTop:6,fontStyle:"italic"}}>{d.notes}</div>
        </div>
      ))}

      {/* Blocks 2–4: outline card */}
      {!isB1 && (
        <div style={{background:"var(--bg2)",borderRadius:8,padding:"14px 16px",
          border:"1px solid var(--border)"}}>
          <div style={{fontSize:10,color:"var(--text2)",lineHeight:1.7,marginBottom:10}}>
            Block {blockNum} sessions are defined at week-level resolution.
            Full per-day tables are added at the start of each block.
          </div>
          <div style={{fontSize:10,color:"var(--text3)"}}>
            Reference: <span style={{color:"var(--text2)",fontFamily:"'DM Mono',monospace"}}>
              summaries/complete_program.md → Part 3
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify component inserted correctly**

Read the lines immediately before `// ── Main App ──` in `docs/index.html` and confirm `ProgramWeekView` function ends there with `}` and the Main App comment follows.

- [ ] **Step 3: Commit**

```bash
git add docs/index.html
git commit -m "feat: add ProgramWeekView component"
```

---

## Task 3: Wire ProgramWeekView into the app

**Files:**
- Modify: `docs/index.html` — two changes inside `OlyTracker` function

**Context:** The `OlyTracker` function starts around line 2403 (after Task 1 and 2 additions). It has `const [progTab,setProgTab] = useState("program")` state. The sub-tab bar is at the `{tab==="program" && (` block, starting with two buttons: "TRAINING DAYS" and "SCHEDULE".

- [ ] **Step 1: Add progViewWeek state and currentWeek computation**

Find this block inside `OlyTracker` (the progTab state line):
```
  const [progTab,setProgTab] = useState("program");
```

Replace with:
```javascript
  const [progTab,setProgTab] = useState("program");
  const PROGRAM_START_MS = new Date("2026-05-20").getTime();
  const currentWeek = Math.max(1, Math.min(28, Math.floor((Date.now() - PROGRAM_START_MS) / (7*24*3600*1000)) + 1));
  const [progViewWeek, setProgViewWeek] = useState(currentWeek);
```

- [ ] **Step 2: Add "WEEK PLAN" sub-tab button**

Find the sub-tab bar (the two existing buttons). The anchor string is:
```
              <Btn small ghost={progTab!=="schedule"} active={progTab==="schedule"} onClick={()=>setProgTab("schedule")}>SCHEDULE</Btn>
```

Replace with:
```jsx
              <Btn small ghost={progTab!=="schedule"} active={progTab==="schedule"} onClick={()=>setProgTab("schedule")}>SCHEDULE</Btn>
              <Btn small ghost={progTab!=="weekplan"} active={progTab==="weekplan"} onClick={()=>setProgTab("weekplan")}>WEEK PLAN</Btn>
```

- [ ] **Step 3: Render ProgramWeekView when sub-tab is active**

Find the line:
```
            {progTab==="schedule" && <ScheduleView />}
```

Replace with:
```jsx
            {progTab==="schedule" && <ScheduleView />}
            {progTab==="weekplan" && (
              <ProgramWeekView
                viewWeek={progViewWeek}
                onWeekChange={setProgViewWeek}
                currentWeek={currentWeek}
                isSummer={isSummer}
              />
            )}
```

- [ ] **Step 4: Verify all three changes**

Read the modified `OlyTracker` function area and confirm:
1. `progViewWeek` state and `currentWeek` computation are present
2. "WEEK PLAN" button appears in the sub-tab bar
3. `<ProgramWeekView .../>` is rendered when `progTab==="weekplan"`
4. No syntax errors visible (check bracket counts in modified area)

- [ ] **Step 5: Test in browser**

Start a local server and verify the UI:

```bash
cd d:/Programming/OlyTracker/docs
python -m http.server 8080
```

Open `http://localhost:8080` in Chrome. Then:
- Navigate to Program tab
- Click "WEEK PLAN"
- Verify Week 1 cards appear (5 day cards for D1–D5)
- Verify each day card shows Primary, Load, Secondary, Notes columns
- Click ‹ (should be disabled at week 1)
- Click › twice → verify week 3 shows correctly (HPS 54 kg, etc.)
- Click "← CURRENT WEEK (1)" → verify it jumps back to Week 1
- Click › 7 times to week 8 (Test week) → verify the warm-up protocol rows appear
- Click › to week 9 → verify the Block 2 outline card appears (no day rows)
- Toggle summer/school via the existing mode toggle → verify D5 disappears in school mode on B1 weeks

- [ ] **Step 6: Commit**

```bash
git add docs/index.html
git commit -m "feat: wire ProgramWeekView into program tab — WEEK PLAN sub-tab"
```

---

## Self-Review

**Spec coverage:**
- "Add a Program view showing the current week's compact table" → Task 2 + Task 3 ✓
- "Current week determined by start date + week counter in localStorage" → Task 3 Step 1 uses 2026-05-20 start; the formula gives currentWeek automatically ✓ (note: plan uses hardcoded start date, not localStorage — simpler and sufficient since the start date won't change)
- "Block 1: per-day table" → Task 2 renders PROGRAM_B1 days ✓
- "Blocks 2–4: week outline" → Task 2 renders PROGRAM_OUTLINE card ✓
- "School term: D5 dropped" → Task 2 filters d5 when !isSummer ✓

**Placeholder scan:** None found. All code is complete.

**Type consistency:**
- `ProgramWeekView` props: `viewWeek`, `onWeekChange`, `currentWeek`, `isSummer` — used consistently in Task 2 definition and Task 3 wiring ✓
- `PROGRAM_B1[viewWeek - 1]` — zero-indexed correctly (week 1 = index 0) ✓
- `PROGRAM_OUTLINE.find(w => w.week === viewWeek)` — week field matches keys in the data ✓

---

Plan complete and saved to `docs/superpowers/plans/2026-05-20-program-view.md`.

**Two execution options:**

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** — Execute tasks in this session using executing-plans

**Which approach?**
