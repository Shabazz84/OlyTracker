# Exercise Catalog Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace all string-based exercise references with a centralized `EXERCISE_CATALOG` keyed by slug, migrate all existing localStorage and Supabase data, and add an EXERCISES tab for browsing the catalog.

**Architecture:** `EXERCISE_CATALOG` (flat slug-keyed object) + `getEx(id)` resolver defined before `DAYS_SUMMER`. `DAYS_SUMMER` entries reference exercises by `id` only. All localStorage keys, Supabase rows, PR history, and analytics use slugs. One-time startup migration handles existing data. New EXERCISES tab provides catalog UI.

**Tech Stack:** Plain HTML/JS, React 18 + Babel standalone, localStorage, Supabase JS v2 (already integrated). No build step — all changes to `docs/index.html`.

---

## Files

| File | Change |
|---|---|
| `docs/index.html` | Main — all code changes |
| `docs/schema_migration_exercises.sql` | Create — Supabase migration SQL (run once in dashboard) |

---

## Task 1: EXERCISE_CATALOG + helpers

**Files:**
- Modify: `docs/index.html` — add before `TYPE_META` (around line 590)

- [ ] **Step 1: Add EXERCISE_CATALOG, getEx, and EXERCISE_NAME_TO_SLUG**

Find this line in `docs/index.html`:
```javascript
const TYPE_META = {
```

Insert the following block immediately before it:

```javascript
// ── Exercise Catalog ──────────────────────────────────────────────────────────
const EXERCISE_CATALOG = {
  // ── In program ────────────────────────────────────────────────────────────
  muscle_snatch:          { id:'muscle_snatch',          name:'Muscle Snatch',               type:'snatch'    },
  hang_power_snatch:      { id:'hang_power_snatch',      name:'Hang Power Snatch',           type:'snatch'    },
  snatch_balance:         { id:'snatch_balance',         name:'Snatch Balance',              type:'snatch'    },
  overhead_squat:         { id:'overhead_squat',         name:'Overhead Squat',              type:'snatch'    },
  sots_press:             { id:'sots_press',             name:'Sots Press',                  type:'snatch'    },
  hang_power_clean:       { id:'hang_power_clean',       name:'Hang Power Clean',            type:'cj'        },
  clean_pull:             { id:'clean_pull',             name:'Clean Pull',                  type:'cj'        },
  jerk_from_rack:         { id:'jerk_from_rack',         name:'Jerk from Rack',              type:'cj'        },
  push_press:             { id:'push_press',             name:'Push Press',                  type:'cj'        },
  clean_and_jerk:         { id:'clean_and_jerk',         name:'Clean & Jerk',                type:'cj'        },
  back_squat:             { id:'back_squat',             name:'Back Squat',                  type:'strength'  },
  front_squat:            { id:'front_squat',            name:'Front Squat',                 type:'strength'  },
  klokov_squat:           { id:'klokov_squat',           name:'Klokov Squat',                type:'strength'  },
  berestov_squat:         { id:'berestov_squat',         name:'Berestov Squat',              type:'strength'  },
  rdl:                    { id:'rdl',                    name:'Romanian Deadlift',            type:'strength'  },
  good_morning:           { id:'good_morning',           name:'Good Morning',                type:'strength'  },
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
  plank:                  { id:'plank',                  name:'Plank',                       type:'accessory' },
  ab_wheel:               { id:'ab_wheel',               name:'Ab Wheel / Rollout',          type:'accessory' },
  // ── Snatch variations ─────────────────────────────────────────────────────
  snatch:                      { id:'snatch',                      name:'Snatch',                       type:'snatch' },
  power_snatch:                { id:'power_snatch',                name:'Power Snatch',                 type:'snatch' },
  hang_snatch:                 { id:'hang_snatch',                 name:'Hang Snatch',                  type:'snatch' },
  snatch_from_blocks:          { id:'snatch_from_blocks',          name:'Snatch from Blocks',           type:'snatch' },
  snatch_pull:                 { id:'snatch_pull',                 name:'Snatch Pull',                  type:'snatch' },
  snatch_high_pull:            { id:'snatch_high_pull',            name:'Snatch High Pull',             type:'snatch' },
  snatch_deadlift:             { id:'snatch_deadlift',             name:'Snatch Deadlift',              type:'snatch' },
  drop_snatch:                 { id:'drop_snatch',                 name:'Drop Snatch',                  type:'snatch' },
  tall_snatch:                 { id:'tall_snatch',                 name:'Tall Snatch',                  type:'snatch' },
  pause_snatch:                { id:'pause_snatch',                name:'Pause Snatch',                 type:'snatch' },
  tempo_snatch:                { id:'tempo_snatch',                name:'Tempo Snatch',                 type:'snatch' },
  deficit_snatch:              { id:'deficit_snatch',              name:'Deficit Snatch',               type:'snatch' },
  snatch_pull_from_blocks:     { id:'snatch_pull_from_blocks',     name:'Snatch Pull from Blocks',      type:'snatch' },
  heaving_snatch_balance:      { id:'heaving_snatch_balance',      name:'Heaving Snatch Balance',       type:'snatch' },
  pressing_snatch_balance:     { id:'pressing_snatch_balance',     name:'Pressing Snatch Balance',      type:'snatch' },
  // ── Clean variations ──────────────────────────────────────────────────────
  clean:                  { id:'clean',                  name:'Clean',                       type:'cj' },
  power_clean:            { id:'power_clean',            name:'Power Clean',                 type:'cj' },
  hang_clean:             { id:'hang_clean',             name:'Hang Clean',                  type:'cj' },
  clean_from_blocks:      { id:'clean_from_blocks',      name:'Clean from Blocks',           type:'cj' },
  muscle_clean:           { id:'muscle_clean',           name:'Muscle Clean',                type:'cj' },
  tall_clean:             { id:'tall_clean',             name:'Tall Clean',                  type:'cj' },
  pause_clean:            { id:'pause_clean',            name:'Pause Clean',                 type:'cj' },
  tempo_clean:            { id:'tempo_clean',            name:'Tempo Clean',                 type:'cj' },
  deficit_clean:          { id:'deficit_clean',          name:'Deficit Clean',               type:'cj' },
  clean_deadlift:         { id:'clean_deadlift',         name:'Clean Deadlift',              type:'cj' },
  clean_pull_from_blocks: { id:'clean_pull_from_blocks', name:'Clean Pull from Blocks',      type:'cj' },
  clean_high_pull:        { id:'clean_high_pull',        name:'Clean High Pull',             type:'cj' },
  // ── Jerk variations ───────────────────────────────────────────────────────
  power_jerk:             { id:'power_jerk',             name:'Power Jerk',                  type:'cj' },
  split_jerk:             { id:'split_jerk',             name:'Split Jerk',                  type:'cj' },
  tall_jerk:              { id:'tall_jerk',              name:'Tall Jerk',                   type:'cj' },
  pause_jerk:             { id:'pause_jerk',             name:'Pause Jerk',                  type:'cj' },
  jerk_balance:           { id:'jerk_balance',           name:'Jerk Balance',                type:'cj' },
  back_jerk:              { id:'back_jerk',              name:'Back Jerk',                   type:'cj' },
  jerk_from_blocks:       { id:'jerk_from_blocks',       name:'Jerk from Blocks',            type:'cj' },
  push_jerk:              { id:'push_jerk',              name:'Push Jerk',                   type:'cj' },
  // ── Squat variations ──────────────────────────────────────────────────────
  pause_back_squat:       { id:'pause_back_squat',       name:'Pause Back Squat',            type:'strength' },
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
  strict_press:           { id:'strict_press',           name:'Strict Press',                type:'strength' },
  bench_press:            { id:'bench_press',            name:'Bench Press',                 type:'strength' },
  decline_bench_press:    { id:'decline_bench_press',    name:'Decline Bench Press',         type:'strength' },
  landmine_press:         { id:'landmine_press',         name:'Landmine Press',              type:'strength' },
  dumbbell_press:         { id:'dumbbell_press',         name:'Dumbbell Press',              type:'strength' },
  dumbbell_incline_press: { id:'dumbbell_incline_press', name:'Dumbbell Incline Press',      type:'strength' },
  // ── Upper — pull ──────────────────────────────────────────────────────────
  pull_up:                { id:'pull_up',                name:'Pull Up',                     type:'strength' },
  lat_pulldown:           { id:'lat_pulldown',           name:'Lat Pulldown',                type:'strength' },
  barbell_row:            { id:'barbell_row',            name:'Barbell Row',                 type:'strength' },
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
};

function getEx(id) { return EXERCISE_CATALOG[id]; }

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
```

