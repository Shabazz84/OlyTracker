# Back Squat + Phase Timing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Back Squat as a new exercise with long-femur-focused cues and add a Phase Timing display to all exercise analysis results.

**Architecture:** All changes are in `VideoReview.html` (single-file React app, ~1,590 lines, ~1.5MB). The file is too large for the Edit tool — every change must use Python string replacement via a script written to a temp file and executed. `poseFrames` and `structured.frame_phases` are already available in the `Results` component, so no data-flow changes are needed for timing.

**Tech Stack:** Single HTML file — React 18 (Babel CDN), inline JS, Python for edits.

---

## Critical context for implementers

- **Never use the Edit tool on VideoReview.html** — it will fail silently or error. Always write a Python script to a temp file and execute it.
- **Always assert the old string exists** before replacing, or the edit silently does nothing.
- **The file is ~1.5MB**: read it with `open(..., encoding='utf-8')` and write with the same encoding.
- **Python heredoc**: use `python3 << 'PYEOF'` syntax in Bash for inline Python.
- **PHASE_VISUAL is a flat dict** keyed by phase name string (not by exercise). `'Descent'`, `'Bottom'`, `'Ascent'` already exist in it — they currently describe OHS (bar overhead). Task 1 updates them to generic descriptions that work for both OHS and back squat.
- **`getRefSets('back_squat')` returns null** via the existing `return null` fallthrough at the end of `getRefSets`. No code change needed.

---

## File Structure

**Modified:** `d:\Programming\OlyTracker\VideoReview.html`

Changes per task:
- Task 1: EXERCISES (line ~49), PHASE_VISUAL (lines ~67–69), PHASES (line ~164), CUES (new `back_squat` key after last existing key)
- Task 2: new `computePhaseTiming` function (before Results, line ~1418), new `PhaseTimingRow` component (same location), Results render (line ~1459–1460)

---

## Task 1: Back Squat Exercise Data

**Files:**
- Modify: `d:\Programming\OlyTracker\VideoReview.html` (EXERCISES, PHASE_VISUAL, PHASES, CUES)

- [ ] **Step 1: Write and run the Python edit script**

Write this to `C:/Users/ivanb/AppData/Local/Temp/add_back_squat.py` and execute it:

