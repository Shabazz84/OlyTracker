# Complete Program Design
**Date:** 2026-05-20
**Status:** Approved

## Overview

Build `summaries/complete_program.md` — a complete 32-week training program for an intermediate powerlifter transitioning to Olympic weightlifting. Grounded in `summaries/training_system.md` (8-source synthesis).

**Athlete context:** 102.5 kg | BS 118 kg | Clean 80 kg | Jerk ~65 kg | OHS 50 kg (limiter) | Chronic back pain | Push jerk only | Night shifts Wed–Sun 7pm–7:30am.

**Starting point:** Week 1 of Block 1.

**Scope:** Block 1 fully detailed (week-by-week). Blocks 2–4 at week-level resolution. Phase 2 (app wiring) is a separate task.

---

## Output: `summaries/complete_program.md`

Four parts in order.

---

### Part 1: Program Review

Four flags between current tracker sessions (`docs/index.html` → `DAYS_SUMMER`) and `training_system.md`. Each flag presented as:

> **Flag N — Day X: Title**
> What it is. Why it conflicts with the training system. **Option A:** ... **Option B:** ...

**Flags:**

| # | Day | Issue |
|---|-----|-------|
| F2 | D2 | Chest hypertrophy focus (Incline Press + Weighted Dips) vs overhead strength (Strict/Push Press for jerk) |
| F3 | D3 | Snatch Balance absent; OHS is 3×3 secondary rather than 4×4–6 primary |
| F4 | D4 | Jerk back-off sets missing — training system calls for 2×3 @ 85% of top single after daily max |
| F5 | D5 | Klokov Squat daily max singles contradict Day 5 "65–70% only, no PRs, tissue day not performance day" rule |

**Resolved before writing:**
- F1 (BS max singles on D1): Kept — Monday is best recovery day, appropriate for max effort.
- Classics from floor (Snatch/Clean from floor): Excluded from all Block 1 sessions — intentional hypertrophy/technique phase decision.

---

### Part 2: Block 1 — Hypertrophy Foundation (Weeks 1–8, Detailed)

**Schedule:** Summer (5 days: Mon/Tue/Wed/Thu/Sat). School term (4 days: Mon/Tue/Wed/Fri) — same content, D5 dropped.

**No full competition lifts from floor in Block 1** — hang variations and partials only throughout all 8 weeks.

#### Week format (compact table)

Each week uses this format:

```
## Week N — [Phase label] · [Load range] · [Weekly target]
[1-line focus note. Back pain protocol if relevant.]

| Day | Primary | Load | Secondary | Notes |
|-----|---------|------|-----------|-------|
| D1 Mon ⭐⭐⭐ | HPS / OHS | XX–XX / XX–XX kg | BS single, GM, Pull-up | ... |
| D2 Tue ⭐⭐⭐ | HPC / ... | ... | ... | ... |
| D3 Wed ⭐⭐ | FS single | ... | ... | Hard stop 3pm |
| D4 Thu ⭐⭐ | Jerk single | ... | ... | 5.5h sleep |
| D5 Sat ⭐⭐ | ... | ... | ... | No PRs |
```

#### Phase structure

**Phase 1 — Weeks 1–3: 65–72% TM**
- Goal: Establish positions, build tissue, ingrain patterns at sub-maximal load
- Progression: +2.5 kg per primary lift per week across all days
- Jerk: prescribed sets/reps (no daily max singles yet — technique learning phase)
- OHS: 3 sets, conservative load, 2s pause — position priority over load
- Muscle Snatch opener: every session, every day (2×3 @ 40–50%)

**Phase 2 — Weeks 4–6: 72–80% TM**
- Goal: Introduce auto-regulation; first daily max singles on jerk
- Progression: +2.5 kg per primary lift per week; jerk singles begin Week 4
- OHS: progress toward 55–60 kg target; sets increase to 4
- Back Squat singles: continue on D1, load climbs toward 105–110 kg range
- Jerk (D4): daily max singles protocol begins (Golovinsky/Pavlukhin)

**Deload — Week 7**
- Volume −40% across all exercises
- Intensity maintained (same loads, fewer sets)
- Technique-only focus; no max efforts
- Muscle Snatch opener continues

**Test — Week 8**
- 1RM attempts: Snatch (HPS max), Clean (HPC max), Jerk from rack, OHS, Front Squat
- Note: No floor classics — test HPS and HPC maxes as Block 1 equivalents
- Block 1→2 advance checklist (from `training_system.md`):
  - [ ] OHS ≥ 60 kg with solid position
  - [ ] Consistent technique at 75–80% TM on hang snatch and clean
  - [ ] Back pain stable at 🟡 or better for 2+ consecutive weeks
  - [ ] 8 weeks completed

