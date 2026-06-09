# CLAUDE.md — OlyTracker

## Development Rules

- **App source of truth is `docs/src/app.jsx`** (NOT the HTML). The app is React + JSX. `index.html` is now a thin shell that loads pre-transpiled `docs/app.js`. **Never edit `docs/app.js` by hand** — it is generated. Edit `docs/src/app.jsx`, then run `npm run build` (esbuild → `docs/app.js`). Use `npm run watch` during development. The in-browser Babel transpiler was removed (was ~2.8 MB + per-load transpile cost).
- **Version bump on every commit that touches the app** (`docs/src/app.jsx`, `docs/app.js`, or `docs/index.html`) — update `PROGRAM v<X.Y.Z> · <date>` in the header (the string lives in `app.jsx`) before committing, and rebuild so `app.js` carries it. No exceptions, including minor fixes. Format: `major.minor.patch`. Current version: `v3.1.0 · 2026-06-09`.
- **Version bump on every commit that touches `VideoReview.html`** — update `v<X.Y.Z> · <date>` in the header before committing. Same format. Current version: `v1.0.0 · 2026-05-28`.
- **Cloud sync is Supabase only.** The GitHub Gist sync path was removed — `sbSync` (defined inline in `index.html`) auto-syncs sessions/sets/reviews on every mutation and pulls on startup. Don't reintroduce a second sync backend.
- **`docs/key.js` holds secrets** (gitignored, not deployed to Pages). The `__CLAUDE_KEY` there only works locally; a browser cannot hold a Claude key securely — for production AI review, proxy through a serverless function. The Supabase publishable key is safe to expose.

---

## Project Purpose

Extract transcripts from selected YouTube/web coaching sources focused on Olympic weightlifting, synthesize their programming philosophies, and use the combined knowledge base to build a personalized training program and interactive tracker for a specific athlete.

---

## Athlete Profile

| Attribute       | Value                                                  |
|-----------------|--------------------------------------------------------|
| Bodyweight      | ~102.5 kg (226 lbs)                                   |
| Weight class    | 102 kg or 109 kg                                      |
| Power Snatch    | 60 kg (tested)                                        |
| Hang Power Snatch | 62 kg (best logged)                                 |
| Full Snatch     | 55 kg floor (Nov 2025)                                |
| Best Clean      | 80 kg                                                 |
| Best Jerk       | ~65 kg (push/power jerk only — NO split jerk)         |
| Clean Pull      | 120 kg × 3                                            |
| Snatch High Pull | 92 kg × 4                                            |
| Back Squat      | 118 kg × 1 (May 2026)                                 |
| Front Squat     | 102 kg × 2                                            |
| Overhead Squat  | 50 kg × 4 — primary snatch limiter                    |
| Overhead Press  | 62 kg × 2                                             |
| Experience      | Intermediate strength athlete mid-transition to OLY   |
| Training history | 17 months logged (Dec 2024 – May 2026, FitNotes)     |
| Goal            | General fitness + Olympic weightlifting               |
| Training days   | 5 days/week (summer) → 4 days/week (school term Aug+) |
| Work schedule   | Night shifts Wed–Sun, 7pm→7:30am                      |
| Limitations     | Chronic back pain (manageable, not acute)             |
|                 | No scissors/split jerk                                |
| Weak points     | Jerk (far behind clean), OHS stability                |
| Strong points   | Clean pull strength, posterior chain, squat           |
| Influences      | Klokov, Berestov already visible in training log      |

### Estimated Training Maxes

| Lift          | Training Max |
|---------------|-------------|
| Snatch        | 63 kg       |
| Clean & Jerk  | 72 kg       |
| Front Squat   | 102 kg      |
| Back Squat    | 118 kg      |
| Push Press    | 65 kg       |
| Clean Pull    | 120 kg      |

---

## Weekly Schedule & Sleep Analysis

### Work Pattern
Night shifts: Wed 7pm → Thu 7:30am, Thu 7pm → Fri 7:30am, Fri 7pm → Sat 7:30am, Sat 7pm → Sun 7:30am.
Days off: Mon, Tue. Finish last shift Sun 7:30am → sleep all day Sunday.

### Sleep & Training Quality by Day

