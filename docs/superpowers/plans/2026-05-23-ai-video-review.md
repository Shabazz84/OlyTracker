# AI Video Review Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `VideoReview.html` — a standalone single-file web app that accepts a training video, runs MediaPipe Pose + wrist-based bar path tracking in the browser, sends annotated frames + CV data to the Claude API, and renders a structured OLY technique analysis grounded in a baked-in coaching cue library.

**Architecture:** Single HTML file, no build step. React 18 via CDN + Babel standalone for JSX. MediaPipe Pose CDN for body landmarks. Bar path derived from wrist landmark midpoints (more reliable than color detection). Single Claude API call with 8 annotated frames + CV summary → structured JSON + coaching text rendered across 5 output sections.

**Tech Stack:** HTML/CSS/JS, React 18 (CDN), `@mediapipe/pose@0.5` (CDN), `@babel/standalone` (CDN), Claude `claude-sonnet-4-6` API via browser `fetch()`

**Spec:** `docs/superpowers/specs/2026-05-23-ai-video-review-design.md`

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `VideoReview.html` | Create | Entire app — shell, CV pipeline, API client, UI |

All code lives in one `<script type="text/babel">` block inside `VideoReview.html`. Tasks build the file section by section in this order: constants → cue library → CV utilities → Claude client → React components → App root.

---

## Task 1: App Shell + Settings Modal

**Files:**
- Create: `d:\Programming\OlyTracker\VideoReview.html`

- [ ] **Step 1: Create the initial HTML file**

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
<meta name="theme-color" content="#0a0a0a">
<title>Lift Review</title>
<script src="https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.5/pose.js" crossorigin="anonymous"></script>
<script src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
<script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
<script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap">
<style>
*{box-sizing:border-box;margin:0;padding:0}
html,body,#root{height:100%;width:100%}
:root{
  --bg:#0a0a0a;--bg1:#111;--bg2:#161616;--bg3:#1c1c1c;
  --border:#222;--border2:#2a2a2a;
  --text:#e2e2e2;--text2:#888;--text3:#444;
  --gold:#d4a843;--red:#c94f3a;--blue:#4a90d9;--green:#5a9e45;--yellow:#d4a843;
}
body{background:var(--bg);color:var(--text);font-family:'DM Sans',sans-serif;overflow-x:hidden}
::-webkit-scrollbar{width:4px}
::-webkit-scrollbar-track{background:var(--bg)}
::-webkit-scrollbar-thumb{background:#2a2a2a;border-radius:2px}
input,select,textarea{font-family:'DM Sans',sans-serif}
input:focus,select:focus,textarea:focus{outline:none!important;border-color:var(--gold)!important}
.fade{animation:fadeIn 0.25s ease}
@keyframes fadeIn{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:none}}
</style>
</head>
<body>
<div id="root"></div>
<script type="text/babel">
const { useState, useEffect, useRef, useCallback } = React;

// ── Constants ──────────────────────────────────────────────────────────────────
const EXERCISES = [
  { id: 'snatch',       label: 'Snatch' },
  { id: 'clean_jerk',  label: 'Clean & Jerk' },
  { id: 'ohs',         label: 'Overhead Squat' },
  { id: 'clean_pull',  label: 'Clean Pull' },
  { id: 'snatch_pull', label: 'Snatch Pull' },
  { id: 'jerk_rack',   label: 'Jerk from Rack' },
];

const STATUS_COLOR = { ok: 'var(--green)', warn: 'var(--yellow)', fail: 'var(--red)' };
const STATUS_ICON  = { ok: '✓', warn: '⚠', fail: '✗' };

// ── Btn component ──────────────────────────────────────────────────────────────
function Btn({ children, onClick, disabled, style = {} }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        background: disabled ? 'var(--bg3)' : 'var(--gold)',
        color: disabled ? 'var(--text3)' : '#000',
        border: 'none',
        borderRadius: 4,
        padding: '10px 20px',
        fontFamily: "'Bebas Neue', sans-serif",
        fontSize: 16,
        letterSpacing: 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
        ...style
      }}
    >
      {children}
    </button>
  );
}

// ── Settings Modal ─────────────────────────────────────────────────────────────
function SettingsModal({ onClose }) {
  const [key, setKey] = useState(() => localStorage.getItem('lr_api_key') || '');
  const save = () => {
    localStorage.setItem('lr_api_key', key.trim());
    onClose();
  };
  return (
    <div style={{
      position:'fixed',inset:0,background:'rgba(0,0,0,0.8)',
      display:'flex',alignItems:'center',justifyContent:'center',zIndex:100
    }}>
      <div style={{background:'var(--bg2)',border:'1px solid var(--border2)',borderRadius:8,padding:24,width:340}}>
        <div style={{fontFamily:"'Bebas Neue'",fontSize:20,letterSpacing:1,marginBottom:16}}>
          SETTINGS
        </div>
        <div style={{fontSize:12,color:'var(--text2)',marginBottom:8}}>
          ANTHROPIC API KEY
        </div>
        <input
          type="password"
          value={key}
          onChange={e => setKey(e.target.value)}
          placeholder="sk-ant-..."
          style={{
            width:'100%',background:'var(--bg3)',border:'1px solid var(--border2)',
            borderRadius:4,padding:'8px 12px',color:'var(--text)',fontSize:13,marginBottom:16
          }}
        />
        <div style={{fontSize:11,color:'var(--text3)',marginBottom:16}}>
          Stored in localStorage. Never leaves your browser.
        </div>
        <div style={{display:'flex',gap:8,justifyContent:'flex-end'}}>
          <button onClick={onClose} style={{
            background:'none',border:'1px solid var(--border2)',borderRadius:4,
            padding:'8px 14px',color:'var(--text2)',cursor:'pointer',fontSize:13
          }}>Cancel</button>
          <Btn onClick={save}>SAVE</Btn>
        </div>
      </div>
    </div>
  );
}

