---
name: OlyTracker
category: fitness
status: active
phase: Tracker app mature at v3.5.8 (React + Supabase); knowledge-pipeline rebuild BUILT and reviewed on branch braindump-unified-extraction (5/5 code tasks, final review clean) — awaiting the one-time Z840 migration that populates it
progress: 90
blocked_on: none
next_step: "Run Task 6 of docs/superpowers/plans/2026-08-08-braindump-unified-extraction.md — the one-time Z840 migration (copy back-catalog excluding last_manorg, deploy the indexer, SMOKE-TEST retrieval on 50 files before the full ~1,936-file run, then regenerate master_synthesis.md and run the 3 bias checks). Then decide how to integrate branches braindump-unified-extraction (OlyTracker) and oly-transcript-persistence (Brain_Dump). Deferred: purge the compromised last_manorg corpus; master_synthesis.md's remaining recommendations (front squat primacy, belt squat volume, OHS load progression)"
updated: 2026-08-09
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

Tasks 1-5 are BUILT and reviewed (branch `braindump-unified-extraction` here, plus
`oly-transcript-persistence` in Brain_Dump). Brain_Dump now persists the raw transcript it
used to discard; OlyTracker gained `synthesis/` (index -> retrieve -> build) and retired
`extractor/`, the per-video and roll-up summarizers, and the cue indexer. `summaries/` is
archived as `summaries_archive/` to serve as the before/after control. The athlete profile
now lives in exactly one file, `synthesis/prompts.py`, guarded by a repo-wide test.

Not yet exercised against real data: `oly_transcripts` is empty and `master_synthesis.md`
is still the old biased version until the Task 6 migration runs. The migration's 50-file
retrieval smoke-test is a required gate, not a formality — the 0.58 similarity threshold was
calibrated on English summary chunks in a mixed-domain vault, and this corpus is verbatim,
largely Russian speech queried with English topic questions, where cosine scores run lower.

<!-- status/progress updated 2026-08-09; correct as needed -->