| Day | Sleep before gym | Duration | Training quality | Notes |
|-----|-----------------|----------|-----------------|-------|
| Mon | Full night | 7–8hrs | ⭐⭐⭐ Best | Full recovery after Sun rest |
| Tue | Full night | 7–8hrs | ⭐⭐⭐ Best | Second full recovery day |
| Wed | Full night | 7–8hrs | ⭐⭐ Good | Work starts 7pm — don't drain tank |
| Thu (school) | Post-shift nap | ~3.5hrs | ⚠️ Compromised | Light/technique only during school term |
| Thu (summer) | Post-shift sleep | ~5.5hrs | ⭐⭐ Workable | 8:30am→2pm sleep, jerk priority |
| Fri (school) | Post-shift nap | ~3.5hrs | ⚠️ Compromised | Skip during school term |
| Fri (summer) | Post-shift sleep | ~5.5hrs | ⭐⭐ Workable | Active hypertrophy + technique |
| Sat | Cumulative fatigue | 5.5hrs | — | Rest |
| Sun | Finish shift 7:30am | Recovery | ❌ Rest only | Full recovery day |

### Summer Training Block (now → August)
5 days/week. Extended sleep on shift days (8:30am→2pm = 5.5hrs).

| Day | Session | Quality | Hard rules |
|-----|---------|---------|------------|
| Mon | Day 1 — Snatch Complex + Posterior Chain | ⭐⭐⭐ | Go heavy |
| Tue | Day 2 — Clean + Upper Hypertrophy | ⭐⭐⭐ | Go heavy |
| Wed | Day 3 — Legs + Snatch Stability | ⭐⭐ | Hard stop 3pm, max 80% |
| Thu | Day 4 — Jerk Priority + C&J | ⭐⭐ | Daily max singles, technical focus |
| Fri | Rest | ❌ | Post-shift sleep before last night shift |
| Sat | Day 5 — Active Hypertrophy + Technique | ⭐⭐ | 65–70%, accessory-heavy, no PRs |
| Sat | Rest | — | — |
| Sun | Rest — recover from shift | ❌ | No training |

### School Term Training Block (August+)
4 days/week. Thu/Fri sleep drops back to ~3.5hrs — too little for productive training.

| Day | Session | Quality |
|-----|---------|---------|
| Mon | Day 1 — Snatch Complex + Posterior Chain | ⭐⭐⭐ |
| Tue | Day 2 — Clean + Upper Hypertrophy | ⭐⭐⭐ |
| Wed | Day 3 — Legs + Snatch Stability | ⭐⭐ |
| Fri | Day 4 — Jerk Priority + C&J | ⭐⭐ |

---


### Current: Block 1 — Hypertrophy Foundation (6 Weeks)
Athlete decision: build the muscular and structural base before loading the competition lifts.
Per Pavlukhin: hypertrophy first, then extract performance from that base.

- Phase 1 (Weeks 1–3): 65–75% TM, technique + tissue
- Phase 2 (Weeks 4–6): 72–82% TM, progressive load
- **Summer (now→Aug): 5 days/week** — Mon/Tue/Wed/Thu/Sat
- **School term (Aug+): 4 days/week** — Mon/Tue/Wed/Fri

### Planned: Block 2 — Technique Consolidation (Weeks 7–10)
Lead-up exercises per Berestov. Moderate loads. Movement patterns ingrained.

### Planned: Block 3 — Strength/Load Development (Weeks 11–16)
Load the base. Per Torokhtiy: raise average training weight by 4% to add 10 kg to total.

---

## Knowledge Base: Coaching Sources

### 1. Andrey Pavlukhin — @pavlukhinweightlifting
**Background:** Weightlifting + powerlifting coach, St. Petersburg. Rejects Soviet-era programming. Grounds approach in Seluyanov's sports science framework.

**Key principles:**
- ВПДЕ + Hypertrophy combination — neither alone is sufficient
- Hypertrophy builds structural base first; intensity extracts from it second
- Modified Bulgarian: singles used but introduced gradually — starting too heavy = regression
- Total stress accounting: life stress + training stress = total load on the bar
- Upper body (lats, chest) directly improves snatch bar control and C&J fixation
- Lunge squats for jerk tendon development even without split jerk
- Program is a guide, not a contract — adjust to daily state

**Application:** Phase 1/2 block structure mirrors his model. Night shift load reductions. Extra jerk volume addresses primary weak point.

---

### 2. Dmitry Berestov / Berestov Team — @athletists | berestovteam.ru | t.me/ATLETISTY
**Background:** Russian Olympic champion Athens 2004, 105 kg. Only Russian male OLY gold 2000–2016. Coaches 70+ amateur athletes aged 19–67.

**Key principles:**
- Technique-first always — results follow from technique, not from load
- Lead-up exercises (подводящие упражнения) every session — never rush to competition lift
- 2-month cycles ending in testing or competition
- Training plans published the evening before with explanations and demo videos
- Build on correct patterns — don't fixate on errors

