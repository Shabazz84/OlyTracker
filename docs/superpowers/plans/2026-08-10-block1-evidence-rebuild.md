# Block 1 Evidence Rebuild Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a deterministic evidence pack from the indexed coaching corpus, rebuild Block 1 with every prescription either cited to a real retrieved passage or explicitly tagged as uncited judgment, and diff it against the live Block 1.

**Architecture:** A new `main.py evidence` subcommand walks a catalog of program-decision questions (`synthesis/questions.py`) through the existing hybrid retriever and persists every result verbatim to a gitignored `evidence/<date>/` directory with resolvable `E<q>.<p>` citation handles. Two authored Markdown documents then consume that pack: the rebuilt block and the per-prescription diff. A citation checker fails the build if any handle in the rebuild does not resolve to a real passage.

**Tech Stack:** Python 3, pytest, `qdrant-client` + Ollama embeddings via Brain_Dump's `indexer`/`query` modules (imported off `config.BRAINDUMP_PATH`, not reimplemented).

**Spec:** `docs/superpowers/specs/2026-08-10-block1-evidence-rebuild-design.md`

## Global Constraints

- **The live program is never modified.** No task touches `docs/src/app.jsx`, `docs/app.js`, or `docs/index.html`. No version bump is required by this plan.
- **No LLM calls anywhere in the pipeline.** The evidence pack is retrieval-only. `summarizer/llm_client.py` is not imported by any file this plan creates.
- **Questions are phrased about what COACHES SAY, never about this athlete.** Retrieval must stay topic-only so stored evidence carries no athlete bias.
- **`evidence/` is gitignored** — it is verbatim transcript text, and the corpus includes material from a source with a known site-wide compromise. Never `git add` it. Never run `git add -A` in this repo.
- **Backend outages abort non-zero.** A `BackendUnavailable` mid-run must propagate, never be swallowed into a partial pack reported as success.
- **Retrieval is not tuned.** Use the `similarity_threshold` from Brain_Dump's config as-is. The plan consumes retrieval; it does not change it.
- **Citation handle format is `E<qid>.<n>`** — `qid` zero-padded to 2 digits in filenames (`q01-...`), unpadded in handles (`E1.3`, `E12.7`).
- Branch: `block1-evidence-rebuild` (already exists, holds the spec commit).

---

### Task 1: Question catalog + gitignore

**Files:**
- Create: `synthesis/questions.py`
- Modify: `.gitignore`
- Test: `tests/test_synthesis_questions.py`

**Interfaces:**
- Consumes: nothing.
- Produces: `Question` (frozen dataclass, fields `id: int`, `key: str`, `text: str`) and `QUESTIONS: list[Question]` — 30 entries, ids 1..30 contiguous, keys unique. Tasks 2–4 import both from `synthesis.questions`.

- [ ] **Step 1: Write the failing test**

Create `tests/test_synthesis_questions.py`:

```python
"""The question catalog is the highest-leverage input to the rebuild: anything
missing here simply will not exist in the program. These tests guard its
structural invariants — contiguous ids so citation handles are unambiguous,
unique keys so filenames don't collide, and no athlete context so retrieval
stays unbiased."""

from synthesis.questions import QUESTIONS, Question

# Same markers tests/test_no_athlete_context_leak.py scans for, plus the
# numbers a well-meaning future edit is most likely to smuggle into a query.
PROFILE_MARKERS = ["102.5", "OHS 50", "primary snatch limiter", "118 kg", "night shift"]


def test_catalog_has_thirty_questions():
    assert len(QUESTIONS) == 30


def test_ids_are_contiguous_from_one():
    assert [q.id for q in QUESTIONS] == list(range(1, 31))


def test_keys_are_unique():
    keys = [q.key for q in QUESTIONS]
    assert len(set(keys)) == len(keys)


def test_keys_are_filename_safe():
    for q in QUESTIONS:
        assert q.key.replace("_", "").isalnum(), q.key


def test_no_question_mentions_the_athlete():
    """Retrieval must be topic-only. A question carrying this athlete's numbers
    would bias the stored evidence before any program decision is made."""
    for q in QUESTIONS:
        low = q.text.lower()
        for marker in PROFILE_MARKERS:
            assert marker.lower() not in low, f"{q.key} leaks {marker!r}"


def test_questions_ask_what_coaches_say():
    for q in QUESTIONS:
        assert "these coaches" in q.text, q.key


def test_question_is_frozen():
    q = QUESTIONS[0]
    try:
        q.id = 99
    except Exception:
        return
    raise AssertionError("Question must be frozen")
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python -m pytest tests/test_synthesis_questions.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'synthesis.questions'`

- [ ] **Step 3: Write minimal implementation**

Create `synthesis/questions.py`:

```python
"""Retrieval queries organized by PROGRAM DECISION, not by broad topic.

synthesis/prompts.py::TOPICS asks seven broad questions and produced a document
useful as a map but not as a program — it covered roughly 5% of the corpus. A
training block is made of decisions (how deep is a deload, how heavy are pulls
relative to the competition lift, when does the split jerk get introduced), so
the catalog is shaped like those decisions.

Every question asks what COACHES SAY. None mentions this athlete. That is the
same anti-bias rule TOPICS follows, enforced by tests/test_synthesis_questions.py.
"""

from dataclasses import dataclass


@dataclass(frozen=True)
class Question:
    id: int
    key: str
    text: str


QUESTIONS = [
    # ── Block architecture ────────────────────────────────────────────────
    Question(1, "hypertrophy_block_need",
             "What do these coaches say about whether an amateur weightlifter "
             "needs a dedicated hypertrophy block?"),
    Question(2, "block_length",
             "What do these coaches say about how long a training block or "
             "cycle should run before testing?"),
    Question(3, "deload_frequency",
             "What do these coaches say about how often a weightlifter should "
             "deload or take a lighter week?"),
    Question(4, "deload_magnitude",
             "What do these coaches say about how much to reduce volume or "
             "intensity during a deload week?"),
    Question(5, "testing_protocol",
             "What do these coaches say about testing maximum lifts at the end "
             "of a training cycle?"),
    # ── Session structure ─────────────────────────────────────────────────
    Question(6, "exercises_per_session",
             "What do these coaches say about how many exercises to include in "
             "a single training session?"),
    Question(7, "session_opener",
             "What do these coaches say about what a weightlifting session "
             "should begin with?"),
    Question(8, "competition_lift_frequency",
             "What do these coaches say about how often per week to train the "
             "snatch and the clean and jerk?"),
    # ── Snatch ────────────────────────────────────────────────────────────
    Question(9, "hang_vs_floor",
             "What do these coaches say about hang variations versus lifting "
             "from the floor when learning technique?"),
    Question(10, "ohs_programming",
             "What do these coaches say about programming the overhead squat, "
             "including sets, reps and load?"),
    Question(11, "weak_overhead",
             "What do these coaches say about fixing a weak or unstable "
             "overhead position in the snatch?"),
    Question(12, "muscle_snatch",
             "What do these coaches say about the muscle snatch and what it "
             "develops?"),
    # ── Clean & jerk ──────────────────────────────────────────────────────
    Question(13, "power_vs_split_jerk",
             "What do these coaches say about choosing between the power jerk "
             "and the split jerk?"),
    Question(14, "learning_split_jerk",
             "What do these coaches say about teaching the split jerk to a "
             "lifter who has not trained it before?"),
    Question(15, "jerk_behind_clean",
             "What do these coaches say about programming the jerk when it is "
             "much weaker than the clean?"),
    Question(16, "daily_max_vs_prescribed",
             "What do these coaches say about working up to a daily maximum "
             "single versus following prescribed sets and reps?"),
    Question(17, "pull_loading",
             "What do these coaches say about how heavy clean pulls and snatch "
             "pulls should be relative to the competition lift?"),
    # ── Squat ─────────────────────────────────────────────────────────────
    Question(18, "front_vs_back_squat",
             "What do these coaches say about front squats versus back squats "
             "for weightlifters?"),
    Question(19, "pause_squat",
             "What do these coaches say about pause squats and what they "
             "develop?"),
    Question(20, "squat_reps_long_limbs",
             "What do these coaches say about squat rep ranges and technique "
             "for tall or long-limbed lifters?"),
    Question(21, "squat_dosing",
             "What do these coaches say about how heavy and how often a "
             "weightlifter should squat?"),
    # ── Back health ───────────────────────────────────────────────────────
    Question(22, "training_with_back_pain",
             "What do these coaches say about training around lower back "
             "pain?"),
    Question(23, "back_sparing_selection",
             "What do these coaches say about exercise selection that reduces "
             "spinal loading, such as belt squats or single-leg work?"),
    Question(24, "trunk_work",
             "What do these coaches say about core and trunk training for "
             "weightlifters?"),
    # ── Loading & progression ─────────────────────────────────────────────
    Question(25, "hypertrophy_loading",
             "What do these coaches say about what percentages and rep ranges "
             "to use for hypertrophy work?"),
    Question(26, "weekly_progression",
             "What do these coaches say about how quickly to increase load "
             "from week to week?"),
    Question(27, "autoregulation",
             "What do these coaches say about training by feel versus "
             "following fixed percentages?"),
    # ── Accessories & mobility ────────────────────────────────────────────
    Question(28, "upper_body_accessories",
             "What do these coaches say about upper body accessory work for "
             "weightlifters?"),
    Question(29, "ankle_mobility",
             "What do these coaches say about ankle mobility and its effect on "
             "squat depth?"),
    Question(30, "mobility_dosing",
             "What do these coaches say about how often mobility work should "
             "be done?"),
]
```

- [ ] **Step 4: Run test to verify it passes**

Run: `python -m pytest tests/test_synthesis_questions.py -v`
Expected: PASS (7 tests)

- [ ] **Step 5: Add `evidence/` to .gitignore**

Add these two lines to `.gitignore`, directly under the existing `transcripts/` line:

```
# Evidence packs are verbatim transcript text — same rule as transcripts/.
evidence/
```

- [ ] **Step 6: Verify the ignore rule works**

Run: `mkdir -p evidence/probe && touch evidence/probe/x.md && git status --porcelain evidence/ && rm -rf evidence/probe`
Expected: no output from `git status` (the directory is ignored)

- [ ] **Step 7: Run the full suite**

Run: `python -m pytest -q`
Expected: all tests pass, including the pre-existing `test_no_athlete_context_leak.py`

- [ ] **Step 8: Commit**

```bash
git add synthesis/questions.py tests/test_synthesis_questions.py .gitignore
git commit -m "feat: question catalog for the evidence pack

Thirty retrieval queries shaped like program decisions rather than broad
topics. TOPICS' seven themes covered ~5% of the corpus and produced a map,
not a program; a block is built out of decisions, so the catalog is too.

Every question asks what coaches say and none mentions the athlete, so the
stored evidence carries no bias into the program. Tested structurally:
contiguous ids (citation handles must be unambiguous), unique filename-safe
keys, no profile markers.

evidence/ joins transcripts/ in .gitignore — a pack is verbatim transcript
text and the corpus includes a known-compromised source.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 2: Evidence pack builder

**Files:**
- Create: `synthesis/evidence.py`
- Test: `tests/test_synthesis_evidence.py`

**Interfaces:**
- Consumes: `Question`, `QUESTIONS` from `synthesis.questions`; `Passage`, `retrieve_topic` from `synthesis.retrieve`.
- Produces:
  - `QuestionResult` — frozen dataclass, fields `question: Question`, `passages: list[Passage]`, `covered: bool`
  - `gather_evidence(embedder, store, *, limit, threshold, questions=QUESTIONS, vocab=None) -> list[QuestionResult]`
  - `handle(qid: int, n: int) -> str` returning `"E12.3"`
  - `question_filename(q: Question) -> str` returning `"q01-hypertrophy_block_need.md"`
  - `render_question_file(result: QuestionResult, *, limit: float, threshold: float) -> str`
  - `build_manifest(results, *, limit, threshold, collection) -> dict`
  - `render_readme(results) -> str`
  - `write_pack(results, out_dir, *, limit, threshold, collection) -> Path`

  Task 3 calls `gather_evidence` and `write_pack`. Task 4 parses the files `write_pack` writes.

- [ ] **Step 1: Write the failing test**

Create `tests/test_synthesis_evidence.py`:

```python
"""The evidence pack is what makes a citation auditable.

Retrieval reorders near-tied results between runs, so a citation number is
meaningless unless the passage it points at is written down. These tests cover
the properties that make the pack trustworthy: gaps are recorded rather than
dropped, a backend outage aborts instead of producing a partial pack reported
as success, and passage text is stored in full rather than snipped.
"""

import json

import pytest

import config
from synthesis import evidence as sev
from synthesis.questions import Question
from synthesis.retrieve import Passage


def _p(text, source="https://y/1", title="T", note_path="a.md", score=0.66):
    return Passage(text, source, title, note_path, score)


def _q(qid=1, key="deload_frequency"):
    return Question(qid, key, "What do these coaches say about deloading?")


# ------------------------------------------------------------------ handles


def test_handle_is_question_dot_passage():
    assert sev.handle(12, 3) == "E12.3"