```python
with open('d:/Programming/OlyTracker/VideoReview.html', 'r', encoding='utf-8') as f:
    html = f.read()

# ── 1. EXERCISES: add back_squat after split_jerk ──────────────────────────
old_exercises = "  { id: 'split_jerk',  label: 'Split Jerk' },\n];"
new_exercises = "  { id: 'split_jerk',  label: 'Split Jerk' },\n  { id: 'back_squat',  label: 'Back Squat' },\n];"
assert old_exercises in html, "EXERCISES anchor not found"
html = html.replace(old_exercises, new_exercises, 1)

# ── 2. PHASE_VISUAL: update Descent/Bottom/Ascent to generic descriptions ──
old_descent = "  'Descent':     'bar overhead, athlete squatting down with bar locked out above',"
new_descent = "  'Descent':     'athlete lowering into squat, hips moving back and down, knees tracking over toes, torso leaning forward',"
assert old_descent in html, "PHASE_VISUAL Descent anchor not found"
html = html.replace(old_descent, new_descent, 1)

old_bottom = "  'Bottom':      'athlete in full squat with bar locked overhead',"
new_bottom = "  'Bottom':      'athlete at full depth below parallel, hips below knee crease, chest up',"
assert old_bottom in html, "PHASE_VISUAL Bottom anchor not found"
html = html.replace(old_bottom, new_bottom, 1)

old_ascent = "  'Ascent':      'athlete standing up from squat with bar locked overhead',"
new_ascent = "  'Ascent':      'athlete driving up from bottom, hips rising, knees pushing out, returning to standing',"
assert old_ascent in html, "PHASE_VISUAL Ascent anchor not found"
html = html.replace(old_ascent, new_ascent, 1)

# ── 3. PHASES: add back_squat after split_jerk ─────────────────────────────
old_phases = "  split_jerk:  ['Setup','Dip','Drive','Split Catch','Recovery'],\n};"
new_phases = "  split_jerk:  ['Setup','Dip','Drive','Split Catch','Recovery'],\n  back_squat:  ['Setup','Descent','Bottom','Ascent'],\n};"
assert old_phases in html, "PHASES anchor not found"
html = html.replace(old_phases, new_phases, 1)

# ── 4. CUES: add back_squat entry after split_jerk's closing bracket ────────
# Find end of split_jerk cues (last entry before closing `};` of CUES object)
# The CUES object ends with the last exercise's array then `};`
old_cues_end = "\n};\n\n// ── Athlete profile"
new_back_squat_cues = """
  back_squat: [
    // Setup
    { cue:'Stand wider than shoulder-width — hips sit between heels, not over toes', phase:'Setup', body:'hips', source:"Nino's Squat",
      detail:'Long femurs demand a wider stance to reduce forward knee travel requirements. Narrow stance forces excessive torso lean and overloads the posterior chain moment arm.' },
    { cue:'Turn toes out 30–45 degrees — reduces ankle dorsiflexion demand', phase:'Setup', body:'knees', source:"Nino's Squat",
      detail:'Without toe turnout, longer femurs create unrealistic ankle dorsiflexion demands at normal stance width. Toes out allows hips to sit between heels without extreme ankle flexion.' },
    { cue:'Bar sits on upper trap shelf, not on neck — elbows slightly forward', phase:'Setup', body:'upper_back', source:'Torokhtiy',
      detail:'Bar rests on muscular upper traps, not bony cervical spine. Elbows slightly forward (not flared back) creates the shelf and engages upper back.' },
    { cue:'Brace hard — intra-abdominal pressure before knees break', phase:'Setup', body:'lower_back', source:'Klokov',
      detail:'Fill belly with air and lock trunk before any descent. Descending into an unbraced position loads passive structures instead of the core.' },
    // Descent
    { cue:'Knees must travel forward over toes — allow this, do not block it', phase:'Descent', body:'knees', source:"Nino's Squat",
      detail:'Inadequate forward knee travel forces the torso to tip forward disproportionately, shifting load to the posterior chain. Let knees track over toes to maintain manageable back angle.' },
    { cue:'Forward lean is normal for long femurs — it is not a fault', phase:'Descent', body:'upper_back', source:'Torokhtiy',
      detail:'Long-femur athletes will always lean more than short-femur lifters at the same depth. Fighting this lean creates compensatory patterns — accept the lean and train hip drive.' },
    { cue:'Drive knees out throughout the entire movement', phase:'Descent', body:'knees', source:'Klokov',
      detail:'Knee valgus is most likely at the sticking point. Actively push knees out from start of descent through lockout — this is a conscious cue every single rep.' },
    { cue:'Work ankle dorsiflexion — wider stance reduces but does not eliminate the demand', phase:'Descent', body:'knees', source:"Nino's Squat",
      detail:'Even with wide stance and toe turnout, some forward knee travel is required for depth. Ankle dorsiflexion cannot be bypassed and must be trained as a separate priority.' },
    // Bottom
    { cue:'Hip crease must descend below knee crease — non-negotiable depth', phase:'Bottom', body:'hips', source:'Torokhtiy',
      detail:'Depth is non-negotiable for weightlifting-specific squatting. A parallel or high squat does not train the receiving positions required in snatch and clean.' },
    { cue:'Weight through full foot in the hole — not just heels', phase:'Bottom', body:'knees', source:'Klokov',
      detail:'At the bottom, pressure distributes across the whole foot. Heel-only pressure shifts load backward and reduces quad drive on the way up.' },
    // Ascent
    { cue:'Lead ascent with chest up — back angle recovers as hips rise', phase:'Ascent', body:'upper_back', source:'Torokhtiy',
      detail:'Think "chest up" not "hips up" to initiate the ascent. If hips rise faster than chest off the bottom, the lift turns into a good morning through the sticking point.' },
    { cue:'Squat at weights where position never breaks — long femurs allow less margin', phase:'Ascent', body:'upper_back', source:"Nino's Squat",
      detail:'Long-femur lifters are pushed out of position more easily under load. Nino squats at weights that always look easy — maintain this standard to build the pattern correctly.' },
  ],"""
assert old_cues_end in html, "CUES end anchor not found"
html = html.replace(old_cues_end, new_back_squat_cues + "\n};\n\n// ── Athlete profile", 1)

with open('d:/Programming/OlyTracker/VideoReview.html', 'w', encoding='utf-8') as f:
    f.write(html)

print("Task 1 done — back squat data added")
```

- [ ] **Step 2: Verify the edits landed correctly**