**Application:** 8-week block = Berestov's 2-month cycle. Lead-up exercises justify hang variations and positional work. "Build on correct patterns" is critical given back pain — compensatory patterns under load become permanent.

---

### 3. Dmitry Klokov — Рывкачи playlist (@dmitryklokov)
**Background:** Russian Olympic silver medalist Beijing 2008, 105 kg. World champion 2005, European champion 2010, 3× Russian champion. Рывкачи = sports reality show bridging fitness/bodybuilding and weightlifting (31 episodes, 2 seasons).

**Key principles:**
- Multi-school exposure: different coaching approaches shown side-by-side — no single dogma
- Video self-analysis every session: film, watch back, identify errors, address with accessory work
- Recovery is the limiting factor — sauna every 10 days, massage 2–3×/month
- Season 1: trained a strong fitness athlete for weightlifting from scratch — direct analogue to this athlete
- Execute basics correctly: "don't look for secret exercises"

**Application:** Video review every session (phone on tripod). Recovery scheduling around night shifts. Season 1 documented the exact same fitness→weightlifting transition.

---

### 4. Oleksiy Torokhtiy — @torokhtiy
**Background:** Ukrainian Olympic champion London 2012, 105 kg. PhD Sport Science 2025. 10,000+ athletes coached. 200+ seminars worldwide.

**Key principles:**
- r=0.904 correlation between average training weight and performance — raise average TW by 4% to add 10 kg to total
- Load distribution: ~40% average, ~46% high/below-average, ~14% max. Beginners skew further toward moderate.
- Session opener: high pull from hang every session to ingrain power position
- Feel-based loading for beginners: work up to heaviest weight that feels good, no grinding misses
- Common beginner failure modes: bad technique becoming permanent, skipping warm-up, no progression structure

**Application:** Feel-based loading on main lifts. 4% average-weight rule for Phase 2 load increases. Session always opens with positional/pull work.

---

### 5. Greg Everett / Catalyst Athletics — @catalystathletics
**Background:** Owner of Catalyst Athletics — world's largest OLY education resource. USA Weightlifting National Championship team coach. Author of *Olympic Weightlifting: A Complete Guide for Athletes & Coaches*. 2021 Danish Coach of the Year. 109,000+ athletes.

**Key principles:**
- "Technique is permanent: strength is specific to position. Train pulls in bad positions → get stronger in bad positions. Practice makes permanent; training makes stronger."
- Do more with less: 4–6 well-chosen exercises > 12 mediocre ones
- Planning + flexibility both required: rigid plans fail, pure feel-based training defaults to strengths
- The program must structurally address weak points — athletes won't self-select weakness work
- 4-level beginner pipeline: Learn → Consolidate → Build → Peak
- Pull weights should not grossly exceed competition lift weights — heavy pulls in bad positions entrench bad mechanics

**Application:** "Technique is permanent" is the highest priority given back pain compensatory patterns. Multidimensionality keeps sessions lean. Jerk is structurally scheduled as Day 4 main event — athlete will not self-select it otherwise.

---

### 6. Dmitry Golovinsky — @88Dmitry (YouTube)
**Background:** Ukrainian powerlifting and bench press champion. World record holder in raw bench press (302.5 kg at 127 kg bodyweight). Creator of LMS (Last Man Standing) training system, developed since 2012. Also posts Olympic weightlifting content on his YouTube channel — this content has not yet been extracted and should be prioritized in the transcript extraction phase.

**LMS system principles (powerlifting base, partial OLY application):**
- Three training modes combined: high-intensity (near-max, low volume), moderate (volume work), and deload — cycled systematically
- High-intensity mode: athlete reaches near-maximal weights frequently — weekly or more. Suited for athletes with established technique who tolerate intensity well
- Competition movement trained every session at varying intensities — even on light days, the main lift is touched
- Accessory exercises are structural and purposeful — general development, injury prevention, and direct carryover to main movement. Not cosmetic filler
- Heavy volume weeks use paired sessions (resembles weightlifting preparation)
- Pre-competition/control periods: volume and session frequency reduce; intensity preserved
- For natural athletes: conservative volume; for enhanced: significantly more volume and frequency

**What transfers to OLY programming:**
- **Touch the competition movement every session** — even 2–3 light sets of hang power snatch or muscle snatch on non-snatch days keeps the motor pattern alive (Golovinsky bench analogy)
- **Jerk from Rack as daily max singles** — instead of prescribed 5×3, climb to the heaviest single that feels solid with no grinding misses. Aligns with Everett's "heaviest good single" and Pavlukhin's modified Bulgarian
- **Accessory work is structural** — each accessory exercise must have a named purpose and direct carryover to a specific weakness
- **High-intensity + low-volume option** — for the jerk specifically, fewer heavier singles may outperform more sets at moderate load

