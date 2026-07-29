# AI Video Review — Design Spec
**Date:** 2026-05-23  
**Status:** Approved

---

## Overview

A standalone single-HTML-file web app that lets the athlete upload a training video, runs computer vision (MediaPipe Pose + bar path tracking) in the browser, sends extracted data + real video frames to the Claude API, and renders a structured technique analysis grounded in the coaching cue library extracted from Pavlukhin, Berestov, Klokov, Everett, and others.

**Not** integrated into OlyTracker — a separate file (`VideoReview.html`) that shares the same design aesthetic.

---

## Scope

### In
- Video file upload (MP4, MOV, WebM)
- Exercise selector: Snatch, Clean & Jerk, OHS, Clean Pull, Snatch Pull, Jerk from Rack
- MediaPipe Pose skeleton overlay on key frames
- Bar path trajectory tracking drawn over frames
- Single Claude API call (claude-sonnet-4-6, multimodal)
- Output: coaching paragraph + phase timeline + annotated key frames (real frames + CV overlays) + cue checklist + body diagram
- API key stored in localStorage (entered once in settings)
- Cue library baked into the app JS from coaching summaries

### Out
- Video recording (upload only)
- Backend server of any kind
- Session history / saving past reviews
- Comparison between sessions
- Split jerk analysis (athlete uses push jerk only)

---

## Architecture

Single HTML file. No build step. Same stack as OlyTracker: React 18 via CDN, inline CSS, inline JS.

**Dependencies (CDN):**
- `react@18` + `react-dom@18` + `@babel/standalone`
- `@mediapipe/pose` — body landmark detection (33 points, runs in-browser via WASM)
- No other external libraries

**Data flow:**
```
Video file
  → <video> element (hidden)
  → Frame extraction loop (Canvas API, 8 frames evenly spaced)
  → MediaPipe Pose per frame → 33 body landmarks
  → Bar path tracker per frame → barbell centroid per frame
  → Canvas render: real frame + skeleton overlay + bar path line → base64 JPEG
  → Claude API call (8 annotated frame images + CV data JSON + cue library + athlete profile)
  → Parse response (JSON block + freeform text)
  → Render: phase timeline, annotated frames strip, cue checklist, body diagram, coaching paragraph
```

---

## Computer Vision

### Frame Extraction
- Seek video to 8 evenly-spaced timestamps across its full duration
- For each timestamp: draw frame to off-screen canvas, capture as base64 JPEG
- Max resolution: 720p (downscale if larger to keep API payload manageable)
- Each frame gets processed for pose + bar path before the next is extracted

