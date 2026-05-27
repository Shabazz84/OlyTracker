# Snatch Reference Selector Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a second snatch reference (Torokhtiy "HOW TO SNATCH" guide) alongside the existing Lasha WR frames, with a pill selector UI and YouTube embed, so the user picks which reference Claude compares against before analyzing.

**Architecture:** `REFERENCE_FRAMES` + `getRefFrames()` are replaced by `REFERENCE_SETS` + `getRefSets()`, which hold named sets per exercise. `callClaude()` accepts `selectedRefId` to pick the right set's frames. A pill selector lives in `App` (above the Analyze button); `Results`/`ReferenceFramesStrip` show the selected set's frames + an optional YouTube embed.

**Tech Stack:** Single-file HTML app — React 18 (Babel), inline JS/CSS. `yt-dlp` + `ffmpeg` for one-time frame extraction.

---

## File Map

| File | Change |
|------|--------|
| `VideoReview.html` | All changes — data model, `callClaude`, `buildPrompt`, `ReferenceSelector`, `ReferenceFramesStrip`, `Results`, `App` |
| `tmp/ref_frames/` | Temp directory for extracted JPEG files (not committed) |

---

## Task 1: Extract 6 reference frames from the Torokhtiy snatch guide video

**Files:**
- Create (temp): `tmp/ref_frames/` — extracted JPEGs for manual review

- [ ] **Step 1: Create temp directory and download the video at 480p**

```bash
mkdir -p /tmp/ref_frames
python -m yt_dlp -f "bestvideo[height<=480]+bestaudio/best[height<=480]" \
  --merge-output-format mp4 \
  -o "/tmp/ref_frames/torokhtiy_snatch.%(ext)s" \
  "https://www.youtube.com/watch?v=yHZ1eZ8fJjc"
```

Expected: file `/tmp/ref_frames/torokhtiy_snatch.mp4` (or `.mkv`) created, ~100-300 MB.

- [ ] **Step 2: Get video duration**

```bash
ffprobe -v quiet -print_format json -show_streams /tmp/ref_frames/torokhtiy_snatch.mp4 \
  | python3 -c "import json,sys; s=[x for x in json.load(sys.stdin)['streams'] if x.get('codec_type')=='video'][0]; print('Duration:', s.get('duration','?'), 's')"
```

Expected: duration in seconds printed.

- [ ] **Step 3: Extract a preview frame every 15 seconds to locate the snatch demo**

```bash
ffmpeg -i /tmp/ref_frames/torokhtiy_snatch.mp4 \
  -vf "fps=1/15,scale=-1:240" \
  -q:v 5 /tmp/ref_frames/preview_%04d.jpg
```

Expected: files `preview_0001.jpg`, `preview_0002.jpg`, … in `/tmp/ref_frames/`.

- [ ] **Step 4: Open the preview frames and identify 6 timestamps**

Open `/tmp/ref_frames/` in a file explorer or image viewer. Find the snatch demonstration sequence. Identify one timestamp (in seconds) for each of the 6 snatch phases:

| Phase | Description to find | Timestamp (s) |
|-------|---------------------|---------------|
| Setup | Athlete crouched, bar on floor, arms straight | ___ |
| First Pull | Bar between floor and knee | ___ |
| Transition | Bar at knee/mid-thigh, sweeping in | ___ |
| Second Pull | Full triple extension, athlete tall on toes | ___ |
| Catch | Bar overhead in deep squat | ___ |
| Recovery | Standing up from squat | ___ |

Note: preview frames are spaced 15s apart. Use `preview_0001.jpg` = 0s, `preview_0002.jpg` = 15s, etc. Narrow down with a ±5s search if needed.

- [ ] **Step 5: Extract the 6 phase frames at identified timestamps**

Replace `T1`–`T6` with the timestamps found in Step 4 (e.g. `30.5`):

```bash
T1=__; T2=__; T3=__; T4=__; T5=__; T6=__
VID=/tmp/ref_frames/torokhtiy_snatch.mp4

for i in 1 2 3 4 5 6; do
  eval T=\$T$i
  ffmpeg -ss $T -i "$VID" -vframes 1 \
    -vf "scale=-1:480" \
    -q:v 3 "/tmp/ref_frames/phase_${i}.jpg" -y
done
```

Expected: `phase_1.jpg` through `phase_6.jpg` created. Review them to confirm each shows the right phase.