def test_filename_zero_pads_the_question_id():
    assert sev.question_filename(_q(1, "deload_frequency")) == "q01-deload_frequency.md"
    assert sev.question_filename(_q(30, "mobility_dosing")) == "q30-mobility_dosing.md"


# ------------------------------------------------------------------ gather


def test_gather_marks_questions_with_no_hits_as_uncovered(monkeypatch):
    def _fake_retrieve(question, embedder, store, *, limit, threshold, vocab=None):
        return []

    monkeypatch.setattr(sev, "retrieve_topic", _fake_retrieve)
    results = sev.gather_evidence(None, None, limit=12, threshold=0.58,
                                  questions=[_q()])

    assert len(results) == 1
    assert results[0].covered is False
    assert results[0].passages == []


def test_gather_never_drops_an_uncovered_question(monkeypatch):
    """A silently dropped question would read downstream as 'not asked' rather
    than 'asked and the corpus had nothing' — the whole point of the pack."""
    def _fake_retrieve(question, embedder, store, *, limit, threshold, vocab=None):
        return [] if "deload" in question else [_p("x")]

    monkeypatch.setattr(sev, "retrieve_topic", _fake_retrieve)
    qs = [_q(1, "deload_frequency"), _q(2, "squat_dosing")]
    qs[1] = Question(2, "squat_dosing", "What do these coaches say about squats?")
    results = sev.gather_evidence(None, None, limit=12, threshold=0.58, questions=qs)

    assert [r.question.key for r in results] == ["deload_frequency", "squat_dosing"]
    assert [r.covered for r in results] == [False, True]


def test_gather_propagates_backend_unavailable(monkeypatch):
    """A partial pack reported as success is worse than a failed run: the
    missing questions look like corpus gaps."""
    import sys
    sys.path.insert(0, config.BRAINDUMP_PATH)
    from indexer.errors import BackendUnavailable

    def _fake_retrieve(question, embedder, store, *, limit, threshold, vocab=None):
        raise BackendUnavailable("qdrant down")

    monkeypatch.setattr(sev, "retrieve_topic", _fake_retrieve)
    with pytest.raises(BackendUnavailable):
        sev.gather_evidence(None, None, limit=12, threshold=0.58, questions=[_q()])


# ------------------------------------------------------------------ render


def test_render_question_file_numbers_passages_as_citation_handles():
    r = sev.QuestionResult(_q(12, "deload_frequency"),
                           [_p("first"), _p("second")], True)
    out = sev.render_question_file(r, limit=12, threshold=0.58)

    assert "E12.1" in out
    assert "E12.2" in out


def test_render_question_file_includes_source_url_and_score():
    r = sev.QuestionResult(_q(), [_p("body", source="https://y/abc", score=0.71)], True)
    out = sev.render_question_file(r, limit=12, threshold=0.58)

    assert "https://y/abc" in out
    assert "0.71" in out


def test_render_question_file_does_not_truncate_passage_text():
    """The CLI's 420-char snippet is for scanning. A citation needs the whole
    passage or the claim can't actually be checked against it."""
    long_body = "word " * 400
    r = sev.QuestionResult(_q(), [_p(long_body)], True)
    out = sev.render_question_file(r, limit=12, threshold=0.58)

    assert out.count("word") >= 400


def test_render_question_file_states_no_coverage_plainly():
    r = sev.QuestionResult(_q(), [], False)
    out = sev.render_question_file(r, limit=12, threshold=0.58)

    assert "NO COVERAGE" in out


# ---------------------------------------------------------------- manifest


def test_manifest_records_counts_and_coverage():
    results = [
        sev.QuestionResult(_q(1, "deload_frequency"),
                           [_p("a", note_path="x.md"), _p("b", note_path="y.md")], True),
        sev.QuestionResult(Question(2, "squat_dosing", "What do these coaches say about squats?"),
                           [], False),
    ]
    m = sev.build_manifest(results, limit=12, threshold=0.58, collection="oly_transcripts")

    assert m["retrieval"]["limit"] == 12
    assert m["retrieval"]["threshold"] == 0.58
    assert m["retrieval"]["collection"] == "oly_transcripts"
    assert m["questions"][0]["n_passages"] == 2
    assert m["questions"][0]["n_sources"] == 2
    assert m["questions"][0]["covered"] is True
    assert m["questions"][1]["covered"] is False
    assert m["questions"][1]["n_passages"] == 0


def test_manifest_stores_question_text_verbatim():
    """Question phrasing steers retrieval. Persisting it is what makes that
    bias auditable after the fact."""
    q = _q()
    m = sev.build_manifest([sev.QuestionResult(q, [_p("a")], True)],
                           limit=12, threshold=0.58, collection="c")

    assert m["questions"][0]["text"] == q.text


# -------------------------------------------------------------- write_pack


def test_write_pack_creates_one_file_per_question_plus_manifest(tmp_path):
    results = [
        sev.QuestionResult(_q(1, "deload_frequency"), [_p("a")], True),
        sev.QuestionResult(Question(2, "squat_dosing", "What do these coaches say about squats?"),
                           [], False),
    ]
    out = sev.write_pack(results, tmp_path, limit=12, threshold=0.58,
                         collection="oly_transcripts")

    assert (out / "q01-deload_frequency.md").exists()
    assert (out / "q02-squat_dosing.md").exists()
    assert (out / "manifest.json").exists()
    assert (out / "README.md").exists()

    m = json.loads((out / "manifest.json").read_text(encoding="utf-8"))
    assert len(m["questions"]) == 2


def test_readme_lists_uncovered_questions(tmp_path):
    results = [
        sev.QuestionResult(_q(1, "deload_frequency"), [], False),
        sev.QuestionResult(Question(2, "squat_dosing", "What do these coaches say about squats?"),
                           [_p("a")], True),
    ]
    out = sev.write_pack(results, tmp_path, limit=12, threshold=0.58, collection="c")
    readme = (out / "README.md").read_text(encoding="utf-8")

    assert "deload_frequency" in readme
    assert "1/2 covered" in readme or "1 of 2" in readme
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python -m pytest tests/test_synthesis_evidence.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'synthesis.evidence'`

- [ ] **Step 3: Write minimal implementation**

Create `synthesis/evidence.py`:

```python
"""Persist retrieved passages for the whole question catalog, verbatim.

Retrieval reorders near-tied results between runs, so a bare citation number is
not reproducible and cannot be audited after the fact (recorded as an open item
in STATUS.md). Writing the passages to disk fixes that: `E12.3` stays resolvable
because question 12's third passage is in a file.

No LLM call happens here, by design — the same property that makes `main.py ask`
trustworthy. Nothing sits between the coach's words and the document.
"""

from __future__ import annotations

import json
import logging
from dataclasses import dataclass
from pathlib import Path

