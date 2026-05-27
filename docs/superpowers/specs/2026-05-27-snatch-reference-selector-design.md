# Snatch Reference Selector — Design Spec
**Date:** 2026-05-27  
**Status:** Approved

---

## Overview

Add a second snatch reference to `VideoReview.html`: Torokhtiy's "HOW TO SNATCH / A Visual Guide" (`youtube.com/watch?v=yHZ1eZ8fJjc`). The existing Lasha Talakhadze 220kg WR snatch reference is preserved. A reference selector lets the user choose which reference to use before analyzing. The selected reference drives both the visual strip and the frames sent to Claude.

**Also adds a YouTube embed** for references that have a video source, so the user can replay the reference lift while reviewing their own.

---

## Scope

### In
- `REFERENCE_SETS` data structure replacing flat `REFERENCE_FRAMES`
- 6 frames extracted from the Torokhtiy video, baked as base64 JPEGs
- Reference selector pill UI above the reference strip (per-exercise, stateful)
- YouTube iframe embed below the reference strip when a reference has `youtubeId`
- Snatch only — no changes to C&J or Split Jerk references

### Out
- A generic "add your own reference" flow
- Reference persistence across page reloads
- Changes to any other exercise's reference data
- Changes to the Claude prompt, CV pipeline, or frame extraction logic

---

## Data Model

Replace `REFERENCE_FRAMES` and `getRefFrames()` with `REFERENCE_SETS` and `getRefSets()`:

```js
const REFERENCE_SETS = {
  snatch: [
    {
      id: 'lasha_220kg',
      label: 'Lasha Talakhadze 220kg WR',
      frames: [ {t: 5.0, b64: '...'}, ... ]   // existing 3 frames
    },
    {
      id: 'torokhtiy_guide',
      label: 'Torokhtiy Snatch Guide',
      youtubeId: 'yHZ1eZ8fJjc',
      frames: [ {t: ..., b64: '...'}, ... ]   // 6 newly extracted frames
    }
  ],
  clean_jerk: [
    { id: 'torokhtiy_cj', label: 'Torokhtiy C&J technique guide', frames: [...] }
  ],
  split_jerk: [
    { id: 'torokhtiy_sj', label: 'Torokhtiy Split Jerk technique guide', frames: [...] }
  ]
};

function getRefSets(exercise) {
  if (exercise === 'snatch')     return REFERENCE_SETS.snatch;
  if (exercise === 'clean_jerk') return REFERENCE_SETS.clean_jerk;
  if (exercise === 'split_jerk') return REFERENCE_SETS.split_jerk;
  return null;
}
```

**Claude call:** unchanged in shape — still passes `refFrames.frames` as image blocks. `buildPrompt` receives the selected set's label as the reference name string.

---

## Frame Extraction

Frames are extracted once during development (not at runtime) and baked into the JS.

**Tool:** `yt-dlp` + `ffmpeg`

**Process:**
1. Download the video at 720p with `yt-dlp`
2. Identify 6 timestamps covering each snatch phase:  
   Setup / First Pull / Transition / Second Pull / Catch / Recovery
3. Extract one frame per phase with `ffmpeg -ss <t> -vframes 1`
4. Resize to 480px height JPEG (`-vf scale=-1:480`)
5. Convert each JPEG to base64 and paste into the `frames` array with the corresponding `t` value

**Output:** 6 `{t, b64}` entries in `REFERENCE_SETS.snatch[1].frames`

---

## UI Changes

### Reference Selector

A pill/tab row inserted above the reference strip, visible only when `getRefSets(exercise)` returns 2+ sets:

```
[ Lasha WR 220kg ]  [ Torokhtiy Snatch Guide ]
```

- Active pill: gold border + slight background highlight  
- Inactive: muted text, grey border  
- State: `selectedRefId` per exercise, defaults to the first set (`lasha_220kg` for snatch)  
- Stored in component state only — resets on page reload

### YouTube Embed

Below the reference strip, when the selected set has `youtubeId`:

```
┌─────────────────────────────────────┐
│  [YouTube iframe — 16:9, 100% width]│
│  youtube.com/embed/<id>             │
│  ?rel=0&modestbranding=1            │
└─────────────────────────────────────┘
```

- No autoplay  
- Max height: 240px (keeps it supplementary, not dominant)  
- Rendered inside the existing reference section card

### Updated `ReferenceFramesStrip` Props

```jsx
<ReferenceFramesStrip exercise={exercise} selectedRefId={selectedRefId} onSelectRef={setSelectedRefId} />
```

Internal: looks up `getRefSets(exercise)`, finds the selected set, renders selector + frames + optional embed.

---

## Backward Compatibility

`REFERENCE_FRAMES` and `getRefFrames()` are removed and replaced. No other callers outside `ReferenceFramesStrip` and `analyzeVideo()`. Both callers are updated in the same change.

The existing Lasha frame data migrates unchanged into `REFERENCE_SETS.snatch[0].frames`.

---

## File Location

`d:\Programming\OlyTracker\VideoReview.html` — single-file app, no other files modified.