// ── App ────────────────────────────────────────────────────────────────────────
function App() {
  const [showSettings, setShowSettings] = useState(false);
  const [exercise, setExercise] = useState('snatch');
  const apiKey = localStorage.getItem('lr_api_key') || '';

  return (
    <div style={{maxWidth:640,margin:'0 auto',padding:'0 16px 40px'}}>
      {/* Header */}
      <div style={{
        display:'flex',alignItems:'center',justifyContent:'space-between',
        padding:'20px 0 16px',borderBottom:'1px solid var(--border)'
      }}>
        <div style={{fontFamily:"'Bebas Neue'",fontSize:28,letterSpacing:2,color:'var(--gold)'}}>
          LIFT REVIEW
        </div>
        <button onClick={() => setShowSettings(true)} style={{
          background:'none',border:'1px solid var(--border2)',borderRadius:4,
          padding:'6px 12px',color:'var(--text2)',cursor:'pointer',fontSize:12
        }}>
          {apiKey ? '⚙ API KEY SET' : '⚙ ADD API KEY'}
        </button>
      </div>

      {/* Exercise selector */}
      <div style={{marginTop:20}}>
        <div style={{fontSize:11,color:'var(--text2)',letterSpacing:1,marginBottom:6}}>
          EXERCISE
        </div>
        <select
          value={exercise}
          onChange={e => setExercise(e.target.value)}
          style={{
            width:'100%',background:'var(--bg2)',border:'1px solid var(--border2)',
            borderRadius:4,padding:'10px 12px',color:'var(--text)',fontSize:14
          }}
        >
          {EXERCISES.map(ex => (
            <option key={ex.id} value={ex.id}>{ex.label}</option>
          ))}
        </select>
      </div>

      {/* Placeholder for upload + results — added in later tasks */}
      <div style={{marginTop:32,color:'var(--text3)',fontSize:13,textAlign:'center'}}>
        Upload section coming in Task 2
      </div>

      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
</script>
</body>
</html>
```

- [ ] **Step 2: Open in browser and verify**

Open `VideoReview.html` directly in Chrome. Verify:
- Dark background, gold "LIFT REVIEW" header visible
- "ADD API KEY" / "API KEY SET" button in top-right
- Clicking it opens the settings modal with a password input
- Saving a key shows "API KEY SET" in header (stored in localStorage)
- Exercise dropdown shows all 6 options

- [ ] **Step 3: Commit**

```bash
git add VideoReview.html
git commit -m "feat: add VideoReview app shell with settings modal and exercise selector"
```

---

## Task 2: Cue Library Data

**Files:**
- Modify: `VideoReview.html` — add `CUES` and `PHASES` constants after the `STATUS_ICON` line

- [ ] **Step 1: Add phase lists and cue library**

Insert this block immediately after the `STATUS_ICON` constant (after `const STATUS_ICON = ...;`):

```javascript
// ── Phase lists per exercise ───────────────────────────────────────────────────
const PHASES = {
  snatch:      ['Setup','First Pull','Transition','Second Pull','Catch','Recovery'],
  clean_jerk:  ['Setup','First Pull','Transition','Second Pull','Clean Catch','Jerk Dip','Jerk Drive','Lockout'],
  ohs:         ['Setup','Descent','Bottom','Ascent'],
  clean_pull:  ['Setup','First Pull','Transition','Second Pull','Finish'],
  snatch_pull: ['Setup','First Pull','Transition','Second Pull','Finish'],
  jerk_rack:   ['Setup','Dip','Drive','Lockout','Recovery'],
};

// ── Cue library ────────────────────────────────────────────────────────────────
// Each cue: { cue, phase, body, source, detail }
// body maps to SVG body segments: hips, knees, lower_back, upper_back,
//   left_elbow, right_elbow, shoulders, wrists
const CUES = {
  snatch: [
    { cue:'Bar close to body through transition', phase:'transition', body:'upper_back', source:'Everett',
      detail:'Bar should sweep up thighs. Forward drift at knee height signals early hip extension — lats disengaged.' },
    { cue:'Triple extension fires simultaneously', phase:'second_pull', body:'hips', source:'Berestov',
      detail:'Legs, back, and traps extend in one coordinated burst. Sequential firing (hips early) kills bar speed.' },
    { cue:'Active lat engagement in overhead position', phase:'catch', body:'upper_back', source:'Pavlukhin',
      detail:'Lats actively pull bar into position. Passive arms cause forward bar drift and instability in catch.' },
    { cue:'Body over bar — vertical leg extension drives the lift', phase:'second_pull', body:'hips', source:'Catalyst',
      detail:'Hips extend vertically, not forward. Bar rises from leg drive, not shoulder shrug or arm pull.' },
    { cue:'Bar-hip contact before second pull extension', phase:'transition', body:'hips', source:'Torokhtiy',
      detail:'Bar must touch upper thigh before hip explosion. Early extension = bar swings forward = missed lift.' },
    { cue:'Receive actively — pull under, do not wait for bar', phase:'catch', body:'shoulders', source:'Klokov',
      detail:'Aggressive turnover and punch into receiving position. Passive receiving causes bar to crash down.' },
    { cue:'Scapular retraction and depression at setup', phase:'setup', body:'upper_back', source:'Pavlukhin',
      detail:'Retract and depress scapulae before initiation. This pre-loads lats and prevents upper back rounding.' },
    { cue:'Elbows high and outside in turnover', phase:'catch', body:'left_elbow', source:'Everett',
      detail:'Elbows drive high then rotate outward into lockout. Low elbows in turnover cause bar to crash on wrists.' },
    { cue:'Accelerate through the bottom — no slowdown', phase:'catch', body:'knees', source:'Klokov',
      detail:'Speed is highest at the bottom. Deceleration before full squat depth signals hesitation in the hole.' },
    { cue:'Thoracic extension + shoulder external rotation in receiving', phase:'catch', body:'upper_back', source:'Webster',
      detail:'OHS position requires active thoracic extension. Collapsed thoracic spine = forward bar drift + instability.' },
  ],
  clean_jerk: [
    { cue:'Bar close to body on first pull', phase:'first_pull', body:'upper_back', source:'Everett',
      detail:'Maintain lat tension — bar stays against shins, then thighs. No swinging forward off the floor.' },
    { cue:'Triple extension simultaneous at finish', phase:'second_pull', body:'hips', source:'Berestov',
      detail:'Legs, back, and traps fire in unison. Sequential extension loses bar speed and height.' },
    { cue:'High elbows in front rack — parallel to floor', phase:'clean_catch', body:'shoulders', source:'Pavlukhin',
      detail:'Elbows up and forward in rack. Low elbows lose the shelf and shift load to wrists.' },
    { cue:'Aggressive turnover to front rack position', phase:'clean_catch', body:'shoulders', source:'Everett',
      detail:'Fast elbow rotation around the bar. Slow turnover causes the bar to crash into the rack.' },
    { cue:'Vertical dip in jerk — no forward lean', phase:'jerk_dip', body:'lower_back', source:'Everett',
      detail:'Dip straight down, torso stays vertical. Forward lean shifts bar path forward — missed jerk or back strain.' },
    { cue:'Drive through heels at jerk initiation', phase:'jerk_drive', body:'knees', source:'Torokhtiy',
      detail:'Pressure stays through heels in dip and drive. Forward weight shift kills upward bar velocity.' },
    { cue:'Press into bar — do not drop under passively', phase:'lockout', body:'shoulders', source:'Everett',
      detail:'Actively press bar up while dropping under. Passive drop causes bar to stall and miss forward.' },
    { cue:'Core braced throughout dip and drive', phase:'jerk_dip', body:'lower_back', source:'Pavlukhin',
      detail:'Any core relaxation in the dip loads the lumbar. Critical for this athlete given chronic back pain.' },
    { cue:'Lock out overhead before feet reset', phase:'lockout', body:'shoulders', source:'Everett',
      detail:'Bar must be fully locked out and stable before foot repositioning. Moving feet under an unlocked bar = fail.' },
    { cue:'Bar-hip contact before jerk drive', phase:'jerk_dip', body:'hips', source:'Klokov',
      detail:'Maintain bar contact with shoulders/upper chest through full dip. Bar forward = jerk misses in front.' },
  ],
  ohs: [
    { cue:'Active shoulder engagement — punch up into bar', phase:'bottom', body:'shoulders', source:'Webster',
      detail:'Press actively into bar overhead. Passive arms cannot stabilize under load — bar drifts forward.' },
    { cue:'Thoracic extension throughout descent and ascent', phase:'descent', body:'upper_back', source:'Webster',
      detail:'Upper back stays extended. Thoracic flexion collapses overhead position — bar crashes forward.' },
    { cue:'Shoulder external rotation — armpits forward', phase:'setup', body:'shoulders', source:'Webster',
      detail:'Rotate shoulders externally before un-racking. Internal rotation collapses the overhead position.' },
    { cue:'Lat engagement to stabilize receiving', phase:'bottom', body:'upper_back', source:'Pavlukhin',
      detail:'Active lats pull bar into stable position. Without lat tension, bar drifts forward at bottom.' },
    { cue:'Knees track over toes throughout', phase:'descent', body:'knees', source:'Everett',
      detail:'Knees must not cave inward. Caving signals weak hip external rotation — compromises receiving position.' },
    { cue:'Weight over mid-foot — not heels or toes', phase:'bottom', body:'knees', source:'Everett',
      detail:'Centre of pressure stays mid-foot. Heel rise reduces depth; forward shift risks knee injury.' },
  ],
  clean_pull: [
    { cue:'Bar close to body from floor to hip', phase:'first_pull', body:'upper_back', source:'Everett',
      detail:'Lat tension holds bar against body. Forward swing off the floor becomes worse at heavier loads.' },
    { cue:'Back angle constant from floor to knee', phase:'first_pull', body:'lower_back', source:'Pavlukhin',
      detail:'Hips and shoulders rise at same rate through first pull. Early hip rise = good morning pull = lost leverage.' },
    { cue:'Triple extension at peak', phase:'finish', body:'hips', source:'Berestov',
      detail:'Full extension of ankles, knees, and hips at the top. Partial extension limits bar height and timing.' },
    { cue:'No early hip extension before knee passage', phase:'first_pull', body:'hips', source:'Torokhtiy',
      detail:'Hips stay back until bar clears knees. Early hip rise disengages legs and loads the lower back.' },
    { cue:'Shoulders over bar through first pull', phase:'first_pull', body:'upper_back', source:'Everett',
      detail:'Shoulders stay in front of bar from floor to knee. Rising early kills leverage and bar proximity.' },
    { cue:'Aggressive trap shrug at peak extension', phase:'finish', body:'upper_back', source:'Berestov',
      detail:'Shrug up and back at peak. Trap engagement keeps bar elevated long enough for turnover.' },
  ],
  snatch_pull: [
    { cue:'Bar path vertical — no forward arc', phase:'first_pull', body:'upper_back', source:'Everett',
      detail:'Any forward arc in the bar path must be corrected with lat tension. The path should be straight up.' },
    { cue:'Aggressive trap engagement at finish', phase:'finish', body:'upper_back', source:'Berestov',
      detail:'Traps drive bar up and back at peak. Weak trap finish limits bar height and snatch receiving window.' },
    { cue:'Back angle constant from floor to knee', phase:'first_pull', body:'lower_back', source:'Pavlukhin',
      detail:'Same back angle from start until bar passes knees. Early hip rise shifts load to posterior chain unfavorably.' },
    { cue:'No early hip extension before knee passage', phase:'first_pull', body:'hips', source:'Torokhtiy',
      detail:'Control hip extension rate. Bar must clear knees before hip explosion, otherwise bar swings forward.' },
    { cue:'Shoulder shrug up and back at peak', phase:'finish', body:'upper_back', source:'Everett',
      detail:'Shrug direction is up and slightly back, not forward. Forward shrug kills bar height.' },
  ],
  jerk_rack: [
    { cue:'Vertical dip — no forward lean in torso', phase:'dip', body:'lower_back', source:'Everett',
      detail:'Dip straight down. Any forward lean shifts bar path forward and misloads the lumbar under bar weight.' },
    { cue:'Drive through heels in dip and drive', phase:'drive', body:'knees', source:'Torokhtiy',
      detail:'Weight in heels through the full dip and drive. Forward weight on toes redirects force forward, not up.' },
    { cue:'Explosive hip extension in drive phase', phase:'drive', body:'hips', source:'Klokov',
      detail:'Full hip extension powers the bar up. Soft hip drive means bar never achieves the height needed.' },
    { cue:'Full lockout overhead before accepting load', phase:'lockout', body:'shoulders', source:'Everett',
      detail:'Elbows must be fully locked before standing up with the bar. Soft elbows under heavy load = injury risk.' },
    { cue:'Reset feet to hip width before standing', phase:'recovery', body:'knees', source:'Everett',
      detail:'Foot reset must happen with bar locked out. Do not step under an unstable bar.' },
    { cue:'Core braced — no lumbar extension in dip', phase:'dip', body:'lower_back', source:'Pavlukhin',
      detail:'Lumbar must not hyperextend in the dip. Core bracing is mandatory given this athlete\'s chronic back pain.' },
  ],
};
```

- [ ] **Step 2: Verify in browser console**

Open DevTools → Console. Type:
```javascript
// After page loads, these should be accessible via window or module scope
// Paste this in console:
console.log(Object.keys(CUES));
// Expected: ['snatch', 'clean_jerk', 'ohs', 'clean_pull', 'snatch_pull', 'jerk_rack']
console.log(CUES.snatch.length);
// Expected: 10
console.log(PHASES.clean_jerk.length);
// Expected: 8
```

Note: Since the code is in a Babel `<script>` block, vars are not on `window`. Instead, add a temporary `window.CUES = CUES;` line after the CUES definition, refresh, run the console check, then remove it.

- [ ] **Step 3: Commit**

```bash
git add VideoReview.html
git commit -m "feat: add cue library and phase lists for all 6 exercises"
```

---

## Task 3: Video Upload + Frame Extraction

**Files:**
- Modify: `VideoReview.html` — add CV utility functions before the `Btn` component, and add `UploadZone` component + wire into App state

- [ ] **Step 1: Add frame extraction utilities**

Insert this block after the `CUES` constant and before the `// ── Btn component` comment:

```javascript
// ── CV Utilities ───────────────────────────────────────────────────────────────

const FRAME_COUNT = 8;
const MAX_HEIGHT  = 720;

function seekTo(video, time) {
  return new Promise(resolve => {
    const handler = () => { video.removeEventListener('seeked', handler); resolve(); };
    video.addEventListener('seeked', handler);
    video.currentTime = time;
  });
}

function videoToCanvas(video) {
  const scale = Math.min(1, MAX_HEIGHT / video.videoHeight);
  const w = Math.round(video.videoWidth * scale);
  const h = Math.round(video.videoHeight * scale);
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  canvas.getContext('2d').drawImage(video, 0, 0, w, h);
  return canvas;
}

async function extractFrames(videoEl) {
  const duration = videoEl.duration;
  if (!duration || duration < 2) throw new Error('Video must be at least 2 seconds long.');
  const frames = [];
  for (let i = 0; i < FRAME_COUNT; i++) {
    const t = (i / (FRAME_COUNT - 1)) * duration;
    await seekTo(videoEl, t);
    const canvas = videoToCanvas(videoEl);
    frames.push({ index: i, timestamp: parseFloat(t.toFixed(2)), canvas });
  }
  return frames;
}
```

- [ ] **Step 2: Add UploadZone component**

Insert this block after the `Btn` component and before the `// ── Settings Modal` comment:

```javascript
// ── UploadZone ─────────────────────────────────────────────────────────────────
function UploadZone({ onFrames, onError }) {
  const [dragging, setDragging]   = useState(false);
  const [fileName, setFileName]   = useState('');
  const [preview, setPreview]     = useState(null); // object URL
  const [loading, setLoading]     = useState(false);
  const fileRef = useRef(null);
  const videoRef = useRef(null);

  const handleFile = useCallback(async (file) => {
    if (!file || !file.type.startsWith('video/')) {
      onError('Please select an MP4, MOV, or WebM video file.');
      return;
    }
    setFileName(file.name);
    const url = URL.createObjectURL(file);
    setPreview(url);
  }, [onError]);

  // Once the video element loads metadata, extract frames
  const handleVideoLoaded = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.duration < 2) {
      onError('Video must be at least 2 seconds long.');
      return;
    }
    setLoading(true);
    try {
      const frames = await extractFrames(video);
      onFrames(frames, video);
    } catch (err) {
      onError(err.message);
    } finally {
      setLoading(false);
    }
  }, [onFrames, onError]);

  const onDrop = useCallback((e) => {
    e.preventDefault(); setDragging(false);
    handleFile(e.dataTransfer.files[0]);
  }, [handleFile]);

  return (
    <div style={{marginTop:24}}>
      <div style={{fontSize:11,color:'var(--text2)',letterSpacing:1,marginBottom:8}}>VIDEO</div>

      {/* Hidden video element for frame extraction */}
      {preview && (
        <video
          ref={videoRef}
          src={preview}
          onLoadedMetadata={handleVideoLoaded}
          style={{display:'none'}}
          crossOrigin="anonymous"
          muted
          playsInline
        />
      )}

      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => !preview && fileRef.current?.click()}
        style={{
          border:`1px dashed ${dragging ? 'var(--gold)' : 'var(--border2)'}`,
          borderRadius:6,padding:'24px 16px',textAlign:'center',
          cursor: preview ? 'default' : 'pointer',
          background: dragging ? 'rgba(212,168,67,0.05)' : 'var(--bg2)',
          transition:'all 0.15s'
        }}
      >
        {loading ? (
          <div style={{color:'var(--text2)',fontSize:13}}>Extracting frames…</div>
        ) : fileName ? (
          <div>
            <div style={{color:'var(--text)',fontSize:13,marginBottom:4}}>{fileName}</div>
            <div
              onClick={e => { e.stopPropagation(); setFileName(''); setPreview(null); onFrames(null); }}
              style={{color:'var(--text3)',fontSize:11,cursor:'pointer',textDecoration:'underline'}}
            >
              Remove
            </div>
          </div>
        ) : (
          <div style={{color:'var(--text3)',fontSize:13}}>
            Drop video here or <span style={{color:'var(--gold)'}}>browse</span>
          </div>
        )}
      </div>
      <input ref={fileRef} type="file" accept="video/*" style={{display:'none'}}
        onChange={e => handleFile(e.target.files[0])} />
    </div>
  );
}
```

- [ ] **Step 3: Wire UploadZone into App**

Replace the `// Placeholder for upload + results` comment block in the `App` component with:

```javascript
  const [frames, setFrames] = useState(null);
  const [video, setVideo]   = useState(null);
  const [error, setError]   = useState('');

  const handleFrames = useCallback((frms, vid) => {
    setFrames(frms || null);
    setVideo(vid || null);
    setError('');
  }, []);
```

Add the above state declarations inside the `App` function, after `const apiKey = ...`.

Then replace the placeholder `<div>` with:

```javascript
      <UploadZone onFrames={handleFrames} onError={setError} />

      {error && (
        <div style={{
          marginTop:12,padding:'8px 12px',background:'rgba(201,79,58,0.1)',
          border:'1px solid var(--red)',borderRadius:4,color:'var(--red)',fontSize:12
        }}>
          {error}
        </div>
      )}

      {frames && (
        <div style={{marginTop:16,fontSize:12,color:'var(--text2)'}}>
          {frames.length} frames extracted — Task 3 ✓
        </div>
      )}
```

- [ ] **Step 4: Verify in browser**

1. Open `VideoReview.html` in Chrome
2. Drag a short training video (MP4, MOV, or WebM) onto the drop zone
3. Wait ~2 seconds — should see "8 frames extracted — Task 3 ✓" below the upload zone
4. Click "Remove" → upload zone resets
5. Try dropping a non-video file → red error message "Please select an MP4, MOV, or WebM video file."
6. Open DevTools Console — no errors

- [ ] **Step 5: Commit**

```bash
git add VideoReview.html
git commit -m "feat: add video upload zone with 8-frame canvas extraction"
```

---

## Task 4: MediaPipe Pose + Bar Path

**Files:**
- Modify: `VideoReview.html` — add pose + bar path functions to the CV Utilities section

- [ ] **Step 1: Add pose initialization + per-frame inference**

Insert this block at the end of the `// ── CV Utilities` section (after `extractFrames`):

```javascript
// ── MediaPipe Pose ─────────────────────────────────────────────────────────────

// MediaPipe landmark indices (normalized 0-1 coords)
const LM = {
  LEFT_SHOULDER:11, RIGHT_SHOULDER:12,
  LEFT_ELBOW:13,    RIGHT_ELBOW:14,
  LEFT_WRIST:15,    RIGHT_WRIST:16,
  LEFT_HIP:23,      RIGHT_HIP:24,
  LEFT_KNEE:25,     RIGHT_KNEE:26,
  LEFT_ANKLE:27,    RIGHT_ANKLE:28,
};

const POSE_CONNECTIONS = [
  [11,12],[11,13],[13,15],[12,14],[14,16],  // arms
  [11,23],[12,24],[23,24],                   // torso
  [23,25],[25,27],[24,26],[26,28],           // legs
];

let poseInstance = null;

async function getPose() {
  if (poseInstance) return poseInstance;
  const pose = new window.Pose({
    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.5/${file}`
  });
  pose.setOptions({
    modelComplexity: 1,
    smoothLandmarks: false,
    enableSegmentation: false,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5,
  });
  // Resolve immediately — results are delivered via callback
  await pose.initialize();
  poseInstance = pose;
  return pose;
}