from synthesis.questions import QUESTIONS, Question
from synthesis.retrieve import Passage, retrieve_topic

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class QuestionResult:
    question: Question
    passages: list[Passage]
    covered: bool


def handle(qid: int, n: int) -> str:
    """The citation handle: question id, passage rank. Unpadded — `E1.3` reads
    the same as `E12.3` in prose."""
    return f"E{qid}.{n}"


def question_filename(q: Question) -> str:
    """Zero-padded so the pack directory sorts in catalog order."""
    return f"q{q.id:02d}-{q.key}.md"


def gather_evidence(embedder, store, *, limit: int, threshold: float,
                    questions: list[Question] | None = None,
                    vocab=None) -> list[QuestionResult]:
    """Retrieve for every question. A question with no hits is recorded as
    uncovered, never dropped — 'asked, and the corpus had nothing' is a finding,
    while a missing entry reads as 'never asked'.

    BackendUnavailable is deliberately NOT caught: a partial pack reported as a
    clean run would disguise an outage as a set of corpus gaps.
    """
    results = []
    for q in questions if questions is not None else QUESTIONS:
        passages = retrieve_topic(q.text, embedder, store,
                                  limit=limit, threshold=threshold, vocab=vocab)
        if not passages:
            logger.warning("no coverage for question %r", q.key)
        results.append(QuestionResult(q, passages, bool(passages)))
    return results


def render_question_file(result: QuestionResult, *, limit: int,
                         threshold: float) -> str:
    q = result.question
    head = [
        f"# E{q.id} — {q.key}",
        "",
        f"**Question:** {q.text}",
        f"**Retrieval:** limit {limit}, threshold {threshold}",
    ]

    if not result.covered:
        head += [
            "",
            "## NO COVERAGE",
            "",
            "No passage cleared the similarity threshold. The corpus does not "
            "cover this question. Do not fill the gap from memory — record it "
            "as a gap in the rebuild instead.",
            "",
        ]
        return "\n".join(head)

    n_sources = len({p.note_path for p in result.passages})
    head += [
        f"**Retrieved:** {len(result.passages)} passage(s) from {n_sources} source(s).",
        "",
    ]

    blocks = []
    for i, p in enumerate(result.passages, start=1):
        # Transcript bodies are one unwrapped blob; collapse so the file reads.
        body = " ".join(p.text.split())
        blocks.append("\n".join([
            f"## {handle(q.id, i)} — score {p.score:.2f}",
            "",
            f"**Title:** {p.title or '(untitled)'}",
            f"**Source:** {p.source or '(no source)'}",
            f"**Note:** {p.note_path}",
            "",
            body,
            "",
        ]))
    return "\n".join(head) + "\n".join(blocks)


def build_manifest(results: list[QuestionResult], *, limit: int,
                   threshold: float, collection: str) -> dict:
    return {
        "retrieval": {
            "limit": limit,
            "threshold": threshold,
            "collection": collection,
        },
        "questions": [
            {
                "id": r.question.id,
                "key": r.question.key,
                # Phrasing steers retrieval; persisting it makes that auditable.
                "text": r.question.text,
                "file": question_filename(r.question),
                "n_passages": len(r.passages),
                "n_sources": len({p.note_path for p in r.passages}),
                "covered": r.covered,
            }
            for r in results
        ],
    }


def render_readme(results: list[QuestionResult]) -> str:
    covered = sum(1 for r in results if r.covered)
    lines = [
        "# Evidence Pack",
        "",
        "Verbatim retrieved passages, one file per question. Citation handles "
        "are `E<question>.<passage>` — `E12.3` is the third passage in "
        "question 12's file.",
        "",
        "This directory is gitignored: it is raw transcript text. Regenerate "
        "with `python main.py evidence`.",
        "",
        f"**Coverage: {covered}/{len(results)} covered**",
        "",
        "| # | Key | Passages | Sources | Covered |",
        "|---|-----|----------|---------|---------|",
    ]
    for r in results:
        n_sources = len({p.note_path for p in r.passages})
        mark = "yes" if r.covered else "**NO**"
        lines.append(
            f"| {r.question.id} | {r.question.key} | {len(r.passages)} | "
            f"{n_sources} | {mark} |"
        )

    uncovered = [r.question.key for r in results if not r.covered]
    if uncovered:
        lines += [
            "",
            "## No coverage",
            "",
            "The corpus does not speak to these. They must appear in the "
            "rebuild as `[JUDGMENT — NO COVERAGE]`, never filled from memory.",
            "",
        ]
        lines += [f"- {k}" for k in uncovered]
    return "\n".join(lines) + "\n"


def write_pack(results: list[QuestionResult], out_dir, *, limit: int,
               threshold: float, collection: str) -> Path:
    out = Path(out_dir)
    out.mkdir(parents=True, exist_ok=True)

    for r in results:
        (out / question_filename(r.question)).write_text(
            render_question_file(r, limit=limit, threshold=threshold),
            encoding="utf-8")

    manifest = build_manifest(results, limit=limit, threshold=threshold,
                              collection=collection)
    (out / "manifest.json").write_text(
        json.dumps(manifest, indent=2, ensure_ascii=False), encoding="utf-8")
    (out / "README.md").write_text(render_readme(results), encoding="utf-8")
    return out
```

- [ ] **Step 4: Run test to verify it passes**

Run: `python -m pytest tests/test_synthesis_evidence.py -v`
Expected: PASS (13 tests)

- [ ] **Step 5: Run the full suite**

Run: `python -m pytest -q`
Expected: all pass

- [ ] **Step 6: Commit**

```bash
git add synthesis/evidence.py tests/test_synthesis_evidence.py
git commit -m "feat: evidence pack builder

Persists retrieved passages verbatim, one file per question, with E<q>.<p>
citation handles that stay resolvable because the passage is on disk.
Retrieval reorders near-tied results between runs, so a bare citation number
was never reproducible — STATUS.md has carried that as an open item.

Two failure modes are tested rather than assumed: a question with no hits is
recorded as uncovered (a dropped entry would read as 'never asked' instead of
'asked, corpus empty'), and BackendUnavailable propagates rather than
producing a partial pack reported as success.

Passage text is stored untruncated — the CLI's 420-char snippet is for
scanning, and a claim cannot be checked against an excerpt.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 3: `main.py evidence` subcommand

**Files:**
- Modify: `main.py` (add `cmd_evidence` after `cmd_ask`; register subparser in `main`)
- Modify: `config.py` (add `EVIDENCE_DIR`, `EVIDENCE_MAX_CHUNKS`)
- Test: `tests/test_evidence_cli.py`

