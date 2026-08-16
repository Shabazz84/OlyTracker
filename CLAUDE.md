# CLAUDE.md — OlyTracker

## Development Rules

- **App source of truth is `docs/src/app.jsx`** (NOT the HTML). The app is React + JSX. `index.html` is now a thin shell that loads pre-transpiled `docs/app.js`. **Never edit `docs/app.js` by hand** — it is generated. Edit `docs/src/app.jsx`, then run `npm run build` (esbuild → `docs/app.js`). Use `npm run watch` during development. The in-browser Babel transpiler was removed (was ~2.8 MB + per-load transpile cost).
- **Version bump on every commit that touches the app** (`docs/src/app.jsx`, `docs/app.js`, or `docs/index.html`) — update `PROGRAM v<X.Y.Z> · <date>` in the header (the string lives in `app.jsx`) before committing, and rebuild so `app.js` carries it. No exceptions, including minor fixes. Format: `major.minor.patch`. Current version: `v3.6.3 · 2026-08-16`.
- **Version bump on every commit that touches `VideoReview.html`** — update `v<X.Y.Z> · <date>` in the header before committing. Same format. Current version: `v1.0.0 · 2026-05-28`.
- **Cloud sync is Supabase only.** The GitHub Gist sync path was removed — `sbSync` (defined inline in `index.html`) auto-syncs sessions/sets/reviews on every mutation and pulls on startup. Don't reintroduce a second sync backend.
- **`docs/key.js` holds secrets** (gitignored, not deployed to Pages). The `__CLAUDE_KEY` there only works locally; a browser cannot hold a Claude key securely — for production AI review, proxy through a serverless function. The Supabase publishable key is safe to expose.
- **BRAINDUMP is the sole extractor.** OlyTracker no longer downloads or
  transcribes anything — see `docs/superpowers/specs/2026-08-07-braindump-unified-extraction-design.md`.
  The athlete profile lives in exactly one place, `synthesis/prompts.py`;
  `tests/test_no_athlete_context_leak.py` fails if it reappears elsewhere.

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
| Best Jerk       | ~65 kg (push/power jerk; split jerk not yet trained)  |
| Clean Pull      | 120 kg × 3                                            |
| Snatch High Pull | 92 kg × 4                                            |
| Back Squat      | 118 kg × 1 (May 2026)                                 |
| Front Squat     | 102 kg × 3 × 4 sets (Jun 2026) — est. 1RM ~116 kg     |
| Overhead Squat  | 50 kg × 4 — primary snatch limiter                    |
| Overhead Press  | 62 kg × 2                                             |
| Experience      | Intermediate strength athlete mid-transition to OLY   |
| Training history | 17 months logged (Dec 2024 – May 2026, FitNotes)     |
| Goal            | General fitness + Olympic weightlifting               |
| Training days   | 5 days/week (summer) → 4 days/week (school term Aug+) |
| Work schedule   | Night shifts Wed–Sun, 7pm→7:30am                      |
| Limitations     | Chronic back pain (manageable, not acute)             |
| Weak points     | Jerk (far behind clean), OHS stability, split jerk (untrained) |
| Strong points   | Clean pull strength, posterior chain, squat           |
| Influences      | Klokov, Berestov already visible in training log      |

### Estimated Training Maxes

| Lift          | Training Max |
|---------------|-------------|
| Snatch        | 63 kg       |
| Clean & Jerk  | 72 kg       |
| Front Squat   | 116 kg      |
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
| Thu (school) | Post-shift nap | ~3.5hrs | ⭐⭐ Workable at reduced load | Block 2 puts the jerk priority here and cuts the loading to pay for the short sleep |
| Thu (summer) | Post-shift sleep | ~5.5hrs | ⭐⭐ Workable | 8:30am→2pm sleep, jerk priority |
| Fri (school) | Post-shift nap | ~3.5hrs | ⚠️ Compromised | Skip during school term |
| Fri (summer) | Post-shift sleep | ~5.5hrs | ⭐⭐ Workable | Active hypertrophy + technique |
| Sat | Cumulative fatigue | 5.5hrs | ⭐⭐ Workable | Training day in both blocks — squat + technique volume in Block 2 |
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
4 days/week — **Mon/Tue/Thu/Sat**. This is the mapping Block 2 actually ships
(`docs/programs/2026-08-12-block2.md`, Day-by-Day Template): Mon/Tue follow full
nights, Thu and Sat follow post-shift sleep. The Mon/Tue/Thu/Sat *frame* is
cited [E8.12] and never trains three days in a row [E8.9]; **which session lands
on which calendar day is a judgment call driven by the night shifts, not a
corpus prescription** (Judgment Ledger item 1).

