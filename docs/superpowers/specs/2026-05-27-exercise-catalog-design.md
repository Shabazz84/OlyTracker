# Exercise Catalog — Design Spec

**Date:** 2026-05-27  
**Status:** Approved

---

## Goal

Replace all string-based exercise references in the app with a single centralized `EXERCISE_CATALOG`. Every place that identifies an exercise — localStorage keys, Supabase rows, analytics, PRs, UI labels — uses the same slug. No more `ex.name.split(' — ')[0]` stripping, no more name drift between storage and display.

---

## Data Structure

### `EXERCISE_CATALOG`

Defined once at the top of `docs/index.html` (before `DAYS_SUMMER`), as a flat object keyed by slug:

```javascript
const EXERCISE_CATALOG = {
  // id, name, type, note
  muscle_snatch: {
    id: 'muscle_snatch',
    name: 'Muscle Snatch',
    type: 'snatch',
    note: 'Session opener — no leg drive, pure arm pull. 50% effort. Ingrain the pattern.'
  },
  // ... ~160 total entries
};

function getEx(id) { return EXERCISE_CATALOG[id]; }
```

**Fields per entry:**

| Field | Type | Description |
|---|---|---|
| `id` | string | Slug — primary identity everywhere |
| `name` | string | Canonical display name |
| `type` | `'snatch' \| 'cj' \| 'strength' \| 'accessory'` | Used for grouping and color coding |
| `note` | string | Coaching note / description. Empty string if none. |

### Exercise Types

- **snatch** — snatch and its derivatives (pulls, balances, positional work)
- **cj** — clean & jerk and its derivatives
- **strength** — squat, press, deadlift, weighted accessories
- **accessory** — corrective, core, mobility-adjacent

### `DAYS_SUMMER` — updated entry shape

`name`, `type`, and `note` move to the catalog. Each entry keeps only program-specific data:

```javascript
// Before
{ name: 'Back Squat — Daily Max Single', sets: '4–6', reps: '1', l1: '95–118 kg', l2: '100–120 kg', type: 'strength', note: '...' }

// After
{ id: 'back_squat', sets: '4–6', reps: '1', l1: '95–118 kg', l2: '100–120 kg' }
```

The `— Daily Max Single` suffix is dropped permanently. Protocol notes live in the catalog entry for `back_squat`. Day-specific loading notes (the ⚠️ WED ceilings, etc.) move into the `l1`/`l2` fields or are captured in a new optional `day_note` field on the program entry if needed.

---

## Full Exercise List

### Currently in Program (29 unique exercises)

| Slug | Name | Type |
|---|---|---|
| `muscle_snatch` | Muscle Snatch | snatch |
| `hang_power_snatch` | Hang Power Snatch | snatch |
| `snatch_balance` | Snatch Balance | snatch |
| `overhead_squat` | Overhead Squat | snatch |
| `sots_press` | Sots Press | snatch |
| `hang_power_clean` | Hang Power Clean | cj |
| `clean_pull` | Clean Pull | cj |
| `jerk_from_rack` | Jerk from Rack | cj |
| `push_press` | Push Press | cj |
| `clean_and_jerk` | Clean & Jerk | cj |
| `back_squat` | Back Squat | strength |
| `front_squat` | Front Squat | strength |
| `klokov_squat` | Klokov Squat | strength |
| `berestov_squat` | Berestov Squat | strength |
| `rdl` | Romanian Deadlift | strength |
| `good_morning` | Good Morning | strength |
| `lunge` | Lunge (Barbell) | strength |
| `weighted_pull_up` | Weighted Pull Up | strength |
| `incline_barbell_press` | Incline Barbell Press | strength |
| `weighted_dips` | Weighted Parallel Bar Dips | strength |
| `klokov_trapi` | Klokov Trapi | strength |
| `wide_overhead_press` | Wide Overhead Press | strength |
| `behind_neck_press` | Behind Neck Press | strength |
| `ghr` | GHR (Glute Ham Raise) | strength |
| `face_pull` | Face Pull | accessory |
| `pallof_press` | Pallof Press | accessory |
| `dead_bug` | Dead Bug | accessory |
| `plank` | Plank | accessory |
| `ab_wheel` | Ab Wheel / Rollout | accessory |

### Additional from Transcripts (~130 exercises)

