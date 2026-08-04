# Master Synthesis Program Gaps Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the two real gaps between `master_synthesis.md` and the live program (no split-jerk work, OHS under-dosed) plus two secondary additions (pain-gate note, more anti-rotation core work), per `docs/superpowers/specs/2026-08-04-master-synthesis-program-gaps-design.md`.

**Architecture:** All changes are data-only edits inside `docs/src/app.jsx` — no new components, no new logic. Two parallel structures must be kept in sync per change: `DAYS_SUMMER` (exercise catalog per day, drives logging + weight dropdowns) and `PROGRAM_B1` (week-by-week display text, weeks 1–7; week 8 is a test week and is untouched). One new data section (`MOBILITY.core`) plus one array entry wires a new mobility tab using an existing pattern (`MOBILITY.ankle`).

**Tech Stack:** React (JSX), esbuild (`npm run build` — no test framework exists in this repo; verification is `grep` before/after checks plus a successful build).

## Global Constraints

- Every commit that touches `docs/src/app.jsx` or `docs/app.js` MUST bump the `PROGRAM v<X.Y.Z> · <date>` header string (`docs/src/app.jsx` — currently `PROGRAM v3.5.1 · 2026-07-29`) and rebuild via `npm run build` before committing, per `CLAUDE.md`. No exceptions.
- Preserve exact Unicode characters already used in the file: `×` (multiplication sign, not `x`), `–` (en dash, not hyphen), `·` (middot separator). Copy them from the old text, don't retype.
- `split_jerk`, `pallof_press`, and `bird_dog` already exist in `EXERCISE_CATALOG` — do not add new catalog entries.
- `DAYS_SCHOOL` derives from `DAYS_SUMMER.slice(0,4)` — any `DAYS_SUMMER` D1–D4 edit propagates automatically, no separate edit needed.
- Today's date for version-bump headers: 2026-08-04.

---

### Task 1: Replace Sots Press with Split Jerk footwork drill on D4

**Files:**
- Modify: `docs/src/app.jsx` (DAYS_SUMMER D4 exercises array, ~line 264–275)
- Modify: `docs/src/app.jsx` (PROGRAM_B1 D4 secondary text, weeks 1–7, ~lines 301–394)
- Modify: `docs/src/app.jsx` (version header, ~line 4270)

**Interfaces:**
- Consumes: `EXERCISE_CATALOG.split_jerk` (already exists, id `split_jerk`).
- Produces: nothing consumed by later tasks — independent change.

- [ ] **Step 1: Confirm current state (sanity check before editing)**

`sots_press` appears 6 times total in the file (PR history record, `EXERCISE_CATALOG` definition, two alias maps, one grouping array, plus the one `DAYS_SUMMER` template entry this task changes) — don't touch the other 5, `sots_press` remains a valid loggable exercise even after it's removed from this week's program template.