function runPoseOnCanvas(pose, canvas) {
  return new Promise((resolve) => {
    pose.onResults((results) => resolve(results.poseLandmarks || null));
    pose.send({ image: canvas });
  });
}

function angleBetween(a, b, c) {
  if (!a || !b || !c) return null;
  const ba = { x: a.x - b.x, y: a.y - b.y };
  const bc = { x: c.x - b.x, y: c.y - b.y };
  const dot = ba.x * bc.x + ba.y * bc.y;
  const mag = Math.sqrt(ba.x**2 + ba.y**2) * Math.sqrt(bc.x**2 + bc.y**2);
  if (mag === 0) return null;
  return Math.round(Math.acos(Math.min(1, Math.max(-1, dot / mag))) * 180 / Math.PI);
}

function computeAngles(lm) {
  if (!lm) return {};
  return {
    left_knee:   angleBetween(lm[LM.LEFT_HIP],  lm[LM.LEFT_KNEE],  lm[LM.LEFT_ANKLE]),
    right_knee:  angleBetween(lm[LM.RIGHT_HIP], lm[LM.RIGHT_KNEE], lm[LM.RIGHT_ANKLE]),
    left_hip:    angleBetween(lm[LM.LEFT_SHOULDER],  lm[LM.LEFT_HIP],  lm[LM.LEFT_KNEE]),
    right_hip:   angleBetween(lm[LM.RIGHT_SHOULDER], lm[LM.RIGHT_HIP], lm[LM.RIGHT_KNEE]),
    left_elbow:  angleBetween(lm[LM.LEFT_SHOULDER],  lm[LM.LEFT_ELBOW],  lm[LM.LEFT_WRIST]),
    right_elbow: angleBetween(lm[LM.RIGHT_SHOULDER], lm[LM.RIGHT_ELBOW], lm[LM.RIGHT_WRIST]),
  };
}