#### Snatch Variations
| Slug | Name | Type |
|---|---|---|
| `power_snatch` | Power Snatch | snatch |
| `snatch` | Snatch (Floor) | snatch |
| `hang_snatch` | Hang Snatch | snatch |
| `snatch_from_blocks` | Snatch from Blocks | snatch |
| `snatch_pull` | Snatch Pull | snatch |
| `snatch_high_pull` | Snatch High Pull | snatch |
| `snatch_deadlift` | Snatch Deadlift | snatch |
| `drop_snatch` | Drop Snatch | snatch |
| `tall_snatch` | Tall Snatch | snatch |
| `pause_snatch` | Pause Snatch | snatch |
| `tempo_snatch` | Tempo Snatch | snatch |
| `deficit_snatch` | Deficit Snatch | snatch |
| `muscle_snatch_from_blocks` | Muscle Snatch from Blocks | snatch |
| `snatch_pull_from_blocks` | Snatch Pull from Blocks | snatch |
| `heaving_snatch_balance` | Heaving Snatch Balance | snatch |
| `pressing_snatch_balance` | Pressing Snatch Balance | snatch |

#### Clean Variations
| Slug | Name | Type |
|---|---|---|
| `clean` | Clean (Floor) | cj |
| `power_clean` | Power Clean | cj |
| `hang_clean` | Hang Clean | cj |
| `clean_from_blocks` | Clean from Blocks | cj |
| `muscle_clean` | Muscle Clean | cj |
| `tall_clean` | Tall Clean | cj |
| `pause_clean` | Pause Clean | cj |
| `tempo_clean` | Tempo Clean | cj |
| `deficit_clean` | Deficit Clean | cj |
| `clean_deadlift` | Clean Deadlift | cj |
| `clean_pull_from_blocks` | Clean Pull from Blocks | cj |
| `clean_high_pull` | Clean High Pull | cj |

#### Jerk Variations
| Slug | Name | Type |
|---|---|---|
| `power_jerk` | Power Jerk | cj |
| `split_jerk` | Split Jerk | cj |
| `tall_jerk` | Tall Jerk | cj |
| `pause_jerk` | Pause Jerk | cj |
| `jerk_balance` | Jerk Balance | cj |
| `back_jerk` | Back Jerk | cj |
| `jerk_from_blocks` | Jerk from Blocks | cj |
| `push_jerk` | Push Jerk | cj |

#### Squat Variations
| Slug | Name | Type |
|---|---|---|
| `pause_back_squat` | Pause Back Squat | strength |
| `tempo_back_squat` | Tempo Back Squat | strength |
| `pause_front_squat` | Pause Front Squat | strength |
| `tempo_front_squat` | Tempo Front Squat | strength |
| `pause_overhead_squat` | Pause Overhead Squat | strength |
| `box_squat` | Box Squat | strength |
| `split_squat` | Split Squat | strength |
| `single_leg_squat` | Single Leg Squat | strength |
| `belt_squat` | Belt Squat | strength |
| `hack_squat` | Hack Squat | strength |

#### Pulls & Deadlifts
| Slug | Name | Type |
|---|---|---|
| `deadlift` | Deadlift | strength |
| `deficit_deadlift` | Deficit Deadlift | strength |
| `pause_deadlift` | Pause Deadlift | strength |
| `sumo_deadlift` | Sumo Deadlift | strength |
| `single_leg_deadlift` | Single Leg Deadlift | strength |
| `trap_bar_deadlift` | Trap Bar Deadlift | strength |
| `deficit_rdl` | Deficit RDL | strength |
| `snatch_grip_deadlift` | Snatch Grip Deadlift | strength |
| `high_pull` | High Pull | strength |

#### Upper Body — Press
| Slug | Name | Type |
|---|---|---|
| `overhead_press` | Overhead Press | strength |
| `strict_press` | Strict Press | strength |
| `bench_press` | Bench Press | strength |
| `decline_bench_press` | Decline Bench Press | strength |
| `landmine_press` | Landmine Press | strength |
| `dumbbell_press` | Dumbbell Press | strength |
| `dumbbell_incline_press` | Dumbbell Incline Press | strength |

