---
name: OlyTracker
category: fitness
status: active
phase: Tracker app mature at v3.5.8 (React + Supabase); knowledge-pipeline rebuild COMPLETE and PROVEN END-TO-END — oly_transcripts populated (1,933 notes / 21,123 chunks), master_synthesis.md regenerated from cited passages, 3/3 bias checks pass, and one live extraction now feeds both consumers
progress: 97
blocked_on: none
next_step: "ACTIVE: the Block 1 evidence rebuild on branch `block1-evidence-rebuild`. Tasks 1-6 DONE — question catalog (30 program-decision questions), evidence pack builder, `main.py evidence` CLI, citation checker, leak-guard allow-list (83 tests pass), and the real pack built at `evidence/2026-08-11` (30/30 covered, gitignored; coverage report committed). KEY FINDING: coverage is not consensus — `deload_magnitude` filled its whole 12-passage budget from just 2 sources, all Torokhtiy, 10 from one article, so the live block's 'sets -40%' cannot be checked against agreement. Cite source counts, not passage counts. Task 7 IN PROGRESS (10/30 pack files read, notes in the session scratchpad; reading blind — PROGRAM_B1 deliberately not consulted, since anchoring would make the diff measure agreement rather than divergence). **TALL-LIFTER VALIDATION HAS PASSED**: the blind query reproduced the v3.2.0 squat protocol from the same two independent sources (Max Aita E20.6, Sika E20.7/E20.10) plus Everett (E20.9), and added the numbers the original lacked — positions hold at ~65-70% 1RM and <=3-5 reps, and adopting the correct pattern temporarily costs 30-40% of the old 1RM. Three more findings: (a) q1 CONTRADICTS the block's founding premise — coaches argue amateurs should not take a dedicated hypertrophy block, since a 6-8 week one costs ~3 months to detrain and re-acclimatize [E1.1, E1.2]; (b) q6 is 'covered' but does not answer its question, so the '4-6 exercises per session' principle has zero support in the pack; (c) Everett prefers PRESCRIBED weights over daily-max when training history exists [E16.7]. REMAINING: finish the pack read, author the rebuild (every prescription cited or tagged [JUDGMENT — NO COVERAGE], gated by `python -m tools.check_citations`); Task 8, per-prescription diff vs the live block with the uncovered fraction as the headline. The live program stays untouched (athlete is in week 6 of 8). Use `python main.py ask \"<question>\"` as the source of truth for programming decisions — NOT master_synthesis.md, which is one 7-topic LLM view over ~5% of the corpus. Open items: (1) SECURITY — a live Telegram bot token sits in the Z840's journal (3 tokenized api.telegram.org URLs, Jul 11/13, httpx logging request URLs at INFO); silence that logger BEFORE rotating so the replacement doesn't land there too. (2) Persist the numbered context block next to master_synthesis.md — retrieval reorders near-tied results between runs, so citation numbers are not reproducible and cannot be audited after the fact. (3) Re-run `python main.py index` to pick up transcripts extracted since the migration (idempotent). (4) Deploy Brain_Dump's remaining 20-file drift (equipment feature + spool fixes) as its own deliberate change — the migration deployed only transcript persistence. Deferred: purge the compromised last_manorg corpus from this repo; master_synthesis.md's remaining recommendations (front squat primacy, belt squat volume, OHS load progression)"
updated: 2026-08-11
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