```bash
python3 -c "
import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
with open('d:/Programming/OlyTracker/VideoReview.html', 'r', encoding='utf-8') as f:
    html = f.read()
checks = [
    ('back_squat exercise in EXERCISES', \"{ id: 'back_squat',  label: 'Back Squat' }\"),
    ('back_squat in PHASES', \"back_squat:  ['Setup','Descent','Bottom','Ascent']\"),
    ('back_squat cues in CUES', 'back_squat: ['),
    ('Nino cue present', \"Nino's Squat\"),
    ('Klokov brace cue', 'intra-abdominal pressure'),
    ('PHASE_VISUAL Descent updated', 'knees tracking over toes'),
    ('PHASE_VISUAL Bottom updated', 'hips below knee crease'),
    ('PHASE_VISUAL Ascent updated', 'knees pushing out'),
]
for label, needle in checks:
    status = 'OK' if needle in html else 'MISSING'
    print(f'{status}: {label}')
"
```

Expected: all 8 lines print `OK`.

- [ ] **Step 3: Commit**

```bash
git add d:/Programming/OlyTracker/VideoReview.html
git commit -m "$(cat <<'EOF'
feat: add Back Squat exercise with long-femur cues (VideoReview)

Adds back_squat to EXERCISES, PHASES, PHASE_VISUAL, and CUES.
12 cues sourced from Torokhtiy, Klokov, and Nino Pizzolato squat analysis.
Updates Descent/Bottom/Ascent PHASE_VISUAL to generic descriptions
that work for both Back Squat and OHS.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Phase Timing Display

**Files:**
- Modify: `d:\Programming\OlyTracker\VideoReview.html` (new function, new component, Results wiring)

- [ ] **Step 1: Write and run the Python edit script**

Write this to `C:/Users/ivanb/AppData/Local/Temp/add_phase_timing.py` and execute it:

```python
with open('d:/Programming/OlyTracker/VideoReview.html', 'r', encoding='utf-8') as f:
    html = f.read()

# ── 1. Insert computePhaseTiming + PhaseTimingRow before Results ─────────────
# Anchor: the line immediately before `function Results(`
old_results_anchor = "function Results({ exercise, annotatedFrames, poseFrames, claudeResult, selectedRefId }) {"
new_timing_block = """function computePhaseTiming(poseFrames, framePhases) {
  const map = {};
  poseFrames.forEach((f, i) => {
    const phase = framePhases[i];
    if (!phase) return;
    if (!map[phase]) map[phase] = { firstTs: f.timestamp, lastTs: f.timestamp };
    else {
      map[phase].firstTs = Math.min(map[phase].firstTs, f.timestamp);
      map[phase].lastTs  = Math.max(map[phase].lastTs,  f.timestamp);
    }
  });
  return Object.entries(map).map(([phase, { firstTs, lastTs }]) => ({
    phase,
    firstTs,
    lastTs,
    durationS: parseFloat((lastTs - firstTs).toFixed(2)),
  }));
}

function PhaseTimingRow({ poseFrames, framePhases }) {
  if (!poseFrames?.length || !framePhases?.length) return null;
  const timing = computePhaseTiming(poseFrames, framePhases);
  if (!timing.length) return null;
  return (
    <div style={{background:'var(--bg2)', border:'1px solid var(--border2)',
                 borderRadius:6, padding:'12px 16px', marginBottom:16}}>
      <div style={{fontSize:10, color:'var(--text2)', letterSpacing:1, marginBottom:8}}>
        PHASE TEMPO — estimated from {poseFrames.length} frames
      </div>
      <div style={{display:'flex', flexDirection:'column', gap:4}}>
        {timing.map(({ phase, firstTs, lastTs, durationS }) => (
          <div key={phase} style={{display:'flex', alignItems:'center', gap:8, fontSize:12}}>
            <div style={{width:110, color:'var(--text)', flexShrink:0}}>{phase}</div>
            <div style={{color:'var(--text2)', fontSize:11, fontFamily:"'DM Mono',monospace"}}>
              {firstTs.toFixed(1)}s → {lastTs.toFixed(1)}s
            </div>
            <div style={{
              color: durationS > 0 ? 'var(--gold)' : 'var(--text3)',
              fontSize:11, fontFamily:"'DM Mono',monospace", marginLeft:4
            }}>
              {durationS > 0 ? `(${durationS.toFixed(1)}s)` : '(<1 frame)'}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Results({ exercise, annotatedFrames, poseFrames, claudeResult, selectedRefId }) {"""

