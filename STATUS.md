---
name: OlyTracker
category: fitness
status: active
phase: Tracker app mature at v3.5.8 (React + Supabase); knowledge-pipeline rebuild specced and planned — BRAINDUMP becomes the sole extractor, fixing summarization bias structurally; implementation not yet started
progress: 90
blocked_on: none
next_step: "Execute the 6-task implementation plan (docs/superpowers/plans/2026-08-08-braindump-unified-extraction.md) — Task 1 lands in Brain_Dump, Tasks 2-5 in OlyTracker, Task 6 is the one-time Z840 migration and bias verification. Deferred: purge the compromised last_manorg corpus; broader pass through master_synthesis.md's remaining recommendations (front squat primacy, belt squat volume, OHS load progression targets)"
updated: 2026-08-08
tags: [react, esbuild, supabase, weightlifting, training, claude-api, whisper]
stack:
  - component: Local LLM (Ollama) client wrapper for transcript summarization
    lib: Ollama HTTP API (via ollama Python client)
    path: summarizer/ollama_client.py
  - component: Claude API client for per-video/channel summaries and master synthesis
    lib: anthropic Python SDK (Haiku for per-video, Sonnet for master synthesis)
    path: summarizer/llm_client.py
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
confident programming content from low-signal transcripts. A 6-task implementation plan
(2026-08-08) is written and committed; Tasks 1-5 are offline/TDD, Task 6 is the one-time
Z840 migration plus three bias checks against the archived old synthesis as control.

<!-- status/progress updated 2026-08-08; correct as needed -->