**OLY content on @88Dmitry:** Not yet extracted. Claude Code should prioritize pulling and reviewing these videos specifically for weightlifting methodology that may differ from or extend the LMS powerlifting base.

**Application to this athlete:** Day 4 jerk protocol shifts from 5×3 to daily max singles (climb to heavy single, no miss). Light touch of snatch pattern opener on all 4 training days (2×3 muscle snatch at 50% added to Days 2 and 4).

---

### 7. Dozer — @DozerWeightlifting
**Background:** 13 years training with elite US weightlifters. Self-coached competitor turned coach and content creator. Known for the most comprehensive technique cue library in English-language weightlifting content. Products include the Technique Manual (180+ cues), Demon Back Protocol, Foundations of Weightlifting, and squat programs.

**Why added:** Narrow, specific contribution — not a full programming philosophy source. Added for two things only:

**1. Technique cue library for self-coaching:**
- 180+ cues for snatch and C&J organized by position and phase
- Every position, every transition, every common error — indexed by body part so the athlete can look up a specific problem within one minute of a failed attempt
- Directly supports Klokov's video self-review principle — athlete films, identifies the position breakdown, looks it up, addresses it
- Particularly valuable since this athlete trains without a coach

**2. Demon Back Protocol:**
- Dedicated back health and strengthening program for weightlifters
- Directly relevant given chronic back pain
- Should be extracted and reviewed as a standalone protocol to layer into Block 1 accessory work

**What he does NOT add:** Programming philosophy, periodization, loading schemes — these are already well covered by the existing 6 sources.

**Application to this athlete:** Extract Dozer's channel transcripts with a specific focus on:
- Snatch receiving position cues (OHS stability is the current ceiling)
- Jerk mechanics cues (push jerk specific, no split)
- Back health and posterior chain cues
- Demon Back Protocol exercises → candidate accessory additions for Day 1 and Day 3

**Extraction note for Claude Code:** Flag all Dozer transcripts containing "back," "demon," "snatch receive," "overhead squat," "jerk" for priority review. Generate a separate `dozer_cue_index.md` that organizes extracted cues by lift phase — this becomes an in-session reference tool alongside the tracker app.

---

### 8. Sonny Webster / The Lifting Zone — @sonnywebsterGB | theliftingzone.com
**Background:** British Olympic weightlifter, Rio 2016 (14th place, 333 kg total). BSc Sports Performance from Bath University. Founded The Lifting Zone (formerly Sonny Webster Academy) — one of the largest English-language online weightlifting platforms. Coached 10,000+ athletes, delivered seminars in 30+ countries. Anti-doping bans 2017–2024 (ostarine positive + coaching during ineligibility); returned to full coaching activity June 2024.

**Why added:** Two narrow contributions — mobility and accessible technique language. Not added for programming philosophy (covered by Everett and Torokhtiy already).

**1. Mobility Manual and weightlifting-specific mobility content:**
- Most systematic English-language resource specifically on weightlifting mobility
- Sports-specific protocols — not generic stretching, but mobility work tied directly to snatch and C&J positions
- Dedicated content on ankle, hip, thoracic, and shoulder mobility for weightlifters
- 40-day mobility program documented — extract and review for additions to the app's Mobility tab
- Directly addresses the athlete's three limiters: thoracic extension, shoulder external rotation, hip flexors

**2. Simplification-first coaching language:**
- Explicitly positions against "overcomplicated" coaching — makes complex movements accessible
- Good source for simple, memorable cues that complement Dozer's exhaustive cue library
- "Keep things super simple, easy to understand, always help athletes understand the why"

**What he does NOT add:** Periodization, loading schemes, Eastern European methodology — all covered. Programming overlaps with Everett and Torokhtiy.

**Application to this athlete:**
- Extract mobility content specifically — add any gaps to the app's Mobility tab
- Flag snatch and clean technique simplification cues for Dozer cue index
- Review his ankle mobility content — not flagged as a limiter yet but worth checking given squat depth

**Extraction note for Claude Code:** Prioritize videos tagged with "mobility," "flexibility," "snatch technique," "clean technique." Generate additions to `dozer_cue_index.md` under a `[WEBSTER]` tag. Cross-reference with Dozer cues — where both coaches give the same cue, flag it as high-confidence.

---

## Synthesized Programming Principles

