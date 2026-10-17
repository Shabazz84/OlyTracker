---
name: OlyTracker
category: fitness
status: active
phase: "Block 2 LIVE, athlete in week 13 (v3.15.0, 2026-10-01). Back squat re-prescribed for weeks 13-15 to match how the athlete actually trains: Monday climbing singles to the heaviest clean single for today (Pavlukhin), Saturday medium 70-80% (Berestov), replacing the tall-lifter 3-5-rep cap; TM 130 -> 137 after logged singles of 133 and 137; week-16 back-squat test dropped (maxed inside the 2-month window). Earlier: weeks 10-16 on per-exercise cards (v3.12.0), mid-workout sets survive app switches (v3.13.1)."
progress: 97
blocked_on: none
next_step: "Weeks 13-16 of Block 2, then the week-16 test (snatch, C&J, front squat, snatch balance -- floor snatch and floor clean maxes still owed). Then design Block 3 (weeks 17+ are still an outline). Logging gap: sets store weight only, no reps, and the athlete logs the ramp rather than the top single -- consider a reps field. Open items from 2026-08-12, status unknown: Telegram token in the Z840 journal (silence httpx URL logging before rotating), persist the numbered synthesis context, re-run main.py index, Brain_Dump 20-file drift."
updated: 2026-10-01
tags: [react, esbuild, supabase, weightlifting, training, claude-api, whisper]
stack:
  - component: Claude API client (sole surviving summarizer module)
    lib: anthropic Python SDK (Sonnet for master synthesis)
    path: summarizer/llm_client.py
  - component: Transcript indexer — chunk + embed into a project-owned Qdrant collection, importing Brain_Dump's chunker/embedder/store rather than reimplementing them
    lib: qdrant-client, Ollama embeddings (qwen3-embedding:0.6b)
    path: synthesis/index.py
  - component: RAG retrieval wrapper at a synthesis-sized budget, returning citable passages
    lib: Brain_Dump query.retriever (hybrid dense+BM25)
    path: synthesis/retrieve.py
  - component: Topic-driven document synthesis with per-claim citations; refuses to synthesize from zero passages
    lib: anthropic Python SDK (Sonnet)
    path: synthesis/build.py
  - component: "`main.py ask <question>` — prints source passages verbatim with URLs, makes NO LLM call; the reliable path for program-building"
    lib: synthesis/retrieve.py::format_for_cli
    path: main.py::cmd_ask
---