**Interfaces:**
- Consumes: `gather_evidence`, `write_pack` from `synthesis.evidence`; `_backends()` from `main`.
- Produces: `cmd_evidence(args) -> int` — exit 0 on success, 3 on `BackendUnavailable`, 4 when zero questions are covered. `config.EVIDENCE_DIR = "evidence"`, `config.EVIDENCE_MAX_CHUNKS = 12`.

- [ ] **Step 1: Write the failing test**

Create `tests/test_evidence_cli.py`:

```python
"""`python main.py evidence` — build the pack, make no LLM call.

Exit codes carry meaning for the operator: 3 means the box is down and the run
should be retried, 4 means the corpus genuinely covered nothing, which is a
finding rather than a transport failure.
"""

import sys

import config

sys.path.insert(0, config.BRAINDUMP_PATH)

import main as cli  # noqa: E402
from synthesis import evidence as sev  # noqa: E402
from synthesis.questions import Question  # noqa: E402
from synthesis.retrieve import Passage  # noqa: E402


class _Args:
    def __init__(self, out=None, limit=12):
        self.out = out
        self.limit = limit


def _p(text="body"):
    return Passage(text, "https://y/1", "T", "a.md", 0.66)


def _stub_backends(monkeypatch):
    monkeypatch.setattr(cli, "_backends",
                        lambda: ({"qdrant": {"similarity_threshold": 0.58}}, None, None))


def test_evidence_writes_a_pack_and_exits_zero(monkeypatch, tmp_path):
    _stub_backends(monkeypatch)
    monkeypatch.setattr(
        sev, "retrieve_topic",
        lambda q, e, s, *, limit, threshold, vocab=None: [_p()])
    monkeypatch.setattr(sev, "QUESTIONS",
                        [Question(1, "deload_frequency", "What do these coaches say about deloading?")])

    rc = cli.cmd_evidence(_Args(out=str(tmp_path)))

    assert rc == 0
    assert (tmp_path / "manifest.json").exists()
    assert (tmp_path / "q01-deload_frequency.md").exists()


def test_evidence_returns_3_when_backend_is_down(monkeypatch, tmp_path):
    from indexer.errors import BackendUnavailable

    _stub_backends(monkeypatch)

    def _boom(q, e, s, *, limit, threshold, vocab=None):
        raise BackendUnavailable("qdrant down")

    monkeypatch.setattr(sev, "retrieve_topic", _boom)
    monkeypatch.setattr(sev, "QUESTIONS",
                        [Question(1, "deload_frequency", "What do these coaches say about deloading?")])

    rc = cli.cmd_evidence(_Args(out=str(tmp_path)))

    assert rc == 3
    assert not (tmp_path / "manifest.json").exists()


def test_evidence_returns_4_when_nothing_is_covered(monkeypatch, tmp_path):
    """Zero coverage across the whole catalog means the collection is empty or
    misconfigured — not that weightlifting has no literature."""
    _stub_backends(monkeypatch)
    monkeypatch.setattr(
        sev, "retrieve_topic",
        lambda q, e, s, *, limit, threshold, vocab=None: [])
    monkeypatch.setattr(sev, "QUESTIONS",
                        [Question(1, "deload_frequency", "What do these coaches say about deloading?")])

    rc = cli.cmd_evidence(_Args(out=str(tmp_path)))

    assert rc == 4


def test_evidence_subcommand_is_registered():
    """argparse exits 2 on an unknown subcommand and 0 after printing --help,
    so the exit code distinguishes 'registered' from 'not registered'."""
    import pytest

    with pytest.raises(SystemExit) as exc:
        cli.main(["evidence", "--help"])
    assert exc.value.code == 0
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python -m pytest tests/test_evidence_cli.py -v`
Expected: FAIL — `AttributeError: module 'main' has no attribute 'cmd_evidence'`

- [ ] **Step 3: Add the config values**

In `config.py`, directly after the `SYNTHESIS_MAX_CHUNKS` definition, add:

```python
# Evidence packs: one directory per run, written under EVIDENCE_DIR/<date>/.
# Gitignored — a pack is verbatim transcript text.
EVIDENCE_DIR = "evidence"
# Per-question retrieval budget. Wide enough to show whether a claim is one
# coach's opinion or a consensus, narrow enough that the file stays readable.
EVIDENCE_MAX_CHUNKS = 12
```

- [ ] **Step 4: Write the command**

In `main.py`, add after `cmd_ask`:

```python
def cmd_evidence(args) -> int:
    """Build the evidence pack: retrieval only, no LLM call.

    This is the input to a cited program rebuild. Every passage it writes is
    verbatim, so a prescription citing E12.3 can be checked against what the
    coach actually said.
    """
    from datetime import date

    cfg, embedder, store = _backends()
    from indexer.errors import BackendUnavailable
    from synthesis import evidence as sev

    threshold = cfg["qdrant"]["similarity_threshold"]
    try:
        results = sev.gather_evidence(embedder, store, limit=args.limit,
                                      threshold=threshold)
    except BackendUnavailable as e:
        print(f"Z840 unreachable; run again when it's up ({e})", file=sys.stderr)
        return 3

    covered = sum(1 for r in results if r.covered)
    if covered == 0:
        print("ERROR: no question retrieved anything. The collection is empty "
              "or misconfigured — this is not a corpus gap.", file=sys.stderr)
        return 4

    out_dir = args.out or str(Path(config.EVIDENCE_DIR) / date.today().isoformat())
    out = sev.write_pack(results, out_dir, limit=args.limit,
                         threshold=threshold,
                         collection=config.SYNTHESIS_COLLECTION)
    print(f"wrote {out} ({covered}/{len(results)} questions covered)")
    return 0
```

Then register the subparser in `main()`, after the `ask` parser block:

```python
    pe = sub.add_parser("evidence",
                        help="Build the evidence pack from the question catalog (no LLM)")
    pe.add_argument("--out", default=None,
                    help="Output directory (default: evidence/<today>)")
    pe.add_argument("--limit", type=int, default=config.EVIDENCE_MAX_CHUNKS,
                    help="Passages retrieved per question")
    pe.set_defaults(func=cmd_evidence)
```

- [ ] **Step 5: Run test to verify it passes**

Run: `python -m pytest tests/test_evidence_cli.py -v`
Expected: PASS (4 tests)

- [ ] **Step 6: Run the full suite**

Run: `python -m pytest -q`
Expected: all pass

- [ ] **Step 7: Commit**