| # | Principle | Source(s) |
|---|-----------|-----------|
| 1 | Hypertrophy base first — build tissue before loading it | Pavlukhin |
| 2 | Technique before load — always | Berestov, Everett, Torokhtiy, Klokov |
| 3 | Lead-up exercises every session — never go straight to competition lift | Berestov, Torokhtiy |
| 4 | Jerk is the priority weak point — Day 4 main event, daily max singles | Pavlukhin, Golovinsky |
| 5 | Touch competition movement every session — even light pattern work | Golovinsky |
| 6 | Load by feel — heaviest good set, no grinding misses | Everett, Torokhtiy |
| 7 | Singles at session start, volume after | Pavlukhin, Golovinsky |
| 8 | Video self-review every session | Klokov |
| 9 | Recovery is training — sauna, massage, sleep scheduled | Klokov, Pavlukhin |
| 10 | 8-week cycle ending in testing | Berestov |
| 11 | 4–6 exercises/session, each with named purpose | Everett, Golovinsky |
| 12 | Back pain: no spinal load under flexion; upright posture always | All (implicitly) |
| 13 | No split jerk — push jerk only; build lunge strength for future | Pavlukhin |
| 14 | Night shift = reduced session — technique only at 60–65% | Pavlukhin (total stress) |
| 15 | OHS stability is the snatch ceiling — prioritize it | Program data (50 kg OHS) |
| 16 | Mobility is the root of performance — sports-specific protocols daily | Webster |

---

## Project Structure

```
olytracker/
├── CLAUDE.md                        # This file
├── README.md
├── requirements.txt
├── config.py                        # All channels, API keys, LLM settings, output paths
├── extractor/
│   ├── __init__.py
│   ├── channel.py                   # Fetch video IDs from channel URL
│   ├── playlist.py                  # Fetch video IDs from playlist URL
│   ├── transcript.py                # Fetch and clean transcripts per video
│   ├── web.py                       # Scrape web sources
│   ├── telegram.py                  # Parse Telegram Desktop JSON export
│   └── export.py                    # Save .txt files and merged output
├── summarizer/
│   ├── __init__.py
│   ├── ollama_client.py             # Ollama API wrapper (local LLM via HTTP)
│   ├── prompts.py                   # All summarization prompts
│   ├── video_summarizer.py          # Per-video summary generation
│   ├── channel_summarizer.py        # Roll-up channel summary from video summaries
│   └── cue_indexer.py               # Dozer + Webster cue extraction and indexing
├── transcripts/                     # Gitignored — raw transcript files
│   └── <channel_name>/
│       ├── <video_id>_<title>.txt   # Per-video transcript
│       └── merged.txt               # All transcripts merged (for Qdrant ingestion)
├── summaries/                       # LLM-generated outputs
│   ├── <channel_name>/
│   │   ├── <video_id>_summary.md    # Per-video summary (~300–500 words)
│   │   └── channel_summary.md       # Rolled-up channel philosophy (~1000 words)
│   ├── dozer_cue_index.md           # Organized technique cues (Dozer + Webster)
│   └── master_synthesis.md          # Final cross-channel synthesis (bring this to Claude.ai)
├── data/
│   └── telegram_atletisty.json      # Telegram export (manual, gitignored)
├── program/
│   └── week_1-8.json                # Structured program consumed by tracker
└── main.py                          # Entry point
```

---

## Extraction + Summarization Configuration (`config.py`)

