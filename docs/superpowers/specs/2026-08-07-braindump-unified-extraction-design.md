# BRAINDUMP as Sole Extraction Pipeline — Design

**Date:** 2026-08-07
**Status:** Approved (brainstorming) — ready for implementation plan
**Repos touched:** `D:\Programming\Brain_Dump` (one change), `D:\Programming\OlyTracker` (the rest)

## Goal

Collapse two independent extraction pipelines into one, and fix OlyTracker's
summarization bias as a structural consequence rather than a prompt tweak.

Today OlyTracker and BRAINDUMP each download and transcribe video independently,
with different backends, different dedup keys, and zero visibility into each
other. The same video pulled into both is transcribed twice. Separately, every
OlyTracker prompt injects the athlete profile, so every stored artifact is
pre-distorted toward one athlete before synthesis ever runs.

After this change: BRAINDUMP extracts once, neutrally. OlyTracker becomes a
consumer that retrieves source text and synthesizes. The athlete profile is
injected exactly once, at the final synthesis call.

## Problem evidence

**Fragmentation.** BRAINDUMP's own Phase 2 spec
(`Brain_Dump/docs/superpowers/specs/2026-07-10-braindump-bot-ingest-design.md`)
already names this, calling bulk import "the OlyTracker pattern" and putting it
out of scope. OlyTracker dedups on a `(channel_name, video_id, title)` filesystem
path check; BRAINDUMP dedups on `sha1(source)` via `FileExistsError`. Neither can
see the other.

**Bias.** `OlyTracker/summarizer/prompts.py` injects `ATHLETE_CONTEXT` into all
six prompts — per-video, chunk-merge, channel roll-up, cue-extract, cue-merge,
and master synthesis — and several explicitly instruct the model to relate
content back to this athlete ("How this applies to the athlete above",
"A prioritized list of program adjustments for this specific athlete").

Observed downstream: `summaries/web_last_manorg/channel_summary.md` prescribes
Landmine Presses, Face Pulls, and Trap Bar Deadlifts — Western-gym exercises
that do not plausibly originate from a Russian powerlifting site, mixed in with
genuinely extracted terms like "retreat microcycle".

## Key constraint discovered during design

BRAINDUMP's vault notes are **summaries, not source text**.
`processing/vault_writer.py::_render_note` writes the summary as the note body,
and `indexer/chunk_and_embed.py` chunks that same body — so Qdrant holds
embeddings of model-generated summaries. `Brain_Dump/config.yaml` sets
`processing.summary_model: qwen3-next:80b-instruct-q4km-ctx8k`.

That is the model the 2026-07-28 bake-off ruled out for this content: on 2 of 3
`@athletists` transcripts that were mostly banter, Claude produced an honest
minimal summary while Qwen fabricated a confident, specific programming document
— including advising an immediate split-jerk transition that contradicted the
athlete's documented profile.

Routing OlyTracker through BRAINDUMP naively would therefore not remove
distortion; it would swap athlete-profile bias for hallucination risk, one layer
earlier and harder to detect, with Sonnet synthesizing from Qwen's inventions
while appearing to read source material.

**Resolution:** persist and index the raw transcript alongside the summary.
The neutral stored artifact becomes the transcript. Summaries remain BRAINDUMP's
product for Obsidian/Telegram; transcripts become OlyTracker's substrate.

## Architecture

```
YouTube/web/file  ──▶  BRAINDUMP processing  (SOLE extractor)
                          │  extract → transcript
                          ├─ Qwen summary   → ./vault note   (Obsidian + Telegram bot)
                          └─ raw transcript → ./transcripts/ (NEW: persisted, not discarded)
                          │
        ┌─────────────────┴──────────────────────┐
        │                                         │
  vault watcher + consumer                 OlyTracker indexer
  → Qdrant `braindump_hybrid`              → Qdrant `oly_transcripts`
  (UNCHANGED, sole writer)                        │
        │                                         │
  Telegram bot                            OlyTracker synthesis
  (query → local Qwen answer)             (retrieve → Sonnet → master_synthesis.md)
  UNCHANGED                                ATHLETE_CONTEXT injected HERE ONLY
```

Extraction unifies — the expensive, genuinely duplicated work (download +
Whisper). Indexing stays per-consumer, because chunk size and similarity
threshold legitimately differ between chat retrieval and synthesis retrieval.

**Rejected alternative:** a single shared collection with a `content_kind`
payload flag. More unified on paper, but transcript chunks would compete with
summary chunks in the Telegram bot's retrieval, requiring changes to the bot's
query path and risking regression in a working system for no gain.

## Components

### A. BRAINDUMP — one change

`processing/cli.py::finish_content` writes `content.text` to
`./transcripts/<slug>.txt` alongside the vault note. The slug is already
deterministic from `title + sha1(source)` (`vault_writer.slugify`), so transcript
persistence inherits dedup identity for free and is idempotent on re-ingest.