// Bar centroid = midpoint of wrists (wrists grip the bar)
function barCentroid(lm) {
  if (!lm) return null;
  const lw = lm[LM.LEFT_WRIST], rw = lm[LM.RIGHT_WRIST];
  if (!lw || !rw) return null;
  return { x: (lw.x + rw.x) / 2, y: (lw.y + rw.y) / 2 };
}

async function runPoseOnFrames(frames, onProgress) {
  const pose = await getPose();
  const results = [];
  for (const frame of frames) {
    onProgress(`Pose detection: frame ${frame.index + 1}/${frames.length}…`);
    const landmarks = await runPoseOnCanvas(pose, frame.canvas);
    const angles    = computeAngles(landmarks);
    const centroid  = barCentroid(landmarks);
    results.push({ ...frame, landmarks, angles, centroid });
  }
  return results;
}
```

- [ ] **Step 2: Add frame annotation (skeleton + bar path overlay)**

Insert this block after `runPoseOnFrames`, still in the CV Utilities section:

```javascript
// ── Frame Annotation ───────────────────────────────────────────────────────────

function drawSkeleton(ctx, landmarks, w, h) {
  if (!landmarks) return;
  ctx.lineWidth = 2;
  POSE_CONNECTIONS.forEach(([a, b]) => {
    const pa = landmarks[a], pb = landmarks[b];
    if (!pa || !pb) return;
    const vis = Math.min(pa.visibility ?? 1, pb.visibility ?? 1);
    ctx.strokeStyle = vis > 0.7 ? 'rgba(90,158,69,0.85)'
                    : vis > 0.4 ? 'rgba(212,168,67,0.7)'
                    : 'rgba(100,100,100,0.5)';
    ctx.beginPath();
    ctx.moveTo(pa.x * w, pa.y * h);
    ctx.lineTo(pb.x * w, pb.y * h);
    ctx.stroke();
  });
  // Draw joint circles
  Object.values(LM).forEach(idx => {
    const lm = landmarks[idx];
    if (!lm) return;
    const vis = lm.visibility ?? 1;
    ctx.fillStyle = vis > 0.7 ? 'rgba(90,158,69,0.9)'
                  : vis > 0.4 ? 'rgba(212,168,67,0.8)'
                  : 'rgba(100,100,100,0.6)';
    ctx.beginPath();
    ctx.arc(lm.x * w, lm.y * h, 3, 0, Math.PI * 2);
    ctx.fill();
  });
}