```bash
git add main.py config.py tests/test_evidence_cli.py
git commit -m "feat: main.py evidence — build the pack from the CLI

Retrieval only, no LLM call, mirroring the ask command's reliability
property. Exit codes distinguish the two failure modes an operator has to
tell apart: 3 means the box is down and the run should be retried, 4 means
every question came back empty, which points at an empty or misconfigured
collection rather than at a corpus with no coverage.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 4: Citation checker

**Files:**
- Create: `tools/check_citations.py`
- Test: `tests/test_check_citations.py`

**Interfaces:**
- Consumes: pack files written by `write_pack` (Task 2).
- Produces:
  - `parse_handles(text: str) -> list[str]` — every `E<q>.<p>` handle in document order, deduplicated, e.g. `["E1.3", "E12.7"]`
  - `pack_handles(pack_dir) -> set[str]` — every handle the pack actually defines
  - `unresolved(doc_text: str, pack_dir) -> list[str]` — handles cited but not defined
  - `main(argv=None) -> int` — 0 if all resolve, 1 otherwise

- [ ] **Step 1: Write the failing test**

Create `tests/test_check_citations.py`:

```python
"""A fabricated citation is the one failure that would make the whole rebuild
worthless: it looks exactly like a real one. This checker is the guard."""

from tools.check_citations import pack_handles, parse_handles, unresolved


def _write_pack(tmp_path, qid, key, n_passages):
    lines = [f"# E{qid} — {key}", ""]
    for i in range(1, n_passages + 1):
        lines += [f"## E{qid}.{i} — score 0.66", "", "body", ""]
    (tmp_path / f"q{qid:02d}-{key}.md").write_text("\n".join(lines), encoding="utf-8")


def test_parse_handles_finds_citations_in_prose():
    text = "Pause front squat 4x6 [E19.2], deload sets -40% [E4.1]."
    assert parse_handles(text) == ["E19.2", "E4.1"]


def test_parse_handles_deduplicates():
    text = "[E19.2] and again [E19.2]"
    assert parse_handles(text) == ["E19.2"]


def test_parse_handles_ignores_judgment_tags():
    text = "Jerk daily max [JUDGMENT - NO COVERAGE] and OHS 4x4 [E10.1]"
    assert parse_handles(text) == ["E10.1"]


def test_pack_handles_reads_what_the_pack_defines(tmp_path):
    _write_pack(tmp_path, 4, "deload_magnitude", 2)
    assert pack_handles(tmp_path) == {"E4.1", "E4.2"}


def test_unresolved_flags_a_handle_the_pack_does_not_define(tmp_path):
    _write_pack(tmp_path, 4, "deload_magnitude", 2)
    doc = "Deload -40% [E4.1]. Squat 5x5 [E4.9]."

    assert unresolved(doc, tmp_path) == ["E4.9"]


def test_unresolved_is_empty_when_every_handle_resolves(tmp_path):
    _write_pack(tmp_path, 4, "deload_magnitude", 2)
    doc = "Deload [E4.1] and [E4.2]."

    assert unresolved(doc, tmp_path) == []