- [ ] **Step 2: Verify the block was inserted correctly**

Open `docs/index.html` in a browser. Open the console and run:
```javascript
getEx('back_squat')
// Expected: { id: 'back_squat', name: 'Back Squat', type: 'strength' }
getEx('muscle_snatch')
// Expected: { id: 'muscle_snatch', name: 'Muscle Snatch', type: 'snatch' }
Object.keys(EXERCISE_CATALOG).length
// Expected: 128
```

- [ ] **Step 3: Commit**

```bash
git add docs/index.html
git commit -m "feat: add EXERCISE_CATALOG, getEx, and name-to-slug migration maps"
```

---

## Task 2: Supabase SQL migration

**Files:**
- Create: `docs/schema_migration_exercises.sql`

- [ ] **Step 1: Create the SQL migration file**

Create `docs/schema_migration_exercises.sql` with this exact content:

```sql
-- Exercise Catalog Migration
-- Run in Supabase SQL Editor BEFORE deploying the new app code.
-- Safe to run on live data — inserts new rows, deletes old ones, no data loss.

-- Step 1: Add exercise_id column
ALTER TABLE sets ADD COLUMN IF NOT EXISTS exercise_id text;

-- Step 2: Populate exercise_id from exercise_name via slug mapping
UPDATE sets SET exercise_id = CASE exercise_name
  WHEN 'Muscle_Snatch'                      THEN 'muscle_snatch'
  WHEN 'Muscle_Snatch_(opener)'             THEN 'muscle_snatch'
  WHEN 'Hang_Power_Snatch'                  THEN 'hang_power_snatch'
  WHEN 'Back_Squat'                         THEN 'back_squat'
  WHEN 'Back_Squat_—_Daily_Max_Single'      THEN 'back_squat'
  WHEN 'Overhead_Squat'                     THEN 'overhead_squat'
  WHEN 'Good_Morning'                       THEN 'good_morning'
  WHEN 'Weighted_Pull_Up'                   THEN 'weighted_pull_up'
  WHEN 'GHR_(Glute_Ham_Raise)'             THEN 'ghr'
  WHEN 'Hang_Power_Clean'                   THEN 'hang_power_clean'
  WHEN 'Clean_Pull'                         THEN 'clean_pull'
  WHEN 'Incline_Barbell_Press'             THEN 'incline_barbell_press'
  WHEN 'Weighted_Parallel_Bar_Dips'        THEN 'weighted_dips'
  WHEN 'Klokov_Trapi'                      THEN 'klokov_trapi'
  WHEN 'Wide_Overhead_Press'               THEN 'wide_overhead_press'
  WHEN 'Dead_Bug'                          THEN 'dead_bug'
  WHEN 'Snatch_Balance'                    THEN 'snatch_balance'
  WHEN 'Front_Squat'                       THEN 'front_squat'
  WHEN 'Front_Squat_—_Daily_Max_Single'    THEN 'front_squat'
  WHEN 'RDL_Pull'                          THEN 'rdl'
  WHEN 'Plank'                             THEN 'plank'
  WHEN 'Jerk_from_Rack_—_Daily_Max_Single' THEN 'jerk_from_rack'
  WHEN 'Push_Press'                        THEN 'push_press'
  WHEN 'Clean_&_Jerk'                      THEN 'clean_and_jerk'
  WHEN 'Sots_Press'                        THEN 'sots_press'
  WHEN 'Behind_Neck_Press'                 THEN 'behind_neck_press'
  WHEN 'Pallof_Press'                      THEN 'pallof_press'
  WHEN 'Klokov_Squat_—_Singles'           THEN 'klokov_squat'
  WHEN 'Berestov_Squat'                    THEN 'berestov_squat'
  WHEN 'Lunge_(Barbell)'                   THEN 'lunge'
  WHEN 'Face_Pull'                         THEN 'face_pull'
  WHEN 'Ab_Wheel_/_Rollout'                THEN 'ab_wheel'
  ELSE exercise_name
END
WHERE exercise_id IS NULL;

-- Step 3: Rebuild row IDs to use slug-based format
-- New ID format: sets_w{week}_{day_id}_{exercise_id}_{set_index}
-- Insert new rows with slug-based IDs
INSERT INTO sets (id, week, day_id, exercise_id, set_index, done, weight, updated_at)
SELECT
  CONCAT('sets_w', week, '_', day_id, '_', exercise_id, '_', set_index),
  week, day_id, exercise_id, set_index, done, weight, updated_at
FROM sets
WHERE id != CONCAT('sets_w', week, '_', day_id, '_', exercise_id, '_', set_index)
ON CONFLICT (id) DO NOTHING;

-- Step 4: Delete old rows with name-based IDs
DELETE FROM sets
WHERE id != CONCAT('sets_w', week, '_', day_id, '_', exercise_id, '_', set_index);

-- Step 5: Make exercise_id NOT NULL and drop old column
ALTER TABLE sets ALTER COLUMN exercise_id SET NOT NULL;
ALTER TABLE sets DROP COLUMN IF EXISTS exercise_name;

-- Step 6: Update index
DROP INDEX IF EXISTS idx_sets_week_day_exercise;
CREATE INDEX idx_sets_week_day_exercise ON sets(week, day_id, exercise_id);
```

