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

// School term — 4 days: Monday, Tuesday, Thursday, Saturday. Avoids three
// straight weekdays (the old, buggy layout): the corpus is explicit that a
// lifter should train no more than two days in a row [E8.9], and names this
// exact layout as fitting these night shifts [E8.12].
const DAYS_SCHOOL = DAYS_SUMMER.slice(0,4).map((d,i) => ({
  ...d,
  schedule: ["Monday","Tuesday","Thursday","Saturday"][i],
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

// Training maxes. Block 2's loads are percentages of these, so the week-8 test
// is a one-line edit here rather than a rewrite of 32 day strings.
// Block 1's hardcoded kilos are deliberately left alone - out of scope.
//
// Updated 2026-09-03 against the week-8 test (logged sets, weeks 8-9). Only the
// two squats moved; the rest are STILL the pre-test provisional numbers from
// docs/programs/2026-08-12-block2.md, "Fixed Inputs (provisional)", because
// week 8's menu was Block-1 shaped (hang + power variants) and Block 2's
// snatch/C&J percentages are percentages of the lift FROM THE FLOOR:
//   snatch 63       - NOT tested. Week 8 tested the hang power snatch (66 kg).
//                     A floor snatch single is still needed to anchor this.
//   cleanAndJerk 72 - NOT tested as such. Hang power clean 87 kg says the clean
//                     side is well ahead; the jerk tested 70 kg but on a logged
//                     night_shift Thursday, BELOW the 72.5 kg already hit in
//                     week 5, so that number measures the sleep, not the jerk.
//   frontSquat 115  - tested (was 116). Prior training top was 107.5.
//   backSquat 137   - logged single, Sat 2026-09-26 (wk12 d4). Was 130 (athlete-
//                     reported 2026-08-29); 133 followed on 2026-09-08 (wk10 d1).
//                     Both singles were backfilled into the set log 2026-10-01.
//                     The week-8 test itself only matched 125.
//   pushPress 65    - NOT tested.
//   cleanPull 120   - NOT tested.
const TRAINING_MAX = {
  snatch: 63,
  cleanAndJerk: 72,
  frontSquat: 115,
  backSquat: 137,
  pushPress: 65,
  cleanPull: 120,
  // Block 3 additions (2026-10-17). Initial values, replaced after the week-16
  // test. clean: Block 3 writes clean pulls and positional/power cleans as a %
  // of the clean, which is ahead of the C&J (Edit 11). snatchBalance: the
  // week-16 d4 test target, a [JUDGMENT] estimate until that test logs a max.
  clean: 80,
  snatchBalance: 60,
};

// Test-day ladder, shared by every test:true card (week 16, and Block 3's
// weeks 20 and 23). The 80/85/90/95 → max rungs are PROGRAM_B2's own week-16
// d4 load line [E16.3]; bigger jumps early, smaller near the max [E39.3]. The
// 50/60/70 rungs in front are [JUDGMENT] — the source starts its ladder at 80%
// and says nothing about getting there; they mirror week 8's ladders.
// Percentages are of TRAINING_MAX, read live, so a TM change moves the ladder.
// Lives here, not in app.jsx, so program.js's Block 3 entries can size their
// test cards from it.
const B2_TEST_LADDER = [0.50,0.60,0.70,0.80,0.85,0.90,0.95];

// Round to the nearest 0.5 kg - the smallest change plate pair available.
const tm = (lift, pct) => Math.round(TRAINING_MAX[lift] * pct * 2) / 2;

// Percentages are primary, kilos illustrative - the week-16 test rewrites
// every training max, so the printed kg is only ever a reading of the %.
const band = (lift, lo, hi, of = "TM") =>
  `${tm(lift, lo)}–${tm(lift, hi)} kg · ${Math.round(lo*100)}–${Math.round(hi*100)}% ${of}`;
const at = (lift, pct, of = "TM") =>
  `${tm(lift, pct)} kg · ${Math.round(pct*100)}% ${of}`;

// ── Block 2 — the floor transition ────────────────────────────────────────────
// Every load, percentage, rep, set and day below is transcribed from
// docs/programs/2026-08-12-block2.md (Week-By-Week Loading table + the four
// Day-by-Day Template tables). Nothing here is rounded "sensibly", carried over
// from Block 1, or invented. The [E..] handles resolve against
// evidence/2026-08-12/ via `python -m tools.check_citations`.
//
// Two Block 1 strings are deliberately absent: the "back pain >3/10 -> drop
// load ~40%" pain gate (cites nothing; dropped as a coaching prescription, see
// the document's Carryover 3) and the Wednesday "Hard stop 3pm" note
// (Wednesday is not a training day in Block 2 - Mon/Tue/Thu/Sat [E8.12]).
const PROGRAM_B2 = [
  {week:9, phase:"Accumulation", load:`Technique · ${band("snatch",0.60,0.70)}`,
   focus:"Floor introduced — full lifts plus variation",
   note:"Technique loading: 1–3 reps in the 50–70% band [E25.3], low end of the rep range for the classic lifts [E25.5]. The hang demotes to 3–4×2 at super-light with speed preserved and stays only as support [E8.8]. Static start on every pull and deadlift, all block [E32.2]. Correctness gates the jump — a rep that misses a named position fault means repeat or drop back, never add [E37.9, E37.3]. Hang or block pulls may run at 100–150% through week 12; floor pulls stay 90–100% [E17.8].",
   days:[
    {id:"d1",label:"D1 Mon ⭐⭐⭐",primary:"Snatch from floor 1–3 reps",load:band("snatch",0.60,0.70),
     secondary:`SnPP+OHS complex Ph1 (5+3) 4–6 sets, 3s hold last rep · Snatch pull floor ${tm("snatch",0.90)}–${tm("snatch",1.00)} (90–100%), finish fast ${tm("snatch",0.85)}–${tm("snatch",0.90)} · Back squat 3–5×3–5 @ ${tm("backSquat",0.65)}–${tm("backSquat",0.70)} (65–70%) · Trunk: anterior + lateral, static strength`,
     notes:"Open with presses from the bottom position of the snatch — light, smooth, feet flat [E33.10]. Snatch first in the session [E7.12]. Shoulders stay in front of the bar into the second pull [E32.1]. Empty-bar split jerk practice [E14.4]."},
    {id:"d2",label:"D2 Tue ⭐⭐⭐",primary:"Clean + front squat from floor 1–3 reps",load:band("cleanAndJerk",0.60,0.70),
     secondary:`Split jerk from rack — split-position repetitions, no prescribed % (the week's percentaged jerk is Thu) · Clean pull floor ${tm("cleanAndJerk",0.90)}–${tm("cleanAndJerk",1.00)} (90–100%) · Front squat 3–5×3–5 @ ${tm("frontSquat",0.65)}–${tm("frontSquat",0.70)} (65–70%), bounce not paused · 1–2 bodybuilding + 1 core/low back, 15-min cap`,
     notes:"Light snatch pattern to open — power snatch or snatch balance [E8.1]. Presses from the bottom of the clean [E33.10]. Squat any lift you accidentally power [E31.7, E31.5]. Empty-bar split jerk practice [E14.4]."},
    {id:"d3",label:"D3 Thu ⭐⭐",primary:"Split jerk from rack 1–3 reps",load:band("cleanAndJerk",0.50,0.65,"C&J TM"),
     secondary:"Light snatch opener · Floating snatch (just off the floor) · Hang snatch 3–4×2 super-light, speed kept · Power jerk (retained 2×/wk) · Jerk dip squat / jerk drive / partial front squat · Push press — speed is the limiter, add weight weekly only while it stays fast · Trunk stiffness for the dip",
     notes:"Reduced loading after post-shift sleep is [JUDGMENT — NO COVERAGE], not a corpus prescription. Dip and drive straight down, straight up and complete — identical to the power jerk [E14.5, E14.7]. Don't dive onto the front leg or reach the back foot so far it pulls the hips out [E14.8]. Empty-bar split jerk practice [E14.4]."},
    {id:"d4",label:"D4 Sat ⭐⭐",primary:"Back squat 4–5×5",load:band("backSquat",0.65,0.70),
     secondary:"3-position snatch top-down: mid-thigh, knee, floor · Pause snatch or pause clean — first tool for any floor fault seen this week · Belt squat or single-leg squat, slow tempo · Pull drill: power position → lowest good hang, a few sets of 3–5 total pulls · RDL / stiff-legged DL / good morning at the END of the session",
     notes:"Snatch first [E7.12], 3-position top-down [E42.6]. For technical correction the order is pause > hang > blocks [E9.2]. Squat holds 65–70% all block — [E20.10] caps weight and reps in the same sentence [E20.6]. Posterior-chain work goes last [E24.1]. Empty-bar split jerk practice [E14.4]."},
  ]},
  {week:10, phase:"Accumulation", load:`Technique · ${band("snatch",0.65,0.70)}`,
   focus:"Same rep bracket, second week",
   note:"Around two weeks with a certain rep range before moving on [E36.3]. Nothing changes but the load. OHS complex still Phase 1 — snatch push press + overhead squat 5+3, add weight each week [E31.8]. Hang or block pulls may still run at 100–150%; floor pulls stay 90–100% [E17.8].",
   days:[
    {id:"d1",label:"D1 Mon ⭐⭐⭐",primary:"Snatch from floor 1–3 reps",load:band("snatch",0.65,0.70),
     secondary:`SnPP+OHS complex Ph1 (5+3) 4–6 sets, 3s hold last rep · Snatch pull floor ${tm("snatch",0.90)}–${tm("snatch",1.00)} (90–100%), finish fast ${tm("snatch",0.85)}–${tm("snatch",0.90)} · Hang or block snatch pull ${tm("snatch",1.00)}–${tm("snatch",1.50)} (100–150%) · Back squat 3–5×3–5 @ ${tm("backSquat",0.65)}–${tm("backSquat",0.70)} (65–70%) · Trunk: anterior + lateral, static strength`,
     notes:"Presses from the bottom of the snatch to open [E33.10]. Snatch first [E7.12]. Don't deliberately slow the first pull — if the back rounds, cue a tighter back, not a slower pull [E32.6]. Empty-bar split jerk practice [E14.4]."},
    {id:"d2",label:"D2 Tue ⭐⭐⭐",primary:"Clean + front squat from floor 1–3 reps",load:band("cleanAndJerk",0.65,0.70),
     secondary:`Split jerk from rack — split-position repetitions, no prescribed % (the week's percentaged jerk is Thu) · Clean pull floor ${tm("cleanAndJerk",0.90)}–${tm("cleanAndJerk",1.00)} (90–100%) · Front squat 3–5×3–5 @ ${tm("frontSquat",0.65)}–${tm("frontSquat",0.70)} (65–70%), bounce not paused · 1–2 bodybuilding + 1 core/low back, 15-min cap`,
     notes:"Light snatch pattern to open [E8.1]. Be patient — initiating the final explosion too soon shifts balance forward and kills extension [E42.5]. Squat any accidental power receive [E31.7, E31.5]. Empty-bar split jerk practice [E14.4]."},
    {id:"d3",label:"D3 Thu ⭐⭐",primary:"Split jerk from rack 1–3 reps",load:band("cleanAndJerk",0.60,0.70,"C&J TM"),
     secondary:"Light snatch opener · Floating snatch (just off the floor) · Hang snatch 3–4×2 super-light, speed kept · Power jerk (retained 2×/wk) · Jerk dip squat / jerk drive / partial front squat · Push press — add weight this week only if it still moves fast · Trunk stiffness for the dip",
     notes:"Reduced loading after post-shift sleep is [JUDGMENT — NO COVERAGE]. It comes down to the number of precise correct repetitions in the right split positions [E14.12]. Empty-bar split jerk practice [E14.4]."},
    {id:"d4",label:"D4 Sat ⭐⭐",primary:"Back squat 4–5×5",load:band("backSquat",0.65,0.70),
     secondary:"3-position snatch top-down: mid-thigh, knee, floor · Pause snatch or pause clean · Belt squat or single-leg squat, slow tempo · Pull drill: power position → lowest good hang, a few sets of 3–5 total pulls · RDL / stiff-legged DL / good morning at the END of the session",
     notes:"Snatch first [E7.12]. One cue before the lift and one during — correct one thing at a time, and keep the same cues for the whole session [E33.9]. Empty-bar split jerk practice [E14.4]."},
  ]},
  {week:11, phase:"Accumulation", load:`${band("snatch",0.70,0.80)} · 3 reps × 4–5 sets`,
   focus:"Classic lifts: volume down, intensity up",
   note:"70–80% is where the best technical practice and the best training effect sit — 3 reps × 4–5 sets [E25.4]. Squat intensity HOLDS at 65–70%: [E20.10] caps weight and reps in one sentence, so [E36.3]'s intensity arc is applied to the classic lifts, not to this athlete's squat. OHS complex moves to Phase 2 — snatch push press + overhead squat 3+2 [E31.8].",
   days:[
    {id:"d1",label:"D1 Mon ⭐⭐⭐",primary:"Snatch from floor 4–5×3",load:band("snatch",0.70,0.80),
     secondary:`SnPP+OHS complex Ph2 (3+2) 4–6 sets, 3s hold last rep · Snatch pull floor ${tm("snatch",0.90)}–${tm("snatch",1.00)} (90–100%), finish fast ${tm("snatch",0.85)}–${tm("snatch",0.90)} · Hang or block snatch pull ${tm("snatch",1.00)}–${tm("snatch",1.50)} (100–150%) · Back squat 3–5×3–5 @ ${tm("backSquat",0.65)}–${tm("backSquat",0.70)} (65–70%) · Trunk: anterior + lateral, static strength`,
     notes:"Presses from the bottom of the snatch to open [E33.10]. Static start on every pull [E32.2]. Think 'jump' at the hip in the snatch — it starts sooner than it feels [E42.8]. Empty-bar split jerk practice [E14.4]."},
    {id:"d2",label:"D2 Tue ⭐⭐⭐",primary:"Clean + front squat from floor 4–5×3",load:band("cleanAndJerk",0.70,0.80),
     secondary:`Split jerk from rack — split-position repetitions, no prescribed % (the week's percentaged jerk is Thu) · Clean pull floor ${tm("cleanAndJerk",0.90)}–${tm("cleanAndJerk",1.00)} (90–100%) · Front squat 3–5×3–5 @ ${tm("frontSquat",0.65)}–${tm("frontSquat",0.70)} (65–70%), bounce not paused · 1–2 bodybuilding + 1 core/low back, 15-min cap`,
     notes:"Light snatch pattern to open [E8.1]. Think 'jump' at the upper thigh in the clean [E42.8]. Pull under at the correct time, not early [E42.9]. Empty-bar split jerk practice [E14.4]."},
    {id:"d3",label:"D3 Thu ⭐⭐",primary:"Split jerk from rack 4–5×3",load:band("cleanAndJerk",0.70,0.75,"C&J TM"),
     secondary:"Light snatch opener · Floating snatch (just off the floor) · Hang snatch 3–4×2 super-light, speed kept · Power jerk (retained 2×/wk) · Jerk dip squat / jerk drive / partial front squat · Push press — speed-limited, add weight weekly while it holds · Trunk stiffness for the dip",
     notes:"Reduced loading after post-shift sleep is [JUDGMENT — NO COVERAGE]. The drive is primarily the quads, so the front squat is the base lift; trunk softening in the dip absorbs the drive [E15.11]. Empty-bar split jerk practice [E14.4]."},
    {id:"d4",label:"D4 Sat ⭐⭐",primary:"Back squat 4–5×4",load:band("backSquat",0.65,0.70),
     secondary:"3-position snatch top-down: mid-thigh, knee, floor · Pause snatch or pause clean · Belt squat or single-leg squat, slow tempo · Pull drill: power position → lowest good hang, a few sets of 3–5 total pulls · RDL / stiff-legged DL / good morning at the END of the session",
     notes:"Snatch first [E7.12]. Squat percentage does not climb with the classic lifts — 65–70% is the cap in the same sentence as the 3–5 rep cap [E20.10, E20.6]. Empty-bar split jerk practice [E14.4]."},
  ]},
  {week:12, phase:"Accumulation", load:`${band("snatch",0.70,0.80)} · 3 reps × 4–5 sets`,
   focus:"Same bracket, second week",
   note:"Second week of the 70–80% bracket [E36.3, E25.4]. OHS complex still Phase 2 (3+2), adding weight [E31.8]. Last week hang or block pulls run at 100–150%; from week 13 the floor pull band alone carries it [E17.8]. Do not over-precision the loads — by feel, a 5–10% error is normal [E27.10].",
   days:[
    {id:"d1",label:"D1 Mon ⭐⭐⭐",primary:"Snatch from floor 4–5×3",load:band("snatch",0.70,0.80),
     secondary:`SnPP+OHS complex Ph2 (3+2) 4–6 sets, 3s hold last rep · Snatch pull floor ${tm("snatch",0.90)}–${tm("snatch",1.00)} (90–100%), finish fast ${tm("snatch",0.85)}–${tm("snatch",0.90)} · Hang or block snatch pull ${tm("snatch",1.00)}–${tm("snatch",1.50)} (100–150%) · Back squat 3–5×3–5 @ ${tm("backSquat",0.65)}–${tm("backSquat",0.70)} (65–70%) · Trunk: anterior + lateral, static strength`,
     notes:"Presses from the bottom of the snatch to open [E33.10]. Bring the bar back into the body as it leaves the floor and keep pushing it back with the lats [E42.5]. Empty-bar split jerk practice [E14.4]."},
    {id:"d2",label:"D2 Tue ⭐⭐⭐",primary:"Clean + front squat from floor 4–5×3",load:band("cleanAndJerk",0.70,0.80),
     secondary:`Split jerk from rack — split-position repetitions, no prescribed % (the week's percentaged jerk is Thu) · Clean pull floor ${tm("cleanAndJerk",0.90)}–${tm("cleanAndJerk",1.00)} (90–100%) · Front squat 3–5×3–5 @ ${tm("frontSquat",0.65)}–${tm("frontSquat",0.70)} (65–70%), bounce not paused · 1–2 bodybuilding + 1 core/low back, 15-min cap`,
     notes:"Light snatch pattern to open [E8.1]. Heavier bar gets pulled harder, not higher — pulling longer and leaning back is what makes the clean crash [E37.11]. Empty-bar split jerk practice [E14.4]."},
    {id:"d3",label:"D3 Thu ⭐⭐",primary:"Split jerk from rack 4–5×3",load:band("cleanAndJerk",0.70,0.80,"C&J TM"),
     secondary:"Light snatch opener · Floating snatch (just off the floor) · Hang snatch 3–4×2 super-light, speed kept · Power jerk (retained 2×/wk) · Jerk dip squat / jerk drive / partial front squat · Push press — speed-limited, add weight weekly while it holds · Trunk stiffness for the dip",
     notes:"Reduced loading after post-shift sleep is [JUDGMENT — NO COVERAGE]. If the split jerk is misbehaving, more power jerk fixes it — two or three times a week [E14.3]. Empty-bar split jerk practice [E14.4]."},
    {id:"d4",label:"D4 Sat ⭐⭐",primary:"Back squat 4–5×4",load:band("backSquat",0.65,0.70),
     secondary:"3-position snatch top-down: mid-thigh, knee, floor · Pause snatch or pause clean · Belt squat or single-leg squat, slow tempo · Pull drill: power position → lowest good hang, a few sets of 3–5 total pulls · RDL / stiff-legged DL / good morning at the END of the session",
     notes:"Snatch first [E7.12]. Belt and single-leg squats are the back-sparing quad builders — sit consciously slower and keep the pressure on the quads [E23.2]. Empty-bar split jerk practice [E14.4]."},
  ]},
  {week:13, phase:"Intensification", load:`${band("snatch",0.80,0.85)} · 1–3 reps × 2–4 sets`,
   focus:"Majority of block work sits 70–85%",
   note:"The 80–90% zone takes 1–3 reps × 2–4 sets [E25.4]. Above 90% stays the minimal share of total reps — nothing in weeks 9–15 is programmed above it [E25.4]. The jerk stays at 3 × 4–5 in its capped 70–80% band — [E25.4] assigns that bracket one scheme. OHS complex moves to Phase 3 — overhead squat 3 · snatch push press 5 [E31.8]. Back squat (athlete decision 2026-10-01, replacing the 3–5-rep cap): Monday climbs in singles to the heaviest clean single FOR TODAY — Pavlukhin's 'one rep, maximal weight, three sets… it just has to be the heaviest weight for today, not 200 kg every day'; Saturday stays medium, ~70–80%, no singles — Berestov's 'you don't need to squat heavy every time'. A new max is not the goal of the session. [JUDGMENT] the 85–92% Monday and 70–80% Saturday bands — neither source states a percentage. Keep mid-block singles conservative and crisp [E16.10, E39.6].",
   days:[
    {id:"d1",label:"D1 Mon ⭐⭐⭐",primary:"Snatch from floor 2–4×1–3",load:band("snatch",0.80,0.85),
     secondary:`OHS 3 · SnPP 5 (Ph3) 4–6 sets, 3s hold last rep · Snatch pull floor ${tm("snatch",0.90)}–${tm("snatch",1.00)} (90–100%), finish fast ${tm("snatch",0.85)}–${tm("snatch",0.90)} · Back squat — climb in singles to the heaviest clean single for today, ${tm("backSquat",0.85)}–${tm("backSquat",0.92)} (85–92%), 2–3 singles up there; stop at the first grind or form change, not a max attempt · Trunk: anterior + lateral, static strength`,
     notes:"Technique does not improve on its own as the bar gets heavier — faults migrate, they don't self-correct [E37.4]. If position holds but breaks down heavy, use the tempo snatch [E12.2]. Empty-bar split jerk practice [E14.4]."},
    {id:"d2",label:"D2 Tue ⭐⭐⭐",primary:"Clean + front squat from floor 2–4×1–3",load:band("cleanAndJerk",0.80,0.85),
     secondary:`Split jerk from rack — split-position repetitions, no prescribed % (the week's percentaged jerk is Thu) · Clean pull floor ${tm("cleanAndJerk",0.90)}–${tm("cleanAndJerk",1.00)} (90–100%) · Front squat 3–5×3–5 @ ${tm("frontSquat",0.65)}–${tm("frontSquat",0.70)} (65–70%), bounce not paused · 1–2 bodybuilding + 1 core/low back, 15-min cap`,
     notes:"On a miss, decide mistake or failure: repeat once if it was technical and you know the fix, stop if it was strength [E38.1, E38.2] — Everett's position, not a consensus [E38.8]. Reset to the last set that was done well [E38.7]. Empty-bar split jerk practice [E14.4]."},
    {id:"d3",label:"D3 Thu ⭐⭐",primary:"Split jerk from rack 4–5×3",load:band("cleanAndJerk",0.70,0.80,"C&J TM"),
     secondary:"Light snatch opener · Floating snatch (just off the floor) · Hang snatch 3–4×2 super-light, speed kept · Power jerk (retained 2×/wk) · Jerk dip squat / jerk drive / partial front squat · Push press — speed-limited, add weight weekly while it holds · Trunk stiffness for the dip",
     notes:"Reduced loading after post-shift sleep is [JUDGMENT — NO COVERAGE]. A good press does not guarantee a good jerk, but it more than likely makes it better [E14.11, E13.12]. Empty-bar split jerk practice [E14.4]."},
    {id:"d4",label:"D4 Sat ⭐⭐",primary:"Back squat 3–5×3 — medium, no singles",load:band("backSquat",0.70,0.80),
     secondary:"3-position snatch top-down: mid-thigh, knee, floor · Pause snatch or pause clean · Belt squat or single-leg squat, slow tempo · Pull drill: power position → lowest good hang, a few sets of 3–5 total pulls · RDL / stiff-legged DL / good morning at the END of the session",
     notes:"Snatch first [E7.12]. Squats run at the HIGH end of their rep range, classic lifts at the low end [E25.5]. Empty-bar split jerk practice [E14.4]."},
  ]},
  {week:14, phase:"Intensification", load:`${band("snatch",0.80,0.85)} · doubles → singles`,
   focus:"Variation stripped; accessories to maintenance",
   note:"Doubles then singles as the block closes [E25.4, E36.11] — CLASSIC LIFTS ONLY. The jerk holds 3 × 4–5 at its capped 70–80% band, which is what [E25.4] assigns to that bracket and what [E36.11] assigns to the same range. Variation and complexity get removed as the peak approaches [E31.4]. Accessories go to maintenance — same weights, same reps [E40.2]. OHS complex finishes Phase 3 [E31.8]. Correctness still gates the jump [E37.9].",
   days:[
    {id:"d1",label:"D1 Mon ⭐⭐⭐",primary:"Snatch from floor — doubles → singles",load:band("snatch",0.80,0.85),
     secondary:`OHS 3 · SnPP 5 (Ph3) 4–6 sets, 3s hold last rep · Snatch pull floor ${tm("snatch",0.90)}–${tm("snatch",1.00)} (90–100%), finish fast ${tm("snatch",0.85)}–${tm("snatch",0.90)} · Back squat — climb in singles to the heaviest clean single for today, ${tm("backSquat",0.85)}–${tm("backSquat",0.92)} (85–92%), 2–3 singles up there; stop at the first grind or form change, not a max attempt · Trunk: maintenance — same weights and reps`,
     notes:"Complexity strips from here toward the test [E31.4]. Accessories hold at maintenance weights and reps [E40.2]. Empty-bar split jerk practice [E14.4]."},
    {id:"d2",label:"D2 Tue ⭐⭐⭐",primary:"Clean & jerk from floor — doubles → singles",load:band("cleanAndJerk",0.80,0.85),
     secondary:`Split jerk from rack — split-position repetitions, no prescribed % (the week's percentaged jerk is Thu) · Clean pull floor ${tm("cleanAndJerk",0.90)}–${tm("cleanAndJerk",1.00)} (90–100%) · Front squat 3–5×3–5 @ ${tm("frontSquat",0.65)}–${tm("frontSquat",0.70)} (65–70%), bounce not paused · Accessories at maintenance, 15-min cap`,
     notes:"Once the rep max is hit, that is the last set for that exercise [E16.4]. Miss-miss-make is a signal to reset [E16.6]. Empty-bar split jerk practice [E14.4]."},
    {id:"d3",label:"D3 Thu ⭐⭐",primary:"Split jerk from rack 4–5×3",load:band("cleanAndJerk",0.70,0.80,"C&J TM"),
     secondary:"Light snatch opener · Floating snatch (just off the floor) · Hang snatch 3–4×2 super-light, speed kept · Power jerk (retained 2×/wk) · Jerk dip squat / jerk drive / partial front squat · Push press — speed-limited · Trunk at maintenance",
     notes:"Reduced loading after post-shift sleep is [JUDGMENT — NO COVERAGE]. Warm-up feel does not predict the session — a bad warm-up still makes lifts [E27.2, E39.1]. Empty-bar split jerk practice [E14.4]."},
    {id:"d4",label:"D4 Sat ⭐⭐",primary:"Back squat 3–5×3 — medium, no singles",load:band("backSquat",0.70,0.80),
     secondary:"3-position snatch top-down: mid-thigh, knee, floor · Pause snatch or pause clean · Belt squat or single-leg squat, slow tempo · Pull drill: power position → lowest good hang, a few sets of 3–5 total pulls · RDL / stiff-legged DL / good morning at the END of the session",
     notes:"Snatch first [E7.12]. Last loading week — accessories to maintenance, not to zero [E40.2]. Empty-bar split jerk practice [E14.4]."},
  ]},
  {week:15, phase:"Deload", load:"Wk 14 weight −10–15% · volume −15–25%",
   focus:"Back-off week — Everett's depth, not Torokhtiy's",
   note:"Everett's version: reduce weights by 10–15% and volume by 15–25% [E5.11]. Stated as Everett's position, never as what 'coaches say' — Torokhtiy prescribes a far deeper 40–60% cut [E4.3, E3.9] and choosing between them is a judgment call, not a consensus. A deload after 4–8 weeks of intense training is the general guideline, and it can vary person to person [E4.1, E3.1, E3.5]. Accessories stay at maintenance [E40.2].",
   days:[
    {id:"d1",label:"D1 Mon ⭐⭐⭐",primary:"Snatch from floor — back-off",load:"Wk 14 −10–15% · vol −15–25%",
     secondary:"SnPP+OHS complex, reduced sets · Snatch pull floor, reduced sets · Back squat, reduced sets · Trunk at maintenance",
     notes:"Weights −10–15%, volume −15–25% [E5.11]. Fatigue is low — the best week to see and fix position faults. Empty-bar split jerk practice [E14.4]."},
    {id:"d2",label:"D2 Tue ⭐⭐⭐",primary:"Clean & jerk from floor — back-off",load:"Wk 14 −10–15% · vol −15–25%",
     secondary:"Split jerk from rack, reduced sets · Clean pull floor, reduced sets · Front squat, reduced sets · Accessories at maintenance",
     notes:"Weights −10–15%, volume −15–25% [E5.11]. No PRs this week. Empty-bar split jerk practice [E14.4]."},
    {id:"d3",label:"D3 Thu ⭐⭐",primary:"Split jerk from rack — back-off",load:"Wk 14 −10–15% · vol −15–25%",
     secondary:"Light snatch opener · Power jerk, reduced sets · Jerk dip squat / jerk drive, reduced sets · Push press, reduced sets",
     notes:"Weights −10–15%, volume −15–25% [E5.11]. Reduced loading after post-shift sleep is [JUDGMENT — NO COVERAGE]. Empty-bar split jerk practice [E14.4]."},
    {id:"d4",label:"D4 Sat ⭐⭐",primary:"Back squat — back-off",load:"Wk 14 −10–15% · vol −15–25%",
     secondary:"3-position snatch, light · Pause snatch or pause clean, light · Belt squat or single-leg squat, reduced sets · Posterior chain at the END of the session",
     notes:"Weights −10–15%, volume −15–25% [E5.11]. Empty-bar split jerk practice [E14.4]."},
  ]},
  {week:16, phase:"Test", load:`Mon ${at("snatch",0.85)} · Tue ${at("cleanAndJerk",0.80)} · Thu 70–75% · Sat TEST`,
   focus:"Test — snatch, C&J, front squat, snatch balance",
   test:true,
   note:"Everett's pre-meet week runs 85% / 80% / 70–75% / light before competing, with the caveat that what works best varies among lifters [E3.12]. Mapping that 5-day sequence onto Mon/Tue/Thu/Sat is [JUDGMENT — NO COVERAGE] — the shape is Everett's, the day assignment is not. After the back-off week, reintroduce load gradually into Block 3 over the first week or two [E3.5]. TEST ORDER MATTERS: four tests share one Saturday, so whatever is tested last is the least trustworthy number of the day — fatigue, not capacity, sets it. Test in priority order and treat late results as a floor, not a max. Ordering is [JUDGMENT — NO COVERAGE].",
   days:[
    {id:"d1",label:"D1 Mon ⭐⭐⭐",primary:"Snatch from floor — taper",load:at("snatch",0.85),
     secondary:"Openers only. No accessory volume — accessories go lighter or drop out entirely this week",
     notes:"Taper shape from Everett's pre-meet week [E3.12]; the day mapping is judgment. Accessory effects do not vanish in a single week [E40.2]."},
    {id:"d2",label:"D2 Tue ⭐⭐⭐",primary:"Clean & jerk from floor — taper",load:at("cleanAndJerk",0.80),
     secondary:"Openers only. No accessory volume",
     notes:"Taper shape from Everett's pre-meet week [E3.12]; the day mapping is judgment."},
    {id:"d3",label:"D3 Thu ⭐⭐",primary:"Split jerk from rack — taper, or very light",load:`${band("cleanAndJerk",0.70,0.75,"C&J TM")} or bar–50%`,
     secondary:"Very light or off. Empty-bar split practice only",
     notes:"Everett's Friday is 'off or very light (bar – 50% or so)' [E3.12]; mapped here onto Thursday, which is judgment. Post-shift sleep."},
    {id:"d4",label:"D4 Sat ⭐⭐",primary:"TEST — snatch · C&J · front squat · snatch balance",load:"Singles 80 → 85 → 90 → 95 → max",
     secondary:"Back squat NOT tested this block — maxed 137 on 2026-09-26, inside the ~2-month window [E16.9]",
     notes:"A heavy single is the heaviest single manageable in that session, reached by gradually increasing weight with no failed attempts; a clearly technical miss may be repeated once [E39.2]. Stop at form breakdown, not at the first miss [E5.6]. Bigger jumps early, smaller jumps near the 1RM [E39.3]; ladder 80/85/90/95/max [E16.3]. No hang snatches, snatch balances, presses or squats in the warm-up before maxing — practise the lift itself [E39.7]. Back squat 1RM belongs at about once per two months [E16.9]. AMRAP at 90–95% is the alternative [E5.7]."},
  ]},
];

// ── Block 3 — one program, adapted ────────────────────────────────────────────
// Spine: Catalyst Athletics' "General Cycle" (Greg Everett), chosen 2026-10-17
// over a slot-by-slot corpus build. The source asks not to be redistributed, so
// nothing here is its text: the prescriptions are re-expressed, and every change
// from it is a numbered Edit in docs/superpowers/specs/2026-10-17-block3-design.md.
// Per-exercise cards are BLOCK3_EXERCISES (below); these are the week plans.
const B3_SRC = "Spine: Catalyst Athletics' General Cycle (Greg Everett) — catalystathletics.com/olympic-weightlifting-training-program/34/General-Cycle — adapted to Mon/Tue/Thu/Sat; every change is in the Block 3 design's Edit Ledger.";
const B3_THU_NOTE = "Post-shift day. Front squat % is a ceiling, not a target: stop at the first grinding rep — that week's top set is whatever was made cleanly. Empty-bar split jerks any day, as warm-up.";

// Per cycle week n (1–6): the classic-lift singles for Mon / Tue / Sat, the
// three heavy squats, and Thursday's alternating positional lift. Squat text is
// sets×reps — the order every card uses (the source writes reps first).
const B3_WAVE = [
  null,
  {mon:0.80, tue:0.80, sat:0.80, single:"× 5", bs:"75% 5×5", fs:"85% 3×3", sat_sq:"Pause back squat — 3-rep max", thu:"3-position snatch + snatch pull"},
  {mon:0.90, tue:0.90, sat:0.90, single:"× 3", bs:"85% 3×3", fs:"90% 3×2", sat_sq:"Pause back squat — 2-rep max", thu:"Clean from blocks + clean pull"},
  {mon:0.95, tue:0.90, sat:null, single:"× 1", bs:"90% 5×1", fs:"95% 2×1", sat_sq:"Back squat — MAX",             thu:"Power snatch + snatch pull"},
  {mon:0.80, tue:0.80, sat:0.80, single:"× 5", bs:"78% 5×5", fs:"88% 3×3", sat_sq:"Pause back squat — 3-rep max", thu:"3-position clean + clean pull"},
  {mon:0.90, tue:0.90, sat:0.90, single:"× 4", bs:"88% 3×3", fs:"93% 3×2", sat_sq:"Pause back squat — 2-rep max", thu:"Snatch from blocks + snatch pull"},
  {mon:0.95, tue:0.90, sat:null, single:"× 1", bs:"90% 5×1", fs:"95% 2×1", sat_sq:"Back squat + front squat — MAX", thu:"Power clean + clean pull", range:true},
];

function b3WaveWeek(week, phase) {
  const n = week - 17, w = B3_WAVE[n], test = w.sat === null;
  const pct = p => `${Math.round(p * 100)}%`;
  // Cycle week 6's Mon/Tue singles are ranges (90–95%, 85–90%): aim inside the
  // range and keep it lighter if the day calls for it.
  const mon = w.range ? "90–95%" : pct(w.mon), tue = w.range ? "85–90%" : pct(w.tue);
  return {
    week, phase,
    load:`Mon ${mon} · Tue ${tue} · Sat ${test ? "MAX" : pct(w.sat)}`,
    focus: test ? `Cycle week ${n} — Saturday maxes` : `Cycle week ${n}`,
    note: (test ? "Saturday: snatch, C&J, back squat" + (n === 6 ? ", front squat" : "") +
      " to a max, in that order — the last lift tested is the least trustworthy number of the day. Training maxes stay fixed through weeks 18–23; this is a checkpoint, not a re-base. " : "") + B3_SRC,
    days:[
      {id:"d1",label:"D1 Mon ⭐⭐⭐",primary:`Snatch + C&J singles ${mon} ${w.single}`,load:at("snatch", w.mon),
       secondary:`Back squat ${w.bs} · static trunk`,notes:"Every C&J ends in a split jerk."},
      {id:"d2",label:"D2 Tue ⭐⭐⭐",primary:`Snatch + C&J singles ${tue} ${w.single}`,load:at("snatch", w.tue),
       secondary:"Push press 3×3 — no squat today",notes:"Legs rest between Monday's and Thursday's squats."},
      {id:"d3",label:"D3 Thu ⭐⭐",primary:w.thu,load:"technique day",
       secondary:`Jerk variant · snatch balance · front squat ${w.fs} · one ab card`,notes:B3_THU_NOTE},
      {id:"d4",label:"D4 Sat ⭐⭐",primary: test ? "TEST — snatch, C&J, squat maxes" : `Snatch + C&J singles ${pct(w.sat)} ${w.single}`,
       load: test ? "max" : at("snatch", w.sat),
       secondary:`${w.sat_sq} · stiff-legged deadlift`,
       notes: test ? "Ladder each lift to a max; stop at form breakdown, not at the first miss." : "Paused squats: 3-sec pause in the bottom."},
    ],
  };
}

const PROGRAM_B3 = [
  {week:17, phase:"Transition", load:"60% · three sessions",
   focus:"Easy re-entry after the 72-hour fast",
   note:"Mon/Tue are fasting days — no session. Three easy sessions, Wed/Thu/Sat. " + B3_SRC,
   days:[
    {id:"d1",label:"D1 Wed ⭐⭐",primary:"Back squat ramp 55–70%",load:band("backSquat",0.55,0.70),
     secondary:"Strict press 3×8 · barbell row 3×8",notes:"Wednesday: full night's sleep, shift at 7 pm — hard stop by 3 pm. Ramp sets capped at 5 reps."},
    {id:"d3",label:"D3 Thu ⭐⭐",primary:"Snatch + 2 overhead squats",load:at("snatch",0.60),
     secondary:"Snatch pull 3×3 · snatch push press 3×5 · plank",notes:"Post-shift day; nothing here should feel hard."},
    {id:"d4",label:"D4 Sat ⭐⭐",primary:"Clean + 2 front squats + jerk",load:at("clean",0.60),
     secondary:"Front squat ramp 60–70% · good morning 3×8",notes:"Last easy day; the cycle starts Monday."},
   ]},
  b3WaveWeek(18, "Wave 1"), b3WaveWeek(19, "Wave 1"), b3WaveWeek(20, "Wave 1"),
  b3WaveWeek(21, "Wave 2"), b3WaveWeek(22, "Wave 2"), b3WaveWeek(23, "Wave 2"),
  {week:24, phase:"Transition", load:"60–70% · heavy singles Sat",
   focus:"Transition into Block 4",
   note:"Lighter week between cycles; no back squat this week. " + B3_SRC,
   days:[
    {id:"d1",label:"D1 Mon ⭐⭐⭐",primary:"Snatch 65% · C&J 60% singles",load:at("snatch",0.65),
     secondary:"Snatch pull · snatch deadlift · front squat 65%",notes:"Every C&J ends in a split jerk."},
    {id:"d2",label:"D2 Tue ⭐⭐⭐",primary:"Power snatch · power clean + power jerk 70%",load:at("snatch",0.70),
     secondary:"Overhead squat",notes:""},
    {id:"d3",label:"D3 Thu ⭐⭐",primary:"Split jerk from rack 70%",load:at("cleanAndJerk",0.70,"C&J TM"),
     secondary:"2-position snatch · 2-position clean",notes:"Post-shift day."},
    {id:"d4",label:"D4 Sat ⭐⭐",primary:"Heavy singles — snatch, C&J, front squat",load:"heaviest clean single",
     secondary:"Good morning 3×10 · plank",notes:"Heaviest clean single for today, not a max attempt."},
   ]},
];

// Block 3, per-exercise cards — same entry shape as app.jsx's BLOCK2_EXERCISES,
// so ExCard / TestLiftCard render them unchanged. Loads are computed from
// TRAINING_MAX when the page loads: the post-test TM update moves all of
// Block 3. Provenance comments name the source day ("src d16") or the design's
// Edit number — never source wording. Load rules (generateWeights): the kg must
// lead, a single-load string carries no second number, and never the words
// light / BW / band / cable.
const kg  = (lift, p) => `${tm(lift, p)} kg`;
const kgr = (lift, lo, hi) => `${tm(lift, lo)}–${tm(lift, hi)} kg`;
const b3e = (id, sets, reps, l1, extra = {}) => ({id, sets, reps, l1, l2:l1, ...extra});

const B3_SJ      = " — split jerk";                                            // Edit 5
const B3_FS_CEIL = " — ceiling, not target: stop at the first grinding rep";   // Edit 3
const B3_JERK    = " · empty-bar split jerks any day as warm-up";              // spec: drill is a note, not a card
const b3Trunk = () => b3e('trunk_static_strength', 3, 'varies', 'Bodyweight'); // Edit 6 (Mon) / Edit 7
const b3PushPress = () => b3e('push_press', 3, '3', `${kgr('pushPress', 0.60, 0.70)} — add weight weekly only while it stays fast`); // Edit 6 (Tue)
// [JUDGMENT] load — source gives no %; basis: Block 2's RDL at 75–85 kg, a touch lower for straight legs.
const b3Sldl = (sets, reps) => b3e('stiff_legged_deadlift', sets, reps, '70–80 kg — end of session');
const b3Sn  = (sets, p) => b3e('snatch', sets, '1', kg('snatch', p));
const b3Cj  = (sets, p) => b3e('clean_and_jerk', sets, '1', kg('cleanAndJerk', p) + B3_SJ);
// [JUDGMENT] load — pause back squat to an N-rep max has no %; 3RM band 70–80%, 2RM 75–85% of back squat TM.
const b3PauseBs = reps => reps === 3
  ? b3e('pause_back_squat', '4–6', '3', `${kgr('backSquat', 0.70, 0.80)} — work up to today's 3-rep max, 3-sec pause`)
  : b3e('pause_back_squat', '4–6', '2', `${kgr('backSquat', 0.75, 0.85)} — work up to today's 2-rep max, 3-sec pause`);
// Snatch balance: work up to the day's max, then sets at a % of it (src Wed of each cycle week).
const b3SbThen = (sets, reps, p) => b3e('snatch_balance', 1 + sets, `1 → ${reps}`,
  `${kgr('snatchBalance', p, 1.0)} — max for the day, then ${Math.round(p * 100)}% of it`);
// [JUDGMENT] lower bound — max-only weeks; 85% of TM as the place the climb gets serious.
const b3SbMax = () => b3e('snatch_balance', '3–5', '1', `${kgr('snatchBalance', 0.85, 1.0)} — max for the day`);
const b3Fs = (sets, reps, p) => b3e('front_squat', sets, String(reps), kg('frontSquat', p) + B3_FS_CEIL);

// Test cards — the week-16 d4 form: TestLiftCard renders the ladder + a free
// max; sets = rungs + the max, so session progress and log percentages hold.
const b3Test = (id, label, target) =>
  ({id, test:true, label, target, sets:B2_TEST_LADDER.length + 1, reps:'1', l1:'singles to a max', l2:'singles to a max'});
// [JUDGMENT] load — "heaviest single for today" has no %; 80–95% TM band, the Block 2 back-squat-singles rule.
const b3Heavy = (id, lift, suffix = '') => b3e(id, '3–5', '1', `${kgr(lift, 0.80, 0.95)} — heaviest clean single for today${suffix}`);
// [JUDGMENT] load — no good-morning number on file; kept far below the RDL.
const b3GoodMorning = reps => b3e('good_morning', 3, reps, '40–50 kg — pattern only');

const BLOCK3_EXERCISES = {
  // Transition-in — src d2 (→ Wed), d4 (Thu), d6 (Sat); src d1 dropped, Mon/Tue are fasting days (Edit 9)
  17: {
    d1: [b3e('back_squat', 4, '5', `${kgr('backSquat', 0.55, 0.70)} — ramp, one set at each step`), // src d2, Edit 8: reps capped at 5
         b3e('strict_press', 3, '8', '40–45 kg'),     // src d2 — [JUDGMENT] load; basis: overhead press best 62 × 2
         b3e('barbell_row', 3, '8', '50–60 kg')],     // src d2 — [JUDGMENT] load; no row on file, start conservative
    d3: [b3e('snatch_ohs_complex', 5, '1+2', kg('snatch', 0.60)),   // src d4
         b3e('snatch_pull', 3, '3', kg('snatch', 0.80)),           // src d4
         b3e('snatch_push_press', 3, '5', '40–45 kg'),             // src d4 — [JUDGMENT] load; basis: Block 2 wk 14 at 50 × 5
         b3e('plank', 2, '1 min', 'Bodyweight')],                  // src d4
    d4: [b3e('clean_fs_jerk_complex', 5, '1+2+1', kg('clean', 0.60) + B3_SJ),  // src d6
         b3e('front_squat', 3, '5 → 3', `${kgr('frontSquat', 0.60, 0.70)} — ramp`), // src d6
         b3GoodMorning('8')],                                                  // src d6; row conditioning dropped (Edit 6)
  },
  // Cycle week 1 — src d8 (Mon), d9 (Tue), d10 (Wed), d11 (Thu), d13 (Sat)
  18: {
    d1: [b3Sn(5, 0.80), b3Cj(5, 0.80),                                  // src d9
         b3e('back_squat', 5, '5', kg('backSquat', 0.75)), b3Trunk()],
    d2: [b3Sn(5, 0.80), b3Cj(5, 0.80), b3PushPress()],                  // src d11, front squat moved to Thu (Edit 2)
    d3: [b3e('three_position_snatch', 5, '3 positions', kg('snatch', 0.65)),        // src d8
         b3e('snatch_pull', 5, '5', kg('snatch', 0.85)),                            // src d8
         b3e('power_split_jerk_combo', 5, '2+1', kg('cleanAndJerk', 0.65) + B3_JERK), // src d8
         b3SbThen(3, 2, 0.75),                                                      // src d10
         b3Fs(3, 3, 0.85),                                                          // src d11
         b3e('ab_wheel', 3, '12', 'Bodyweight')],                                   // src d10, Edit 7
    d4: [b3Sn(5, 0.80), b3Cj(5, 0.80), b3PauseBs(3), b3Sldl(3, '8')],  // src d13
  },
  // Cycle week 2 — src d15, d16, d17, d18, d20
  19: {
    d1: [b3Sn(3, 0.90), b3Cj(3, 0.90), b3e('back_squat', 3, '3', kg('backSquat', 0.85)), b3Trunk()], // src d16
    d2: [b3Sn(3, 0.90), b3Cj(3, 0.90), b3PushPress()],                  // src d18
    d3: [b3e('clean_from_blocks', 6, '2', kg('clean', 0.65)),           // src d17
         b3e('clean_pull', 5, '4', kg('clean', 0.90)),                  // src d17
         b3e('power_jerk', 6, '2', kg('cleanAndJerk', 0.65) + B3_JERK), // src d15
         b3SbThen(2, 2, 0.80),                                          // src d17
         b3Fs(3, 2, 0.90),                                              // src d18
         b3Trunk()],                                                    // Edit 7 — no anti-extension work in src d15/d17
    d4: [b3Sn(3, 0.90), b3Cj(3, 0.90), b3PauseBs(2), b3Sldl(3, '6')],  // src d20
  },
  // Cycle week 3 — src d22, d23, d24, d25, d27 (Saturday maxes)
  20: {
    d1: [b3Sn(1, 0.95), b3Cj(1, 0.95), b3e('back_squat', 5, '1', kg('backSquat', 0.90)), b3Trunk()], // src d23
    d2: [b3Sn(1, 0.90), b3Cj(1, 0.90), b3PushPress()],                  // src d25
    d3: [b3e('power_snatch', 5, '2', kg('snatch', 0.75)),               // src d22
         b3e('snatch_pull', 3, '3', kg('snatch', 0.95)),                // src d22
         b3e('split_jerk_from_rack', 5, '2', kg('cleanAndJerk', 0.75) + B3_JERK), // src d22, Edit 5
         b3SbMax(),                                                     // src d24
         b3Fs(2, 1, 0.95),                                              // src d25
         b3e('ab_wheel', 3, '15', 'Bodyweight')],                       // src d24
    // src d27 — maxes in priority order (last tested = least trustworthy).
    d4: [b3Test('snatch', 'Snatch', TRAINING_MAX.snatch),
         b3Test('clean_and_jerk', 'Clean & Jerk', TRAINING_MAX.cleanAndJerk),
         b3Test('back_squat', 'Back Squat', TRAINING_MAX.backSquat),
         b3Sldl(3, '5'),
         b3Trunk()],                                                    // Edit 7 — replaces src sit-ups
  },
  // Cycle week 4 — src d29, d30, d31, d32, d34
  21: {
    d1: [b3Sn(5, 0.80), b3Cj(5, 0.80), b3e('back_squat', 5, '5', kg('backSquat', 0.78)), b3Trunk()], // src d30
    d2: [b3Sn(5, 0.80), b3Cj(5, 0.80), b3PushPress()],                  // src d32
    d3: [b3e('three_position_clean', 5, '3 positions', kg('clean', 0.70)),           // src d31
         b3e('clean_pull', 5, '5', kg('clean', 0.90)),                               // src d31
         b3e('power_split_jerk_combo', 5, '2+1', kg('cleanAndJerk', 0.70) + B3_JERK), // src d29
         b3SbThen(3, 2, 0.78),                                                       // src d31
         b3Fs(3, 3, 0.88),                                                           // src d32
         b3e('ab_wheel', 3, '14', 'Bodyweight')],                                    // src d31
    d4: [b3Sn(5, 0.80), b3Cj(5, 0.80), b3PauseBs(3), b3Sldl(3, '6')],  // src d34
  },
  // Cycle week 5 — src d36, d37, d38, d39, d41
  22: {
    d1: [b3Sn(4, 0.90), b3Cj(4, 0.90), b3e('back_squat', 3, '3', kg('backSquat', 0.88)), b3Trunk()], // src d37
    d2: [b3Sn(4, 0.90), b3Cj(4, 0.90), b3PushPress()],                  // src d39
    d3: [b3e('snatch_from_blocks', 5, '2', kg('snatch', 0.70)),         // src d36
         b3e('snatch_pull', 5, '3', kg('snatch', 0.95)),                // src d36
         b3e('power_jerk', 5, '2', kg('cleanAndJerk', 0.70) + B3_JERK), // src d36
         b3SbThen(3, 2, 0.80),                                          // src d38
         b3Fs(3, 2, 0.93),                                              // src d39
         b3e('plank', 2, 'max hold', 'Bodyweight')],                    // src d38
    d4: [b3Sn(4, 0.90), b3Cj(4, 0.90), b3PauseBs(2), b3Sldl(3, '5')],  // src d41
  },
  // Cycle week 6 — src d43, d44, d45, d46, d48 (block test Saturday)
  23: {
    // src d44/d46 give ranges: aim inside, keep it lighter if the day calls for it.
    d1: [b3e('snatch', 1, '1', `${kgr('snatch', 0.90, 0.95)} — one single in the range`),
         b3e('clean_and_jerk', 1, '1', `${kgr('cleanAndJerk', 0.90, 0.95)} — one single in the range${B3_SJ}`),
         b3e('back_squat', 5, '1', kg('backSquat', 0.90)), b3Trunk()],  // src d44
    d2: [b3e('snatch', 1, '1', `${kgr('snatch', 0.85, 0.90)} — one single in the range`),
         b3e('clean_and_jerk', 1, '1', `${kgr('cleanAndJerk', 0.85, 0.90)} — one single in the range${B3_SJ}`),
         b3PushPress()],                                                // src d46
    d3: [b3e('power_clean', 5, '2', kg('clean', 0.75)),                 // src d45
         b3e('clean_pull', 3, '3', kg('clean', 0.95)),                  // src d45
         b3e('split_jerk_from_rack', 5, '2', kg('cleanAndJerk', 0.75) + B3_JERK), // src d43, Edit 5
         b3SbMax(),                                                     // src d45
         b3Fs(2, 1, 0.95),                                              // src d46
         b3Trunk()],                                                    // Edit 7 — src d45 finisher is flexion/side work
    // src d48 — block test; front squat added fourth (Edit 10).
    d4: [b3Test('snatch', 'Snatch', TRAINING_MAX.snatch),
         b3Test('clean_and_jerk', 'Clean & Jerk', TRAINING_MAX.cleanAndJerk),
         b3Test('back_squat', 'Back Squat', TRAINING_MAX.backSquat),
         b3Test('front_squat', 'Front Squat', TRAINING_MAX.frontSquat),
         b3Sldl(3, '5')],
  },
  // Transition-out — src d50 (Mon), d51 (Tue), d53 (Thu), d55 (Sat); src d52 dropped (spec, Week 24)
  24: {
    d1: [b3Sn(3, 0.65), b3Cj(3, 0.60),                                  // src d50
         b3e('snatch_pull', 3, '3', kg('snatch', 0.80)),
         b3e('snatch_deadlift', 3, '3', kg('snatch', 0.90)),
         b3e('front_squat', 3, '4', kg('frontSquat', 0.65))],
    d2: [b3e('power_snatch', 3, '1', kg('snatch', 0.70)),               // src d51
         b3e('power_clean_power_jerk', 3, '1+1', kg('clean', 0.70)),
         // [JUDGMENT] load — no OHS TM; % of the 72 kg week-8 OHS test.
         b3e('overhead_squat', 3, '1 → 3', `${Math.round(72 * 0.60 * 2) / 2}–${Math.round(72 * 0.70 * 2) / 2} kg — one single at the top, then two triples lower`)],
    d3: [b3e('split_jerk_from_rack', 3, '1', kg('cleanAndJerk', 0.70)), // src d53, Edit 5
         b3e('two_position_snatch', 3, '2 positions', kg('snatch', 0.60)),
         b3e('two_position_clean', 3, '2 positions', kg('clean', 0.60))],
    d4: [b3Heavy('snatch', 'snatch'),                                   // src d55
         b3Heavy('clean_and_jerk', 'cleanAndJerk', B3_SJ),
         b3Heavy('front_squat', 'frontSquat'),
         b3GoodMorning('10'),
         b3e('plank', 2, 'max hold', 'Bodyweight')],
  },
};

const PROGRAM_OUTLINE = [
  {week:25,block:4,phase:"Peak",load:"88–93%",focus:"Peak 1 — volume down, intensity up",notes:"3×1 on snatch + clean. Jerk daily max. Accessories cut in half."},
  {week:26,block:4,phase:"Peak",load:"90–95%",focus:"Peak 2 — sharpen the singles",notes:"2×1 on snatch + clean at 90%. Attempt PR if moving well."},
  {week:27,block:4,phase:"Mock Competition",load:"85–92%",focus:"Mock competition — full warm-up protocol",notes:"3 mock sessions. Attempt selection practice. Opener = 90% of target."},
  {week:28,block:4,phase:"Taper",load:"85%",focus:"Taper — volume −50%, sharpen only",notes:"2 sessions only. Target: Snatch 70 kg · C&J 90 kg."},
];

// Block boundaries — the ONE definition. Block progress, week routing and the
// block header all derive from this. They used to be three separate inline
// literals, and they drifted: the dashboard computed progress from a 6-week
// Block 1 while PROGRAM_B1 held eight weeks, so weeks 7-8 displayed as Block 2.
const BLOCK_BOUNDS = [
  {block:1, start:1,  end:8,  name:"HYPERTROPHY"},
  // Not "TECHNIQUE" - the source document rejects "Technique Consolidation"
  // by name: Block 2 is the block in which the lifts move to the floor.
  {block:2, start:9,  end:16, name:"FLOOR"},
  {block:3, start:17, end:24, name:"STRENGTH"},
  {block:4, start:25, end:28, name:"COMP PREP"},
];

function blockFor(week) {
  return BLOCK_BOUNDS.find(b => week >= b.start && week <= b.end) || null;
}

// Week 1-8 -> PROGRAM_B1, 9-16 -> PROGRAM_B2, 17-24 -> PROGRAM_B3, 25-28 -> the one-line outline.
// Returns null (never undefined) outside that range so callers can test it.
function weekPlan(week) {
  const b = blockFor(week);
  if (!b) return null;
  if (b.block === 1) return PROGRAM_B1[week - b.start] || null;
  if (b.block === 2) {
    return (typeof PROGRAM_B2 !== "undefined" && PROGRAM_B2[week - b.start]) ||
           PROGRAM_OUTLINE.find(w => w.week === week) || null;
  }
  if (b.block === 3) return PROGRAM_B3[week - b.start] || null;
  return PROGRAM_OUTLINE.find(w => w.week === week) || null;
}

// The days a week needs logged to count as complete. Block 3 uses the week's
// own day list (week 17 has no d2 — the athlete is fasting). Every other week
// keeps the four school-term days: Block 1's plans list five SUMMER days, and
// counting d5 would change what "complete" has always meant for those weeks.
// The plan day a logged session belongs to. The label's digit first ("D2 Tue"
// → d2) — the same rule inferDaysFromLogs uses — because Block 3's wave weeks
// give d1/d2/d4 an identical `primary`, and matching on it sent Tue and Sat
// sessions to Monday. Then the older keys, for sessions logged without a label.
function planDayForLog(week, entry) {
  const days = weekPlan(week)?.days || [];
  const n = entry.dayLabel && entry.dayLabel.match(/(\d+)/);
  return (n && days.find(d => d.id === `d${n[1]}`)) ||
    days.find(d => d.id === entry.dayName || d.primary === entry.dayName ||
      (entry.dayLabel && d.label === entry.dayLabel)) || null;
}

function completionDayIds(week) {
  const days = blockFor(week)?.block === 3 ? weekPlan(week)?.days : null;
  return days ? days.map(d => d.id) : ["d1", "d2", "d3", "d4"];
}

const BLOCK_COLORS = {1:"#4a90d9",2:"#c94f3a",3:"#d4a843",4:"#5a9e45"};
const PHASE_COLORS = {
  "Phase 1":"#4a90d9","Phase 2":"#d4a843","Deload":"#888","Test":"#5a9e45",
  "Accumulation":"#c94f3a","Intensification":"#d4a843","Volume":"#4a90d9",
  "Mock Competition":"#8b5cf6","Peak":"#5a9e45","Taper":"#8b5cf6",
  "Transition":"#888","Wave 1":"#d4a843","Wave 2":"#c94f3a",
};

const BLOCKS = [
  {
    id:1, label:"BLOCK 1", name:"Hypertrophy Foundation", weeks:"8 wks (1–8)",
    color:"#4a90d9", goal:"Build muscular base, tissue resilience, fix OHS ceiling",
    phases:["Wks 1–3: 65–75% TM · 4×6–8 accessory · position learning","Wks 4–6: 72–82% TM · daily max singles on jerk begin · top-end singles","Wk 7 deload: same loads, volume −40%","Wk 8 test: 1RM attempts"],
    // b2_hang_ratio/b2_crutch/b2_overhead moved here from BLOCK 2 (2026-08-16,
    // final-branch review finding I4) - they are the source document's Entry
    // Gate ("checks to run before week 9"), not Block 2 exit criteria. The
    // gate the app rendered here before (OHS >= 60kg, snatch @ 75-80% TM)
    // cited nothing and was exactly the kind of invented number this project
    // exists to catch.
    advancement:[
      {id:"b2_hang_ratio",text:"Hang variations sit at ~90% of the same lift from the floor — the hang has stopped paying [E9.5, E9.7]"},
      {id:"b2_crutch",   text:"No hang crutch: floor numbers track the hang instead of lagging it [E9.5, E8.5]"},
      {id:"b2_overhead", text:"Snatch balance at least matches the best snatch — ideally ~10% or ~15 kg more, comfortably [E10.3, E10.1]"},
      {id:"b1_back", text:"Back pain stable at 🟡 or better for 2+ weeks"},
      {id:"b1_weeks",text:"8 weeks completed"},
    ],
  },
  {
    id:2, label:"BLOCK 2", name:"The Floor Transition", weeks:"8 wks (9–16)",
    color:"#d4a843", goal:"Move the competition lifts to the floor and keep them there — full lifts plus variation from wk 9, variation stripped toward the test [E31.4]",
    phases:[
      "Wks 9–14 loading: rep bracket ladder, ~2 weeks per bracket — 1–3 reps → 4–5×3 → 2–4×1–3 → doubles/singles [E36.3, E36.11]. Squat holds 65–70% × 3–5 throughout [E20.10]",
      "Wk 15 back-off: weights −10–15%, volume −15–25% (Everett's depth, not Torokhtiy's) [E5.11]. Wk 16 test [E39.2]",
    ],
    // b2_hang_ratio/b2_crutch/b2_overhead moved to BLOCK 1 (see note there) -
    // they gate entry into this block, not exit from it. What's left below is
    // this block's actual exit criteria: the wk16 test and the 8 weeks.
    advancement:[
      {id:"b2_test",     text:"Wk 16 tested: snatch, C&J, front squat, snatch-balance diagnostic; stopped at form breakdown, not at the first miss [E39.2, E5.6, E10.3]"},
      {id:"b2_weeks",    text:"8 weeks completed (9–16)"},
    ],
  },
  {
    id:3, label:"BLOCK 3", name:"Strength — One Program, Adapted", weeks:"8 wks (17–24)",
    color:"#c94f3a", goal:"Snatch 60–65 from the floor · C&J 80 · back squat 140 · front squat 125 (week-23 test)",
    phases:["Wk 17: easy re-entry after the fast (Wed/Thu/Sat)","Wks 18–20: wave 1 — singles 80 → 90 → 95%, Saturday maxes wk 20","Wks 21–23: wave 2 — same wave, block test Sat wk 23","Wk 24: transition into Block 4"],
    advancement:[
      {id:"b3_test",  text:"Wk 23 tested: snatch, C&J, back squat, front squat"},
      {id:"b3_goals", text:"Goals met: snatch 60–65 · C&J 80 · back squat 140 · front squat 125"},
      {id:"b3_weeks", text:"8 weeks completed (17–24)"},
    ],
  },
  {
    id:4, label:"BLOCK 4", name:"Competition Prep", weeks:"4 wks",
    color:"#8b5cf6", goal:"Volume –40%, intensity preserved; translate strength to performance",
    phases:["2–3 mock competition sessions with full warm-up protocol","Competition movement only — no variation chasing"],
    advancement:[],
  },
];
