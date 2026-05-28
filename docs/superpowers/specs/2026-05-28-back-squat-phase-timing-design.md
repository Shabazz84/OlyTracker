# Back Squat Exercise + Phase Timing Display — Design Spec
**Date:** 2026-05-28  
**Status:** Approved

---

## Overview

Two additions to `VideoReview.html`:

1. **Back Squat** — new exercise with long-femur-focused cues sourced from Torokhtiy, Klokov, and the "Long Femur Lifters Learn From Nino's Squat" transcript (`youtube.com/watch?v=CTMLOj_5x1M`). No reference frames or video.

2. **Phase Timing Display** — new `PhaseTimingRow` component shown in Results below the phase timeline. Computes how many seconds each phase took from the extracted frame timestamps + Claude's `frame_phases` classification. Works for all exercises.

---

## Scope

### In
- `back_squat` exercise entry: EXERCISES, PHASES, PHASE_VISUAL, CUES
- Long-femur squat cues (8–12) extracted from video transcript + Torokhtiy/Klokov knowledge base
- `getRefSets('back_squat')` returns null (no reference frames)
- `PhaseTimingRow` component in Results
- Phase timing computation function

### Out
- Reference frames or YouTube embed for back squat (can add later)
- Changes to any existing exercise's data
- Timing-only mode (timing always shown alongside existing phase results)
- Frame count changes or new extraction logic

---

## Back Squat Exercise

### EXERCISES entry
```js
{ id: 'back_squat', label: 'Back Squat' }
```
Inserted after `split_jerk` in the array.

### PHASES entry
```js
back_squat: ['Setup', 'Descent', 'Bottom', 'Ascent']
```

### PHASE_VISUAL entries
```js
'Setup':   'athlete standing with bar on upper back, feet shoulder-width apart or wider, looking straight ahead',
'Descent': 'athlete lowering into squat, hips moving back and down, knees tracking over toes, torso leaning forward',
'Bottom':  'athlete at full depth below parallel, hips below knee crease, chest up if possible',
'Ascent':  'athlete driving up from bottom, hips rising, knees pushing out, returning to standing',
```

### CUES entry
8–12 cues for long-femur squatters. Sourced from:
- **Torokhtiy**: wide stance, knee tracking, hip drive
- **Klokov**: bracing and positioning cues
- **"Long Femur Lifters Learn From Nino's Squat"** (`CTMLOj_5x1M`): long-femur-specific adjustments

Cue format (same as all other exercises):
```js
{ cue: '...', phase: 'Descent|Bottom|Ascent|Setup', body: '<segment>', source: '<coach/video>', detail: '...' }
```

**Body segment values** (from existing SVG diagram): `hips`, `knees`, `lower_back`, `upper_back`, `shoulders`, `left_elbow`, `right_elbow`, `wrists`

**Cue sources to use:**
- Torokhtiy: bar position on upper back, stance width for long femurs, forward lean is acceptable (not a fault), hip crease below knee required
- Klokov: brace hard before descent, elbows under bar (not behind), drive knees out throughout
- Nino's Squat video: long-femur-specific technique points extracted from transcript

**Implementation note for cue extraction:** Download transcript of `https://www.youtube.com/watch?v=CTMLOj_5x1M` using `python -m yt_dlp --write-auto-sub --skip-download`. Extract technique cues relevant to long-femur squatters and format per the schema above.

### REFERENCE_SETS
No entry for `back_squat`. `getRefSets('back_squat')` must return null.

The `getRefSets` function requires one new branch:
```js
// back_squat: no reference set defined — returns null via the default fallthrough
```
No code change needed — existing `return null` at the end of `getRefSets` already handles it.

---

## Phase Timing Display

### Computation

New pure function (no React):

```js
function computePhaseTiming(poseFrames, framePhases) {
  // Returns array: [{ phase, firstTs, lastTs, durationS }]
  // Only includes phases that appear in framePhases
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
```

When only one frame is in a phase, `firstTs === lastTs` → `durationS === 0`. Display as `< 1 frame` (timing not meaningful at this resolution).

### PhaseTimingRow Component

New component, placed in Results immediately after `<PhaseTimeline>` and before `<ReferenceFramesStrip>`:

```jsx
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
```

### Results wiring

In `Results`, add `PhaseTimingRow` between `PhaseTimeline` and `ReferenceFramesStrip`:

```jsx
<PhaseTimeline phases={phases} phaseData={structured.phases} />
<PhaseTimingRow poseFrames={poseFrames} framePhases={structured.frame_phases} />
<ReferenceFramesStrip exercise={exercise} selectedRefId={selectedRefId} />
```

`poseFrames` is already available in `Results` props.

---

## Claude Prompt

No change needed for the back squat. The prompt uses `PHASES[exercise]`, `CUES[exercise]`, and the `EXERCISES` label — all of which are populated by the new data. The JSON schema in the prompt already handles any 4-phase exercise.

---

## File Location

`d:\Programming\OlyTracker\VideoReview.html` — all changes in this file only.

---

## Verification

After implementation:
- Back Squat appears in the exercise selector dropdown
- Analyzing a squat video produces 4-phase output (Setup/Descent/Bottom/Ascent)
- Phase Timing row appears in Results for all exercises
- Phases with 1 frame show `(<1 frame)`, phases with 2+ frames show duration
- `getRefSets('back_squat')` returns null (no reference pills, no strip in results)