| Day | Session | Quality | Hard rules |
|-----|---------|---------|------------|
| Mon | Day 1 — Snatch from the floor + snatch pull + back squat | ⭐⭐⭐ | Snatch first in the session [E7.12] |
| Tue | Day 2 — Clean & jerk from the floor + clean pull + front squat | ⭐⭐⭐ | Clean + front squat; squat any accidental power receive |
| Thu | Day 3 — Jerk priority (split jerk from rack) + positional snatch | ⭐⭐ | Reduced loading after post-shift sleep; the week's only percentaged jerk |
| Sat | Day 4 — Squat + technique volume | ⭐⭐ | Back squat #2 of the week; posterior chain last |

Thursday's load reduction is a night-shift accommodation with **zero corpus
coverage** (Judgment Ledger item 2) — it is not a cited prescription.

---


### Current: Block 1 — Hypertrophy Foundation (6 Weeks)
Athlete decision: build the muscular and structural base before loading the competition lifts.
Per Pavlukhin: hypertrophy first, then extract performance from that base.

- Phase 1 (Weeks 1–3): 65–75% TM, technique + tissue
- Phase 2 (Weeks 4–6): 72–82% TM, progressive load
- **Summer (now→Aug): 5 days/week** — Mon/Tue/Wed/Thu/Sat
- **School term (Aug+): 4 days/week** — Mon/Tue/Thu/Sat

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
- Lunge squats for jerk tendon development — direct prep for the split jerk transition
- Program is a guide, not a contract — adjust to daily state

**Application:** Phase 1/2 block structure mirrors his model. Night shift load reductions. Extra jerk volume addresses primary weak point.

**Also extracted:** a Telegram group chat (`transcripts/telegram/pavlukhin.txt`, 2,510 messages, `summaries/telegram_pavlukhin/`) — training logs and discussion from multiple students in Pavlukhin's group, distinct from his YouTube channel. Keep the `telegram_` prefix on the summary folder — it's easy to mistake for `pavlukhinweightlifting/` otherwise.

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

**⚠️ Data quality (2026-07-27):** the `@athletists` YouTube channel (61 videos) was extracted via YouTube auto-captions, not Whisper — Claude's summary pass refused to synthesize a channel philosophy from it, flagging most of the source as corrupted/incoherent transcription (same root cause fixed for the Klokov playlist in `docs/superpowers/...`/config.py's `AUDIO_DOWNLOAD_DELAY` work). An earlier local-LLM pass over the same bad data produced a fluent but unverified "Stable Foundation Protocol" — kept at `summaries/athletists/channel_summary.UNRELIABLE_qwen_hallucination.md`, do not use. The principles above come from `berestovteam.ru` (web scrape, now `summaries/web_berestovteamru/`) and the Telegram export (`summaries/telegram_atletisty/`), not the YouTube channel. Re-extract `@athletists` with `--whisper` before trusting anything from it.

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

### 9. Max Aita / Sika Strength — @sikastrength
**Background:** American weightlifting/strength coach, founder of Sika Strength. (No verified competitive credentials on file — unlike the Olympic-medalist coaches above, this entry is scoped from channel content only.)

**Key principles:**
- Position over loading — perfect reps at 70% beat flawed reps at 90%; load masks positional deficiencies
- 6–16 week blocks; technical mastery takes years, not sessions
- Full ROM under load is the primary mobility strategy, not isolated static stretching
- Pain (>6/10) is a stop signal, not something to train through
- Fault-driven accessory selection: identify the fault → break down root cause (bar path/position/weakness/balance) → build a *pool* of corrective variations → prioritize by cross-category overlap → progress corrective→specific across a mesocycle
- "1+1≠2" — don't map one fault to one magic exercise; rotate through a pool of similar variations for varied exposure (skill-acquisition variability)