```python
# ── YouTube channels ──────────────────────────────────────────────────────────
CHANNELS = [
    "https://www.youtube.com/@pavlukhinweightlifting",   # Pavlukhin — RU, science-based
    "https://www.youtube.com/@athletists",               # Berestov Team — RU, Olympic champion
    "https://www.youtube.com/@catalystathletics",        # Greg Everett — EN, comprehensive
    "https://www.youtube.com/@torokhtiy",                # Torokhtiy — EN, PhD + Olympic champion
    "https://www.youtube.com/channel/UCvHbRb9z_sIRzO7EHnN66SQ",  # Golovinsky @88Dmitry — RU/UA
    "https://www.youtube.com/@DozerWeightlifting",               # Dozer — EN, technique + back
    "https://www.youtube.com/user/sonnywebsterGB",               # Sonny Webster — EN, mobility
]

PLAYLISTS = [
    "https://youtube.com/playlist?list=PLf-VoST4p_FpSx1M4hV2RY4IsupbJhMU1",  # Klokov Рывкачи
]

WEB_SOURCES = [
    "https://berestovteam.ru",
    "https://www.catalystathletics.com/article/",
    "https://blog.torokhtiy.com/",
    "https://power35.ru/biblioteka/last-man-standing-lms-trenirovki-s-dmitriem-golovinskim-denis-pikljaev/",
    "https://dozerweightlifting.com/",
    "https://www.theliftingzone.com/",
    "https://www.sonnywebster.com/",
]

TELEGRAM_EXPORT = "data/telegram_atletisty.json"

# ── YouTube API ───────────────────────────────────────────────────────────────
USE_YOUTUBE_API = False
YOUTUBE_API_KEY = ""  # or os.getenv("YOUTUBE_API_KEY")

# ── Output paths ──────────────────────────────────────────────────────────────
TRANSCRIPT_DIR = "transcripts"
SUMMARY_DIR = "summaries"

# ── Transcript settings ───────────────────────────────────────────────────────
TRANSCRIPT_LANGUAGES = ["ru", "uk", "en"]
REQUEST_DELAY = 1.5
MAX_VIDEOS = None   # None = all; set int to limit for testing
SKIP_MISSING = True

# ── Local LLM (Ollama) settings ───────────────────────────────────────────────
OLLAMA_BASE_URL = "http://localhost:11434"
OLLAMA_MODEL = "qwen2.5:32b"       # Primary — fits on 5070 Ti 16GB at Q4
OLLAMA_FALLBACK_MODEL = "qwen2.5:14b"  # Fallback if 32B is too slow
OLLAMA_TIMEOUT = 120               # Seconds per request

# Summarization runs immediately after each transcript is fetched.
# Set False to extract only (no LLM), then run summarizer separately.
SUMMARIZE_ON_EXTRACT = True

# Max transcript tokens to send per summarization call.
# Transcripts longer than this are chunked, summaries merged.
SUMMARY_CHUNK_TOKENS = 6000

# ── Priority flags ────────────────────────────────────────────────────────────
OLY_PRIORITY_CHANNELS = [
    "UCvHbRb9z_sIRzO7EHnN66SQ",  # Golovinsky — OLY videos need manual review
]

DOZER_CHANNEL_HANDLE = "@DozerWeightlifting"
DOZER_CUE_INDEX_OUTPUT = "summaries/dozer_cue_index.md"
DOZER_CUE_KEYWORDS = ["back", "demon", "snatch receive", "overhead squat", "jerk", "position", "cue"]

WEBSTER_CHANNEL_HANDLE = "sonnywebsterGB"
WEBSTER_MOBILITY_KEYWORDS = ["mobility", "flexibility", "thoracic", "shoulder", "hip", "ankle", "stretch"]
```

---

## Dependencies

```
yt-dlp
youtube-transcript-api
requests
tqdm
beautifulsoup4
ollama          # Python client for Ollama API
tiktoken        # Token counting for chunking
```

```bash
pip install -r requirements.txt
```

Ollama must be running locally with the target model pulled:
```bash
ollama pull qwen2.5:32b
ollama serve   # if not already running as a service
```

---

## CLI Usage

```bash
# Full pipeline: extract + summarize all sources
python main.py

# Extract only — no LLM (useful if Ollama not ready)
python main.py --extract-only

# Summarize only — from existing transcripts
python main.py --summarize-only

# Single channel (extract + summarize)
python main.py --channel "https://www.youtube.com/@catalystathletics"

# Single playlist
python main.py --playlist "https://youtube.com/playlist?list=PLf-VoST4p_FpSx1M4hV2RY4IsupbJhMU1"

# Web sources only
python main.py --web

# Telegram export only
python main.py --telegram

# Testing — limit to N videos per channel
python main.py --max 5

# Force re-download and re-summarize
python main.py --force

# Only Golovinsky OLY content
python main.py --priority-oly

# Generate master synthesis from all channel summaries
python main.py --synthesize

# Generate cue index from Dozer + Webster
python main.py --cue-index
```

---

## Summarization Pipeline

### How it works

After each video transcript is fetched, `video_summarizer.py` sends it to Ollama with a structured prompt. If the transcript exceeds `SUMMARY_CHUNK_TOKENS`, it's split into chunks, each summarized separately, then merged into one coherent video summary.

Once all videos in a channel are summarized, `channel_summarizer.py` feeds all video summaries to Ollama and generates a single `channel_summary.md` — the coaching philosophy, key principles, and athlete-specific applications distilled to ~1000 words.

Finally, `python main.py --synthesize` feeds all 8 `channel_summary.md` files to Ollama and generates `master_synthesis.md` — a cross-channel synthesis that identifies consensus principles, conflicts, and athlete-specific recommendations. **This is the file you bring to Claude.ai for program refinement** — it will be compact enough to fit comfortably in context.

### Prompts (in `summarizer/prompts.py`)

