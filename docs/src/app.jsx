const { useState, useEffect, useRef, useMemo } = React;

const injectFonts = () => {
  if (document.getElementById("oly-fonts")) return;
  const l = document.createElement("link");
  l.id = "oly-fonts"; l.rel = "stylesheet";
  l.href = "https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap";
  document.head.appendChild(l);
};

const injectStyles = () => {
  if (document.getElementById("oly-styles")) return;
  const s = document.createElement("style");
  s.id = "oly-styles";
  s.textContent = `
    *{box-sizing:border-box;margin:0;padding:0}
    :root{
      --bg:#0a0a0a;--bg1:#111;--bg2:#161616;--bg3:#1c1c1c;
      --border:#222;--border2:#2a2a2a;
      --text:#e2e2e2;--text2:#888;--text3:#444;
      --gold:#d4a843;--red:#c94f3a;--blue:#4a90d9;--green:#5a9e45;--purple:#8b5cf6;
    }
    body{background:var(--bg);color:var(--text);font-family:'DM Sans',sans-serif}
    ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:var(--bg)}
    ::-webkit-scrollbar-thumb{background:var(--border2);border-radius:2px}
    input,select,textarea{font-family:'DM Sans',sans-serif}
    input:focus,select:focus,textarea:focus{outline:none!important;border-color:var(--gold)!important}
    .fade{animation:fadeIn 0.25s ease}
    @keyframes fadeIn{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:none}}
    .tab-scroll::-webkit-scrollbar{display:none}
  `;
  document.head.appendChild(s);
};

// ── PRs from FitNotes ─────────────────────────────────────────────────────────
const SEED_PRS = {
  back_squat:        {weight:118, date:"2026-05-15", reps:1},
  clean_pull:        {weight:120, date:"2025-11-05", reps:3},
  deadlift:          {weight:115, date:"2025-08-25", reps:3},
  klokov_squat:      {weight:107, date:"2025-11-28", reps:1},
  front_squat:       {weight:102, date:"2025-10-03", reps:2},
  rdl:               {weight:102, date:"2026-01-17", reps:3},
  lat_pulldown:      {weight:105, date:"2025-08-25", reps:5},
  snatch_high_pull:  {weight:92,  date:"2025-09-27", reps:4},
  snatch_deadlift:   {weight:92,  date:"2025-11-18", reps:4},
  good_morning:      {weight:75,  date:"2025-11-05", reps:5},
  overhead_press:    {weight:62,  date:"2025-09-20", reps:2},
  hang_power_snatch: {weight:62,  date:"2026-01-17", reps:1},
  muscle_snatch:     {weight:58,  date:"2025-12-23", reps:1},
  snatch_balance:    {weight:55,  date:"2025-12-23", reps:3},
  snatch:            {weight:55,  date:"2025-11-01", reps:2},
  clean:             {weight:80,  date:"2025-01-01", reps:1},
  clean_and_jerk:    {weight:65,  date:"2025-01-01", reps:1},
  push_jerk:         {weight:60,  date:"2025-04-11", reps:1},
  overhead_squat:    {weight:50,  date:"2025-10-20", reps:4},
  sots_press:        {weight:30,  date:"2025-10-22", reps:5},
  bench_press:       {weight:98,  date:"2024-12-16", reps:2},
  klokov_trapi:      {weight:72,  date:"2025-10-06", reps:5},
  berestov_squat:    {weight:82,  date:"2025-11-15", reps:1},
};

// ── Review storage ────────────────────────────────────────────────────────────
const REVIEWS_KEY = "oly_reviews";
const reviewStorage = {
  getAll: () => { try { return JSON.parse(localStorage.getItem(REVIEWS_KEY)||"{}"); } catch { return {}; } },
  get:    (week) => reviewStorage.getAll()[week] ?? null,
  save:   (week, data) => {
    const all = reviewStorage.getAll();
    all[week] = { ...data, week, savedAt: new Date().toISOString() };
    try { localStorage.setItem(REVIEWS_KEY, JSON.stringify(all)); } catch { return null; }
    sbSync.upsertReview(week, data);
    return all[week];
  },
};

// ── Sleep quality badges ──────────────────────────────────────────────────────
const SLEEP = {
  full:    {label:"FULL SLEEP",    color:"#5a9e45", bg:"rgba(90,158,69,0.12)"},
  good:    {label:"GOOD SLEEP",    color:"#4a90d9", bg:"rgba(74,144,217,0.12)"},
  partial: {label:"5.5H SLEEP",    color:"#d4a843", bg:"rgba(212,168,67,0.12)"},
  warn:    {label:"SHIFT FATIGUE", color:"#c94f3a", bg:"rgba(201,79,58,0.12)"},
};

// ── Exercise Catalog ──────────────────────────────────────────────────────────
// `desc`, where present, is a real cited coaching cue from
// summaries_archive/dozer_cue_index.md (Dozer/Webster) — not a generic
// instruction. That index only covers 7 movement-phase categories (snatch/
// clean pull & receive, jerk drive/lockout, posterior chain), so most
// exercises have no `desc` at all — left blank rather than inventing one,
// consistent with this project's no-uncited-content rule.
const EXERCISE_CATALOG = {
  // ── In program ────────────────────────────────────────────────────────────
  muscle_snatch:          { id:'muscle_snatch',          name:'Muscle Snatch',               type:'snatch',
    desc:"Keep arms passive in the pull — transfer tension to the back and lats rather than arm-driven pulling. (Dozer)" },
  hang_power_snatch:      { id:'hang_power_snatch',      name:'Hang Power Snatch',           type:'snatch',
    desc:"Internal rotation, not external, in the catch — front side pulls in short, back gets long. External rotation causes disconnection and an early drop in turnover; directly addresses your OHS limiter. (Dozer, high-confidence)" },
  snatch_balance:         { id:'snatch_balance',         name:'Snatch Balance',              type:'snatch',
    desc:"Bar on the back, snatch grip. Short dip-drive, then push yourself down under the bar into a full overhead squat. Hold the bottom 5 sec before standing [E11.3]. Overhead check: snatch balance should reach your best snatch, ideally 10–15 kg over [E10.3]." },
  overhead_squat:         { id:'overhead_squat',         name:'Overhead Squat',              type:'snatch',
    desc:"Lock the bar in forcefully, then keep upper back, shoulders, arms and bar motionless for the whole rep. (Everett)\nShoulder blades squeezed up and together; bar over the back of the neck, in the palm just behind the forearm; grip only as tight as control needs. (Everett)\nThe goal is a bottom position so routine you never hesitate to receive a snatch there. (Everett)" },
  sots_press:             { id:'sots_press',             name:'Sots Press',                  type:'snatch'    },
  hang_power_clean:       { id:'hang_power_clean',       name:'Hang Power Clean',            type:'cj',
    desc:"Elbows out and down, not high/narrow, to create a posterior trap shelf. A wider grip helps posterior connection — avoid a forward shoulder lean. (Dozer)" },
  clean_pull:             { id:'clean_pull',             name:'Clean Pull',                  type:'cj',
    desc:"Elbows stay above the bar until it passes the chest, then rotate. Shoulders directly over the bar at the power position — punch legs, then pull under. (Dozer)" },
  jerk_from_rack:         { id:'jerk_from_rack',         name:'Jerk from Rack',              type:'cj',
    desc:"Load weight into the forefoot before dipping, not the toes — bar stays directly over that spot for a straight vertical drive. (Dozer)" },
  push_press:             { id:'push_press',             name:'Push Press',                  type:'cj',
    desc:"Dip like a basketball jump — load quads and glutes, keep the bar directly over your foot pressure throughout. (Webster)" },
  clean_and_jerk:         { id:'clean_and_jerk',         name:'Clean & Jerk',                type:'cj',
    desc:"Maintain the diaphragm brace from clean into jerk dip — don't exhale or reset. Treat clean and jerk as one lift, not two. (Dozer/Webster, high-confidence)" },
  back_squat:             { id:'back_squat',             name:'Back Squat',                  type:'strength',
    desc:"Set your lower back's natural arch, not an exaggerated one, and keep it for the whole rep: no rounding at the bottom, no hip thrust at the top. (Sika)\nGo heavy only as deep as that arch holds. (Everett)\nKnees forward over the toes, hips close to the heels. Standing up, keep driving the knees forward so the hips don't shoot back. (Sika)" },
  front_squat:            { id:'front_squat',            name:'Front Squat',                 type:'strength',
    desc:"Rack: shoulders forward and slightly up, bar sitting on them, and a full hand around the bar, not two fingers. (Everett · Foreman)\nKnees travel forward over the toes and the pressure stays in the quads, with the torso upright. (Sika/Telander)" },
  klokov_squat:           { id:'klokov_squat',           name:'Klokov Squat',                type:'strength'  },
  berestov_squat:         { id:'berestov_squat',         name:'Berestov Squat',              type:'strength'  },
  rdl:                    { id:'rdl',                    name:'Romanian Deadlift',            type:'strength',
    desc:"Neutral or slightly rounded back beats a hyperarched one — brace hard into neutral/slight flexion for better tension distribution. Directly relevant given chronic back pain. (Dozer, high-confidence)" },
  good_morning:           { id:'good_morning',           name:'Good Morning',                type:'strength',
    desc:"Neutral or slightly rounded back beats a hyperarched one — brace hard into neutral/slight flexion for better tension distribution. Directly relevant given chronic back pain. (Dozer, high-confidence)" },
  lunge:                  { id:'lunge',                  name:'Lunge (Barbell)',              type:'strength'  },
  weighted_pull_up:       { id:'weighted_pull_up',       name:'Weighted Pull Up',            type:'strength'  },
  incline_barbell_press:  { id:'incline_barbell_press',  name:'Incline Barbell Press',       type:'strength'  },
  weighted_dips:          { id:'weighted_dips',          name:'Weighted Parallel Bar Dips',  type:'strength'  },
  klokov_trapi:           { id:'klokov_trapi',           name:'Klokov Trapi',                type:'strength'  },
  wide_overhead_press:    { id:'wide_overhead_press',    name:'Wide Overhead Press',         type:'strength'  },
  behind_neck_press:      { id:'behind_neck_press',      name:'Behind Neck Press',           type:'strength'  },
  ghr:                    { id:'ghr',                    name:'GHR (Glute Ham Raise)',        type:'strength'  },
  face_pull:              { id:'face_pull',              name:'Face Pull',                   type:'accessory' },
  pallof_press:           { id:'pallof_press',           name:'Pallof Press',                type:'accessory' },
  dead_bug:               { id:'dead_bug',               name:'Dead Bug',                    type:'accessory' },
  plank:                  { id:'plank',                  name:'Plank',                       type:'accessory',
    desc:"Brace as you would under a bar: lower abs tight and pushed down, not sucked in. (Everett)\nHold the position still. In the lifts the trunk's job is to be a rigid support. (Everett)" },
  ab_wheel:               { id:'ab_wheel',               name:'Ab Wheel / Rollout',          type:'accessory',
    desc:"Roll out only as far as you can still control the position, hold it there, then roll back. (Gregory, via Sika)" },
  // ── Snatch variations ─────────────────────────────────────────────────────
  snatch:                      { id:'snatch',                      name:'Snatch',                       type:'snatch',
    desc:"Off the floor, shoulders and hips rise together; shins vertical by the time the bar reaches the knee. (Dozer · Sika)\nArms long and shoulders down until the bar reaches the hip; then keep the elbows above the bar until it passes your chest. (Dozer)\nSettle the bottom position before you stand. Don't rush out of the squat. (Everett · Dozer)" },
  power_snatch:                { id:'power_snatch',                name:'Power Snatch',                 type:'snatch',
    desc:"Finish the pull, then get under fast. Having less time and distance to get under the bar is what trains second- and third-pull speed. (Everett)\nThe bar has to go higher than in a squat snatch. (Webster)" },
  hang_snatch:                 { id:'hang_snatch',                 name:'Hang Snatch',                  type:'snatch' },
  snatch_from_blocks:          { id:'snatch_from_blocks',          name:'Snatch from Blocks',           type:'snatch',
    desc:"Start in the position you'd pass through from the floor. Blocks only carry over to the floor if the position matches. (Sika)\nAbove the knee the job is speed: no early arm bend, then a fast, vertical extension. (Sika)\nIt's easier to commit under the bar off blocks than off the floor. Use that to practise going under. (Dozer)" },
  snatch_pull:                 { id:'snatch_pull',                 name:'Snatch Pull',                  type:'snatch',
    desc:"Full foot engagement — spread toes, create arch pressure, not heels. Prevents balance loss through the pull. (Dozer/Webster, high-confidence)" },
  snatch_high_pull:            { id:'snatch_high_pull',            name:'Snatch High Pull',             type:'snatch' },
  snatch_deadlift:             { id:'snatch_deadlift',             name:'Snatch Deadlift',              type:'snatch',
    desc:"Same positions as your snatch, done slowly. Feel the back angle so you can carry it into the lift. (Torokhtiy)\nKeep one back angle through the first pull; at the knee, shins vertical and shoulders in front of the bar. (Everett · Sika)\nThis isn't a max deadlift: at snatch weights you can keep the back set, so keep it set. (Everett)" },
  drop_snatch:                 { id:'drop_snatch',                 name:'Drop Snatch',                  type:'snatch' },
  tall_snatch:                 { id:'tall_snatch',                 name:'Tall Snatch',                  type:'snatch',
    desc:"One of the snatch variants that emphasize the pull under the bar. (Everett)" },
  pause_snatch:                { id:'pause_snatch',                name:'Pause Snatch',                 type:'snatch' },
  tempo_snatch:                { id:'tempo_snatch',                name:'Tempo Snatch',                 type:'snatch' },
  deficit_snatch:              { id:'deficit_snatch',              name:'Deficit Snatch',               type:'snatch' },
  snatch_pull_from_blocks:     { id:'snatch_pull_from_blocks',     name:'Snatch Pull from Blocks',      type:'snatch' },
  heaving_snatch_balance:      { id:'heaving_snatch_balance',      name:'Heaving Snatch Balance',       type:'snatch' },
  pressing_snatch_balance:     { id:'pressing_snatch_balance',     name:'Pressing Snatch Balance',      type:'snatch' },
  // ── Clean variations ──────────────────────────────────────────────────────
  clean:                  { id:'clean',                  name:'Clean',                       type:'cj' },
  power_clean:            { id:'power_clean',            name:'Power Clean',                 type:'cj',
    desc:"Finish the extension, then pull yourself down onto the bar, keeping the torso upright. (Sika)\nLand in your squat stance with hips back over the heels, not a wide starfish, so a heavy one can ride down into a full clean. (Sika)\nRack it on shoulders pushed forward and slightly up. (Everett)" },
  hang_clean:             { id:'hang_clean',             name:'Hang Clean',                  type:'cj' },
  clean_from_blocks:      { id:'clean_from_blocks',      name:'Clean from Blocks',           type:'cj',
    desc:"Above the knee the work is the second pull and the turnover: explode, then get under fast. (Sika · Torokhtiy)\nStart in the position you'd pass through from the floor. (Sika)" },
  muscle_clean:           { id:'muscle_clean',           name:'Muscle Clean',                type:'cj' },
  tall_clean:             { id:'tall_clean',             name:'Tall Clean',                  type:'cj',
    desc:"The clean version of a variant that emphasizes the pull under the bar. (Everett)" },
  pause_clean:            { id:'pause_clean',            name:'Pause Clean',                 type:'cj' },
  tempo_clean:            { id:'tempo_clean',            name:'Tempo Clean',                 type:'cj' },
  deficit_clean:          { id:'deficit_clean',          name:'Deficit Clean',               type:'cj' },
  clean_deadlift:         { id:'clean_deadlift',         name:'Clean Deadlift',              type:'cj',
    desc:"Arms bending early is probably a strength problem too: getting the bar to mid/high thigh with the shoulders still over it. Segment deadlifts build it. (Everett)\nPause at mid-thigh, where the second pull starts: shins vertical, shoulders slightly in front of the bar, weight not back on the heels. (Everett)" },
  clean_pull_from_blocks: { id:'clean_pull_from_blocks', name:'Clean Pull from Blocks',      type:'cj' },
  clean_high_pull:        { id:'clean_high_pull',        name:'Clean High Pull',             type:'cj' },
  // ── Jerk variations ───────────────────────────────────────────────────────
  power_jerk:             { id:'power_jerk',             name:'Power Jerk',                  type:'cj',
    desc:"Dip and drive shorter than a split jerk — avoid going too deep and losing control. (Torokhtiy, via Dozer)" },
  split_jerk:             { id:'split_jerk',             name:'Split Jerk',                  type:'cj',
    desc:"Maintain the diaphragm brace from clean into jerk dip — don't exhale or reset. Treat clean and jerk as one lift, not two. (Dozer/Webster, high-confidence)" },
  tall_jerk:              { id:'tall_jerk',              name:'Tall Jerk',                   type:'cj' },
  pause_jerk:             { id:'pause_jerk',             name:'Pause Jerk',                  type:'cj' },
  jerk_balance:           { id:'jerk_balance',           name:'Jerk Balance',                type:'cj' },
  back_jerk:              { id:'back_jerk',              name:'Back Jerk',                   type:'cj' },
  jerk_from_blocks:       { id:'jerk_from_blocks',       name:'Jerk from Blocks',            type:'cj' },
  push_jerk:              { id:'push_jerk',              name:'Push Jerk',                   type:'cj' },
  // ── Squat variations ──────────────────────────────────────────────────────
  pause_back_squat:       { id:'pause_back_squat',       name:'Pause Back Squat',            type:'strength',
    desc:"Hold the full 3-second pause, then stand without a bounce. Taking away the stretch reflex is the point. (Torokhtiy)\nUse a weight you can stand up in good position. A slow rep in the right position beats a fast one that tips forward. (Everett)" },
  tempo_back_squat:       { id:'tempo_back_squat',       name:'Tempo Back Squat',            type:'strength' },
  pause_front_squat:      { id:'pause_front_squat',      name:'Pause Front Squat',           type:'strength' },
  tempo_front_squat:      { id:'tempo_front_squat',      name:'Tempo Front Squat',           type:'strength' },
  pause_overhead_squat:   { id:'pause_overhead_squat',   name:'Pause Overhead Squat',        type:'strength' },
  box_squat:              { id:'box_squat',              name:'Box Squat',                   type:'strength' },
  split_squat:            { id:'split_squat',            name:'Split Squat',                 type:'strength' },
  single_leg_squat:       { id:'single_leg_squat',       name:'Single Leg Squat',            type:'strength' },
  belt_squat:             { id:'belt_squat',             name:'Belt Squat',                  type:'strength' },
  hack_squat:             { id:'hack_squat',             name:'Hack Squat',                  type:'strength' },
  // ── Pulls & deadlifts ─────────────────────────────────────────────────────
  deadlift:               { id:'deadlift',               name:'Deadlift',                    type:'strength' },
  deficit_deadlift:       { id:'deficit_deadlift',       name:'Deficit Deadlift',            type:'strength' },
  pause_deadlift:         { id:'pause_deadlift',         name:'Pause Deadlift',              type:'strength' },
  sumo_deadlift:          { id:'sumo_deadlift',          name:'Sumo Deadlift',               type:'strength' },
  single_leg_deadlift:    { id:'single_leg_deadlift',    name:'Single Leg Deadlift',         type:'strength' },
  trap_bar_deadlift:      { id:'trap_bar_deadlift',      name:'Trap Bar Deadlift',           type:'strength' },
  deficit_rdl:            { id:'deficit_rdl',            name:'Deficit RDL',                 type:'strength' },
  snatch_grip_deadlift:   { id:'snatch_grip_deadlift',   name:'Snatch Grip Deadlift',        type:'strength' },
  high_pull:              { id:'high_pull',              name:'High Pull',                   type:'strength' },
  // ── Upper — press ─────────────────────────────────────────────────────────
  overhead_press:         { id:'overhead_press',         name:'Overhead Press',              type:'strength' },
  strict_press:           { id:'strict_press',           name:'Strict Press',                type:'strength',
    desc:"Finish in the jerk's overhead position: bar over the back of the neck, shoulder blades squeezed up and together, elbows slightly out. (Everett)\nGrip only as tight as control needs, with the bar in the palm just behind the centre of the forearm. (Everett)" },
  bench_press:            { id:'bench_press',            name:'Bench Press',                 type:'strength' },
  decline_bench_press:    { id:'decline_bench_press',    name:'Decline Bench Press',         type:'strength' },
  landmine_press:         { id:'landmine_press',         name:'Landmine Press',              type:'strength' },
  dumbbell_press:         { id:'dumbbell_press',         name:'Dumbbell Press',              type:'strength' },
  dumbbell_incline_press: { id:'dumbbell_incline_press', name:'Dumbbell Incline Press',      type:'strength' },
  // ── Upper — pull ──────────────────────────────────────────────────────────
  pull_up:                { id:'pull_up',                name:'Pull Up',                     type:'strength' },
  lat_pulldown:           { id:'lat_pulldown',           name:'Lat Pulldown',                type:'strength' },
  barbell_row:            { id:'barbell_row',            name:'Barbell Row',                 type:'strength',
    desc:"Pendlay style carries over most: bar from the floor every rep, hips high as in a deadlift, pull to the ribs, plates back to the floor each time. (Dozer)\nTrain the back directly. Pulls and squats alone don't do it. (Sika)" },
  pendlay_row:            { id:'pendlay_row',            name:'Pendlay Row',                 type:'strength' },
  seal_row:               { id:'seal_row',               name:'Seal Row',                    type:'strength' },
  dumbbell_row:           { id:'dumbbell_row',           name:'Dumbbell Row',                type:'strength' },
  cable_row:              { id:'cable_row',              name:'Cable Row',                   type:'strength' },
  upright_row:            { id:'upright_row',            name:'Upright Row',                 type:'strength' },
  shrug:                  { id:'shrug',                  name:'Barbell Shrug',               type:'strength' },
  // ── Posterior chain ───────────────────────────────────────────────────────
  back_extension:         { id:'back_extension',         name:'Back Extension',              type:'strength' },
  reverse_hyper:          { id:'reverse_hyper',          name:'Reverse Hyper',               type:'strength' },
  leg_curl:               { id:'leg_curl',               name:'Leg Curl',                    type:'strength' },
  leg_press:              { id:'leg_press',              name:'Leg Press',                   type:'strength' },
  leg_extension:          { id:'leg_extension',          name:'Leg Extension',               type:'strength' },
  nordic_curl:            { id:'nordic_curl',            name:'Nordic Curl',                 type:'strength' },
  // ── Carries ───────────────────────────────────────────────────────────────
  overhead_carry:         { id:'overhead_carry',         name:'Overhead Carry',              type:'strength' },
  farmers_carry:          { id:'farmers_carry',          name:"Farmer's Carry",              type:'strength' },
  suitcase_carry:         { id:'suitcase_carry',         name:'Suitcase Carry',              type:'strength' },
  sled_push:              { id:'sled_push',              name:'Sled Push',                   type:'strength' },
  // ── Plyometric ────────────────────────────────────────────────────────────
  box_jump:               { id:'box_jump',               name:'Box Jump',                    type:'strength' },
  jump_squat:             { id:'jump_squat',             name:'Jump Squat',                  type:'strength' },
  broad_jump:             { id:'broad_jump',             name:'Broad Jump',                  type:'strength' },
  // ── Core ──────────────────────────────────────────────────────────────────
  side_plank:             { id:'side_plank',             name:'Side Plank',                  type:'accessory' },
  bird_dog:               { id:'bird_dog',               name:'Bird Dog',                    type:'accessory' },
  leg_raise:              { id:'leg_raise',              name:'Leg Raise',                   type:'accessory' },
  hanging_leg_raise:      { id:'hanging_leg_raise',      name:'Hanging Leg Raise',           type:'accessory' },
  ghd_sit_up:             { id:'ghd_sit_up',             name:'GHD Sit Up',                  type:'accessory' },
  mcgill_curl_up:         { id:'mcgill_curl_up',         name:'McGill Curl Up',              type:'accessory' },
  hollow_hold:            { id:'hollow_hold',            name:'Hollow Hold',                 type:'accessory' },
  cable_crunch:           { id:'cable_crunch',           name:'Cable Crunch',                type:'accessory' },
  // ── Shoulder & corrective ─────────────────────────────────────────────────
  lateral_raise:          { id:'lateral_raise',          name:'Lateral Raise',               type:'accessory' },
  rear_delt_fly:          { id:'rear_delt_fly',          name:'Rear Delt Fly',               type:'accessory' },
  band_pull_apart:        { id:'band_pull_apart',        name:'Band Pull Apart',             type:'accessory' },
  external_rotation:      { id:'external_rotation',      name:'External Rotation',           type:'accessory' },
  cuban_press:            { id:'cuban_press',            name:'Cuban Press',                 type:'accessory' },
  y_t_w:                  { id:'y_t_w',                  name:'Y-T-W',                       type:'accessory' },
  scapular_pull_up:       { id:'scapular_pull_up',       name:'Scapular Pull Up',            type:'accessory' },
  handstand_hold:         { id:'handstand_hold',         name:'Handstand Hold',              type:'accessory' },
  // ── Block 2 (PROGRAM_B2) — not in Block 1's catalog ──────────────────────────
  snatch_from_floor:       { id:'snatch_from_floor',       name:'Snatch from Floor',              type:'snatch',
    desc:"Internal rotation, not external, in the catch — front side pulls in short, back gets long. External rotation causes disconnection and an early drop in turnover; directly addresses your OHS limiter. (Dozer, high-confidence)" },
  clean_front_squat_floor: { id:'clean_front_squat_floor', name:'Clean + Front Squat from Floor', type:'cj',
    desc:"Squat clean from the floor, stand, then one front squat without lowering the bar — one rep = that pair. Catch in the squat, never power it; any accidental power receive gets sat into the squat [E31.7, E31.5]. Bar should rest on the shoulder platform — upper traps/delts, not the wrists. Wrist pain means the rack position isn't set, not wrist weakness. (Webster)" },
  split_jerk_from_rack:    { id:'split_jerk_from_rack',    name:'Split Jerk from Rack',           type:'cj',
    desc:"Front knee stays on or slightly behind the ankle, not forward over the toes. Hips drop straight down with equal foot distance moved — aim for 50/50 weight distribution. (Dozer)" },
  snpp_ohs_complex:        { id:'snpp_ohs_complex',        name:'SnPP + OHS Complex',             type:'snatch' },
  snatch_opener:           { id:'snatch_opener',           name:'Light Snatch Opener',            type:'snatch' },
  floating_snatch:         { id:'floating_snatch',         name:'Floating Snatch',                type:'snatch' },
  three_position_snatch:   { id:'three_position_snatch',   name:'3-Position Snatch',              type:'snatch',
    desc:"Top down: mid-thigh first, then knee, then floor. Start where it's easiest and add distance each rep. (Everett)\nEvery rep passes through the same mid-thigh position: shins vertical, shoulders slightly in front of the bar, weight just behind mid-foot, not on the heels. (Everett)" },
  jerk_dip_drive:          { id:'jerk_dip_drive',          name:'Jerk Dip/Drive Drill',           type:'cj',
    desc:"Achieve full extension before initiating the split. Control the dip deliberately — maintain bar contact throughout. (Webster)" },
  pull_drill:              { id:'pull_drill',              name:'Pull Drill (Power Position)',    type:'accessory',
    desc:"Snatch-grip pull, no catch. First reps from the power position (bar at the hip crease, standing tall), then from the lowest hang you can hold well. Push the floor away into extension, bar close with the lats — it should not copy the snatch extension exactly [E42.1]. Warm-up weight." },
  trunk_static_strength:   { id:'trunk_static_strength',   name:'Trunk — Static Strength',        type:'accessory',
    desc:"Static holds, not crunches: in the lifts the trunk's job is to act as a rigid support. (Everett)\nAim at the front and sides. The lifts, squats and pulls already load the back. (Everett)" },
  trunk_stiffness_dip:     { id:'trunk_stiffness_dip',     name:'Trunk Stiffness (Dip)',          type:'accessory' },
  bodybuilding_core_block: { id:'bodybuilding_core_block', name:'Bodybuilding + Core Block',      type:'accessory' },
  snatch_push_press:       { id:'snatch_push_press',       name:'Snatch Push Press',              type:'snatch',
    desc:"Dip and drive straight down and up with the knees only. Don't push the hips back. (Everett)\nTreat it as a leg exercise: drive hard enough that your heels come up. (Everett)\nNo grinding reps. (Everett)" },
  hang_snatch_pull:        { id:'hang_snatch_pull',        name:'Hang / Block Snatch Pull',       type:'snatch' },
  // ── Block 3 (BLOCK3_EXERCISES in program.js) — not in Blocks 1–2 ────────────
  stiff_legged_deadlift:   { id:'stiff_legged_deadlift',   name:'Stiff-Legged Deadlift',          type:'strength',
    desc:"Knees slightly bent and fixed, back straight. The movement is all in the hinge. (Torokhtiy)\nIt builds the lower back, hamstrings and glutes that keep the trunk solid in the jerk. (Torokhtiy)" },
  three_position_clean:    { id:'three_position_clean',    name:'3-Position Clean',               type:'cj',
    desc:"Top down, the same order as the 3-position snatch: mid-thigh, then knee, then floor. (Everett)\nMake contact with the knees still bent and drive the legs into the bar. Don't stand up first and then bang it. (Dozer)\nCatch with the elbows high. (Dozer)" },
  power_split_jerk_combo:  { id:'power_split_jerk_combo',  name:'2 Power Jerks + 1 Split Jerk',   type:'cj',
    desc:"Same dip and drive for all three: straight down, straight up, complete. Only the feet change on the split. (Everett)\nThe power jerks groove a balanced, vertical dip and drive. They only help while they stay that way. (Everett)\nGo smoothly from the dip straight into the drive, with no pause at the bottom. (Sika)" },
  snatch_ohs_complex:      { id:'snatch_ohs_complex',      name:'Snatch + 2 Overhead Squats',     type:'snatch',
    desc:"After the snatch, keep the bar locked and still for both squats: shoulder blades squeezed up and together, bar over the back of the neck. (Everett)\nOverhead squats straight after the snatch train you to lock the bar out harder in the bottom. (Sika)" },
  clean_fs_jerk_complex:   { id:'clean_fs_jerk_complex',   name:'Clean + 2 Front Squats + Jerk',  type:'cj',
    desc:"After the front squats, stand tall: straight, braced torso before the dip, not an over-arched one. (Sika)\nThe front squats make the jerk harder, so keep its dip and drive vertical anyway. (Sika · Everett)" },
  power_clean_power_jerk:  { id:'power_clean_power_jerk',  name:'Power Clean + Power Jerk',       type:'cj',
    desc:"Before the dip: knees unlocked, quads tight, full breath. Dipping from locked knees shifts you forward. (Everett)\nDip at a speed that keeps the bar on your shoulders, then drive straight up. (Everett)\nCatch in your squat stance, thighs above parallel, bar pushed back over the back of the neck. (Everett)" },
  two_position_snatch:     { id:'two_position_snatch',     name:'2-Position Snatch',              type:'snatch',
    desc:"Mid-thigh rep first, then the floor. (Everett)\nUse the hang rep to feel staying connected in the turnover and meeting the bar at the right height, then copy that from the floor. (Everett)" },
  two_position_clean:      { id:'two_position_clean',      name:'2-Position Clean',               type:'cj',
    desc:"Mid-thigh rep first, then the floor, as in the 2-position snatch. Copy the hang rep's contact from the floor. (Everett)\nBe patient: the legs push, the knees get out of the way, and contact comes with the legs still bent. (Dozer)" },
};

function getEx(id) { return EXERCISE_CATALOG[id] ?? { id, name: id, type: 'strength' }; }

// Maps current localStorage key fragments (after .replace(/\s+/g,'_')) to slugs.
// Covers all current program exercise names including suffix variants.
const EXERCISE_NAME_TO_SLUG = {
  'Muscle_Snatch':                          'muscle_snatch',
  'Muscle_Snatch_(opener)':                 'muscle_snatch',
  'Hang_Power_Snatch':                      'hang_power_snatch',
  'Back_Squat':                             'back_squat',
  'Back_Squat_—_Daily_Max_Single':          'back_squat',
  'Overhead_Squat':                         'overhead_squat',
  'Good_Morning':                           'good_morning',
  'Weighted_Pull_Up':                       'weighted_pull_up',
  'GHR_(Glute_Ham_Raise)':                 'ghr',
  'Hang_Power_Clean':                       'hang_power_clean',
  'Clean_Pull':                             'clean_pull',
  'Incline_Barbell_Press':                 'incline_barbell_press',
  'Weighted_Parallel_Bar_Dips':            'weighted_dips',
  'Klokov_Trapi':                          'klokov_trapi',
  'Wide_Overhead_Press':                   'wide_overhead_press',
  'Dead_Bug':                              'dead_bug',
  'Snatch_Balance':                        'snatch_balance',
  'Front_Squat':                           'front_squat',
  'Front_Squat_—_Daily_Max_Single':        'front_squat',
  'RDL_Pull':                              'rdl',
  'Plank':                                 'plank',
  'Jerk_from_Rack_—_Daily_Max_Single':     'jerk_from_rack',
  'Push_Press':                            'push_press',
  'Clean_&_Jerk':                          'clean_and_jerk',
  'Sots_Press':                            'sots_press',
  'Behind_Neck_Press':                     'behind_neck_press',
  'Pallof_Press':                          'pallof_press',
  'Klokov_Squat_—_Singles':               'klokov_squat',
  'Berestov_Squat':                        'berestov_squat',
  'Lunge_(Barbell)':                       'lunge',
  'Face_Pull':                             'face_pull',
  'Ab_Wheel_/_Rollout':                    'ab_wheel',
};

