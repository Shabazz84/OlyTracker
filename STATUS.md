---
name: OlyTracker
category: fitness
status: active
phase: Block 2 spec (8e2c188) AND 8-task implementation plan (3b663b7) both committed — ready to execute; nothing built yet
progress: 97
blocked_on: none
next_step: "EXECUTE `docs/superpowers/plans/2026-08-12-block2.md` (3b663b7, 8 tasks): (1) questions q31-q42, (2) citation manifest, (3) regenerate the pack [NEEDS THE Z840 — exit 3 means it's down, stop, do NOT write the document from memory], (4) the cited Block 2 document, (5) the diff vs the pre-evidence outline rows + mark Block 1's handles unverifiable, (6) extract program data to docs/src/program.js, (7) fix block progress + weekPlan router + school week, (8) ship PROGRAM_B2 at v3.6.0. Tasks 1, 2, 6, 7 need no network. THREE PLAN-TIME CORRECTIONS to the spec, already folded into the plan: (a) build.mjs runs esbuild with bundle:false ('everything is a page global'), so program.js is a SECOND ENTRY POINT loaded by its own script tag, NOT an ES module app.jsx imports — also needs docs/sw.js APP_SHELL + cache-name bump or installed PWAs serve a shell missing program.js; (b) git cannot re-include a file under an excluded directory, so the spec's `!evidence/*/citations.json` negation would have silently committed NOTHING — the manifest goes to `docs/programs/2026-08-12-citations.json` instead, with a `git check-ignore` step that fails loudly if this regresses; (c) added the spec-required step marking the Block 1 documents' handles unverifiable (they cite a pre-manifest pack). Task 4 is deliberately NOT TDD — no test separates a well-founded prescription from a plausible one; its gate is `python -m tools.check_citations` at zero unresolved. Task 8's PROGRAM_B2 is specified as SHAPE ONLY with the numbers left to come from the Task 4 document — inventing them in the plan is the exact failure this project exists to catch. Original spec content follows. Settled in the spec: 12 new decision-shaped questions q31-q42 appended to `synthesis/questions.py` (full_vs_power, start_position_floor, lead_up_exercises, load_distribution, average_training_weight, accumulation_vs_intensification, technique_under_load, missed_attempts, warmup_to_max, accessory_volume_intensification, block_transition, second_pull_timing); whole 42-question pack regenerated to `evidence/2026-08-12/`; a COMMITTED per-passage citation manifest (`citations.json`, handle + note_path + source + score + sha256, gitignore negation `!evidence/*/citations.json`) which closes open item 2 below — sha256 not quotes, so no transcript text enters git; Block 2 = 8 weeks, loading wks 9-14, back-off wk 15, test wk 16; school-term week is Mon/Tue/Thu/Sat [E8.12], resolving a THREE-WAY repo contradiction (CLAUDE.md said Mon/Tue/Wed/Fri, `DAYS_SCHOOL` said Mon/Tue/Wed/Sat, the on-screen note at app.jsx:1018 said Mon/Tue/Wed/Thu, and none satisfied 'never more than two days in a row' [E8.9]); all four Block 1 carryovers ACCEPTED by the athlete (fix OHS dosing, back squat primary ~2:1, drop/reattribute the uncited pain gate, jerk+snatch fixes). NEW BUG FOUND, must be fixed before Block 2 can be added: `app.jsx:2046` computes blockWeek/blockTotal/blockName from a stale `programWeek<=6 ? ... : programWeek<=10 ? ...` model while PROGRAM_B1 has 8 weeks, so RIGHT NOW at program week 7-8 the dashboard reads 'W1/4 · Block · TECHNIQUE' while the athlete is still finishing Block 1. App work also includes extracting program data from the 5,017-line `app.jsx` into `docs/src/program.js`, a `TRAINING_MAX` constant so Block 2 stores percentages (the week-8 test rewrites the TMs), a `weekPlan(week)` router (1-8 B1, 9-16 B2, 17-28 outline), deleting the 8 superseded PROGRAM_OUTLINE rows, scoping the `d5` school filter to Block 1 only, and v3.6.0. CAUTION: every `E*.n` handle in the spec comes from the 2026-08-11 pack and regeneration reorders near-tied passages — re-resolve each against the new pack, `tools.check_citations` is the gate. Prior context, still true: `block1-evidence-rebuild` is MERGED to master (9b11d78) and deleted; master is now ~18 commits ahead of origin and NOT pushed. The live program is deliberately untouched (athlete finishes weeks 7-8 as written). ATHLETE OVERRIDE RECORDED 2026-08-11: squat frequency is CONTESTED, not settled — the corpus holds both 'one front one back' [E22.2] and Everett's 'usually 4-6 days/week, sometimes twice daily, and not necessarily with low volume' [E20.11]; the rebuild picked the low end because of back pain, the athlete squats heavy >=3x/week and tolerates it, and that override stands (Judgment Ledger item 11). The narrow objection that survives is the weekly NEAR-MAX single, not frequency — max ~1x/2 months from a coach basing his work on 4x3 and 5x2 [E16.9], plus the long-limb caveat that load migrates to the back at both extremes [E20.6]. Add squat volume in the 3-5 rep band. Artifacts: `docs/programs/2026-08-11-{evidence-coverage,block1-rebuild,block1-diff}.md`; pack regenerable with `python main.py evidence`. ALL 30 question files now read (2026-08-11 second pass); 103 citations in the rebuild, 60 in the diff, all resolving. HEADLINE: on the 41 dimensions the evidence can settle (48 rows, minus 5 CONTESTED, 1 uncited, 1 superseded) the live block is 34% supported, 61% contradicted-or-missing, 5% unfounded. Reading files 17-30 shifted the numbers almost entirely via ABSENT-FROM-LIVE (5 rows -> 11): it found not that the program is more wrong, but more that the corpus knows and the program never included — the expected shape for a program built off a 7-topic synthesis over ~5% of the corpus. TWO SELF-CORRECTIONS in the second pass: (a) the rebuild had SQUAT EMPHASIS BACKWARDS — back squat is primary at ~2:1 with the front squat as one quality practice session [E18.3, E18.5], most lower-body strength coming from back squats 'especially in the beginning/intermediate years' [E18.4], and the athlete's own ~98% front:back ratio against an 85-90% norm [E18.7] says the back squat is the lift with room; (b) the rebuild omitted a SAFETY SCREEN — limited shoulder/thoracic mobility can make behind-the-neck lifts 'inaccessible or unsafe' [E30.12], and the rebuild had put behind-neck pressing at the centre of the overhead fix. Other second-pass findings: the clean:front-squat gap (clean is 69% of FS) has a named cause — pause squats train away the bounce [E19.6] — so run both, don't substitute; the live heavy clean pulls are ENDORSED not excessive, because the 80-105% band is 'far too light' for a lifter whose snatch is capped by the overhead [E17.9, E17.4]; four consecutive training days violates 'never more than two days in a row' [E8.9] and Mon/Tue/Thu/Sat fits the same shifts [E8.12]; light back extensions between heavy sessions 'often prove recuperative' [E24.1] — the closest thing in the corpus to a back-pain tool and the opposite of the uncited pain-gate's logic. The live program does overhead squats 4 days/week, 11-12 sets, standalone in D1's primary slot; the sources say 1-2x/week, 5-7 sets of 2-3, NEVER standalone [E10.8], because heavy OHS steals recovery from the snatch and jerk [E10.5] and the overhead is rarely a strength problem at all [E11.2, E10.5]. That volume was ADDED in v3.5.2-3.5.6 on master_synthesis.md's advice — an LLM synthesis over ~5% of the corpus contradicted by the sources it was built from. Strongest argument yet for the ask-over-synthesize rule. SECOND: the pain-gate ('back pain >3/10 -> drop load ~40%', on D1/D3 of every loading week) cites nothing — same shape as the archived synthesis's invented 'stop if pain >3/10'; needs a clinician. TALL-LIFTER VALIDATION PASSED — the blind rebuild reproduced the v3.2.0 protocol from the same two independent sources plus Everett, and sharpened it: hold 65-70% 1RM and <=3-5 reps [E20.10], expect to lose 30-40% of the old 1RM while adopting the pattern [E20.7]. RECOMMENDED (none applied): reconsider OHS dosing; remove/reattribute the pain gate; front squat into 65-70% x 3-5 (currently 4x6 @ <=80%); split-jerk empty-bar practice to daily [E14.4]; add jerk-drive work [E15.11] and the snatch-balance target of best snatch +10-15 kg [E10.3]. BLOCK 2 SCOPE: ~2/3 of a block is evidence-driven, ~1/3 is not, and the uncoverable third is almost entirely night-shift scheduling, back pain and individual loading — the corpus's known gaps, now measured rather than asserted. Open items: (1) SECURITY — a live Telegram bot token sits in the Z840's journal (3 tokenized api.telegram.org URLs, Jul 11/13, httpx logging request URLs at INFO); silence that logger BEFORE rotating so the replacement doesn't land there too. (2) Persist the numbered context block next to master_synthesis.md — retrieval reorders near-tied results between runs, so citation numbers are not reproducible and cannot be audited after the fact. (3) Re-run `python main.py index` to pick up transcripts extracted since the migration (idempotent). (4) Deploy Brain_Dump's remaining 20-file drift (equipment feature + spool fixes) as its own deliberate change — the migration deployed only transcript persistence. Deferred: purge the compromised last_manorg corpus from this repo; master_synthesis.md's remaining recommendations (front squat primacy, belt squat volume, OHS load progression)"
updated: 2026-08-12
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