#### Upper Body — Pull
| Slug | Name | Type |
|---|---|---|
| `pull_up` | Pull Up | strength |
| `lat_pulldown` | Lat Pulldown | strength |
| `barbell_row` | Barbell Row | strength |
| `pendlay_row` | Pendlay Row | strength |
| `seal_row` | Seal Row | strength |
| `dumbbell_row` | Dumbbell Row | strength |
| `cable_row` | Cable Row | strength |
| `upright_row` | Upright Row | strength |
| `shrug` | Barbell Shrug | strength |

#### Posterior Chain
| Slug | Name | Type |
|---|---|---|
| `back_extension` | Back Extension | strength |
| `reverse_hyper` | Reverse Hyper | strength |
| `leg_curl` | Leg Curl | strength |
| `leg_press` | Leg Press | strength |
| `leg_extension` | Leg Extension | strength |
| `nordic_curl` | Nordic Curl | strength |

#### Carries & Loaded Movements
| Slug | Name | Type |
|---|---|---|
| `overhead_carry` | Overhead Carry | strength |
| `farmers_carry` | Farmer's Carry | strength |
| `suitcase_carry` | Suitcase Carry | strength |
| `sled_push` | Sled Push | strength |

#### Plyometric & Explosive
| Slug | Name | Type |
|---|---|---|
| `box_jump` | Box Jump | strength |
| `jump_squat` | Jump Squat | strength |
| `broad_jump` | Broad Jump | strength |

#### Core & Stability
| Slug | Name | Type |
|---|---|---|
| `side_plank` | Side Plank | accessory |
| `bird_dog` | Bird Dog | accessory |
| `leg_raise` | Leg Raise | accessory |
| `hanging_leg_raise` | Hanging Leg Raise | accessory |
| `ghd_sit_up` | GHD Sit Up | accessory |
| `mcgill_curl_up` | McGill Curl Up | accessory |
| `hollow_hold` | Hollow Hold | accessory |
| `cable_crunch` | Cable Crunch | accessory |

#### Shoulder & Corrective
| Slug | Name | Type |
|---|---|---|
| `lateral_raise` | Lateral Raise | accessory |
| `rear_delt_fly` | Rear Delt Fly | accessory |
| `band_pull_apart` | Band Pull Apart | accessory |
| `external_rotation` | External Rotation | accessory |
| `Cuban_press` | Cuban Press | accessory |
| `y_t_w` | Y-T-W | accessory |
| `scapular_pull_up` | Scapular Pull Up | accessory |
| `handstand_hold` | Handstand Hold | accessory |

---

## Migration Strategy

### Name → Slug Mapping Table

A hardcoded JS object covering every current localStorage/Supabase name variant, including suffix forms:

```javascript
const EXERCISE_NAME_TO_SLUG = {
  // Current program entries (with and without suffixes)
  'Muscle_Snatch':                        'muscle_snatch',
  'Muscle_Snatch_(opener)':               'muscle_snatch',
  'Hang_Power_Snatch':                    'hang_power_snatch',
  'Back_Squat':                           'back_squat',
  'Back_Squat_Daily_Max_Single':          'back_squat',
  'Back_Squat__Daily_Max_Single':         'back_squat',
  'Overhead_Squat':                       'overhead_squat',
  'Good_Morning':                         'good_morning',
  'Weighted_Pull_Up':                     'weighted_pull_up',
  'GHR_(Glute_Ham_Raise)':               'ghr',
  'Hang_Power_Clean':                     'hang_power_clean',
  'Clean_Pull':                           'clean_pull',
  'Incline_Barbell_Press':               'incline_barbell_press',
  'Weighted_Parallel_Bar_Dips':          'weighted_dips',
  'Klokov_Trapi':                        'klokov_trapi',
  'Wide_Overhead_Press':                 'wide_overhead_press',
  'Dead_Bug':                            'dead_bug',
  'Snatch_Balance':                      'snatch_balance',
  'Front_Squat':                         'front_squat',
  'Front_Squat_Daily_Max_Single':        'front_squat',
  'Front_Squat__Daily_Max_Single':       'front_squat',
  'RDL_Pull':                            'rdl',
  'GHR_(Glute_Ham_Raise)_':             'ghr',
  'Plank':                               'plank',
  'Jerk_from_Rack_Daily_Max_Single':     'jerk_from_rack',
  'Jerk_from_Rack__Daily_Max_Single':    'jerk_from_rack',
  'Push_Press':                          'push_press',
  'Clean_&_Jerk':                        'clean_and_jerk',
  'Sots_Press':                          'sots_press',
  'Behind_Neck_Press':                   'behind_neck_press',
  'Pallof_Press':                        'pallof_press',
  'Klokov_Squat_Singles':               'klokov_squat',
  'Klokov_Squat__Singles':              'klokov_squat',
  'Berestov_Squat':                      'berestov_squat',
  'Lunge_(Barbell)':                     'lunge',
  'Face_Pull':                           'face_pull',
  'Ab_Wheel_/_Rollout':                  'ab_wheel',
};
```

