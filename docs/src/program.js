// Program data — training blocks, day templates and block metadata.
//
// A separate FILE, not a module: build.mjs runs esbuild with bundle:false
// ("everything is a page global"), so this is a second entry point emitted as
// docs/program.js and loaded by its own <script> tag BEFORE app.js. Top-level
// consts here are visible to app.js exactly as index.html's sbSync is.
// Adding an import/export statement would emit ESM syntax into a classic
// script and break the page.

// ── Program ───────────────────────────────────────────────────────────────────
const DAYS_SUMMER = [
  {
    id:"d1", label:"DAY 1", name:"Snatch + Posterior Chain",
    schedule:"Monday", color:"#4a90d9", sleep:"full",
    maxLoad: true,
    focus:["Snatch technique","Back Squat daily max single","Posterior chain"],
    exercises:[
      {id:"muscle_snatch",         sets:2,     reps:"3",      l1:"42–46 kg",   l2:"44–48 kg"  },
      {id:"hang_power_snatch",     sets:5,     reps:"3",      l1:"48–52 kg",   l2:"50–53 kg"  },
      {id:"back_squat",            sets:"4–6", reps:"1",      l1:"95–118 kg",  l2:"100–120 kg"},
      {id:"overhead_squat",        sets:4,     reps:"3",      l1:"40–48 kg",   l2:"46–54 kg"  },
      {id:"weighted_pull_up",      sets:4,     reps:"6–8",    l1:"BW+5 kg",    l2:"BW+8 kg"   },
    ]
  },
  {
    id:"d2", label:"DAY 2", name:"Clean + Upper Hypertrophy",
    schedule:"Tuesday", color:"#c94f3a", sleep:"full",
    maxLoad: true,
    focus:["Clean technique","Upper back hypertrophy","Chest work"],
    exercises:[
      {id:"muscle_snatch",         sets:2,     reps:"3",      l1:"42–46 kg",   l2:"44–48 kg"  },
      {id:"hang_power_clean",      sets:5,     reps:"3",      l1:"56–60 kg",   l2:"60–63 kg"  },
      {id:"clean_pull",            sets:4,     reps:"4",      l1:"85–95 kg",   l2:"90–100 kg" },
      {id:"weighted_dips",         sets:4,     reps:"8",      l1:"BW+20 kg",   l2:"BW+25 kg"  },
      {id:"overhead_squat",        sets:2,     reps:"3",      l1:"40–48 kg",   l2:"46–54 kg"  },
    ]
  },
  {
    id:"d3", label:"DAY 3", name:"Front Squat + OHS + Quad Hypertrophy",
    schedule:"Wednesday", color:"#4a90d9", sleep:"good",
    maxLoad: false,
    focus:["Front Squat 4×6 hypertrophy: pause (Ph1) → controlled (Ph2), ≤80% cap","OHS stability","Posterior chain — RDL"],
    exercises:[
      {id:"muscle_snatch",         sets:2,     reps:"3",      l1:"42–46 kg",   l2:"44–48 kg"  },
      {id:"front_squat",           sets:4,     reps:"6",      l1:"82–86 kg",   l2:"87–90 kg"  },
      {id:"rdl",                   sets:4,     reps:"6",      l1:"75–85 kg",   l2:"80–90 kg"  },
      {id:"overhead_squat",        sets:4,     reps:"4",      l1:"40–48 kg",   l2:"46–54 kg"  },
      {id:"pallof_press",          sets:3,     reps:"10",     l1:"Light",      l2:"Light-Med" },
    ]
  },
  {
    id:"d4", label:"DAY 4", name:"🎯 Jerk Priority + C&J",
    schedule:"Thursday", color:"#d4a843", sleep:"partial",
    maxLoad: false,
    focus:["Jerk is the session main event","Daily max singles","C&J practice"],
    exercises:[
      {id:"muscle_snatch",         sets:2,     reps:"3",      l1:"40–44 kg",   l2:"42–46 kg"  },
      {id:"jerk_from_rack",        sets:"6–8", reps:"1",      l1:"52–60 kg",   l2:"56–64 kg"  },
      {id:"clean_and_jerk",        sets:4,     reps:"1+2",    l1:"55–62 kg",   l2:"58–65 kg"  },
      {id:"split_jerk",            sets:4,     reps:"3",      l1:"Empty bar",  l2:"Empty bar" },
      {id:"overhead_squat",        sets:2,     reps:"3",      l1:"40–48 kg",   l2:"46–54 kg"  },
    ]
  },
  {
    id:"d5", label:"DAY 5", name:"Quad Hypertrophy + Lunge (Back-Sparing)",
    schedule:"Saturday", color:"#8b5cf6", sleep:"partial",
    maxLoad: false,
    focus:["Belt Squat — back-sparing quad mass","Split squat — jerk-lunge tendon prep (Pavlukhin)","Active hypertrophy — no PRs"],
    exercises:[
      {id:"muscle_snatch",         sets:2,     reps:"3",      l1:"42–46 kg",   l2:"44–48 kg"  },
      {id:"belt_squat",            sets:3,     reps:"12",     l1:"60–80 kg",   l2:"70–90 kg"  },
      {id:"split_squat",           sets:3,     reps:"8/leg",  l1:"40–50 kg",   l2:"46–56 kg"  },
      {id:"face_pull",             sets:3,     reps:"15",     l1:"Light",      l2:"Light-Med" },
      {id:"ab_wheel",              sets:3,     reps:"8–10",   l1:"BW",         l2:"BW"        },
    ]
  },
];