#### Per-day exercise skeleton (constant across Block 1, loads vary by week)

**D1 — Snatch + Posterior Chain (Mon)**
1. Muscle Snatch — 2×3 @ 40–50% (opener)
2. Hang Power Snatch — 5×3 (primary snatch work)
3. Overhead Squat — 3–4 sets (OHS development)
4. Back Squat — Daily Max Single (Ph1: prescribed; Ph2: auto-reg)
5. Good Morning — 4×8 (posterior chain)
6. Weighted Pull-up — 4×6–8
7. GHR — 3×8

**D2 — Clean + Upper Hypertrophy (Tue)**
1. Muscle Snatch — 2×3 @ 40–50% (opener)
2. Hang Power Clean — 5×3 (primary clean work)
3. Clean Pull — 4×4
4. Incline Barbell Press — 4×8 *[see F2]*
5. Weighted Dips — 4×8 *[see F2]*
6. Klokov Trapi — 4×8
7. Wide Overhead Press — 4×6
8. Dead Bug — 3×10/side

**D3 — Front Squat + Posterior Chain (Wed)**
1. Muscle Snatch — 2×3 @ 40–50% (opener)
2. Snatch Balance — *[see F3 — absent currently; flag for decision]*
3. Front Squat — Daily Max Single + 3×4 volume
4. RDL — 4×6
5. GHR — 3×10
6. Snatch High Pull — 3×4
7. Overhead Squat — 3×3 *[see F3]*
8. Plank — 3×50s

**D4 — Jerk Priority (Thu)**
1. Muscle Snatch — 2×3 @ 40–50% (opener)
2. Jerk from Rack — Daily Max Single (Ph2) / 4×3 prescribed (Ph1)
3. Jerk back-off — 2×3 @ 85% of single *[see F4 — absent currently]*
4. Push Press — 4×5
5. Clean & Jerk — 4×(1+2)
6. Sots Press — 3×5
7. Behind Neck Press — 3×6
8. Pallof Press — 3×10/side

**D5 — Active Hypertrophy + Technique (Sat)**
1. Muscle Snatch — 2×3 @ 40–50% (opener)
2. Klokov Squat Singles *[see F5 — conflicts with "no PRs" day rule]*
3. Berestov Squat — 3×9
4. Lunge — 3×8/leg
5. Face Pull — 3×15
6. Ab Wheel — 3×8–10

---

### Part 3: Blocks 2–4 (Week-Level Outline)

Each block section includes: goal, load zone, key structural changes from previous block, week-by-week focus in one line each, progression targets for test week.

**Block 2 — Technique Consolidation (Weeks 9–16): 70–85% TM**
- Key change: Introduce full competition lifts from floor (snatch + clean)
- Key change: Jerk back-off volume added (heavy single + 3×3 @ 85%)
- Accumulation Wk 9–12: 70–78%, lead-up exercises dominant
- Intensification Wk 13–14: 78–85%, daily max on snatch + clean
- Deload Wk 15, Test Wk 16
- Test targets: Snatch 68+, Clean 85+, Jerk 75+, OHS 65+

**Block 3 — Strength & Load Development (Weeks 17–24): 75–90% TM**
- Key change: ATW tracking (Torokhtiy — +1%/week, +4% total → +10 kg total)
- Key change: Heavy singles 2× weekly on snatch and clean
- Volume Wk 17–20: 75–82%, ATW baseline established
- Intensification Wk 21–22: 82–90%
- Deload Wk 23, Test Wk 24
- Test targets: Snatch 70+, C&J 90+, ATW +4%

**Block 4 — Competition Prep / Peaking (Weeks 25–28): 85–95% TM**
- Key change: Volume −35%, no variation chasing
- Peak Wk 25–26, Mock comp Wk 27, Taper Wk 28
- Targets: Snatch 70, C&J 90 (Year 1 goal from training system)

---

### Part 4: Progression Checklists

Verbatim criteria from `training_system.md` for each block transition, formatted as checklists.

---

## Phase 2: App Integration (Separate Task)

After the document is written and reviewed:
- Add a "Program" view to `docs/index.html` showing the current week's compact table
- Current week determined by start date + week counter in localStorage
- Session templates in `DAYS_SUMMER` updated based on flag decisions from Part 1

---

## Constraints

- No competition lifts from floor in Block 1 (all 8 weeks)
- B1/D1: Back Squat daily max singles — kept as-is (resolved)
- Back pain protocol applies throughout: 🔴 pain → substitute as per traffic light system
- School term transition: D5 dropped, 4-day schedule. Block arc unchanged.
- Document must be usable while training — compact table format, not prose-heavy