- [ ] **Step 2: Run the migration in Supabase dashboard**

Go to your Supabase project → SQL Editor → New query. Paste and run the full contents of `docs/schema_migration_exercises.sql`.

Expected: No errors. Check the `sets` table in Table Editor — the `exercise_name` column should be gone, replaced by `exercise_id` with slug values.

- [ ] **Step 3: Verify in Supabase Table Editor**

Open Table Editor → `sets`. Confirm:
- `exercise_id` column exists with slug values (e.g. `back_squat`, `muscle_snatch`)
- `exercise_name` column is gone
- Row IDs now use slug format: `sets_w1_d1_back_squat_0`

- [ ] **Step 4: Commit**

```bash
git add docs/schema_migration_exercises.sql
git commit -m "feat: add supabase exercise_id migration SQL"
```

---

## Task 3: In-app migration (localStorage + PR keys)

**Files:**
- Modify: `docs/index.html` — add migration functions, call at startup

- [ ] **Step 1: Add migration functions**

Find this line in `docs/index.html` (the `rebuildPRsFromLogs` function, around line 3616):
```javascript
function rebuildPRsFromLogs(currentPrs, currentLogs){
```

Insert the following two functions immediately before it:

```javascript
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
```

- [ ] **Step 2: Call migrations at startup**

Find the `load()` function startup block. Locate this comment/line (around line 3739):
```javascript
      // Pull from Supabase on startup
      if (sbSync.ready) {
```

Insert the two migration calls immediately before it:

```javascript
      migrateExerciseKeysV1();
      migratePRKeysV1();
      // Pull from Supabase on startup
      if (sbSync.ready) {
```

- [ ] **Step 3: Verify migration runs once**

Open app in browser. Open DevTools → Application → Local Storage.
- Look for `oly_ex_migration_v1` key with value `'1'` — should appear after first load.
- Look for `oly_pr_migration_v1` key with value `'1'`.
- Any `sets_` keys should now use slugs (e.g. `sets_w1_d1_back_squat`) not old names.

Refresh — the migration flags prevent it from running again.

- [ ] **Step 4: Commit**

```bash
git add docs/index.html
git commit -m "feat: add one-time exercise key and PR key migrations on startup"
```

---

## Task 4: Refactor DAYS_SUMMER — use exercise IDs

**Files:**
- Modify: `docs/index.html` — DAYS_SUMMER definition (lines ~373–443)

- [ ] **Step 1: Replace DAYS_SUMMER exercises with id-only entries**

Find the `DAYS_SUMMER` definition. Replace every exercise entry to use `id` instead of `name`/`type`/`note`. Remove `type` and `note` entirely. Keep `sets`, `reps`, `l1`, `l2` as-is.

Replace the entire `DAYS_SUMMER` array with:

```javascript
const DAYS_SUMMER = [
  {
    id:"d1", label:"DAY 1", name:"Snatch + Posterior Chain",
    schedule:"Monday", color:"#4a90d9", sleep:"full",
    maxLoad: true,
    focus:["Snatch technique","Back Squat daily max single","Posterior chain"],
    exercises:[
      {id:"muscle_snatch",         sets:2,     reps:"3",      l1:"42–46 kg",   l2:"44–48 kg"  },
      {id:"hang_power_snatch",     sets:5,     reps:"3",      l1:"50–56 kg",   l2:"54–60 kg"  },
      {id:"back_squat",            sets:"4–6", reps:"1",      l1:"95–118 kg",  l2:"100–120 kg"},
      {id:"overhead_squat",        sets:4,     reps:"3",      l1:"40–48 kg",   l2:"46–54 kg"  },
      {id:"good_morning",          sets:4,     reps:"8",      l1:"50–60 kg",   l2:"55–65 kg"  },
      {id:"weighted_pull_up",      sets:4,     reps:"6–8",    l1:"BW+5 kg",    l2:"BW+8 kg"   },
      {id:"ghr",                   sets:3,     reps:"8",      l1:"5–10 kg",    l2:"8–12 kg"   },
    ]
  },
  {
    id:"d2", label:"DAY 2", name:"Clean + Upper Hypertrophy",
    schedule:"Tuesday", color:"#c94f3a", sleep:"full",
    maxLoad: true,
    focus:["Clean technique","Upper back hypertrophy","Chest work"],
    exercises:[
      {id:"muscle_snatch",         sets:2,     reps:"3",      l1:"42–46 kg",   l2:"44–48 kg"  },
      {id:"hang_power_clean",      sets:5,     reps:"3",      l1:"58–65 kg",   l2:"63–70 kg"  },
      {id:"clean_pull",            sets:4,     reps:"4",      l1:"85–95 kg",   l2:"90–100 kg" },
      {id:"incline_barbell_press", sets:4,     reps:"8",      l1:"58–68 kg",   l2:"63–73 kg"  },
      {id:"weighted_dips",         sets:4,     reps:"8",      l1:"BW+20 kg",   l2:"BW+25 kg"  },
      {id:"klokov_trapi",          sets:4,     reps:"8",      l1:"55–62 kg",   l2:"60–67 kg"  },
      {id:"wide_overhead_press",   sets:4,     reps:"6",      l1:"35–42 kg",   l2:"40–47 kg"  },
      {id:"dead_bug",              sets:3,     reps:"10/side",l1:"BW",         l2:"BW"        },
    ]
  },
  {
    id:"d3", label:"DAY 3", name:"Front Squat + Posterior Chain",
    schedule:"Wednesday", color:"#4a90d9", sleep:"good",
    maxLoad: false,
    focus:["Front Squat daily max single","Posterior chain","OHS stability"],
    exercises:[
      {id:"muscle_snatch",         sets:2,     reps:"3",      l1:"42–46 kg",   l2:"44–48 kg"  },
      {id:"snatch_balance",        sets:3,     reps:"3",      l1:"35–42 kg",   l2:"40–48 kg"  },
      {id:"front_squat",           sets:"4–6", reps:"1",      l1:"82–102 kg",  l2:"88–108 kg" },
      {id:"rdl",                   sets:4,     reps:"6",      l1:"75–85 kg",   l2:"80–90 kg"  },
      {id:"ghr",                   sets:3,     reps:"10",     l1:"BW",         l2:"5–8 kg"    },
      {id:"overhead_squat",        sets:4,     reps:"4",      l1:"40–48 kg",   l2:"46–54 kg"  },
      {id:"plank",                 sets:3,     reps:"50s",    l1:"BW",         l2:"BW"        },
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
      {id:"push_press",            sets:4,     reps:"5",      l1:"50–56 kg",   l2:"54–60 kg"  },
      {id:"clean_and_jerk",        sets:4,     reps:"1+2",    l1:"55–62 kg",   l2:"58–65 kg"  },
      {id:"sots_press",            sets:3,     reps:"5",      l1:"25–30 kg",   l2:"28–33 kg"  },
      {id:"behind_neck_press",     sets:3,     reps:"6",      l1:"35–42 kg",   l2:"40–46 kg"  },
      {id:"pallof_press",          sets:3,     reps:"10/side",l1:"Light",      l2:"Light-Med" },
    ]
  },
  {
    id:"d5", label:"DAY 5", name:"Klokov + Berestov + Lunges",
    schedule:"Saturday", color:"#8b5cf6", sleep:"partial",
    maxLoad: false,
    focus:["Klokov Squat singles","Berestov Squat 3×9","Single-leg strength"],
    exercises:[
      {id:"muscle_snatch",         sets:2,     reps:"3",      l1:"42–46 kg",   l2:"44–48 kg"  },
      {id:"klokov_squat",          sets:"3–5", reps:"1",      l1:"85–107 kg",  l2:"92–112 kg" },
      {id:"berestov_squat",        sets:3,     reps:"9",      l1:"60–72 kg",   l2:"66–78 kg"  },
      {id:"lunge",                 sets:3,     reps:"8/leg",  l1:"40–50 kg",   l2:"46–56 kg"  },
      {id:"face_pull",             sets:3,     reps:"15",     l1:"Light",      l2:"Light-Med" },
      {id:"ab_wheel",              sets:3,     reps:"8–10",   l1:"BW",         l2:"BW"        },
    ]
  },
];
```

- [ ] **Step 2: Verify in browser console**

```javascript
DAYS_SUMMER[0].exercises[0]
// Expected: { id: 'muscle_snatch', sets: 2, reps: '3', l1: '42–46 kg', l2: '44–48 kg' }
DAYS_SUMMER[0].exercises[0].name
// Expected: undefined  (name is gone from program entries)
getEx(DAYS_SUMMER[0].exercises[0].id).name
// Expected: 'Muscle Snatch'
```

- [ ] **Step 3: Commit**

```bash
git add docs/index.html
git commit -m "refactor: DAYS_SUMMER exercises use id refs, remove name/type/note inline"
```

---

## Task 5: Update ExCard — key construction and render

**Files:**
- Modify: `docs/index.html` — ExCard function (lines ~679–900)

- [ ] **Step 1: Update ExCard to resolve exercise via getEx**