// School term version — 4 days, same content as summer D1–D3 + D4
const DAYS_SCHOOL = DAYS_SUMMER.slice(0,4).map((d,i) => ({
  ...d,
  schedule: ["Monday","Tuesday","Wednesday","Saturday"][i],
}));

const PROGRAM_B1 = [
  {week:1,phase:"Phase 1",load:"Hypertrophy · 65–75%",focus:"Build positions",
   note:"Start conservative. Position over load. Jerk: prescribed 4×2·52. D1 OHS: 3×3. D3: SB+OHS 4×4 from wk 1. FS = PAUSE front squat (Ph1) — teach the upright knees-forward position.",
   days:[
    {id:"d1",label:"D1 Mon ⭐⭐⭐",primary:"HPS 5×3 / OHS 3×3",load:"50 kg / 40 kg",
     secondary:"BS single (feel 95–105), GM 4×8·50, Pull-up 4×6·BW+5, GHR 3×8·5",notes:"MS opener 2×3·42. Pain-gate: back pain >3/10 pre-session → drop load ~40% or sub machine-equivalent."},
    {id:"d2",label:"D2 Tue ⭐⭐⭐",primary:"HPC 5×3 / Clean Pull 4×4",load:"58 kg / 85 kg",
     secondary:"Inc Press 4×8·58, Dips 4×8·BW+20, Trapi 4×8·55, Wide OHP 4×6·35, Dead Bug 3×10, OHS 2×3·40",notes:"MS opener 2×3·42"},
    {id:"d3",label:"D3 Wed ⭐⭐",primary:"Pause FS 4×6 (≤80% TM)",load:"82 kg",
     secondary:"SB 3×3·35, RDL 4×6·75, OHS 4×4·40, Plank 3×50s, Pallof 3×10",notes:"MS opener 2×3·42. Hard stop 3pm. PAUSE FS — pause reps teach position + build tissue. FS held ≤80% (Wed cap). Pain-gate: back pain >3/10 pre-session → drop load ~40% or sub machine-equivalent."},
    {id:"d4",label:"D4 Thu ⭐⭐",primary:"Jerk 4×2 / Push Press 4×5",load:"52 kg / 50 kg",
     secondary:"C&J 4×(1+2)·55, Split Jerk 4×3 (empty bar), BNP 3×6·35, Pallof 3×10, OHS 2×3·40",notes:"MS opener 2×3·40. 5.5h sleep"},
    {id:"d5",label:"D5 Sat ⭐⭐ ☀️",primary:"Belt Squat 3×12",load:"65 kg",
     secondary:"Split Squat 3×8/leg·40, Face Pull 3×15, Ab Wheel 3×8",notes:"MS opener 2×3·42. Belt Squat quad pump — no PRs. Back-sparing tissue day"},
  ]},
  {week:2,phase:"Phase 1",load:"Hypertrophy · 65–75%",focus:"+2.5 kg from Week 1",
   note:"Same structure, loads up. Jerk: 4×2·55. D1 OHS: 3×3. D3: SB+OHS 4×4. FS = PAUSE front squat (Ph1).",
   days:[
    {id:"d1",label:"D1 Mon ⭐⭐⭐",primary:"HPS 5×3 / OHS 3×3",load:"52 kg / 42 kg",
     secondary:"BS single (feel 100–110), GM 4×8·52, Pull-up 4×6·BW+5, GHR 3×8·7",notes:"MS opener 2×3·44. Pain-gate: back pain >3/10 pre-session → drop load ~40% or sub machine-equivalent."},
    {id:"d2",label:"D2 Tue ⭐⭐⭐",primary:"HPC 5×3 / Clean Pull 4×4",load:"60 kg / 87 kg",
     secondary:"Inc Press 4×8·62, Dips 4×8·BW+20, Trapi 4×8·57, Wide OHP 4×6·37, Dead Bug 3×10, OHS 2×3·42",notes:"MS opener 2×3·44"},
    {id:"d3",label:"D3 Wed ⭐⭐",primary:"Pause FS 4×6 (≤80% TM)",load:"84 kg",
     secondary:"SB 3×3·37, RDL 4×6·77, OHS 4×4·42, Plank 3×50s, Pallof 3×10",notes:"MS opener 2×3·44. Hard stop 3pm. PAUSE FS — pause reps teach position + build tissue. FS held ≤80% (Wed cap). Pain-gate: back pain >3/10 pre-session → drop load ~40% or sub machine-equivalent."},
    {id:"d4",label:"D4 Thu ⭐⭐",primary:"Jerk 4×2 / Push Press 4×5",load:"55 kg / 52 kg",
     secondary:"C&J 4×(1+2)·57, Split Jerk 4×3 (empty bar), BNP 3×6·37, Pallof 3×10, OHS 2×3·42",notes:"MS opener 2×3·42. 5.5h sleep"},
    {id:"d5",label:"D5 Sat ⭐⭐ ☀️",primary:"Belt Squat 3×12",load:"67 kg",
     secondary:"Split Squat 3×8/leg·42, Face Pull 3×15, Ab Wheel 3×8",notes:"MS opener 2×3·44. Belt Squat quad pump — no PRs. Back-sparing tissue day"},
  ]},
  {week:3,phase:"Phase 1",load:"Hypertrophy · 65–75%",focus:"Last Phase 1 week. Lock in positions",
   note:"Confirm positions are solid before Phase 2. Jerk: 4×2·57. D1 OHS: 3×3. D3: SB+OHS 4×4. Last week of PAUSE FS — dynamic FS begins Wk4.",
   days:[
    {id:"d1",label:"D1 Mon ⭐⭐⭐",primary:"HPS 5×3 / OHS 3×3",load:"52 kg / 44 kg",
     secondary:"BS single (feel 105–113), GM 4×8·55, Pull-up 4×6·BW+7, GHR 3×8·8",notes:"MS opener 2×3·44. Pain-gate: back pain >3/10 pre-session → drop load ~40% or sub machine-equivalent."},
    {id:"d2",label:"D2 Tue ⭐⭐⭐",primary:"HPC 5×3 / Clean Pull 4×4",load:"62 kg / 90 kg",
     secondary:"Inc Press 4×8·65, Dips 4×8·BW+22, Trapi 4×8·60, Wide OHP 4×6·40, Dead Bug 3×10, OHS 2×3·44",notes:"MS opener 2×3·44"},
    {id:"d3",label:"D3 Wed ⭐⭐",primary:"Pause FS 4×6 (≤80% TM)",load:"86 kg",
     secondary:"SB 3×3·38, RDL 4×6·80, OHS 4×4·44, Plank 3×60s, Pallof 3×10",notes:"MS opener 2×3·44. Hard stop 3pm. PAUSE FS — last week of pause reps. FS held ≤80% (Wed cap). Pain-gate: back pain >3/10 pre-session → drop load ~40% or sub machine-equivalent."},
    {id:"d4",label:"D4 Thu ⭐⭐",primary:"Jerk 4×2 / Push Press 4×5",load:"57 kg / 54 kg",
     secondary:"C&J 4×(1+2)·60, Split Jerk 4×3 (empty bar), BNP 3×6·40, Pallof 3×10, OHS 2×3·44",notes:"MS opener 2×3·42. 5.5h sleep"},
    {id:"d5",label:"D5 Sat ⭐⭐ ☀️",primary:"Belt Squat 3×12",load:"70 kg",
     secondary:"Split Squat 3×8/leg·44, Face Pull 3×15, Ab Wheel 3×8",notes:"MS opener 2×3·44. Belt Squat quad pump — no PRs. Back-sparing tissue day"},
  ]},
  {week:4,phase:"Phase 2",load:"Hypertrophy · 72–82%",focus:"Jerk daily max begins. OHS → 4 sets. FS → dynamic",
   note:"First jerk singles: open ~60–62 kg. Auto-reg: no grinding misses. D1 OHS now 4×3. D3 OHS 4×4 throughout. FS Phase 2: 4×6 load climbs (controlled tempo) — quad mass + position carry to the clean recovery (Pavlukhin).",
   days:[
    {id:"d1",label:"D1 Mon ⭐⭐⭐",primary:"HPS 5×3 / OHS 4×3",load:"52 kg / 46 kg",
     secondary:"BS single (feel 107–115), Pull-up 4×6·BW+8",notes:"MS opener 2×3·46. OHS now 4 sets. Pain-gate: back pain >3/10 pre-session → drop load ~40% or sub machine-equivalent."},
    {id:"d2",label:"D2 Tue ⭐⭐⭐",primary:"HPC 5×3 / Clean Pull 4×4",load:"62 kg / 92 kg",
     secondary:"Dips 4×8·BW+24, OHS 2×3·46",notes:"MS opener 2×3·46"},
    {id:"d3",label:"D3 Wed ⭐⭐",primary:"FS 4×6 (≤80% TM)",load:"87 kg",
     secondary:"RDL 4×6·82, OHS 4×4·46, Pallof 3×10",notes:"MS opener 2×3·46. Hard stop 3pm. FS 4×6 controlled tempo — drive quad mass. FS held ≤80% (Wed cap). Pain-gate: back pain >3/10 pre-session → drop load ~40% or sub machine-equivalent."},
    {id:"d4",label:"D4 Thu ⭐⭐",primary:"Jerk daily max",load:"feel ~60–65",
     secondary:"C&J 4×(1+2)·62, Split Jerk 4×3 (empty bar), OHS 2×3·46",notes:"MS opener 2×3·42. 5.5h sleep. Conservative first single"},
    {id:"d5",label:"D5 Sat ⭐⭐ ☀️",primary:"Belt Squat 3×12",load:"72 kg",
     secondary:"Split Squat 3×8/leg·46, Face Pull 3×15, Ab Wheel 3×8",notes:"MS opener 2×3·46. Belt Squat quad pump — no PRs. Back-sparing tissue day"},
  ]},
  {week:5,phase:"Phase 2",load:"Hypertrophy · 72–82%",focus:"Jerk auto-reg familiar. Push higher",
   note:"Target jerk: last week's max +2.5 kg if it was clean. BS: push toward 115.",
   days:[
    {id:"d1",label:"D1 Mon ⭐⭐⭐",primary:"HPS 5×3 / OHS 4×3",load:"53 kg / 48 kg",
     secondary:"BS single (feel 110–118), Pull-up 4×6·BW+10",notes:"MS opener 2×3·46. Pain-gate: back pain >3/10 pre-session → drop load ~40% or sub machine-equivalent."},
    {id:"d2",label:"D2 Tue ⭐⭐⭐",primary:"HPC 5×3 / Clean Pull 4×4",load:"62 kg / 95 kg",
     secondary:"Dips 4×8·BW+24, OHS 2×3·48",notes:"MS opener 2×3·46"},
    {id:"d3",label:"D3 Wed ⭐⭐",primary:"FS 4×6 (≤80% TM)",load:"89 kg",
     secondary:"RDL 4×6·85, OHS 4×4·48, Pallof 3×10",notes:"MS opener 2×3·46. Hard stop 3pm. FS 4×6 controlled tempo — drive quad mass. FS held ≤80% (Wed cap). Pain-gate: back pain >3/10 pre-session → drop load ~40% or sub machine-equivalent."},
    {id:"d4",label:"D4 Thu ⭐⭐",primary:"Jerk daily max",load:"feel ~63–68",
     secondary:"C&J 4×(1+2)·64, Split Jerk 4×3 (empty bar), OHS 2×3·48",notes:"MS opener 2×3·44. 5.5h sleep"},
    {id:"d5",label:"D5 Sat ⭐⭐ ☀️",primary:"Belt Squat 3×12",load:"75 kg",
     secondary:"Split Squat 3×8/leg·48, Face Pull 3×15, Ab Wheel 3×8",notes:"MS opener 2×3·46. Belt Squat quad pump — no PRs. Back-sparing tissue day"},
  ]},
  {week:6,phase:"Phase 2",load:"Hypertrophy · 72–82%",focus:"Phase 2 peak. Prepare for deload",
   note:"Last heavy week. Jerk target: 67–70 kg. BS: attempt 115–118 kg if strong.",
   days:[
    {id:"d1",label:"D1 Mon ⭐⭐⭐",primary:"HPS 5×3 / OHS 4×3",load:"53 kg / 50 kg",
     secondary:"BS single (feel 112–118), Pull-up 4×6·BW+10",notes:"MS opener 2×3·48. OHS 50 kg — Block 1 milestone. Pain-gate: back pain >3/10 pre-session → drop load ~40% or sub machine-equivalent."},
    {id:"d2",label:"D2 Tue ⭐⭐⭐",primary:"HPC 5×3 / Clean Pull 4×4",load:"63 kg / 97 kg",
     secondary:"Dips 4×8·BW+26, OHS 2×3·50",notes:"MS opener 2×3·48"},
    {id:"d3",label:"D3 Wed ⭐⭐",primary:"FS 4×6 (≤80% TM)",load:"90 kg",
     secondary:"RDL 4×6·88, OHS 4×4·50, Pallof 3×10",notes:"MS opener 2×3·48. Hard stop 3pm. FS 4×6 controlled tempo — drive quad mass. FS held ≤80% (Wed cap). Pain-gate: back pain >3/10 pre-session → drop load ~40% or sub machine-equivalent."},
    {id:"d4",label:"D4 Thu ⭐⭐",primary:"Jerk daily max",load:"feel ~65–70",
     secondary:"C&J 4×(1+2)·66, Split Jerk 4×3 (empty bar), OHS 2×3·50",notes:"MS opener 2×3·44. 5.5h sleep. Phase 2 peak single"},
    {id:"d5",label:"D5 Sat ⭐⭐ ☀️",primary:"Belt Squat 3×12",load:"78 kg",
     secondary:"Split Squat 3×8/leg·50, Face Pull 3×15, Ab Wheel 3×8",notes:"MS opener 2×3·48. Belt Squat quad pump — no PRs. Back-sparing tissue day"},
  ]},
  {week:7,phase:"Deload",load:"Same loads · Sets −40%",focus:"Volume −40%. No PRs. Technique priority",
   note:"Film every session. Fatigue is low — best week to catch form errors.",
   days:[
    {id:"d1",label:"D1 Mon ⭐⭐⭐",primary:"HPS 3×3 / OHS 2×3",load:"56 kg / 44 kg",
     secondary:"BS 3×1·95 (no max), Pull-up 2×6·BW+5",notes:"MS opener 2×3·44. Technique priority. Pain-gate: back pain >3/10 pre-session → drop load ~40% or sub machine-equivalent."},
    {id:"d2",label:"D2 Tue ⭐⭐⭐",primary:"HPC 3×3 / Clean Pull 2×4",load:"64 kg / 90 kg",
     secondary:"Dips 2×8·BW+20, OHS 2×3·44",notes:"MS opener 2×3·44"},
    {id:"d3",label:"D3 Wed ⭐⭐",primary:"FS 3×6 (deload)",load:"80 kg",
     secondary:"RDL 2×6·80, OHS 2×4·44, Pallof 3×10",notes:"MS opener 2×3·44. Hard stop 3pm. FS 3×6 light — deload volume. Pain-gate: back pain >3/10 pre-session → drop load ~40% or sub machine-equivalent."},
    {id:"d4",label:"D4 Thu ⭐⭐",primary:"Jerk 3×3",load:"57 kg",
     secondary:"C&J 2×(1+2)·60, Split Jerk 4×3 (empty bar), OHS 2×3·44",notes:"MS opener 2×3·42. 5.5h sleep. Prescribed only"},
    {id:"d5",label:"D5 Sat ⭐⭐ ☀️",primary:"Belt Squat 2×12",load:"68 kg",
     secondary:"Split Squat 2×8/leg·44, Face Pull 2×15",notes:"MS opener 2×3·44. Belt Squat only. Deload volume"},
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
     secondary:"Work to max",notes:"Target: FS 116+ kg"},
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

const BLOCK_COLORS = {1:"#4a90d9",2:"#c94f3a",3:"#d4a843",4:"#5a9e45"};
const PHASE_COLORS = {
  "Phase 1":"#4a90d9","Phase 2":"#d4a843","Deload":"#888","Test":"#5a9e45",
  "Accumulation":"#c94f3a","Intensification":"#d4a843","Volume":"#4a90d9",
  "Mock Competition":"#8b5cf6","Peak":"#5a9e45","Taper":"#8b5cf6",
};

const BLOCKS = [
  {
    id:1, label:"BLOCK 1", name:"Hypertrophy Foundation", weeks:"6–8 wks",
    color:"#4a90d9", goal:"Build muscular base, tissue resilience, fix OHS ceiling",
    phases:["Wks 1–3: 65–72% TM · 4×6–8 accessory · position learning","Wks 4–6: 72–80% TM · daily max singles on jerk begin · top-end singles"],
    advancement:[
      {id:"b1_ohs",  text:"OHS ≥ 60 kg with solid position"},
      {id:"b1_snatch",text:"Consistent snatch technique at 75–80% TM"},
      {id:"b1_back", text:"Back pain stable at 🟡 or better for 2+ weeks"},
      {id:"b1_weeks",text:"8 weeks completed"},
    ],
  },
  {
    id:2, label:"BLOCK 2", name:"Technique Consolidation", weeks:"6–8 wks",
    color:"#d4a843", goal:"Lead-up exercises ingrain motor patterns; patterns become automatic",
    phases:["Heavy lead-up work before every competition lift (Berestov system)","Load climbs 70% → 85%; jerk: daily max single + back-off volume"],
    advancement:[
      {id:"b2_ohs",  text:"OHS ≥ 65 kg"},
      {id:"b2_snatch",text:"Clean bar path and receiving at 85% TM"},
      {id:"b2_jerk", text:"Jerk gap to clean ≤ 10 kg"},
      {id:"b2_weeks",text:"8 weeks completed"},
    ],
  },
  {
    id:3, label:"BLOCK 3", name:"Strength & Load Dev.", weeks:"6–8 wks",
    color:"#c94f3a", goal:"Raise ATW 4% → +10 kg competition total (Torokhtiy research)",
    phases:["Track ATW weekly; trend +1–2% per week","Heavy singles 1–2×/week snatch+clean; daily max jerk continues"],
    advancement:[
      {id:"b3_atw",  text:"ATW risen 4%+ from Block 3 start"},
      {id:"b3_prs",  text:"PRs set in ≥ 2 of 3 competition lifts"},
      {id:"b3_comp", text:"Competition or test within 4–8 weeks"},
    ],
  },
  {
    id:4, label:"BLOCK 4", name:"Competition Prep", weeks:"4 wks",
    color:"#8b5cf6", goal:"Volume –40%, intensity preserved; translate strength to performance",
    phases:["2–3 mock competition sessions with full warm-up protocol","Competition movement only — no variation chasing"],
    advancement:[],
  },
];