// Maps old PR_ALL / SEED_PRS name strings to slugs
const PR_NAME_TO_SLUG = {
  'Back Squat':        'back_squat',
  'Front Squat':       'front_squat',
  'Clean Pull':        'clean_pull',
  'Deadlift':          'deadlift',
  'RDL Pull':          'rdl',
  'Snatch Deadlift':   'snatch_deadlift',
  'Klokov Squats':     'klokov_squat',
  'Klokov Deadlift':   'snatch_deadlift',
  'Klokov Trapi':      'klokov_trapi',
  'Berestov Squats':   'berestov_squat',
  'Snatch (Floor)':    'snatch',
  'Hang Power Snatch': 'hang_power_snatch',
  'Muscle Snatch':     'muscle_snatch',
  'Snatch Balance':    'snatch_balance',
  'Snatch High Pull':  'snatch_high_pull',
  'Clean':             'clean',
  'Clean & Jerk':      'clean_and_jerk',
  'Push Jerk':         'push_jerk',
  'Jerk from Rack':    'jerk_from_rack',
  'Jerk':              'jerk_from_rack',
  'Power Clean':       'power_clean',
  'Hang Power Clean':  'hang_power_clean',
  'Overhead Press':    'overhead_press',
  'Wide Overhead Press': 'wide_overhead_press',
  'Push Press':        'push_press',
  'Overhead Squat':    'overhead_squat',
  'Sots Press':        'sots_press',
  'Behind Neck Press': 'behind_neck_press',
  'Good Morning':      'good_morning',
  'T-Bar Row':         'barbell_row',
  'Lat Pulldown':      'lat_pulldown',
  'Pull Up':           'pull_up',
  'Incline Barbell Press': 'incline_barbell_press',
  'Flat Bench Press':  'bench_press',
  'Romanian Deadlift': 'rdl',
  'Seated Cable Row':  'cable_row',
  'Lunge (Barbell)':   'lunge',
};

const TYPE_META = {
  snatch:    {color:"#4a90d9",bg:"rgba(74,144,217,0.1)",  label:"SNATCH"},
  cj:        {color:"#c94f3a",bg:"rgba(201,79,58,0.1)",   label:"C&J"},
  strength:  {color:"#d4a843",bg:"rgba(212,168,67,0.1)",  label:"STRENGTH"},
  accessory: {color:"#555",   bg:"rgba(85,85,85,0.1)",    label:"ACCESSORY"},
};

const PR_ALL = [
  'back_squat','front_squat','clean_pull','deadlift','rdl','snatch_deadlift',
  'klokov_squat','klokov_trapi','berestov_squat',
  'snatch','hang_power_snatch','muscle_snatch','snatch_balance','snatch_high_pull','snatch_pull',
  'clean','clean_and_jerk','push_jerk','jerk_from_rack',
  'power_clean','hang_power_clean',
  'overhead_press','wide_overhead_press','push_press','overhead_squat','sots_press','behind_neck_press',
  'good_morning','lat_pulldown','pull_up','incline_barbell_press','bench_press',
  'cable_row','lunge',
  'snatch_from_floor','clean_front_squat_floor','split_jerk_from_rack',
];

// ── UI primitives ─────────────────────────────────────────────────────────────
const Tag = ({children,color,bg}) => (
  <span style={{fontSize:9,fontWeight:600,letterSpacing:1.5,color,background:bg,
    borderRadius:3,padding:"2px 7px",fontFamily:"'DM Mono',monospace",border:`1px solid ${color}33`}}>
    {children}
  </span>
);
const Pill = ({children,gold,style}) => (
  <span style={{fontSize:11,color:gold?"var(--gold)":"var(--text2)",
    background:gold?"rgba(212,168,67,0.08)":"var(--bg3)",
    borderRadius:20,padding:"3px 10px",fontFamily:"'DM Mono',monospace",...style}}>
    {children}
  </span>
);
const Label = ({children,style}) => (
  <div style={{fontSize:9,color:"var(--text3)",letterSpacing:2.5,fontFamily:"'DM Mono',monospace",
    marginBottom:8,marginTop:18,fontWeight:600,...style}}>{children}</div>
);
const Card = ({children,style}) => (
  <div style={{background:"var(--bg1)",border:"1px solid var(--border)",borderRadius:10,padding:16,...style}}>
    {children}
  </div>
);
const Btn = ({children,onClick,ghost,small,active,style}) => (
  <button onClick={onClick} style={{
    background:active?"var(--gold)":ghost?"transparent":"var(--gold)",
    color:active?"#000":ghost?"var(--text2)":"#000",
    border:ghost&&!active?"1px solid var(--border2)":"none",
    borderRadius:5,cursor:"pointer",fontFamily:"'DM Sans',sans-serif",fontWeight:600,
    letterSpacing:0.5,padding:small?"6px 14px":"10px 22px",
    fontSize:small?11:13,transition:"all 0.15s",...style,
  }}>{children}</button>
);
const Inp = ({style,...p}) => (
  <input style={{background:"var(--bg2)",border:"1px solid var(--border2)",borderRadius:6,
    color:"var(--text)",padding:"10px 12px",fontSize:13,width:"100%",...style}} {...p}/>
);
const Sel = ({style,children,...p}) => (
  <select style={{background:"var(--bg2)",border:"1px solid var(--border2)",borderRadius:6,
    color:"var(--text)",padding:"10px 12px",fontSize:13,width:"100%",cursor:"pointer",...style}} {...p}>
    {children}
  </select>
);
const Tex = ({style,...p}) => (
  <textarea style={{background:"var(--bg2)",border:"1px solid var(--border2)",borderRadius:6,
    color:"var(--text)",padding:"10px 12px",fontSize:13,width:"100%",
    fontFamily:"'DM Sans',sans-serif",minHeight:80,resize:"vertical",...style}} {...p}/>
);
// A catalog `desc`: one cue per line, each ending with the coach it came from.
const CueText = ({text,style}) => (
  <div style={{background:"var(--bg2)",border:"1px solid var(--border)",borderRadius:6,
    padding:"9px 12px",fontSize:11,color:"var(--text2)",lineHeight:1.6,fontStyle:"italic",...style}}>
    {text.split("\n").map((line, i) => <div key={i} style={i ? {marginTop:5} : undefined}>{line}</div>)}
  </div>
);

// ── Weight generator ──────────────────────────────────────────────────────────
function generateWeights(loadStr) {
  if (!loadStr) return null;
  const nums = loadStr.match(/\d+(\.\d+)?/g);
  if (!nums || nums.length === 0) return null;
  // Skip non-numeric loads
  if (/BW|Light|band|cable/i.test(loadStr)) return null;
  let base;
  if (nums.length >= 2) {
    base = (parseFloat(nums[0]) + parseFloat(nums[1])) / 2;
  } else {
    base = parseFloat(nums[0]);
  }
  let min = Math.max(5, Math.round((base * 0.80) / 2.5) * 2.5);
  let max = Math.round((base * 1.30) / 2.5) * 2.5;
  // A load that leads with a range ("45–71.5 kg") must offer both ends: the
  // midpoint spread alone drops the start once the ceiling climbs (Block 3
  // low-catch cards). Only ever widens the list.
  const range = loadStr.match(/^(\d+(?:\.\d+)?)–(\d+(?:\.\d+)?)/);
  if (range) {
    min = Math.max(5, Math.min(min, Math.round(parseFloat(range[1]) / 2.5) * 2.5));
    max = Math.max(max, Math.round(parseFloat(range[2]) / 2.5) * 2.5);
  }
  const weights = [];
  for (let w = min; w <= max; w = Math.round((w + 2.5) * 10) / 10) {
    weights.push(w);
  }
  return { weights, base };
}