assert old_results_anchor in html, "Results anchor not found"
html = html.replace(old_results_anchor, new_timing_block, 1)

# ── 2. Wire PhaseTimingRow between PhaseTimeline and ReferenceFramesStrip ────
old_phase_wire = "      <PhaseTimeline phases={phases} phaseData={structured.phases} />\n      <ReferenceFramesStrip exercise={exercise} selectedRefId={selectedRefId} />"
new_phase_wire = "      <PhaseTimeline phases={phases} phaseData={structured.phases} />\n      <PhaseTimingRow poseFrames={poseFrames} framePhases={structured.frame_phases} />\n      <ReferenceFramesStrip exercise={exercise} selectedRefId={selectedRefId} />"
assert old_phase_wire in html, "PhaseTimeline/ReferenceFramesStrip anchor not found"
html = html.replace(old_phase_wire, new_phase_wire, 1)

with open('d:/Programming/OlyTracker/VideoReview.html', 'w', encoding='utf-8') as f:
    f.write(html)

print("Task 2 done — phase timing added")
```

- [ ] **Step 2: Verify the edits landed correctly**

```bash
python3 -c "
import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
with open('d:/Programming/OlyTracker/VideoReview.html', 'r', encoding='utf-8') as f:
    html = f.read()
checks = [
    ('computePhaseTiming function', 'function computePhaseTiming('),
    ('PhaseTimingRow component', 'function PhaseTimingRow('),
    ('PHASE TEMPO label', 'PHASE TEMPO'),
    ('lt1 frame text', '<1 frame'),
    ('PhaseTimingRow wired in Results', 'PhaseTimingRow poseFrames={poseFrames} framePhases={structured.frame_phases}'),
    ('Results function signature intact', 'function Results({ exercise, annotatedFrames, poseFrames, claudeResult, selectedRefId })'),
]
for label, needle in checks:
    status = 'OK' if needle in html else 'MISSING'
    print(f'{status}: {label}')
"
```

Expected: all 6 lines print `OK`.

- [ ] **Step 3: Open the app in a browser and smoke-test**

1. Open `d:/Programming/OlyTracker/VideoReview.html` in Chrome
2. Confirm **Back Squat** appears in the exercise dropdown
3. Select Back Squat — confirm no JS errors in console
4. (Optional: analyze a video) — confirm PHASE TEMPO section appears below the phase timeline

If no video is available for testing, verify at least steps 1–3 pass and the component renders without errors by inspecting the rendered React tree.

- [ ] **Step 4: Commit**

```bash
git add d:/Programming/OlyTracker/VideoReview.html
git commit -m "$(cat <<'EOF'
feat: add Phase Timing display to VideoReview analysis results

Adds computePhaseTiming() and PhaseTimingRow component.
Shows firstTs -> lastTs and duration per phase below the phase timeline.
Single-frame phases display (<1 frame) since duration is 0.
Works for all exercises including the new Back Squat.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Spec self-review

**Spec coverage:**
- `back_squat` in EXERCISES ✓ (Task 1, step 1 part 1)
- `back_squat` in PHASES ✓ (Task 1, step 1 part 3)
- PHASE_VISUAL for Setup/Descent/Bottom/Ascent ✓ (Task 1, step 1 part 2) — note: Setup is already in PHASE_VISUAL as snatch-specific; only Descent/Bottom/Ascent are updated to be generic. This is intentional — changing Setup would break snatch analysis.
- 12 long-femur cues sourced from Torokhtiy, Klokov, Nino's Squat ✓ (Task 1, step 1 part 4)
- `getRefSets('back_squat')` returns null — no code change needed, existing fallthrough handles it ✓
- `computePhaseTiming` function ✓ (Task 2, step 1 part 1)
- `PhaseTimingRow` component ✓ (Task 2, step 1 part 1)
- PhaseTimingRow placed between PhaseTimeline and ReferenceFramesStrip ✓ (Task 2, step 1 part 2)
- Single-frame phases show `(<1 frame)` ✓ (template literal in PhaseTimingRow)
- `poseFrames` already available in Results props — no signature change needed ✓

**Placeholder scan:** None found. Every step has complete Python code.

**Type consistency:** `computePhaseTiming(poseFrames, framePhases)` → used as `computePhaseTiming(poseFrames, framePhases)` in PhaseTimingRow. `poseFrames[i].timestamp` — matches existing frame shape from `extractFrames`. `structured.frame_phases` — matches Claude response shape.