Find the start of `ExCard`:
```javascript
function ExCard({ex, phase, sessionKey, onProgress, onSetsChange, forceReload, onNewPR}) {
```

The first lines inside use `ex.type` and `ex.name`. Replace the entire early section:

Find:
```javascript
  const m = TYPE_META[ex.type];
  const load = phase === 0 ? ex.l1 : ex.l2;
```

Replace with:
```javascript
  const catalog = getEx(ex.id) || { name: ex.id, type: 'strength' };
  const m = TYPE_META[catalog.type];
  const load = phase === 0 ? ex.l1 : ex.l2;
```

- [ ] **Step 2: Update onProgress callback**

Find:
```javascript
    if (onProgress) onProgress(ex.name, doneCount, totalSets);
```

Replace with:
```javascript
    if (onProgress) onProgress(ex.id, doneCount, totalSets);
```

- [ ] **Step 3: Update onNewPR callbacks (2 locations)**

Find:
```javascript
      if (!isNaN(w) && w > 0 && onNewPR) onNewPR(ex.name, w);
    } else if (field === "weight" && updated[idx].done) {
      const w = parseFloat(value);
      if (!isNaN(w) && w > 0 && onNewPR) onNewPR(ex.name, w);
```

Replace with:
```javascript
      if (!isNaN(w) && w > 0 && onNewPR) onNewPR(ex.id, w);
    } else if (field === "weight" && updated[idx].done) {
      const w = parseFloat(value);
      if (!isNaN(w) && w > 0 && onNewPR) onNewPR(ex.id, w);
```

- [ ] **Step 4: Update localStorage key construction (updateSet)**

Find:
```javascript
        const key = `sets_${sessionKey}_${ex.name.replace(/\s+/g,'_')}`;
        await storage.set(key, JSON.stringify(updated));
        sbSync.upsertSets(key, updated);
```

Replace with:
```javascript
        const key = `sets_${sessionKey}_${ex.id}`;
        await storage.set(key, JSON.stringify(updated));
        sbSync.upsertSets(key, updated);
```

- [ ] **Step 5: Update localStorage key construction (useEffect load)**

Find:
```javascript
    const key = `sets_${sessionKey}_${ex.name.replace(/\s+/g,'_')}`;
    storage.get(key).then(result => {
```

Replace with:
```javascript
    const key = `sets_${sessionKey}_${ex.id}`;
    storage.get(key).then(result => {
```

- [ ] **Step 6: Update the exercise name display**

Find:
```javascript
          }}>{ex.name}</span>
```

Replace with:
```javascript
          }}>{catalog.name}</span>
```

- [ ] **Step 7: Update CHECK ALL button localStorage key (2 locations)**

Find the first:
```javascript
                    const k = `sets_${sessionKey}_${ex.name.replace(/\s+/g,'_')}`;
                    await storage.set(k, JSON.stringify(updated));
                    sbSync.upsertSets(k, updated);
```

Replace with:
```javascript
                    const k = `sets_${sessionKey}_${ex.id}`;
                    await storage.set(k, JSON.stringify(updated));
                    sbSync.upsertSets(k, updated);
```

Find the second occurrence (inside the "fill recommended weight" button):
```javascript
                    const k = `sets_${sessionKey}_${ex.name.replace(/\s+/g,'_')}`;
```

Replace with:
```javascript
                    const k = `sets_${sessionKey}_${ex.id}`;
```

- [ ] **Step 8: Verify in browser**

Open the app → Program tab → Day 1. Exercise names should display correctly (e.g. "MUSCLE SNATCH", "HANG POWER SNATCH"). Tick a set — check localStorage shows key `sets_w1_d1_muscle_snatch` (not the old name format).

- [ ] **Step 9: Commit**

```bash
git add docs/index.html
git commit -m "refactor: ExCard resolves name/type via getEx(ex.id), keys use slug"
```

---

## Task 6: Update AI prompt builder and week chips

**Files:**
- Modify: `docs/index.html` — `buildReviewPrompt` (line ~290), week chips render (line ~3539)

- [ ] **Step 1: Update buildReviewPrompt exercise list**

Find:
```javascript
  const exerciseList = dayList.map(d =>
    `${d.label}: ${d.exercises.map(e => e.name).join(", ")}`
  ).join("\n");
```

Replace with:
```javascript
  const exerciseList = dayList.map(d =>
    `${d.label}: ${d.exercises.map(e => getEx(e.id)?.name || e.id).join(", ")}`
  ).join("\n");
```

- [ ] **Step 2: Update week chips skip/reduce display**

Find:
```javascript
            const daySkip   = exs.filter(e => prevSkip.includes(e.name));
            const dayReduce = exs.filter(e => prevReduce.includes(e.name));
            const chips = [
              ...daySkip.map(e   => ({action:"skip",   exercise:e.name})),
              ...dayReduce.map(e => ({action:"reduce",  exercise:e.name})),
            ];
```

Replace with:
```javascript
            const daySkip   = exs.filter(e => prevSkip.includes(getEx(e.id)?.name || e.id));
            const dayReduce = exs.filter(e => prevReduce.includes(getEx(e.id)?.name || e.id));
            const chips = [
              ...daySkip.map(e   => ({action:"skip",   exercise:getEx(e.id)?.name || e.id})),
              ...dayReduce.map(e => ({action:"reduce",  exercise:getEx(e.id)?.name || e.id})),
            ];
```

- [ ] **Step 3: Verify AI prompt**

In browser console:
```javascript
// Simulate what buildReviewPrompt passes to the AI
DAYS_SUMMER.map(d => `${d.label}: ${d.exercises.map(e => getEx(e.id)?.name || e.id).join(", ")}`).join("\n")
// Expected: "DAY 1: Muscle Snatch, Hang Power Snatch, Back Squat, ..."
```