**Per-video prompt:**
```
You are analyzing a weightlifting coaching video transcript.
Athlete context: intermediate strength athlete transitioning to Olympic weightlifting.
102.5 kg, Back Squat 118 kg, Clean 80 kg, Jerk 65 kg, OHS 50 kg (limiter).
Chronic back pain. Push jerk only (no split). Night shift worker.

Extract from this transcript:
1. Programming principles mentioned (sets/reps/intensity/frequency)
2. Technique cues for snatch, clean, or jerk
3. Exercise recommendations
4. Recovery or mobility advice
5. Anything specifically relevant to this athlete's profile

Be concise. If the video is not about weightlifting, say so in one line.
Transcript:
{transcript}
```

**Channel roll-up prompt:**
```
You have {n} video summaries from the coaching channel "{channel_name}".
Synthesize these into a single coaching philosophy document covering:
1. Core training philosophy (3-5 principles)
2. Programming approach (structure, periodization, intensity)
3. Key technique cues and exercise preferences
4. Recovery and mobility approach
5. How this applies to an intermediate lifter:
   102.5 kg, BS 118 kg, Clean 80 kg, Jerk 65 kg, OHS 50 kg,
   chronic back pain, push jerk only, night shift worker
Keep it under 1000 words. Be direct and specific.
Video summaries:
{summaries}
```

**Master synthesis prompt:**
```
You have coaching philosophy summaries from 8 Olympic weightlifting sources:
Pavlukhin, Berestov, Klokov, Torokhtiy, Everett, Golovinsky, Dozer, Webster.

Generate a master synthesis document covering:
1. Consensus principles (agreed upon by 3+ sources)
2. Conflicting recommendations (where coaches disagree) + how to resolve
3. Unique contributions from each source not covered elsewhere
4. A prioritized list of program adjustments for this specific athlete:
   102.5 kg, BS 118 kg, Clean 80 kg, Jerk 65 kg, OHS 50 kg,
   chronic back pain, push jerk only, night shift Wed-Sun 7pm-7:30am
5. Top 10 technique cues most relevant to this athlete right now

This document will be used to refine a 6-week hypertrophy program.
Keep under 2000 words. Be specific and actionable.
Channel summaries:
{summaries}
```

---

## Output Format

**Per-video transcript** (`transcripts/<channel>/<id>_<title>.txt`):
```
Title: <video title>
Channel: <channel name>
Language: <ru|uk|en>
Video ID: <id>
URL: https://www.youtube.com/watch?v=<id>
Date: <upload date>
---
<transcript text — cleaned, no timestamps>
```

**Per-video summary** (`summaries/<channel>/<id>_summary.md`):
```markdown
# <Video Title>
**Channel:** <name> | **Date:** <date> | **Language:** <ru|en>

## Key Points
- ...

## Technique Cues
- ...

## Programming Principles
- ...

## Athlete Relevance
- ...
```

**Channel summary** (`summaries/<channel>/channel_summary.md`): ~1000 words, structured per roll-up prompt above.

**Master synthesis** (`summaries/master_synthesis.md`): ~2000 words. **This is what you bring to Claude.ai.**

`merged.txt` per channel: raw transcripts concatenated — for Qdrant/BRAINDUMP pipeline ingestion.

---

## Downstream Pipeline

| Phase | Where | Task |
|-------|-------|------|
| 1 | Claude Code | Extract transcripts from all 8 sources |
| 2 | Claude Code + Ollama | Summarize each video immediately after extraction |
| 3 | Claude Code + Ollama | Roll up per-channel summaries |
| 4 | Claude Code + Ollama | Generate `master_synthesis.md` |
| 5 | **Claude.ai** | Bring `master_synthesis.md` here — refine program + build Phase 2 |
| 6 | **Claude.ai** | Update OlyTracker app with refined program + cues |
| 7 | Claude Code | Generate `dozer_cue_index.md` from Dozer + Webster |
| 8 | Claude Code | Convert OlyTracker HTML → PWA (see PWA section below) |
| 9 | Optional | Ingest `merged.txt` files into BRAINDUMP/Qdrant |

---

## OlyTracker PWA Conversion

Convert the current `OlyTracker.html` single-file app into a proper Progressive Web App so it installs natively on Android (and iOS) without any app store.

### Why PWA first
- Zero publishing friction — no Play Store, no developer account, no fees
- Works offline after first load
- Installs from Chrome as a native-feeling app with home screen icon
- Data stays in localStorage (already implemented)
- If Play Store publishing is later desired, Expo wraps the PWA with minimal rework

### File structure for PWA