- [ ] **Step 6: Convert each frame to base64 and capture the data**

```bash
python3 -c "
import base64, json

timestamps = [T1, T2, T3, T4, T5, T6]  # fill in actual values
phases     = ['Setup','First Pull','Transition','Second Pull','Catch','Recovery']
result = []
for i, (t, p) in enumerate(zip(timestamps, phases), 1):
    data = open(f'/tmp/ref_frames/phase_{i}.jpg', 'rb').read()
    b64  = base64.b64encode(data).decode()
    result.append({'t': t, 'phase': p, 'b64_len': len(b64), 'b64': b64[:40]+'...'})
    print(f'Phase {i} ({p}): {t}s — {len(b64):,} chars')
"
```

Expected: 6 lines printed, each ~30,000–55,000 chars. If any frame is much larger (>80 KB), re-extract at lower quality: `-q:v 5`.

- [ ] **Step 7: Write the frames JSON to a temp file**

```bash
python3 -c "
import base64, json

timestamps = [T1, T2, T3, T4, T5, T6]  # actual values
result = []
for i, t in enumerate(timestamps, 1):
    b64 = base64.b64encode(open(f'/tmp/ref_frames/phase_{i}.jpg','rb').read()).decode()
    result.append({'t': t, 'b64': b64})
with open('/tmp/ref_frames/frames.json', 'w') as f:
    json.dump(result, f)
print('Written', len(result), 'frames to /tmp/ref_frames/frames.json')
"
```

Expected: `/tmp/ref_frames/frames.json` created, size ~200-300 KB.

---

## Task 2: Replace REFERENCE_FRAMES with REFERENCE_SETS

**Files:**
- Modify: `VideoReview.html` lines 75–116 (data constant + getter)

- [ ] **Step 1: Read frames.json and build the replacement constant**

```bash
python3 -c "
import json

frames = json.load(open('/tmp/ref_frames/frames.json'))
print('const REFERENCE_SETS = {')
print('  snatch: [')
print('    {')
print('      id: \'lasha_220kg\',')
print('      label: \'Lasha Talakhadze 220kg WR\',')
print('      frames: [')
# NOTE: paste existing snatch frame data here (from current REFERENCE_FRAMES.snatch)
print('        // ... existing Lasha frames unchanged ...')
print('      ]')
print('    },')
print('    {')
print('      id: \'torokhtiy_guide\',')
print('      label: \'Torokhtiy Snatch Guide\',')
print('      youtubeId: \'yHZ1eZ8fJjc\',')
print('      frames: [')
for f in frames:
    print(f'        {{t:{f[\"t\"]},b64:\"{f[\"b64\"]}\"}},')
print('      ]')
print('    },')
print('  ],')
print('  // clean_jerk and split_jerk migrated below')
"
```

- [ ] **Step 2: In `VideoReview.html`, replace the `REFERENCE_FRAMES` block (lines 75–116)**

The new block replaces `const REFERENCE_FRAMES = { ... };` and `function getRefFrames(exercise) { ... }`:

```js
const REFERENCE_SETS = {
  snatch: [
    {
      id: 'lasha_220kg',
      label: 'Lasha Talakhadze 220kg WR',
      frames: [
        // PASTE existing REFERENCE_FRAMES.snatch entries here (8 {t, b64} objects)
      ]
    },
    {
      id: 'torokhtiy_guide',
      label: 'Torokhtiy Snatch Guide',
      youtubeId: 'yHZ1eZ8fJjc',
      frames: [
        // PASTE 6 {t, b64} entries from /tmp/ref_frames/frames.json here
      ]
    },
  ],
  clean_jerk: [
    {
      id: 'torokhtiy_cj',
      label: 'Torokhtiy C&J technique guide',
      frames: [
        // PASTE existing REFERENCE_FRAMES.clean_jerk entries here
      ]
    },
  ],
  split_jerk: [
    {
      id: 'torokhtiy_sj',
      label: 'Torokhtiy Split Jerk technique guide',
      frames: [
        // PASTE existing REFERENCE_FRAMES.split_jerk entries here
      ]
    },
  ],
};

function getRefSets(exercise) {
  if (exercise === 'snatch')     return REFERENCE_SETS.snatch;
  if (exercise === 'clean_jerk' || exercise === 'clean' || exercise === 'jerk' || exercise === 'jerk_rack')
    return REFERENCE_SETS.clean_jerk;
  if (exercise === 'split_jerk') return REFERENCE_SETS.split_jerk;
  return null;
}

function getSelectedSet(exercise, selectedRefId) {
  const sets = getRefSets(exercise);
  if (!sets) return null;
  return sets.find(s => s.id === selectedRefId) ?? sets[0];
}
```

