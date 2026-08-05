---
name: OlyTracker
category: fitness
status: active
phase: Mature training tracker app v3.5.7 (React + Supabase); master-synthesis program gaps closed, knowledge base and program now in sync
progress: 90
blocked_on: none
next_step: Continue program/tracker refinements; keep version bumps + rebuilds. Optional follow-up: broader pass through master_synthesis.md's remaining recommendations (front squat primacy, belt squat volume, OHS load progression targets) beyond the two gaps already closed
updated: 2026-08-05
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
from synthesized coaching-source transcripts. Mature React app (225 commits, v3.5.7)
with Supabase sync (pull now authoritative, not merge-only) and a separate VideoReview
tool. Knowledge-base extraction is complete across 21 sources (Whisper-corrected where
YouTube auto-captions were unreliable); the split-jerk hard constraint was removed from
the athlete profile (now "not yet trained" rather than off-limits). The master synthesis
generation had a silent-truncation bug and ran on the wrong (cheap) model — both fixed
2026-08-03, regenerating a substantially richer master_synthesis.md. The two concrete
program gaps it surfaced (no split-jerk work, OHS under-dosed at the #1 limiter) are now
closed in the live program (v3.5.2–3.5.6, see docs/superpowers/plans/2026-08-04-master-synthesis-program-gaps.md),
plus a new DAILY CORE mobility tab and reconciled the pre-existing Demon Back panel's
McGill Big Three dosing with it (v3.5.7).

<!-- status/progress updated 2026-08-05; correct as needed -->