// ── Exercise Card ─────────────────────────────────────────────────────────────
function ExCard({ex, phase, sessionKey, onProgress, onSetsChange, forceReload, onNewPR}) {
  const [open, setOpen] = useState(false);
  const [sets, setSets] = useState(() => {
    const count = typeof ex.sets === "number" ? ex.sets :
      ex.sets === "6–8" ? 7 : parseInt(ex.sets) || 3;
    return Array.from({length: count}, () => ({done: false, weight: null}));
  });

  const catalog = getEx(ex.id);
  const m = TYPE_META[catalog.type];
  const load = phase === 0 ? ex.l1 : ex.l2;
  const weightData = generateWeights(load);

  // A set that carries a weight may not be ticked until that weight is chosen.
  // Previously any set could be marked done with weight null — and CHECK ALL
  // did exactly that for a whole exercise in one tap — so a session could look
  // fully logged while recording nothing liftable. Week 9 D2's split jerk from
  // rack is the case that prompted this: five sets ticked, five weights null,
  // nothing to rebuild a PR from and no way to know afterwards what was lifted.
  // Exercises with no weight control (bodyweight, empty bar, athlete's-choice
  // blocks) are unaffected — there is no number to withhold, so they tick
  // freely. Unchecking is never blocked.
  const needsWeight = !!weightData;
  const hasWeight = st => parseFloat(st.weight) > 0;
  const canCheck  = st => !needsWeight || hasWeight(st);
  // Sets ticked before this rule existed: left done rather than silently
  // flipped back, but flagged so they read as unfinished instead of complete.
  const isOrphan  = st => st.done && needsWeight && !hasWeight(st);

  // CHECK ALL was the fastest route to a weightless session — one tap ticked
  // every set. Blocked while any set still lacks a weight; SET ALL -> REC is
  // the one-tap way out, and unchecking stays available.
  const checkAllBlocked = !sets.every(s => s.done) && sets.some(s => !canCheck(s));

  const doneCount = sets.filter(s => s.done).length;
  const totalSets = sets.length;
  const allDone = doneCount === totalSets;
  const inProgress = doneCount > 0 && !allDone;

  // Report progress to parent
  useEffect(() => {
    if (onProgress) onProgress(ex.id, doneCount, totalSets);
  }, [doneCount]);

  // Persist set state to storage
  async function updateSet(idx, field, value) {
    const updated = sets.map((s, i) => i === idx ? {...s, [field]: value} : s);
    setSets(updated);
    if (field === "done" && value === true) {
      const w = parseFloat(updated[idx].weight);
      if (!isNaN(w) && w > 0 && onNewPR) onNewPR(ex.id, w);
    } else if (field === "weight" && updated[idx].done) {
      const w = parseFloat(value);
      if (!isNaN(w) && w > 0 && onNewPR) onNewPR(ex.id, w);
    }
    if (sessionKey) {
      try {
        const key = `sets_${sessionKey}_${ex.id}`;
        await storage.set(key, JSON.stringify(updated));
        sbSync.upsertSets(key, updated);
        if (onSetsChange) onSetsChange();
      } catch {}
    }
  }

  // Load persisted state on mount or when forced by sync pull
  useEffect(() => {
    if (!sessionKey) return;
    const key = `sets_${sessionKey}_${ex.id}`;
    storage.get(key).then(result => {
      if (result) {
        try {
          const saved = JSON.parse(result.value);
          if (Array.isArray(saved) && saved.length > 0) setSets(saved);
        } catch {}
      }
    }).catch(() => {});
  }, [sessionKey, forceReload]);

  return (
    <div style={{
      background: "var(--bg1)", borderRadius: 8, marginBottom: 8, overflow: "hidden",
      border: `1px solid ${allDone ? "#5a9e4466" : open ? m.color+"44" : "var(--border)"}`,
      transition: "border-color 0.2s",
      opacity: allDone ? 0.75 : 1,
    }}>
      {/* Header */}
      <div style={{display:"flex", alignItems:"center", gap:10, padding:"12px 14px"}}>
        {/* Done indicator */}
        <div style={{
          width: 20, height: 20, borderRadius: 5, flexShrink: 0,
          background: allDone ? "var(--green)" : inProgress ? "var(--gold)" : "var(--bg3)",
          border: `1.5px solid ${allDone ? "var(--green)" : inProgress ? "var(--gold)" : "var(--border2)"}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          transition: "all 0.15s", cursor: "pointer",
        }} onClick={() => setOpen(!open)}>
          {allDone && <span style={{color:"#000", fontSize:10, fontWeight:800}}>✓</span>}
          {inProgress && <span style={{color:"#000", fontSize:8, fontWeight:800}}>{doneCount}</span>}
        </div>

        <div onClick={() => setOpen(!open)} style={{display:"flex", alignItems:"center", gap:8, flex:1, cursor:"pointer"}}>
          <Tag color={m.color} bg={m.bg}>{m.label}</Tag>
          <span style={{
            fontFamily:"'Bebas Neue',sans-serif", fontSize:17, letterSpacing:0.3,
            textDecoration: allDone ? "line-through" : "none",
            color: allDone ? "var(--text3)" : "var(--text)",
          }}>{catalog.name}</span>
        </div>

        <div style={{display:"flex", gap:6, alignItems:"center"}}>
          {inProgress && (
            <span style={{fontSize:10, color:"var(--gold)", fontFamily:"'DM Mono',monospace"}}>
              {doneCount}/{totalSets}
            </span>
          )}
          <Pill>{ex.sets}×{ex.reps}</Pill>
          <Pill gold>{load}</Pill>
          <span onClick={() => setOpen(!open)} style={{color:"var(--text3)", fontSize:10, cursor:"pointer", marginLeft:2}}>
            {open ? "▲" : "▼"}
          </span>
        </div>
      </div>

      {/* Expanded body */}
      {open && (
        <div style={{borderTop:"1px solid var(--border)", padding:"14px", background:"var(--bg)"}}>

          {/* Coaching cue — every line traces to a retrieved passage (Block 3's:
              docs/programs/2026-10-18-block3-cues.md). An exercise with no
              cue renders nothing here rather than an invented description. */}
          {catalog.desc && <CueText text={catalog.desc} style={{marginBottom:14}}/>}

          {/* Set tracker */}
          <div style={{marginBottom:14}}>
            <div style={{fontSize:9, color:"var(--text2)", letterSpacing:2, fontFamily:"'DM Mono',monospace", marginBottom:8}}>
              SETS
            </div>
            {sets.map((s, idx) => (
              <div key={idx} style={{
                display:"flex", alignItems:"center", gap:10,
                padding:"8px 10px", marginBottom:6, borderRadius:6,
                background: s.done ? "rgba(90,158,69,0.08)" : "var(--bg2)",
                border: `1px solid ${s.done ? "#5a9e4433" : "var(--border)"}`,
                transition:"all 0.15s",
              }}>
                {/* Set number */}
                <span style={{
                  fontFamily:"'DM Mono',monospace", fontSize:11,
                  color:"var(--text2)", width:16, flexShrink:0,
                }}>S{idx+1}</span>

                {/* Checkbox — locked until this set has a weight */}
                <div
                  title={!s.done && !canCheck(s) ? "Choose a weight first" : undefined}
                  onClick={() => { if (s.done || canCheck(s)) updateSet(idx, "done", !s.done); }}
                  style={{
                  width:22, height:22, borderRadius:5, flexShrink:0,
                  cursor: (s.done || canCheck(s)) ? "pointer" : "not-allowed",
                  opacity: (s.done || canCheck(s)) ? 1 : 0.35,
                  background: isOrphan(s) ? "var(--gold)" : s.done ? "var(--green)" : "var(--bg3)",
                  border:`1.5px solid ${isOrphan(s) ? "var(--gold)" : s.done ? "var(--green)" : "var(--border2)"}`,
                  display:"flex", alignItems:"center", justifyContent:"center",
                  transition:"all 0.15s",
                }}>
                  {s.done && <span style={{color:"#000", fontSize:12, fontWeight:800}}>{isOrphan(s) ? "!" : "✓"}</span>}
                </div>

                {/* Weight picker */}
                {weightData ? (
                  <select
                    value={s.weight || ""}
                    onChange={e => updateSet(idx, "weight", e.target.value)}
                    style={{
                      flex:1, background:"var(--bg3)", border:`1px solid ${s.done?"#5a9e4433":"var(--border2)"}`,
                      borderRadius:5, color: s.weight ? "var(--gold)" : "var(--text)",
                      padding:"5px 8px", fontSize:12, cursor:"pointer",
                      fontFamily:"'DM Mono',monospace",
                    }}
                  >
                    <option value="">— kg</option>
                    {weightData.weights.map(w => (
                      <option key={w} value={w}
                        style={{fontWeight: Math.abs(w - weightData.base) < 1.5 ? "bold" : "normal"}}>
                        {w % 1 === 0 ? w : w.toFixed(1)} kg{Math.abs(w - weightData.base) < 1.5 ? " ●" : ""}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span style={{flex:1, fontSize:11, color:"var(--text2)", fontStyle:"italic"}}>
                    {load}
                  </span>
                )}

                {/* Reps reminder */}
                <span style={{fontSize:11, color:"var(--text2)", fontFamily:"'DM Mono',monospace", flexShrink:0}}>
                  ×{ex.reps}
                </span>
              </div>
            ))}

            {/* Quick actions */}
            <div style={{display:"flex", gap:8, marginTop:8}}>
              <button
                disabled={checkAllBlocked}
                title={checkAllBlocked ? "Choose weights first — or tap SET ALL → REC" : undefined}
                onClick={async () => {
                const allChecked = sets.every(s=>s.done);
                if (!allChecked && checkAllBlocked) return;
                const updated = sets.map(s => ({...s, done: !allChecked}));
                setSets(updated);
                if(sessionKey) {
                  try {
                    const k = `sets_${sessionKey}_${ex.id}`;
                    await storage.set(k, JSON.stringify(updated));
                    sbSync.upsertSets(k, updated);
                    if(onSetsChange) onSetsChange();
                  } catch {}
                }
              }} style={{
                fontSize:11, padding:"6px 14px", borderRadius:4,
                cursor: checkAllBlocked ? "not-allowed" : "pointer",
                opacity: checkAllBlocked ? 0.4 : 1,
                background:"var(--bg2)", border:"1px solid var(--border2)",
                color:"var(--text)", fontFamily:"'DM Mono',monospace",
              }}>{sets.every(s=>s.done) ? "UNCHECK ALL" : "CHECK ALL"}</button>

              {weightData && (
                <button onClick={async () => {
                  const rec = weightData.weights.find(w => Math.abs(w - weightData.base) < 1.5) || weightData.weights[Math.floor(weightData.weights.length/2)];
                  const updated = sets.map(s => ({...s, weight: String(rec)}));
                  setSets(updated);
                  if(sessionKey) {
                    try {
                      const k = `sets_${sessionKey}_${ex.id}`;
                      await storage.set(k, JSON.stringify(updated));
                      sbSync.upsertSets(k, updated);
                      if(onSetsChange) onSetsChange();
                    } catch {}
                  }
                }} style={{
                  fontSize:11, padding:"6px 14px", borderRadius:4, cursor:"pointer",
                  background:"var(--bg2)", border:"1px solid var(--border2)",
                  color:"var(--text)", fontFamily:"'DM Mono',monospace",
                }}>SET ALL → REC</button>
              )}
            </div>

            {/* No tooltips on a phone — say why the button is dead */}
            {checkAllBlocked && (
              <p style={{fontSize:11, color:"var(--gold)", marginTop:8, fontFamily:"'DM Mono',monospace"}}>
                Pick a weight on each set before ticking it — or tap SET ALL → REC.
              </p>
            )}
            {sets.some(isOrphan) && (
              <p style={{fontSize:11, color:"var(--gold)", marginTop:8, fontFamily:"'DM Mono',monospace"}}>
                ! Ticked before a weight was recorded — set the weight to complete it.
              </p>
            )}
          </div>

          {/* Coaching note */}
          <p style={{fontSize:12, color:"var(--text2)", lineHeight:1.75}}>{ex.note}</p>
        </div>
      )}
    </div>
  );
}

// ── Mobility Data ─────────────────────────────────────────────────────────────
const MOBILITY = {
  pre: {
    snatch: {
      label:"PRE-SESSION — SNATCH DAYS (D1, D3)",
      color:"#4a90d9", time:"10–12 min",
      note:"Opens the thoracic spine and shoulders before any overhead work. Do this in order — each drill feeds the next.",
      drills:[
        {name:"Heated Pad — Lower Back & Hips", duration:"5 min passive", tool:"Heated pad",
         area:"back/hips", desc:"Apply heated pad to lower back and hip flexors while you prepare your equipment. Passive tissue warmup. Zero effort — just heat before you load."},
        {name:"Theracane — Thoracic Trigger Points", duration:"2 min", tool:"Theracane",
         area:"thoracic", desc:"Find the knots on either side of your thoracic spine (T4–T8 region). Apply sustained pressure for 20–30s per point. This directly unlocks the upper back rounding that limits your OHS. 3–4 points per side."},
        {name:"Foam Roller — Thoracic Extension", duration:"90 sec", tool:"Foam roller",
         area:"thoracic", desc:"Place roller perpendicular to spine at mid-back. Arms crossed over chest. Extend over the roller, hold 3–5s, move up one segment. Work T4 to T8. This is the most direct fix for OHS forward lean."},
        {name:"Banded Shoulder Distraction", duration:"60 sec/side", tool:"Resistance band",
         area:"shoulder", desc:"Anchor band low, loop around shoulder at armpit. Step away to create tension. Let the band pull the arm down while you rotate the torso away. Feel the joint capsule open. This is the most effective drill for getting arms behind ears. Hold 45–60s each side."},
        {name:"Lat Stretch — Doorframe or Rack", duration:"45 sec/side", tool:"Rack upright",
         area:"shoulder/lat", desc:"Grab the rack upright at shoulder height, step back and hinge at the hip until you feel the lat stretch along the side. Tight lats are pulling your arms forward in OHS — this is direct. Hold, breathe out to deepen."},
        {name:"Wall Slides", duration:"10 reps", tool:"Wall",
         area:"shoulder", desc:"Stand with back flat to wall, arms at 90°. Slide arms overhead keeping forearms on wall. If they peel off, that's your external rotation limit. Work within your range — don't force it. This activates serratus and trains the overhead pattern before loading it."},
        {name:"OHS with Empty Bar — Pause at Bottom", duration:"3×3", tool:"Barbell",
         area:"full chain", desc:"Snatch-grip overhead squat, pause 3s at bottom each rep. Warm up the receiving position before any loaded work. If it feels blocked, revisit the banded distraction."},
      ]
    },
    clean: {
      label:"PRE-SESSION — CLEAN DAYS (D2)",
      color:"#c94f3a", time:"10 min",
      note:"Hip flexors and thoracic are the limiting factors for your clean receiving position. Front rack mobility addressed here.",
      drills:[
        {name:"Heated Pad — Hip Flexors", duration:"5 min passive", tool:"Heated pad",
         area:"hips", desc:"Apply to hip flexors (front of hip/groin area) while preparing. Passive warmup before any active work."},
        {name:"Foam Roller — Thoracic Extension", duration:"90 sec", tool:"Foam roller",
         area:"thoracic", desc:"Same as snatch day. Thoracic mobility affects front rack position — a stiff upper back makes it impossible to keep elbows high in the clean."},
        {name:"Theracane — Hip Flexor / TFL", duration:"90 sec/side", tool:"Theracane",
         area:"hips", desc:"Locate the hip flexor attachment (just inside the hip bone at the front). Apply sustained pressure 20–30s per point. Tight hip flexors prevent you from sitting fully into the squat clean receiving position."},
        {name:"Couch Stretch", duration:"90 sec/side", tool:"Wall/rack",
         area:"hip flexors", desc:"Rear knee on floor, rear foot against wall/rack, front foot forward. Upright torso. This is the most effective hip flexor stretch that exists. Hold and breathe — deepen on each exhale. Your squat receiving position depends on this."},
        {name:"90/90 Hip Rotation", duration:"60 sec/side", tool:"Floor",
         area:"hips", desc:"Sit on floor with both legs bent 90°. Rotate from side to side, letting both knees fall to the floor. This opens hip internal and external rotation — both needed for a deep squat clean receive."},
        {name:"Front Rack Stretch", duration:"60 sec/side", tool:"Rack upright",
         area:"shoulder/elbow", desc:"Rest one arm on rack at shoulder height, elbow bent 90°. Step forward to open the front rack position. Feel the elbow being pulled back. High elbows in the clean start here."},
        {name:"Empty Bar Hang Power Clean × 5", duration:"2 sets", tool:"Barbell",
         area:"full chain", desc:"Activate the pattern at zero load. Focus on elbow speed in the turnover and rack position."},
      ]
    },
    jerk: {
      label:"PRE-SESSION — JERK DAYS (D4)",
      color:"#d4a843", time:"10 min",
      note:"Shoulders and hip flexors for jerk mechanics. Thoracic for the rack position. Get the overhead path clear before max singles.",
      drills:[
        {name:"Heated Pad — Shoulders & Upper Back", duration:"5 min passive", tool:"Heated pad",
         area:"shoulder/thoracic", desc:"Apply to upper back and rear shoulders while preparing. Passive warmup before jerk work."},
        {name:"Theracane — Thoracic T4–T8", duration:"90 sec", tool:"Theracane",
         area:"thoracic", desc:"Quick hit on thoracic trigger points. 2–3 key spots per side, 20s each. Opens the dip-and-drive path for the jerk."},
        {name:"Banded Shoulder Distraction", duration:"60 sec/side", tool:"Resistance band",
         area:"shoulder", desc:"Same as snatch day. Critical before jerk singles — arms must be able to get fully behind ears at lockout. Do both sides."},
        {name:"Shoulder CARs (Controlled Articular Rotations)", duration:"5 reps/side", tool:"None",
         area:"shoulder", desc:"Standing, make the largest slow circle possible with one arm, keeping the scapula controlled. Forward and backward. This actively moves the shoulder through its full range before you load it. 5 forward, 5 backward each arm."},
        {name:"Couch Stretch", duration:"60 sec/side", tool:"Wall/rack",
         area:"hip flexors", desc:"Hip flexors affect jerk dip mechanics — tight hip flexors cause forward lean in the dip. Quick version pre-jerk session."},
        {name:"Jerk Footwork Drill", duration:"10 reps", tool:"None",
         area:"full chain", desc:"Practice the push jerk footwork pattern with no weight. Dip, drive, jump feet to receiving position. Groove the foot pattern before adding bar weight."},
      ]
    },
    active: {
      label:"PRE-SESSION — ACTIVE DAY (D5)",
      color:"#8b5cf6", time:"8 min",
      note:"Lighter active day — shorter prep. Focus on movement quality rather than tissue work.",
      drills:[
        {name:"Foam Roller — Full Back", duration:"90 sec", tool:"Foam roller",
         area:"full back", desc:"Roll from lower back to upper back. Find tight spots and pause 10s. General tissue quality work."},
        {name:"Hip 90/90", duration:"60 sec/side", tool:"Floor",
         area:"hips", desc:"Hip rotation — same as clean day. Maintains the hip work from previous sessions."},
        {name:"Wall Slides", duration:"10 reps", tool:"Wall",
         area:"shoulder", desc:"Overhead pattern activation. Lower intensity version of the shoulder prep."},
        {name:"World's Greatest Stretch", duration:"5 reps/side", tool:"Floor",
         area:"full chain", desc:"Lunge position, same-side hand on floor, opposite hand reaches to ceiling with rotation. Combines hip flexor, thoracic, and shoulder in one movement. Best single warm-up drill for weightlifters."},
      ]
    },
  },
  post: {
    label:"POST-SESSION — ALL DAYS (8–10 min)",
    color:"#5a9e45", time:"8–10 min",
    note:"Body is warm — passive stretching works best now. Don't rush this. Best tissue gains happen when relaxed.",
    drills:[
      {name:"Lacrosse Ball — Posterior Shoulder Capsule", duration:"90 sec/side", tool:"Lacrosse/massage ball",
       area:"shoulder", desc:"Lie on the ball placed in the rear of the shoulder joint (posterior capsule). Let gravity do the work. Breathe and relax into it. This directly improves external rotation and overhead lock-out. Most important drill for your shoulder limitation."},
      {name:"Lat Smash — Foam Roller or Ball", duration:"60 sec/side", tool:"Foam roller or ball",
       area:"lat/shoulder", desc:"Place roller or ball under the armpit/lat area, roll slowly. Find the tightest point and hold. Tight lats are pulling your arms forward — releasing them post-session compounds the pre-session lat stretch work."},
      {name:"Theracane — Mid Thoracic", duration:"2 min", tool:"Theracane",
       area:"thoracic", desc:"Post-session thoracic release while the tissue is warm. Work the same T4–T8 area. 3–4 points each side at sustained pressure. You'll feel more release here post-session than pre."},
      {name:"Doorframe Hip Flexor Stretch", duration:"90 sec/side", tool:"Floor/wall",
       area:"hip flexors", desc:"Kneeling lunge with rear knee on floor. Push hips forward. Hold and breathe. Post-session is when this stretch makes the most structural change — the muscle is warm and pliable."},
      {name:"Child's Pose with Lat Reach", duration:"60 sec/side", tool:"Floor",
       area:"lat/thoracic", desc:"Child's pose, then walk both hands to one side as far as possible. Feel the lat and thoracic stretch on the opposite side. Hold 30s each side. Low effort, high carry-over to OHS position."},
      {name:"Passive Thoracic Extension — Foam Roller", duration:"2 min", tool:"Foam roller",
       area:"thoracic", desc:"Roller under mid-back, arms overhead (or crossed over chest), let gravity pull you into extension for 2 full minutes. This is passive — don't force it. Over weeks this remodels the thoracic curve and directly improves OHS."},
    ]
  },
  ankle: {
    label:"DAILY — ANKLE & HIP (Tall-Lifter Squat Depth)",
    color:"#5a9e45", time:"12–15 min",
    note:"The single biggest unlock for your deep, upright squat and OHS — and it's a months-long project, not weeks (Sika needed ~6 months). Long tibias = stiff ankles; a light stretch does nothing. Load it heavy and hold it LONG, every single day. Do it watching something — it's not strenuous. Knees-forward squat depth is gated by this.",
    drills:[
      {name:"Barbell Calf Smash", duration:"1 min/side × 3–4", tool:"Barbell",
       area:"ankle", desc:"Sit on the floor, rest a loaded barbell across the calf, roll slowly over the calf/Achilles. More effective than a foam roller. It will hurt — that's the point. 1 min each side, 3–4 rounds, before the stretches."},
      {name:"Loaded Ankle Dorsiflexion Stretch", duration:"90 sec–2 min/side", tool:"Barbell/plate",
       area:"ankle", desc:"Half-kneeling, front foot flat. Drive the knee forward OVER the toe with 15–25 kg resting on the knee (or hold a rack and push down hard). A daily-walking calf ignores a light stretch — load it. Moderate discomfort, never tearing pain. Hold 90 sec–2 min, 3–5 sets per side. THIS is the drill that moves the needle."},
      {name:"Heavy Weighted Calf Stretch", duration:"60–90 sec/side", tool:"Barbell/plate",
       area:"ankle", desc:"Push-up position, ball of one foot on a plate edge or step, heel driving down, knee forward. Add load (25→50 kg / up to 50% BW) across the hips/back. Long holds. Builds dorsiflexion through the straight-knee (gastroc) line."},
      {name:"Empty-Bar Pause Squats", duration:"5–10 reps", tool:"Barbell",
       area:"full chain", desc:"After loosening the ankles, groove the deep bottom as a motor skill: empty bar, sit to full depth, pause, knees pushed forward, torso tall. 5–10 slow reps. Practice the position you just freed up."},
      {name:"Runner's Lunge (deep hip opener)", duration:"1 min/side", tool:"Floor",
       area:"hips", desc:"Push-up position, bring one foot up beside the same-side hand, drop the elbow toward the floor inside the arch. Open the inside of the hip. 1 min each side. More mobile = chest closer to the floor over time."},
      {name:"Banded Couch Stretch", duration:"90 sec/side", tool:"Band + wall/rack",
       area:"hip flexors", desc:"Couch stretch (rear knee down, rear foot up the wall, upright torso) with a band looped high on the rear thigh pulling the hip forward. The distraction lets you relax deeper. Critical for a night-shift sitter — tight hip flexors cap squat depth."},
    ]
  },
  core: {
    label:"DAILY — CORE BRACING (McGill Big Three)",
    color:"#8b5cf6", time:"6–8 min",
    note:"Spinal-endurance bracing UNDER LOAD — these three train the core isometrically to hold a neutral spine while it resists force, which is exactly what a back-pain athlete needs before a session. This is not the same job as the unloaded segmental work in DAILY SPINE: you brace here and you mobilise there, and the two never swap places. Worth doing before every single session, regardless of what's on the day's menu.",
    drills:[
      {name:"McGill Curl-Up", duration:"3×8 (8s hold each)", tool:"Floor",
       area:"core", desc:"Lie on your back, one knee bent with foot flat, other leg straight. Hands under the small of your back to preserve its natural arch. Lift only your head and shoulders slightly off the floor — no spinal flexion, no crunching. Hold 8s, lower slowly. This trains ab bracing isometrically without loading the lumbar spine in flexion."},
      {name:"Side Plank", duration:"3×20–30s/side", tool:"Floor",
       area:"core", desc:"Forearm on the floor, body in a straight line from ankles to shoulders, hips lifted off the floor. Hold. Trains anti-lateral-flexion — the obliques and QL working isometrically to keep the spine level, directly relevant to staying square under an asymmetric bar path."},
      {name:"Bird Dog Hold", duration:"3×8/side (5–8s hold each rep)", tool:"Floor",
       area:"core", desc:"On hands and knees, extend opposite arm and leg until level with the torso, keeping the spine neutral (no rotation or sagging). Hold 5–8s, return with control, alternate sides. Trains anti-rotation and anti-extension together — the exact stability pattern that keeps the low back safe when bar position pulls the torso off-center."},
    ]
  },
  spine: {
    label:"DAILY — SPINAL SEGMENTATION",
    color:"#c9793a", time:"5–8 min",
    note:"For a lower back that moves as one rigid block instead of segment by segment. Do it AFTER training or on a rest day — NEVER before a session: flexing the spine and then loading it is the injury mechanism, not the flexion itself. Skip it entirely on a day the back is already sore. Stretch is fine, pain is not — pain means stop and drop back a stage. Run stages 1–2 daily for 2–3 weeks before touching stage 3, and stage 3 for 2–3 weeks before stage 4. If the stiffness resolves at stage 2, you never need the loaded version. PROVENANCE: stages 1–2 are cited to Torokhtiy's lower-back mobility guide [E]; stages 3–4 are [JUDGMENT] — your request, with no corpus support. Querying the 21k-chunk corpus for \"jefferson curl\" returns nothing but snatch highlight reels; not one coach in your sources mentions the movement.",
    drills:[
      {name:"Stage 1 — Supine Pelvic Tilt [E]", duration:"2×10 slow", tool:"Floor",
       area:"lumbar", desc:"Lie on your back, knees bent, feet flat. Breathe in; exhale and slowly tilt the pelvis backward, pressing the low back into the floor. Then tilt forward into a small arch. Slow and deliberate — you are teaching the lumbar segments to move independently of the hips, which is the exact thing a rigid block can't do. Torokhtiy's lower-back guide names this as the primary lower-back mobility drill and adds the accommodation: if the low back is sensitive, put a cushion under the pelvis. Zero load, zero risk. Start here and do not skip it."},
      {name:"Stage 2 — Cat-Cow (segmental) [E]", duration:"2 min", tool:"Floor",
       area:"spine", desc:"Hands and knees. Round the spine one vertebra at a time starting from the tailbone, then reverse into extension the same way, leading from the tailbone again. The point is SEQUENCING, not range — if the low back still moves as one block, slow down until you can feel it articulate segment by segment. Same unloaded segmental family as the sphinx pose and pelvic tilt in the Torokhtiy guide. Frequency is the mechanism here: hitting the position often is what makes it available, not straining into it once."},
      {name:"Stage 3 — Standing Roll-Down [JUDGMENT]", duration:"3×5", tool:"None",
       area:"spine", desc:"Stand, feet hip width, knees soft. Drop the chin to the chest and roll down one vertebra at a time, arms hanging, until you reach your honest end range — do NOT chase the floor. Roll back up the same way, stacking from the bottom. Bodyweight only. This is the unloaded rehearsal of the Jefferson curl pattern; own it completely, with clean segmental sequencing and no pain, before adding a single kilo."},
      {name:"Stage 4 — Jefferson Curl [JUDGMENT]", duration:"3×5 @ 5 kg", tool:"Dumbbell",
       area:"spine", desc:"Stand on a box, hold a dumbbell or kettlebell in both hands, roll down segment by segment as in stage 3 letting the weight draw you into flexion, then roll back up the same way. Use a dumbbell, NOT a barbell — an empty bar is 20 kg, which is this drill's hard ceiling, not its starting load. START AT 5 kg. Add 2.5 kg only after two consecutive pain-free weeks. HARD CEILING 20 kg — past that this stops being a mobility drill and becomes a rounded-back stiff-leg deadlift, a different exercise with a different risk profile. Note what your corpus actually endorses for the back: loaded EXTENSION (back extensions, weighted back extensions, rows, pull-ups), the opposite vector to this. No source endorses this movement. It is here because you asked for it, dosed as conservatively as it can be while still being the thing you asked for."},
    ]
  },
  bed: {
    label:"BEFORE BED — SHIFT NIGHTS (5 min, floor only)",
    color:"#4a90d9", time:"5 min",
    note:"This is where the biggest long-term gains happen. Daily low-intensity mobility compounds fast. Do this while watching something — zero concentration needed.",
    drills:[
      {name:"Hip Flexor Stretch — Floor", duration:"2 min/side", tool:"Floor",
       area:"hip flexors", desc:"Lie on your back at the edge of the bed or floor. Pull one knee to chest, let the other leg hang or rest flat. Hold 2 minutes each side. This is the most time-efficient hip flexor intervention that exists. Do it every single night."},
      {name:"Thoracic Extension — Floor", duration:"2 min", tool:"Floor or rolled towel",
       area:"thoracic", desc:"Place a rolled towel or small roll under your mid-back at T6–T7. Arms overhead or crossed. Let gravity do the work for 2 minutes. Watch TV in this position. Cumulative daily work here will unlock your OHS within 4–6 weeks."},
      {name:"Door Frame Shoulder Stretch", duration:"30 sec/side", tool:"Doorframe",
       area:"shoulder", desc:"Stand in doorframe, arm at 90° on the frame, rotate body away. Feel anterior shoulder and pec stretch. 30s each side. Counterbalances the pulling volume from training."},
    ]
  }
};

// ── Mobility Drill Card ────────────────────────────────────────────────────────
function DrillCard({drill}) {
  const [open,setOpen] = useState(false);
  const toolColors = {
    "Heated pad":"#c94f3a", "Theracane":"#d4a843", "Foam roller":"#4a90d9",
    "Resistance band":"#5a9e45", "Lacrosse/massage ball":"#8b5cf6",
    "Wall":"var(--text2)", "Barbell":"var(--text2)", "Floor":"var(--text2)",
    "Rack upright":"var(--text2)", "None":"var(--text2)", "Wall/rack":"var(--text2)",
    "Floor/wall":"var(--text2)", "Floor or rolled towel":"var(--text2)",
    "Doorframe":"var(--text2)", "Dumbbell":"#8b5cf6",
  };
  const areaColors = {
    "thoracic":"#4a90d9", "shoulder":"#d4a843", "hips":"#c94f3a",
    "ankle":"#5a9e45",
    "hip flexors":"#c94f3a", "lat/shoulder":"#5a9e45", "back/hips":"#8b5cf6",
    "full chain":"var(--gold)", "shoulder/lat":"#d4a843", "shoulder/elbow":"#d4a843",
    "shoulder/thoracic":"#4a90d9", "full back":"var(--text2)", "lat/thoracic":"#5a9e45",
    "core":"#8b5cf6", "spine":"#c9793a", "lumbar":"#c9793a",
  };
  const tc = toolColors[drill.tool] || "var(--text2)";
  const ac = areaColors[drill.area] || "var(--text2)";
  return (
    <div style={{background:"var(--bg1)",borderRadius:8,marginBottom:8,overflow:"hidden",
      border:`1px solid ${open?"#5a9e4444":"var(--border)"}`,transition:"border-color 0.2s"}}>
      <div onClick={()=>setOpen(!open)} style={{display:"flex",alignItems:"center",gap:10,
        padding:"11px 14px",cursor:"pointer",userSelect:"none"}}>
        <Tag color={ac} bg={ac+"18"}>{drill.area.toUpperCase()}</Tag>
        <span style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:16,flex:1,letterSpacing:0.3}}>{drill.name}</span>
        <div style={{display:"flex",gap:6}}>
          <Pill style={{fontSize:10,color:tc}}>{drill.tool}</Pill>
          <Pill style={{fontSize:10,color:"var(--green)"}}>{drill.duration}</Pill>
        </div>
        <span style={{color:"var(--text3)",fontSize:10,marginLeft:2}}>{open?"▲":"▼"}</span>
      </div>
      {open&&(
        <div style={{borderTop:"1px solid var(--border)",padding:"12px 14px",background:"var(--bg)"}}>
          <p style={{fontSize:12,color:"var(--text2)",lineHeight:1.8}}>{drill.desc}</p>
        </div>
      )}
    </div>
  );
}

// ── Mobility Tab ──────────────────────────────────────────────────────────────
function MobilityTab() {
  const [section,setSection] = useState("snatch");
  const sections = [
    {id:"snatch",  label:"D1/D3 PRE",  data:MOBILITY.pre.snatch},
    {id:"clean",   label:"D2 PRE",     data:MOBILITY.pre.clean},
    {id:"jerk",    label:"D4 PRE",     data:MOBILITY.pre.jerk},
    {id:"active",  label:"D5 PRE",     data:MOBILITY.pre.active},
    {id:"ankle",   label:"DAILY ANKLE", data:MOBILITY.ankle},
    {id:"core",    label:"DAILY CORE",  data:MOBILITY.core},
    {id:"spine",   label:"DAILY SPINE", data:MOBILITY.spine},
    {id:"post",    label:"POST",        data:MOBILITY.post},
    {id:"bed",     label:"BEDTIME",     data:MOBILITY.bed},
  ];
  const current = sections.find(s=>s.id===section);
  const d = current.data;

  return (
    <div className="fade">
      {/* Priority banner */}
      <div style={{background:"#0a0f08",border:"1px solid #2a3a20",borderRadius:8,
        padding:"12px 14px",marginBottom:16}}>
        <div style={{fontFamily:"'DM Mono',monospace",fontSize:9,color:"#5a9e45",letterSpacing:1.5,marginBottom:6}}>
          🎯 YOUR MOBILITY PRIORITIES
        </div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:8}}>
          {[
            {label:"THORACIC EXTENSION",color:"#4a90d9",note:"OHS rounding"},
            {label:"SHOULDER EXTERNAL ROTATION",color:"#d4a843",note:"Can't get arms behind ears"},
            {label:"HIP FLEXORS",color:"#c94f3a",note:"Squat depth + receiving"},
          ].map(p=>(
            <div key={p.label} style={{background:p.color+"14",border:`1px solid ${p.color}44`,
              borderRadius:6,padding:"6px 10px"}}>
              <div style={{fontSize:9,color:p.color,fontFamily:"'DM Mono',monospace",letterSpacing:1}}>{p.label}</div>
              <div style={{fontSize:10,color:"var(--text3)",marginTop:2}}>{p.note}</div>
            </div>
          ))}
        </div>
        <p style={{fontSize:11,color:"#556",lineHeight:1.7}}>
          Fix these three and your OHS goes from 50 kg to 65+ kg — which directly unlocks a heavier snatch.
          Bedtime routine is the highest ROI: 5 min daily compounds faster than 30 min once a week.
        </p>
      </div>

      {/* Section selector */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:6,marginBottom:16}}>
        {sections.map(s=>(
          <button key={s.id} onClick={()=>setSection(s.id)} style={{
            padding:"8px 4px",borderRadius:6,cursor:"pointer",textAlign:"center",
            background:section===s.id?"var(--gold)":"var(--bg2)",
            color:section===s.id?"#000":"var(--text3)",
            border:section===s.id?"none":"1px solid var(--border)",
            fontFamily:"'DM Mono',monospace",fontSize:9,fontWeight:600,letterSpacing:1,
            transition:"all 0.15s",
          }}>{s.label}</button>
        ))}
      </div>

      {/* Section header */}
      <div style={{background:"var(--bg2)",borderRadius:8,padding:"12px 14px",marginBottom:14,
        border:`1px solid ${d.color}44`}}>
        <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:20,color:d.color,letterSpacing:0.5,marginBottom:4}}>
          {d.label}
        </div>
        <div style={{display:"flex",gap:10,alignItems:"center",marginBottom:6}}>
          <span style={{fontSize:10,color:"var(--green)",background:"rgba(90,158,69,0.1)",
            borderRadius:3,padding:"2px 8px",fontFamily:"'DM Mono',monospace",
            border:"1px solid rgba(90,158,69,0.3)"}}>{d.time}</span>
        </div>
        <p style={{fontSize:11,color:"var(--text2)",lineHeight:1.7}}>{d.note}</p>
      </div>

      {/* Drills */}
      {d.drills.map((drill,i)=><DrillCard key={i} drill={drill}/>)}

      {/* Tools reminder */}
      <div style={{marginTop:16,background:"var(--bg2)",border:"1px solid var(--border)",
        borderRadius:8,padding:"12px 14px"}}>
        <div style={{fontFamily:"'DM Mono',monospace",fontSize:9,color:"var(--text3)",letterSpacing:1.5,marginBottom:8}}>
          YOUR TOOLS
        </div>
        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
          {[
            ["Theracane","#d4a843","Trigger points"],
            ["Foam Roller","#4a90d9","Extension/rolling"],
            ["Lacrosse Ball","#8b5cf6","Joint capsule"],
            ["Bands","#5a9e45","Distraction"],
            ["Heated Pad","#c94f3a","Passive warmup"],
            ["TENS Device","#888","Recovery"],
          ].map(([name,color,use])=>(
            <div key={name} style={{background:color+"14",border:`1px solid ${color}33`,
              borderRadius:5,padding:"5px 10px"}}>
              <div style={{fontSize:9,color,fontFamily:"'DM Mono',monospace",letterSpacing:0.5}}>{name}</div>
              <div style={{fontSize:9,color:"var(--text3)",marginTop:1}}>{use}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const PRIORITY_ORDER = {essential:0, high:1, medium:2, low:3};

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

function ExercisesTab() {
  const [filter, setFilter] = React.useState('all');
  const [search, setSearch] = React.useState('');
  const [openId, setOpenId] = React.useState(null);

  const TYPE_ORDER = ['snatch','cj','strength','accessory'];
  const TYPE_LABELS = { snatch:'SNATCH', cj:'C&J', strength:'STRENGTH', accessory:'ACCESSORY' };

  // Exercises currently in the program (for badge)
  const inProgram = React.useMemo(() => {
    const s = new Set();
    DAYS_SUMMER.forEach(d => d.exercises.forEach(e => s.add(e.id)));
    return s;
  }, []);

  // Best logged weight per exercise (from localStorage)
  const bestWeights = React.useMemo(() => {
    const bw = {};
    Object.keys(localStorage).filter(k => k.startsWith('sets_')).forEach(k => {
      const m = k.match(/^sets_w\d+_d\d+_(.+)$/);
      if (!m) return;
      const exId = m[1];
      try {
        const sets = JSON.parse(localStorage.getItem(k) || '[]');
        sets.forEach(s => {
          if (s.done && parseFloat(s.weight) > 0) {
            bw[exId] = Math.max(bw[exId] || 0, parseFloat(s.weight));
          }
        });
      } catch {}
    });
    return bw;
  }, []);

  const allExercises = Object.values(EXERCISE_CATALOG);
  const q = search.toLowerCase();

  const filtered = allExercises.filter(ex => {
    if (filter !== 'all' && ex.type !== filter) return false;
    if (q && !ex.name.toLowerCase().includes(q) && !ex.id.includes(q)) return false;
    return true;
  });

  const grouped = TYPE_ORDER.map(type => ({
    type,
    label: TYPE_LABELS[type],
    items: filtered.filter(ex => ex.type === type),
  })).filter(g => g.items.length > 0);

  const typeColor = { snatch:'var(--blue)', cj:'var(--red)', strength:'var(--gold)', accessory:'var(--text3)' };

  return (
    <div className="fade">
      {/* Search */}
      <input
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Search exercises..."
        style={{
          width:'100%', background:'var(--bg1)', border:'1px solid var(--border)',
          borderRadius:8, padding:'10px 14px', color:'var(--text)', fontSize:13,
          fontFamily:"'DM Sans',sans-serif", marginBottom:10,
        }}
      />

      {/* Type filter chips */}
      <div style={{display:'flex', gap:6, marginBottom:16, flexWrap:'wrap'}}>
        {[['all','ALL'], ...TYPE_ORDER.map(t => [t, TYPE_LABELS[t]])].map(([val, lbl]) => (
          <button key={val} onClick={() => setFilter(val)} style={{
            fontSize:9, fontFamily:"'DM Mono',monospace", letterSpacing:1.5,
            padding:'4px 10px', borderRadius:12, cursor:'pointer',
            background: filter === val ? (val === 'all' ? 'var(--text3)' : typeColor[val]) : 'var(--bg2)',
            color: filter === val ? '#000' : 'var(--text3)',
            border: `1px solid ${filter === val ? (val === 'all' ? 'var(--text3)' : typeColor[val]) : 'var(--border)'}`,
            fontWeight: filter === val ? 700 : 400,
          }}>{lbl}</button>
        ))}
      </div>

      {/* Count */}
      <div style={{fontSize:9, color:'var(--text3)', fontFamily:"'DM Mono',monospace", marginBottom:12, letterSpacing:1}}>
        {filtered.length} EXERCISES
      </div>

      {/* Groups */}
      {grouped.map(group => (
        <div key={group.type} style={{marginBottom:20}}>
          <div style={{
            fontFamily:"'Bebas Neue',sans-serif", fontSize:18, letterSpacing:1,
            color: typeColor[group.type], marginBottom:8,
          }}>
            {group.label} <span style={{fontSize:12, color:'var(--text3)'}}>{group.items.length}</span>
          </div>
          <div style={{display:'flex', flexDirection:'column', gap:1}}>
            {group.items.map((ex, i) => {
              const isOpen = openId === ex.id;
              const best = bestWeights[ex.id];
              const prog = inProgram.has(ex.id);
              return (
                <div key={ex.id} style={{
                  background:'var(--bg1)', border:'1px solid var(--border)',
                  borderRadius: i === 0 ? '8px 8px 0 0' : i === group.items.length - 1 ? '0 0 8px 8px' : '0',
                  borderTop: i > 0 ? 'none' : undefined,
                }}>
                  <div
                    onClick={() => setOpenId(isOpen ? null : ex.id)}
                    style={{
                      padding:'10px 14px', cursor:'pointer',
                      display:'flex', alignItems:'center', justifyContent:'space-between',
                    }}
                  >
                    <div style={{display:'flex', alignItems:'center', gap:8}}>
                      <div style={{
                        width:6, height:6, borderRadius:'50%', flexShrink:0,
                        background: typeColor[ex.type],
                      }}/>
                      <span style={{
                        fontFamily:"'Bebas Neue',sans-serif", fontSize:15, letterSpacing:0.3,
                        color:'var(--text)',
                      }}>{ex.name}</span>
                      {prog && (
                        <span style={{
                          fontSize:7, fontFamily:"'DM Mono',monospace", letterSpacing:1,
                          background:'var(--gold)', color:'#000', padding:'1px 5px', borderRadius:3,
                          fontWeight:700,
                        }}>PROG</span>
                      )}
                    </div>
                    <div style={{display:'flex', alignItems:'center', gap:8}}>
                      {best != null && (
                        <span style={{
                          fontSize:9, color:'var(--gold)', fontFamily:"'DM Mono',monospace",
                        }}>{best} kg</span>
                      )}
                      <span style={{fontSize:9, color:'var(--text3)'}}>{isOpen ? '▾' : '▸'}</span>
                    </div>
                  </div>
                  {isOpen && (
                    <div style={{
                      padding:'8px 14px 12px', borderTop:'1px solid var(--border)',
                      background:'var(--bg)',
                    }}>
                      <div style={{fontSize:9, color:'var(--text3)', fontFamily:"'DM Mono',monospace", letterSpacing:1}}>
                        {ex.id}
                      </div>
                      {ex.desc && <CueText text={ex.desc} style={{marginTop:8}}/>}
                      {best != null && (
                        <div style={{marginTop:6, fontSize:11, color:'var(--text2)'}}>
                          Best logged: <span style={{color:'var(--gold)', fontWeight:600}}>{best} kg</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {filtered.length === 0 && (
        <div style={{color:'var(--text3)', fontSize:12, fontFamily:"'DM Mono',monospace", padding:'20px 0'}}>
          No exercises match your filter.
        </div>
      )}
    </div>
  );
}

// ── System Tab ────────────────────────────────────────────────────────────────
function SyncSection() {
  const [migrating, setMigrating] = React.useState(false);
  const [status, setStatus] = React.useState(null);

  async function migrate() {
    if (!sbSync.ready) { setStatus('Supabase not configured — check key.js'); return; }
    setMigrating(true);
    setStatus(null);
    try {
      let logs = {};
      try { logs = JSON.parse(localStorage.getItem('oly_logs') || '{}'); } catch {}
      await Promise.all(Object.entries(logs).map(([id, e]) => sbSync.upsertSession(id, e)));

      const setKeys = Object.keys(localStorage).filter(k => k.startsWith('sets_'));
      await Promise.all(setKeys.map(k => {
        try { return sbSync.upsertSets(k, JSON.parse(localStorage.getItem(k) || '[]')); }
        catch { return Promise.resolve(); }
      }));

      let reviews = {};
      try { reviews = JSON.parse(localStorage.getItem('oly_reviews') || '{}'); } catch {}
      await Promise.all(Object.entries(reviews).map(([w, r]) => sbSync.upsertReview(parseInt(w), r)));

      const sCount = Object.keys(logs).length;
      const rCount = Object.keys(reviews).length;
      setStatus(`✓ Migrated ${sCount} sessions · ${setKeys.length} set records · ${rCount} reviews`);
    } catch(err) {
      setStatus(`Error: ${err?.message || String(err)}`);
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

function SystemTab({week}) {
  const STORAGE_KEY = "oly_system";
  const [data, setData] = useState(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); } catch { return {}; }
  });
  const [section, setSection] = useState("blocks");

  function toggle(id) {
    const next = {...data, [id]: !data[id]};
    setData(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }

  const currentBlock = data.currentBlock || 1;
  function setBlock(b) {
    const next = {...data, currentBlock: b};
    setData(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }

  // Blocks only (UI slim-down, 2026-10-17): the LMS-phase selector changed
  // nothing elsewhere, and Principles / Pain are reference text kept in CLAUDE.md.
  const sections = [
    {id:"blocks",   label:"BLOCKS"},
  ];

  return (
    <div className="fade">
      {/* Section nav */}
      <div style={{display:"flex",gap:6,marginBottom:20,overflowX:"auto",WebkitOverflowScrolling:"touch",scrollbarWidth:"none"}}>
        {sections.map(s => (
          <button key={s.id} onClick={() => setSection(s.id)} style={{
            padding:"7px 14px",borderRadius:6,border:"none",cursor:"pointer",
            fontSize:10,fontWeight:600,letterSpacing:1.5,fontFamily:"'DM Mono',monospace",
            whiteSpace:"nowrap",flexShrink:0,transition:"all 0.15s",
            background: section===s.id ? "var(--gold)" : "var(--bg2)",
            color: section===s.id ? "#000" : "var(--text3)",
          }}>{s.label}</button>
        ))}
      </div>

      {/* ── BLOCKS ── */}
      {section==="blocks" && (
        <div>
          <div style={{fontSize:10,color:"var(--text3)",fontFamily:"'DM Mono',monospace",letterSpacing:1,marginBottom:12}}>
            PERIODIZATION ARCHITECTURE · 4-BLOCK SYSTEM
          </div>

          {/* Current block selector */}
          <div style={{display:"flex",gap:6,marginBottom:20}}>
            {BLOCKS.map(b => (
              <button key={b.id} onClick={() => setBlock(b.id)} style={{
                flex:1,padding:"8px 4px",borderRadius:6,border:"none",cursor:"pointer",
                fontSize:9,fontWeight:700,letterSpacing:1,fontFamily:"'DM Mono',monospace",
                transition:"all 0.15s",
                background: currentBlock===b.id ? b.color : "var(--bg2)",
                color: currentBlock===b.id ? "#000" : "var(--text3)",
                boxShadow: currentBlock===b.id ? `0 0 12px ${b.color}44` : "none",
              }}>B{b.id}</button>
            ))}
          </div>

          {/* Block detail */}
          {BLOCKS.map(b => {
            const active = currentBlock === b.id;
            const done = b.advancement.every(a => data[a.id]);
            return (
              <div key={b.id} style={{
                background:"var(--bg2)",borderRadius:10,padding:"14px 16px",marginBottom:12,
                border:`1px solid ${active ? b.color+"88" : "var(--border)"}`,
                opacity: b.id > currentBlock ? 0.45 : 1,
                transition:"all 0.15s",
              }}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    {active && <div style={{width:6,height:6,borderRadius:"50%",background:b.color,boxShadow:`0 0 8px ${b.color}`}}/>}
                    <span style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:18,color:b.color,letterSpacing:0.5}}>{b.label}</span>
                    <span style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:14,color:"var(--text2)",letterSpacing:0.3}}>{b.name}</span>
                  </div>
                  <span style={{fontSize:9,color:"var(--text3)",fontFamily:"'DM Mono',monospace"}}>{b.weeks}</span>
                </div>

                <div style={{fontSize:11,color:"var(--text2)",marginBottom:10,lineHeight:1.4}}>{b.goal}</div>

                {b.phases.map((p,i) => (
                  <div key={i} style={{fontSize:10,color:"var(--text3)",marginBottom:4,paddingLeft:8,
                    borderLeft:`2px solid ${b.color}44`,lineHeight:1.4}}>{p}</div>
                ))}

                {b.advancement.length > 0 && (
                  <div style={{marginTop:12}}>
                    <div style={{fontSize:9,color:"var(--text3)",fontFamily:"'DM Mono',monospace",letterSpacing:1,marginBottom:8}}>
                      ADVANCE WHEN:
                    </div>
                    {b.advancement.map(a => (
                      <div key={a.id} onClick={() => toggle(a.id)} style={{
                        display:"flex",alignItems:"flex-start",gap:10,padding:"7px 0",
                        cursor:"pointer",borderBottom:"1px solid var(--border)",
                      }}>
                        <div style={{
                          width:18,height:18,borderRadius:4,flexShrink:0,marginTop:1,
                          background: data[a.id] ? b.color : "transparent",
                          border: `2px solid ${data[a.id] ? b.color : "var(--border2)"}`,
                          display:"flex",alignItems:"center",justifyContent:"center",
                          transition:"all 0.15s",
                        }}>
                          {data[a.id] && <span style={{fontSize:10,color:"#000",fontWeight:700}}>✓</span>}
                        </div>
                        <span style={{fontSize:11,color: data[a.id] ? "var(--text)" : "var(--text2)",
                          textDecoration: data[a.id] ? "line-through" : "none", lineHeight:1.4}}>
                          {a.text}
                        </span>
                      </div>
                    ))}
                    {done && b.advancement.length > 0 && (
                      <div style={{marginTop:10,padding:"8px 12px",borderRadius:6,
                        background:`${b.color}22`,border:`1px solid ${b.color}66`,
                        fontSize:11,color:b.color,textAlign:"center",fontWeight:600}}>
                        ✓ ALL CRITERIA MET — READY TO ADVANCE
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* Year goals */}
          <div style={{background:"var(--bg2)",borderRadius:10,padding:"14px 16px",marginTop:4,
            border:"1px solid var(--border)"}}>
            <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:16,letterSpacing:0.5,
              color:"var(--text2)",marginBottom:10}}>YEAR TARGETS</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              {[
                {label:"Year 1",lifts:"Sn 70 · Cln 90 · Jerk 80",sub:"4 blocks completed"},
                {label:"Year 2",lifts:"Sn 80 · Cln 100+ · C&J 100",sub:"First recordable total"},
              ].map(y => (
                <div key={y.label} style={{background:"var(--bg3)",borderRadius:8,padding:"10px 12px"}}>
                  <div style={{fontSize:9,color:"var(--text3)",fontFamily:"'DM Mono',monospace",letterSpacing:1,marginBottom:4}}>{y.label}</div>
                  <div style={{fontSize:13,fontWeight:600,color:"var(--gold)",marginBottom:2}}>{y.lifts}</div>
                  <div style={{fontSize:10,color:"var(--text3)"}}>{y.sub}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// ── Week Review Form ───────────────────────────────────────────────────────────
function inferDaysFromLogs(week, dayList) {
  let logs = {};
  try { logs = JSON.parse(localStorage.getItem("oly_logs") || "{}"); } catch {}
  const weekLogs = Object.values(logs).filter(l => l.week === week);
  const result = {};
  dayList.forEach(d => {
    const entry = weekLogs.find(l => {
      const m = l.dayLabel && l.dayLabel.match(/(\d+)/);
      return m ? `d${m[1]}` === d.id : false;
    });
    const dayEntries = weekLogs.filter(l => {
      const m = l.dayLabel && l.dayLabel.match(/(\d+)/);
      return m ? `d${m[1]}` === d.id : false;
    });
    // Expected total from program definition — exercises never opened have no localStorage entry,
    // so counting only from localStorage keys undercounts and produces false 100% readings.
    const expectedTotal = d.exercises.reduce((acc, ex) => {
      const count = typeof ex.sets === "number" ? ex.sets : parseInt(ex.sets) || 3;
      return acc + count;
    }, 0);
    // Use pct snapshot from log entry when available (captured at COMPLETE time, immune to stale data).
    // Fall back to re-computing from localStorage for sessions logged before this fix.
    let pct;
    if (entry?.pct != null) {
      pct = entry.pct;
    } else {
      let doneSets = 0;
      try {
        // Warm-up ticks share the sets_ prefix (so they sync) but never count.
        doneSets = doneSetsFor(`sets_w${week}_${d.id}_`, Object.keys(localStorage), k => localStorage.getItem(k));
      } catch {}
      pct = expectedTotal > 0 ? Math.round((doneSets / expectedTotal) * 100) : null;
    }
    let status;
    if (pct === 100) status = "done";
    else if (pct !== null && pct > 0) status = "partial";
    else if (entry && pct === null) status = "skipped"; // COMPLETE pressed but no sets recorded
    else if (entry && pct === 0) status = "partial";    // COMPLETE pressed, sets exist but none ticked
    else status = "skipped";
    const logNotes = dayEntries.map(e => {
      const parts = [];
      if (e.notes) parts.push(e.notes);
      if (e.backPain && parseFloat(e.backPain) > 0) parts.push(`back pain ${e.backPain}/10`);
      if (e.techniqueFeel) parts.push(`technique: ${e.techniqueFeel}`);
      if (e.energyLevel) parts.push(`energy: ${e.energyLevel}`);
      return parts.join(", ");
    }).filter(Boolean).join(" | ");
    result[d.id] = {
      status,
      loggedDate: entry ? entry.date : null,
      pct,
      notes: logNotes,
    };
  });
  return result;
}

// Which days must be logged for a week to count as done comes from
// program.js's completionDayIds(): the week's own day list where it has one
// (Block 3's week 17 is three sessions — Wed/Thu/Sat), else d1–d4.
function isWeekComplete(week) {
  const inferred = inferDaysFromLogs(week, DAYS_SCHOOL);
  return completionDayIds(week).every(id => {
    const status = inferred[id]?.status;
    return status === "done" || status === "partial";
  });
}

function computeCurrentWeek() {
  // Furthest-progress based, not strict-linear: a single day logged late or
  // never (e.g. a missed session from months ago) must not permanently freeze
  // the badge on that old week while later weeks are actively being trained.
  let logs = {};
  try { logs = JSON.parse(localStorage.getItem("oly_logs") || "{}"); } catch {}
  const loggedWeeks = Object.values(logs).map(l => l.week).filter(w => typeof w === "number" && w >= 1);
  if (loggedWeeks.length === 0) return 1;
  const maxLoggedWeek = Math.min(Math.max(...loggedWeeks), 28);
  return isWeekComplete(maxLoggedWeek) ? Math.min(maxLoggedWeek + 1, 28) : maxLoggedWeek;
}

function WeekReviewForm({ week, weekData, isSummer, onSaved }) {
  const dayList = isSummer ? DAYS_SUMMER : DAYS_SCHOOL;

  const [form, setForm] = React.useState(() => {
    const saved = reviewStorage.get(week);
    const inferred = inferDaysFromLogs(week, dayList);
    const savedDays = saved?.days || {};
    const days = {};
    dayList.forEach(d => {
      const sv = savedDays[d.id];
      days[d.id] = { ...inferred[d.id], ...(sv?.status?{status:sv.status}:{}), ...(sv?.pct!=null?{pct:sv.pct}:{}), notes:sv?.notes||inferred[d.id]?.notes||"" };
    });
    return { rating:"green", energyTrend:"stable", injuries:[], generalNotes:"", ai:null, confirmed:false, ...(saved||{}), days };
  });
  const [expanded,  setExpanded]  = React.useState(false);

  React.useEffect(() => {
    const dl = isSummer ? DAYS_SUMMER : DAYS_SCHOOL;
    const saved = reviewStorage.get(week);
    const inferred = inferDaysFromLogs(week, dl);
    const savedDays = saved?.days || {};
    const days = {};
    dl.forEach(d => {
      const sv = savedDays[d.id];
      days[d.id] = { ...inferred[d.id], ...(sv?.status?{status:sv.status}:{}), ...(sv?.pct!=null?{pct:sv.pct}:{}), notes:sv?.notes||inferred[d.id]?.notes||"" };
    });
    setForm({ rating:"green", energyTrend:"stable", injuries:[], generalNotes:"", ai:null, confirmed:false, ...(saved||{}), days });
    setExpanded(false);
  }, [week, isSummer]);

  const setDay    = (id, patch) => setForm(f => ({ ...f, days:{ ...f.days, [id]:{ ...f.days[id], ...patch } } }));
  const addInjury = ()          => setForm(f => ({ ...f, injuries:[...f.injuries,{ id:Date.now(), bodyPart:"", type:"sharp", severity:"moderate" }] }));
  const setInjury = (i, patch)  => setForm(f => ({ ...f, injuries:f.injuries.map((inj,idx) => idx===i ? {...inj,...patch} : inj) }));
  const removeInj = (i)         => setForm(f => ({ ...f, injuries:f.injuries.filter((_,idx) => idx!==i) }));


  const handleSave = () => {
    const saved = reviewStorage.save(week, { ...form, confirmed:true });
    if (!saved) return;
    setForm(prev => ({ ...prev, confirmed:true }));
    setExpanded(false);
    onSaved(saved);
  };

  const pill = (active, color) => ({
    padding:"4px 10px", borderRadius:12, fontSize:10, cursor:"pointer",
    fontFamily:"'DM Mono',monospace", letterSpacing:0.5, border:`1px solid ${active?color:"var(--border)"}`,
    background:active?`${color}22`:"transparent", color:active?color:"var(--text3)",
  });

  const STATUS_COLOR = { done:"#5a9e45", partial:"#d4a843", skipped:"#c94f3a" };

  const handleExpand = () => {
    const dl = isSummer ? DAYS_SUMMER : DAYS_SCHOOL;
    const saved = reviewStorage.get(week);
    const inferred = inferDaysFromLogs(week, dl);
    const savedDays = saved?.days || {};
    const days = {};
    dl.forEach(d => {
      const sv = savedDays[d.id];
      days[d.id] = { ...inferred[d.id], ...(sv?.status?{status:sv.status}:{}), ...(sv?.pct!=null?{pct:sv.pct}:{}), notes:sv?.notes||inferred[d.id]?.notes||"" };
    });
    setForm(prev => ({ ...prev, days }));
    setExpanded(true);
  };

  if (!expanded) {
    return (
      <div style={{marginTop:16,borderTop:"1px solid var(--border)",paddingTop:14}}>
        <button onClick={handleExpand}
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

      <div style={{marginBottom:14}}>
        <div style={{fontSize:9,color:"var(--text3)",fontFamily:"'DM Mono',monospace",letterSpacing:1.5,marginBottom:6}}>SESSIONS</div>
        {dayList.map(d => {
          const ds = form.days[d.id] || { status:"skipped", notes:"", loggedDate:null };
          const fromLog = !!ds.loggedDate;
          return (
            <div key={d.id} style={{marginBottom:6,padding:"8px 10px",background:"var(--bg3)",borderRadius:6}}>
              <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap",marginBottom:ds.status!=="done"?6:0}}>
                <span style={{fontSize:10,fontFamily:"'DM Mono',monospace",color:"var(--text2)",minWidth:56,flexShrink:0}}>{d.label.split(" ").slice(0,2).join(" ")}</span>
                {fromLog ? (
                  <span style={{fontSize:9,fontFamily:"'DM Mono',monospace",color:STATUS_COLOR[ds.status],
                    background:STATUS_COLOR[ds.status]+"22",border:`1px solid ${STATUS_COLOR[ds.status]}`,
                    borderRadius:10,padding:"2px 8px"}}>
                    {ds.status.toUpperCase()}
                  </span>
                ) : (
                  ["done","partial","skipped"].map(s => (
                    <button key={s} onClick={()=>setDay(d.id,{status:s})} style={pill(ds.status===s, STATUS_COLOR[s])}>
                      {s.charAt(0).toUpperCase()+s.slice(1)}
                    </button>
                  ))
                )}
                {fromLog && ds.loggedDate && (
                  <span style={{fontSize:9,color:"var(--text3)",fontFamily:"'DM Mono',monospace"}}>
                    {ds.loggedDate}
                  </span>
                )}
                <span style={{fontSize:9,color:"var(--text3)",fontFamily:"'DM Mono',monospace",marginLeft:"auto",display:"inline-flex",alignItems:"center",gap:1}}>
                  <input type="text" inputMode="numeric" pattern="[0-9]*" maxLength={3}
                    value={ds.pct ?? ""}
                    onChange={e=>setDay(d.id,{pct:e.target.value===""?null:Math.min(100,Math.max(0,parseInt(e.target.value)||0))})}
                    style={{width:22,background:"transparent",border:"none",borderBottom:"1px solid var(--border2)",
                      color:"var(--text3)",fontFamily:"'DM Mono',monospace",fontSize:9,textAlign:"right",padding:0,outline:"none"}}
                  />% sets
                </span>
                {fromLog && (
                  <button onClick={()=>setDay(d.id,{status:ds.status==="done"?"partial":ds.status==="partial"?"skipped":"done"})}
                    style={{fontSize:8,padding:"1px 6px",borderRadius:8,border:"1px solid var(--border)",
                      background:"transparent",color:"var(--text3)",cursor:"pointer",fontFamily:"'DM Mono',monospace",marginLeft:"auto"}}>
                    override
                  </button>
                )}
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
          <div key={inj.id ?? i} style={{marginBottom:6,padding:"8px 10px",background:"var(--bg3)",borderRadius:6,display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}>
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

      <div style={{marginBottom:14}}>
        <div style={{fontSize:9,color:"var(--text3)",fontFamily:"'DM Mono',monospace",letterSpacing:1.5,marginBottom:4}}>NOTES FOR NEXT WEEK</div>
        <textarea value={form.generalNotes} onChange={e=>setForm(f=>({...f,generalNotes:e.target.value}))}
          placeholder="Anything else the coach should know…" rows={2}
          style={{width:"100%",boxSizing:"border-box",background:"var(--bg2)",border:"1px solid var(--border)",
            borderRadius:6,color:"var(--text)",padding:"7px 10px",fontSize:11,resize:"vertical"}}/>
      </div>

      {form.ai && (
        <div style={{marginBottom:14,padding:"12px 14px",background:"var(--bg2)",borderRadius:8,border:"1px solid var(--gold)33"}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
            <span style={{fontSize:9,color:"var(--gold)",fontFamily:"'DM Mono',monospace",letterSpacing:1.5}}>AI REVIEW</span>
            {form.ai.loadRecommendation && (
            <span style={{fontSize:9,fontFamily:"'DM Mono',monospace",letterSpacing:0.5,
              color:form.ai.loadRecommendation==="advance"?"#5a9e45":form.ai.loadRecommendation==="reduce"?"#c94f3a":"#d4a843",
              background:form.ai.loadRecommendation==="advance"?"#5a9e4522":form.ai.loadRecommendation==="reduce"?"#c94f3a22":"#d4a84322",
              padding:"1px 7px",borderRadius:8}}>
              {form.ai.loadRecommendation.toUpperCase()}
            </span>
            )}
          </div>
          <div style={{fontSize:11,color:"var(--text2)",lineHeight:1.7,marginBottom:10}}>
            {form.ai.narrative}
          </div>
          {(form.ai.skipExercises||[]).length > 0 && (
            <div style={{marginBottom:8}}>
              <div style={{fontSize:9,color:"#c94f3a",fontFamily:"'DM Mono',monospace",letterSpacing:1,marginBottom:4}}>SKIP</div>
              {(form.ai.skipExercises||[]).map((ex,i) => {
                const sub = (form.ai.substitutions||[]).find(s=>s.skip===ex);
                return (
                  <div key={i} style={{marginBottom:4,paddingLeft:6,borderLeft:"2px solid #c94f3a44"}}>
                    <div style={{fontSize:10,color:"var(--text)"}}>{ex}</div>
                    {sub && <div style={{fontSize:9,color:"#5a9e45",marginTop:1}}>↳ {sub.sub}</div>}
                  </div>
                );
              })}
            </div>
          )}
          {(form.ai.reduceLoadExercises||[]).length > 0 && (
            <div>
              <div style={{fontSize:9,color:"#d4a843",fontFamily:"'DM Mono',monospace",letterSpacing:1,marginBottom:4}}>REDUCE LOAD</div>
              {(form.ai.reduceLoadExercises||[]).map((ex,i) => (
                <div key={i} style={{fontSize:10,color:"var(--text)",marginBottom:2,paddingLeft:6,borderLeft:"2px solid #d4a84344"}}>
                  {ex}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

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

// ── Program Week View ─────────────────────────────────────────────────────────
function ProgramWeekView({viewWeek, onWeekChange, currentWeek, isSummer}) {
  const weekData = weekPlan(viewWeek);

  const [reviewVersion, setReviewVersion] = React.useState(0);
  const prevReview = React.useMemo(
    () => viewWeek > 1 ? reviewStorage.get(viewWeek - 1) : null,
    [viewWeek, reviewVersion]
  );
  const prevSkip   = prevReview?.confirmed ? (prevReview?.ai?.skipExercises||[])       : [];
  const prevReduce = prevReview?.confirmed ? (prevReview?.ai?.reduceLoadExercises||[]) : [];

  if (!weekData) return null;

  const blockNum = (blockFor(viewWeek) || {}).block ?? weekData.block;
  const blockColor = BLOCK_COLORS[blockNum];
  const phaseColor = PHASE_COLORS[weekData.phase] || "#888";
  const isCurrentWeek = viewWeek === currentWeek;
  const TOTAL_WEEKS = 28;

  // Block 1 is authored as five days and drops D5 in school term. Block 2 is
  // authored natively as four; filtering it would silently delete Saturday.
  const days = weekData.days
    ? (isSummer || blockNum !== 1
        ? weekData.days
        : weekData.days.filter(d => d.id !== "d5"))
    : null;

  return (
    <div className="fade">
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
      {(prevSkip.length > 0 || prevReduce.length > 0) && (
        <div style={{marginBottom:12,padding:"10px 14px",background:"#d4a84311",borderRadius:8,
          border:"1px solid #d4a84344"}}>
          <div style={{fontSize:9,color:"var(--gold)",fontFamily:"'DM Mono',monospace",letterSpacing:1.5,marginBottom:8}}>
            ⚠️ FROM WEEK {viewWeek-1} REVIEW
          </div>
          {prevSkip.length > 0 && (
            <div style={{marginBottom:prevReduce.length>0?6:0}}>
              <span style={{fontSize:9,color:"#c94f3a",fontFamily:"'DM Mono',monospace",letterSpacing:0.5}}>SKIP  </span>
              <span style={{fontSize:10,color:"var(--text)"}}>{prevSkip.join(", ")}</span>
            </div>
          )}
          {prevReduce.length > 0 && (
            <div>
              <span style={{fontSize:9,color:"#d4a843",fontFamily:"'DM Mono',monospace",letterSpacing:0.5}}>REDUCE  </span>
              <span style={{fontSize:10,color:"var(--text)"}}>{prevReduce.join(", ")}</span>
            </div>
          )}
        </div>
      )}

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

      {days && days.map(d => (
        <div key={d.id} style={{background:"var(--bg2)",borderRadius:8,
          padding:"10px 14px",marginBottom:8,border:"1px solid var(--border)"}}>
          {(() => {
            const exs = d.exercises || [];
            const daySkip   = exs.filter(e => prevSkip.includes(getEx(e.id)?.name || e.id));
            const dayReduce = exs.filter(e => prevReduce.includes(getEx(e.id)?.name || e.id));
            const chips = [
              ...daySkip.map(e   => ({action:"skip",   exercise:getEx(e.id)?.name || e.id})),
              ...dayReduce.map(e => ({action:"reduce",  exercise:getEx(e.id)?.name || e.id})),
            ];
            return chips.length > 0 ? (
              <div style={{display:"flex",gap:4,flexWrap:"wrap",marginBottom:6}}>
                {chips.map((f,i) => (
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

      {!days && (
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
      {blockNum === 1 && viewWeek <= currentWeek && (
        <WeekReviewForm
          week={viewWeek}
          weekData={weekData}
          isSummer={isSummer}
          onSaved={()=>setReviewVersion(v=>v+1)}
        />
      )}
      {/* Finding I5 (2026-08-16 final-branch review): this used to just not
          render, with nothing telling the athlete the review→AI-adjust loop
          had gone silent. WeekReviewForm is templated on PROGRAM_B1's
          exercise shape — wiring it for Block 2+ is a follow-on branch. */}
      {blockNum !== 1 && viewWeek <= currentWeek && (
        <div style={{marginTop:16,background:"var(--bg2)",borderRadius:8,padding:"12px 16px",
          border:"1px solid var(--border)",fontSize:11,color:"var(--text3)"}}>
          Weekly AI review isn't wired up for Block {blockNum} yet — it still
          runs on Block 1's exercise templates. Log this week under TRAINING
          DAYS as usual; the review→AI-adjust loop resumes once that's built.
        </div>
      )}
    </div>
  );
}

function migratePRs(raw){
  const out={};
  Object.entries(raw).forEach(([lift,entry])=>{
    out[lift]=entry.history?entry:{...entry,history:entry.weight!=null?[{weight:entry.weight,date:entry.date??'',reps:entry.reps??1}]:[]};
  });
  return out;
}

function migrateExerciseKeysV1() {
  if (localStorage.getItem('oly_ex_migration_v1')) return;
  const keys = Object.keys(localStorage).filter(k => k.startsWith('sets_'));
  keys.forEach(k => {
    const m = k.match(/^(sets_w\d+_d\d+)_(.+)$/);
    if (!m) return;
    const prefix = m[1], namePart = m[2];
    const slug = EXERCISE_NAME_TO_SLUG[namePart];
    if (!slug || slug === namePart) return;
    const newKey = `${prefix}_${slug}`;
    if (newKey === k) return;
    const val = localStorage.getItem(k);
    if (val) localStorage.setItem(newKey, val);
    localStorage.removeItem(k);
  });
  localStorage.setItem('oly_ex_migration_v1', '1');
}

function migratePRKeysV1() {
  if (localStorage.getItem('oly_pr_migration_v1')) return;
  try {
    const raw = localStorage.getItem('oly_prs');
    if (!raw) { localStorage.setItem('oly_pr_migration_v1', '1'); return; }
    const prs = JSON.parse(raw);
    const migrated = {};
    Object.entries(prs).forEach(([name, entry]) => {
      const slug = PR_NAME_TO_SLUG[name] || name;
      if (!migrated[slug]) {
        migrated[slug] = entry;
      } else {
        // Merge if same slug maps from two old names — keep higher weight
        if ((entry.weight||0) > (migrated[slug].weight||0)) migrated[slug] = entry;
      }
    });
    localStorage.setItem('oly_prs', JSON.stringify(migrated));
  } catch {}
  localStorage.setItem('oly_pr_migration_v1', '1');
}

// Derive PR history from logged set data — fills gaps left by manual entry
function rebuildPRsFromLogs(currentPrs, currentLogs){
  // Build date map: `w{week}_{dayId}` -> ISO date string
  // dayName can be either the day's display name OR its id — match both.
  //
  // Two catalogs, because the two blocks name their days differently. Block 1
  // sessions store DAYS_SUMMER's `name` ("Snatch + Posterior Chain"). Block 2
  // sessions store the PROGRAM_B2 day's `primary` text ("Snatch from floor
  // 1–3 reps"), which appears in no day catalog at all — so matching
  // DAYS_SUMMER alone left every Block 2 session out of dateMap, and the
  // `if(!date) return;` below then silently dropped every Block 2 set. No lift
  // logged from week 9 onward could set a PR. Fall back to the week's own plan
  // (PROGRAM_B2, or PROGRAM_B1 for a Block 1 day logged by its label).
  const dateMap={};
  Object.values(currentLogs).forEach(entry=>{
    if(!entry.week||!entry.date) return;
    const day=DAYS_SUMMER.find(d=>d.name===entry.dayName||d.id===entry.dayName);
    if(day){ dateMap[`w${entry.week}_${day.id}`]=entry.date; return; }
    const planDay=planDayForLog(entry.week, entry); // label digit first — see program.js
    if(planDay) dateMap[`w${entry.week}_${planDay.id}`]=entry.date;
  });

  // Scan all sets keys: sets_w{week}_{dayId}_{exercise_id}
  const byExDate={}; // { exId: { date: maxWeight } }
  Object.keys(localStorage).filter(k=>k.startsWith('sets_')).forEach(k=>{
    const m=k.match(/^sets_(w\d+_(d\d+))_(.+)$/);
    if(!m) return;
    const sessionKey=m[1];
    const exName=m[3]; // already a slug after migration
    const date=dateMap[sessionKey];
    if(!date) return;
    try{
      const sets=JSON.parse(localStorage.getItem(k)||'[]');
      const weights=sets.filter(s=>s.done&&parseFloat(s.weight)>0).map(s=>parseFloat(s.weight));
      if(!weights.length) return;
      const max=Math.max(...weights);
      if(!byExDate[exName]) byExDate[exName]={};
      if(!byExDate[exName][date]||max>byExDate[exName][date]) byExDate[exName][date]=max;
    }catch{}
  });

  if(!Object.keys(byExDate).length) return currentPrs;

  const updated={...currentPrs};
  Object.entries(byExDate).forEach(([exName,byDate])=>{
    const existing=updated[exName]||{history:[]};
    const existingHistory=existing.history||[];
    const existingDates=new Set(existingHistory.map(h=>h.date));
    const newEntries=Object.entries(byDate)
      .filter(([date])=>!existingDates.has(date))
      .map(([date,weight])=>({weight,date,reps:1}));
    if(!newEntries.length) return;
    const history=[...existingHistory,...newEntries]
      .sort((a,b)=>(a.date||'').localeCompare(b.date||''));
    const best=history.reduce((b,h)=>h.weight>(b?.weight||0)?h:b,null);
    const isNewMax=!existing.weight||best.weight>=existing.weight;
    updated[exName]={
      weight:isNewMax?best.weight:existing.weight,
      date:isNewMax?best.date:existing.date,
      reps:existing.reps||1,
      history,
    };
  });
  return updated;
}

// Text/color for the TRAINING DAYS phase banner + phase note, keyed by the
// weekPlan().phase string (PROGRAM_B1/B2's own "Phase 1"/"Phase 2"/"Deload"/
// "Test"), not the binary week<=3?0:1 split that used to drive both — that
// split treated every week past 3 as "Phase 2", so week 7 (Deload) and week 8
// (Test) both showed "PHASE 2 — LOAD THE BASE" and "never grind bad reps",
// contradicting the reduced-set day cards directly below them.
const PHASE_BANNER = {
  "Phase 1": {
    label: "PHASE 1 — BUILD THE BASE", color: "var(--blue)", border: "#4a90d944",
    sub: "Technique + hypertrophy. Position over load. Own every rep.",
    note: "📐 Phase 1: Tap each exercise for coaching notes and load guidelines. Position before weight.",
  },
  "Phase 2": {
    label: "PHASE 2 — LOAD THE BASE", color: "var(--gold)", border: "#d4a84344",
    sub: "Add load systematically. Technique breaks → drop 5 kg.",
    note: "⚡ Phase 2: Load increases. Technique breaks → drop 5 kg. Never grind bad reps.",
  },
  "Deload": {
    label: "DELOAD — VOLUME −40%", color: "#aaa", border: "#88888855",
    sub: "Same loads, sets cut ~40%. No PRs — technique priority.",
    note: "🪶 Deload: fewer sets at the same loads, not lighter weight. Fatigue is low — the best week to catch and film form errors, not to push new numbers.",
  },
  "Test": {
    label: "TEST WEEK — 1RM ATTEMPTS", color: "var(--green)", border: "#5a9e4555",
    sub: "No volume — warm up, then work to a true max on each lift.",
    note: "🎯 Test: warm up in steps to a true max single. Rest 3–5 min between attempts. Stop at the first miss.",
  },
};

// Week 7 (Deload) real per-exercise sets/reps/load, hand-transcribed from
// PROGRAM_B1's week-7 day entries (program.js) onto the day-card catalog's
// exercise IDs. The catalog below only ever had two load bands (Phase 1/
// Phase 2 via ex.l1/ex.l2) and no way to express a set-count cut at all, so
// TRAINING DAYS showed full Phase 2 volume through the deload. `null` drops
// an exercise entirely — ab_wheel isn't in week 7's D5 prescription at all.
// Week 8 (Test) isn't covered here: it's ascending-percentage singles on 1-2
// lifts a day, not fixed sets across the same 5 exercises, so it doesn't fit
// this override shape — see the Deload/Test disclosure banner above for it.
const WEEK7_DELOAD = {
  d1: {
    muscle_snatch:     {sets:2, reps:"3", load:"44 kg"},
    hang_power_snatch: {sets:3, reps:"3", load:"56 kg"},
    back_squat:        {sets:3, reps:"1", load:"95 kg"},
    overhead_squat:    {sets:2, reps:"3", load:"44 kg"},
    weighted_pull_up:  {sets:2, reps:"6", load:"BW+5 kg"},
  },
  d2: {
    muscle_snatch:     {sets:2, reps:"3", load:"44 kg"},
    hang_power_clean:  {sets:3, reps:"3", load:"64 kg"},
    clean_pull:        {sets:2, reps:"4", load:"90 kg"},
    weighted_dips:     {sets:2, reps:"8", load:"BW+20 kg"},
    overhead_squat:    {sets:2, reps:"3", load:"44 kg"},
  },
  d3: {
    muscle_snatch:     {sets:2, reps:"3", load:"44 kg"},
    front_squat:       {sets:3, reps:"6", load:"80 kg"},
    rdl:               {sets:2, reps:"6", load:"80 kg"},
    overhead_squat:    {sets:2, reps:"4", load:"44 kg"},
    // pallof_press unlisted: week 7's D3 secondary ("Pallof 3×10") matches
    // the catalog's base sets/reps/load exactly, so there's nothing to override.
  },
  d4: {
    muscle_snatch:     {sets:2, reps:"3", load:"42 kg"},
    jerk_from_rack:    {sets:3, reps:"3", load:"57 kg"},
    clean_and_jerk:    {sets:2, reps:"1+2", load:"60 kg"},
    overhead_squat:    {sets:2, reps:"3", load:"44 kg"},
    // split_jerk unlisted: "Split Jerk 4×3 (empty bar)" matches the catalog
    // base exactly (empty-bar practice, unchanged by the deload).
  },
  d5: {
    muscle_snatch:     {sets:2, reps:"3", load:"44 kg"},
    belt_squat:        {sets:2, reps:"12", load:"68 kg"},
    split_squat:       {sets:2, reps:"8/leg", load:"44 kg"},
    face_pull:         {sets:2, reps:"15", load:"Light"},
    ab_wheel:          null,
  },
};

function weekAdjustedExercises(day, week) {
  const overrides = week === 7 ? WEEK7_DELOAD[day.id] : null;
  if (!overrides) return day.exercises;
  return day.exercises
    .filter(ex => overrides[ex.id] !== null)
    .map(ex => {
      const o = overrides[ex.id];
      return o ? {...ex, sets:o.sets, reps:o.reps, l1:o.load, l2:o.load} : ex;
    });
}

// Week 8 (Test), hand-transcribed from PROGRAM_B1's week-8 day entries: each
// day works one or two lifts up an ascending-percentage ladder to a true max,
// not fixed sets across the standard 5-exercise catalog — a genuinely
// different day shape, rendered by TestLiftCard below instead of ExCard.
// Percentages are of the target stated in that day's own PROGRAM_B1 note
// (e.g. "Target: HPS 62+ kg"), not of TRAINING_MAX — Block 1's numbers are
// hardcoded kilos, unlike Block 2's TM-relative loads.
//
// Back Squat is the one exception: PROGRAM_B1's week-8 focus line only lists
// "HPS, HPC, FS, Jerk, OHS" — Back Squat has no test day at all despite being
// D1's weekly "daily max single" every other week, which reads as a gap in
// the original (pre-evidence, uncited) Block 1 authoring rather than a
// deliberate call — Jerk gets the same weekly-max treatment and still has a
// test day. Its target (130 kg) is athlete-supplied, not from PROGRAM_B1's
// own text like the other four.
const WEEK8_TEST = {
  d1: { ladder:[0.40,0.50,0.60,0.70,0.80,0.90], lifts:[
    {id:"hang_power_snatch", label:"Hang Power Snatch", target:62},
    {id:"overhead_squat",    label:"Overhead Squat",    target:55},
    {id:"back_squat",        label:"Back Squat",        target:130},
  ]},
  d2: { ladder:[0.50,0.60,0.70,0.80,0.87], lifts:[
    {id:"hang_power_clean", label:"Hang Power Clean", target:70},
  ]},
  d3: { ladder:[0.60,0.70,0.80,0.88,0.93], lifts:[
    {id:"front_squat", label:"Front Squat", target:116},
  ]},
  d4: { ladder:[0.50,0.60,0.70,0.80,0.87], lifts:[
    {id:"jerk_from_rack", label:"Jerk", target:67},
  ]},
  d5: { ladder:[], lifts:[],
    restNote:"Light technique only, ~50% work — no max attempts. Active recovery after four days of testing." },
};

// B2_TEST_LADDER (the test-day ladder) is defined in program.js, beside the
// Block 3 entries that also size their test cards from it.

// Block 2, granular per-exercise breakdown — full ExCard parity (checkboxes,
// weight dropdowns) instead of the read-only PRIMARY/SECONDARY card. Unlike
// Block 1's catalog, PROGRAM_B2 bundles several pieces of work into one
// freeform `secondary` string per day, and most of them don't state a set
// count at all (only the rep scheme, or neither). Every load number here is
// copied verbatim from PROGRAM_B2's own printed text (itself computed from
// TRAINING_MAX, not hand-typed) — zero risk of a transcription drifting from
// what WEEK PLAN shows *at the moment it is copied*. These are snapshots, not
// live reads: **any edit to TRAINING_MAX in program.js must be re-copied into
// the squat/pull/classic-lift load strings below**, or the day cards silently
// keep showing the old kilos while WEEK PLAN shows the new ones. The 2026-09-03
// post-test update (backSquat 118→130, frontSquat 116→115) moved exactly three
// strings: d1 back_squat, d2 front_squat, d4 back_squat. The 2026-10-01 update
// (backSquat 130→137, after logged singles of 133 and 137) re-copied ONLY weeks
// 13–15's back_squat strings — weeks 9–12 are already trained and keep the loads
// they were prescribed at — and dropped week 16's back-squat test, since the
// lift was maxed inside [E16.9]'s ~2-month window. Every SET COUNT not explicitly stated in the source
// is marked [JUDGMENT]: a reasonable default, not a cited number. l1 and l2
// are identical throughout — Block 2 has no Phase 1/Phase 2 split, ExCard
// just needs both fields populated.
//
// STARTING LOADS, 2026-09-04. Twelve exercises across d2/d3/d4 previously
// carried no number at all, because PROGRAM_B2 prescribes them as "light",
// "by feel", or the athlete's choice. That is faithful to the source but
// unusable in the app: generateWeights() returns null without a digit, so
// ExCard renders static text with NO input, and the athlete could neither be
// told a weight nor record one — six of nine exercises on d3, five of seven
// on d4. Each now carries a derived starting range, tagged [JUDGMENT] load on
// its own line with the basis. These are NOT corpus prescriptions and must not
// be cited as such; they are percentages of TRAINING_MAX (or, for the belt
// squat and RDL, a carry-over from Block 1's own numbers) chosen to be
// deliberately conservative — the source's intent for all twelve is that
// speed and position, not the number, set the load.
//
// Two mechanical rules when editing any load string here:
//   1. The kg range must LEAD. generateWeights() takes the first two numbers
//      it finds as the dropdown range, so a trailing "60–70% C&J TM" is safely
//      ignored, but a leading one silently re-centres the dropdown.
//   2. Never use the words "light", "BW", "band" or "cable" — generateWeights()
//      treats them as a non-numeric load and returns null, killing the input
//      even when the string also contains kilos. This is why the strings below
//      say "pattern only" and "speed kept" rather than "light".
//
// Weeks 9-16: the whole of Block 2 is wired. Week 15 is the one week whose
// loads are COMPUTED rather than transcribed - the source prescribes only
// "Wk 14 -10-15%", so each band is week 14's times 0.85-0.90, tagged
// [JUDGMENT] load on its own line. Week 16 d4 is the block test: entries
// marked `test:true` render as a TestLiftCard (B2_TEST_LADDER rungs + a
// free-entry max) instead of an ExCard, and their `sets` equals the ladder's
// step count so the session-progress and log percentages stay right.
// Per-exercise cards for any week past Block 1: Block 2's live here, Block 3's
// in program.js (BLOCK3_EXERCISES). Null when the week has no granular cards.
const exercisesFor = (week, dayId) =>
  (BLOCK2_EXERCISES[week] || BLOCK3_EXERCISES[week])?.[dayId] || null;

const BLOCK2_EXERCISES = {
  9: {
    d1: [
      {id:'snatch_from_floor',   sets:5,     reps:'1–3',  l1:'38–44 kg',                                l2:'38–44 kg'},                                // [JUDGMENT] sets — source gives reps only
      {id:'snpp_ohs_complex',    sets:5,     reps:'5+3',  l1:'50 kg — add weekly, feel',       l2:'50 kg — add weekly, feel'},      // [JUDGMENT] sets — source says "4–6 sets"; 50 kg base is athlete-supplied, source gives no starting weight for this complex at all. Any parenthesized digit in this string (e.g. "(Phase 1)") gets parsed by generateWeights() as a second number and skews the dropdown center — keep load strings to exactly one real number.
      {id:'snatch_pull',         sets:5,     reps:'1',    l1:'56.5–63 kg',                               l2:'56.5–63 kg'},                              // [JUDGMENT] sets; "finish fast" 53.5–56.5 kg tier omitted — see WEEK PLAN
      {id:'back_squat',          sets:'3–5', reps:'3–5',  l1:'84.5–91 kg',                                l2:'84.5–91 kg'},                            // fully stated, no judgment
      {id:'trunk_static_strength', sets:3,   reps:'varies', l1:'Bodyweight',                             l2:'Bodyweight'},                              // [JUDGMENT] sets — athlete's choice, no count given
      {id:'split_jerk',          sets:2,     reps:'3',    l1:'Empty bar',                                l2:'Empty bar'},                               // [JUDGMENT] sets — recurring daily skill note
    ],
    d2: [
      {id:'snatch_balance',              sets:3, reps:'2', l1:'40–50 kg — 5-sec hold in the bottom', l2:'40–50 kg — 5-sec hold in the bottom'},  // Opener slot "power snatch or snatch balance" [E8.1]; 5-sec bottom hold [E11.3]. [JUDGMENT] sets, reps + load — no dose in the source; under the 55 kg×3 PR because of the hold
      {id:'clean_front_squat_floor', sets:5, reps:'1–3', l1:'43–50.5 kg',                                l2:'43–50.5 kg'},                              // [JUDGMENT] sets
      {id:'split_jerk_from_rack', sets:5,    reps:'varies', l1:'30–35 kg — split-position reps, not the % day',       l2:'30–35 kg — split-position reps, not the % day'},        // [JUDGMENT] sets + load — the source prescribes NO % here on purpose (Thu is the % day); 40–50% C&J TM as position-rep work
      {id:'clean_pull',          sets:5,     reps:'1',    l1:'65–72 kg',                                 l2:'65–72 kg'},                                // [JUDGMENT] sets
      {id:'front_squat',         sets:'3–5', reps:'3–5',  l1:'75–80.5 kg',                                l2:'75–80.5 kg'},                              // fully stated, no judgment
      {id:'bodybuilding_core_block', sets:1, reps:"athlete's choice", l1:'Short time-capped block',      l2:'Short time-capped block'},                 // [JUDGMENT] athlete selects exercises. No digit in this load string on purpose — see snpp_ohs_complex's comment above on why a stray number breaks the dropdown
      {id:'split_jerk',          sets:2,     reps:'3',    l1:'Empty bar',                                l2:'Empty bar'},                               // [JUDGMENT] sets — recurring daily skill note
    ],
    d3: [
      {id:'split_jerk_from_rack', sets:5,    reps:'1–3',  l1:'36–47 kg',                                 l2:'36–47 kg'},                                // [JUDGMENT] sets — this week's percentaged jerk day
      {id:'snatch_opener',       sets:2,     reps:'3',    l1:'25–30 kg — pattern only',                                    l2:'25–30 kg — pattern only'},                                   // [JUDGMENT] sets/reps + load — 40–50% snatch TM
      {id:'floating_snatch',     sets:3,     reps:'2',    l1:'32.5–37.5 kg — pause just off the floor',               l2:'32.5–37.5 kg — pause just off the floor'},              // [JUDGMENT] sets + load — 50–60% snatch TM; a floor variant, and the floor is the weak link
      {id:'hang_snatch',         sets:'3–4', reps:'2',    l1:'25–30 kg — speed kept',                  l2:'25–30 kg — speed kept'},                 // sets stated (3–4×2); [JUDGMENT] load — 40–50% snatch TM. Deliberately far under the 66 kg HPS: [E8.8] demotes the hang to support, so loading it here would re-arm the crutch
      {id:'power_jerk',          sets:3,     reps:'2',    l1:'43–50 kg — 60–70% C&J TM',             l2:'43–50 kg — 60–70% C&J TM'},            // [JUDGMENT] sets + load. The kg range must lead the string: generateWeights() reads the FIRST TWO numbers it finds, so the trailing "60–70%" is ignored — a leading stray digit would not be
      {id:'jerk_dip_drive',      sets:3,     reps:'3',    l1:'65–72 kg — 90–100% C&J TM, partial ROM', l2:'65–72 kg — 90–100% C&J TM, partial ROM'}, // [JUDGMENT] sets + load — partial ROM, so it can carry C&J-TM weight; kept at TM rather than over it given the back history
      {id:'push_press',          sets:3,     reps:'3',    l1:'40–45 kg — 60–70% push-press TM, add weight weekly only while it stays fast', l2:'40–45 kg — 60–70% push-press TM, add weight weekly only while it stays fast'}, // [JUDGMENT] sets + load — 60–70% of the 65 kg push-press TM; speed, not the number, is the cap
      {id:'trunk_stiffness_dip', sets:3,     reps:'varies', l1:'Bodyweight',                             l2:'Bodyweight'},                              // [JUDGMENT] sets
      {id:'split_jerk',          sets:2,     reps:'3',    l1:'Empty bar',                                l2:'Empty bar'},                               // [JUDGMENT] sets — recurring daily skill note; wrongly omitted here at first (reasoned it'd be redundant with the heavy rack work above) but [E14.4] cites it for every day including this one — position-grooving is a different purpose than a heavy single
    ],
    d4: [
      {id:'back_squat',          sets:'4–5', reps:'5',    l1:'84.5–91 kg',                                l2:'84.5–91 kg'},                            // fully stated ("4–5×5"), no judgment
      {id:'three_position_snatch', sets:3,   reps:'3 positions', l1:'32.5–37.5 kg — limited by the floor position',                 l2:'32.5–37.5 kg — limited by the floor position'},                       // [JUDGMENT] sets + load — 50–60% snatch TM, set by the hardest of the three positions
      {id:'pause_snatch',        sets:3,     reps:'1',    l1:'38–44 kg snatch / 43–50 kg clean', l2:'38–44 kg snatch / 43–50 kg clean'}, // [JUDGMENT] sets + load — 60–70% of the respective TM; athlete picks the lift, the dropdown centres on the snatch range
      {id:'belt_squat',          sets:3,     reps:'8–10', l1:'70–80 kg — slow tempo, or single-leg squat', l2:'70–80 kg — slow tempo, or single-leg squat'}, // [JUDGMENT] sets/reps + load — carried from Block 1's belt squat (65–78 kg × 12) at the lower rep count; matches the 155–175 lb logged in wk9 D1
      {id:'pull_drill',          sets:1,     reps:'3–5',  l1:'25–30 kg — power position → lowest good hang',        l2:'25–30 kg — power position → lowest good hang'},       // [JUDGMENT] sets + load — a drill, not a lift; 40–50% snatch TM
      {id:'rdl',                 sets:3,     reps:'6–8',  l1:'75–85 kg — end of session, or stiff-legged DL / good morning', l2:'75–85 kg — end of session, or stiff-legged DL / good morning'}, // [JUDGMENT] sets/reps + load — Block 1 ran RDL 75–90 kg × 6; held there, not raised, because it is last in the session
      {id:'split_jerk',          sets:2,     reps:'3',    l1:'Empty bar',                                l2:'Empty bar'},                               // [JUDGMENT] sets — recurring daily skill note
    ],
  },
  10: {
    d1: [
      {id:'snatch_from_floor',           sets:5, reps:'1–3', l1:'41–44 kg', l2:'41–44 kg'},  // [JUDGMENT] sets AND reps — no rep count in the source or the corpus; 3 is the athlete's own practice
      {id:'snpp_ohs_complex',            sets:5, reps:'5+3', l1:'50 kg — add weekly, feel', l2:'50 kg — add weekly, feel'},  // [JUDGMENT] sets AND reps — no rep count in the source or the corpus; 3 is the athlete's own practice — source says "4–6 sets"; Ph1 per [E31.8]
      {id:'snatch_pull',                 sets:5, reps:'3', l1:'56.5–63 kg', l2:'56.5–63 kg'},
      {id:'hang_snatch_pull',            sets:4, reps:'3', l1:'63–94.5 kg — 100–150% snatch TM, from the hang or blocks', l2:'63–94.5 kg — 100–150% snatch TM, from the hang or blocks'},  // [JUDGMENT] sets/reps + load band cited: [E17.8] permits hang or block pulls at 100–150% through week 12, while FLOOR pulls stay 90–100% because Block 2 is rebuilding the floor position. This is where real pulling stimulus belongs for an athlete whose pull (clean pull 120 kg) far outruns the snatch it is a percentage of — Everett, "a 100% for others is clearly very light and not even adequate stimulus". Drops out from week 13.  // [JUDGMENT] sets AND reps — no rep count in the source or the corpus; 3 is the athlete's own practice AND reps — the source states NO rep count for this pull, only the load band; the corpus gives none either (checked 4 ways + the citation manifest). 3 is the athlete's own practice (profile: clean pull 120×3, snatch high pull 92×4). "finish fast" 53.5–56.5 kg tier omitted
      {id:'back_squat',                  sets:'3–5', reps:'3–5', l1:'84.5–91 kg', l2:'84.5–91 kg'},  // fully stated, no judgment
      {id:'trunk_static_strength',       sets:3, reps:'varies', l1:'Bodyweight', l2:'Bodyweight'},  // [JUDGMENT] sets AND reps — no rep count in the source or the corpus; 3 is the athlete's own practice — athlete's choice
      {id:'split_jerk',                  sets:2, reps:'3', l1:'Empty bar', l2:'Empty bar'},  // [JUDGMENT] sets AND reps — no rep count in the source or the corpus; 3 is the athlete's own practice — recurring daily skill note [E14.4]
    ],
    d2: [
      {id:'snatch_balance',              sets:3, reps:'2', l1:'40–50 kg — 5-sec hold in the bottom', l2:'40–50 kg — 5-sec hold in the bottom'},  // Opener slot "power snatch or snatch balance" [E8.1]; 5-sec bottom hold [E11.3]. [JUDGMENT] sets, reps + load — no dose in the source; under the 55 kg×3 PR because of the hold
      {id:'clean_front_squat_floor',     sets:5, reps:'1–3', l1:'47–50.5 kg', l2:'47–50.5 kg'},  // [JUDGMENT] sets AND reps — no rep count in the source or the corpus; 3 is the athlete's own practice
      {id:'split_jerk_from_rack',        sets:5, reps:'varies', l1:'30–35 kg — split-position reps, not the % day', l2:'30–35 kg — split-position reps, not the % day'},  // [JUDGMENT] sets AND reps — no rep count in the source or the corpus; 3 is the athlete's own practice + load — source prescribes NO % here on purpose (Thu is the % day); 40–50% C&J TM as position-rep work
      {id:'clean_pull',                  sets:5, reps:'3', l1:'65–72 kg', l2:'65–72 kg'},  // [JUDGMENT] sets AND reps — no rep count in the source or the corpus; 3 is the athlete's own practice
      {id:'front_squat',                 sets:'3–5', reps:'3–5', l1:'75–80.5 kg', l2:'75–80.5 kg'},  // fully stated, no judgment
      {id:'bodybuilding_core_block',     sets:1, reps:"athlete's choice", l1:'Short time-capped block', l2:'Short time-capped block'},  // [JUDGMENT] sets AND reps — no rep count in the source or the corpus; 3 is the athlete's own practice — athlete selects exercises. No digit in this load string on purpose
      {id:'split_jerk',                  sets:2, reps:'3', l1:'Empty bar', l2:'Empty bar'},  // [JUDGMENT] sets AND reps — no rep count in the source or the corpus; 3 is the athlete's own practice — recurring daily skill note [E14.4]
    ],
    d3: [
      {id:'split_jerk_from_rack',        sets:5, reps:'1–3', l1:'43–50.5 kg', l2:'43–50.5 kg'},  // [JUDGMENT] sets AND reps — no rep count in the source or the corpus; 3 is the athlete's own practice — this week's percentaged jerk day
      {id:'snatch_opener',               sets:2, reps:'3', l1:'25–30 kg — pattern only', l2:'25–30 kg — pattern only'},  // [JUDGMENT] sets AND reps — no rep count in the source or the corpus; 3 is the athlete's own practice/reps + load — 40–50% snatch TM
      {id:'floating_snatch',             sets:3, reps:'2', l1:'32.5–37.5 kg — pause just off the floor', l2:'32.5–37.5 kg — pause just off the floor'},  // [JUDGMENT] sets AND reps — no rep count in the source or the corpus; 3 is the athlete's own practice + load — 50–60% snatch TM; a floor variant, and the floor is the weak link
      {id:'hang_snatch',                 sets:'3–4', reps:'2', l1:'25–30 kg — speed kept', l2:'25–30 kg — speed kept'},  // sets stated (3–4×2); [JUDGMENT] load — [E8.8] demotes the hang to support
      {id:'power_jerk',                  sets:3, reps:'2', l1:'43–50 kg — 60–70% C&J TM', l2:'43–50 kg — 60–70% C&J TM'},  // [JUDGMENT] sets AND reps — no rep count in the source or the corpus; 3 is the athlete's own practice + load — retained 2×/wk
      {id:'jerk_dip_drive',              sets:3, reps:'3', l1:'65–72 kg — 90–100% C&J TM, partial ROM', l2:'65–72 kg — 90–100% C&J TM, partial ROM'},  // [JUDGMENT] sets AND reps — no rep count in the source or the corpus; 3 is the athlete's own practice + load — partial ROM, so it can carry C&J-TM weight
      {id:'push_press',                  sets:3, reps:'3', l1:'40–45 kg — 60–70% push-press TM, add weight weekly only while it stays fast', l2:'40–45 kg — 60–70% push-press TM, add weight weekly only while it stays fast'},  // [JUDGMENT] sets AND reps — no rep count in the source or the corpus; 3 is the athlete's own practice + load — 60–70% of the 65 kg push-press TM; speed, not the number, is the cap
      {id:'trunk_stiffness_dip',         sets:3, reps:'varies', l1:'Bodyweight', l2:'Bodyweight'},  // [JUDGMENT] sets AND reps — no rep count in the source or the corpus; 3 is the athlete's own practice
      {id:'split_jerk',                  sets:2, reps:'3', l1:'Empty bar', l2:'Empty bar'},  // [JUDGMENT] sets AND reps — no rep count in the source or the corpus; 3 is the athlete's own practice — recurring daily skill note [E14.4]
    ],
    d4: [
      {id:'back_squat',                  sets:'4–5', reps:'5', l1:'84.5–91 kg', l2:'84.5–91 kg'},  // fully stated ("4–5×5"), no judgment
      {id:'three_position_snatch',       sets:3, reps:'3 positions', l1:'32.5–37.5 kg — limited by the floor position', l2:'32.5–37.5 kg — limited by the floor position'},  // [JUDGMENT] sets AND reps — no rep count in the source or the corpus; 3 is the athlete's own practice + load — 50–60% snatch TM, set by the hardest of the three
      {id:'pause_snatch',                sets:3, reps:'1', l1:'38–44 kg snatch / 43–50 kg clean', l2:'38–44 kg snatch / 43–50 kg clean'},  // [JUDGMENT] sets AND reps — no rep count in the source or the corpus; 3 is the athlete's own practice + load — 60–70% of the respective TM; athlete picks the lift
      {id:'belt_squat',                  sets:3, reps:'8–10', l1:'70–80 kg — slow tempo, or single-leg squat', l2:'70–80 kg — slow tempo, or single-leg squat'},  // [JUDGMENT] sets AND reps — no rep count in the source or the corpus; 3 is the athlete's own practice/reps + load — carried from Block 1's belt squat
      {id:'pull_drill',                  sets:1, reps:'3–5', l1:'25–30 kg — power position → lowest good hang', l2:'25–30 kg — power position → lowest good hang'},  // [JUDGMENT] sets AND reps — no rep count in the source or the corpus; 3 is the athlete's own practice + load — a drill, not a lift; 40–50% snatch TM
      {id:'rdl',                         sets:3, reps:'6–8', l1:'75–85 kg — end of session, or stiff-legged DL / good morning', l2:'75–85 kg — end of session, or stiff-legged DL / good morning'},  // [JUDGMENT] sets AND reps — no rep count in the source or the corpus; 3 is the athlete's own practice/reps + load — last in the session, so held at Block 1's number [E24.1]
      {id:'split_jerk',                  sets:2, reps:'3', l1:'Empty bar', l2:'Empty bar'},  // [JUDGMENT] sets AND reps — no rep count in the source or the corpus; 3 is the athlete's own practice — recurring daily skill note [E14.4]
    ],
  },
  11: {
    d1: [
      {id:'snatch_from_floor',           sets:'4–5', reps:'3', l1:'44–50.5 kg', l2:'44–50.5 kg'},  // fully stated in the source
      {id:'snpp_ohs_complex',            sets:5, reps:'3+2', l1:'50 kg — add weekly, feel', l2:'50 kg — add weekly, feel'},  // [JUDGMENT] sets AND reps — no rep count in the source or the corpus; 3 is the athlete's own practice — source says "4–6 sets"; Ph2 per [E31.8]
      {id:'snatch_pull',                 sets:5, reps:'3', l1:'56.5–63 kg', l2:'56.5–63 kg'},
      {id:'hang_snatch_pull',            sets:4, reps:'3', l1:'63–94.5 kg — 100–150% snatch TM, from the hang or blocks', l2:'63–94.5 kg — 100–150% snatch TM, from the hang or blocks'},  // [JUDGMENT] sets/reps + load band cited: [E17.8] permits hang or block pulls at 100–150% through week 12, while FLOOR pulls stay 90–100% because Block 2 is rebuilding the floor position. This is where real pulling stimulus belongs for an athlete whose pull (clean pull 120 kg) far outruns the snatch it is a percentage of — Everett, "a 100% for others is clearly very light and not even adequate stimulus". Drops out from week 13.  // [JUDGMENT] sets AND reps — no rep count in the source or the corpus; 3 is the athlete's own practice AND reps — the source states NO rep count for this pull, only the load band; the corpus gives none either (checked 4 ways + the citation manifest). 3 is the athlete's own practice (profile: clean pull 120×3, snatch high pull 92×4). "finish fast" 53.5–56.5 kg tier omitted
      {id:'back_squat',                  sets:'3–5', reps:'3–5', l1:'84.5–91 kg', l2:'84.5–91 kg'},  // fully stated, no judgment
      {id:'trunk_static_strength',       sets:3, reps:'varies', l1:'Bodyweight', l2:'Bodyweight'},  // [JUDGMENT] sets AND reps — no rep count in the source or the corpus; 3 is the athlete's own practice — athlete's choice
      {id:'split_jerk',                  sets:2, reps:'3', l1:'Empty bar', l2:'Empty bar'},  // [JUDGMENT] sets AND reps — no rep count in the source or the corpus; 3 is the athlete's own practice — recurring daily skill note [E14.4]
    ],
    d2: [
      {id:'snatch_balance',              sets:3, reps:'2', l1:'40–50 kg — 5-sec hold in the bottom', l2:'40–50 kg — 5-sec hold in the bottom'},  // Opener slot "power snatch or snatch balance" [E8.1]; 5-sec bottom hold [E11.3]. [JUDGMENT] sets, reps + load — no dose in the source; under the 55 kg×3 PR because of the hold
      {id:'clean_front_squat_floor',     sets:'4–5', reps:'3', l1:'50.5–57.5 kg', l2:'50.5–57.5 kg'},  // fully stated in the source
      {id:'split_jerk_from_rack',        sets:5, reps:'varies', l1:'30–35 kg — split-position reps, not the % day', l2:'30–35 kg — split-position reps, not the % day'},  // [JUDGMENT] sets AND reps — no rep count in the source or the corpus; 3 is the athlete's own practice + load — source prescribes NO % here on purpose (Thu is the % day); 40–50% C&J TM as position-rep work
      {id:'clean_pull',                  sets:5, reps:'3', l1:'65–72 kg', l2:'65–72 kg'},  // [JUDGMENT] sets AND reps — no rep count in the source or the corpus; 3 is the athlete's own practice
      {id:'front_squat',                 sets:'3–5', reps:'3–5', l1:'75–80.5 kg', l2:'75–80.5 kg'},  // fully stated, no judgment
      {id:'bodybuilding_core_block',     sets:1, reps:"athlete's choice", l1:'Short time-capped block', l2:'Short time-capped block'},  // [JUDGMENT] sets AND reps — no rep count in the source or the corpus; 3 is the athlete's own practice — athlete selects exercises. No digit in this load string on purpose
      {id:'split_jerk',                  sets:2, reps:'3', l1:'Empty bar', l2:'Empty bar'},  // [JUDGMENT] sets AND reps — no rep count in the source or the corpus; 3 is the athlete's own practice — recurring daily skill note [E14.4]
    ],
    d3: [
      {id:'split_jerk_from_rack',        sets:'4–5', reps:'3', l1:'50.5–54 kg', l2:'50.5–54 kg'},  // fully stated — this week's percentaged jerk day
      {id:'snatch_opener',               sets:2, reps:'3', l1:'25–30 kg — pattern only', l2:'25–30 kg — pattern only'},  // [JUDGMENT] sets AND reps — no rep count in the source or the corpus; 3 is the athlete's own practice/reps + load — 40–50% snatch TM
      {id:'floating_snatch',             sets:3, reps:'2', l1:'32.5–37.5 kg — pause just off the floor', l2:'32.5–37.5 kg — pause just off the floor'},  // [JUDGMENT] sets AND reps — no rep count in the source or the corpus; 3 is the athlete's own practice + load — 50–60% snatch TM; a floor variant, and the floor is the weak link
      {id:'hang_snatch',                 sets:'3–4', reps:'2', l1:'25–30 kg — speed kept', l2:'25–30 kg — speed kept'},  // sets stated (3–4×2); [JUDGMENT] load — [E8.8] demotes the hang to support
      {id:'power_jerk',                  sets:3, reps:'2', l1:'43–50 kg — 60–70% C&J TM', l2:'43–50 kg — 60–70% C&J TM'},  // [JUDGMENT] sets AND reps — no rep count in the source or the corpus; 3 is the athlete's own practice + load — retained 2×/wk
      {id:'jerk_dip_drive',              sets:3, reps:'3', l1:'65–72 kg — 90–100% C&J TM, partial ROM', l2:'65–72 kg — 90–100% C&J TM, partial ROM'},  // [JUDGMENT] sets AND reps — no rep count in the source or the corpus; 3 is the athlete's own practice + load — partial ROM, so it can carry C&J-TM weight
      {id:'push_press',                  sets:3, reps:'3', l1:'40–45 kg — 60–70% push-press TM, add weight weekly only while it stays fast', l2:'40–45 kg — 60–70% push-press TM, add weight weekly only while it stays fast'},  // [JUDGMENT] sets AND reps — no rep count in the source or the corpus; 3 is the athlete's own practice + load — 60–70% of the 65 kg push-press TM; speed, not the number, is the cap
      {id:'trunk_stiffness_dip',         sets:3, reps:'varies', l1:'Bodyweight', l2:'Bodyweight'},  // [JUDGMENT] sets AND reps — no rep count in the source or the corpus; 3 is the athlete's own practice
      {id:'split_jerk',                  sets:2, reps:'3', l1:'Empty bar', l2:'Empty bar'},  // [JUDGMENT] sets AND reps — no rep count in the source or the corpus; 3 is the athlete's own practice — recurring daily skill note [E14.4]
    ],
    d4: [
      {id:'back_squat',                  sets:'4–5', reps:'4', l1:'84.5–91 kg', l2:'84.5–91 kg'},  // fully stated ("4–5×4"), no judgment
      {id:'three_position_snatch',       sets:3, reps:'3 positions', l1:'32.5–37.5 kg — limited by the floor position', l2:'32.5–37.5 kg — limited by the floor position'},  // [JUDGMENT] sets AND reps — no rep count in the source or the corpus; 3 is the athlete's own practice + load — 50–60% snatch TM, set by the hardest of the three
      {id:'pause_snatch',                sets:3, reps:'1', l1:'38–44 kg snatch / 43–50 kg clean', l2:'38–44 kg snatch / 43–50 kg clean'},  // [JUDGMENT] sets AND reps — no rep count in the source or the corpus; 3 is the athlete's own practice + load — 60–70% of the respective TM; athlete picks the lift
      {id:'belt_squat',                  sets:3, reps:'8–10', l1:'70–80 kg — slow tempo, or single-leg squat', l2:'70–80 kg — slow tempo, or single-leg squat'},  // [JUDGMENT] sets AND reps — no rep count in the source or the corpus; 3 is the athlete's own practice/reps + load — carried from Block 1's belt squat
      {id:'pull_drill',                  sets:1, reps:'3–5', l1:'25–30 kg — power position → lowest good hang', l2:'25–30 kg — power position → lowest good hang'},  // [JUDGMENT] sets AND reps — no rep count in the source or the corpus; 3 is the athlete's own practice + load — a drill, not a lift; 40–50% snatch TM
      {id:'rdl',                         sets:3, reps:'6–8', l1:'75–85 kg — end of session, or stiff-legged DL / good morning', l2:'75–85 kg — end of session, or stiff-legged DL / good morning'},  // [JUDGMENT] sets AND reps — no rep count in the source or the corpus; 3 is the athlete's own practice/reps + load — last in the session, so held at Block 1's number [E24.1]
      {id:'split_jerk',                  sets:2, reps:'3', l1:'Empty bar', l2:'Empty bar'},  // [JUDGMENT] sets AND reps — no rep count in the source or the corpus; 3 is the athlete's own practice — recurring daily skill note [E14.4]
    ],
  },
  12: {
    d1: [
      {id:'snatch_from_floor',           sets:'4–5', reps:'3', l1:'44–50.5 kg', l2:'44–50.5 kg'},  // fully stated in the source
      {id:'snpp_ohs_complex',            sets:5, reps:'3+2', l1:'50 kg — add weekly, feel', l2:'50 kg — add weekly, feel'},  // [JUDGMENT] sets AND reps — no rep count in the source or the corpus; 3 is the athlete's own practice — source says "4–6 sets"; Ph2 per [E31.8]
      {id:'snatch_pull',                 sets:5, reps:'3', l1:'56.5–63 kg', l2:'56.5–63 kg'},
      {id:'hang_snatch_pull',            sets:4, reps:'3', l1:'63–94.5 kg — 100–150% snatch TM, from the hang or blocks', l2:'63–94.5 kg — 100–150% snatch TM, from the hang or blocks'},  // [JUDGMENT] sets/reps + load band cited: [E17.8] permits hang or block pulls at 100–150% through week 12, while FLOOR pulls stay 90–100% because Block 2 is rebuilding the floor position. This is where real pulling stimulus belongs for an athlete whose pull (clean pull 120 kg) far outruns the snatch it is a percentage of — Everett, "a 100% for others is clearly very light and not even adequate stimulus". Drops out from week 13.  // [JUDGMENT] sets AND reps — no rep count in the source or the corpus; 3 is the athlete's own practice AND reps — the source states NO rep count for this pull, only the load band; the corpus gives none either (checked 4 ways + the citation manifest). 3 is the athlete's own practice (profile: clean pull 120×3, snatch high pull 92×4). "finish fast" 53.5–56.5 kg tier omitted
      {id:'back_squat',                  sets:'3–5', reps:'3–5', l1:'84.5–91 kg', l2:'84.5–91 kg'},  // fully stated, no judgment
      {id:'trunk_static_strength',       sets:3, reps:'varies', l1:'Bodyweight', l2:'Bodyweight'},  // [JUDGMENT] sets AND reps — no rep count in the source or the corpus; 3 is the athlete's own practice — athlete's choice
      {id:'split_jerk',                  sets:2, reps:'3', l1:'Empty bar', l2:'Empty bar'},  // [JUDGMENT] sets AND reps — no rep count in the source or the corpus; 3 is the athlete's own practice — recurring daily skill note [E14.4]
    ],
    d2: [
      {id:'snatch_balance',              sets:3, reps:'2', l1:'40–50 kg — 5-sec hold in the bottom', l2:'40–50 kg — 5-sec hold in the bottom'},  // Opener slot "power snatch or snatch balance" [E8.1]; 5-sec bottom hold [E11.3]. [JUDGMENT] sets, reps + load — no dose in the source; under the 55 kg×3 PR because of the hold
      {id:'clean_front_squat_floor',     sets:'4–5', reps:'3', l1:'50.5–57.5 kg', l2:'50.5–57.5 kg'},  // fully stated in the source
      {id:'split_jerk_from_rack',        sets:5, reps:'varies', l1:'30–35 kg — split-position reps, not the % day', l2:'30–35 kg — split-position reps, not the % day'},  // [JUDGMENT] sets AND reps — no rep count in the source or the corpus; 3 is the athlete's own practice + load — source prescribes NO % here on purpose (Thu is the % day); 40–50% C&J TM as position-rep work
      {id:'clean_pull',                  sets:5, reps:'3', l1:'65–72 kg', l2:'65–72 kg'},  // [JUDGMENT] sets AND reps — no rep count in the source or the corpus; 3 is the athlete's own practice
      {id:'front_squat',                 sets:'3–5', reps:'3–5', l1:'75–80.5 kg', l2:'75–80.5 kg'},  // fully stated, no judgment
      {id:'bodybuilding_core_block',     sets:1, reps:"athlete's choice", l1:'Short time-capped block', l2:'Short time-capped block'},  // [JUDGMENT] sets AND reps — no rep count in the source or the corpus; 3 is the athlete's own practice — athlete selects exercises. No digit in this load string on purpose
      {id:'split_jerk',                  sets:2, reps:'3', l1:'Empty bar', l2:'Empty bar'},  // [JUDGMENT] sets AND reps — no rep count in the source or the corpus; 3 is the athlete's own practice — recurring daily skill note [E14.4]
    ],
    d3: [
      {id:'split_jerk_from_rack',        sets:'4–5', reps:'3', l1:'50.5–57.5 kg', l2:'50.5–57.5 kg'},  // fully stated — this week's percentaged jerk day
      {id:'snatch_opener',               sets:2, reps:'3', l1:'25–30 kg — pattern only', l2:'25–30 kg — pattern only'},  // [JUDGMENT] sets AND reps — no rep count in the source or the corpus; 3 is the athlete's own practice/reps + load — 40–50% snatch TM
      {id:'floating_snatch',             sets:3, reps:'2', l1:'32.5–37.5 kg — pause just off the floor', l2:'32.5–37.5 kg — pause just off the floor'},  // [JUDGMENT] sets AND reps — no rep count in the source or the corpus; 3 is the athlete's own practice + load — 50–60% snatch TM; a floor variant, and the floor is the weak link
      {id:'hang_snatch',                 sets:'3–4', reps:'2', l1:'25–30 kg — speed kept', l2:'25–30 kg — speed kept'},  // sets stated (3–4×2); [JUDGMENT] load — [E8.8] demotes the hang to support
      {id:'power_jerk',                  sets:3, reps:'2', l1:'43–50 kg — 60–70% C&J TM', l2:'43–50 kg — 60–70% C&J TM'},  // [JUDGMENT] sets AND reps — no rep count in the source or the corpus; 3 is the athlete's own practice + load — retained 2×/wk
      {id:'jerk_dip_drive',              sets:3, reps:'3', l1:'65–72 kg — 90–100% C&J TM, partial ROM', l2:'65–72 kg — 90–100% C&J TM, partial ROM'},  // [JUDGMENT] sets AND reps — no rep count in the source or the corpus; 3 is the athlete's own practice + load — partial ROM, so it can carry C&J-TM weight
      {id:'push_press',                  sets:3, reps:'3', l1:'40–45 kg — 60–70% push-press TM, add weight weekly only while it stays fast', l2:'40–45 kg — 60–70% push-press TM, add weight weekly only while it stays fast'},  // [JUDGMENT] sets AND reps — no rep count in the source or the corpus; 3 is the athlete's own practice + load — 60–70% of the 65 kg push-press TM; speed, not the number, is the cap
      {id:'trunk_stiffness_dip',         sets:3, reps:'varies', l1:'Bodyweight', l2:'Bodyweight'},  // [JUDGMENT] sets AND reps — no rep count in the source or the corpus; 3 is the athlete's own practice
      {id:'split_jerk',                  sets:2, reps:'3', l1:'Empty bar', l2:'Empty bar'},  // [JUDGMENT] sets AND reps — no rep count in the source or the corpus; 3 is the athlete's own practice — recurring daily skill note [E14.4]
    ],
    d4: [
      {id:'back_squat',                  sets:'4–5', reps:'4', l1:'84.5–91 kg', l2:'84.5–91 kg'},  // fully stated ("4–5×4"), no judgment
      {id:'three_position_snatch',       sets:3, reps:'3 positions', l1:'32.5–37.5 kg — limited by the floor position', l2:'32.5–37.5 kg — limited by the floor position'},  // [JUDGMENT] sets AND reps — no rep count in the source or the corpus; 3 is the athlete's own practice + load — 50–60% snatch TM, set by the hardest of the three
      {id:'pause_snatch',                sets:3, reps:'1', l1:'38–44 kg snatch / 43–50 kg clean', l2:'38–44 kg snatch / 43–50 kg clean'},  // [JUDGMENT] sets AND reps — no rep count in the source or the corpus; 3 is the athlete's own practice + load — 60–70% of the respective TM; athlete picks the lift
      {id:'belt_squat',                  sets:3, reps:'8–10', l1:'70–80 kg — slow tempo, or single-leg squat', l2:'70–80 kg — slow tempo, or single-leg squat'},  // [JUDGMENT] sets AND reps — no rep count in the source or the corpus; 3 is the athlete's own practice/reps + load — carried from Block 1's belt squat
      {id:'pull_drill',                  sets:1, reps:'3–5', l1:'25–30 kg — power position → lowest good hang', l2:'25–30 kg — power position → lowest good hang'},  // [JUDGMENT] sets AND reps — no rep count in the source or the corpus; 3 is the athlete's own practice + load — a drill, not a lift; 40–50% snatch TM
      {id:'rdl',                         sets:3, reps:'6–8', l1:'75–85 kg — end of session, or stiff-legged DL / good morning', l2:'75–85 kg — end of session, or stiff-legged DL / good morning'},  // [JUDGMENT] sets AND reps — no rep count in the source or the corpus; 3 is the athlete's own practice/reps + load — last in the session, so held at Block 1's number [E24.1]
      {id:'split_jerk',                  sets:2, reps:'3', l1:'Empty bar', l2:'Empty bar'},  // [JUDGMENT] sets AND reps — no rep count in the source or the corpus; 3 is the athlete's own practice — recurring daily skill note [E14.4]
    ],
  },
  13: {
    d1: [
      {id:'snatch_from_floor',           sets:'2–4', reps:'1–3', l1:'50.5–53.5 kg', l2:'50.5–53.5 kg'},  // fully stated in the source
      {id:'overhead_squat',              sets:4, reps:'3', l1:'50 kg — add weekly, feel', l2:'50 kg — add weekly, feel'},  // [JUDGMENT] sets AND reps — no rep count in the source or the corpus; 3 is the athlete's own practice — source prints "OHS 3" separately at Ph3
      {id:'snatch_push_press',           sets:4, reps:'5', l1:'50 kg — add weekly, feel', l2:'50 kg — add weekly, feel'},  // [JUDGMENT] sets AND reps — no rep count in the source or the corpus; 3 is the athlete's own practice — source prints "SnPP 5 (Ph3)", 4–6 sets
      {id:'snatch_pull',                 sets:5, reps:'3', l1:'56.5–63 kg', l2:'56.5–63 kg'},  // [JUDGMENT] sets AND reps — no rep count in the source or the corpus; 3 is the athlete's own practice AND reps — the source states NO rep count for this pull, only the load band; the corpus gives none either (checked 4 ways + the citation manifest). 3 is the athlete's own practice (profile: clean pull 120×3, snatch high pull 92×4). "finish fast" 53.5–56.5 kg tier omitted
      {id:'back_squat',                  sets:'4–6', reps:'1', l1:'116.5–126 kg — heaviest clean single for today, stop at the first grind', l2:'116.5–126 kg — heaviest clean single for today, stop at the first grind'},  // athlete decision 2026-10-01: singles to the heaviest-for-today, Pavlukhin (VXxjdOLPIVE, 72T14fCWVrs); [JUDGMENT] 85–92% TM — no percentage in the source; sets = climbing singles, as Block 1's D1
      {id:'trunk_static_strength',       sets:3, reps:'varies', l1:'Bodyweight', l2:'Bodyweight'},  // [JUDGMENT] sets AND reps — no rep count in the source or the corpus; 3 is the athlete's own practice — athlete's choice
      {id:'split_jerk',                  sets:2, reps:'3', l1:'Empty bar', l2:'Empty bar'},  // [JUDGMENT] sets AND reps — no rep count in the source or the corpus; 3 is the athlete's own practice — recurring daily skill note [E14.4]
    ],
    d2: [
      {id:'snatch_balance',              sets:3, reps:'2', l1:'40–50 kg — 5-sec hold in the bottom', l2:'40–50 kg — 5-sec hold in the bottom'},  // Opener slot "power snatch or snatch balance" [E8.1]; 5-sec bottom hold [E11.3]. [JUDGMENT] sets, reps + load — no dose in the source; under the 55 kg×3 PR because of the hold
      {id:'clean_front_squat_floor',     sets:'2–4', reps:'1–3', l1:'57.5–61 kg', l2:'57.5–61 kg'},  // fully stated in the source
      {id:'split_jerk_from_rack',        sets:5, reps:'varies', l1:'30–35 kg — split-position reps, not the % day', l2:'30–35 kg — split-position reps, not the % day'},  // [JUDGMENT] sets AND reps — no rep count in the source or the corpus; 3 is the athlete's own practice + load — source prescribes NO % here on purpose (Thu is the % day); 40–50% C&J TM as position-rep work
      {id:'clean_pull',                  sets:5, reps:'3', l1:'65–72 kg', l2:'65–72 kg'},  // [JUDGMENT] sets AND reps — no rep count in the source or the corpus; 3 is the athlete's own practice
      {id:'front_squat',                 sets:'3–5', reps:'3–5', l1:'75–80.5 kg', l2:'75–80.5 kg'},  // fully stated, no judgment
      {id:'bodybuilding_core_block',     sets:1, reps:"athlete's choice", l1:'Short time-capped block', l2:'Short time-capped block'},  // [JUDGMENT] sets AND reps — no rep count in the source or the corpus; 3 is the athlete's own practice — athlete selects exercises. No digit in this load string on purpose
      {id:'split_jerk',                  sets:2, reps:'3', l1:'Empty bar', l2:'Empty bar'},  // [JUDGMENT] sets AND reps — no rep count in the source or the corpus; 3 is the athlete's own practice — recurring daily skill note [E14.4]
    ],
    d3: [
      {id:'split_jerk_from_rack',        sets:'4–5', reps:'3', l1:'50.5–57.5 kg', l2:'50.5–57.5 kg'},  // fully stated — this week's percentaged jerk day
      {id:'snatch_opener',               sets:2, reps:'3', l1:'25–30 kg — pattern only', l2:'25–30 kg — pattern only'},  // [JUDGMENT] sets AND reps — no rep count in the source or the corpus; 3 is the athlete's own practice/reps + load — 40–50% snatch TM
      {id:'floating_snatch',             sets:3, reps:'2', l1:'32.5–37.5 kg — pause just off the floor', l2:'32.5–37.5 kg — pause just off the floor'},  // [JUDGMENT] sets AND reps — no rep count in the source or the corpus; 3 is the athlete's own practice + load — 50–60% snatch TM; a floor variant, and the floor is the weak link
      {id:'hang_snatch',                 sets:'3–4', reps:'2', l1:'25–30 kg — speed kept', l2:'25–30 kg — speed kept'},  // sets stated (3–4×2); [JUDGMENT] load — [E8.8] demotes the hang to support
      {id:'power_jerk',                  sets:3, reps:'2', l1:'43–50 kg — 60–70% C&J TM', l2:'43–50 kg — 60–70% C&J TM'},  // [JUDGMENT] sets AND reps — no rep count in the source or the corpus; 3 is the athlete's own practice + load — retained 2×/wk
      {id:'jerk_dip_drive',              sets:3, reps:'3', l1:'65–72 kg — 90–100% C&J TM, partial ROM', l2:'65–72 kg — 90–100% C&J TM, partial ROM'},  // [JUDGMENT] sets AND reps — no rep count in the source or the corpus; 3 is the athlete's own practice + load — partial ROM, so it can carry C&J-TM weight
      {id:'push_press',                  sets:3, reps:'3', l1:'40–45 kg — 60–70% push-press TM, add weight weekly only while it stays fast', l2:'40–45 kg — 60–70% push-press TM, add weight weekly only while it stays fast'},  // [JUDGMENT] sets AND reps — no rep count in the source or the corpus; 3 is the athlete's own practice + load — 60–70% of the 65 kg push-press TM; speed, not the number, is the cap
      {id:'trunk_stiffness_dip',         sets:3, reps:'varies', l1:'Bodyweight', l2:'Bodyweight'},  // [JUDGMENT] sets AND reps — no rep count in the source or the corpus; 3 is the athlete's own practice
      {id:'split_jerk',                  sets:2, reps:'3', l1:'Empty bar', l2:'Empty bar'},  // [JUDGMENT] sets AND reps — no rep count in the source or the corpus; 3 is the athlete's own practice — recurring daily skill note [E14.4]
    ],
    d4: [
      {id:'back_squat',                  sets:'3–5', reps:'3', l1:'96–109.5 kg — medium, no singles', l2:'96–109.5 kg — medium, no singles'},  // athlete decision 2026-10-01: Saturday stays medium, Berestov ('you don't need to squat heavy every time', Syrm-wWrN8w); [JUDGMENT] 70–80% TM
      {id:'three_position_snatch',       sets:3, reps:'3 positions', l1:'32.5–37.5 kg — limited by the floor position', l2:'32.5–37.5 kg — limited by the floor position'},  // [JUDGMENT] sets AND reps — no rep count in the source or the corpus; 3 is the athlete's own practice + load — 50–60% snatch TM, set by the hardest of the three
      {id:'pause_snatch',                sets:3, reps:'1', l1:'38–44 kg snatch / 43–50 kg clean', l2:'38–44 kg snatch / 43–50 kg clean'},  // [JUDGMENT] sets AND reps — no rep count in the source or the corpus; 3 is the athlete's own practice + load — 60–70% of the respective TM; athlete picks the lift
      {id:'belt_squat',                  sets:3, reps:'8–10', l1:'70–80 kg — slow tempo, or single-leg squat', l2:'70–80 kg — slow tempo, or single-leg squat'},  // [JUDGMENT] sets AND reps — no rep count in the source or the corpus; 3 is the athlete's own practice/reps + load — carried from Block 1's belt squat
      {id:'pull_drill',                  sets:1, reps:'3–5', l1:'25–30 kg — power position → lowest good hang', l2:'25–30 kg — power position → lowest good hang'},  // [JUDGMENT] sets AND reps — no rep count in the source or the corpus; 3 is the athlete's own practice + load — a drill, not a lift; 40–50% snatch TM
      {id:'rdl',                         sets:3, reps:'6–8', l1:'75–85 kg — end of session, or stiff-legged DL / good morning', l2:'75–85 kg — end of session, or stiff-legged DL / good morning'},  // [JUDGMENT] sets AND reps — no rep count in the source or the corpus; 3 is the athlete's own practice/reps + load — last in the session, so held at Block 1's number [E24.1]
      {id:'split_jerk',                  sets:2, reps:'3', l1:'Empty bar', l2:'Empty bar'},  // [JUDGMENT] sets AND reps — no rep count in the source or the corpus; 3 is the athlete's own practice — recurring daily skill note [E14.4]
    ],
  },
  14: {
    d1: [
      {id:'snatch_from_floor',           sets:4, reps:'2 → 1', l1:'50.5–53.5 kg', l2:'50.5–53.5 kg'},  // [JUDGMENT] sets AND reps — no rep count in the source or the corpus; 3 is the athlete's own practice
      {id:'overhead_squat',              sets:4, reps:'3', l1:'50 kg — add weekly, feel', l2:'50 kg — add weekly, feel'},  // [JUDGMENT] sets AND reps — no rep count in the source or the corpus; 3 is the athlete's own practice — source prints "OHS 3" separately at Ph3
      {id:'snatch_push_press',           sets:4, reps:'5', l1:'50 kg — add weekly, feel', l2:'50 kg — add weekly, feel'},  // [JUDGMENT] sets AND reps — no rep count in the source or the corpus; 3 is the athlete's own practice — source prints "SnPP 5 (Ph3)", 4–6 sets
      {id:'snatch_pull',                 sets:5, reps:'3', l1:'56.5–63 kg', l2:'56.5–63 kg'},  // [JUDGMENT] sets AND reps — no rep count in the source or the corpus; 3 is the athlete's own practice AND reps — the source states NO rep count for this pull, only the load band; the corpus gives none either (checked 4 ways + the citation manifest). 3 is the athlete's own practice (profile: clean pull 120×3, snatch high pull 92×4). "finish fast" 53.5–56.5 kg tier omitted
      {id:'back_squat',                  sets:'4–6', reps:'1', l1:'116.5–126 kg — heaviest clean single for today, stop at the first grind', l2:'116.5–126 kg — heaviest clean single for today, stop at the first grind'},  // athlete decision 2026-10-01: singles to the heaviest-for-today, Pavlukhin (VXxjdOLPIVE, 72T14fCWVrs); [JUDGMENT] 85–92% TM — no percentage in the source; sets = climbing singles, as Block 1's D1
      {id:'trunk_static_strength',       sets:3, reps:'varies', l1:'Bodyweight', l2:'Bodyweight'},  // [JUDGMENT] sets AND reps — no rep count in the source or the corpus; 3 is the athlete's own practice — athlete's choice, at maintenance this week
      {id:'split_jerk',                  sets:2, reps:'3', l1:'Empty bar', l2:'Empty bar'},  // [JUDGMENT] sets AND reps — no rep count in the source or the corpus; 3 is the athlete's own practice — recurring daily skill note [E14.4]
    ],
    d2: [
      {id:'snatch_balance',              sets:3, reps:'2', l1:'40–50 kg — 5-sec hold in the bottom', l2:'40–50 kg — 5-sec hold in the bottom'},  // Opener slot "power snatch or snatch balance" [E8.1]; 5-sec bottom hold [E11.3]. [JUDGMENT] sets, reps + load — no dose in the source; under the 55 kg×3 PR because of the hold
      {id:'clean_front_squat_floor',     sets:4, reps:'2 → 1', l1:'57.5–61 kg', l2:'57.5–61 kg'},  // [JUDGMENT] sets AND reps — no rep count in the source or the corpus; 3 is the athlete's own practice
      {id:'split_jerk_from_rack',        sets:5, reps:'varies', l1:'30–35 kg — split-position reps, not the % day', l2:'30–35 kg — split-position reps, not the % day'},  // [JUDGMENT] sets AND reps — no rep count in the source or the corpus; 3 is the athlete's own practice + load — source prescribes NO % here on purpose (Thu is the % day); 40–50% C&J TM as position-rep work
      {id:'clean_pull',                  sets:5, reps:'3', l1:'65–72 kg', l2:'65–72 kg'},  // [JUDGMENT] sets AND reps — no rep count in the source or the corpus; 3 is the athlete's own practice
      {id:'front_squat',                 sets:'3–5', reps:'3–5', l1:'75–80.5 kg', l2:'75–80.5 kg'},  // fully stated, no judgment
      {id:'bodybuilding_core_block',     sets:1, reps:"athlete's choice", l1:'Short time-capped block', l2:'Short time-capped block'},  // [JUDGMENT] sets AND reps — no rep count in the source or the corpus; 3 is the athlete's own practice — athlete selects exercises, at maintenance this week. No digit in this load string on purpose
      {id:'split_jerk',                  sets:2, reps:'3', l1:'Empty bar', l2:'Empty bar'},  // [JUDGMENT] sets AND reps — no rep count in the source or the corpus; 3 is the athlete's own practice — recurring daily skill note [E14.4]
    ],
    d3: [
      {id:'split_jerk_from_rack',        sets:'4–5', reps:'3', l1:'50.5–57.5 kg', l2:'50.5–57.5 kg'},  // [JUDGMENT] sets AND reps — no rep count in the source or the corpus; 3 is the athlete's own practice — this week's percentaged jerk day
      {id:'snatch_opener',               sets:2, reps:'3', l1:'25–30 kg — pattern only', l2:'25–30 kg — pattern only'},  // [JUDGMENT] sets AND reps — no rep count in the source or the corpus; 3 is the athlete's own practice/reps + load — 40–50% snatch TM
      {id:'floating_snatch',             sets:3, reps:'2', l1:'32.5–37.5 kg — pause just off the floor', l2:'32.5–37.5 kg — pause just off the floor'},  // [JUDGMENT] sets AND reps — no rep count in the source or the corpus; 3 is the athlete's own practice + load — 50–60% snatch TM; a floor variant, and the floor is the weak link
      {id:'hang_snatch',                 sets:'3–4', reps:'2', l1:'25–30 kg — speed kept', l2:'25–30 kg — speed kept'},  // sets stated (3–4×2); [JUDGMENT] load — [E8.8] demotes the hang to support
      {id:'power_jerk',                  sets:3, reps:'2', l1:'43–50 kg — 60–70% C&J TM', l2:'43–50 kg — 60–70% C&J TM'},  // [JUDGMENT] sets AND reps — no rep count in the source or the corpus; 3 is the athlete's own practice + load — retained 2×/wk
      {id:'jerk_dip_drive',              sets:3, reps:'3', l1:'65–72 kg — 90–100% C&J TM, partial ROM', l2:'65–72 kg — 90–100% C&J TM, partial ROM'},  // [JUDGMENT] sets AND reps — no rep count in the source or the corpus; 3 is the athlete's own practice + load — partial ROM, so it can carry C&J-TM weight
      {id:'push_press',                  sets:3, reps:'3', l1:'40–45 kg — 60–70% push-press TM, add weight weekly only while it stays fast', l2:'40–45 kg — 60–70% push-press TM, add weight weekly only while it stays fast'},  // [JUDGMENT] sets AND reps — no rep count in the source or the corpus; 3 is the athlete's own practice + load — 60–70% of the 65 kg push-press TM; speed, not the number, is the cap
      {id:'trunk_stiffness_dip',         sets:3, reps:'varies', l1:'Bodyweight', l2:'Bodyweight'},  // [JUDGMENT] sets AND reps — no rep count in the source or the corpus; 3 is the athlete's own practice, at maintenance this week
      {id:'split_jerk',                  sets:2, reps:'3', l1:'Empty bar', l2:'Empty bar'},  // [JUDGMENT] sets AND reps — no rep count in the source or the corpus; 3 is the athlete's own practice — recurring daily skill note [E14.4]
    ],
    d4: [
      {id:'back_squat',                  sets:'3–5', reps:'3', l1:'96–109.5 kg — medium, no singles', l2:'96–109.5 kg — medium, no singles'},  // athlete decision 2026-10-01: Saturday stays medium, Berestov ('you don't need to squat heavy every time', Syrm-wWrN8w); [JUDGMENT] 70–80% TM
      {id:'three_position_snatch',       sets:3, reps:'3 positions', l1:'32.5–37.5 kg — limited by the floor position', l2:'32.5–37.5 kg — limited by the floor position'},  // [JUDGMENT] sets AND reps — no rep count in the source or the corpus; 3 is the athlete's own practice + load — 50–60% snatch TM, set by the hardest of the three
      {id:'pause_snatch',                sets:3, reps:'1', l1:'38–44 kg snatch / 43–50 kg clean', l2:'38–44 kg snatch / 43–50 kg clean'},  // [JUDGMENT] sets AND reps — no rep count in the source or the corpus; 3 is the athlete's own practice + load — 60–70% of the respective TM; athlete picks the lift
      {id:'belt_squat',                  sets:3, reps:'8–10', l1:'70–80 kg — slow tempo, or single-leg squat', l2:'70–80 kg — slow tempo, or single-leg squat'},  // [JUDGMENT] sets AND reps — no rep count in the source or the corpus; 3 is the athlete's own practice/reps + load — carried from Block 1's belt squat
      {id:'pull_drill',                  sets:1, reps:'3–5', l1:'25–30 kg — power position → lowest good hang', l2:'25–30 kg — power position → lowest good hang'},  // [JUDGMENT] sets AND reps — no rep count in the source or the corpus; 3 is the athlete's own practice + load — a drill, not a lift; 40–50% snatch TM
      {id:'rdl',                         sets:3, reps:'6–8', l1:'75–85 kg — end of session, or stiff-legged DL / good morning', l2:'75–85 kg — end of session, or stiff-legged DL / good morning'},  // [JUDGMENT] sets AND reps — no rep count in the source or the corpus; 3 is the athlete's own practice/reps + load — last in the session, so held at Block 1's number [E24.1]
      {id:'split_jerk',                  sets:2, reps:'3', l1:'Empty bar', l2:'Empty bar'},  // [JUDGMENT] sets AND reps — no rep count in the source or the corpus; 3 is the athlete's own practice — recurring daily skill note [E14.4]
    ],
  },
  15: {
    d1: [
      {id:'snatch_from_floor',           sets:3, reps:'2', l1:'43–48 kg', l2:'43–48 kg'},  // [JUDGMENT] sets AND reps — no rep count in the source or the corpus; 3 is the athlete's own practice; [JUDGMENT] load — week 14 –10–15%, computed not cited, volume cut too
      {id:'snpp_ohs_complex',            sets:3, reps:'3+2', l1:'50 kg — add weekly, feel', l2:'50 kg — add weekly, feel'},  // [JUDGMENT] sets AND reps — no rep count in the source or the corpus; 3 is the athlete's own practice — reduced sets, load unchanged
      {id:'snatch_pull',                 sets:3, reps:'3', l1:'48–56.5 kg', l2:'48–56.5 kg'},  // [JUDGMENT] sets AND reps — no rep count in the source or the corpus; 3 is the athlete's own practice; [JUDGMENT] load — week 14 –10–15%, computed not cited
      {id:'back_squat',                  sets:3, reps:'1', l1:'99–113 kg — back-off singles, no climbing past it', l2:'99–113 kg — back-off singles, no climbing past it'},  // [JUDGMENT] sets; [JUDGMENT] load — week 14's 116.5–126 single –10–15%, computed not cited
      {id:'trunk_static_strength',       sets:3, reps:'varies', l1:'Bodyweight', l2:'Bodyweight'},  // [JUDGMENT] sets AND reps — no rep count in the source or the corpus; 3 is the athlete's own practice — maintenance
      {id:'split_jerk',                  sets:2, reps:'3', l1:'Empty bar', l2:'Empty bar'},  // [JUDGMENT] sets AND reps — no rep count in the source or the corpus; 3 is the athlete's own practice — recurring daily skill note [E14.4]
    ],
    d2: [
      {id:'snatch_balance',              sets:2, reps:'2', l1:'40–45 kg — 5-sec hold in the bottom', l2:'40–45 kg — 5-sec hold in the bottom'},  // [E8.1, E11.3] as weeks 9-14; [JUDGMENT] one set fewer and the top of the band trimmed, in line with week 15's reduction
      {id:'clean_front_squat_floor',     sets:3, reps:'2', l1:'49–55 kg', l2:'49–55 kg'},  // [JUDGMENT] sets AND reps — no rep count in the source or the corpus; 3 is the athlete's own practice; [JUDGMENT] load — week 14 –10–15%, computed not cited
      {id:'split_jerk_from_rack',        sets:3, reps:'varies', l1:'30–35 kg — split-position reps', l2:'30–35 kg — split-position reps'},  // [JUDGMENT] sets AND reps — no rep count in the source or the corpus; 3 is the athlete's own practice — reduced sets
      {id:'clean_pull',                  sets:3, reps:'3', l1:'55–65 kg', l2:'55–65 kg'},  // [JUDGMENT] sets AND reps — no rep count in the source or the corpus; 3 is the athlete's own practice; [JUDGMENT] load — week 14 –10–15%, computed not cited
      {id:'front_squat',                 sets:3, reps:'3', l1:'64–72.5 kg', l2:'64–72.5 kg'},  // [JUDGMENT] sets AND reps — no rep count in the source or the corpus; 3 is the athlete's own practice; [JUDGMENT] load — week 14 –10–15%, computed not cited
      {id:'bodybuilding_core_block',     sets:1, reps:"athlete's choice", l1:'Short time-capped block', l2:'Short time-capped block'},  // [JUDGMENT] sets AND reps — no rep count in the source or the corpus; 3 is the athlete's own practice — maintenance
      {id:'split_jerk',                  sets:2, reps:'3', l1:'Empty bar', l2:'Empty bar'},  // [JUDGMENT] sets AND reps — no rep count in the source or the corpus; 3 is the athlete's own practice — recurring daily skill note [E14.4]
    ],
    d3: [
      {id:'split_jerk_from_rack',        sets:3, reps:'2', l1:'43–52 kg', l2:'43–52 kg'},  // [JUDGMENT] sets AND reps — no rep count in the source or the corpus; 3 is the athlete's own practice; [JUDGMENT] load — week 14 –10–15%, computed not cited
      {id:'snatch_opener',               sets:2, reps:'3', l1:'25–30 kg — pattern only', l2:'25–30 kg — pattern only'},  // [JUDGMENT] sets AND reps — no rep count in the source or the corpus; 3 is the athlete's own practice/reps + load — unchanged, already an opener
      {id:'power_jerk',                  sets:2, reps:'2', l1:'36.5–45 kg', l2:'36.5–45 kg'},  // [JUDGMENT] sets AND reps — no rep count in the source or the corpus; 3 is the athlete's own practice; [JUDGMENT] load — week 14 –10–15%, computed not cited
      {id:'jerk_dip_drive',              sets:2, reps:'3', l1:'55–65 kg', l2:'55–65 kg'},  // [JUDGMENT] sets AND reps — no rep count in the source or the corpus; 3 is the athlete's own practice; [JUDGMENT] load — week 14 –10–15%, computed not cited
      {id:'push_press',                  sets:2, reps:'3', l1:'34–40.5 kg', l2:'34–40.5 kg'},  // [JUDGMENT] sets AND reps — no rep count in the source or the corpus; 3 is the athlete's own practice; [JUDGMENT] load — week 14 –10–15%, computed not cited
      {id:'split_jerk',                  sets:2, reps:'3', l1:'Empty bar', l2:'Empty bar'},  // [JUDGMENT] sets AND reps — no rep count in the source or the corpus; 3 is the athlete's own practice — recurring daily skill note [E14.4]
    ],
    d4: [
      {id:'back_squat',                  sets:3, reps:'3', l1:'81.5–98.5 kg', l2:'81.5–98.5 kg'},  // [JUDGMENT] sets AND reps; [JUDGMENT] load — week 14's 96–109.5 –10–15%, computed not cited
      {id:'three_position_snatch',       sets:2, reps:'3 positions', l1:'27.5–34 kg', l2:'27.5–34 kg'},  // [JUDGMENT] sets AND reps — no rep count in the source or the corpus; 3 is the athlete's own practice; [JUDGMENT] load — week 14 –10–15%, computed not cited
      {id:'pause_snatch',                sets:2, reps:'1', l1:'32.5–39.5 kg', l2:'32.5–39.5 kg'},  // [JUDGMENT] sets AND reps — no rep count in the source or the corpus; 3 is the athlete's own practice; [JUDGMENT] load — week 14 –10–15%, computed not cited — athlete may substitute the pause clean
      {id:'belt_squat',                  sets:2, reps:'8–10', l1:'59.5–72 kg', l2:'59.5–72 kg'},  // [JUDGMENT] sets AND reps — no rep count in the source or the corpus; 3 is the athlete's own practice; [JUDGMENT] load — week 14 –10–15%, computed not cited
      {id:'rdl',                         sets:2, reps:'6–8', l1:'64–76.5 kg', l2:'64–76.5 kg'},  // [JUDGMENT] sets AND reps — no rep count in the source or the corpus; 3 is the athlete's own practice; [JUDGMENT] load — week 14 –10–15%, computed not cited — posterior chain last [E24.1]
      {id:'split_jerk',                  sets:2, reps:'3', l1:'Empty bar', l2:'Empty bar'},  // [JUDGMENT] sets AND reps — no rep count in the source or the corpus; 3 is the athlete's own practice — recurring daily skill note [E14.4]
    ],
  },
  16: {
    d1: [
      {id:'snatch_from_floor',           sets:3, reps:'1', l1:'53.5 kg — openers only, no accessory volume', l2:'53.5 kg — openers only, no accessory volume'},  // [JUDGMENT] sets AND reps — no rep count in the source or the corpus; 3 is the athlete's own practice — source prints a single 85% figure and "openers only"
      {id:'split_jerk',                  sets:2, reps:'3', l1:'Empty bar', l2:'Empty bar'},  // [JUDGMENT] sets AND reps — no rep count in the source or the corpus; 3 is the athlete's own practice — recurring daily skill note [E14.4]
    ],
    d2: [
      {id:'clean_front_squat_floor',     sets:3, reps:'1', l1:'57.5 kg — openers only, no accessory volume', l2:'57.5 kg — openers only, no accessory volume'},  // [JUDGMENT] sets AND reps — no rep count in the source or the corpus; 3 is the athlete's own practice — source prints a single 80% figure
      {id:'split_jerk',                  sets:2, reps:'3', l1:'Empty bar', l2:'Empty bar'},  // [JUDGMENT] sets AND reps — no rep count in the source or the corpus; 3 is the athlete's own practice — recurring daily skill note [E14.4]
    ],
    d3: [
      {id:'split_jerk_from_rack',        sets:2, reps:'2', l1:'50.5–54 kg — taper, or drop to empty-bar practice', l2:'50.5–54 kg — taper, or drop to empty-bar practice'},  // [JUDGMENT] sets AND reps — no rep count in the source or the corpus; 3 is the athlete's own practice — source allows "very light or off"
      {id:'split_jerk',                  sets:2, reps:'3', l1:'Empty bar', l2:'Empty bar'},  // [JUDGMENT] sets AND reps — no rep count in the source or the corpus; 3 is the athlete's own practice — empty-bar split practice only [E14.4]
    ],
    d4: [
      // Test order is priority order — the last lift is the least trustworthy number of the day (PROGRAM_B2 week-16 note).
      {id:'snatch',         test:true, label:'Snatch',         target:TRAINING_MAX.snatch,       sets:B2_TEST_LADDER.length+1, reps:'1', l1:'singles to a max', l2:'singles to a max'},  // THE test that finally sets a floor-snatch max
      {id:'clean_and_jerk', test:true, label:'Clean & Jerk',   target:TRAINING_MAX.cleanAndJerk, sets:B2_TEST_LADDER.length+1, reps:'1', l1:'singles to a max', l2:'singles to a max'},  // sets the owed floor-clean max
      {id:'front_squat',    test:true, label:'Front Squat',    target:TRAINING_MAX.frontSquat,   sets:B2_TEST_LADDER.length+1, reps:'1', l1:'singles to a max', l2:'singles to a max'},
      {id:'snatch_balance', test:true, label:'Snatch Balance', target:60,                        sets:B2_TEST_LADDER.length+1, reps:'1', l1:'singles to a max', l2:'singles to a max'},  // [JUDGMENT] target — no TM on file; logged 52.5 × 2 with a 5-sec bottom hold in weeks 12–15, so ~60 kg is the estimated single without the hold
    ],
  },
};

const testLadderKg = (target, pct) => Math.round(target * pct / 2.5) * 2.5;

// One lift's warm-up ladder + a final free-entry max attempt. Mirrors
// ExCard's persistence pattern (storage + sbSync.upsertSets under the same
// `sets_w<week>_<day>_<exId>` key shape) so sync, the session-progress bar,
// and COMPLETE SESSION all keep working the same way on test days.
// In-session warm-up (UI slim-down, 2026-10-17): the parts of DAILY ANKLE /
// CORE / SPINE the athlete actually does, inside the session where they're seen.
// Ticks persist under sets_w{week}_{day}_warmup_before|after through the same
// storage + sbSync path as set ticks, but never report onProgress and are
// skipped by doneSetsFor — a rushed day without them is still a complete session.
function WarmupCard({part, sessionKey, forceReload}) {
  const rows = WARMUP[part];
  const key = `sets_${sessionKey}_warmup_${part}`;
  const [ticks, setTicks] = useState(() => rows.map(() => ({done:false})));
  const [open, setOpen] = useState(null);
  useEffect(() => {
    storage.get(key).then(r => {
      let saved = [];
      try { saved = r ? JSON.parse(r.value) : []; } catch {}
      setTicks(rows.map((_, i) => ({done: !!(saved[i] && saved[i].done)})));
    });
  }, [key, forceReload]);
  async function toggle(i) {
    const updated = ticks.map((t, j) => j === i ? {done: !t.done} : t);
    setTicks(updated);
    try { await storage.set(key, JSON.stringify(updated)); sbSync.upsertSets(key, updated); } catch {}
  }
  const done = ticks.filter(t => t.done).length;
  const title = part === "before" ? "BEFORE · ~12 MIN" : "AFTER · ~4 MIN";
  return (
    <div style={{background:"var(--bg1)",border:"1px solid var(--border)",borderRadius:8,padding:"10px 12px",marginBottom:10}}>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
        <span style={{fontSize:8,letterSpacing:1.2,fontFamily:"'DM Mono',monospace",color:"var(--green)",
          border:"1px solid #5a9e4555",borderRadius:3,padding:"2px 6px"}}>WARM-UP</span>
        <span style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:15,letterSpacing:0.5,flex:1}}>{title}</span>
        <span style={{fontSize:9,color:"var(--text3)",fontFamily:"'DM Mono',monospace"}}>{done}/{rows.length}</span>
      </div>
      {rows.map((r, i) => (
        <div key={r.id} data-warmup-row="" style={{padding:"5px 0",borderTop:i?"1px solid var(--border)":"none"}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <div onClick={() => toggle(i)} style={{width:22,height:22,borderRadius:5,cursor:"pointer",flexShrink:0,
              border:`1px solid ${ticks[i].done ? "var(--green)" : "var(--text3)"}`,
              background:ticks[i].done ? "var(--green)" : "var(--bg2)",display:"grid",placeItems:"center",
              color:"#000",fontSize:12}}>{ticks[i].done ? "✓" : ""}</div>
            <div onClick={() => setOpen(open === i ? null : i)} style={{flex:1,minWidth:0,cursor:"pointer",fontSize:12,color:"var(--text)"}}>{r.name}</div>
            <span style={{fontSize:9,color:"var(--text2)",fontFamily:"'DM Mono',monospace",whiteSpace:"nowrap"}}>{r.dose}</span>
          </div>
          {open === i && <div style={{fontSize:11,color:"var(--text2)",lineHeight:1.5,margin:"6px 0 2px 32px"}}>{r.note}</div>}
        </div>
      ))}
    </div>
  );
}

// Screens behind the MORE tab. Supps and Analytics were retired 2026-10-17;
// their stored data is untouched.
const MORE_TABS = [["exercises","EXERCISES"],["mobility","MOBILITY"],["system","SYSTEM"],["settings","SETTINGS"]];

// ── Log calendar (UI slim-down, 2026-10-17) ─────────────────────────────────
// Replaces the flat log list and the Reports tab: a month grid with training days
// marked; tapping a day shows every session logged on it — each exercise's logged
// weights (from the sets_ keys), then the notes. Edit opens the existing log form
// for that entry's own week; Delete is the existing deleteLog.
const MONTHS = ["JANUARY","FEBRUARY","MARCH","APRIL","MAY","JUNE","JULY","AUGUST","SEPTEMBER","OCTOBER","NOVEMBER","DECEMBER"];
const SESSIONS_TARGET = 4;   // the school-term week; Analytics' old target of 5 was summer's

function LogCalendar({logs, week, onEdit, onDelete}) {
  const today = new Date().toISOString().slice(0, 10);
  const [ym, setYm] = useState(() => { const d = new Date(); return [d.getFullYear(), d.getMonth()]; });
  const [picked, setPicked] = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);   // delete also removes it from the cloud — two taps
  const [y, m] = ym;
  const cells = monthCells(y, m);
  const logged = new Set(Object.values(logs).map(e => e && e.date).filter(Boolean));
  const shift = n => { setPicked(null); setYm(([yy, mm]) => { const d = new Date(yy, mm + n, 1); return [d.getFullYear(), d.getMonth()]; }); };
  const entries = picked ? logsOnDate(logs, picked) : [];
  let keys = [];
  try { keys = Object.keys(localStorage); } catch {}
  const get = k => { try { return localStorage.getItem(k); } catch { return null; } };

  const counts = {};
  Object.values(logs).forEach(l => { if (l && l.week) counts[l.week] = (counts[l.week] || 0) + 1; });
  const maxW = Math.max(week, ...Object.keys(counts).map(Number), 1);
  const perWeek = Array.from({length: maxW}, (_, i) => ({label: `W${i + 1}`, n: counts[i + 1] || 0}));

  const navBtn = {width:34,height:34,borderRadius:6,border:"1px solid var(--border)",background:"var(--bg1)",color:"var(--text2)",fontSize:16,cursor:"pointer"};
  const mono = {fontFamily:"'DM Mono',monospace"};
  return (
    <div className="fade">
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
        <button aria-label="Previous month" onClick={() => shift(-1)} style={navBtn}>‹</button>
        <div style={{flex:1,textAlign:"center",fontFamily:"'Bebas Neue',sans-serif",fontSize:20,letterSpacing:1,color:"var(--gold)"}}>{`${MONTHS[m]} ${y}`}</div>
        <button aria-label="Next month" onClick={() => shift(1)} style={navBtn}>›</button>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:4,marginBottom:4}}>
        {["M","T","W","T","F","S","S"].map((d, i) => <div key={i} style={{...mono,fontSize:8,color:"var(--text3)",textAlign:"center"}}>{d}</div>)}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:4,marginBottom:16}}>
        {cells.map((c, i) => c === null ? <div key={i}/> : (
          <button key={c} onClick={() => setPicked(picked === c ? null : c)} style={{
            aspectRatio:"1",borderRadius:6,cursor:"pointer",...mono,fontSize:11,
            border:`1px solid ${picked === c ? "var(--gold)" : c === today ? "var(--text3)" : "var(--border)"}`,
            background:logged.has(c) ? "rgba(90,158,69,0.18)" : "var(--bg2)",
            color:logged.has(c) ? "var(--green)" : "var(--text3)",fontWeight:logged.has(c) ? 600 : 400,
          }}>{String(Number(c.slice(8)))}</button>
        ))}
      </div>

      {picked && (
        <div style={{marginBottom:20}}>
          {entries.length === 0 && <div style={{...mono,fontSize:11,color:"var(--text3)"}}>No session logged on {picked}.</div>}
          {entries.map(([key, e]) => (
            <Card key={key} style={{marginBottom:10}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                <div>
                  <div style={{...mono,fontSize:9,color:"var(--gold)",letterSpacing:1.5}}>WK {e.week} · {e.dayLabel || ""}</div>
                  <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:17,letterSpacing:0.3}}>{e.dayName}</div>
                </div>
                <div style={{display:"flex",gap:6}}>
                  <Btn small ghost onClick={() => onEdit(key, e)}>EDIT</Btn>
                  {confirmDel === key
                    ? <Btn small onClick={() => { setConfirmDel(null); onDelete(key); }}>CONFIRM DELETE</Btn>
                    : <Btn small ghost onClick={() => setConfirmDel(key)}>DELETE</Btn>}
                </div>
              </div>
              {logDaySets(e, keys, get).map(r => (
                <div key={r.exId} style={{display:"flex",justifyContent:"space-between",gap:10,padding:"4px 0",borderTop:"1px solid var(--border)"}}>
                  <span style={{fontSize:12,color:"var(--text)"}}>{getEx(r.exId).name}</span>
                  <span style={{...mono,fontSize:11,color:"var(--gold)",textAlign:"right"}}>
                    {r.sets.some(s => s.weight != null && s.weight !== "") ? `${r.sets.filter(s => s.weight != null && s.weight !== "").map(s => s.weight).join(" · ")} kg` : `${r.sets.length} done`}
                  </span>
                </div>
              ))}
              {e.notes && <div style={{fontSize:12,color:"var(--text2)",lineHeight:1.6,marginTop:8}}>{e.notes}</div>}
            </Card>
          ))}
        </div>
      )}

      <div style={{...mono,fontSize:9,color:"var(--text3)",letterSpacing:1.5,marginBottom:2}}>SESSIONS PER WEEK</div>
      <div style={{...mono,fontSize:8,color:"var(--text3)",marginBottom:8}}>TARGET: {SESSIONS_TARGET}</div>
      <div style={{display:"flex",gap:3,alignItems:"flex-end",height:70,background:"var(--bg2)",borderRadius:6,padding:"6px"}}>
        {perWeek.map(w => (
          <div key={w.label} title={`${w.label}: ${w.n}`} style={{flex:1,height:`${Math.min(1, w.n / SESSIONS_TARGET) * 100}%`,minHeight:w.n ? 3 : 0,borderRadius:"2px 2px 0 0",
            background:w.n >= SESSIONS_TARGET ? "var(--green)" : w.n >= 2 ? "var(--gold)" : w.n > 0 ? "var(--red)" : "var(--bg3)"}}/>
        ))}
      </div>
      <div style={{display:"flex",justifyContent:"space-between",marginTop:4}}>
        <span style={{...mono,fontSize:8,color:"var(--text3)"}}>W1</span>
        <span style={{...mono,fontSize:8,color:"var(--text3)"}}>W{maxW}</span>
      </div>
    </div>
  );
}

function TestLiftCard({lift, ladder, sessionKey, onProgress, onSetsChange, forceReload, onNewPR}) {
  const stepCount = ladder.length + 1;
  const [steps, setSteps] = useState(() => [
    ...ladder.map(pct => ({done:false, pct})),
    {done:false, isMax:true, weight:""},
  ]);
  const doneCount = steps.filter(s => s.done).length;

  useEffect(() => { if (onProgress) onProgress(lift.id, doneCount, stepCount); }, [doneCount]);

  useEffect(() => {
    if (!sessionKey) return;
    const key = `sets_${sessionKey}_${lift.id}`;
    storage.get(key).then(result => {
      if (result) {
        try {
          const saved = JSON.parse(result.value);
          if (Array.isArray(saved) && saved.length === stepCount) setSteps(saved);
        } catch {}
      }
    }).catch(() => {});
  }, [sessionKey, forceReload]);

  async function persist(updated) {
    setSteps(updated);
    if (!sessionKey) return;
    try {
      const key = `sets_${sessionKey}_${lift.id}`;
      const forSync = updated.map(s => ({
        done: s.done,
        weight: s.isMax ? (parseFloat(s.weight) || null) : testLadderKg(lift.target, s.pct),
      }));
      await storage.set(key, JSON.stringify(updated));
      sbSync.upsertSets(key, forSync);
      if (onSetsChange) onSetsChange();
    } catch {}
  }

  function toggleStep(idx) {
    // Same rule as ExCard: the free-entry MAX attempt can't be ticked until a
    // weight is typed. Ladder rungs carry a computed weight, so they tick freely.
    const st = steps[idx];
    if (st.isMax && !st.done && !(parseFloat(st.weight) > 0)) return;
    const updated = steps.map((s,i) => i===idx ? {...s, done:!s.done} : s);
    persist(updated);
    if (updated[idx].isMax && updated[idx].done) {
      const w = parseFloat(updated[idx].weight);
      if (!isNaN(w) && w > 0 && onNewPR) onNewPR(lift.id, w);
    }
  }

  function setMaxWeight(val) {
    const updated = steps.map(s => s.isMax ? {...s, weight:val} : s);
    persist(updated);
    if (updated[updated.length-1].done) {
      const w = parseFloat(val);
      if (!isNaN(w) && w > 0 && onNewPR) onNewPR(lift.id, w);
    }
  }

  const catalog = getEx(lift.id);
  const m = TYPE_META[catalog.type];

  return (
    <div style={{background:"var(--bg1)",borderRadius:8,marginBottom:8,border:"1px solid var(--border)",padding:"12px 14px"}}>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
        <Tag color={m.color} bg={m.bg}>TEST</Tag>
        <span style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:17}}>{lift.label}</span>
        <span style={{marginLeft:"auto",fontSize:11,color:"var(--text3)",fontFamily:"'DM Mono',monospace"}}>
          {lift.test ? `ladder % of ${lift.target} kg` : `target ${lift.target}+ kg`}
        </span>
      </div>
      {steps.map((s,idx) => (
        <div key={idx} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 10px",marginBottom:6,borderRadius:6,
          background:s.done?"rgba(90,158,69,0.08)":"var(--bg2)",
          border:`1px solid ${s.done?"#5a9e4433":s.isMax?"#d4a84355":"var(--border)"}`}}>
          <div onClick={()=>toggleStep(idx)}
            title={s.isMax && !s.done && !(parseFloat(s.weight)>0) ? "Enter the weight achieved first" : undefined}
            style={{width:22,height:22,borderRadius:5,flexShrink:0,
            cursor: s.isMax && !s.done && !(parseFloat(s.weight)>0) ? "not-allowed" : "pointer",
            opacity: s.isMax && !s.done && !(parseFloat(s.weight)>0) ? 0.35 : 1,
            background:s.done?"var(--green)":"var(--bg3)",border:`1.5px solid ${s.done?"var(--green)":"var(--border2)"}`,
            display:"flex",alignItems:"center",justifyContent:"center",transition:"all 0.15s"}}>
            {s.done && <span style={{color:"#000",fontSize:12,fontWeight:800}}>✓</span>}
          </div>
          {s.isMax ? (
            <>
              <span style={{fontSize:11,color:"var(--gold)",fontFamily:"'DM Mono',monospace",flexShrink:0}}>MAX</span>
              <input type="number" inputMode="decimal" placeholder="kg achieved" value={s.weight}
                onChange={e=>setMaxWeight(e.target.value)}
                style={{flex:1,background:"var(--bg3)",border:"1px solid var(--border2)",borderRadius:5,
                  color:"var(--gold)",padding:"5px 8px",fontSize:12,fontFamily:"'DM Mono',monospace"}} />
            </>
          ) : (
            <>
              <span style={{fontSize:11,color:"var(--text3)",fontFamily:"'DM Mono',monospace",width:34,flexShrink:0}}>
                {Math.round(s.pct*100)}%
              </span>
              <span style={{flex:1,fontSize:12,color:"var(--text2)"}}>{testLadderKg(lift.target,s.pct)} kg</span>
            </>
          )}
        </div>
      ))}
    </div>
  );
}

// A single done/not-done toggle for Block 2+ sessions, in place of per-set
// tracking — PROGRAM_B2's `secondary` field bundles several pieces of
// accessory work into one string per day, not a clean per-exercise list, so
// there's no set count to check off individually. Persists the same way as
// ExCard/TestLiftCard (storage + sbSync.upsertSets, `sets_w<week>_<day>_session`
// key) so sync and the log flow keep working the same way across all blocks.
function Block2DayToggle({sessionKey, onProgress, onSetsChange, forceReload}) {
  const [done, setDone] = useState(false);

  useEffect(() => { if (onProgress) onProgress("session", done ? 1 : 0, 1); }, [done]);

  useEffect(() => {
    if (!sessionKey) return;
    const key = `sets_${sessionKey}_session`;
    storage.get(key).then(result => {
      if (result) {
        try {
          const saved = JSON.parse(result.value);
          if (Array.isArray(saved) && saved[0]) setDone(!!saved[0].done);
        } catch {}
      }
    }).catch(() => {});
  }, [sessionKey, forceReload]);

  async function toggle() {
    const next = !done;
    setDone(next);
    if (!sessionKey) return;
    try {
      const key = `sets_${sessionKey}_session`;
      await storage.set(key, JSON.stringify([{done: next}]));
      sbSync.upsertSets(key, [{done: next, weight: null}]);
      if (onSetsChange) onSetsChange();
    } catch {}
  }

  return (
    <div onClick={toggle} style={{display:"flex",alignItems:"center",gap:10,padding:"12px 14px",
      borderRadius:8,cursor:"pointer",marginBottom:8,
      background:done?"rgba(90,158,69,0.08)":"var(--bg2)",
      border:`1px solid ${done?"var(--green)":"var(--border)"}`}}>
      <div style={{width:24,height:24,borderRadius:6,flexShrink:0,
        background:done?"var(--green)":"var(--bg3)",
        border:`1.5px solid ${done?"var(--green)":"var(--border2)"}`,
        display:"flex",alignItems:"center",justifyContent:"center"}}>
        {done && <span style={{color:"#000",fontSize:13,fontWeight:800}}>✓</span>}
      </div>
      <span style={{fontSize:12,color:done?"var(--green)":"var(--text2)",fontFamily:"'DM Mono',monospace"}}>
        {done ? "Session marked complete" : "Mark this session complete"}
      </span>
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────
function OlyTracker() {
  const [tab,setTab]         = useState("program");
  const [moreOpen,setMoreOpen] = useState(false);
  const [dayIdx,setDayIdx]   = useState(0);
  const [week,setWeek]       = useState(1);
  // Was a stored SUMMER/SCHOOL toggle (retired 2026-10-17, UI slim-down). Block 1
  // was trained on the 5-day summer catalogue, so its weeks keep it; every later
  // week is the Mon/Tue/Thu/Sat school week. oly_summer stays in storage, unread.
  const isSummer = week <= BLOCK_BOUNDS[0].end;
  const [prs,setPrs]         = useState({});
  const [logs,setLogs]       = useState({});
  const [loading,setLoading] = useState(true);
  const [toast,setToast]     = useState(null);
  const [newPR,setNewPR]     = useState({lift:"back_squat",weight:"",reps:"1"});
  const [logForm,setLogForm] = useState(()=>({dayId:"d1",date:new Date().toISOString().slice(0,10),notes:"",weights:"",backPain:"0",nightShift:false,techniqueFeel:"",energyLevel:"",focusNext:"",rating:""}));
  const [logModal,setLogModal] = useState(false);
  const [logEditKey,setLogEditKey] = useState(null);
  const [prTab,setPrTab]     = useState("list");
  const [prOpen,setPrOpen]   = useState(null);
  const [progTab,setProgTab] = useState("program");
  const currentWeek = computeCurrentWeek();
  const [progViewWeek, setProgViewWeek] = useState(currentWeek);
  const [suppHistory,setSuppHistory] = useState({});
  const [suppNotes,setSuppNotes]     = useState("");
  const TODAY = new Date().toISOString().slice(0,10);
  const suppChecked = suppHistory[TODAY] || {};
  const [sessionProgress,setSessionProgress] = useState({});
  const [setsVersion,setSetsVersion] = useState(0);
  const [syncRevision,setSyncRevision] = useState(0);

  const DAYS = isSummer ? DAYS_SUMMER : DAYS_SCHOOL;
  const phase = week<=3?0:1;
  const day = DAYS[Math.min(dayIdx, DAYS.length-1)];
  const dayExercises = weekAdjustedExercises(day, week);
  const _headerBlk = blockFor(week) || BLOCK_BOUNDS[0];
  const _headerWeekPlan = weekPlan(week);
  const _testDay = _headerWeekPlan?.phase === "Test" ? WEEK8_TEST[day.id] : null;
  // Block 2+ (weeks 9+): the day-card catalog (DAYS_SUMMER/DAYS_SCHOOL,
  // ExCard) is Block 1's alone — Block 2's own days (PROGRAM_B2) bundle 4-7
  // pieces of accessory work into one freeform `secondary` string per day,
  // not a clean per-exercise list, so it's shown read-only (the same text
  // WEEK PLAN already renders correctly) with one session-complete toggle
  // instead of per-set tracking. Weeks 17+ (blocks 3-4) have no `.days` at
  // all yet — PROGRAM_OUTLINE is one line per week — so they get the same
  // "not detailed yet" fallback ProgramWeekView already shows.
  const _b2Days = _headerBlk.block !== 1 ? (_headerWeekPlan?.days || null) : null;
  const _b2Day = _b2Days ? _b2Days[Math.min(dayIdx, _b2Days.length-1)] : null;
  const _outlineOnly = _headerBlk.block !== 1 && !_b2Days;
  // Granular per-exercise breakdown, where built (week 9 pilot so far) —
  // real checkboxes/dropdowns via ExCard, same as Block 1. Falls back to the
  // read-only PRIMARY/SECONDARY card + toggle for weeks not yet built this way.
  const _b2Exercises = _b2Day ? exercisesFor(week, _b2Day.id) : null;
  // The banner/note below used to key off `phase` (week<=3?0:1) alone, so weeks
  // 7 (Deload) and 8 (Test) both rendered as "PHASE 2 — LOAD THE BASE" — telling
  // the athlete to add load and never grind reps during the exact weeks meant to
  // back off. Key off the real per-week phase text instead so those weeks read
  // as distinct from Phase 2 and from each other. Block 2's own phases
  // ("Accumulation", "Intensification") aren't in PHASE_BANNER — falling back
  // to "Phase 1" would print Block 1's "technique + hypertrophy" copy on a
  // Block 2 week, so build a generic banner from the week's own text instead
  // of defaulting to a specific, wrong one. Block 2's own "Deload"/"Test"
  // weeks (15/16) DO match PHASE_BANNER and get that copy, same as Block 1's.
  // PHASE_BANNER is keyed by phase name and therefore shared across blocks,
  // but the two deloads are not the same prescription. Block 1's week 7 holds
  // the weight and cuts sets; Block 2's week 15 cuts BOTH — "Wk 14 weight
  // −10–15% · volume −15–25%" in PROGRAM_B2, cited to [E5.11]. Without this
  // override the week-15 banner told the athlete "same loads, not lighter
  // weight" directly above cards showing week 14 minus 15%.
  const _b2Deload = _headerWeekPlan?.phase === "Deload" && week >= 9;
  const _phaseBanner = (_b2Deload ? {
    label: "DELOAD — WEIGHT AND VOLUME", color: "#aaa", border: "#88888855",
    sub: "Weights −10–15%, volume −15–25%. No PRs — technique priority.",
    note: "🪶 Deload: lighter AND shorter [E5.11]. Fatigue is low — the best week to catch and film position faults, not to push new numbers.",
  } : null) || PHASE_BANNER[_headerWeekPlan?.phase] || (_headerWeekPlan ? {
    label: (_headerWeekPlan.phase || "").toUpperCase(),
    color: "var(--gold)", border: "#d4a84344",
    sub: _headerWeekPlan.focus || "",
    note: _headerWeekPlan.load ? `Load: ${_headerWeekPlan.load}` : "",
  } : PHASE_BANNER["Phase 1"]);

  // Reset progress tracking when day changes
  useEffect(() => { setSessionProgress({}); }, [dayIdx, week]);

  useEffect(()=>{load();},[]);

  async function load() {
    let finalPrs={}, finalLogs={};
    try {
      const [p,l,w] = await Promise.allSettled([
        storage.get("oly_prs"),
        storage.get("oly_logs"),
        storage.get("oly_week"),
      ]);
      if(p.status==="fulfilled"&&p.value){
        finalPrs=migratePRs(JSON.parse(p.value.value));
        setPrs(finalPrs);
      }else{
        const seeded={};
        Object.entries(SEED_PRS).forEach(([lift,entry])=>{
          seeded[lift]={...entry,history:[{weight:entry.weight,date:entry.date,reps:entry.reps}]};
        });
        finalPrs=seeded;
        setPrs(seeded);await storage.set("oly_prs",JSON.stringify(seeded));
      }
      if(l.status==="fulfilled"&&l.value){finalLogs=JSON.parse(l.value.value);setLogs(finalLogs);}
      if(w.status==="fulfilled"&&w.value) setWeek(JSON.parse(w.value.value));
      // Load supplements
      const [sc, sn] = await Promise.allSettled([
        storage.get("oly_supp_history"),
        storage.get("oly_supp_notes"),
      ]);
      if(sc.status==="fulfilled"&&sc.value) setSuppHistory(JSON.parse(sc.value.value)||{});
      if(sn.status==="fulfilled"&&sn.value) setSuppNotes(sn.value.value);
      migrateExerciseKeysV1();
      migratePRKeysV1();
      // Pull from Supabase on startup
      if (sbSync.ready) {
        try {
          // Push unconfirmed set writes from a previous run before pulling,
          // so the pull sees them instead of an older cloud copy.
          await sbSync.flushPending();
          const remote = await sbSync.pullAll();
          if (remote.sessions.length > 0 || remote.sets.length > 0 || remote.reviews.length > 0) {
            await applySupabaseData(remote);
            // applySupabaseData updates logs state; re-read from localStorage so rebuild sees it
            try{const v=localStorage.getItem('oly_logs');if(v)finalLogs=JSON.parse(v);}catch{}
          }
        } catch { /* silent */ }
      }
      // Rebuild PR history from logged set data
      const rebuilt=rebuildPRsFromLogs(finalPrs,finalLogs);
      if(JSON.stringify(rebuilt)!==JSON.stringify(finalPrs)){
        setPrs(rebuilt);
        try{await storage.set("oly_prs",JSON.stringify(rebuilt));}catch{}
      }
    } catch{setPrs(migratePRs(SEED_PRS));}
    setLoading(false);
  }

  async function applySupabaseData(remote) {
    // Supabase is the source of truth once sync is on — every mutation pushes
    // immediately, so a pull rebuilds each domain from scratch rather than
    // merging onto stale local state. Merging previously left deleted rows
    // (e.g. a repeated/cleared week) stuck in localStorage forever, since
    // nothing ever pruned an ID that no longer existed remotely.
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
      // Keeps any set write the cloud hasn't confirmed yet — see sync.js.
      sbSync.applyRemoteSets(remote.sets);
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


  async function toggleSupp(id) {
    const todayEntry = {...(suppHistory[TODAY]||{}), [id]: !suppChecked[id]};
    const updated = {...suppHistory, [TODAY]: todayEntry};
    setSuppHistory(updated);
    try{await storage.set("oly_supp_history",JSON.stringify(updated));}catch{}
  }

  async function saveSuppNotes(val) {
    setSuppNotes(val);
    try{await storage.set("oly_supp_notes", val);}catch{}
  }

  function showToast(msg){setToast(msg);setTimeout(()=>setToast(null),2500);}

  function prKeyFor(exId) {
    if (PR_ALL.includes(exId)) return exId;
    return null;
  }

  async function handleAutoPR(exName, weight) {
    const key = prKeyFor(exName);
    if (!key) return;
    const existing = prs[key];
    if (existing && weight <= existing.weight) return;
    const today = new Date().toISOString().slice(0,10);
    const history = [...(existing?.history||[]), {weight, date:today, reps:1}];
    const entry = {weight, date:today, reps:1, history};
    const updated = {...prs, [key]: entry};
    setPrs(updated);
    try{await storage.set("oly_prs",JSON.stringify(updated));}catch{}
    showToast(`🏆 NEW PR — ${getEx(key)?.name || key}: ${weight} kg`);
  }

  // A week's day ids: its own plan days past Block 1, else the Block 1 catalog.
  const dayIdsFor = w => ((blockFor(w)?.block !== 1 && weekPlan(w)?.days) ||
    (w <= BLOCK_BOUNDS[0].end ? DAYS_SUMMER : DAYS_SCHOOL)).map(d => d.id);
  async function saveWeek(w){
    setDayIdx(remapDayIdx(dayIdsFor(week), dayIdx, dayIdsFor(w)));
    setWeek(w);try{await storage.set("oly_week",JSON.stringify(w));}catch{}}

  async function handleAddPR(){
    if(!newPR.weight||isNaN(newPR.weight)) return;
    const existing=prs[newPR.lift];
    const nw=parseFloat(newPR.weight);
    const nr=parseInt(newPR.reps)||1;
    const today=new Date().toISOString().slice(0,10);
    const isNew=!existing||nw>existing.weight;
    const history=[...(existing?.history||[]),{weight:nw,date:today,reps:nr}];
    const entry=isNew?{weight:nw,date:today,reps:nr,history}:{...existing,history};
    const updated={...prs,[newPR.lift]:entry};
    setPrs(updated);
    try{await storage.set("oly_prs",JSON.stringify(updated));}catch{}
    setNewPR(p=>({...p,weight:"",reps:"1"}));
    showToast(isNew?`🏆 NEW PR — ${newPR.lift}: ${nw} kg!`:`Logged ${nw} kg — history updated`);
  }

  async function handleLog(){
    if(!logForm.notes&&!logForm.weights&&!logForm.rating) return;
    const lw = logForm.week ?? week;   // a calendar edit keeps its entry's week
    // Snapshot pct at log time so review doesn't re-read stale localStorage later.
    // Mirrors the live session-progress calc: Deload's real reduced sets via
    // weekAdjustedExercises(), Test's ladder-step count via WEEK8_TEST, Block
    // 2+'s single session toggle via Block2DayToggle — not the Block 1
    // catalog's full Phase 2 volume, and not Block 1's dayName/label for a
    // Block 2+ session (the ids overlap — "d1".."d4" — but the content doesn't).
    const _logWeekPlan = weekPlan(lw);
    const _logBlk = blockFor(lw);
    const _logB2Day = _logBlk?.block!==1 ? (_logWeekPlan?.days||[]).find(dd=>dd.id===logForm.dayId) : null;
    const _logB2Exercises = _logB2Day ? exercisesFor(lw, _logB2Day.id) : null;
    const _logTestDay = _logWeekPlan?.phase === "Test" ? WEEK8_TEST[logForm.dayId] : null;
    const d = _logB2Day || (lw<=BLOCK_BOUNDS[0].end?DAYS_SUMMER:DAYS_SCHOOL).find(d=>d.id===logForm.dayId);
    const expectedTotal = _logB2Exercises ? _logB2Exercises.reduce((acc,ex)=>{
          const c=typeof ex.sets==="number"?ex.sets:parseInt(ex.sets)||3;
          return acc+c;
        },0)
      : _logB2Day ? 1
      : _logTestDay ? _logTestDay.lifts.reduce((acc)=>acc+_logTestDay.ladder.length+1,0)
      : d ? weekAdjustedExercises(d, lw).reduce((acc,ex)=>{
          const c=typeof ex.sets==="number"?ex.sets:parseInt(ex.sets)||3;
          return acc+c;
        },0) : 0;
    const prefix=`sets_w${lw}_${logForm.dayId}_`;
    let doneSets=0;
    // Warm-up ticks share the prefix (so they sync) but never count toward the session.
    try{doneSets=doneSetsFor(prefix,Object.keys(localStorage),k=>localStorage.getItem(k));}catch{}
    const sessionPct=expectedTotal>0?Math.round((doneSets/expectedTotal)*100):null;
    const key = logEditKey || `${Date.now()}`;
    // A calendar edit (logForm.week set) of an unchanged day keeps what was
    // recorded then: re-deriving it now can lose a Block 1 D5 label or a pct
    // snapshot whose set ticks no longer exist on this device.
    const _prev=logEditKey&&logForm.week!=null?logs[logEditKey]:null;
    const _keep=_prev&&logEntryDayId(_prev)===logForm.dayId;
    const updated={...logs,[key]:{
      date:logForm.date||new Date().toISOString().slice(0,10),
      dayName:_keep?_prev.dayName:_logB2Day?.primary||d?.name||logForm.dayId,
      dayLabel:_keep?_prev.dayLabel:d?.label||"",
      week:lw,notes:logForm.notes,weights:logForm.weights,
      backPain:logForm.backPain,nightShift:logForm.nightShift,
      techniqueFeel:logForm.techniqueFeel,
      energyLevel:logForm.energyLevel,
      focusNext:logForm.focusNext,
      rating:logForm.rating,
      pct:_keep&&_prev.pct!=null?_prev.pct:sessionPct,
    }};
    setLogs(updated);
    try{await storage.set("oly_logs",JSON.stringify(updated));}catch{}
    sbSync.upsertSession(key, updated[key]);
    setLogForm(f=>({...f,week:undefined,date:new Date().toISOString().slice(0,10),notes:"",weights:"",backPain:"0",nightShift:false,techniqueFeel:"",energyLevel:"",focusNext:"",rating:""}));
    setLogEditKey(null);
    setLogModal(false);
    showToast("Session logged ✓");
  }


  // Close the log form. Closing an EDIT resets the form, so a calendar edit's
  // week (and its notes) can't leak into the next fresh COMPLETE SESSION.
  function closeLogModal(){
    setLogModal(false);
    if(logEditKey){
      setLogEditKey(null);
      setLogForm(f=>({...f,week:undefined,date:new Date().toISOString().slice(0,10),notes:"",weights:"",backPain:"0",nightShift:false,techniqueFeel:"",energyLevel:"",focusNext:"",rating:""}));
    }
  }

  async function deleteLog(key){
    const updated={...logs};
    delete updated[key];
    setLogs(updated);
    try{await storage.set("oly_logs",JSON.stringify(updated));}catch{}
    sbSync.deleteSession(key);
  }


  const sleepMeta = day ? SLEEP[day.sleep] : null;

  const isDayLogged = (dayId) => Object.values(logs).some(l => {
    const m = l.dayLabel && l.dayLabel.match(/(\d+)/);
    return l.week === week && m && `d${m[1]}` === dayId;
  });
  const thisDayLogged = _b2Day ? isDayLogged(_b2Day.id) : (day ? isDayLogged(day.id) : false);

  if(loading) return(
    <div style={{background:"var(--bg)",height:"100vh",display:"flex",alignItems:"center",justifyContent:"center"}}>
      <span style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:28,color:"var(--text3)",letterSpacing:5}}>LOADING</span>
    </div>
  );

  return (
    <div style={{minHeight:"100vh",background:"var(--bg)"}}>

      {/* Toast */}
      {toast&&(
        <div style={{position:"fixed",top:70,left:"50%",transform:"translateX(-50%)",
          background:"var(--gold)",color:"#000",padding:"10px 20px",borderRadius:6,
          fontWeight:600,fontSize:13,zIndex:999,whiteSpace:"nowrap",
          boxShadow:"0 4px 20px rgba(0,0,0,0.5)"}}>
          {toast}
        </div>
      )}

      {/* Header */}
      <div style={{background:"var(--bg1)",borderBottom:"1px solid var(--border)",position:"sticky",top:0,zIndex:100}}>
        <div style={{maxWidth:700,margin:"0 auto",padding:"14px 16px 0"}}>
          <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:14}}>
            <div>
              <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:30,letterSpacing:2,lineHeight:1}}>
                OLY<span style={{color:"var(--gold)"}}>TRACKER</span>
              </div>
              <div style={{fontSize:9,color:"var(--text3)",letterSpacing:2.5,fontFamily:"'DM Mono',monospace",marginTop:3}}>
                BLOCK {_headerBlk.block} · {BLOCKS[_headerBlk.block-1].name.toUpperCase()} · {_headerBlk.end-_headerBlk.start+1} WEEKS
              </div>
              <div style={{fontSize:8,color:"var(--text3)",letterSpacing:1.5,fontFamily:"'DM Mono',monospace",marginTop:2,opacity:0.6}}>
                PROGRAM v3.20.1 · 2026-10-25
              </div>
            </div>
            <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:6}}>
              <div style={{textAlign:"right"}}>
                <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:26,color:"var(--gold)",lineHeight:1}}>WK {week}</div>
                <div style={{fontSize:9,color:"var(--text3)",letterSpacing:2,fontFamily:"'DM Mono',monospace",marginTop:2}}>
                  {_headerWeekPlan ? _headerWeekPlan.phase.toUpperCase() : `PHASE ${phase+1}`}
                </div>
              </div>
            </div>
          </div>
          <div style={{display:"flex",gap:0,overflowX:"auto",WebkitOverflowScrolling:"touch",
            scrollbarWidth:"none",msOverflowStyle:"none"}}>
            {[["program","PROGRAM"],["log","LOG"],["prs","PRs"],["more","MORE ▾"]].map(([id,lbl])=>{
              const on = id==="more" ? MORE_TABS.some(([m])=>m===tab) : tab===id;
              return (
              <button key={id} onClick={()=>id==="more" ? setMoreOpen(o=>!o) : (setTab(id), setMoreOpen(false))} style={{
                padding:"9px 12px",cursor:"pointer",fontSize:10,fontWeight:600,letterSpacing:1.5,
                border:"none",background:"transparent",fontFamily:"'DM Mono',monospace",
                color:on?"var(--gold)":"var(--text3)",
                borderBottom:on?"2px solid var(--gold)":"2px solid transparent",
                transition:"all 0.15s",whiteSpace:"nowrap",flexShrink:0,
              }}>{lbl}</button>
              );
            })}
          </div>
        </div>
      </div>

      {/* MORE menu: the screens the athlete rarely opens (UI slim-down, 2026-10-17) */}
      {moreOpen && (
        <div style={{maxWidth:700,margin:"0 auto",padding:"8px 16px 0",display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
          {MORE_TABS.map(([id,lbl])=>(
            <button key={id} onClick={()=>{setTab(id);setMoreOpen(false);}} style={{
              padding:"10px",borderRadius:6,cursor:"pointer",fontSize:10,fontWeight:600,letterSpacing:1.5,
              fontFamily:"'DM Mono',monospace",border:`1px solid ${tab===id?"var(--gold)":"var(--border)"}`,
              background:tab===id?"#d4a84314":"var(--bg2)",color:tab===id?"var(--gold)":"var(--text2)",
            }}>{lbl}</button>
          ))}
        </div>
      )}

      <div style={{maxWidth:700,margin:"0 auto",padding:"20px 16px 80px"}}>

        {/* ═══ PROGRAM ═══ */}
        {tab==="program" && (
          <div className="fade">

            {/* Program / Schedule sub-tabs */}
            <div style={{display:"flex",gap:6,marginBottom:16}}>
              <Btn small ghost={progTab!=="program"} active={progTab==="program"} onClick={()=>setProgTab("program")}>TRAINING</Btn>
              <Btn small ghost={progTab!=="weekplan"} active={progTab==="weekplan"} onClick={()=>setProgTab("weekplan")}>WEEK PLAN</Btn>
            </div>

            {progTab==="weekplan" && (
              <ProgramWeekView
                viewWeek={progViewWeek}
                onWeekChange={setProgViewWeek}
                currentWeek={currentWeek}
                isSummer={progViewWeek <= BLOCK_BOUNDS[0].end}
              />
            )}

            {progTab==="program" && <>
              {/* Week stepper — replaces the summer/school banner, the 24-button week
                  grid and the phase banner (UI slim-down, 2026-10-17). */}
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:14,background:"var(--bg2)",
                border:`1px solid ${_phaseBanner.border}`,borderRadius:8,padding:"8px 10px"}}>
                <button aria-label="Previous week" disabled={week<=1} onClick={()=>saveWeek(Math.max(1,week-1))} style={{
                  width:36,height:36,borderRadius:6,border:"1px solid var(--border)",background:"var(--bg1)",
                  color:week<=1?"var(--text3)":"var(--text2)",fontSize:18,cursor:week<=1?"default":"pointer",flexShrink:0}}>‹</button>
                <div style={{flex:1,minWidth:0,textAlign:"center"}}>
                  <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:19,letterSpacing:0.8,color:_phaseBanner.color,lineHeight:1.15}}>
                    {`WEEK ${week} · ${(_headerWeekPlan?.focus || _phaseBanner.label || "").toUpperCase()}`}
                  </div>
                  <div style={{fontSize:10,color:"var(--text3)",fontFamily:"'DM Mono',monospace",marginTop:2}}>
                    {_headerWeekPlan?.load || _phaseBanner.sub}
                  </div>
                </div>
                <button aria-label="Next week" disabled={week>=BLOCK_BOUNDS.find(b=>b.block===3).end} onClick={()=>saveWeek(Math.min(BLOCK_BOUNDS.find(b=>b.block===3).end,week+1))} style={{
                  width:36,height:36,borderRadius:6,border:"1px solid var(--border)",background:"var(--bg1)",
                  color:week>=BLOCK_BOUNDS.find(b=>b.block===3).end?"var(--text3)":"var(--text2)",fontSize:18,cursor:week>=BLOCK_BOUNDS.find(b=>b.block===3).end?"default":"pointer",flexShrink:0}}>›</button>
              </div>

              {/* Day tabs */}
              {_b2Days ? (
                <div style={{display:"grid",gridTemplateColumns:`repeat(${_b2Days.length},1fr)`,gap:6,marginBottom:18}}>
                  {_b2Days.map((d,i)=>{
                    const active=dayIdx===i;
                    const logged=isDayLogged(d.id);
                    // "D1 Mon ⭐⭐⭐" -> short name "D1" + schedule "Mon ⭐⭐⭐"
                    const [short, ...rest] = d.label.split(" ");
                    return(
                      <div key={d.id} onClick={()=>setDayIdx(i)} style={{
                        padding:"8px 4px",borderRadius:8,cursor:"pointer",textAlign:"center",
                        border:`1px solid ${active?"var(--gold)":logged?"#5a9e6988":"var(--border)"}`,
                        background:active?"rgba(212,168,67,0.08)":logged?"#5a9e4511":"var(--bg1)",transition:"all 0.15s",
                        position:"relative",
                      }}>
                        {logged&&!active&&(
                          <div style={{position:"absolute",top:3,right:4,fontSize:8,color:"var(--green)",lineHeight:1}}>✓</div>
                        )}
                        <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:13,letterSpacing:1,
                          color:active?"var(--gold)":logged?"var(--green)":"var(--text2)"}}>{short}</div>
                        <div style={{fontSize:8,color:active?"#d4a84399":logged?"#5a9e6977":"var(--text3)",marginTop:1}}>{rest.join(" ")}</div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={{display:"grid",gridTemplateColumns:`repeat(${DAYS.length},1fr)`,gap:6,marginBottom:18}}>
                  {DAYS.map((d,i)=>{
                    const active=dayIdx===i;
                    const logged=isDayLogged(d.id);
                    const sl=SLEEP[d.sleep];
                    return(
                      <div key={d.id} onClick={()=>setDayIdx(i)} style={{
                        padding:"8px 4px",borderRadius:8,cursor:"pointer",textAlign:"center",
                        border:`1px solid ${active?d.color:logged?"#5a9e6988":"var(--border)"}`,
                        background:active?d.color+"14":logged?"#5a9e4511":"var(--bg1)",transition:"all 0.15s",
                        position:"relative",
                      }}>
                        {logged&&!active&&(
                          <div style={{position:"absolute",top:3,right:4,fontSize:8,color:"var(--green)",lineHeight:1}}>✓</div>
                        )}
                        <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:13,letterSpacing:1,
                          color:active?d.color:logged?"var(--green)":"var(--text2)"}}>{d.label}</div>
                        <div style={{fontSize:8,color:active?d.color+"99":logged?"#5a9e6977":"var(--text3)",marginTop:1}}>{d.schedule}</div>
                        <div style={{fontSize:7,color:sl.color,marginTop:2,letterSpacing:0.5}}>{sl.label}</div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Day header */}
              <div style={{marginBottom:14,padding:thisDayLogged?"10px 12px":"0",borderRadius:thisDayLogged?8:0,
                border:thisDayLogged?"1px solid #5a9e6944":"none",
                background:thisDayLogged?"#5a9e450a":"transparent",transition:"all 0.2s"}}>
                {_b2Day ? (
                  <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
                    <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:22,letterSpacing:0.3,color:"var(--gold)",lineHeight:1.2}}>
                      {_b2Day.primary}
                    </div>
                    {thisDayLogged&&(
                      <Tag color="var(--green)" bg="rgba(90,158,69,0.15)">LOGGED</Tag>
                    )}
                  </div>
                ) : _outlineOnly ? null : (
                  <>
                    <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap",marginBottom:8}}>
                      <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:24,letterSpacing:0.3,color:day.color,lineHeight:1.2}}>
                        {day.name}
                      </div>
                      {thisDayLogged&&(
                        <Tag color="var(--green)" bg="rgba(90,158,69,0.15)">LOGGED</Tag>
                      )}
                      {sleepMeta&&(
                        <Tag color={sleepMeta.color} bg={sleepMeta.bg}>{sleepMeta.label}</Tag>
                      )}
                      {day.maxLoad&&(
                        <Tag color="var(--gold)" bg="rgba(212,168,67,0.1)">GO HEAVY TODAY</Tag>
                      )}
                    </div>
                    <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                      {day.focus.map((f,i)=><Tag key={i} color={day.color} bg={day.color+"15"}>{f}</Tag>)}
                    </div>
                  </>
                )}
              </div>

              {/* Phase note — Block 1 only; Block 2+ shows the week's load in the stepper */}
              {_headerBlk.block===1 && <div style={{background:"var(--bg2)",border:"1px solid var(--border)",borderRadius:6,
                padding:"9px 12px",marginBottom:14,fontSize:11,color:"var(--text2)"}}>
                {_phaseBanner.note}
              </div>}

              {_outlineOnly ? (
                <div style={{background:"var(--bg2)",borderRadius:8,padding:"14px 16px",border:"1px solid var(--border)"}}>
                  <div style={{fontSize:10,color:"var(--text2)",lineHeight:1.7,marginBottom:10}}>
                    Block {_headerBlk.block} sessions are defined at week-level resolution.
                    Full per-day tables are added at the start of each block.
                  </div>
                  <div style={{fontSize:10,color:"var(--text3)"}}>
                    Reference: <span style={{color:"var(--text2)",fontFamily:"'DM Mono',monospace"}}>
                      summaries/complete_program.md → Part 3
                    </span>
                  </div>
                </div>
              ) : _b2Exercises ? (
                <>
                  {/* Granular Blocks 2–3 — real checkboxes and weight
                      dropdowns via ExCard, same as Block 1. Provenance lives
                      with the data: BLOCK2_EXERCISES (app.jsx, copied from
                      PROGRAM_B2) and BLOCK3_EXERCISES (program.js, adapted
                      from the General Cycle per the Block 3 design). */}
                  <div style={{background:"var(--bg2)",border:"1px solid var(--border)",borderRadius:6,
                    padding:"9px 12px",marginBottom:14,fontSize:11,color:"var(--text2)",lineHeight:1.6}}>
                    {_b2Day.notes}
                    {/* Empty-bar OHS warm-up, "at least 3 days/week" [E31.8] —
                        Mon already has OHS in the complex, so the other three
                        days carry it. Week 16 is the test week and skips it. */}
                    {_b2Day.id!=="d1" && week<=15 && (
                      <div style={{marginTop:6,color:"var(--gold)"}}>
                        Warm-up: overhead squat, a few triples with the empty bar, up to about 36 kg (half your 72 kg OHS) [E31.8].
                      </div>
                    )}
                  </div>
                  {(()=>{
                    const totalDone = Object.values(sessionProgress).reduce((a,b)=>a+(b.done||0),0);
                    const totalSets = _b2Exercises.reduce((acc, ex) => {
                      const count = typeof ex.sets === "number" ? ex.sets : parseInt(ex.sets) || 3;
                      return acc + count;
                    }, 0);
                    const pct = totalSets>0 ? Math.round((totalDone/totalSets)*100) : 0;
                    const allComplete = pct===100;
                    return (
                      <div style={{marginBottom:14,background:"var(--bg2)",borderRadius:8,padding:"10px 14px",
                        border:`1px solid ${allComplete?"#5a9e4444":"var(--border)"}`}}>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                          <span style={{fontSize:9,color:"var(--text2)",fontFamily:"'DM Mono',monospace",letterSpacing:1.5}}>
                            SESSION PROGRESS
                          </span>
                          <div style={{display:"flex",alignItems:"baseline",gap:6}}>
                            <span style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:22,
                              color:allComplete?"var(--green)":pct>0?"var(--gold)":"var(--text3)"}}>
                              {pct}%
                            </span>
                            <span style={{fontSize:10,color:"var(--text3)",fontFamily:"'DM Mono',monospace"}}>
                              {totalDone}/{totalSets} sets
                            </span>
                          </div>
                        </div>
                        <div style={{background:"var(--bg3)",borderRadius:20,height:6,overflow:"hidden"}}>
                          <div style={{
                            width:`${pct}%`,height:"100%",borderRadius:20,transition:"width 0.3s",
                            background:allComplete?"var(--green)":pct>50?"var(--gold)":"var(--blue)",
                          }}/>
                        </div>
                        {allComplete&&(
                          <button onClick={()=>{
                            const existingKey=Object.keys(logs).find(k=>{
                              const l=logs[k];
                              const m=l.dayLabel&&l.dayLabel.match(/(\d+)/);
                              return l.week===week&&m&&`d${m[1]}`===_b2Day.id;
                            });
                            if(existingKey){
                              const l=logs[existingKey];
                              setLogForm({dayId:_b2Day.id,date:l.date||new Date().toISOString().slice(0,10),notes:l.notes||"",weights:l.weights||"",backPain:l.backPain||"0",nightShift:l.nightShift||false,techniqueFeel:l.techniqueFeel||"",energyLevel:l.energyLevel||"",focusNext:l.focusNext||"",rating:l.rating||""});
                              setLogEditKey(existingKey);
                            }else{
                              setLogForm(f=>({...f,week:undefined,dayId:_b2Day.id,date:new Date().toISOString().slice(0,10)}));
                              setLogEditKey(null);
                            }
                            setLogModal(true);
                          }}
                            style={{width:"100%",marginTop:8,padding:"8px",borderRadius:6,border:"1px solid var(--green)",
                              background:"#5a9e4511",color:"var(--green)",fontSize:10,fontFamily:"'DM Mono',monospace",
                              letterSpacing:1,cursor:"pointer"}}>
                            ✓ COMPLETE SESSION
                          </button>
                        )}
                      </div>
                    );
                  })()}
                  <WarmupCard part="before" sessionKey={`w${week}_${_b2Day.id}`} forceReload={syncRevision}/>
                  {_b2Exercises.map((ex,i)=>ex.test ? (
                    <TestLiftCard key={`${week}_${_b2Day.id}_${ex.id}`} lift={ex} ladder={B2_TEST_LADDER}
                      sessionKey={`w${week}_${_b2Day.id}`} forceReload={syncRevision} onSetsChange={()=>setSetsVersion(v=>v+1)}
                      onProgress={(name,done,total)=>setSessionProgress(p=>({...p,[name]:{done,total}}))}
                      onNewPR={handleAutoPR}
                    />
                  ) : (
                    <ExCard key={`${week}_${_b2Day.id}_${ex.id}`} ex={ex} phase={1} sessionKey={`w${week}_${_b2Day.id}`} forceReload={syncRevision} onSetsChange={()=>setSetsVersion(v=>v+1)}
                      onProgress={(name,done,total)=>setSessionProgress(p=>({...p,[name]:{done,total}}))}
                      onNewPR={handleAutoPR}
                    />
                  ))}
                  <WarmupCard part="after" sessionKey={`w${week}_${_b2Day.id}`} forceReload={syncRevision}/>
                </>
              ) : _b2Day ? (
                <>
                  {/* Read-only day card — same text WEEK PLAN already renders
                      correctly. Block 2's `secondary` bundles several pieces
                      of accessory work into one string per day, not a clean
                      per-exercise list, so there's no per-set breakdown to
                      check off here — Block2DayToggle below is one
                      session-level complete/not-done state instead. Used
                      for any week without a BLOCK2_EXERCISES entry. All of
                      Block 2 (weeks 9-16) is wired, so this is now only a
                      fallback for future blocks. */}
                  <div style={{background:"var(--bg2)",borderRadius:8,padding:"12px 14px",marginBottom:8,border:"1px solid var(--border)"}}>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:8}}>
                      <div>
                        <div style={{fontSize:8,color:"var(--text3)",letterSpacing:1.5,fontFamily:"'DM Mono',monospace",marginBottom:3}}>PRIMARY</div>
                        <div style={{fontSize:13,fontWeight:600,lineHeight:1.4}}>{_b2Day.primary}</div>
                        <div style={{fontSize:12,color:"var(--blue)",fontFamily:"'DM Mono',monospace",marginTop:4}}>{_b2Day.load}</div>
                      </div>
                      <div>
                        <div style={{fontSize:8,color:"var(--text3)",letterSpacing:1.5,fontFamily:"'DM Mono',monospace",marginBottom:3}}>SECONDARY</div>
                        <div style={{fontSize:11,color:"var(--text2)",lineHeight:1.7}}>{_b2Day.secondary}</div>
                      </div>
                    </div>
                    <div style={{fontSize:11,color:"var(--text3)",borderTop:"1px solid var(--border)",paddingTop:8,fontStyle:"italic",lineHeight:1.6}}>
                      {_b2Day.notes}
                    </div>
                  </div>
                  <Block2DayToggle sessionKey={`w${week}_${_b2Day.id}`} forceReload={syncRevision} onSetsChange={()=>setSetsVersion(v=>v+1)}
                    onProgress={(name,done,total)=>setSessionProgress(p=>({...p,[name]:{done,total}}))}
                  />
                </>
              ) : _testDay ? (
                _testDay.lifts.length > 0 ? (
                  _testDay.lifts.map(lift => (
                    <TestLiftCard key={`${week}_${day.id}_${lift.id}`} lift={lift} ladder={_testDay.ladder}
                      sessionKey={`w${week}_${day.id}`} forceReload={syncRevision} onSetsChange={()=>setSetsVersion(v=>v+1)}
                      onProgress={(name,done,total)=>setSessionProgress(p=>({...p,[name]:{done,total}}))}
                      onNewPR={handleAutoPR}
                    />
                  ))
                ) : (
                  <div style={{background:"var(--bg2)",border:"1px solid var(--border)",borderRadius:8,
                    padding:"12px 14px",fontSize:12,color:"var(--text2)"}}>
                    {_testDay.restNote}
                  </div>
                )
              ) : (
                <>
                  {/* Session progress bar */}
                  {(()=>{
                    const totalDone = Object.values(sessionProgress).reduce((a,b)=>a+(b.done||0),0);
                    // Calculate total sets from ALL exercises in the day, not just reported ones
                    const totalSets = dayExercises.reduce((acc, ex) => {
                      const count = typeof ex.sets === "number" ? ex.sets :
                        ex.sets === "6–8" ? 7 : parseInt(ex.sets) || 3;
                      return acc + count;
                    }, 0);
                    const pct = totalSets>0 ? Math.round((totalDone/totalSets)*100) : 0;
                    const allComplete = pct===100;
                    return (
                      <div style={{marginBottom:14,background:"var(--bg2)",borderRadius:8,padding:"10px 14px",
                        border:`1px solid ${allComplete?"#5a9e4444":"var(--border)"}`}}>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                          <span style={{fontSize:9,color:"var(--text2)",fontFamily:"'DM Mono',monospace",letterSpacing:1.5}}>
                            SESSION PROGRESS
                          </span>
                          <div style={{display:"flex",alignItems:"baseline",gap:6}}>
                            <span style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:22,
                              color:allComplete?"var(--green)":pct>0?"var(--gold)":"var(--text3)"}}>
                              {pct}%
                            </span>
                            <span style={{fontSize:10,color:"var(--text3)",fontFamily:"'DM Mono',monospace"}}>
                              {totalDone}/{totalSets} sets
                            </span>
                          </div>
                        </div>
                        <div style={{background:"var(--bg3)",borderRadius:20,height:6,overflow:"hidden"}}>
                          <div style={{
                            width:`${pct}%`,height:"100%",borderRadius:20,transition:"width 0.3s",
                            background:allComplete?"var(--green)":pct>50?"var(--gold)":"var(--blue)",
                          }}/>
                        </div>
                        {allComplete&&(
                          <button onClick={()=>{
                            const existingKey=Object.keys(logs).find(k=>{
                              const l=logs[k];
                              const m=l.dayLabel&&l.dayLabel.match(/(\d+)/);
                              return l.week===week&&m&&`d${m[1]}`===day.id;
                            });
                            if(existingKey){
                              const l=logs[existingKey];
                              setLogForm({dayId:day.id,date:l.date||new Date().toISOString().slice(0,10),notes:l.notes||"",weights:l.weights||"",backPain:l.backPain||"0",nightShift:l.nightShift||false,techniqueFeel:l.techniqueFeel||"",energyLevel:l.energyLevel||"",focusNext:l.focusNext||"",rating:l.rating||""});
                              setLogEditKey(existingKey);
                            }else{
                              setLogForm(f=>({...f,week:undefined,dayId:day.id,date:new Date().toISOString().slice(0,10)}));
                              setLogEditKey(null);
                            }
                            setLogModal(true);
                          }}
                            style={{width:"100%",marginTop:8,padding:"8px",borderRadius:6,border:"1px solid var(--green)",
                              background:"#5a9e4511",color:"var(--green)",fontSize:10,fontFamily:"'DM Mono',monospace",
                              letterSpacing:1,cursor:"pointer"}}>
                            ✓ COMPLETE SESSION
                          </button>
                        )}
                      </div>
                    );
                  })()}

                  {/* Exercises */}
                  {dayExercises.map((ex,i)=>(
                    <ExCard key={`${week}_${day.id}_${ex.id}`} ex={ex} phase={phase} sessionKey={`w${week}_${day.id}`} forceReload={syncRevision} onSetsChange={()=>setSetsVersion(v=>v+1)}
                      onProgress={(name,done,total)=>setSessionProgress(p=>({...p,[name]:{done,total}}))}
                      onNewPR={handleAutoPR}
                    />
                  ))}
                </>
              )}

              {/* Complete session button */}
              <button onClick={()=>{
                const logDayId = _b2Day?.id || day.id;
                const existingKey=Object.keys(logs).find(k=>{
                  const l=logs[k];
                  const m=l.dayLabel&&l.dayLabel.match(/(\d+)/);
                  return l.week===week&&m&&`d${m[1]}`===logDayId;
                });
                if(existingKey){
                  const l=logs[existingKey];
                  setLogForm({dayId:logDayId,date:l.date||new Date().toISOString().slice(0,10),notes:l.notes||"",weights:l.weights||"",backPain:l.backPain||"0",nightShift:l.nightShift||false,techniqueFeel:l.techniqueFeel||"",energyLevel:l.energyLevel||"",focusNext:l.focusNext||"",rating:l.rating||""});
                  setLogEditKey(existingKey);
                }else{
                  setLogForm(f=>({...f,week:undefined,dayId:logDayId,date:new Date().toISOString().slice(0,10)}));
                  setLogEditKey(null);
                }
                setLogModal(true);
              }}
                style={{width:"100%",marginTop:16,marginBottom:4,padding:"13px",borderRadius:8,
                  border:"1px solid var(--gold)",background:"#d4a84311",
                  color:"var(--gold)",fontSize:12,fontFamily:"'DM Mono',monospace",
                  letterSpacing:1,cursor:"pointer"}}>
                COMPLETE SESSION
              </button>
            </>}
          </div>
        )}

        {/* ═══ EXERCISES ═══ */}
        {tab==="exercises" && <ExercisesTab/>}

        {/* ═══ MOBILITY ═══ */}
        {tab==="mobility" && <MobilityTab/>}


        {/* ═══ LOG ═══ */}
        {tab==="log" && (
          <LogCalendar logs={logs} week={week} onDelete={deleteLog} onEdit={(key, e)=>{
            setLogForm({dayId:logEntryDayId(e)||"d1",week:e.week,date:e.date||"",notes:e.notes||"",weights:e.weights||"",
              backPain:e.backPain||"0",nightShift:e.nightShift||false,techniqueFeel:e.techniqueFeel||"",
              energyLevel:e.energyLevel||"",focusNext:e.focusNext||"",rating:e.rating||""});
            setLogEditKey(key);setLogModal(true);
          }}/>
        )}
        {/* ═══ PRs ═══ */}
        {tab==="prs" && (
          <div className="fade">
            {/* The 10 lifts that matter (UI slim-down, 2026-10-17). Each row is the
                heaviest entry across the ids a lift has been stored under
                (program.js PR_ROWS / prRow); tap for its progression. Every other
                exercise's PRs are still detected and stored — only unlisted here.
                No reps column: auto-detected PRs are all stored as 1 rep. */}
            {PR_ROWS.map(row=>{
              const r=prRow(prs,row), open=prOpen===row.key;
              const chart=r.history.reduce((acc,h)=>{
                const prev=acc.length?acc[acc.length-1].weight:0;
                if(h.weight!=null&&h.weight>=prev) acc.push({date:h.date,weight:h.weight,label:(h.date||"").slice(5)});
                return acc;
              },[]);
              return(
                <div key={row.key} style={{background:"var(--bg1)",border:`1px solid ${open?"var(--gold)":"var(--border)"}`,borderRadius:8,marginBottom:6}}>
                  <div onClick={()=>setPrOpen(open?null:row.key)} style={{display:"flex",alignItems:"center",gap:10,padding:"11px 12px",cursor:"pointer"}}>
                    <span style={{flex:1,minWidth:0,fontFamily:"'Bebas Neue',sans-serif",fontSize:17,letterSpacing:0.4}}>{row.label}</span>
                    <span style={{fontFamily:"'DM Mono',monospace",fontSize:13,color:r.weight!=null?"var(--gold)":"var(--text3)"}}>{r.weight!=null?`${r.weight} kg`:"—"}</span>
                    <span style={{fontFamily:"'DM Mono',monospace",fontSize:9,color:"var(--text3)",width:70,textAlign:"right"}}>{r.date||""}</span>
                  </div>
                  {open&&(
                    <div data-pr-chart="" style={{padding:"0 12px 12px"}}>
                      {chart.length>1
                        ? <SVGLineChart data={chart} height={100} series={[{key:"weight",color:"#d4a843",label:`${row.label} (kg)`}]}/>
                        : <div style={{fontSize:11,color:"var(--text3)",fontFamily:"'DM Mono',monospace"}}>{chart.length?"One record so far — the chart starts with the next.":"No record yet."}</div>}
                    </div>
                  )}
                </div>
              );
            })}
            <div style={{margin:"12px 0"}}>
              <Btn small ghost={prTab!=="add"} active={prTab==="add"} onClick={()=>setPrTab(prTab==="add"?"list":"add")}>+ ADD PR</Btn>
            </div>
            {prTab==="add"&&(
              <Card>
                <div style={{marginBottom:12}}>
                  <label style={{fontSize:9,color:"var(--text3)",letterSpacing:2,fontFamily:"'DM Mono',monospace",display:"block",marginBottom:6}}>LIFT</label>
                  <Sel value={newPR.lift} onChange={e=>setNewPR(p=>({...p,lift:e.target.value}))}>
                    {PR_ALL.map(l=><option key={l} value={l}>{getEx(l)?.name || l}</option>)}
                  </Sel>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:16}}>
                  <div>
                    <label style={{fontSize:9,color:"var(--text3)",letterSpacing:2,fontFamily:"'DM Mono',monospace",display:"block",marginBottom:6}}>WEIGHT (KG)</label>
                    <Inp type="number" placeholder="0" value={newPR.weight} onChange={e=>setNewPR(p=>({...p,weight:e.target.value}))}/>
                  </div>
                  <div>
                    <label style={{fontSize:9,color:"var(--text3)",letterSpacing:2,fontFamily:"'DM Mono',monospace",display:"block",marginBottom:6}}>REPS</label>
                    <Inp type="number" placeholder="1" value={newPR.reps} onChange={e=>setNewPR(p=>({...p,reps:e.target.value}))}/>
                  </div>
                </div>
                <Btn onClick={handleAddPR}>SAVE RECORD</Btn>
              </Card>
            )}
          </div>
        )}

        {/* ═══ SYSTEM ═══ */}
        {tab==="system" && <SystemTab week={week}/>}

        {/* ═══ SETTINGS ═══ */}
        {tab==="settings" && (
          <div className="fade">

            {/* Data backup */}
            <div style={{marginTop:20,background:"#080f08",border:"1px solid #1a3a1a",borderRadius:8,padding:"14px"}}>
              <div style={{fontFamily:"'DM Mono',monospace",fontSize:9,color:"var(--green)",letterSpacing:1.5,marginBottom:10}}>
                💾 DATA BACKUP
              </div>
              <p style={{fontSize:11,color:"#556",lineHeight:1.7,marginBottom:12}}>
                Export your data before any app update. Import it back after to restore everything — PRs, logs, session weights, supplement notes.
              </p>
              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                <Btn small onClick={()=>{
                  const data = {
                    version:1,
                    exported: new Date().toISOString(),
                    oly_prs: prs,
                    oly_logs: logs,
                    oly_week: week,
                    oly_supp_history: suppChecked,
                    oly_supp_notes: suppNotes,
                  };
                  const blob = new Blob([JSON.stringify(data,null,2)], {type:"application/json"});
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `olytracker_backup_${new Date().toISOString().slice(0,10)}.json`;
                  a.click();
                  URL.revokeObjectURL(url);
                  showToast("Data exported ✓");
                }} style={{background:"var(--green)",color:"#000"}}>⬇ EXPORT DATA</Btn>

                <label style={{
                  background:"transparent",color:"var(--text2)",border:"1px solid var(--border2)",
                  borderRadius:5,cursor:"pointer",fontFamily:"'DM Sans',sans-serif",fontWeight:600,
                  letterSpacing:0.5,padding:"6px 14px",fontSize:11,display:"inline-block",
                }}>
                  ⬆ IMPORT DATA
                  <input type="file" accept=".json" style={{display:"none"}} onChange={async e=>{
                    const file = e.target.files[0];
                    if(!file) return;
                    try {
                      const text = await file.text();
                      const data = JSON.parse(text);
                      if(data.version !== 1) { showToast("❌ Invalid backup file"); return; }
                      if(data.oly_prs) { const m=migratePRs(data.oly_prs); setPrs(m); await storage.set("oly_prs",JSON.stringify(m)); }
                      if(data.oly_logs) { setLogs(data.oly_logs); await storage.set("oly_logs",JSON.stringify(data.oly_logs)); }
                      if(data.oly_week) { setWeek(data.oly_week); await storage.set("oly_week",JSON.stringify(data.oly_week)); }
                      if(data.oly_supp_history) { setSuppHistory(data.oly_supp_history); await storage.set("oly_supp_history",JSON.stringify(data.oly_supp_history)); }
                      if(data.oly_supp_notes !== undefined) { setSuppNotes(data.oly_supp_notes); await storage.set("oly_supp_notes",data.oly_supp_notes); }
                      showToast("✓ Data restored successfully");
                      e.target.value = "";
                    } catch(err) {
                      showToast("❌ Failed to import — invalid file");
                    }
                  }}/>
                </label>
              </div>

              {/* Supabase Sync */}
              <div style={{marginTop:12,background:"#0a0a1a",border:`1px solid ${sbSync.ready?"#2a4a6a":"#2a2a4a"}`,borderRadius:8,padding:"14px"}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
                  <div style={{fontFamily:"'DM Mono',monospace",fontSize:9,color:"var(--blue)",letterSpacing:1.5}}>
                    🔄 CLOUD SYNC (SUPABASE)
                  </div>
                  <div style={{display:"flex",alignItems:"center",gap:6}}>
                    <div style={{width:6,height:6,borderRadius:"50%",background:sbSync.ready?"var(--green)":"var(--border2)"}}/>
                    <span style={{fontSize:9,color:"var(--text3)",fontFamily:"'DM Mono',monospace"}}>
                      {sbSync.ready?"AUTO-SYNC ON":"OFFLINE"}
                    </span>
                  </div>
                </div>
                <p style={{fontSize:11,color:"var(--text2)",lineHeight:1.7}}>
                  {sbSync.ready
                    ? "Sessions, sets and reviews sync automatically to Supabase on every change, and pull on startup — across PC and phone. No action needed."
                    : "Supabase is not configured (key.js missing). Data is saved locally only. Use Export/Import above to move data between devices."}
                </p>
              </div>
            </div>

            <SyncSection />

          </div>
        )}

      </div>

    {/* ═══ LOG MODAL ═══ */}
    {logModal && (
      <div onClick={e=>{if(e.target===e.currentTarget)closeLogModal();}}
        style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.7)",zIndex:200,overflowY:"auto",padding:"20px 16px 40px"}}>
        <div style={{maxWidth:480,margin:"0 auto",background:"var(--bg1)",borderRadius:12,
          border:"1px solid var(--border)",padding:"20px 16px"}}>

          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
            <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:20,letterSpacing:0.5,color:"var(--gold)"}}>
              {logEditKey ? "EDIT SESSION" : "COMPLETE SESSION"}
            </div>
            <button onClick={closeLogModal}
              style={{background:"transparent",border:"none",color:"var(--text3)",fontSize:22,cursor:"pointer",lineHeight:1}}>×</button>
          </div>

          {/* Date */}
          <div style={{marginBottom:12}}>
            <label style={{fontSize:9,color:"var(--text3)",letterSpacing:2,fontFamily:"'DM Mono',monospace",display:"block",marginBottom:6}}>DATE</label>
            <Inp type="date" value={logForm.date} onChange={e=>setLogForm(f=>({...f,date:e.target.value}))} style={{colorScheme:"dark"}}/>
          </div>

          {/* Session */}
          <div style={{marginBottom:12}}>
            <label style={{fontSize:9,color:"var(--text3)",letterSpacing:2,fontFamily:"'DM Mono',monospace",display:"block",marginBottom:6}}>SESSION</label>
            <Sel value={logForm.dayId} onChange={e=>setLogForm(f=>({...f,dayId:e.target.value}))}>
              {(()=>{const mw=logForm.week??week, md=blockFor(mw)?.block!==1?weekPlan(mw)?.days:null;
                return md
                  ? md.map(d=><option key={d.id} value={d.id}>{d.label} — {d.primary}</option>)
                  : (mw<=BLOCK_BOUNDS[0].end?DAYS_SUMMER:DAYS_SCHOOL).map(d=><option key={d.id} value={d.id}>{d.label} — {d.schedule} — {d.name}</option>);})()}
            </Sel>
          </div>

          {/* Weights */}
          <div style={{marginBottom:12}}>
            <label style={{fontSize:9,color:"var(--text3)",letterSpacing:2,fontFamily:"'DM Mono',monospace",display:"block",marginBottom:6}}>WEIGHTS USED</label>
            <Inp placeholder="e.g. BS single: 112kg · OHS: 45kg"
              value={logForm.weights} onChange={e=>setLogForm(f=>({...f,weights:e.target.value}))}/>
          </div>

          {/* Post-training review */}
          <div style={{fontSize:9,color:"var(--text2)",letterSpacing:2,fontFamily:"'DM Mono',monospace",marginBottom:8,marginTop:4}}>POST-TRAINING REVIEW</div>

          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
            <div>
              <label style={{fontSize:9,color:"var(--text3)",letterSpacing:1.5,fontFamily:"'DM Mono',monospace",display:"block",marginBottom:6}}>TECHNIQUE FEEL</label>
              <Sel value={logForm.techniqueFeel} onChange={e=>setLogForm(f=>({...f,techniqueFeel:e.target.value}))}>
                <option value="">— select</option>
                <option value="Clicked">✅ Clicked</option>
                <option value="Decent">👍 Decent</option>
                <option value="Inconsistent">⚠️ Inconsistent</option>
                <option value="Off today">❌ Off today</option>
              </Sel>
            </div>
            <div>
              <label style={{fontSize:9,color:"var(--text3)",letterSpacing:1.5,fontFamily:"'DM Mono',monospace",display:"block",marginBottom:6}}>ENERGY LEVEL</label>
              <Sel value={logForm.energyLevel} onChange={e=>setLogForm(f=>({...f,energyLevel:e.target.value}))}>
                <option value="">— select</option>
                <option value="High">🔥 High</option>
                <option value="Normal">💪 Normal</option>
                <option value="Low">😴 Low</option>
                <option value="Post-shift">🌙 Post-shift</option>
              </Sel>
            </div>
          </div>

          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
            <div>
              <label style={{fontSize:9,color:"var(--text3)",letterSpacing:1.5,fontFamily:"'DM Mono',monospace",display:"block",marginBottom:6}}>BACK PAIN (0–10)</label>
              <Inp type="number" min="0" max="10" placeholder="0"
                value={logForm.backPain} onChange={e=>setLogForm(f=>({...f,backPain:e.target.value}))}/>
            </div>
            <div>
              <label style={{fontSize:9,color:"var(--text3)",letterSpacing:1.5,fontFamily:"'DM Mono',monospace",display:"block",marginBottom:6}}>POST NIGHT SHIFT?</label>
              <Sel value={logForm.nightShift} onChange={e=>setLogForm(f=>({...f,nightShift:e.target.value==="true"}))}>
                <option value="false">No</option>
                <option value="true">Yes — 5.5h sleep</option>
              </Sel>
            </div>
          </div>

          <div style={{marginBottom:12}}>
            <label style={{fontSize:9,color:"var(--text3)",letterSpacing:1.5,fontFamily:"'DM Mono',monospace",display:"block",marginBottom:6}}>FOCUS NEXT SESSION</label>
            <Sel value={logForm.focusNext} onChange={e=>setLogForm(f=>({...f,focusNext:e.target.value}))}>
              <option value="">— select</option>
              <option value="Nothing — felt good">✅ Nothing — felt good</option>
              <option value="Bar path">📐 Bar path</option>
              <option value="Hip position">🦵 Hip position</option>
              <option value="Receiving position">📥 Receiving position</option>
              <option value="Jerk dip">⬇️ Jerk dip</option>
              <option value="Overhead lockout">🔒 Overhead lockout</option>
              <option value="First pull off floor">🏋️ First pull off floor</option>
              <option value="Footwork">👣 Footwork</option>
              <option value="OHS depth">📐 OHS depth</option>
            </Sel>
          </div>

          {/* Rating */}
          <div style={{marginBottom:14}}>
            <label style={{fontSize:9,color:"var(--text3)",letterSpacing:1.5,fontFamily:"'DM Mono',monospace",display:"block",marginBottom:8}}>SESSION RATING</label>
            <div style={{display:"flex",gap:8}}>
              {[1,2,3,4,5].map(n=>{
                const stars="⭐".repeat(n);
                return(
                  <button key={n} onClick={()=>setLogForm(f=>({...f,rating:stars}))} style={{
                    flex:1,padding:"8px 4px",borderRadius:5,cursor:"pointer",fontSize:12,border:"none",
                    background:logForm.rating===stars?"var(--gold)":"var(--bg2)",
                    color:logForm.rating===stars?"#000":"var(--text3)",
                  }}>{n}</button>
                );
              })}
            </div>
          </div>

          {/* Notes */}
          <div style={{marginBottom:16}}>
            <label style={{fontSize:9,color:"var(--text3)",letterSpacing:1.5,fontFamily:"'DM Mono',monospace",display:"block",marginBottom:6}}>NOTES</label>
            <Tex placeholder="Cues, observations, PR attempts…"
              value={logForm.notes} onChange={e=>setLogForm(f=>({...f,notes:e.target.value}))}/>
          </div>

          <Btn onClick={handleLog}>LOG SESSION</Btn>
        </div>
      </div>
    )}
    </div>
  );
}

class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { err: null }; }
  static getDerivedStateFromError(e) { return { err: e }; }
  componentDidCatch(e) { console.error('OlyTracker crash:', e); }
  render() {
    if (this.state.err) return (
      <div style={{padding:24,fontFamily:"'DM Mono',monospace",color:"#c94f3a",fontSize:12,lineHeight:1.7}}>
        <div style={{marginBottom:8,fontSize:14,fontWeight:"bold"}}>⚠ Something went wrong</div>
        <div style={{marginBottom:16,color:"#888"}}>{String(this.state.err)}</div>
        <button onClick={()=>this.setState({err:null})}
          style={{padding:"8px 16px",borderRadius:6,border:"1px solid #c94f3a",background:"transparent",
            color:"#c94f3a",cursor:"pointer",fontFamily:"'DM Mono',monospace",fontSize:11}}>
          TRY AGAIN
        </button>
      </div>
    );
    return this.props.children;
  }
}

const root=ReactDOM.createRoot(document.getElementById('root'));
root.render(<ErrorBoundary><OlyTracker/></ErrorBoundary>);