**Application:** Minimum-exercise-list principle validates the current program's menu (power variations, OHS, front squat, push press). The fault-driven method is the self-coaching engine pairing with Klokov's video-review principle and the in-app AI Video Review tool. Also the primary source (with Telander, #10) behind the tall-lifter squat protocol shipped in v3.2.0 — see Principles #17–18.

---

### 10. Zack Telander — single video (feat. Max Aita)
**Background:** Strength coach; one video pulled specifically for tall-lifter squat mechanics (`strength_development_for_long_legs_w_max_aita`), not a full channel extraction — no entry in `config.py` CHANNELS.

**Key principles:**
- Long-limbed lifters have poor squat leverage — load migrates to the (relatively stronger) back at both very-high-rep and very-heavy-single extremes; live in the rep range where technique stays perfect
- Pause front squat (front rack forces upright torso, pause reinforces knee-over-toe, quad loading)
- Belt squat / single-leg squat as back-sparing quad builders, specifically because they force light loads that isolate the legs

**Application:** Independent second source alongside Sika Strength prescribing the identical fix for the same limiter — high-confidence consensus behind the shipped tall-lifter squat protocol (v3.2.0, DAILY ANKLE tab). See Principles #17–18.

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
| 13 | Split jerk untrained but no longer off-limits — build lunge strength to support the transition | Pavlukhin |
| 14 | Night shift = reduced session — technique only at 60–65% | Pavlukhin (total stress) |
| 15 | OHS stability is the snatch ceiling — prioritize it | Program data (50 kg OHS) |
| 16 | Mobility is the root of performance — sports-specific protocols daily | Webster |
| 17 | Long-limbed lifters: squat depth is gated by ankle dorsiflexion, not hip mobility — load it heavy and hold it long, daily, for months (Sika needed ~6) | Sika (Max Aita), Telander, Torokhtiy, Klokov |
| 18 | Long-limbed squatters: load migrates to the back at both very-high-rep and very-heavy-single extremes — live in the rep range where technique stays perfect; build quads with back-sparing accessories (belt squat, single-leg squat) | Sika (Max Aita), Telander |

---

## Project Structure

```
olytracker/
├── CLAUDE.md                        # This file
├── README.md
├── requirements.txt
├── config.py                        # All channels, API keys, LLM settings, output paths
├── synthesis/
│   ├── index.py                 # transcripts -> oly_transcripts (runs on Z840)
│   ├── retrieve.py              # topic query -> citable passages
│   ├── prompts.py               # TOPICS + the ONLY ATHLETE_CONTEXT in the repo
│   └── build.py                 # passages -> master_synthesis.md (Sonnet)
├── summarizer/
│   ├── __init__.py
│   └── llm_client.py            # Claude API wrapper
├── summaries_archive/           # pre-2026-08 output, kept as the bias-fix control
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

## Configuration (`config.py`)

BRAINDUMP is the sole extractor now, so `config.py` no longer drives any
fetching — the settings that matter are the ones the current pipeline (`index`
and `synthesize`, see CLI Usage below) actually reads:

- `BRAINDUMP_PATH` / `BRAINDUMP_CONFIG` — where Brain_Dump lives and its
  `config.yaml`, which supplies Qdrant/Ollama connection info and
  `processing.transcript_dir`. `BRAINDUMP_CONFIG` must resolve to a real file
  regardless of cwd — see `tests/test_config.py`.
- `SYNTHESIS_COLLECTION` — OlyTracker's own Qdrant collection
  (`oly_transcripts`), kept separate from `braindump_hybrid` so transcript
  chunks never compete with summary chunks in the Telegram bot's retrieval
  budget.
- `SYNTHESIS_MAX_CHUNKS` / `MASTER_SYNTHESIS_PATH` — retrieval budget and
  output path for `python main.py synthesize`.
- `USE_CLAUDE_API`, `CLAUDE_API_KEY`, `CLAUDE_MODEL`, `CLAUDE_SYNTHESIS_MODEL`
  — the LLM backend `summarizer/llm_client.py` calls. `CLAUDE_SYNTHESIS_MODEL`
  (Sonnet) is used for the single synthesis call specifically because it's the
  highest-leverage output of the whole pipeline.

`config.py` still carries `CHANNELS`, `PLAYLISTS`, `WEB_SOURCES`, and the
Whisper/yt-dlp settings from the old extraction era — they're unused by any
current code (nothing in `main.py` or `synthesis/` references them) and are
kept only as provenance for which sources fed the corpus. Don't extend them;
BRAINDUMP owns extraction config now.

---

## Dependencies

```
requests
tqdm
anthropic       # Claude API — the synthesis LLM backend
qdrant-client
PyYAML
pytest
```

```bash
pip install -r requirements.txt
```

`index` and `synthesize` also import Brain_Dump's own modules directly
(`indexer.*`, off `BRAINDUMP_PATH` on `sys.path`) rather than duplicating
them, so retrieval behavior can't drift from the pipeline that produced the
data — see `main.py::_backends`. That means a working Brain_Dump checkout
with its own dependencies installed (Ollama + Qdrant reachable per its
`config.yaml`) is required to run `index` or `synthesize`, not just this repo's
`requirements.txt`.

---

## CLI Usage

```bash
# Index BRAINDUMP's persisted transcripts (run ON the Z840)
python main.py index

# Build master_synthesis.md from retrieval (run anywhere with LAN access)
python main.py synthesize

# Ask the corpus a question — prints SOURCE PASSAGES, makes no LLM call
python main.py ask "how should I program the jerk when it's behind my clean?"
python main.py ask "overhead squat depth" --limit 15 --full
```

**`ask` is the reliable path for program-building, not `synthesize`.**
`master_synthesis.md` is one narrow view of the corpus (7 generic topics ×
`SYNTHESIS_MAX_CHUNKS`, ~155 passages ≈ 5% of the indexed notes), written by an
LLM. `ask` puts a specific question to all 21k chunks and prints what the
coaches actually said, verbatim, with source URLs — no model sits between the
transcript and the reader, so no number can be invented. Use it to check any
claim in `master_synthesis.md`, and to gather cited evidence per programming
decision. It exits 4 and says so explicitly when nothing clears the threshold;
that means the corpus does not cover the question — do not fill the gap from
memory.

The archived `summaries_archive/master_synthesis.md` is the cautionary example:
it prescribed "deload every 4th week" and "drop 40% if back pain >3/10" in the
same confident voice as claims that were verbatim-accurate, with no citations
to tell them apart. `python main.py ask "how often should a weightlifter
deload"` shows the real source saying frequency "can vary from person to
person."

---

## Synthesis Pipeline

### How it works

BRAINDUMP extracts and persists every transcript as an individual Markdown
note (YAML frontmatter + body) on the Z840. Nothing in OlyTracker touches raw
video/web content anymore — the pipeline here is two steps:

1. **`python main.py index`** (run on the Z840) — `synthesis/index.py::index_dir`
   walks BRAINDUMP's transcript directory, parses and chunks each note
   (reusing Brain_Dump's own `indexer.chunker`/`indexer.note_parser` so
   chunking can't drift from the pipeline that produced the data), embeds the
   chunks, and upserts them into OlyTracker's own Qdrant collection
   (`config.SYNTHESIS_COLLECTION`, kept separate from `braindump_hybrid`).
   Notes from excluded sources (`EXCLUDED_SOURCES`, `EXCLUDED_SOURCE_DOMAINS`
   in `synthesis/index.py` — currently just `last-man.org`, a compromised
   site) are skipped, and their vectors are actively purged if they were
   indexed before the exclusion was added. A note with no `source` in its
   frontmatter is skipped and logged rather than indexed with no attribution.
2. **`python main.py synthesize`** (run anywhere with LAN access to the Z840)
   — `synthesis/build.py::gather` retrieves the top passages for each topic in
   `synthesis/prompts.py::TOPICS` (one retrieval call per topic, no athlete
   context in the query — retrieval is topic-only so it can't be biased
   toward one athlete's numbers), then `build_synthesis` makes a **single**
   Claude Sonnet call with all retrieved passages plus `ATHLETE_CONTEXT`
   injected once, and writes the result to `config.MASTER_SYNTHESIS_PATH`
   (`summaries/master_synthesis.md`).

This is the fix for the old pipeline's structural bug: the athlete profile
used to be injected into six separate summarization prompts (per-video,
per-channel, and master-synthesis), which pre-distorted every stored
artifact — a video mentioning nothing about this athlete would still get
summarized "for" them. Now the profile enters exactly once, at the final
synthesis call, over passages that were retrieved and stored without it.
`tests/test_no_athlete_context_leak.py` enforces this structurally by scanning
the repo for the profile's distinctive markers outside the one file allowed
to carry them (`synthesis/prompts.py`) plus `CLAUDE.md`'s own reference table.

### Prompts (`synthesis/prompts.py`)

- `TOPICS` — one `Topic(key, question)` per synthesis theme (snatch, jerk,
  back_health, periodization, squat, mobility, recovery). Questions are
  phrased as "what do these coaches say about X", never about what this
  athlete specifically should do.
- `ATHLETE_CONTEXT` — the one and only place the athlete profile is
  serialized for an LLM call.
- `SYNTHESIS_PROMPT` — the single prompt `build_synthesis` sends, requiring
  every claim to cite a passage number and forbidding knowledge from outside
  the retrieved passages. See `synthesis/prompts.py` for the exact text.

---

## Output Format

**Master synthesis** (`summaries/master_synthesis.md`): the only generated
artifact in the current pipeline. Structured per `SYNTHESIS_PROMPT` —
consensus principles, conflicts, per-source contributions, application to
this athlete, all cited to numbered passages that trace back to specific
indexed transcripts. **This is what you bring to Claude.ai** for program
refinement.

There are no more per-video or per-channel summary files — BRAINDUMP owns the
raw transcripts (as Markdown notes with frontmatter, not the old
`transcripts/<channel>/<id>_<title>.txt` layout), and OlyTracker never
materializes an intermediate summary per video or per channel; retrieval goes
straight from indexed transcript chunks to the one synthesis call above.
`summaries_archive/` holds the pre-2026-08 per-video/per-channel output from
the old pipeline, kept deliberately as the bias-fix control — don't delete it,
and don't generate anything new in that format.

---

## Downstream Pipeline

| Phase | Where | Task |
|-------|-------|------|
| 1 | BRAINDUMP (Z840) | Extract, transcribe, and persist coaching transcripts as Markdown notes — see `Brain_Dump/CLAUDE.md`, not this repo |
| 2 | `python main.py index` (Z840) | Index BRAINDUMP's persisted notes into `config.SYNTHESIS_COLLECTION` |
| 3 | `python main.py synthesize` (anywhere on the LAN) | Retrieve per topic, run the single athlete-context synthesis call, write `master_synthesis.md` |
| 4 | **Claude.ai** | Bring `master_synthesis.md` here — refine the program |
| 5 | **Claude.ai** | Update the OlyTracker app (`docs/src/app.jsx`) with refined program + cues |

The old Phase-1–8 pipeline (extract with yt-dlp → per-video summary → per-channel
summary → `dozer_cue_index.md` → PWA conversion) is gone; BRAINDUMP is the sole
extractor and OlyTracker only indexes and synthesizes. The PWA conversion
(old Phase 8) is long since done — see Development Rules at the top of this
file for the current app build process.

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

- **BRAINDUMP is the sole extractor.** Don't reintroduce transcript fetching
  (yt-dlp, YouTube captions, web scraping, Telegram export parsing) in this
  repo — that logic lives in `Brain_Dump/`, extracts into Markdown notes with
  frontmatter, and is out of scope here.
- Never hardcode URLs or paths — read from `config.py` or CLI args.
  `BRAINDUMP_CONFIG`/`BRAINDUMP_PATH` in particular must resolve to real
  files/dirs regardless of the caller's cwd (see Finding C1's fix and
  `tests/test_config.py`) — this repo's docs explicitly instruct running
  `python main.py index`/`synthesize` from OlyTracker's own root, not
  Brain_Dump's.
- A backend outage (Ollama/Qdrant unreachable) mid-`index` run must abort and
  exit non-zero — never let a per-file `except Exception` in
  `synthesis/index.py::index_dir` swallow `BackendUnavailable` and report a
  partial run as a clean success.
- Adding a domain to `EXCLUDED_SOURCE_DOMAINS` (`synthesis/index.py`) must
  purge that source's already-indexed vectors on the next `index` run, not
  just prevent new ones — exclusion needs to remediate, not just prevent.
- A transcript note with no `source` in its frontmatter (including one whose
  frontmatter failed to parse) is skipped and logged, never indexed —  no
  source means no attribution and no way to run the exclusion check.
- Citation numbering in `synthesis/build.py::_render_context` must stay one
  continuous sequence across every covered topic — an uncovered topic
  contributes no block and consumes no number. See
  `tests/test_synthesis_build.py`.
- The athlete profile (`synthesis/prompts.py::ATHLETE_CONTEXT`) must never
  appear anywhere else in the repo except this file's own Athlete Profile
  table — `tests/test_no_athlete_context_leak.py` scans the whole repo (code
  and docs) for its distinctive markers and fails if it reappears.
- `transcripts/` is gitignored in both repos — never commit raw transcript
  text. Brain_Dump's corpus in particular includes content pulled from a
  source with a known site-wide compromise (see `EXCLUDED_SOURCES` above);
  never run `git add -A` in either repo.