def test_unresolved_flags_a_handle_from_a_question_that_does_not_exist(tmp_path):
    _write_pack(tmp_path, 4, "deload_magnitude", 1)
    doc = "Something [E99.1]."

    assert unresolved(doc, tmp_path) == ["E99.1"]
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python -m pytest tests/test_check_citations.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'tools'`

- [ ] **Step 3: Write minimal implementation**

Create `tools/__init__.py` (empty file), then `tools/check_citations.py`:

```python
"""Verify every citation in a rebuilt program resolves to a real passage.

A fabricated citation is indistinguishable from a real one by eye, and it would
make the entire artifact worthless — the document's only claim to authority is
that its numbers came from somewhere checkable. This resolves each handle
against the pack that produced it.

Usage:
    python -m tools.check_citations docs/programs/<rebuild>.md evidence/<date>
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

#: E<question>.<passage> — the handle written by synthesis/evidence.py.
HANDLE_RE = re.compile(r"\bE(\d+)\.(\d+)\b")

#: Section heading in a pack file: "## E12.3 — score 0.66"
PACK_HANDLE_RE = re.compile(r"^##\s+E(\d+)\.(\d+)\b", re.MULTILINE)


def parse_handles(text: str) -> list[str]:
    """Every citation handle in document order, deduplicated."""
    seen, out = set(), []
    for m in HANDLE_RE.finditer(text):
        h = f"E{int(m.group(1))}.{int(m.group(2))}"
        if h not in seen:
            seen.add(h)
            out.append(h)
    return out


def pack_handles(pack_dir) -> set[str]:
    """Every handle the pack actually defines."""
    out = set()
    for path in Path(pack_dir).glob("q*.md"):
        text = path.read_text(encoding="utf-8")
        for m in PACK_HANDLE_RE.finditer(text):
            out.add(f"E{int(m.group(1))}.{int(m.group(2))}")
    return out


def unresolved(doc_text: str, pack_dir) -> list[str]:
    """Handles cited by the document that the pack does not define."""
    defined = pack_handles(pack_dir)
    return [h for h in parse_handles(doc_text) if h not in defined]


def main(argv=None) -> int:
    argv = list(sys.argv[1:] if argv is None else argv)
    if len(argv) != 2:
        print(__doc__, file=sys.stderr)
        return 2

    doc_path, pack_dir = Path(argv[0]), Path(argv[1])
    text = doc_path.read_text(encoding="utf-8")
    cited = parse_handles(text)
    missing = unresolved(text, pack_dir)

    if missing:
        print(f"FAIL: {len(missing)} unresolved citation(s) in {doc_path}:",
              file=sys.stderr)
        for h in missing:
            print(f"  {h}", file=sys.stderr)
        return 1

    print(f"OK: {len(cited)} citation(s) in {doc_path} all resolve "
          f"against {pack_dir}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
```

- [ ] **Step 4: Run test to verify it passes**

Run: `python -m pytest tests/test_check_citations.py -v`
Expected: PASS (7 tests)

- [ ] **Step 5: Run the full suite**

Run: `python -m pytest -q`
Expected: all pass

- [ ] **Step 6: Commit**

```bash
git add tools/__init__.py tools/check_citations.py tests/test_check_citations.py
git commit -m "feat: citation checker for the rebuilt program

Resolves every E<q>.<p> handle in a rebuild against the pack that produced
it. A fabricated citation looks exactly like a real one by eye, and the
document's only claim to authority is that its numbers came from somewhere
checkable — so this is the guard that makes the artifact worth trusting.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 5: Allow-list the rebuild in the leak guard

**Files:**
- Modify: `tests/test_no_athlete_context_leak.py` (the `ALLOWED` set and its comment)

**Interfaces:**
- Consumes: nothing.
- Produces: `docs/programs/2026-08-10-block1-rebuild.md` is permitted to contain athlete-profile markers. No other path under `docs/programs/` is.

- [ ] **Step 1: Write the failing test**

Add to `tests/test_no_athlete_context_leak.py`, at the end of the file:

```python
def test_rebuild_path_is_allowed_but_the_directory_is_not():
    """The rebuild is terminal output, like master_synthesis.md — athlete
    context legitimately applies there. But allow-listing the whole
    docs/programs/ directory would let a future file carry the profile
    undetected, so only the exact path is permitted."""
    assert "docs/programs/2026-08-10-block1-rebuild.md" in ALLOWED
    assert not any(a.rstrip("/").endswith("docs/programs") for a in ALLOWED)
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python -m pytest tests/test_no_athlete_context_leak.py -v`
Expected: FAIL — `AssertionError` on the first assert

- [ ] **Step 3: Add the allow-list entry**

In `tests/test_no_athlete_context_leak.py`, extend the `ALLOWED` set and its docstring comment:

```python
#: - docs/programs/2026-08-10-block1-rebuild.md: the evidence rebuild's terminal
#:   output. Its Fixed Inputs section necessarily restates training maxes and
#:   limiters, exactly as master_synthesis.md's "Application to This Athlete"
#:   does. Allow-listed by EXACT PATH, not as a docs/programs/ directory
#:   exclusion — a directory rule would let any future file there carry the
#:   profile undetected, which is the failure this guard exists to catch.
ALLOWED = {
    "synthesis/prompts.py",
    "CLAUDE.md",
    "summaries/master_synthesis.md",
    "docs/programs/2026-08-10-block1-rebuild.md",
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `python -m pytest tests/test_no_athlete_context_leak.py -v`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add tests/test_no_athlete_context_leak.py
git commit -m "test: allow the evidence rebuild to carry athlete context

The rebuild is terminal output, like master_synthesis.md: its Fixed Inputs
section has to restate training maxes and limiters to be a usable program.
Allow-listed by exact path rather than by excluding docs/programs/, because
a directory rule would let a future file there carry the profile undetected.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 6: Build the real evidence pack

This task runs the pipeline against the live corpus. It produces no committed code — its deliverable is the local pack plus a committed coverage report.

**Files:**
- Create (gitignored): `evidence/2026-08-10/`
- Create: `docs/programs/2026-08-10-evidence-coverage.md`

**Interfaces:**
- Consumes: `main.py evidence` (Task 3).
- Produces: a pack directory whose `manifest.json` Task 7 and Task 8 cite against.

- [ ] **Step 1: Check the Z840 GPU lease before touching the box**

REQUIRED SUB-SKILL: use the `z840-gpu-lease` skill to confirm the box is free before running the batch. Thirty embed calls on a 0.6b model is light, but the box is shared with BRAINDUMP, PRANKCALL, Magazine Extraction and Comfy_Offload.

- [ ] **Step 2: Confirm the corpus is reachable and populated**

Run: `python main.py ask "how often should a weightlifter deload" --limit 3`
Expected: exit 0, three passages with scores above 0.58 and source URLs.

If this exits 3, the box is down — stop and retry later. If it exits 4, the collection is empty or misconfigured — stop and investigate before building a pack.

- [ ] **Step 3: Build the pack**

Run: `python main.py evidence`
Expected: `wrote evidence\2026-08-10 (N/30 questions covered)` and exit 0.

- [ ] **Step 4: Confirm the pack is gitignored**

Run: `git status --porcelain`
Expected: `evidence/` does not appear. If it does, stop — `.gitignore` from Task 1 is wrong and raw transcript text is about to be committed.

- [ ] **Step 5: Read the coverage table**

Run: `cat evidence/2026-08-10/README.md`

Record which questions came back uncovered. Expect the three gaps already confirmed in `master_synthesis.md` and `STATUS.md` — night-shift scheduling, ~102 kg strength-athlete transition, chronic back pain return-to-load — to show up in whatever questions touch them (22 `training_with_back_pain` most likely).

- [ ] **Step 6: Write the coverage report**

Create `docs/programs/2026-08-10-evidence-coverage.md` containing:
- the covered/total count,
- the full per-question table copied from the pack README,
- the list of uncovered question keys,
- one paragraph naming which uncovered questions correspond to the three already-known corpus gaps, and which (if any) are new.

This file is committed; the pack it describes is not. It is how the coverage result survives without the raw text.

- [ ] **Step 7: Commit the report**

```bash
git add docs/programs/2026-08-10-evidence-coverage.md
git commit -m "docs: evidence pack coverage report

Records what the corpus can and cannot speak to, per program decision. The
pack itself stays local (raw transcript text); this is the committed record
of its shape, including which uncovered questions match the three gaps
already confirmed in master_synthesis.md and which are new.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 7: Author the rebuilt Block 1

Authoring task, not TDD. The deliverable is a document; the gate is the citation checker.

**Files:**
- Create: `docs/programs/2026-08-10-block1-rebuild.md`

**Interfaces:**
- Consumes: the pack from Task 6; `tools/check_citations.py` from Task 4.
- Produces: a rebuild whose every prescription carries `[E<q>.<p>]` or `[JUDGMENT — NO COVERAGE]`.

- [ ] **Step 1: Read the pack before writing anything**

Read every `evidence/2026-08-10/q*.md`. Do NOT read `docs/src/app.jsx` or any description of the current `PROGRAM_B1` while drafting — the rebuild is blind by design, and reading the live block first would anchor it. The diff in Task 8 is where the two meet.

- [ ] **Step 2: Write the Fixed Inputs section**

Open the document with the constraints that are given rather than derived, taken from `CLAUDE.md`'s Athlete Profile and Weekly Schedule tables: the 5-day summer split with per-day sleep quality and the Wednesday hard stop, current training maxes and tested lifts, chronic back pain, and the goal.

State plainly that these are fixed because the corpus has confirmed zero coverage of night-shift scheduling and of return-to-load protocols for existing back pain — deriving them would mean inventing them.

- [ ] **Step 3: Write the block structure**

Weeks, phases, and their loading intent. Every structural claim (block length before testing, whether a dedicated hypertrophy block is warranted, deload placement and depth, testing protocol) carries a handle from questions 1–5 or a `[JUDGMENT — NO COVERAGE]` tag.

- [ ] **Step 4: Write the five session days**

Mirror the live block's shape — week → phase → days d1..d5 → primary / secondary / notes — so Task 8 can diff line-for-line rather than prose-against-prose.

Apply the no-interpolation rule strictly: if the corpus gives a rep range but no percentage, cite the rep range and tag the percentage. Bridging that gap silently is what made the archived synthesis untrustworthy.

- [ ] **Step 5: Write the judgment ledger**

A section listing every `[JUDGMENT — NO COVERAGE]` decision in one place, with a one-line rationale each. The count of these is a primary output of the whole project — it bounds how much of Block 2 can be evidence-driven — so it must be readable at a glance rather than scattered through the program.

- [ ] **Step 6: Run the citation checker**

Run: `python -m tools.check_citations docs/programs/2026-08-10-block1-rebuild.md evidence/2026-08-10`
Expected: `OK: N citation(s) ... all resolve`

If it reports unresolved handles, fix them by finding the real passage or by downgrading the claim to `[JUDGMENT — NO COVERAGE]`. Never fix a citation by changing the number until it resolves.

- [ ] **Step 7: Run the leak guard**

Run: `python -m pytest tests/test_no_athlete_context_leak.py -q`
Expected: PASS — Task 5's allow-list entry covers this exact path.

- [ ] **Step 8: Commit**

```bash
git add docs/programs/2026-08-10-block1-rebuild.md
git commit -m "docs: Block 1 rebuilt from cited corpus evidence

Every prescription carries either a citation handle resolving to a real
retrieved passage or an explicit [JUDGMENT - NO COVERAGE] tag. There is no
third category, so nothing hides in the middle — which is precisely what the
archived synthesis got wrong when it asserted 'deload every 4th week' in the
same voice as claims that were verbatim-accurate.

Built blind: the live PROGRAM_B1 was not consulted while drafting, so the
diff measures divergence rather than agreement-by-anchoring.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 8: Author the diff and the validation verdict

**Files:**
- Create: `docs/programs/2026-08-10-block1-diff.md`
- Modify: `STATUS.md` (next_step reflects the finding)

**Interfaces:**
- Consumes: `PROGRAM_B1` (`docs/src/app.jsx:300`), the rebuild from Task 7, the pack from Task 6.
- Produces: the finding that determines Block 2's scope.

- [ ] **Step 1: Extract the live block's prescriptions**

Read `docs/src/app.jsx:300-415`. List every distinct prescription dimension: primary lifts and their set×rep×load per day, secondary work, the Wednesday 80% front-squat cap, the pain-gate rule, the muscle-snatch opener, jerk protocol per phase, deload magnitude, and the testing protocol.

- [ ] **Step 2: Build the comparison table**

One row per dimension:

```markdown
| Dimension | Live Block 1 | Evidence rebuild | Verdict | Cite |
|---|---|---|---|---|
| Deload magnitude | Sets −40%, wk 7 | ... | OLD-UNSUPPORTED | E4.2 |
```

Verdicts, used exactly as defined:
- **AGREES** — the live prescription is supported by a retrieved passage.
- **DIVERGES** — the corpus says something materially different.
- **OLD-UNSUPPORTED** — no corpus support; not contradicted, just unfounded.
- **NEW-UNCITED** — the rebuild needed a judgment call here too; neither version is evidence-based.

- [ ] **Step 3: Write the three roll-ups**

Percentage of the live block supported, percentage contradicted, percentage uncovered. State the uncovered figure prominently — it is the number that bounds how much of Block 2 can be evidence-driven.

- [ ] **Step 4: Write the tall-lifter validation verdict**

State explicitly whether the blind rebuild independently reproduced the tall-lifter squat protocol (pause front squat, back-sparing quad accessories, living in the rep range where technique holds), which was derived from this same corpus in v3.2.0 from Sika and Telander.

- Reproduced → the method reproduces a known-good result; say so with the handles that carried it.
- Not reproduced → this is a **retrieval finding, not a program finding**. Record it as such, run `python main.py ask` directly on the tall-lifter question to determine whether the material is absent from the corpus or merely missed by question 20's phrasing, and state which. Do not quietly add the protocol back in.

- [ ] **Step 5: Run the citation checker on the diff**

Run: `python -m tools.check_citations docs/programs/2026-08-10-block1-diff.md evidence/2026-08-10`
Expected: `OK: N citation(s) ... all resolve`

- [ ] **Step 6: Run the full suite**

Run: `python -m pytest -q`
Expected: all pass

- [ ] **Step 7: Update STATUS.md**

Replace the `ACTIVE: the Block 1 evidence rebuild ...` clause in `next_step` with the actual finding: covered/uncovered percentages, whether the tall-lifter check passed, and that Block 2 is the next spec.

- [ ] **Step 8: Commit**

```bash
git add docs/programs/2026-08-10-block1-diff.md STATUS.md
git commit -m "docs: Block 1 diff — hand-authored vs cited evidence

Per-prescription comparison of the live block against the blind rebuild,
with the uncovered fraction as the headline number: it bounds how much of
Block 2 can be evidence-driven rather than judged.

Includes the tall-lifter reproduction verdict. That protocol was derived
from this same corpus once before, so whether a blind rebuild finds it again
is a test of the method rather than of the program — and a miss is a
retrieval finding, not a licence to add it back by hand.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Self-Review

**Spec coverage:**

| Spec section | Task |
|---|---|
| Question catalog, 8 groups, athlete-free | 1 |
| `evidence/` gitignored | 1 (step 5), verified 6 (step 4) |
| `synthesis/evidence.py`, `limit=12`, untruncated text | 2, 3 |
| Manifest, README, gap index, `E<q>.<p>` handles | 2 |
| `BackendUnavailable` aborts non-zero | 2 (gather), 3 (exit 3) |
| NO-COVERAGE recorded not dropped | 2 |
| `main.py evidence` subcommand | 3 |
| `check_citations.py` | 4 |
| Leak-guard ALLOWED by exact path | 5 |
| Z840 lease checked before the batch | 6 (step 1) |
| Rebuilt block, cite-or-tag, no interpolation | 7 |
| Diff table, four verdicts, three roll-ups | 8 |
| Tall-lifter reproduction check | 8 (step 4) |
| Live program untouched | Global Constraints; no task modifies app.jsx |

**Deviation from spec, deliberate:** the spec says "~29 questions"; the catalog is exactly 30. The approximation is resolved in favour of the concrete list.

**Addition beyond spec, deliberate:** Task 6 step 6 adds a committed coverage report (`2026-08-10-evidence-coverage.md`). The spec gitignores the pack, which would otherwise leave the coverage result — a primary finding — recorded nowhere in the repo.

**Type consistency:** `Question(id, key, text)` is used identically in Tasks 1–4. `QuestionResult(question, passages, covered)` matches `TopicResult`'s existing shape in `synthesis/build.py`. `retrieve_topic(question, embedder, store, *, limit, threshold, vocab=None)` matches the real signature in `synthesis/retrieve.py`. `handle()` and `PACK_HANDLE_RE` agree on the `## E12.3 — score 0.66` heading format written by `render_question_file`.

**Placeholder scan:** no TBD/TODO; every code step carries real code; Tasks 7–8 are authoring tasks whose steps specify what each section must contain and which command gates it.