### 1. localStorage Migration (in-app, runs once on startup)

```
1. Check localStorage for 'oly_ex_migration_v1' flag — if set, skip
2. Scan all keys matching /^sets_/
3. For each key:
   a. Extract the exercise name portion (everything after sets_w{n}_{did}_)
   b. Look up slug in EXERCISE_NAME_TO_SLUG
   c. If found: write new key (sets_w{n}_{did}_{slug}), delete old key
   d. If not found: log warning, leave key untouched
4. Set 'oly_ex_migration_v1' = '1'
```

### 2. Supabase Migration (SQL, run once in dashboard)

```sql
-- Step 1: Add new column
ALTER TABLE sets ADD COLUMN exercise_id text;

-- Step 2: Populate from name mapping
UPDATE sets SET exercise_id = CASE exercise_name
  WHEN 'Muscle_Snatch'                       THEN 'muscle_snatch'
  WHEN 'Muscle_Snatch_(opener)'              THEN 'muscle_snatch'
  WHEN 'Hang_Power_Snatch'                   THEN 'hang_power_snatch'
  WHEN 'Back_Squat__Daily_Max_Single'        THEN 'back_squat'
  WHEN 'Overhead_Squat'                      THEN 'overhead_squat'
  WHEN 'Good_Morning'                        THEN 'good_morning'
  WHEN 'Weighted_Pull_Up'                    THEN 'weighted_pull_up'
  WHEN 'GHR_(Glute_Ham_Raise)'              THEN 'ghr'
  WHEN 'Hang_Power_Clean'                    THEN 'hang_power_clean'
  WHEN 'Clean_Pull'                          THEN 'clean_pull'
  WHEN 'Incline_Barbell_Press'              THEN 'incline_barbell_press'
  WHEN 'Weighted_Parallel_Bar_Dips'         THEN 'weighted_dips'
  WHEN 'Klokov_Trapi'                       THEN 'klokov_trapi'
  WHEN 'Wide_Overhead_Press'                THEN 'wide_overhead_press'
  WHEN 'Dead_Bug'                           THEN 'dead_bug'
  WHEN 'Snatch_Balance'                     THEN 'snatch_balance'
  WHEN 'Front_Squat__Daily_Max_Single'      THEN 'front_squat'
  WHEN 'RDL_Pull'                           THEN 'rdl'
  WHEN 'Plank'                              THEN 'plank'
  WHEN 'Jerk_from_Rack__Daily_Max_Single'   THEN 'jerk_from_rack'
  WHEN 'Push_Press'                         THEN 'push_press'
  WHEN 'Clean_&_Jerk'                       THEN 'clean_and_jerk'
  WHEN 'Sots_Press'                         THEN 'sots_press'
  WHEN 'Behind_Neck_Press'                  THEN 'behind_neck_press'
  WHEN 'Pallof_Press'                       THEN 'pallof_press'
  WHEN 'Klokov_Squat__Singles'             THEN 'klokov_squat'
  WHEN 'Berestov_Squat'                     THEN 'berestov_squat'
  WHEN 'Lunge_(Barbell)'                    THEN 'lunge'
  WHEN 'Face_Pull'                          THEN 'face_pull'
  WHEN 'Ab_Wheel_/_Rollout'                 THEN 'ab_wheel'
  ELSE exercise_name  -- fallback: leave unchanged, fix manually
END;

-- Step 3: Rebuild row IDs (delete + reinsert with slug-based IDs)
-- Run via app migration button (see UI migration) or manually:
-- Old ID format: sets_w1_d1_Back_Squat__Daily_Max_Single_0
-- New ID format: sets_w1_d1_back_squat_0

-- Step 4: Drop old column, make exercise_id NOT NULL
ALTER TABLE sets DROP COLUMN exercise_name;
ALTER TABLE sets ALTER COLUMN exercise_id SET NOT NULL;
ALTER TABLE sets RENAME COLUMN exercise_id TO exercise_id; -- already named correctly

-- Step 5: Update index
DROP INDEX IF EXISTS idx_sets_week_day_exercise;
CREATE INDEX idx_sets_week_day_exercise ON sets(week, day_id, exercise_id);
```