**How to paste existing data:** Extract the frame arrays from the current `REFERENCE_FRAMES` block and move them into the corresponding `frames: [...]` arrays above. The frame entries (`{t:..., b64:"..."}`) are unchanged.

- [ ] **Step 3: Verify no remaining references to `REFERENCE_FRAMES` or `getRefFrames`**

```bash
grep -n "REFERENCE_FRAMES\|getRefFrames" d:/Programming/OlyTracker/VideoReview.html
```

Expected: 0 matches. If any remain, fix them.

- [ ] **Step 4: Commit**

```bash
git -C d:/Programming/OlyTracker add VideoReview.html
git -C d:/Programming/OlyTracker commit -m "refactor: REFERENCE_FRAMES → REFERENCE_SETS with named sets"
```

---

## Task 3: Update `buildPrompt` and `callClaude` to accept `selectedRefId`

**Files:**
- Modify: `VideoReview.html` lines 662–800 (`buildPrompt`, `callClaude`)

- [ ] **Step 1: Update `buildPrompt` signature — add `refLabel` parameter**

Find the line (≈662):
```js
function buildPrompt(exercise, annotatedFrames, poseFrames, refCount) {
```

Replace with:
```js
function buildPrompt(exercise, annotatedFrames, poseFrames, refCount, refLabel) {
```

- [ ] **Step 2: Update the reference context line inside `buildPrompt` (≈712)**