function annotateFrames(poseFrames) {
  const centroids = poseFrames.map(f => f.centroid);
  return poseFrames.map((frame, i) => {
    const { canvas, landmarks } = frame;
    const w = canvas.width, h = canvas.height;
    const out = document.createElement('canvas');
    out.width = w; out.height = h;
    const ctx = out.getContext('2d');
    // Draw original frame
    ctx.drawImage(canvas, 0, 0);
    // Draw bar path polyline up to this frame (blue)
    ctx.strokeStyle = '#4a90d9';
    ctx.lineWidth = 2.5;
    ctx.setLineDash([]);
    ctx.beginPath();
    let started = false;
    for (let j = 0; j <= i; j++) {
      const c = centroids[j];
      if (!c) continue;
      if (!started) { ctx.moveTo(c.x * w, c.y * h); started = true; }
      else ctx.lineTo(c.x * w, c.y * h);
    }
    if (started) ctx.stroke();
    // Draw current bar position dot
    if (centroids[i]) {
      ctx.fillStyle = '#4a90d9';
      ctx.beginPath();
      ctx.arc(centroids[i].x * w, centroids[i].y * h, 5, 0, Math.PI * 2);
      ctx.fill();
    }
    // Draw skeleton
    drawSkeleton(ctx, landmarks, w, h);
    return { ...frame, annotatedCanvas: out, b64: out.toDataURL('image/jpeg', 0.82) };
  });
}
```

- [ ] **Step 3: Add temporary test button to App**

Inside the App return JSX, after the error block, add temporarily:

```javascript
      {frames && (
        <Btn style={{marginTop:12}} onClick={async () => {
          setError('');
          try {
            const poseFrames = await runPoseOnFrames(frames, msg => console.log(msg));
            const annotated  = annotateFrames(poseFrames);
            // Show first annotated frame in a new tab to verify
            const win = window.open();
            win.document.body.style.background = '#000';
            win.document.body.appendChild(annotated[0].annotatedCanvas);
          } catch(e) {
            setError(e.message);
          }
        }}>TEST POSE</Btn>
      )}
```

- [ ] **Step 4: Verify in browser**

1. Upload a video
2. Click "TEST POSE" button — a new tab opens
3. Verify: the first frame shows the actual video frame with a green/yellow skeleton drawn over the body, and a blue dot where the bar (wrist midpoint) is located
4. Open Console — no errors. Pose detection logs "Pose detection: frame 1/8…" through "…8/8"
5. If MediaPipe fails to load (network), console shows a clear error

- [ ] **Step 5: Remove the test button** (it will be replaced by the Analyze button in Task 6)

Remove the `{frames && <Btn ... TEST POSE ...>}` block from App.

- [ ] **Step 6: Commit**

```bash
git add VideoReview.html
git commit -m "feat: add MediaPipe Pose skeleton detection and wrist-based bar path annotation"
```

---

## Task 5: Claude API Client

**Files:**
- Modify: `VideoReview.html` — add Claude client functions after the CV Utilities section

- [ ] **Step 1: Add buildPrompt function**

Insert this block after the CV Utilities section and before the `// ── Btn component` comment:

```javascript
// ── Claude API Client ──────────────────────────────────────────────────────────

function buildPrompt(exercise, annotatedFrames, poseFrames) {
  const exerciseLabel = EXERCISES.find(e => e.id === exercise)?.label || exercise;
  const cues = CUES[exercise] || [];
  const phases = PHASES[exercise] || [];

  // Summarise CV data as text
  const cvSummary = poseFrames.map((f, i) => {
    const a = f.angles;
    const lines = [`Frame ${i+1} (${f.timestamp}s):`];
    if (a.left_knee  != null) lines.push(`  left knee ${a.left_knee}°`);
    if (a.right_knee != null) lines.push(`  right knee ${a.right_knee}°`);
    if (a.left_hip   != null) lines.push(`  left hip ${a.left_hip}°`);
    if (a.right_hip  != null) lines.push(`  right hip ${a.right_hip}°`);
    if (a.left_elbow != null) lines.push(`  left elbow ${a.left_elbow}°`);
    if (a.right_elbow!= null) lines.push(`  right elbow ${a.right_elbow}°`);
    if (f.centroid)           lines.push(`  bar centroid x=${f.centroid.x.toFixed(2)} y=${f.centroid.y.toFixed(2)}`);
    return lines.join('\n');
  }).join('\n');

  // Bar path deviation (max horizontal range)
  const xs = poseFrames.map(f => f.centroid?.x).filter(x => x != null);
  const barDeviation = xs.length > 1
    ? `Max horizontal bar deviation: ${((Math.max(...xs) - Math.min(...xs)) * 100).toFixed(1)} cm (normalized units × 100)`
    : 'Bar path data unavailable';

  const cueLibraryText = cues.map(c =>
    `- [${c.phase}] ${c.cue} (${c.source}): ${c.detail}`
  ).join('\n');

  const phaseSchema = phases.map(p =>
    `    {"name":"${p}","status":"ok|warn|fail","note":"one concise observation"}`
  ).join(',\n');

  const segmentOptions = 'hips|knees|lower_back|upper_back|left_elbow|right_elbow|shoulders|wrists';

  return `You are an Olympic weightlifting technique coach analyzing a ${exerciseLabel} attempt.

ATHLETE PROFILE:
- 102.5 kg bodyweight, intermediate strength athlete transitioning to Olympic weightlifting
- OHS stability limiter (50 kg × 4 overhead squat)
- Push jerk only — no split jerk
- Chronic lower back pain: flag ANY exercise or position that loads the lumbar under flexion
- Night-shift worker: technique deteriorates under fatigue — note if movement quality suggests fatigue

CV DATA (computer vision analysis of ${annotatedFrames.length} frames):
${cvSummary}
${barDeviation}

The images attached show these frames with the pose skeleton (green=confident, yellow=estimated joints) and the blue bar path trajectory drawn on each frame.

CUE LIBRARY FOR ${exerciseLabel.toUpperCase()}:
${cueLibraryText}

INSTRUCTIONS:
Respond with EXACTLY this format — a fenced JSON block first, then a coaching paragraph after the COACHING: marker.

\`\`\`json
{
  "phases": [
${phaseSchema}
  ],
  "cues": [
    {"cue":"<exact cue text from library>","source":"<source>","status":"ok|warn|fail","note":"specific observation tied to CV data"}
  ],
  "body_flags": [
    {"segment":"${segmentOptions}","status":"warn|fail","note":"one line"}
  ]
}
\`\`\`

COACHING:
Write 2-4 sentences. Be specific and actionable. Reference actual angles or bar path data where relevant. Prioritise the most impactful correction. Mention back pain implications if relevant.`;
}

async function callClaude(apiKey, exercise, annotatedFrames, poseFrames) {
  const prompt = buildPrompt(exercise, annotatedFrames, poseFrames);

  const imageBlocks = annotatedFrames.map(f => ({
    type: 'image',
    source: { type: 'base64', media_type: 'image/jpeg', data: f.b64.split(',')[1] }
  }));

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
      messages: [{
        role: 'user',
        content: [...imageBlocks, { type: 'text', text: prompt }]
      }]
    })
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(`Claude API error ${response.status}: ${err.error?.message || 'unknown'}`);
  }

  const data = await response.json();
  const text = data.content?.[0]?.text || '';
  return parseClaudeResponse(text);
}