- [ ] **Step 4: Commit**

```bash
git add docs/index.html
git commit -m "refactor: AI prompt and week chips resolve exercise names via getEx"
```

---

## Task 7: Update PR system — slugs throughout

**Files:**
- Modify: `docs/index.html` — `SEED_PRS`, `PR_ALL`, `prKeyFor`, `handleAutoPR`, `rebuildPRsFromLogs`, `AnalyticsTab PR_LIFTS`

- [ ] **Step 1: Update SEED_PRS to use slug keys**

Find the `SEED_PRS` const (line ~175). Replace entirely:

```javascript
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
```

- [ ] **Step 2: Update PR_ALL to use slugs**

Find `const PR_ALL = [` (line ~597). Replace entirely:

```javascript
const PR_ALL = [
  'back_squat','front_squat','clean_pull','deadlift','rdl','snatch_deadlift',
  'klokov_squat','klokov_trapi','berestov_squat',
  'snatch','hang_power_snatch','muscle_snatch','snatch_balance','snatch_high_pull',
  'clean','clean_and_jerk','push_jerk','jerk_from_rack',
  'power_clean','hang_power_clean',
  'overhead_press','wide_overhead_press','push_press','overhead_squat','sots_press','behind_neck_press',
  'good_morning','lat_pulldown','pull_up','incline_barbell_press','bench_press',
  'rdl','cable_row','lunge',
];
```

- [ ] **Step 3: Update prKeyFor**

Find:
```javascript
  function prKeyFor(exName) {
    const base = exName.split(' — ')[0].trim();
    if (PR_ALL.includes(base)) return base;
    if (PR_ALL.includes(exName)) return exName;
    return null;
  }
```

Replace with:
```javascript
  function prKeyFor(exId) {
    if (PR_ALL.includes(exId)) return exId;
    return null;
  }
```

- [ ] **Step 4: Update handleAutoPR display toast**

Find:
```javascript
    showToast(`🏆 NEW PR — ${key}: ${weight} kg`);
```

Replace with:
```javascript
    showToast(`🏆 NEW PR — ${getEx(key)?.name || key}: ${weight} kg`);
```

- [ ] **Step 5: Update rebuildPRsFromLogs**

Find inside `rebuildPRsFromLogs`:
```javascript
    const exName=m[3].replace(/_/g,' ').split(' — ')[0].trim();
```

Replace with:
```javascript
    const exName=m[3]; // already a slug after migration
```

- [ ] **Step 6: Update PR dropdown options to show display names**

Find:
```javascript
{PR_ALL.map(l=><option key={l} value={l}>{l}</option>)}
```

Replace with:
```javascript
{PR_ALL.map(l=><option key={l} value={l}>{getEx(l)?.name || l}</option>)}
```

- [ ] **Step 7: Update AnalyticsTab PR_LIFTS**

Find:
```javascript
  const PR_LIFTS = [
    { key: 'Snatch (Floor)', label: 'SNATCH', color: 'var(--gold)' },
    { key: 'Clean & Jerk', label: 'C&J', color: 'var(--blue)' },
    { key: 'Clean', label: 'CLEAN', color: 'var(--green)' },
    { key: 'Back Squat', label: 'BACK SQUAT', color: 'var(--purple)' },
    { key: 'Hang Power Snatch', label: 'HNG PWR SNATCH', color: 'var(--red)' },
  ];
```

Replace with:
```javascript
  const PR_LIFTS = [
    { key: 'snatch',            label: 'SNATCH',         color: 'var(--gold)'   },
    { key: 'clean_and_jerk',    label: 'C&J',            color: 'var(--blue)'   },
    { key: 'clean',             label: 'CLEAN',          color: 'var(--green)'  },
    { key: 'back_squat',        label: 'BACK SQUAT',     color: 'var(--purple)' },
    { key: 'hang_power_snatch', label: 'HNG PWR SNATCH', color: 'var(--red)'    },
  ];
```

- [ ] **Step 8: Verify PRs tab**

Open app → PRs tab. Dropdown should show exercise display names (not slugs). Existing PR entries should still appear. Adding a new PR should work.

- [ ] **Step 9: Commit**

```bash
git add docs/index.html
git commit -m "refactor: PR system uses exercise slugs — SEED_PRS, PR_ALL, prKeyFor, analytics"
```

---

## Task 8: Update analytics — exRepsMap and ExerciseBreakdown

**Files:**
- Modify: `docs/index.html` — Reports component (~line 1913), LoadDevelopment (~line 1976), ExerciseBreakdown (~line 2060)

- [ ] **Step 1: Update exRepsMap in Reports stats section**

Find (in the stats/ATW section, ~line 1913):
```javascript
  DAYS_SUMMER.forEach(day=>day.exercises.forEach(ex=>{const r=parseRepsNum(ex.reps);exRepsMap[ex.name]=r;const base=ex.name.split(' — ')[0];if(base!==ex.name&&exRepsMap[base]==null)exRepsMap[base]=r;}));
```

Replace with:
```javascript
  DAYS_SUMMER.forEach(day=>day.exercises.forEach(ex=>{exRepsMap[ex.id]=parseRepsNum(ex.reps);}));
```

- [ ] **Step 2: Update calcATW key lookup**

Find (just below the exRepsMap line):
```javascript
      const exReps=exRepsMap[m[2].replace(/_/g,' ')]||3;
```

Replace with:
```javascript
      const exReps=exRepsMap[m[2]]||3;
```

- [ ] **Step 3: Update LoadDevelopment exRepsMap**

Find (~line 1976):
```javascript
    const m={};DAYS_SUMMER.forEach(day=>day.exercises.forEach(ex=>{const r=parseRepsNum(ex.reps);m[ex.name]=r;const base=ex.name.split(' — ')[0];if(base!==ex.name&&m[base]==null)m[base]=r;}));return m;
```