### MediaPipe Pose
- Load `@mediapipe/pose` from CDN
- Run inference on each frame's ImageData
- Output: 33 landmarks per frame, each with `{x, y, z, visibility}`
- Draw skeleton on canvas overlay using landmark connections (MediaPipe's standard connection map)
- Color-code joints: green (high visibility), yellow (medium), grey (low/occluded)
- Key joints for OLY analysis: wrists, elbows, shoulders, hips, knees, ankles

### Bar Path Tracking
- Detect barbell plates using HSV color analysis on canvas pixels
- Barbells in gym settings: large circular objects, typically silver/chrome or bright colored plates
- Algorithm: scan each frame for circular blobs in the expected color range, pick the two largest symmetric ones (left plate, right plate), compute centroid
- Track centroid across all 8 frames → draw as polyline (blue, 2px) on each frame from frame 1 to current frame
- Fallback: if detection fails on a frame, interpolate from neighbors; flag with `[estimated]` in the output data

### Output per Frame
Each frame produces:
```json
{
  "frame_index": 0,
  "timestamp_s": 0.8,
  "phase": "setup",
  "pose_landmarks": [...],
  "bar_centroid": {"x": 0.42, "y": 0.61},
  "bar_path_so_far": [{"x": 0.42, "y": 0.61}],
  "key_angles": {
    "left_knee": 162,
    "right_knee": 161,
    "left_hip": 95,
    "right_hip": 96,
    "left_elbow": 178,
    "right_elbow": 177
  },
  "canvas_image_b64": "data:image/jpeg;base64,..."
}
```

---

## Claude API Call

### Phase Lists per Exercise

Phase names injected into the prompt and JSON schema vary by exercise:

| Exercise | Phases |
|----------|--------|
| Snatch | Setup, First Pull, Transition, Second Pull, Catch, Recovery |
| Clean & Jerk | Setup, First Pull, Transition, Second Pull, Catch, Jerk Dip, Jerk Drive, Lockout |
| OHS | Setup, Descent, Bottom, Ascent |
| Clean Pull | Setup, First Pull, Transition, Second Pull, Finish |
| Snatch Pull | Setup, First Pull, Transition, Second Pull, Finish |
| Jerk from Rack | Setup, Dip, Drive, Lockout, Recovery |

Claude receives the correct phase list for the selected exercise in the prompt. The JSON schema in the prompt uses the matching list, not the snatch list.

---

### Model
`claude-sonnet-4-6` — multimodal, supports multiple image inputs per call.

### Request
- `anthropic-dangerous-direct-browser-access: true` header (required for browser fetch)
- 8 image content blocks (one per annotated frame, already rendered with skeleton + bar path)
- 1 text block containing: athlete profile, exercise name, CV data summary (key angles per frame, bar path deviation), and the baked-in cue library for the selected exercise
- Temperature: 0 (deterministic structured output)
- Max tokens: 2000

### Prompt structure
```
You are an Olympic weightlifting technique coach analyzing a [EXERCISE] attempt.

ATHLETE PROFILE:
- 102.5 kg, intermediate OLY transition
- OHS limiter (50 kg × 4)
- Push jerk only, no split jerk
- Chronic back pain (flag any spinal loading issues)

CV DATA:
- 8 frames extracted from [DURATION]s video
- Bar path: [centroid coordinates per frame, max deviation from vertical]
- Key angles per frame: [joint angles table]

CUE LIBRARY FOR [EXERCISE]:
[baked-in cues with source attribution]

INSTRUCTIONS:
Respond with exactly this format — a JSON block first, then the coaching paragraph:

```json
{
  "phases": [
    {"name": "Setup", "status": "ok|warn|fail", "note": "one line"},
    {"name": "First Pull", "status": "ok|warn|fail", "note": "one line"},
    {"name": "Transition", "status": "ok|warn|fail", "note": "one line"},
    {"name": "Second Pull", "status": "ok|warn|fail", "note": "one line"},
    {"name": "Catch", "status": "ok|warn|fail", "note": "one line"},
    {"name": "Recovery", "status": "ok|warn|fail", "note": "one line"}
  ],
  "cues": [
    {"cue": "...", "source": "...", "status": "ok|warn|fail", "note": "specific observation"}
  ],
  "body_flags": [
    {"segment": "hips|knees|lower_back|upper_back|left_elbow|right_elbow|shoulders|wrists", "status": "warn|fail", "note": "one line"}
  ]
}
```

COACHING:
[2-4 sentence coaching paragraph — specific, actionable, grounded in what the CV data shows]
```

### Response Parsing
- Split response on the closing ` ``` ` after the JSON block
- `JSON.parse()` the JSON portion
- The remainder (after `COACHING:` marker) is the freeform text
- On parse error: show raw Claude response in a fallback text box, log error

---

## Cue Library

Baked-in JS object. One array per exercise. Each cue has:
```js
{
  cue: "Bar close to body through transition",
  phase: "transition",
  body: "lats",
  source: "Everett",
  detail: "Bar should drag up thighs; any forward drift at knee height indicates early hip extension"
}
```

**Snatch cues (from master_synthesis + channel summaries):**
- Bar close to body on first pull — Everett
- Triple extension fires simultaneously, not sequentially — Berestov
- Active lat engagement in overhead position — Pavlukhin
- Body over bar (vertical leg extension drives lift, not arm tension) — Catalyst
- Bar contact at hip before second pull — Torokhtiy
- Receive in active stance, not passive — Klokov
- Scapular retraction at setup — Pavlukhin
- Elbows high and outside in turnover — Everett
- Speed through the bottom, not slowdown — Klokov
- OHS receiving position: thoracic extension, external rotation — Webster

**Clean, Jerk, OHS, Clean Pull, Snatch Pull, Jerk from Rack:** equivalent curated sets (8–12 cues each), sourced from the same coaching summaries.

---

## UI Layout

Single scroll, dark theme matching OlyTracker aesthetic (`--bg:#0a0a0a`, `--gold:#d4a843`, DM Sans + Bebas Neue fonts).

**Top section (always visible):**
- App title: `LIFT REVIEW` (Bebas Neue)
- Settings icon → modal for API key input (stored in localStorage)
- Exercise selector dropdown
- Video drop zone / file browse button
- Analyze button (disabled until video loaded + API key present)
- Processing state: spinner with step labels ("Extracting frames… Running pose detection… Analyzing…")

**Results section (appears after analysis, single scroll):**
1. **AI COACHING** — freeform paragraph
2. **LIFT PHASES** — horizontal phase timeline, 6 phases, color-coded ok/warn/fail
3. **KEY FRAMES** — horizontal scrollable strip of 8 real video frames with skeleton + bar path rendered on canvas; phase label + status color below each
4. **CUE CHECKLIST** — list of cues with ✓/⚠/✗ status, observation note, source attribution
5. **BODY** — SVG stick figure with flagged segments highlighted in red/yellow

---

## Error Handling

| Scenario | Behavior |
|----------|----------|
| No API key | Analyze button disabled, tooltip "Add API key in settings" |
| MediaPipe load failure | Skip pose detection, proceed with bar path only; note in UI |
| Bar path detection failure | Skip bar path on that frame; show `[bar path unavailable]` |
| Claude API error | Show error message with status code; offer retry |
| Claude returns malformed JSON | Show raw response in fallback text box |
| Video format unsupported | Show "Use MP4, MOV, or WebM" |
| Video too short (<2s) | Show "Video must be at least 2 seconds" |

---

## File Location

`d:\Programming\OlyTracker\VideoReview.html`

Same directory as `OlyTracker.html`. No other files required.