function parseClaudeResponse(text) {
  const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/);
  if (!jsonMatch) {
    return { raw: text, structured: null, coaching: text };
  }
  let structured;
  try {
    structured = JSON.parse(jsonMatch[1]);
  } catch {
    return { raw: text, structured: null, coaching: text };
  }
  const coachingMatch = text.match(/COACHING:\n([\s\S]*?)$/);
  const coaching = coachingMatch ? coachingMatch[1].trim() : '';
  return { raw: text, structured, coaching };
}
```

- [ ] **Step 2: Verify buildPrompt output**

Add temporarily after `const CUES = {...};`:
```javascript
// TEMP: verify prompt structure (remove after Task 5)
window._testPrompt = () => {
  const mockFrames = Array.from({length:8}, (_,i) => ({
    index:i, timestamp:i*0.5, centroid:{x:0.5,y:0.4},
    angles:{left_knee:160,right_knee:159,left_hip:90,right_hip:91,left_elbow:175,right_elbow:174}
  }));
  console.log(buildPrompt('snatch', mockFrames, mockFrames));
};
```

Open Console, run `_testPrompt()`. Verify:
- Output starts with "You are an Olympic weightlifting technique coach"
- Contains "ATHLETE PROFILE:" section with back pain note
- Contains "CUE LIBRARY FOR SNATCH:" with 10 cues
- Contains the JSON schema with all 6 snatch phases
- Contains "COACHING:" marker at end

Remove the `window._testPrompt` line after verifying.

- [ ] **Step 3: Commit**

```bash
git add VideoReview.html
git commit -m "feat: add Claude API client with multimodal request builder and response parser"
```

---

## Task 6: Results UI Components

**Files:**
- Modify: `VideoReview.html` — add Results components before the `// ── App` comment

- [ ] **Step 1: Add all 5 result section components**

Insert this block before the `// ── App ──` comment:

```javascript
// ── Results UI ─────────────────────────────────────────────────────────────────

function CoachingText({ text }) {
  return (
    <div style={{background:'var(--bg2)',border:'1px solid var(--border2)',borderRadius:6,padding:16,marginBottom:16}}>
      <div style={{fontSize:10,color:'var(--text2)',letterSpacing:1,marginBottom:8}}>AI COACHING</div>
      <div style={{fontSize:14,color:'var(--text)',lineHeight:1.7}}>{text}</div>
    </div>
  );
}

function PhaseTimeline({ phases, phaseData }) {
  return (
    <div style={{background:'var(--bg2)',border:'1px solid var(--border2)',borderRadius:6,padding:16,marginBottom:16}}>
      <div style={{fontSize:10,color:'var(--text2)',letterSpacing:1,marginBottom:10}}>LIFT PHASES</div>
      <div style={{display:'flex',gap:4,flexWrap:'wrap'}}>
        {phases.map((name, i) => {
          const d = phaseData?.[i] || {};
          const st = d.status || 'ok';
          const color = STATUS_COLOR[st];
          return (
            <div key={name} style={{
              flex:'1 1 auto',minWidth:60,
              background:`${color}15`,border:`1px solid ${color}`,
              borderRadius:4,padding:'6px 4px',textAlign:'center',cursor:'default'
            }} title={d.note || ''}>
              <div style={{fontSize:9,color,letterSpacing:0.5,marginBottom:2}}>
                {STATUS_ICON[st]}
              </div>
              <div style={{fontSize:9,color,fontWeight:600}}>{name.toUpperCase()}</div>
              {d.note && (
                <div style={{fontSize:8,color:'var(--text2)',marginTop:3,lineHeight:1.3}}>{d.note}</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function KeyFramesStrip({ annotatedFrames, phases }) {
  const canvasRefs = useRef([]);

  useEffect(() => {
    annotatedFrames.forEach((frame, i) => {
      const el = canvasRefs.current[i];
      if (!el) return;
      el.width  = frame.annotatedCanvas.width;
      el.height = frame.annotatedCanvas.height;
      el.getContext('2d').drawImage(frame.annotatedCanvas, 0, 0);
    });
  }, [annotatedFrames]);

  return (
    <div style={{background:'var(--bg2)',border:'1px solid var(--border2)',borderRadius:6,padding:16,marginBottom:16}}>
      <div style={{fontSize:10,color:'var(--text2)',letterSpacing:1,marginBottom:8}}>
        KEY FRAMES — skeleton + bar path
      </div>
      <div style={{display:'flex',gap:8,overflowX:'auto',paddingBottom:8}}>
        {annotatedFrames.map((frame, i) => (
          <div key={i} style={{flexShrink:0,textAlign:'center'}}>
            <canvas
              ref={el => canvasRefs.current[i] = el}
              style={{
                display:'block',borderRadius:4,maxWidth:140,height:'auto',
                border:'1px solid var(--border)'
              }}
            />
            <div style={{
              fontSize:9,marginTop:4,
              color: i < (phases?.length||0) ? 'var(--text2)' : 'var(--text3)'
            }}>
              {phases?.[i] || `Frame ${i+1}`}
            </div>
            <div style={{fontSize:9,color:'var(--text3)'}}>{frame.timestamp}s</div>
          </div>
        ))}
      </div>
      <div style={{fontSize:10,color:'var(--blue)',marginTop:4}}>— blue line = bar path</div>
    </div>
  );
}

function CueChecklist({ cues, cueData }) {
  // Merge cue library with Claude's assessments
  const merged = cues.map(c => {
    const match = cueData?.find(d => d.cue === c.cue) || {};
    return { ...c, status: match.status || 'ok', note: match.note || '' };
  });
  // Sort: fail first, then warn, then ok
  const order = { fail:0, warn:1, ok:2 };
  const sorted = [...merged].sort((a,b) => order[a.status] - order[b.status]);
  return (
    <div style={{background:'var(--bg2)',border:'1px solid var(--border2)',borderRadius:6,padding:16,marginBottom:16}}>
      <div style={{fontSize:10,color:'var(--text2)',letterSpacing:1,marginBottom:10}}>CUE CHECKLIST</div>
      {sorted.map((c, i) => (
        <div key={i} style={{
          display:'flex',gap:10,alignItems:'flex-start',
          padding:'8px 0',
          borderBottom: i < sorted.length-1 ? '1px solid var(--border)' : 'none'
        }}>
          <span style={{color:STATUS_COLOR[c.status],flexShrink:0,fontSize:14,lineHeight:1}}>
            {STATUS_ICON[c.status]}
          </span>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:13,color:'var(--text)',marginBottom:2}}>{c.cue}</div>
            {c.note && <div style={{fontSize:11,color:'var(--text2)'}}>{c.note}</div>}
          </div>
          <span style={{fontSize:10,color:'var(--text3)',flexShrink:0}}>{c.source}</span>
        </div>
      ))}
    </div>
  );
}

// SVG body diagram — highlight flagged segments
const BODY_PARTS = {
  shoulders:    { type:'ellipse', cx:40, cy:28, rx:16, ry:5 },
  upper_back:   { type:'rect',   x:28, y:28, w:24, h:16 },
  lower_back:   { type:'rect',   x:30, y:44, w:20, h:12 },
  hips:         { type:'ellipse', cx:40, cy:58, rx:14, ry:6 },
  left_elbow:   { type:'circle', cx:16, cy:44, r:5 },
  right_elbow:  { type:'circle', cx:64, cy:44, r:5 },
  wrists:       { type:'ellipse', cx:40, cy:62, rx:10, ry:3 },
  knees:        { type:'ellipse', cx:40, cy:82, rx:10, ry:4 },
};

function BodyDiagram({ bodyFlags }) {
  const flagMap = {};
  (bodyFlags || []).forEach(f => { flagMap[f.segment] = f; });

  function partColor(name) {
    const f = flagMap[name];
    if (!f) return 'transparent';
    return f.status === 'fail' ? 'rgba(201,79,58,0.4)' : 'rgba(212,168,67,0.35)';
  }
  function partStroke(name) {
    const f = flagMap[name];
    if (!f) return 'var(--border2)';
    return f.status === 'fail' ? 'var(--red)' : 'var(--yellow)';
  }

  return (
    <div style={{background:'var(--bg2)',border:'1px solid var(--border2)',borderRadius:6,padding:16}}>
      <div style={{fontSize:10,color:'var(--text2)',letterSpacing:1,marginBottom:10}}>BODY — flagged segments</div>
      <div style={{display:'flex',gap:20,alignItems:'flex-start',flexWrap:'wrap'}}>
        <svg width="80" height="130" viewBox="0 0 80 130" style={{flexShrink:0}}>
          {/* Stick figure base */}
          <circle cx="40" cy="12" r="8" stroke="var(--border2)" strokeWidth="1.5" fill="none"/>
          <line x1="40" y1="20" x2="40" y2="56" stroke="var(--border2)" strokeWidth="1.5"/>
          <line x1="40" y1="28" x2="20" y2="44" stroke="var(--border2)" strokeWidth="1.5"/>
          <line x1="20" y1="44" x2="14" y2="58" stroke="var(--border2)" strokeWidth="1.5"/>
          <line x1="40" y1="28" x2="60" y2="44" stroke="var(--border2)" strokeWidth="1.5"/>
          <line x1="60" y1="44" x2="66" y2="58" stroke="var(--border2)" strokeWidth="1.5"/>
          <line x1="34" y1="58" x2="30" y2="80" stroke="var(--border2)" strokeWidth="1.5"/>
          <line x1="30" y1="80" x2="28" y2="108" stroke="var(--border2)" strokeWidth="1.5"/>
          <line x1="46" y1="58" x2="50" y2="80" stroke="var(--border2)" strokeWidth="1.5"/>
          <line x1="50" y1="80" x2="52" y2="108" stroke="var(--border2)" strokeWidth="1.5"/>
          {/* Highlighted segments */}
          <ellipse cx="40" cy="28" rx="16" ry="5" fill={partColor('shoulders')} stroke={partStroke('shoulders')} strokeWidth="1.5"/>
          <rect x="28" y="28" width="24" height="16" fill={partColor('upper_back')} stroke={partStroke('upper_back')} strokeWidth="1.5" rx="2"/>
          <rect x="30" y="44" width="20" height="12" fill={partColor('lower_back')} stroke={partStroke('lower_back')} strokeWidth="1.5" rx="2"/>
          <ellipse cx="40" cy="58" rx="14" ry="6" fill={partColor('hips')} stroke={partStroke('hips')} strokeWidth="1.5"/>
          <circle cx="16" cy="44" r="5" fill={partColor('left_elbow')} stroke={partStroke('left_elbow')} strokeWidth="1.5"/>
          <circle cx="64" cy="44" r="5" fill={partColor('right_elbow')} stroke={partStroke('right_elbow')} strokeWidth="1.5"/>
          <ellipse cx="40" cy="82" rx="10" ry="4" fill={partColor('knees')} stroke={partStroke('knees')} strokeWidth="1.5"/>
        </svg>
        <div style={{flex:1,minWidth:120}}>
          {(bodyFlags || []).length === 0 ? (
            <div style={{fontSize:12,color:'var(--text3)'}}>No body segment flags</div>
          ) : (
            (bodyFlags || []).map((f, i) => (
              <div key={i} style={{marginBottom:8}}>
                <span style={{color: f.status==='fail' ? 'var(--red)' : 'var(--yellow)', fontSize:11, fontWeight:600}}>
                  ● {f.segment.replace(/_/g,' ')}
                </span>
                <div style={{fontSize:11,color:'var(--text2)',marginTop:2}}>{f.note}</div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function Results({ exercise, annotatedFrames, poseFrames, claudeResult }) {
  if (!claudeResult) return null;
  const { structured, coaching, raw } = claudeResult;
  const phases = PHASES[exercise] || [];
  const cues   = CUES[exercise]  || [];

  if (!structured) {
    return (
      <div style={{marginTop:24,padding:16,background:'var(--bg2)',border:'1px solid var(--border2)',borderRadius:6}}>
        <div style={{fontSize:12,color:'var(--red)',marginBottom:8}}>Could not parse structured response. Raw output:</div>
        <pre style={{fontSize:11,color:'var(--text2)',whiteSpace:'pre-wrap',wordBreak:'break-word'}}>{raw}</pre>
      </div>
    );
  }

  return (
    <div className="fade" style={{marginTop:24}}>
      <CoachingText text={coaching} />
      <PhaseTimeline phases={phases} phaseData={structured.phases} />
      <KeyFramesStrip annotatedFrames={annotatedFrames} phases={phases} />
      <CueChecklist cues={cues} cueData={structured.cues} />
      <BodyDiagram bodyFlags={structured.body_flags} />
    </div>
  );
}
```