Replace with:
```javascript
    const m={};DAYS_SUMMER.forEach(day=>day.exercises.forEach(ex=>{m[ex.id]=parseRepsNum(ex.reps);}));return m;
```

- [ ] **Step 4: Update LoadDevelopment session key parsing**

Find (~line 1985):
```javascript
      const exName=exRaw.replace(/_/g,' ').split(' — ')[0];
      const exReps=exRepsMap[exName]||3;
```

Replace with:
```javascript
      const exId=exRaw;
      const exReps=exRepsMap[exId]||3;
```

- [ ] **Step 5: Update ExerciseBreakdown exRepsMap**

Find (~line 2061):
```javascript
    const m={};DAYS_SUMMER.forEach(day=>day.exercises.forEach(ex=>{const r=parseRepsNum(ex.reps);m[ex.name]=r;const base=ex.name.split(' — ')[0];if(base!==ex.name&&m[base]==null)m[base]=r;}));return m;
```

Replace with:
```javascript
    const m={};DAYS_SUMMER.forEach(day=>day.exercises.forEach(ex=>{m[ex.id]=parseRepsNum(ex.reps);}));return m;
```

- [ ] **Step 6: Update ExerciseBreakdown session key parsing and map building**

Find (~line 2070):
```javascript
      const exName=exRaw.replace(/_/g,' ').split(' — ')[0];
      const exReps=exRepsMap[exName]||3;
      const date=dateMap[sk]||null;
      const doneSets=setArr.filter(s=>s.done&&parseFloat(s.weight)>0);
      if(doneSets.length===0)return;
      if(!map[exName])map[exName]={name:exName,sessions:[],best:0,totalTon:0,totalReps:0};
      const maxW=Math.max(...doneSets.map(s=>parseFloat(s.weight)));
      map[exName].sessions.push({sk,week:+wk,dayId:dk,date,label:`W${wk} ${dk.toUpperCase()}`,sets:setArr,maxW});
      map[exName].best=Math.max(map[exName].best,maxW);
      doneSets.forEach(s=>{map[exName].totalTon+=parseFloat(s.weight)*exReps;map[exName].totalReps+=exReps;});
```

Replace with:
```javascript
      const exId=exRaw;
      const exReps=exRepsMap[exId]||3;
      const date=dateMap[sk]||null;
      const doneSets=setArr.filter(s=>s.done&&parseFloat(s.weight)>0);
      if(doneSets.length===0)return;
      if(!map[exId])map[exId]={id:exId,name:getEx(exId)?.name||exId,sessions:[],best:0,totalTon:0,totalReps:0};
      const maxW=Math.max(...doneSets.map(s=>parseFloat(s.weight)));
      map[exId].sessions.push({sk,week:+wk,dayId:dk,date,label:`W${wk} ${dk.toUpperCase()}`,sets:setArr,maxW});
      map[exId].best=Math.max(map[exId].best,maxW);
      doneSets.forEach(s=>{map[exId].totalTon+=parseFloat(s.weight)*exReps;map[exId].totalReps+=exReps;});
```

- [ ] **Step 7: Update ExerciseBreakdown PR_KEYS filter**

Find:
```javascript
    const PR_KEYS=new Set(['Snatch (Floor)','Clean & Jerk','Back Squat','Deadlift','Flat Bench Press']);
    return Object.values(map)
      .filter(ex=>!PR_KEYS.has(ex.name))
```

Replace with:
```javascript
    const PR_KEYS=new Set(['snatch','clean_and_jerk','back_squat','deadlift','bench_press']);
    return Object.values(map)
      .filter(ex=>!PR_KEYS.has(ex.id))
```

- [ ] **Step 8: Update ExerciseBreakdown render — openEx key**

Find (~line 2100):
```javascript
        const isOpen=openEx===ex.name;
        const exReps=exRepsMap[ex.name]||3;
```

Replace with:
```javascript
        const isOpen=openEx===ex.id;
        const exReps=exRepsMap[ex.id]||3;
```

Find:
```javascript
          <div key={ex.name} style={{...
            <div onClick={()=>setOpenEx(isOpen?null:ex.name)}
```

Replace with:
```javascript
          <div key={ex.id} style={{...
            <div onClick={()=>setOpenEx(isOpen?null:ex.id)}
```

- [ ] **Step 9: Update AnalyticsTab exFreq parsing**

Find (~line 2299):
```javascript
      const exName = match[1].replace(/_/g, ' ').split(' — ')[0];
      if (!m[exName]) m[exName] = 0;
      arr.forEach(s => { if (s.done) m[exName]++; });
```

Replace with:
```javascript
      const exId = match[1];
      const exName = getEx(exId)?.name || exId;
      if (!m[exName]) m[exName] = 0;
      arr.forEach(s => { if (s.done) m[exName]++; });
```

- [ ] **Step 10: Verify Reports + Analytics tabs**

Open Reports tab — Exercise Breakdown should show display names. Open Analytics tab — Top Exercises should show names not slugs.

- [ ] **Step 11: Commit**

```bash
git add docs/index.html
git commit -m "refactor: analytics and reports use exercise slugs for grouping, getEx for display"
```

---

## Task 9: Update sbSync and applySupabaseData

**Files:**
- Modify: `docs/index.html` — `sbSync.upsertSets` (~line 68), `applySupabaseData` (~line 339 of the Supabase section)

- [ ] **Step 1: Update sbSync.upsertSets**

Find:
```javascript
      const week = parseInt(m[2]), dayId = m[3], exName = m[4];
      const rows = setsArr.map((s, i) => ({
        id: `${lsKey}_${i}`, week, day_id: dayId, exercise_name: exName,
```