Find:
```js
${refCount > 0 ? `The first ${refCount} images are REFERENCE FRAMES showing elite technique — use these as the comparison standard.
```

Replace with:
```js
${refCount > 0 ? `The first ${refCount} images are REFERENCE FRAMES showing elite technique (${refLabel}) — use these as the comparison standard.
```

- [ ] **Step 3: Update `callClaude` signature — add `selectedRefId` parameter**

Find (≈754):
```js
async function callClaude(apiKey, exercise, annotatedFrames, poseFrames) {
  const refFrames = getRefFrames(exercise);
  const refCount  = refFrames ? refFrames.length : 0;
  const prompt = buildPrompt(exercise, annotatedFrames, poseFrames, refCount);

  const refBlocks = refFrames ? [
    { type: 'text', text: 'REFERENCE FRAMES — elite technique example (compare to athlete below):' },
    ...refFrames.map(f => ({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: f.b64 } }))
  ] : [];
```

Replace with:
```js
async function callClaude(apiKey, exercise, annotatedFrames, poseFrames, selectedRefId) {
  const refSet    = getSelectedSet(exercise, selectedRefId);
  const refFrames = refSet ? refSet.frames : null;
  const refCount  = refFrames ? refFrames.length : 0;
  const refLabel  = refSet ? refSet.label : '';
  const prompt = buildPrompt(exercise, annotatedFrames, poseFrames, refCount, refLabel);

  const refBlocks = refFrames ? [
    { type: 'text', text: `REFERENCE FRAMES — elite technique example (${refLabel}):` },
    ...refFrames.map(f => ({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: f.b64 } }))
  ] : [];
```

- [ ] **Step 4: Commit**

```bash
git -C d:/Programming/OlyTracker add VideoReview.html
git -C d:/Programming/OlyTracker commit -m "feat: callClaude accepts selectedRefId for per-set frame selection"
```

---

## Task 4: Add `selectedRefId` state and `ReferenceSelector` component to `App`

**Files:**
- Modify: `VideoReview.html` — new `ReferenceSelector` component; `App` state + render

- [ ] **Step 1: Add `ReferenceSelector` component before `App`**

Insert this new component immediately before `function App() {` (≈line 1416):

```jsx
// ── Reference Selector ────────────────────────────────────────────────────────
function ReferenceSelector({ exercise, selectedRefId, onSelect }) {
  const sets = getRefSets(exercise);
  if (!sets || sets.length < 2) return null;
  const activeId = selectedRefId ?? sets[0].id;
  return (
    <div style={{marginTop:12,marginBottom:4}}>
      <div style={{fontSize:11,color:'var(--text2)',letterSpacing:1,marginBottom:6}}>REFERENCE</div>
      <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
        {sets.map(s => (
          <button
            key={s.id}
            onClick={() => onSelect(s.id)}
            style={{
              padding:'5px 10px',fontSize:11,borderRadius:3,cursor:'pointer',
              background: s.id === activeId ? 'rgba(212,168,67,0.12)' : 'var(--bg2)',
              border: `1px solid ${s.id === activeId ? 'var(--gold)' : 'var(--border2)'}`,
              color: s.id === activeId ? 'var(--gold)' : 'var(--text2)',
            }}
          >
            {s.label}
          </button>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Add `selectedRefId` state to `App`**

In `function App()`, find the existing state declarations (≈line 1418–1431). Add one new line:

```js
const [selectedRefId, setSelectedRefId] = useState(null);
```

- [ ] **Step 3: Reset `selectedRefId` when exercise changes**

Find the exercise `<select>` onChange handler (≈line 1503):
```js
onChange={e => { setExercise(e.target.value); setResult(null); }}
```

Replace with:
```js
onChange={e => { setExercise(e.target.value); setResult(null); setSelectedRefId(null); }}
```

- [ ] **Step 4: Render `ReferenceSelector` below the exercise selector in `App`**

Find the exercise selector block end (≈line 1513, just before `{/* Upload zone */}`). Insert after the closing `</div>` of the exercise selector:

```jsx
<ReferenceSelector
  exercise={exercise}
  selectedRefId={selectedRefId}
  onSelect={setSelectedRefId}
/>
```

- [ ] **Step 5: Pass `selectedRefId` to `callClaude()` in `App.analyze`**

Find (≈line 1469):
```js
const claudeResult = await callClaude(apiKey, exercise, af, pf);
```

Replace with:
```js
const claudeResult = await callClaude(apiKey, exercise, af, pf, selectedRefId);
```

- [ ] **Step 6: Pass `selectedRefId` to `Results`**

Find (≈line 1567):
```jsx
<Results
  exercise={exercise}
  annotatedFrames={annotated}
  poseFrames={poseFrames}
  claudeResult={result}
/>
```

Replace with:
```jsx
<Results
  exercise={exercise}
  annotatedFrames={annotated}
  poseFrames={poseFrames}
  claudeResult={result}
  selectedRefId={selectedRefId}
/>
```

- [ ] **Step 7: Commit**

```bash
git -C d:/Programming/OlyTracker add VideoReview.html
git -C d:/Programming/OlyTracker commit -m "feat: add ReferenceSelector component and selectedRefId state"
```

---

## Task 5: Update `ReferenceFramesStrip` and `Results` to use selected set + YouTube embed

**Files:**
- Modify: `VideoReview.html` — `ReferenceFramesStrip` component (≈1124), `Results` component (≈1367)

- [ ] **Step 1: Replace `ReferenceFramesStrip` with the new version**

Find and replace the entire `ReferenceFramesStrip` function (≈lines 1122–1149):

```jsx
// ── Reference Frames Strip ─────────────────────────────────────────────────────
function ReferenceFramesStrip({ exercise, selectedRefId }) {
  const set = getSelectedSet(exercise, selectedRefId);
  if (!set) return null;
  return (
    <div style={{background:'var(--bg2)',border:'1px solid var(--border2)',borderRadius:6,padding:16,marginBottom:16}}>
      <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
        <div style={{fontSize:10,color:'var(--text2)',letterSpacing:1}}>REFERENCE LIFT</div>
        <div style={{fontSize:10,color:'var(--gold)',opacity:0.7}}>{set.label}</div>
      </div>
      <div style={{display:'flex',gap:6,overflowX:'auto',paddingBottom:6}}>
        {set.frames.map((f, i) => (
          <div key={i} style={{flexShrink:0,textAlign:'center'}}>
            <img
              src={'data:image/jpeg;base64,' + f.b64}
              alt={'ref ' + i}
              style={{display:'block',borderRadius:3,width:120,height:'auto',border:'1px solid var(--border)',opacity:0.85}}
            />
            <div style={{fontSize:8,marginTop:3,color:'var(--text3)'}}>{f.t}s</div>
          </div>
        ))}
      </div>
      {set.youtubeId && (
        <div style={{marginTop:12}}>
          <div style={{fontSize:10,color:'var(--text3)',letterSpacing:1,marginBottom:6}}>REFERENCE VIDEO</div>
          <div style={{position:'relative',paddingBottom:'56.25%',height:0,overflow:'hidden',borderRadius:4}}>
            <iframe
              src={`https://www.youtube.com/embed/${set.youtubeId}?rel=0&modestbranding=1`}
              style={{position:'absolute',top:0,left:0,width:'100%',height:'100%',border:'none'}}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Update `Results` to accept and forward `selectedRefId`**

Find `function Results({` (≈line 1367):
```js
function Results({ exercise, annotatedFrames, poseFrames, claudeResult }) {
```

Replace with:
```js
function Results({ exercise, annotatedFrames, poseFrames, claudeResult, selectedRefId }) {
```

- [ ] **Step 3: Update the `ReferenceFramesStrip` call inside `Results` (≈line 1409)**

Find:
```jsx
<ReferenceFramesStrip exercise={exercise} />
```

Replace with:
```jsx
<ReferenceFramesStrip exercise={exercise} selectedRefId={selectedRefId} />
```

- [ ] **Step 4: Verify no remaining `getRefFrames` or `ReferenceFramesStrip exercise=` without `selectedRefId`**

```bash
grep -n "getRefFrames\|ReferenceFramesStrip" d:/Programming/OlyTracker/VideoReview.html
```

Expected: `ReferenceFramesStrip` appears exactly twice (definition + usage in Results), both with `selectedRefId`. Zero `getRefFrames` matches.

- [ ] **Step 5: Commit**

```bash
git -C d:/Programming/OlyTracker add VideoReview.html
git -C d:/Programming/OlyTracker commit -m "feat: ReferenceFramesStrip shows selected set + YouTube embed"
```

---

## Task 6: Bump version and final verification

**Files:**
- Modify: `VideoReview.html` — version string in header

- [ ] **Step 1: Bump version in the HTML header**

Find the version string in the `<title>` or the app header. Per CLAUDE.md, the version is in `PROGRAM v<X.Y.Z> · <date>` in the OlyTracker header. Check what version VideoReview.html is on:

```bash
grep -n "PROGRAM v\|version\|v2\." d:/Programming/OlyTracker/VideoReview.html | head -5
```

Note the current version and increment the patch number. Update the header line in `VideoReview.html`.

- [ ] **Step 2: Open VideoReview.html in a browser and verify**

Open `d:/Programming/OlyTracker/VideoReview.html` in Chrome.

Checklist:
- [ ] Exercise selector shows "Snatch"
- [ ] Two reference pills appear below the exercise selector: "Lasha Talakhadze 220kg WR" and "Torokhtiy Snatch Guide"
- [ ] Lasha pill is active (gold border) by default
- [ ] Clicking "Torokhtiy Snatch Guide" pill activates it (gold border shifts)
- [ ] After selecting "Torokhtiy Snatch Guide" and completing analysis, Results shows the Torokhtiy frames strip
- [ ] YouTube embed appears below the Torokhtiy frames strip
- [ ] Switching to Clean & Jerk: no reference pills appear (only one set)
- [ ] Switching back to Snatch: pills reset to Lasha (default)

- [ ] **Step 3: Final commit**

```bash
git -C d:/Programming/OlyTracker add VideoReview.html
git -C d:/Programming/OlyTracker commit -m "feat: add Torokhtiy snatch reference with selector and YouTube embed"
```

---

## Self-Review

**Spec coverage check:**
- ✅ `REFERENCE_SETS` data structure replacing flat `REFERENCE_FRAMES` — Task 2
- ✅ 6 frames extracted from Torokhtiy video, baked as base64 — Task 1
- ✅ Reference selector pill UI above analyze button — Task 4
- ✅ YouTube iframe embed in reference strip — Task 5
- ✅ Snatch only (C&J and Split Jerk get one set each, no selector shown) — Task 2 + `ReferenceSelector` guard (`sets.length < 2`)
- ✅ `callClaude` uses selected set's frames — Task 3
- ✅ Backward compat: existing Lasha frames preserved, default to first set — Task 2, `getSelectedSet` fallback

**Placeholder scan:** Task 2 Step 2 uses `// PASTE` comments — these are explicit instructions to paste data, not vague placeholders. Task 1 Step 4 requires human review of preview frames, which is intentional.

**Type consistency:** `getSelectedSet(exercise, selectedRefId)` defined in Task 2, used in Tasks 3, 5. `set.frames`, `set.label`, `set.youtubeId`, `set.id` — consistent across all tasks.