```
olytracker-app/
├── index.html          # Main app (converted from OlyTracker.html)
├── manifest.json       # PWA manifest
├── sw.js              # Service worker for offline support
├── icons/
│   ├── icon-192.png   # App icon 192×192
│   └── icon-512.png   # App icon 512×512
└── offline.html       # Fallback page if offline and not cached
```

### manifest.json

```json
{
  "name": "OlyTracker",
  "short_name": "OlyTracker",
  "description": "Olympic weightlifting program and tracker",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#0a0a0a",
  "theme_color": "#0a0a0a",
  "orientation": "portrait",
  "icons": [
    { "src": "icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "icons/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

### sw.js (service worker)

```javascript
const CACHE = "olytracker-v1";
const ASSETS = ["/", "/index.html", "/manifest.json", "/icons/icon-192.png", "/icons/icon-512.png"];

self.addEventListener("install", e => e.waitUntil(
  caches.open(CACHE).then(c => c.addAll(ASSETS))
));

self.addEventListener("fetch", e => e.respondWith(
  caches.match(e.request).then(r => r || fetch(e.request))
));
```

### index.html additions (in <head>)

```html
<link rel="manifest" href="manifest.json">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<link rel="apple-touch-icon" href="icons/icon-192.png">
<script>
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js');
  }
</script>
```

### Hosting options (to make it installable)
PWA requires HTTPS to install. Easiest options:
- **GitHub Pages** — free, instant, just push to a repo. `https://username.github.io/olytracker`
- **Netlify** — drag and drop the folder, instant HTTPS URL
- **Cloudflare Pages** — same as Netlify, free tier

### Icons
Generate both icon sizes from a single image. Use any weightlifting-themed design — barbell, OLY rings, or the OlyTracker wordmark. Tools: Canva, Figma, or ask Claude to generate SVG icon code.

### Future: Play Store via TWA
If Play Store publishing is desired later, use Bubblewrap CLI to wrap the PWA as a Trusted Web Activity (TWA) — this is the lightest path to a Play Store listing without rewriting anything.

```bash
npm i -g @bubblewrap/cli
bubblewrap init --manifest https://your-domain.com/manifest.json
bubblewrap build
```

### Notes for Claude Code
- Start from the latest `OlyTracker.html` — do not rewrite from scratch
- Extract inline CSS to `styles.css` and inline JS to `app.js` for cleaner structure
- localStorage storage adapter stays as-is — no backend needed
- Test offline mode by disabling network in Chrome DevTools after first load
- Verify install prompt appears on Android Chrome after hosting on HTTPS

---

## Notes for Claude Code

- Check for existing transcript before fetching — respect `--force`
- Check for existing summary before summarizing — respect `--force`
- Language priority: `["ru", "uk", "en"]` — Golovinsky may use Ukrainian
- Playlist extraction: use `yt-dlp` to enumerate IDs, then pull transcripts per video
- Sanitize names for filesystem: strip special chars, lowercase, underscores
- Video title in filename: max 60 chars, sanitized
- Log all activity to `extraction.log`: channel, video count, skips, errors, timestamps
- Never hardcode URLs — always read from `config.py` or CLI args
- Keep all modules independently testable — extractor and summarizer should work standalone
- Telegram export: parse `message.text` fields only, skip media/service messages
- Web scraping: `requests` + `BeautifulSoup` — no JS rendering needed
- `program/week_1-8.json` is consumed by the tracker — never overwrite during extraction
- If Ollama is unavailable or returns an error, log the failure and continue extraction — don't crash the pipeline
- If a transcript exceeds `SUMMARY_CHUNK_TOKENS`, split on sentence boundaries, summarize each chunk, then merge chunk summaries with a second LLM call
- For `--priority-oly` flag: only extract from `OLY_PRIORITY_CHANNELS`, add `[OLY]` tag to output filenames
- For Dozer: generate `dozer_cue_index.md` — scan summaries for `DOZER_CUE_KEYWORDS`, organize by lift phase: snatch_pull, snatch_receive, clean_pull, clean_receive, jerk_drive, jerk_lockout, back_posterior_chain
- For Webster: scan summaries for `WEBSTER_MOBILITY_KEYWORDS`, add to `dozer_cue_index.md` under `[WEBSTER]` tag. Flag cues appearing in both Dozer and Webster as `[HIGH_CONFIDENCE]`
- Token counting: use `tiktoken` with `cl100k_base` encoding for chunk size estimation
- Night shift flag: session logger includes `post_night_shift: bool` field in records
- On completion print a summary: channels processed, videos extracted, videos summarized, videos skipped (no transcript), errors