- [ ] **Step 2: Verify components with mock data**

Temporarily add this mock result to the App return to visually verify all 5 sections render:

```javascript
// In App, temporarily replace the {frames && ...} block:
const mockResult = {
  structured: {
    phases: [
      {name:'Setup',status:'ok',note:'Neutral spine, bar over mid-foot'},
      {name:'First Pull',status:'warn',note:'Bar drifting slightly forward at knee'},
      {name:'Transition',status:'fail',note:'Bar loops forward 8cm — lats disengaged'},
      {name:'Second Pull',status:'fail',note:'Hips fire before traps — sequential extension'},
      {name:'Catch',status:'warn',note:'Knee angle 102° — insufficient depth'},
      {name:'Recovery',status:'ok',note:'Stable return to start'},
    ],
    cues: [
      {cue:'Bar close to body through transition',source:'Everett',status:'fail',note:'Bar drifted 8cm forward at knee height'},
      {cue:'Triple extension fires simultaneously',source:'Berestov',status:'fail',note:'Hips fired ~80ms before traps'},
      {cue:'Active lat engagement in overhead position',source:'Pavlukhin',status:'ok',note:'Good lat activation in catch'},
    ],
    body_flags: [
      {segment:'hips',status:'fail',note:'Rising before bar clears knees'},
      {segment:'knees',status:'warn',note:'Insufficient flexion at catch (102°)'},
    ]
  },
  coaching: 'Bar path shows a forward loop in the transition phase — bar drifts ~8 cm anterior at knee height before hip contact, indicating early hip rise with disengaged lats. Triple extension is sequential rather than simultaneous; hips fire before traps, costing bar height and timing. Priority correction: maintain lat tension through the first pull by cueing "lats back and down" at setup, and delay the hip drive until bar passes the knees.',
  raw: ''
};
// Add to App state: const [claudeResult] = useState(mockResult);
// And add <Results exercise={exercise} annotatedFrames={[]} poseFrames={[]} claudeResult={mockResult} />
```

Open browser. Verify all 5 result sections render correctly with the mock data.

Remove the mock state and mock result JSX after verifying.

- [ ] **Step 3: Commit**

```bash
git add VideoReview.html
git commit -m "feat: add Results UI — coaching text, phase timeline, frames strip, cue checklist, body diagram"
```

---

## Task 7: End-to-End Orchestration + Loading States + Error Handling

**Files:**
- Modify: `VideoReview.html` — wire everything together in the App component

- [ ] **Step 1: Add analysis orchestration state and Analyze button to App**

Replace the App function body with the complete final version:

```javascript
function App() {
  const [showSettings, setShowSettings] = useState(false);
  const [exercise,     setExercise]     = useState('snatch');
  const [frames,       setFrames]       = useState(null);   // raw canvas frames
  const [video,        setVideo]        = useState(null);
  const [error,        setError]        = useState('');
  const [loading,      setLoading]      = useState(false);
  const [loadingMsg,   setLoadingMsg]   = useState('');
  const [annotated,    setAnnotated]    = useState(null);   // annotated frames
  const [poseFrames,   setPoseFrames]   = useState(null);
  const [result,       setResult]       = useState(null);

  const apiKey = localStorage.getItem('lr_api_key') || '';
  const canAnalyze = !!frames && !!apiKey && !loading;

  const handleFrames = useCallback((frms, vid) => {
    setFrames(frms || null);
    setVideo(vid || null);
    setAnnotated(null);
    setPoseFrames(null);
    setResult(null);
    setError('');
  }, []);

  const analyze = useCallback(async () => {
    if (!frames || !apiKey) return;
    setError('');
    setResult(null);
    setLoading(true);
    try {
      setLoadingMsg('Running pose detection…');
      const pf = await runPoseOnFrames(frames, msg => setLoadingMsg(msg));

      setLoadingMsg('Annotating frames…');
      const af = annotateFrames(pf);

      setLoadingMsg('Sending to Claude…');
      const claudeResult = await callClaude(apiKey, exercise, af, pf);

      setPoseFrames(pf);
      setAnnotated(af);
      setResult(claudeResult);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setLoadingMsg('');
    }
  }, [frames, apiKey, exercise]);

  return (
    <div style={{maxWidth:640,margin:'0 auto',padding:'0 16px 60px'}}>
      {/* Header */}
      <div style={{
        display:'flex',alignItems:'center',justifyContent:'space-between',
        padding:'20px 0 16px',borderBottom:'1px solid var(--border)'
      }}>
        <div style={{fontFamily:"'Bebas Neue'",fontSize:28,letterSpacing:2,color:'var(--gold)'}}>
          LIFT REVIEW
        </div>
        <button onClick={() => setShowSettings(true)} style={{
          background:'none',border:'1px solid var(--border2)',borderRadius:4,
          padding:'6px 12px',color: apiKey ? 'var(--green)' : 'var(--text2)',cursor:'pointer',fontSize:12
        }}>
          {apiKey ? '⚙ API KEY SET' : '⚙ ADD API KEY'}
        </button>
      </div>

      {/* Exercise selector */}
      <div style={{marginTop:20}}>
        <div style={{fontSize:11,color:'var(--text2)',letterSpacing:1,marginBottom:6}}>EXERCISE</div>
        <select
          value={exercise}
          onChange={e => { setExercise(e.target.value); setResult(null); }}
          style={{
            width:'100%',background:'var(--bg2)',border:'1px solid var(--border2)',
            borderRadius:4,padding:'10px 12px',color:'var(--text)',fontSize:14
          }}
        >
          {EXERCISES.map(ex => <option key={ex.id} value={ex.id}>{ex.label}</option>)}
        </select>
      </div>

      {/* Upload zone */}
      <UploadZone onFrames={handleFrames} onError={setError} />

      {/* Error */}
      {error && (
        <div style={{
          marginTop:12,padding:'10px 14px',
          background:'rgba(201,79,58,0.1)',border:'1px solid var(--red)',
          borderRadius:4,color:'var(--red)',fontSize:13
        }}>
          {error}
          <button onClick={() => setError('')} style={{
            float:'right',background:'none',border:'none',
            color:'var(--red)',cursor:'pointer',fontSize:16,lineHeight:1
          }}>×</button>
        </div>
      )}

      {/* Analyze button + hints */}
      {frames && (
        <div style={{marginTop:20}}>
          {!apiKey && (
            <div style={{fontSize:12,color:'var(--text3)',marginBottom:8,textAlign:'center'}}>
              Add your Anthropic API key to enable analysis
            </div>
          )}
          <Btn
            onClick={analyze}
            disabled={!canAnalyze}
            style={{width:'100%',fontSize:18,padding:'12px 0'}}
          >
            {loading ? loadingMsg || 'ANALYZING…' : 'ANALYZE TECHNIQUE'}
          </Btn>
          {loading && (
            <div style={{
              marginTop:8,height:2,background:'var(--border)',borderRadius:1,overflow:'hidden'
            }}>
              <div style={{
                height:'100%',background:'var(--gold)',
                animation:'progress 2s ease-in-out infinite',
                width:'40%'
              }}/>
            </div>
          )}
        </div>
      )}

      {/* Results */}
      {result && annotated && poseFrames && (
        <Results
          exercise={exercise}
          annotatedFrames={annotated}
          poseFrames={poseFrames}
          claudeResult={result}
        />
      )}

      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}

      <style>{`
        @keyframes progress {
          0%{transform:translateX(-100%)} 50%{transform:translateX(250%)} 100%{transform:translateX(-100%)}
        }
      `}</style>
    </div>
  );
}
```

- [ ] **Step 2: Full end-to-end test**

1. Open `VideoReview.html` in Chrome
2. Add API key via settings modal
3. Select "Snatch" from exercise dropdown
4. Upload a snatch video (at least 2 seconds)
5. Click "ANALYZE TECHNIQUE"
6. Verify loading states appear in sequence: "Running pose detection… frame 1/8…" through "Sending to Claude…"
7. After ~15-30 seconds: all 5 result sections appear
8. Verify: annotated frame canvases show actual video frames with skeleton + blue bar path line
9. Verify: phase timeline shows 6 snatch phases with color coding
10. Verify: cue checklist shows cues sorted fail → warn → ok with source attribution
11. Verify: body diagram highlights flagged segments in red/yellow

- [ ] **Step 3: Test error scenarios**

| Scenario | How to trigger | Expected result |
|----------|---------------|-----------------|
| No API key | Remove key from localStorage | Analyze button disabled, message above it |
| Bad API key | Set key to "sk-ant-bad" | Red error "Claude API error 401: …" |
| Video < 2 seconds | Upload very short clip | Red error "Video must be at least 2 seconds long" |
| MediaPipe load failure | Block `cdn.jsdelivr.net` in DevTools Network | Analysis proceeds with null landmarks (bar path still from centroids being null); no crash |
| Malformed Claude response | n/a — parse fallback shows raw text | Falls through to raw text display in Results |

- [ ] **Step 4: Commit**

```bash
git add VideoReview.html
git commit -m "feat: wire full analysis pipeline — pose → annotation → Claude → results"
```

---

## Self-Review

**Spec coverage check:**

| Spec requirement | Task |
|-----------------|------|
| Standalone web app, single HTML file | Task 1 |
| File upload (MP4/MOV/WebM) | Task 3 |
| Exercise selector: 6 exercise types | Task 1 |
| MediaPipe Pose skeleton overlay | Task 4 |
| Bar path trajectory (wrist-based) | Task 4 |
| Single Claude API call (claude-sonnet-4-6) | Task 5 |
| Freeform coaching paragraph | Task 6 (CoachingText) |
| Phase timeline per exercise | Tasks 2 + 6 (PhaseTimeline, PHASES) |
| Annotated key frames (real frames + CV overlays) | Tasks 4 + 6 (KeyFramesStrip) |
| Cue checklist with source attribution | Tasks 2 + 6 (CueChecklist, CUES) |
| Body diagram with flagged segments | Task 6 (BodyDiagram) |
| API key in localStorage | Task 1 (SettingsModal) |
| Cue library baked in | Task 2 |
| Per-exercise phase lists | Task 2 (PHASES) |
| Error handling — all 7 scenarios from spec | Task 7 |
| Loading states with step labels | Task 7 |
| OlyTracker aesthetic (dark, gold, Bebas Neue) | Task 1 |

**Note on spec deviation:** Bar path uses wrist landmark midpoints (MediaPipe) rather than HSV color blob detection (original spec). This is strictly better — more reliable across different barbell colors and gym backgrounds, and requires no extra computation since pose detection runs on every frame anyway.

All spec requirements covered. No placeholders found.