No indexer change. No bot change. No new collection in the existing path. No
Obsidian clutter. Blast radius: one file write.

### B. OlyTracker — new

- **`synthesis/index.py`** — chunk and embed persisted transcripts into the
  `oly_transcripts` Qdrant collection, importing Brain_Dump's `indexer.chunker`,
  `indexer.embedder`, and `indexer.vector_store`.
- **`synthesis/retrieve.py`** — thin wrapper over `query.retriever.retrieve_hybrid`
  against `oly_transcripts`, with a synthesis-appropriate budget (~20–40 chunks
  per query rather than chat's `max_chunks: 5`).
- **`synthesis/build.py`** — runs a fixed topic query set, then one Sonnet call
  assembling `master_synthesis.md` from retrieved chunks, with per-claim source
  citations.

Topic query set: snatch progression, jerk mechanics, spinal loading / back
health, periodization and block structure, squat mechanics for long femurs,
mobility protocols, recovery.

### B1. Deployment split (which machine runs what)

BRAINDUMP runs on the Z840 (`WorkingDirectory=/home/ivanb/braindump`, with
`obsidian.vault_path: ./vault`), so the persisted `./transcripts/` directory
lives on the **Z840's filesystem** — not on Windows. The OlyTracker pieces
therefore split by whether they need filesystem access to it:

| Component | Runs on | Why |
|---|---|---|
| `synthesis/index.py` | **Z840** | Needs local read of `./transcripts/`; also sits next to the embedder and Qdrant, so no bulk text crosses the LAN. Deployed like the existing BRAINDUMP services (see the `z840-deploy` skill). |
| `synthesis/retrieve.py` | Windows | Only needs Qdrant HTTP (`10.0.0.9:6333`) and the embedder endpoint for the query vector. No filesystem dependency. |
| `synthesis/build.py` | Windows | Calls retrieval plus the Anthropic API; writes `master_synthesis.md` into the OlyTracker repo. |

This keeps the artifact that must be committed (`master_synthesis.md`) being
produced on the machine that holds the git checkout, while the data-heavy
indexing stays where the data is.

### C. OlyTracker — retired

- `extractor/` (yt-dlp, Whisper, channel, playlist, audio)
- the extraction half of `main.py`
- `summarizer/source_summarizer.py`'s per-video and channel roll-up tiers
- `summaries/` → moved to `summaries_archive/` (retained as the diff control)

### D. De-biasing

`ATHLETE_CONTEXT` is removed from every prompt except the final synthesis call.
Five of the six current injection points cease to exist. This is the structural
fix — nothing stored anywhere is athlete-aware.

## Corpus scoping

No hard metadata filter. Retrieval relies on semantic relevance, backed by
`similarity_threshold: 0.58`, which `Brain_Dump/config.yaml` documents as
empirically calibrated against an off-topic noise ceiling of ~0.565 (tested with
pizza / H-1B / oil queries). Because OlyTracker queries its own
`oly_transcripts` collection, off-domain notes from the wider second brain are
not in scope regardless.

## Migration

**Corpus:** 2,554 transcript files, 30.8M chars → roughly 28k chunks at
`chunk_chars: 1200`.

**Index-only.** Existing transcripts are indexed directly into
`oly_transcripts`; they are *not* pushed through BRAINDUMP's summarizer.
Embedding runs locally on the Z840 (free, an hour or two). Minting vault notes
for all 2,554 would cost — at the bake-off's measured 110–190s per Russian
transcript — well over 40 hours of GPU time, to produce summaries from the model
known to fabricate on this content.

Consequence: the back-catalog is not in the Telegram bot's corpus. This is status
quo (the OLY corpus was never in BRAINDUMP), not a regression. Only *new* sources
flow through the full BRAINDUMP path.

**`last_manorg` is excluded from migration.** 618 files (24% of corpus) come from
a site with a confirmed site-wide WordPress compromise: a PHP `eval()` backdoor
header plus a Turkish gambling spam-link footer on every scraped page. The
current pipeline is safe only because Claude's summarization layer stripped it;
this design indexes **raw transcripts**, bypassing that sanitization entirely and
placing the backdoor and spam directly into the vector store as retrievable
chunks. The source is also marginal on merit — its own summaries repeatedly
concluded it is not about Olympic weightlifting.

Post-exclusion corpus: ~1,936 files.

**Getting the back-catalog to the Z840.** The existing transcripts currently live
on Windows at `D:\Programming\OlyTracker\transcripts\`, while `synthesis/index.py`
runs on the Z840 (see B1). Migration therefore begins with a one-time copy of the
post-exclusion corpus (~24 MB after dropping `last_manorg`) to the Z840, into the
same `./transcripts/` directory BRAINDUMP writes to going forward. Trivial at that
size, and it leaves exactly one transcript location afterward.

## Data flow

**New source:** paste link → BRAINDUMP extracts once → summary to `./vault`
(bot path, unchanged) and transcript to `./transcripts/` → OlyTracker's indexer
picks it up → `oly_transcripts`.

**Synthesis run:** manual command → topic queries → retrieve chunks → single
Sonnet call with `ATHLETE_CONTEXT` → `master_synthesis.md`. The previous output
is archived first so old and new can be diffed.

## Error handling

| Condition | Behavior |
|---|---|
| Z840 unreachable (`BackendUnavailable`) | Fail loudly. Never write a partial synthesis. |
| Topic query returns no chunks | Record the gap explicitly in the output. Do **not** let Sonnet fill from parametric knowledge — that is the failure mode being fixed. |
| Transcript already persisted | Idempotent no-op (deterministic slug). |
| Re-index of an existing note | Delete-then-upsert, matching the existing consumer's pattern. |

## Verification

**Bias fix — three checks:**

1. **Old-vs-new diff.** `summaries_archive/master_synthesis.md` is the control.
   Named regression targets: the Landmine Press / Face Pull / Trap Bar Deadlift
   class of claim in `web_last_manorg/channel_summary.md`. Their absence, and the
   absence of similar untraceable specifics, is the pass condition.
2. **Groundedness spot-check.** Sample ~15 claims from the new synthesis and
   confirm each traces to a retrieved chunk. Sonnet cites the source note per
   claim, making this auditable on every future run rather than once. (Today's
   synthesis cites loosely — "Pavlukhin ×2, Sika, power35, last_man" — with no
   way to check.)
3. **Refusal behavior.** Run a topic query the corpus genuinely does not cover;
   confirm the output records a gap instead of inventing content.

**Unit (fakes, no network),** following Brain_Dump's existing test pattern:

- transcript persistence writes to the deterministic slug path; re-ingest is idempotent
- the retrieval wrapper passes the synthesis budget, not chat's `max_chunks: 5`
- empty retrieval produces a recorded gap, not a silent pass
- `BackendUnavailable` aborts without writing partial output

**Integration (Z840, live backends):**

0. Deploy `synthesis/index.py` to the Z840 and confirm it reads `./transcripts/`
   and reaches Qdrant before any bulk run.
1. Index one source (~50 files) first and verify retrieval quality before
   committing the full batch — sample-first, per `safe-batch-llm-runs`.
2. Index the full ~1,936-file corpus.
3. Regenerate `master_synthesis.md`; run the three bias checks above.
4. Confirm Telegram bot answers are unchanged. Separate collection makes this
   near-certain, but verify rather than assume.
5. Paste a fresh YouTube link; confirm one extraction reaches both consumers.

## Accepted tradeoffs

- **OlyTracker gains a hard Z840 dependency.** It can currently re-run
  summarization offline from local files; afterward, no Z840 means no synthesis.
  Acceptable given the box already gates BRAINDUMP and PRANKCALL.
- **Cross-repo import dependency.** OlyTracker imports Brain_Dump modules — from
  the Windows checkout at `D:\Programming\Brain_Dump` for the query-side pieces,
  and from the Z840 checkout at `/home/ivanb/braindump` for `synthesis/index.py`.
  Chosen over reimplementing hybrid/sparse retrieval (which would drift from
  BRAINDUMP's behavior) and over standing up a new retrieval service (more
  infrastructure than the problem warrants). A breaking change to Brain_Dump's
  `indexer`/`query` interfaces now affects OlyTracker.
- **OlyTracker gains a deployed component.** `synthesis/index.py` must be shipped
  to and run on the Z840, so OlyTracker is no longer a purely local project.
- **Indexing is not unified.** Deliberate — see Architecture.

## Out of scope

- Purging the existing `last_manorg` transcripts and committed summaries from the
  repo (deferred by user; excluded from migration here, which is sufficient for
  this design's safety)
- Migrating the Telegram bot or Phase 1 indexer in any way
- Backfilling vault notes for the OlyTracker back-catalog
- `dozer_cue_index.md` regeneration (its prompts also carry `ATHLETE_CONTEXT`;
  worth revisiting, but not required for master synthesis)
- Any change to OlyTracker's React app

## Definition of done

- BRAINDUMP persists transcripts; existing behavior otherwise unchanged
- ~1,936 transcripts indexed into `oly_transcripts`, `last_manorg` excluded
- `master_synthesis.md` regenerates from retrieval with per-claim citations
- The fabricated-exercise class of claim is gone versus the archived control
- A no-coverage topic query records a gap rather than inventing
- Telegram bot answers verified unchanged
- One fresh link flows into both consumers from a single extraction
- OlyTracker's `extractor/` and per-video/roll-up summary tiers removed