**Row ID migration** — handled by the in-app migration button (System tab), which:
1. Reads all sets rows from Supabase
2. For each row: deletes old row, inserts new row with slug-based ID
3. This runs after the localStorage migration

---

## Code Changes

### All `ex.name` → `getEx(ex.id).name`

Every render location that currently reads `ex.name` resolves through `getEx`:

```javascript
// Before
ex.name.toUpperCase()
ex.name.replace(/\s+/g, '_')
ex.name.split(' — ')[0]

// After
getEx(ex.id).name.toUpperCase()
ex.id  // used directly as storage key
ex.id  // no stripping needed
```

### localStorage key format

```
Before: sets_w1_d1_Back_Squat__Daily_Max_Single
After:  sets_w1_d1_back_squat
```

The key is now `sets_${sessionKey}_${ex.id}` — no `.replace(/\s+/g,'_')` needed.

### `sbSync.upsertSets` — updated key parsing

```javascript
// Before
const m = lsKey.match(/^sets_(w(\d+)_(d\d+))_(.+)$/);
const exName = m[4];  // string name
exercise_name: exName,

// After
const m = lsKey.match(/^sets_(w(\d+)_(d\d+))_(.+)$/);
const exId = m[4];    // slug
exercise_id: exId,
```

### Analytics & PR history

All grouping/lookup by `exName` → `exId`. Display name resolved via `getEx(exId).name` at render time only.

### PR_KEYS set

Currently `new Set(['Snatch (Floor)', 'Clean & Jerk', 'Back Squat', ...])` — updated to use slugs: `new Set(['snatch', 'clean_and_jerk', 'back_squat', ...])`.

---

## Catalog UI

### New EXERCISES Tab

Position in nav: between PROGRAM and MOBILITY.

```
PROGRAM | EXERCISES | MOBILITY | SUPPS | LOG | PRs | REPORTS | ANALYTICS | SYSTEM
```

### Layout

```
┌─────────────────────────────────┐
│ [Search exercises...]           │
│ [ALL] [SNATCH] [C&J] [STRENGTH] [ACCESSORY] │
├─────────────────────────────────┤
│ SNATCH (16)                     │
│ ┌─────────────────────────────┐ │
│ │ MUSCLE SNATCH          ●    │ │
│ │ Session opener — no leg...  │ │  ← tap to expand full note
│ └─────────────────────────────┘ │
│ ┌─────────────────────────────┐ │
│ │ HANG POWER SNATCH      ●    │ │
│ │ Above knee. Your best...    │ │
│ └─────────────────────────────┘ │
│ ...                             │
│                                 │
│ C&J (20)                        │
│ ...                             │
└─────────────────────────────────┘
```

**Card fields:**
- Exercise name (Bebas Neue, full size)
- Colored type dot (blue=snatch, red=cj, gold=strength, purple=accessory)
- Note preview (1 line, truncated) — tap to expand full note
- Best logged weight (if any sets recorded) — shown as small tag e.g. `118 kg`
- `IN PROGRAM` badge for exercises currently in DAYS_SUMMER

**Filter bar:** type chips (ALL / SNATCH / C&J / STRENGTH / ACCESSORY) + text search on name.

---

## Spec Self-Review

**Placeholder scan:** No TBDs or incomplete sections.

**Internal consistency:**
- `getEx(id)` used consistently — catalog is the only source of `name`/`type`/`note`
- Migration mapping covers all 29 current program exercises including suffix variants
- Supabase migration aligns with localStorage migration (same slug values)
- `PR_KEYS` update is called out explicitly — easy to miss

**Scope check:** This is one bounded feature with two work streams (data migration + UI). Suitable for a single implementation plan.

**Ambiguity check:**
- Day-specific protocol notes (e.g. "⚠️ WED: Hard stop 3pm") currently live in `ex.note`. After migration these move to catalog `note` (shared across all days the exercise appears). If day-specific overrides are needed, a `day_note` field can be added to program entries — this is an edge case, not blocking.
- Exercises not in the current mapping table (future additions) will fail migration gracefully — key left untouched with a console warning.