Run: `grep -n 'id:"sots_press"' "D:/Programming/OlyTracker/docs/src/app.jsx"`
Expected: exactly one match — the `DAYS_SUMMER` D4 exercises-array entry (double-quoted `id:"sots_press"`; the `EXERCISE_CATALOG` definition uses single quotes, `id:'sots_press'`, and won't match).

Run: `grep -cE "Sots 3×5|Sots 2×5" "D:/Programming/OlyTracker/docs/src/app.jsx"`
Expected: `7` (one per week 1–7 in `PROGRAM_B1`).

- [ ] **Step 2: Edit `DAYS_SUMMER` D4 — swap the exercise entry**

Old (inside the `d4` day object's `exercises` array):
```jsx
      {id:"sots_press",            sets:3,     reps:"5",      l1:"25–30 kg",   l2:"28–33 kg"  },
```
New:
```jsx
      {id:"split_jerk",            sets:4,     reps:"3",      l1:"Empty bar",  l2:"Empty bar" },
```

- [ ] **Step 3: Edit `PROGRAM_B1` D4 secondary text — weeks 1–7**

Each week's `d4` entry has a `secondary` string containing `Sots 3×5·XX` (weeks 1–6) or `Sots 2×5·28` (week 7 deload). Replace that substring with `Split Jerk 4×3 (empty bar)` — same text every week (unloaded footwork drill, no load progression). Leave everything else in each `secondary` string untouched.

Week 1: `"C&J 4×(1+2)·55, Sots 3×5·25, BNP 3×6·35, Pallof 3×10"` → `"C&J 4×(1+2)·55, Split Jerk 4×3 (empty bar), BNP 3×6·35, Pallof 3×10"`

Week 2: `"C&J 4×(1+2)·57, Sots 3×5·27, BNP 3×6·37, Pallof 3×10"` → `"C&J 4×(1+2)·57, Split Jerk 4×3 (empty bar), BNP 3×6·37, Pallof 3×10"`

Week 3: `"C&J 4×(1+2)·60, Sots 3×5·28, BNP 3×6·40, Pallof 3×10"` → `"C&J 4×(1+2)·60, Split Jerk 4×3 (empty bar), BNP 3×6·40, Pallof 3×10"`

Week 4: `"C&J 4×(1+2)·62, Sots 3×5·30"` → `"C&J 4×(1+2)·62, Split Jerk 4×3 (empty bar)"`

Week 5: `"C&J 4×(1+2)·64, Sots 3×5·30"` → `"C&J 4×(1+2)·64, Split Jerk 4×3 (empty bar)"`

Week 6: `"C&J 4×(1+2)·66, Sots 3×5·32"` → `"C&J 4×(1+2)·66, Split Jerk 4×3 (empty bar)"`

Week 7 (deload): `"C&J 2×(1+2)·60, Sots 2×5·28"` → `"C&J 2×(1+2)·60, Split Jerk 4×3 (empty bar)"`

- [ ] **Step 4: Verify the edit**

Run: `grep -n 'id:"sots_press"' "D:/Programming/OlyTracker/docs/src/app.jsx"`
Expected: no matches (the `DAYS_SUMMER` entry is gone; the other 5 unrelated `sots_press` occurrences listed in Step 1 are untouched and still present — do not "fix" those).

Run: `grep -cE "Sots 3×5|Sots 2×5" "D:/Programming/OlyTracker/docs/src/app.jsx"`
Expected: `0`.

Run: `grep -c "Split Jerk 4×3 (empty bar)" "D:/Programming/OlyTracker/docs/src/app.jsx"`
Expected: `7`.

- [ ] **Step 5: Version bump**

Old (~line 4270):
```jsx
                PROGRAM v3.5.1 · 2026-07-29
```
New:
```jsx
                PROGRAM v3.5.2 · 2026-08-04
```

- [ ] **Step 6: Build and verify**

Run: `cd "D:/Programming/OlyTracker" && npm run build`
Expected: exits 0, no esbuild errors, `docs/app.js` timestamp updates.

- [ ] **Step 7: Commit**

```bash
cd "D:/Programming/OlyTracker"
git add docs/src/app.jsx docs/app.js docs/app.js.map
git commit -m "$(cat <<'EOF'
feat: add split-jerk footwork drill to D4, replace Sots Press (v3.5.2)

Split jerk had zero representation in the program despite v3.5.0 removing
the hard "not trained" constraint from the athlete profile. Sots Press
(overhead-mobility accessory) is lower priority right now than unloaded
split-jerk footwork drilling, which ties directly to the removed constraint.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Add a light OHS touch to D2 and D4

**Files:**
- Modify: `docs/src/app.jsx` (DAYS_SUMMER D2 and D4 exercises arrays, ~line 240–275)
- Modify: `docs/src/app.jsx` (PROGRAM_B1 D2 and D4 secondary text, weeks 1–7)
- Modify: `docs/src/app.jsx` (version header)

**Interfaces:**
- Consumes: `EXERCISE_CATALOG.overhead_squat` (already exists and already used on D1/D3).
- Produces: nothing consumed by later tasks — independent change.

- [ ] **Step 1: Confirm current state**

Run: `grep -n "OHS 2×3" "D:/Programming/OlyTracker/docs/src/app.jsx"`
Expected: exactly one match — week 7's D1 deload `primary` field (`"HPS 3×3 / OHS 2×3"`). That's pre-existing and unrelated to this task (D1's own OHS volume dropping during deload); don't touch it. The 14 new occurrences this task adds are all in `secondary` fields on D2 and D4, never in a `primary` field.

- [ ] **Step 2: Edit `DAYS_SUMMER` D2 — add the OHS touch**

Old (end of the `d2` day object's `exercises` array):
```jsx
      {id:"weighted_dips",         sets:4,     reps:"8",      l1:"BW+20 kg",   l2:"BW+25 kg"  },
    ]
  },
  {
    id:"d3", label:"DAY 3", name:"Front Squat + OHS + Quad Hypertrophy",
```
New:
```jsx
      {id:"weighted_dips",         sets:4,     reps:"8",      l1:"BW+20 kg",   l2:"BW+25 kg"  },
      {id:"overhead_squat",        sets:2,     reps:"3",      l1:"40–48 kg",   l2:"46–54 kg"  },
    ]
  },
  {
    id:"d3", label:"DAY 3", name:"Front Squat + OHS + Quad Hypertrophy",
```

- [ ] **Step 3: Edit `DAYS_SUMMER` D4 — add the OHS touch**

Old (end of the `d4` day object's `exercises` array, after Task 1's edit is in place):
```jsx
      {id:"split_jerk",            sets:4,     reps:"3",      l1:"Empty bar",  l2:"Empty bar" },
    ]
  },
  {
    id:"d5", label:"DAY 5", name:"Quad Hypertrophy + Lunge (Back-Sparing)",
```
New:
```jsx
      {id:"split_jerk",            sets:4,     reps:"3",      l1:"Empty bar",  l2:"Empty bar" },
      {id:"overhead_squat",        sets:2,     reps:"3",      l1:"40–48 kg",   l2:"46–54 kg"  },
    ]
  },
  {
    id:"d5", label:"DAY 5", name:"Quad Hypertrophy + Lunge (Back-Sparing)",
```

- [ ] **Step 4: Edit `PROGRAM_B1` D2 secondary text — weeks 1–7**

Append `, OHS 2×3·XX` to the end of each week's `d2` `secondary` string, where `XX` matches that week's D3 OHS number (40/42/44/46/48/50/44 for weeks 1–7 — the same numbers already on D3, see Task 4 for where those live).

Week 1: `"Inc Press 4×8·58, Dips 4×8·BW+20, Trapi 4×8·55, Wide OHP 4×6·35, Dead Bug 3×10"` → append `", OHS 2×3·40"`

Week 2: `"Inc Press 4×8·62, Dips 4×8·BW+20, Trapi 4×8·57, Wide OHP 4×6·37, Dead Bug 3×10"` → append `", OHS 2×3·42"`

Week 3: `"Inc Press 4×8·65, Dips 4×8·BW+22, Trapi 4×8·60, Wide OHP 4×6·40, Dead Bug 3×10"` → append `", OHS 2×3·44"`

Week 4: `"Dips 4×8·BW+24"` → append `", OHS 2×3·46"`

Week 5: `"Dips 4×8·BW+24"` → append `", OHS 2×3·48"`

Week 6: `"Dips 4×8·BW+26"` → append `", OHS 2×3·50"`

Week 7 (deload): `"Dips 2×8·BW+20"` → append `", OHS 2×3·44"`

- [ ] **Step 5: Edit `PROGRAM_B1` D4 secondary text — weeks 1–7**

Append `, OHS 2×3·XX` to the end of each week's `d4` `secondary` string (after Task 1's edit is in place), same XX values as Step 4.

Week 1: `"C&J 4×(1+2)·55, Split Jerk 4×3 (empty bar), BNP 3×6·35, Pallof 3×10"` → append `", OHS 2×3·40"`

Week 2: `"C&J 4×(1+2)·57, Split Jerk 4×3 (empty bar), BNP 3×6·37, Pallof 3×10"` → append `", OHS 2×3·42"`

Week 3: `"C&J 4×(1+2)·60, Split Jerk 4×3 (empty bar), BNP 3×6·40, Pallof 3×10"` → append `", OHS 2×3·44"`

Week 4: `"C&J 4×(1+2)·62, Split Jerk 4×3 (empty bar)"` → append `", OHS 2×3·46"`

Week 5: `"C&J 4×(1+2)·64, Split Jerk 4×3 (empty bar)"` → append `", OHS 2×3·48"`

Week 6: `"C&J 4×(1+2)·66, Split Jerk 4×3 (empty bar)"` → append `", OHS 2×3·50"`

Week 7 (deload): `"C&J 2×(1+2)·60, Split Jerk 4×3 (empty bar)"` → append `", OHS 2×3·44"`

- [ ] **Step 6: Verify the edit**

Run: `grep -c "OHS 2×3" "D:/Programming/OlyTracker/docs/src/app.jsx"`
Expected: `15` (the 1 pre-existing week-7 D1 occurrence from Step 1, unchanged, plus 14 new — 2 per week × 7 weeks).

- [ ] **Step 7: Version bump**

Old:
```jsx
                PROGRAM v3.5.2 · 2026-08-04
```
New:
```jsx
                PROGRAM v3.5.3 · 2026-08-04
```

- [ ] **Step 8: Build and verify**

Run: `cd "D:/Programming/OlyTracker" && npm run build`
Expected: exits 0, no errors.

- [ ] **Step 9: Commit**

```bash
cd "D:/Programming/OlyTracker"
git add docs/src/app.jsx docs/app.js docs/app.js.map
git commit -m "$(cat <<'EOF'
feat: add light OHS touch to D2 and D4 (v3.5.3)

OHS is the #1 snatch limiter (50 kg vs 80 kg clean) but only trained 2x/week
(D1, D3). Adds a light 2x3 technical touch to D2 and D4 mirroring D3's OHS
load progression that week, rather than inventing a second number to track.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Add back-pain gate note to D1 and D3

**Files:**
- Modify: `docs/src/app.jsx` (PROGRAM_B1 D1 and D3 `notes` text, weeks 1–7)
- Modify: `docs/src/app.jsx` (version header)

**Interfaces:**
- Consumes: none.
- Produces: nothing consumed by later tasks — independent change.

- [ ] **Step 1: Confirm current state**

Run: `grep -c "Pain-gate" "D:/Programming/OlyTracker/docs/src/app.jsx"`
Expected: `0`.

- [ ] **Step 2: Append the pain-gate sentence to each week's D1 `notes` string**

Append `" Pain-gate: back pain >3/10 pre-session → drop load ~40% or sub machine-equivalent."` to the end of each week's `d1` `notes` value (inside the closing quote).

Week 1: `notes:"MS opener 2×3·42"` → `notes:"MS opener 2×3·42. Pain-gate: back pain >3/10 pre-session → drop load ~40% or sub machine-equivalent."`

Week 2: `notes:"MS opener 2×3·44"` → same pattern, append the sentence.

Week 3: `notes:"MS opener 2×3·44"` → same pattern, append the sentence.

Week 4: `notes:"MS opener 2×3·46. OHS now 4 sets"` → append the sentence after "OHS now 4 sets".

Week 5: `notes:"MS opener 2×3·46"` → same pattern, append the sentence.

Week 6: `notes:"MS opener 2×3·48. OHS 50 kg — Block 1 milestone"` → append the sentence after "Block 1 milestone".

Week 7: `notes:"MS opener 2×3·44. Technique priority"` → append the sentence after "Technique priority".

- [ ] **Step 3: Append the same sentence to each week's D3 `notes` string**

Week 1: `notes:"MS opener 2×3·42. Hard stop 3pm. PAUSE FS — pause reps teach position + build tissue. FS held ≤80% (Wed cap)"` → append the pain-gate sentence at the end.

Week 2: `notes:"MS opener 2×3·44. Hard stop 3pm. PAUSE FS — pause reps teach position + build tissue. FS held ≤80% (Wed cap)"` → same pattern.

Week 3: `notes:"MS opener 2×3·44. Hard stop 3pm. PAUSE FS — last week of pause reps. FS held ≤80% (Wed cap)"` → same pattern.

Week 4: `notes:"MS opener 2×3·46. Hard stop 3pm. FS 4×6 controlled tempo — drive quad mass. FS held ≤80% (Wed cap)"` → same pattern.

Week 5: `notes:"MS opener 2×3·46. Hard stop 3pm. FS 4×6 controlled tempo — drive quad mass. FS held ≤80% (Wed cap)"` → same pattern.

Week 6: `notes:"MS opener 2×3·48. Hard stop 3pm. FS 4×6 controlled tempo — drive quad mass. FS held ≤80% (Wed cap)"` → same pattern.

Week 7: `notes:"MS opener 2×3·44. Hard stop 3pm. FS 3×6 light — deload volume"` → same pattern.

- [ ] **Step 4: Verify the edit**

Run: `grep -c "Pain-gate" "D:/Programming/OlyTracker/docs/src/app.jsx"`
Expected: `14` (D1 + D3 × 7 weeks).

- [ ] **Step 5: Version bump**

Old:
```jsx
                PROGRAM v3.5.3 · 2026-08-04
```
New:
```jsx
                PROGRAM v3.5.4 · 2026-08-04
```

- [ ] **Step 6: Build and verify**

Run: `cd "D:/Programming/OlyTracker" && npm run build`
Expected: exits 0, no errors.

- [ ] **Step 7: Commit**

```bash
cd "D:/Programming/OlyTracker"
git add docs/src/app.jsx docs/app.js docs/app.js.map
git commit -m "$(cat <<'EOF'
feat: add back-pain gate note to D1 and D3 (v3.5.4)

Makes the load-reduction rule for back-loaded days explicit and visible in
the program view, matching the existing "Hard stop 3pm" note pattern on D3
rather than introducing new UI for a one-line rule.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Add Pallof Press to D3

**Files:**
- Modify: `docs/src/app.jsx` (DAYS_SUMMER D3 exercises array, ~line 252–263)
- Modify: `docs/src/app.jsx` (PROGRAM_B1 D3 secondary text, weeks 1–7)
- Modify: `docs/src/app.jsx` (version header)

**Interfaces:**
- Consumes: `EXERCISE_CATALOG.pallof_press` (already exists).
- Produces: nothing consumed by later tasks — independent change.

- [ ] **Step 1: Confirm current state**

Run: `grep -c "Pallof 3×10" "D:/Programming/OlyTracker/docs/src/app.jsx"`
Expected: `3` (pre-existing, D4 weeks 1–3 only — see Task 1, out of scope to touch).

- [ ] **Step 2: Edit `DAYS_SUMMER` D3 — add Pallof Press**

Old (end of the `d3` day object's `exercises` array):
```jsx
      {id:"overhead_squat",        sets:4,     reps:"4",      l1:"40–48 kg",   l2:"46–54 kg"  },
    ]
  },
  {
    id:"d4", label:"DAY 4", name:"🎯 Jerk Priority + C&J",
```
New:
```jsx
      {id:"overhead_squat",        sets:4,     reps:"4",      l1:"40–48 kg",   l2:"46–54 kg"  },
      {id:"pallof_press",          sets:3,     reps:"10",     l1:"Light",      l2:"Light-Med" },
    ]
  },
  {
    id:"d4", label:"DAY 4", name:"🎯 Jerk Priority + C&J",
```

- [ ] **Step 3: Edit `PROGRAM_B1` D3 secondary text — weeks 1–7**

Append `, Pallof 3×10` to the end of each week's `d3` `secondary` string.

Week 1: `"SB 3×3·35, RDL 4×6·75, OHS 4×4·40, Plank 3×50s"` → append `", Pallof 3×10"`

Week 2: `"SB 3×3·37, RDL 4×6·77, OHS 4×4·42, Plank 3×50s"` → append `", Pallof 3×10"`

Week 3: `"SB 3×3·38, RDL 4×6·80, OHS 4×4·44, Plank 3×60s"` → append `", Pallof 3×10"`

Week 4: `"RDL 4×6·82, OHS 4×4·46"` → append `", Pallof 3×10"`

Week 5: `"RDL 4×6·85, OHS 4×4·48"` → append `", Pallof 3×10"`

Week 6: `"RDL 4×6·88, OHS 4×4·50"` → append `", Pallof 3×10"`

Week 7 (deload): `"RDL 2×6·80, OHS 2×4·44"` → append `", Pallof 3×10"`

- [ ] **Step 4: Verify the edit**

Run: `grep -c "Pallof 3×10" "D:/Programming/OlyTracker/docs/src/app.jsx"`
Expected: `10` (3 pre-existing on D4 weeks 1–3, unchanged, plus 7 new on D3 weeks 1–7).

- [ ] **Step 5: Version bump**

Old:
```jsx
                PROGRAM v3.5.4 · 2026-08-04
```
New:
```jsx
                PROGRAM v3.5.5 · 2026-08-04
```

- [ ] **Step 6: Build and verify**

Run: `cd "D:/Programming/OlyTracker" && npm run build`
Expected: exits 0, no errors.

- [ ] **Step 7: Commit**

```bash
cd "D:/Programming/OlyTracker"
git add docs/src/app.jsx docs/app.js docs/app.js.map
git commit -m "$(cat <<'EOF'
feat: add Pallof Press to D3 for anti-rotation core work (v3.5.5)

D5's Ab Wheel was the only regular anti-rotation core work. Adding Pallof
Press to D3 brings this to 2x/week without overcrowding D5's existing 5
exercises or touching D5 at all.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: Add "DAILY CORE" mobility tab

**Files:**
- Modify: `docs/src/app.jsx` (`MOBILITY` object — new `core` key, ~line 1121–1153)
- Modify: `docs/src/app.jsx` (`MobilityTab`'s `sections` array, ~line 1200–1208)
- Modify: `docs/src/app.jsx` (`DrillCard`'s `areaColors` map, ~line 1166–1172)
- Modify: `docs/src/app.jsx` (version header)

**Interfaces:**
- Consumes: existing `DrillCard` component (renders `{name, duration, tool, area, desc}` drill objects — matches the shape every other `MOBILITY.*` section already uses).
- Produces: nothing consumed by later tasks — independent change.

- [ ] **Step 1: Confirm current state**

Run: `grep -c "DAILY CORE\|MOBILITY.core" "D:/Programming/OlyTracker/docs/src/app.jsx"`
Expected: `0`.

- [ ] **Step 2: Add the `MOBILITY.core` section — insert between `ankle` and `bed`**

Old:
```jsx
      {name:"Banded Couch Stretch", duration:"90 sec/side", tool:"Band + wall/rack",
       area:"hip flexors", desc:"Couch stretch (rear knee down, rear foot up the wall, upright torso) with a band looped high on the rear thigh pulling the hip forward. The distraction lets you relax deeper. Critical for a night-shift sitter — tight hip flexors cap squat depth."},
    ]
  },
  bed: {
```
New:
```jsx
      {name:"Banded Couch Stretch", duration:"90 sec/side", tool:"Band + wall/rack",
       area:"hip flexors", desc:"Couch stretch (rear knee down, rear foot up the wall, upright torso) with a band looped high on the rear thigh pulling the hip forward. The distraction lets you relax deeper. Critical for a night-shift sitter — tight hip flexors cap squat depth."},
    ]
  },
  core: {
    label:"DAILY — CORE BRACING (McGill Big Three)",
    color:"#8b5cf6", time:"6–8 min",
    note:"Spinal-endurance bracing, not spinal flexion — safe for chronic back pain and worth doing before every single session, regardless of what's on the day's menu. These three drills train the core isometrically instead of through crunching/flexion, which is exactly what a back-pain athlete needs.",
    drills:[
      {name:"McGill Curl-Up", duration:"3×8 (8s hold each)", tool:"Floor",
       area:"core", desc:"Lie on your back, one knee bent with foot flat, other leg straight. Hands under the small of your back to preserve its natural arch. Lift only your head and shoulders slightly off the floor — no spinal flexion, no crunching. Hold 8s, lower slowly. This trains ab bracing isometrically without loading the lumbar spine in flexion."},
      {name:"Side Plank", duration:"3×20–30s/side", tool:"Floor",
       area:"core", desc:"Forearm on the floor, body in a straight line from ankles to shoulders, hips lifted off the floor. Hold. Trains anti-lateral-flexion — the obliques and QL working isometrically to keep the spine level, directly relevant to staying square under an asymmetric bar path."},
      {name:"Bird Dog Hold", duration:"3×8/side (5–8s hold each rep)", tool:"Floor",
       area:"core", desc:"On hands and knees, extend opposite arm and leg until level with the torso, keeping the spine neutral (no rotation or sagging). Hold 5–8s, return with control, alternate sides. Trains anti-rotation and anti-extension together — the exact stability pattern that keeps the low back safe when bar position pulls the torso off-center."},
    ]
  },
  bed: {
```

- [ ] **Step 3: Add "core" to `areaColors` in `DrillCard`**

Old:
```jsx
    "full chain":"var(--gold)", "shoulder/lat":"#d4a843", "shoulder/elbow":"#d4a843",
    "shoulder/thoracic":"#4a90d9", "full back":"var(--text2)", "lat/thoracic":"#5a9e45",
  };
```
New:
```jsx
    "full chain":"var(--gold)", "shoulder/lat":"#d4a843", "shoulder/elbow":"#d4a843",
    "shoulder/thoracic":"#4a90d9", "full back":"var(--text2)", "lat/thoracic":"#5a9e45",
    "core":"#8b5cf6",
  };
```

- [ ] **Step 4: Wire the new tab into `MobilityTab`'s `sections` array**

Old:
```jsx
    {id:"ankle",   label:"DAILY ANKLE", data:MOBILITY.ankle},
    {id:"post",    label:"POST",        data:MOBILITY.post},
```
New:
```jsx
    {id:"ankle",   label:"DAILY ANKLE", data:MOBILITY.ankle},
    {id:"core",    label:"DAILY CORE",  data:MOBILITY.core},
    {id:"post",    label:"POST",        data:MOBILITY.post},
```

- [ ] **Step 5: Verify the edit**

Run: `grep -c "DAILY CORE" "D:/Programming/OlyTracker/docs/src/app.jsx"`
Expected: `1` (the `sections` array entry's `label`).

Run: `grep -c "MOBILITY.core" "D:/Programming/OlyTracker/docs/src/app.jsx"`
Expected: `1` (the same `sections` array entry's `data` reference — note both matches are on the same line, so this is a separate check from the one above, not a duplicate).

Run: `node -e "const s=require('fs').readFileSync('D:/Programming/OlyTracker/docs/src/app.jsx','utf8'); const drills=(s.match(/core: \{[\s\S]*?\n  \},\n  bed:/)||[''])[0]; console.log((drills.match(/name:/g)||[]).length)"`
Expected: `3` (three drills in the new core section).

- [ ] **Step 6: Version bump**

Old:
```jsx
                PROGRAM v3.5.5 · 2026-08-04
```
New:
```jsx
                PROGRAM v3.5.6 · 2026-08-04
```

- [ ] **Step 7: Build and verify**

Run: `cd "D:/Programming/OlyTracker" && npm run build`
Expected: exits 0, no errors.

- [ ] **Step 8: Manual visual check**

Run the app (open `docs/index.html` in a browser, or `npm run watch` + local server per the project's usual dev flow) and navigate to the Mobility tab. Confirm:
- A "DAILY CORE" tab button appears between "DAILY ANKLE" and "POST".
- Clicking it shows all three drills (McGill Curl-Up, Side Plank, Bird Dog Hold) with correct duration/tool/area pills, and each expands to show its description on click.

- [ ] **Step 9: Commit**

```bash
cd "D:/Programming/OlyTracker"
git add docs/src/app.jsx docs/app.js docs/app.js.map
git commit -m "$(cat <<'EOF'
feat: add DAILY CORE mobility tab (McGill Big Three) (v3.5.6)

Standardizes a daily spinal-endurance warm-up (curl-up, side plank, bird
dog), mirroring the existing DAILY ANKLE tab pattern for content that's
the same every day regardless of session type. Addresses the "daily
non-negotiable warm-up" recommendation from master_synthesis.md.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: Final end-to-end verification

**Files:** none modified — this is a QA pass over the cumulative result of Tasks 1–5.

**Interfaces:**
- Consumes: the fully-updated `docs/src/app.jsx` / `docs/app.js` from Tasks 1–5.
- Produces: nothing — terminal task.

- [ ] **Step 1: Confirm final header version**

Run: `grep -n "PROGRAM v" "D:/Programming/OlyTracker/docs/src/app.jsx"`
Expected: `PROGRAM v3.5.6 · 2026-08-04`.

- [ ] **Step 2: Confirm all five additions are present simultaneously**

Run:
```bash
cd "D:/Programming/OlyTracker"
grep -c "Split Jerk 4×3 (empty bar)" docs/src/app.jsx   # expect 7
grep -c "OHS 2×3" docs/src/app.jsx                       # expect 15 (1 pre-existing week-7 D1 deload + 14 new)
grep -c "Pain-gate" docs/src/app.jsx                      # expect 14
grep -c "Pallof 3×10" docs/src/app.jsx                    # expect 10 (3 pre-existing on D4 weeks 1-3 + 7 new on D3)
grep -c "DAILY CORE" docs/src/app.jsx                     # expect 1 (sections array label)
```

- [ ] **Step 3: Confirm no leftover `sots_press` program-template reference**

Run: `grep -n 'id:"sots_press"' "D:/Programming/OlyTracker/docs/src/app.jsx"`
Expected: no matches (the `DAYS_SUMMER` D4 entry is gone).

Run: `grep -cE "Sots 3×5|Sots 2×5" "D:/Programming/OlyTracker/docs/src/app.jsx"`
Expected: `0`.

Note: `grep -c sots_press` (unquoted, no `id:` prefix) will still return `5` — that's correct, not a bug. The `EXERCISE_CATALOG` definition, PR history, and alias maps intentionally still reference `sots_press` since it remains a valid loggable exercise.

- [ ] **Step 4: Manual spot-check two `PROGRAM_B1` weeks in the running app**

Open the app, view Week 1 and Week 6 in the program view. Confirm:
- D2 and D4 both show an OHS entry that wasn't there before.
- D4 shows "Split Jerk" instead of "Sots".
- D1 and D3 notes end with the pain-gate sentence.
- D3 secondary ends with "Pallof 3×10".
- No exercise name renders as blank or as a raw id string (would indicate a typo'd `EXERCISE_CATALOG` id in a `DAYS_SUMMER` edit).

- [ ] **Step 5: Report completion**

No commit for this task (verification only, nothing changed). If any check in Steps 1–4 fails, identify which Task's edit is responsible and fix it there (creating a new small commit on top, not amending prior history).