Personalized Olympic weightlifting training program + interactive tracker, built
from synthesized coaching-source transcripts. Mature React app (226 commits, v3.5.8)
with Supabase sync (pull now authoritative, not merge-only) and a separate VideoReview
tool. Knowledge-base extraction is complete across 21 sources (Whisper-corrected where
YouTube auto-captions were unreliable); the split-jerk hard constraint was removed from
the athlete profile (now "not yet trained" rather than off-limits). The master synthesis
generation had a silent-truncation bug and ran on the wrong (cheap) model — both fixed
2026-08-03, regenerating a substantially richer master_synthesis.md. The two concrete
program gaps it surfaced (no split-jerk work, OHS under-dosed at the #1 limiter) are now
closed in the live program (v3.5.2–3.5.6, see docs/superpowers/plans/2026-08-04-master-synthesis-program-gaps.md),
plus a new DAILY CORE mobility tab and reconciled the pre-existing Demon Back panel's
McGill Big Three dosing with it (v3.5.7). Fixed the Week Plan's "current week" detector
(v3.5.8): it did a strict linear scan from week 1 with no lookahead, so one never-logged
Day 4 session back in week 2 permanently froze the badge there even though weeks 3-5 were
actively being trained. Now derives current week from the highest week with any logged
session instead.

Next major workstream is the knowledge pipeline, not the app. A design spec
(2026-08-07) makes BRAINDUMP the sole extractor: it already downloads and transcribes
the same kinds of sources, so OlyTracker's parallel yt-dlp/Whisper pipeline is
redundant. BRAINDUMP will persist the raw transcript (currently discarded after
summarizing); OlyTracker indexes those into its own Qdrant collection and rebuilds
master_synthesis.md via RAG. This also fixes a real bias problem — ATHLETE_CONTEXT is
currently injected into all six summarization prompts, so every stored artifact is
pre-distorted toward one athlete; afterward it enters only at the final synthesis call.
Indexing transcripts rather than BRAINDUMP's vault notes is deliberate: those notes are
Qwen-generated summaries, and the 2026-07-28 bake-off showed that model fabricates
confident programming content from low-signal transcripts.

Tasks 1-5 are built, reviewed, and MERGED to master in both repos (pushed here;
Brain_Dump has no remote). Brain_Dump now persists the raw transcript it used to discard;
OlyTracker gained `synthesis/` (index -> retrieve -> build) and retired `extractor/`, the
per-video and roll-up summarizers, and the cue indexer. `summaries/` is archived as
`summaries_archive/` to serve as the before/after control. The athlete profile now lives in
exactly one file, `synthesis/prompts.py`, guarded by a repo-wide test.

Cross-repo coupling is deliberate and documented: OlyTracker sys.path-imports Brain_Dump's
`indexer/`, `query/`, and `vault_writer` rather than crossing a service boundary, so a
refactor there can break this repo while Brain_Dump's own tests stay green. The imported
symbols and the `config.yaml` keys this depends on are listed under "External Consumers"
in `D:\Programming\Brain_Dump\CLAUDE.md`.

The Task 6 migration ran 2026-08-10 (log: `docs/superpowers/plans/2026-08-08-migration-log.md`).
`oly_transcripts` holds 1,933 notes / 21,123 chunks (3 skipped: silent Shorts with empty
bodies), and `master_synthesis.md` is regenerated from retrieved passages — **138 citations
where the archived version had 0**. All three bias checks pass; 15/15 spot-checked claims
verified against real source text.

The retrieval gate earned its keep by failing first. On a 57-file sample 2 of 7 topics
returned zero passages, which looked like the predicted 0.58-threshold miscalibration; on
the full corpus all 7 are covered and 0.58 sits correctly between the off-domain floor
(0.36–0.47) and the in-domain mass (0.58–0.72). The sample result was a sample-size
artifact, so **the threshold was left alone** and Brain_Dump's shared value stays untouched.
Two findings worth carrying forward: the 0.570 noise ceiling comes not from hollow chunks
(`scan-junk` reports 0 junk of 21,123) but from real livestream banter in the corpus — one
92-chunk note is two coaches discussing VPNs and national parks — so precision here is
gated by content, not tuning; and citation numbers are **not reproducible across runs**
because retrieval reorders near-tied results, so the numbered context needs persisting
alongside the output before any citation can be audited later.

BRAINDUMP is now the sole extractor in practice, not just on paper. The minimal
transcript-persistence deploy went to the Z840 (2 files + one config key,
`braindump-ingest` restarted, `braindump_hybrid` untouched at 6,050), and a live
YouTube extraction produced the same slug in both `braindump/transcripts/` (35 KB
verbatim, 3,264 words) and `vault/BRAINDUMP/youtube/` (4.4 KB summary, 556 words)
from a single download.

The knowledge base is queried with `python main.py ask "<question>"`, which
prints retrieved passages verbatim with source URLs and makes **no LLM call** —
with nothing summarizing between transcript and reader, no number can be
invented. That, not `master_synthesis.md`, is the reliable input for programming
decisions: the synthesis is one LLM-written view of 7 generic topics over ~155
passages (97 of 1,933 notes, ~5% of the corpus), useful as a map but to be
verified with `ask`. Both beat the archived synthesis, which asserted "deload
every 4th week" and "stop if pain >3/10" with zero citations — claims that
retrieval shows are unsupported, next to others that are verbatim-accurate, with
nothing in the document to tell the two apart.

Known corpus gaps, confirmed by retrieval and stated in the synthesis itself:
night-shift scheduling, programming for a ~102 kg athlete transitioning from
strength sports, and return-to-load protocols for existing chronic back pain.
Those need a coach or clinician; the pipeline correctly refuses to invent them.

That first extraction also justified the architecture out loud. The video is
«Почему штангисты не качают грудь и бицепс» with Olympic champion Berestov —
**штангисты means weightlifters** — and the Qwen vault note titled it "Why
**Powerlifters** Don't Train Chest and Biceps." The summarizer changed the sport;
the raw transcript did not. Indexing vault notes would have fed that into the
synthesis as powerlifting advice from a weightlifting champion. Equipment-feature
drift on the box (20 files) is still undeployed, deliberately, as its own change.

<!-- status/progress updated 2026-08-09; correct as needed -->