Replace with:
```javascript
      const week = parseInt(m[2]), dayId = m[3], exId = m[4];
      const rows = setsArr.map((s, i) => ({
        id: `${lsKey}_${i}`, week, day_id: dayId, exercise_id: exId,
```

- [ ] **Step 2: Update applySupabaseData**

Find the `applySupabaseData` function. Locate:
```javascript
        const k = `sets_w${s.week}_${s.day_id}_${s.exercise_name}`;
```

Replace with:
```javascript
        const k = `sets_w${s.week}_${s.day_id}_${s.exercise_id}`;
```

- [ ] **Step 3: Verify Supabase sync**

Open app. Tick a set. Open DevTools → Network → filter `supabase`. The POST to `/rest/v1/sets` body should contain `exercise_id: "muscle_snatch"` (not `exercise_name`).

- [ ] **Step 4: Commit**

```bash
git add docs/index.html
git commit -m "refactor: sbSync and applySupabaseData use exercise_id slug"
```

---

## Task 10: EXERCISES tab UI

**Files:**
- Modify: `docs/index.html` — add `ExercisesTab` component, update nav, add render

- [ ] **Step 1: Add ExercisesTab component**

Find `function AnalyticsTab` in `docs/index.html`. Insert the following component immediately before it:

```javascript
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
```

- [ ] **Step 2: Add EXERCISES to the nav tab list**

Find:
```javascript
{[["program","PROGRAM"],["mobility","MOBILITY"],
```

Replace with:
```javascript
{[["program","PROGRAM"],["exercises","EXERCISES"],["mobility","MOBILITY"],
```

- [ ] **Step 3: Add tab render**

Find:
```javascript
        {tab==="mobility" && <MobilityTab/>}
```

Insert immediately before it:
```javascript
        {tab==="exercises" && <ExercisesTab/>}
```

- [ ] **Step 4: Verify EXERCISES tab**

Open app → EXERCISES tab.
- All 128 exercises should be visible when filter = ALL
- Type chips filter correctly (SNATCH shows only snatch exercises)
- Search filters by name (type "squat" — only squat exercises appear)
- "PROG" badge appears on exercises in the current program
- Best logged weight appears if sets have been logged
- Tapping a card expands to show slug ID

- [ ] **Step 5: Commit**

```bash
git add docs/index.html
git commit -m "feat: add EXERCISES tab with catalog browser, type filter, search, and best weights"
```

---

## Task 11: Version bump + final smoke test

**Files:**
- Modify: `docs/index.html` — version string in header

- [ ] **Step 1: Bump version to v3.0.0**

Find `PROGRAM v2.9.9` in the header section (search for `PROGRAM v`). Replace with:
```
PROGRAM v3.0.0 · 2026-05-27
```

- [ ] **Step 2: Full smoke test checklist**

Open `docs/index.html` in browser (after running `python gen_key.py` if testing Supabase).

**Program tab:**
- [ ] Day 1 exercises show correct names: Muscle Snatch, Hang Power Snatch, Back Squat, etc.
- [ ] Ticking a set saves to `sets_w1_d1_muscle_snatch` (not old name format) — verify in DevTools → Application → Local Storage
- [ ] Check All button works

**EXERCISES tab:**
- [ ] 128 exercises total
- [ ] SNATCH filter shows snatch exercises only
- [ ] "PROG" badge on current program exercises
- [ ] Search for "squat" returns Back Squat, Front Squat, Overhead Squat, Klokov Squat, Berestov Squat, etc.

**PRs tab:**
- [ ] Dropdown options show display names (not slugs)
- [ ] Existing PR entries still visible
- [ ] Logging a new PR works

**Reports tab → Exercise Breakdown:**
- [ ] Exercise names shown (not slugs)
- [ ] Data still present from pre-migration sets

**Analytics tab:**
- [ ] Top Exercises shows display names
- [ ] PR Progression charts still show data

**Week Review (AI):**
- [ ] Building the prompt includes exercise names correctly

**Supabase (if configured):**
- [ ] Network tab shows POST to `/rest/v1/sets` with `exercise_id` field
- [ ] Supabase Table Editor `sets` table shows `exercise_id` column with slug values

- [ ] **Step 3: Commit**

```bash
git add docs/index.html
git commit -m "feat: exercise catalog v3.0.0 — slug-based IDs, migration, EXERCISES tab"
```

---

## Self-Review

**Spec coverage:**
- ✅ `EXERCISE_CATALOG` — 128 exercises, `{ id, name, type }`, Task 1
- ✅ `getEx(id)` resolver — Task 1
- ✅ `DAYS_SUMMER` uses `id` only — Task 4
- ✅ localStorage migration — Task 3
- ✅ Supabase SQL migration — Task 2
- ✅ `sbSync` uses `exercise_id` — Task 9
- ✅ All `ex.name` → `getEx(ex.id).name` — Tasks 5, 6, 7, 8
- ✅ No more `.split(' — ')[0]` stripping — Tasks 7, 8
- ✅ `PR_ALL` + `SEED_PRS` use slugs — Task 7
- ✅ Analytics grouping by slug — Task 8
- ✅ EXERCISES tab UI — Task 10
- ✅ Type filter + search + PROG badge + best weight — Task 10

**Placeholder scan:** None. All steps contain exact code.

**Type consistency:**
- `ex.id` (slug string) is the identity field throughout — Tasks 4-10 all use `ex.id`
- `getEx(id)` returns `EXERCISE_CATALOG[id]` — used in Tasks 5, 6, 7, 8, 10
- `EXERCISE_NAME_TO_SLUG` and `PR_NAME_TO_SLUG` defined in Task 1, used in Task 3
- localStorage key format: `sets_w{n}_{did}_{slug}` — consistent in Tasks 5, 9
- Supabase column: `exercise_id` — consistent in Tasks 2, 9
