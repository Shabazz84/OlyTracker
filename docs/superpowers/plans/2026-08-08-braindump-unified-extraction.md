# BRAINDUMP Unified Extraction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make BRAINDUMP the sole extraction pipeline and rebuild `master_synthesis.md` from retrieved source transcripts, so the athlete profile is injected once at synthesis instead of into all six summarization prompts.

**Architecture:** BRAINDUMP gains one change — it persists the raw transcript it currently discards after summarizing. OlyTracker stops extracting entirely and instead chunks/embeds those transcripts into its own Qdrant collection (`oly_transcripts`), retrieves per-topic, and has Sonnet synthesize with citations. Separate collection means the Telegram bot's retrieval is untouched.

**Tech Stack:** Python 3, pytest, Qdrant (`qdrant_client`), Ollama embeddings (`qwen3-embedding:0.6b`), Anthropic SDK (Sonnet for synthesis), PyYAML.

**Spec:** `docs/superpowers/specs/2026-08-07-braindump-unified-extraction-design.md`

## Global Constraints

- Two repos. Tasks 1 lives in `D:\Programming\Brain_Dump`; Tasks 2–5 live in `D:\Programming\OlyTracker`. Commit in the repo the task names.
- The Phase 1 vault watcher/consumer and the Telegram bot must not change. `braindump_hybrid` is not touched.
- Transcripts are written **outside** `obsidian.vault_path` so the watcher never indexes them.
- OlyTracker's synthesis collection is `oly_transcripts`. Never write to `braindump_hybrid`.
- Values copied verbatim from `Brain_Dump/config.yaml`: `qdrant.host: http://10.0.0.9:6333`, `qdrant.vector_size: 1024`, `qdrant.distance: "Cosine"`, `qdrant.similarity_threshold: 0.58`, `ollama.host: http://10.0.0.9:11434`, `ollama.embedding_model: qwen3-embedding:0.6b`, `chunking.chunk_chars: 1200`, `chunking.overlap_chars: 200`.
- `ATHLETE_CONTEXT` may appear in exactly one prompt: the final synthesis prompt in `synthesis/prompts.py`.
- `last_manorg` is excluded from all indexing (compromised source; raw transcripts carry a PHP backdoor and spam).
- Never let a topic query with zero hits fall through to model knowledge — record a gap.
- Python: no new third-party dependencies beyond `qdrant-client` and `anthropic`, both already used.

---

### Task 1: BRAINDUMP persists the raw transcript

**Repo:** `D:\Programming\Brain_Dump`

**Files:**
- Modify: `processing/vault_writer.py` (add `write_transcript` after `write_note`)
- Modify: `processing/cli.py:107-133` (`finish_content`)
- Modify: `config.yaml` (add `processing.transcript_dir`)
- Test: `tests/processing/test_vault_writer.py`, `tests/processing/test_cli.py`

**Interfaces:**
- Consumes: `ExtractedContent(text, source, title, source_type, metadata)` from `processing/extractor_base.py`; `slugify(title, source, max_len=60)` and `_now_iso()` already in `vault_writer.py`.
- Produces: `vault_writer.write_transcript(content: ExtractedContent, transcript_dir: str, *, now: str | None = None, dry_run: bool = False) -> Path`. Writes `<transcript_dir>/<slug>.md` — YAML frontmatter (`source`, `source_type`, `title`, `extracted_at`) then the raw text. Task 2 parses these with `indexer.note_parser.parse_note`.

- [ ] **Step 1: Write the failing tests**

Append to `tests/processing/test_vault_writer.py`:

```python
def test_write_transcript_renders_frontmatter_and_raw_body(tmp_path):
    content = ExtractedContent(
        text="  the coach says keep the bar close  ",
        source="https://youtube.com/watch?v=abc123",
        title="Snatch Pull Basics",
        source_type="youtube",
        metadata={},
    )
    path = vault_writer.write_transcript(
        content, str(tmp_path), now="2026-08-08T00:00:00Z")
    raw = path.read_text(encoding="utf-8")
    assert raw.startswith("---\n")
    assert "source: https://youtube.com/watch?v=abc123" in raw
    assert "source_type: youtube" in raw
    assert raw.rstrip().endswith("the coach says keep the bar close")


def test_write_transcript_slug_matches_note_slug(tmp_path):
    content = ExtractedContent(
        text="body", source="https://example.com/v", title="Some Title",
        source_type="youtube", metadata={})
    path = vault_writer.write_transcript(
        content, str(tmp_path), now="2026-08-08T00:00:00Z")
    assert path.stem == vault_writer.slugify(content.title, content.source)


def test_write_transcript_is_idempotent(tmp_path):
    content = ExtractedContent(
        text="body one", source="https://example.com/v", title="T",
        source_type="youtube", metadata={})
    first = vault_writer.write_transcript(
        content, str(tmp_path), now="2026-08-08T00:00:00Z")
    second = vault_writer.write_transcript(
        content, str(tmp_path), now="2026-08-08T00:00:00Z")
    assert first == second
    assert len(list(tmp_path.glob("*.md"))) == 1


def test_write_transcript_dry_run_writes_nothing(tmp_path):
    content = ExtractedContent(
        text="body", source="https://example.com/v", title="T",
        source_type="youtube", metadata={})
    path = vault_writer.write_transcript(
        content, str(tmp_path), now="2026-08-08T00:00:00Z", dry_run=True)
    assert not path.exists()
```

Append to `tests/processing/test_cli.py`:

```python
class _FakeSummarizer:
    def summarize(self, content):
        return "a summary"


def test_finish_content_persists_transcript(tmp_path):
    from processing import cli
    from processing.extractor_base import ExtractedContent

    cfg = {
        "obsidian": {"vault_path": str(tmp_path / "vault"),
                     "index_folder": "BRAINDUMP"},
        "processing": {"summary_model": "m",
                       "transcript_dir": str(tmp_path / "transcripts")},
    }
    content = ExtractedContent(
        text="raw words here", source="https://e.com/1", title="Title",
        source_type="youtube", metadata={})

    cli.finish_content(content, cfg, _FakeSummarizer())

    files = list((tmp_path / "transcripts").glob("*.md"))
    assert len(files) == 1
    assert "raw words here" in files[0].read_text(encoding="utf-8")


def test_finish_content_skips_transcript_when_unconfigured(tmp_path):
    from processing import cli
    from processing.extractor_base import ExtractedContent

    cfg = {
        "obsidian": {"vault_path": str(tmp_path / "vault"),
                     "index_folder": "BRAINDUMP"},
        "processing": {"summary_model": "m"},
    }
    content = ExtractedContent(
        text="raw", source="https://e.com/2", title="T",
        source_type="youtube", metadata={})

    cli.finish_content(content, cfg, _FakeSummarizer())

    assert not (tmp_path / "transcripts").exists()
```

If `tests/processing/test_vault_writer.py` does not already import them, add at the top of the file:

```python
from processing import vault_writer
from processing.extractor_base import ExtractedContent
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `python -m pytest tests/processing/test_vault_writer.py tests/processing/test_cli.py -v`
Expected: FAIL with `AttributeError: module 'processing.vault_writer' has no attribute 'write_transcript'`

- [ ] **Step 3: Implement `write_transcript`**

Append to `processing/vault_writer.py`:

```python
def write_transcript(
    content: ExtractedContent,
    transcript_dir: str,
    *,
    now: str | None = None,
    dry_run: bool = False,
) -> Path:
    """Persist the raw extracted text next to — but deliberately OUTSIDE — the vault.

    The vault note body is the model's SUMMARY. Consumers that need fidelity to
    what a source actually said (OlyTracker's synthesis) read this instead.
    Written with the same deterministic slug as the note, so it inherits the
    note's dedup identity for free.

    Not under `vault_path`: the Phase 1 watcher indexes everything in the vault,
    and transcript chunks must never compete with summary chunks in the bot's
    retrieval budget.
    """
    extracted_at = now or _now_iso()
    slug = slugify(content.title or "note", content.source)
    target = Path(transcript_dir) / f"{slug}.md"

    fm = {
        "source": content.source,
        "source_type": content.source_type,
        "title": content.title,
        "extracted_at": extracted_at,
    }
    fm_yaml = yaml.safe_dump(fm, sort_keys=False, allow_unicode=True).rstrip()
    rendered = f"---\n{fm_yaml}\n---\n\n{content.text.strip()}\n"

    if dry_run:
        return target

    target.parent.mkdir(parents=True, exist_ok=True)
    tmp = target.with_suffix(target.suffix + ".tmp")
    tmp.write_text(rendered, encoding="utf-8")
    os.replace(tmp, target)
    return target
```

- [ ] **Step 4: Wire it into `finish_content`**

In `processing/cli.py`, replace the `return vault_writer.write_note(...)` at the end of `finish_content` with:

```python
    path = vault_writer.write_note(
        content, summary,
        vault_path=cfg["obsidian"]["vault_path"],
        index_folder=cfg.get("obsidian", {}).get("index_folder", "BRAINDUMP"),
        model=model,
        force=force,
        dry_run=dry_run,
        equipment=equipment,
    )
    # Persist the source text too. write_note() may raise FileExistsError first,
    # in which case the transcript from the original ingest is already on disk.
    transcript_dir = cfg.get("processing", {}).get("transcript_dir")
    if transcript_dir:
        vault_writer.write_transcript(content, transcript_dir, dry_run=dry_run)
    return path
```

- [ ] **Step 5: Add the config key**

In `config.yaml`, under the existing `processing:` block, add:

```yaml
  transcript_dir: ./transcripts   # raw extracted text, OUTSIDE ./vault so the
                                  # Phase 1 watcher never indexes it. Consumed by
                                  # OlyTracker's synthesis indexer (oly_transcripts).
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `python -m pytest tests/processing/ -v`
Expected: PASS, including the pre-existing tests (no regressions)

- [ ] **Step 7: Commit**

```bash
git add processing/vault_writer.py processing/cli.py config.yaml tests/processing/test_vault_writer.py tests/processing/test_cli.py
git commit -m "feat: persist raw transcript alongside the vault note

The note body is the model's summary; consumers needing fidelity to the
source (OlyTracker synthesis) had nothing to read. Writes the raw text to
processing.transcript_dir using the note's deterministic slug, outside the
vault so the Phase 1 watcher never indexes it."
```

---

### Task 2: OlyTracker indexes transcripts into `oly_transcripts`

**Repo:** `D:\Programming\OlyTracker`

**Files:**
- Create: `synthesis/__init__.py`
- Create: `synthesis/index.py`
- Modify: `config.py` (append BRAINDUMP integration block)
- Test: `tests/test_synthesis_index.py`

**Interfaces:**
- Consumes: Task 1's transcript files. From Brain_Dump: `indexer.note_parser.parse_note(raw) -> ParsedNote(body, tags, word_count, source_type, title, created_at, source, extracted_at, equipment)`; `indexer.chunker.chunk_note(body, stem, chunk_chars, overlap_chars, *, granular=False) -> list[Chunk]`; `indexer.chunker.embed_text(chunk) -> str`; `indexer.vector_store.Point(id, vector, payload, sparse_vector=None)`, `point_id(note_path, chunk_index) -> str`, `QdrantStore(host, collection, vector_size, distance)`; `indexer.embedder.OllamaEmbedder(host, model).embed(texts) -> list[list[float]]`.
- Produces: `synthesis.index.EXCLUDED_SOURCES: frozenset[str]`; `synthesis.index.is_excluded(path: Path) -> bool`; `synthesis.index.prepare(raw: str, note_path: str, chunk_chars: int, overlap_chars: int) -> tuple[ParsedNote, list[Chunk]]`; `synthesis.index.build_points(parsed, chunks, note_path: str, vectors: list[list[float]]) -> list[Point]`; `synthesis.index.index_dir(transcript_dir, store, embedder, *, chunk_chars: int, overlap_chars: int) -> int` returning the number of notes indexed.
- **Chunk once.** `prepare()` parses and chunks; `build_points()` consumes that result. Do not re-parse or re-chunk inside `build_points` — across ~1,936 transcripts that doubles the work for nothing.
- **Exclusion is two-layer** (amended 2026-08-08 after review). A filename check alone cannot work going forward: BRAINDUMP names files `<title-slug>-<sha1(source)[:8]>.md` via `vault_writer.slugify`, so the domain never appears in the filename. `is_excluded(path)` stays as a cheap pre-filter for the retired `transcripts/web/last_manorg/...` layout, and `index_dir` additionally skips any note whose parsed frontmatter `source` matches an excluded domain — checked after `prepare()`, which is the first point the URL is known.

- [ ] **Step 1: Add config**

Append to `config.py`:

```python
# ── BRAINDUMP integration ─────────────────────────────────────────────────────
# OlyTracker no longer extracts anything. BRAINDUMP is the sole extractor; we
# index the raw transcripts it persists and retrieve from them for the master
# synthesis. See docs/superpowers/specs/2026-08-07-braindump-unified-extraction-design.md
BRAINDUMP_PATH = os.getenv("BRAINDUMP_PATH", r"D:\Programming\Brain_Dump")
BRAINDUMP_CONFIG = os.getenv("BRAINDUMP_CONFIG", "config.yaml")

# Our OWN collection. Never braindump_hybrid — transcript chunks must not
# compete with summary chunks in the Telegram bot's retrieval budget.
SYNTHESIS_COLLECTION = "oly_transcripts"

# Retrieval budget for synthesis. Deliberately far above the chat path's
# qdrant.max_chunks=5: a synthesis section needs breadth, a chat answer does not.
SYNTHESIS_MAX_CHUNKS = 30

MASTER_SYNTHESIS_PATH = "summaries/master_synthesis.md"
```

- [ ] **Step 2: Write the failing test**

Create `tests/test_synthesis_index.py`:

```python
import sys
from pathlib import Path

import pytest

import config

sys.path.insert(0, config.BRAINDUMP_PATH)

from synthesis import index as sindex  # noqa: E402


NOTE = """---
source: https://youtube.com/watch?v=abc
source_type: youtube
title: Snatch Basics
extracted_at: '2026-08-08T00:00:00Z'
---

Keep the bar close to the body through the second pull. Finish the extension
before pulling under the bar.
"""


class _FakeEmbedder:
    def __init__(self):
        self.calls = []

    def embed(self, texts):
        self.calls.append(list(texts))
        return [[float(len(t)), 1.0, 0.0, 0.0] for t in texts]


class _FakeStore:
    def __init__(self):
        self.points = []
        self.deleted = []
        self.ensured = False

    def ensure_collection(self):
        self.ensured = True

    def delete_by_note(self, note_path):
        self.deleted.append(note_path)

    def upsert(self, points):
        self.points.extend(points)


def test_is_excluded_rejects_last_manorg():
    assert sindex.is_excluded(Path("last_manorg-abc12345.md"))
    assert sindex.is_excluded(Path("/x/last_manorg/whatever.md"))
    assert not sindex.is_excluded(Path("snatch-basics-abc12345.md"))


def test_build_points_carries_source_attribution():
    parsed, chunks = sindex.prepare(NOTE, "snatch-basics-abc12345.md",
                                    chunk_chars=1200, overlap_chars=200)
    vectors = [[0.1, 0.2, 0.3, 0.4]] * len(chunks)
    points = sindex.build_points(parsed, chunks, "snatch-basics-abc12345.md", vectors)

    assert len(points) == len(chunks)
    payload = points[0].payload
    assert payload["note_path"] == "snatch-basics-abc12345.md"
    assert payload["source"] == "https://youtube.com/watch?v=abc"
    assert payload["title"] == "Snatch Basics"
    assert payload["source_type"] == "youtube"
    assert "bar close" in payload["text"]


def test_build_points_is_deterministic():
    parsed, chunks = sindex.prepare(NOTE, "n.md", chunk_chars=1200, overlap_chars=200)
    vectors = [[0.1, 0.2, 0.3, 0.4]] * len(chunks)

    a = sindex.build_points(parsed, chunks, "n.md", vectors)
    b = sindex.build_points(parsed, chunks, "n.md", vectors)

    assert [p.id for p in a] == [p.id for p in b]


def test_prepare_parses_and_chunks_once():
    parsed, chunks = sindex.prepare(NOTE, "n.md", chunk_chars=1200, overlap_chars=200)
    assert parsed.source == "https://youtube.com/watch?v=abc"
    assert chunks
    assert all(c.body for c in chunks)


def test_index_dir_skips_excluded_and_indexes_the_rest(tmp_path):
    (tmp_path / "snatch-basics-abc12345.md").write_text(NOTE, encoding="utf-8")
    (tmp_path / "last_manorg-def67890.md").write_text(NOTE, encoding="utf-8")

    store, embedder = _FakeStore(), _FakeEmbedder()
    n = sindex.index_dir(tmp_path, store, embedder,
                         chunk_chars=1200, overlap_chars=200)

    assert n == 1
    assert store.ensured is True
    assert {p.payload["note_path"] for p in store.points} == {
        "snatch-basics-abc12345.md"}


def test_index_dir_reindex_deletes_before_upsert(tmp_path):
    (tmp_path / "n-abc12345.md").write_text(NOTE, encoding="utf-8")
    store, embedder = _FakeStore(), _FakeEmbedder()

    sindex.index_dir(tmp_path, store, embedder, chunk_chars=1200, overlap_chars=200)

    assert store.deleted == ["n-abc12345.md"]


def test_index_dir_skips_empty_note(tmp_path):
    (tmp_path / "empty-abc12345.md").write_text(
        "---\nsource: x\nsource_type: youtube\ntitle: T\n---\n\n",
        encoding="utf-8")
    store, embedder = _FakeStore(), _FakeEmbedder()

    n = sindex.index_dir(tmp_path, store, embedder,
                         chunk_chars=1200, overlap_chars=200)

    assert n == 0
    assert store.points == []
```

- [ ] **Step 3: Run test to verify it fails**

Run: `python -m pytest tests/test_synthesis_index.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'synthesis'`

- [ ] **Step 4: Implement the module**

Create `synthesis/__init__.py` (empty file).

Create `synthesis/index.py`:

```python
"""Index BRAINDUMP-persisted transcripts into OlyTracker's own Qdrant collection.

Runs on the Z840, where the transcripts, the embedder, and Qdrant all live —
see the spec's deployment split. Imports Brain_Dump's chunker/embedder/store
rather than reimplementing them, so retrieval behaviour cannot drift from the
pipeline that produced the data.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from pathlib import Path

from indexer.chunker import chunk_note, embed_text
from indexer.note_parser import parse_note
from indexer.vector_store import Point, point_id

logger = logging.getLogger(__name__)

#: last-man.org carries a site-wide WordPress compromise — a PHP eval() backdoor
#: header and a gambling spam-link footer on every scraped page. The old pipeline
#: was safe only because Claude's summarization layer stripped it; indexing RAW
#: transcripts bypasses that entirely, so the source is excluded outright.
EXCLUDED_SOURCES = frozenset({"last_manorg"})


def _now_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def is_excluded(path: Path) -> bool:
    """True if the file belongs to an excluded source, by filename or parent dir."""
    name = path.name.lower()
    parts = {p.lower() for p in path.parts}
    return any(bad in name or bad in parts for bad in EXCLUDED_SOURCES)


def prepare(raw: str, note_path: str, chunk_chars: int, overlap_chars: int):
    """Parse one transcript file and chunk its body — once.

    Returns `(parsed, chunks)`. Callers embed `chunks` and hand both back to
    `build_points`, so nothing re-parses or re-chunks the same file.
    """
    parsed = parse_note(raw)
    chunks = chunk_note(parsed.body, Path(note_path).stem,
                        chunk_chars, overlap_chars)
    return parsed, chunks


def build_points(parsed, chunks, note_path: str,
                 vectors: list[list[float]]) -> list[Point]:
    """Turn a prepared transcript into Qdrant points.

    `vectors` must line up 1:1 with `chunks` — callers embed in a separate step
    so embedding can be batched.
    """
    now = _now_iso()
    return [
        Point(
            id=point_id(note_path, c.chunk_index),
            vector=v,
            payload={
                "note_path": note_path,
                "chunk_index": c.chunk_index,
                "chunk_count": len(chunks),
                "text": c.body,
                "heading": c.heading,
                "source": parsed.source,
                "title": parsed.title,
                "source_type": parsed.source_type,
                "extracted_at": parsed.extracted_at,
                "indexed_at": now,
            },
        )
        for c, v in zip(chunks, vectors)
    ]


def index_dir(transcript_dir, store, embedder, *, chunk_chars: int,
              overlap_chars: int) -> int:
    """Index every non-excluded transcript in `transcript_dir`. Returns the
    number of notes indexed (not chunks)."""
    transcript_dir = Path(transcript_dir)
    store.ensure_collection()
    indexed = 0

    for path in sorted(transcript_dir.glob("*.md")):
        if is_excluded(path):
            logger.info("skip (excluded source): %s", path.name)
            continue
        raw = path.read_text(encoding="utf-8", errors="replace")
        note_path = path.name
        parsed, chunks = prepare(raw, note_path, chunk_chars, overlap_chars)
        if not chunks:
            logger.warning("no chunks (empty body): %s", note_path)
            continue
        vectors = embedder.embed([embed_text(c) for c in chunks])
        points = build_points(parsed, chunks, note_path, vectors)
        # Delete-then-upsert AFTER a successful embed, matching the Phase 1
        # consumer: if embedding fails, stale vectors remain rather than the
        # note going unindexed entirely.
        store.delete_by_note(note_path)
        store.upsert(points)
        indexed += 1
        logger.info("indexed %s (%d chunks)", note_path, len(chunks))

    return indexed
```

- [ ] **Step 5: Run test to verify it passes**

Run: `python -m pytest tests/test_synthesis_index.py -v`
Expected: PASS (6 tests)

- [ ] **Step 6: Commit**

```bash
git add synthesis/__init__.py synthesis/index.py config.py tests/test_synthesis_index.py
git commit -m "feat: index BRAINDUMP transcripts into oly_transcripts collection

Own collection, not braindump_hybrid, so transcript chunks never compete
with summary chunks in the Telegram bot's retrieval. Excludes last_manorg:
indexing raw transcripts bypasses the summarization layer that was stripping
its PHP backdoor and spam injection."
```

---

### Task 3: Retrieval wrapper with the synthesis budget

**Repo:** `D:\Programming\OlyTracker`

**Files:**
- Create: `synthesis/retrieve.py`
- Test: `tests/test_synthesis_retrieve.py`

**Interfaces:**
- Consumes: Task 2's `oly_transcripts` payload shape (`text`, `source`, `title`, `note_path`, `chunk_index`). From Brain_Dump: `query.retriever.retrieve_hybrid(question, embedder, store, limit, threshold, vocab, equipment_values=None) -> list[Hit]`; `indexer.vector_store.Hit(score, payload)`.
- Produces: `synthesis.retrieve.Passage(text, source, title, note_path, score)` frozen dataclass; `synthesis.retrieve.retrieve_topic(question, embedder, store, *, limit, threshold, vocab=None) -> list[Passage]`; `synthesis.retrieve.format_passages(passages) -> str` rendering a numbered, citable context block.

- [ ] **Step 1: Write the failing test**

Create `tests/test_synthesis_retrieve.py`:

```python
import sys

import config

sys.path.insert(0, config.BRAINDUMP_PATH)

from indexer.vector_store import Hit  # noqa: E402
from synthesis import retrieve as sretrieve  # noqa: E402


def _hit(score, text, source, title, note_path, chunk_index=0):
    return Hit(score, {"text": text, "source": source, "title": title,
                       "note_path": note_path, "chunk_index": chunk_index})


class _FakeStore:
    pass


class _FakeEmbedder:
    def embed(self, texts):
        return [[1.0, 0.0]] * len(texts)


def test_retrieve_topic_maps_hits_to_passages(monkeypatch):
    hits = [_hit(0.71, "keep the bar close", "https://y/1", "Snatch", "a.md")]
    monkeypatch.setattr(sretrieve, "retrieve_hybrid",
                        lambda *a, **k: hits)

    out = sretrieve.retrieve_topic("snatch?", _FakeEmbedder(), _FakeStore(),
                                   limit=30, threshold=0.58)

    assert len(out) == 1
    assert out[0].text == "keep the bar close"
    assert out[0].source == "https://y/1"
    assert out[0].title == "Snatch"
    assert out[0].score == 0.71


def test_retrieve_topic_returns_empty_when_nothing_clears_threshold(monkeypatch):
    monkeypatch.setattr(sretrieve, "retrieve_hybrid", lambda *a, **k: [])

    out = sretrieve.retrieve_topic("obscure?", _FakeEmbedder(), _FakeStore(),
                                   limit=30, threshold=0.58)

    assert out == []


def test_retrieve_topic_passes_the_synthesis_budget(monkeypatch):
    seen = {}

    def _spy(question, embedder, store, limit, threshold, vocab,
             equipment_values=None):
        seen["limit"] = limit
        seen["threshold"] = threshold
        return []

    monkeypatch.setattr(sretrieve, "retrieve_hybrid", _spy)
    sretrieve.retrieve_topic("q", _FakeEmbedder(), _FakeStore(),
                             limit=30, threshold=0.58)

    assert seen["limit"] == 30
    assert seen["threshold"] == 0.58


def test_format_passages_numbers_and_attributes_each():
    passages = [
        sretrieve.Passage("bar close", "https://y/1", "Snatch", "a.md", 0.71),
        sretrieve.Passage("elbows high", "https://y/2", "Clean", "b.md", 0.66),
    ]

    block = sretrieve.format_passages(passages)

    assert "[1]" in block and "[2]" in block
    assert "bar close" in block and "elbows high" in block
    assert "https://y/1" in block
    assert "Snatch" in block


def test_format_passages_empty_is_explicit():
    assert sretrieve.format_passages([]) == "(no passages retrieved)"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python -m pytest tests/test_synthesis_retrieve.py -v`
Expected: FAIL with `ImportError: cannot import name 'retrieve' from 'synthesis'`

- [ ] **Step 3: Implement the module**

Create `synthesis/retrieve.py`:

```python
"""Retrieve source passages for one synthesis topic.

Thin wrapper over Brain_Dump's hybrid retriever, differing only in budget: a
synthesis section needs breadth (~30 chunks), while the chat path is tuned to
qdrant.max_chunks=5 for a single conversational answer.
"""

from __future__ import annotations

from dataclasses import dataclass

from query.retriever import retrieve_hybrid


@dataclass(frozen=True)
class Passage:
    text: str
    source: str | None
    title: str | None
    note_path: str
    score: float


def retrieve_topic(question: str, embedder, store, *, limit: int,
                   threshold: float, vocab=None) -> list[Passage]:
    """Passages for one topic query, best first. Empty list means the corpus has
    no coverage — callers MUST record that as a gap rather than proceeding."""
    hits = retrieve_hybrid(question, embedder, store, limit, threshold, vocab)
    return [
        Passage(
            text=h.payload.get("text", ""),
            source=h.payload.get("source"),
            title=h.payload.get("title"),
            note_path=h.payload.get("note_path", ""),
            score=h.score,
        )
        for h in hits
    ]


def format_passages(passages: list[Passage]) -> str:
    """A numbered context block. The numbers are the citation handles the
    synthesis prompt requires the model to cite, which is what makes every
    claim in the output traceable back to a real retrieved chunk."""
    if not passages:
        return "(no passages retrieved)"
    blocks = []
    for i, p in enumerate(passages, start=1):
        label = p.title or p.note_path
        origin = f"{label} — {p.source}" if p.source else label
        blocks.append(f"[{i}] {origin}\n{p.text}")
    return "\n\n".join(blocks)
```

- [ ] **Step 4: Run test to verify it passes**

Run: `python -m pytest tests/test_synthesis_retrieve.py -v`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add synthesis/retrieve.py tests/test_synthesis_retrieve.py
git commit -m "feat: add synthesis retrieval wrapper with citable passages

Wraps Brain_Dump's hybrid retriever at a synthesis-sized budget (~30 chunks
vs chat's 5) and renders numbered passages so the synthesis prompt can
require a citation per claim."
```

---

### Task 4: Build `master_synthesis.md` from retrieval

**Repo:** `D:\Programming\OlyTracker`

**Files:**
- Create: `synthesis/prompts.py`
- Create: `synthesis/build.py`
- Test: `tests/test_synthesis_build.py`

**Interfaces:**
- Consumes: Task 3's `Passage`, `retrieve_topic`, `format_passages`. From OlyTracker: `summarizer.llm_client.chat(prompt, system=None, max_tokens=None, model=None) -> str` and `LLMError`; `config.CLAUDE_SYNTHESIS_MODEL`, `config.SYNTHESIS_MAX_CHUNKS`, `config.MASTER_SYNTHESIS_PATH`. From Brain_Dump: `indexer.errors.BackendUnavailable`.
- Produces: `synthesis.prompts.TOPICS: list[Topic]`, `synthesis.prompts.ATHLETE_CONTEXT: str`, `synthesis.prompts.SYNTHESIS_PROMPT: str`; `synthesis.build.TopicResult(topic, passages, covered)`; `synthesis.build.gather(embedder, store, *, limit, threshold, vocab=None) -> list[TopicResult]`; `synthesis.build.render_gaps(results) -> str`; `synthesis.build.build_synthesis(results, chat_fn=None) -> str`.

- [ ] **Step 1: Write `synthesis/prompts.py`**

This is the ONLY file in the project allowed to contain `ATHLETE_CONTEXT`.

```python
"""Prompts for RAG-based master synthesis.

The athlete profile appears exactly ONCE in this codebase — in ATHLETE_CONTEXT
below — and is injected only into SYNTHESIS_PROMPT, the final call. The old
pipeline injected it into all six summarization prompts, so every stored
artifact was pre-distorted toward one athlete before synthesis ever ran.
"""

from dataclasses import dataclass


@dataclass(frozen=True)
class Topic:
    key: str
    question: str


#: One retrieval query per synthesis theme. Deliberately phrased as questions
#: about what COACHES SAY, not about what this athlete should do — the athlete
#: only enters at the final synthesis call.
TOPICS = [
    Topic("snatch", "What do these coaches say about snatch technique and progression?"),
    Topic("jerk", "What do these coaches say about jerk mechanics, the split jerk, and overhead stability?"),
    Topic("back_health", "What do these coaches say about back health, spinal loading, and training around back pain?"),
    Topic("periodization", "What do these coaches say about periodization, block structure, and training cycles?"),
    Topic("squat", "What do these coaches say about squat mechanics, especially for tall or long-femur lifters?"),
    Topic("mobility", "What do these coaches say about mobility work and overhead squat position?"),
    Topic("recovery", "What do these coaches say about recovery, fatigue management, and training frequency?"),
]

ATHLETE_CONTEXT = (
    "Athlete context: intermediate strength athlete transitioning to Olympic "
    "weightlifting. 102.5 kg bodyweight, Back Squat 118 kg, Clean 80 kg, "
    "Jerk 65 kg (push/power jerk; split jerk not yet trained), OHS 50 kg "
    "(primary snatch limiter). Chronic back pain. Night shift worker (Wed-Sun)."
)

SYNTHESIS_PROMPT = """You are synthesizing Olympic weightlifting coaching sources.

Below are passages retrieved verbatim from coaching transcripts, grouped by topic
and numbered for citation.

RULES — these are not stylistic preferences, they are correctness requirements:
1. Every factual claim MUST cite the passage it came from, as [N]. A claim you
   cannot cite does not belong in the document.
2. Do NOT add coaching knowledge from outside these passages, even if you are
   confident it is correct and standard. Outside knowledge is the exact failure
   this document exists to eliminate.
3. Where a topic is marked NO COVERAGE, say so plainly in the output. Do not
   fill the gap.
4. Where sources genuinely disagree, present both positions with citations
   rather than silently picking one.

Produce these sections:
## Consensus Principles
Principles supported by three or more distinct sources.
## Conflicts and How to Resolve Them
## Per-Source Contributions
What each source uniquely adds.
## Application to This Athlete
{athlete_context}
Only here may you reason about this specific athlete — and each recommendation
must still trace to a cited passage.
## Coverage Gaps
Topics with no retrieved coverage.

Retrieved passages:
{passages}"""
```

- [ ] **Step 2: Write the failing test**

Create `tests/test_synthesis_build.py`:

```python
import sys

import config

sys.path.insert(0, config.BRAINDUMP_PATH)

import pytest  # noqa: E402

from synthesis import build as sbuild  # noqa: E402
from synthesis import prompts as sprompts  # noqa: E402
from synthesis.retrieve import Passage  # noqa: E402


def _p(text, n=1):
    return Passage(text, f"https://y/{n}", f"Title {n}", f"{n}.md", 0.7)


def test_athlete_context_appears_only_in_the_synthesis_prompt():
    assert "{athlete_context}" in sprompts.SYNTHESIS_PROMPT
    for topic in sprompts.TOPICS:
        assert "102.5" not in topic.question
        assert "back pain" not in topic.question.lower()


def test_gather_marks_topics_with_no_hits_as_uncovered(monkeypatch):
    def _fake_retrieve(question, embedder, store, *, limit, threshold, vocab=None):
        return [_p("something")] if "snatch" in question.lower() else []

    monkeypatch.setattr(sbuild, "retrieve_topic", _fake_retrieve)

    results = sbuild.gather(object(), object(), limit=30, threshold=0.58)

    covered = {r.topic.key for r in results if r.covered}
    uncovered = {r.topic.key for r in results if not r.covered}
    assert "snatch" in covered
    assert "recovery" in uncovered


def test_render_gaps_lists_uncovered_topics(monkeypatch):
    results = [
        sbuild.TopicResult(sprompts.TOPICS[0], [_p("x")], True),
        sbuild.TopicResult(sprompts.TOPICS[1], [], False),
    ]

    gaps = sbuild.render_gaps(results)

    assert "NO COVERAGE" in gaps
    assert sprompts.TOPICS[1].key in gaps
    assert sprompts.TOPICS[0].key not in gaps


def test_build_synthesis_sends_passages_and_athlete_context():
    captured = {}

    def _fake_chat(prompt, system=None, max_tokens=None, model=None):
        captured["prompt"] = prompt
        captured["model"] = model
        return "# Synthesis\n\nClaim [1]."

    results = [sbuild.TopicResult(sprompts.TOPICS[0], [_p("bar close")], True)]
    out = sbuild.build_synthesis(results, chat_fn=_fake_chat)

    assert "bar close" in captured["prompt"]
    assert "102.5" in captured["prompt"]
    assert captured["model"] == config.CLAUDE_SYNTHESIS_MODEL
    assert out.startswith("# Synthesis")


def test_build_synthesis_refuses_when_nothing_was_retrieved():
    results = [sbuild.TopicResult(t, [], False) for t in sprompts.TOPICS]

    def _fake_chat(prompt, system=None, max_tokens=None, model=None):
        raise AssertionError("must not call the model with zero passages")

    with pytest.raises(sbuild.NoCoverageError):
        sbuild.build_synthesis(results, chat_fn=_fake_chat)


def test_build_synthesis_marks_uncovered_topics_in_the_prompt():
    captured = {}

    def _fake_chat(prompt, system=None, max_tokens=None, model=None):
        captured["prompt"] = prompt
        return "ok"

    results = [
        sbuild.TopicResult(sprompts.TOPICS[0], [_p("x")], True),
        sbuild.TopicResult(sprompts.TOPICS[1], [], False),
    ]
    sbuild.build_synthesis(results, chat_fn=_fake_chat)

    assert "NO COVERAGE" in captured["prompt"]
```

- [ ] **Step 3: Run test to verify it fails**

Run: `python -m pytest tests/test_synthesis_build.py -v`
Expected: FAIL with `ImportError: cannot import name 'build' from 'synthesis'`

- [ ] **Step 4: Implement `synthesis/build.py`**

```python
"""Assemble master_synthesis.md from retrieved source passages.

One retrieval per topic, then a single Sonnet call. The athlete profile enters
here and nowhere else in the pipeline.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass

import config
from summarizer.llm_client import chat as _default_chat
from synthesis.prompts import ATHLETE_CONTEXT, SYNTHESIS_PROMPT, TOPICS, Topic
from synthesis.retrieve import Passage, retrieve_topic

logger = logging.getLogger(__name__)


class NoCoverageError(Exception):
    """Raised when no topic retrieved anything. Writing a synthesis from zero
    passages would produce pure model knowledge — the failure this design exists
    to prevent — so we refuse rather than emit an unsourced document."""


@dataclass(frozen=True)
class TopicResult:
    topic: Topic
    passages: list[Passage]
    covered: bool


def gather(embedder, store, *, limit: int, threshold: float,
           vocab=None) -> list[TopicResult]:
    """Retrieve passages for every topic. A topic with no hits is recorded as
    uncovered, never silently dropped."""
    results = []
    for topic in TOPICS:
        passages = retrieve_topic(topic.question, embedder, store,
                                  limit=limit, threshold=threshold, vocab=vocab)
        if not passages:
            logger.warning("no coverage for topic %r", topic.key)
        results.append(TopicResult(topic, passages, bool(passages)))
    return results


def render_gaps(results: list[TopicResult]) -> str:
    """The uncovered-topic block that goes into the prompt, so the model is told
    explicitly what it does NOT have rather than being left to infer it."""
    missing = [r.topic.key for r in results if not r.covered]
    if not missing:
        return ""
    return "NO COVERAGE for these topics: " + ", ".join(missing)


def _render_context(results: list[TopicResult]) -> str:
    blocks = []
    counter = 1
    for r in results:
        if not r.covered:
            continue
        numbered = []
        for p in r.passages:
            label = p.title or p.note_path
            origin = f"{label} — {p.source}" if p.source else label
            numbered.append(f"[{counter}] {origin}\n{p.text}")
            counter += 1
        blocks.append(f"### Topic: {r.topic.key}\n" + "\n\n".join(numbered))
    return "\n\n".join(blocks)


def build_synthesis(results: list[TopicResult], chat_fn=None) -> str:
    """Single synthesis call. Raises NoCoverageError if nothing was retrieved."""
    if not any(r.covered for r in results):
        raise NoCoverageError(
            "no topic retrieved any passages — refusing to synthesize from "
            "model knowledge alone"
        )
    chat_fn = chat_fn or _default_chat
    passages = _render_context(results)
    gaps = render_gaps(results)
    if gaps:
        passages = f"{passages}\n\n{gaps}"
    prompt = SYNTHESIS_PROMPT.format(
        athlete_context=ATHLETE_CONTEXT, passages=passages)
    return chat_fn(
        prompt,
        system="You synthesize weightlifting coaching sources. You cite every "
               "claim and never add knowledge beyond the passages given.",
        max_tokens=8000,
        model=config.CLAUDE_SYNTHESIS_MODEL,
    )
```

- [ ] **Step 5: Run test to verify it passes**

Run: `python -m pytest tests/test_synthesis_build.py -v`
Expected: PASS (6 tests)

- [ ] **Step 6: Commit**

```bash
git add synthesis/prompts.py synthesis/build.py tests/test_synthesis_build.py
git commit -m "feat: build master synthesis from retrieved passages with citations

Athlete profile now appears exactly once, in the final synthesis prompt.
Topic queries ask what coaches say, not what this athlete should do. Refuses
to synthesize when nothing was retrieved rather than emitting an unsourced
document, and tells the model explicitly which topics have no coverage."
```

---

### Task 5: Retire the old extraction and summarization pipeline

**Repo:** `D:\Programming\OlyTracker`

**Files:**
- Delete: `extractor/` (whole package), `summarizer/source_summarizer.py`, `summarizer/video_summarizer.py`, `summarizer/channel_summarizer.py` (if present), `tests/test_channel.py`, `tests/test_playlist.py`, `tests/test_transcript.py`, `tests/test_web.py`, `tests/test_export.py`, `tests/test_telegram.py`
- Modify: `summarizer/prompts.py` (strip retired prompts and `ATHLETE_CONTEXT`)
- Modify: `main.py` (remove extraction subcommands, add `--synthesize`)
- Rename: `summaries/` → `summaries_archive/`
- Modify: `requirements.txt`, `CLAUDE.md`
- Test: `tests/test_no_athlete_context_leak.py`

**Interfaces:**
- Consumes: Task 4's `synthesis.build.gather`, `build_synthesis`, `NoCoverageError`; Task 2's `synthesis.index.index_dir`.
- Produces: `main.py --synthesize` writing `config.MASTER_SYNTHESIS_PATH`; `main.py --index` running the Z840-side indexing.

- [ ] **Step 1: Write the failing guard test**

Create `tests/test_no_athlete_context_leak.py`. This is the regression test for the entire bias fix:

```python
"""The bias fix is structural: the athlete profile must live in exactly one
place. This test fails if anyone reintroduces it into a summarization prompt."""

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

#: Distinctive strings from the athlete profile. If any appears outside the
#: allowed file, some artifact is being generated with athlete bias baked in.
PROFILE_MARKERS = ["102.5 kg", "OHS 50 kg", "primary snatch limiter"]

ALLOWED = {"synthesis/prompts.py"}

SEARCH_DIRS = ["synthesis", "summarizer"]


def _python_files():
    for d in SEARCH_DIRS:
        base = ROOT / d
        if base.is_dir():
            yield from base.rglob("*.py")


def test_athlete_profile_appears_only_in_synthesis_prompts():
    offenders = []
    for path in _python_files():
        rel = path.relative_to(ROOT).as_posix()
        if rel in ALLOWED:
            continue
        text = path.read_text(encoding="utf-8")
        if any(marker in text for marker in PROFILE_MARKERS):
            offenders.append(rel)
    assert offenders == [], (
        f"athlete profile leaked into: {offenders}. It belongs only in "
        f"synthesis/prompts.py — see the 2026-08-07 unified-extraction spec."
    )


def test_extractor_package_is_gone():
    assert not (ROOT / "extractor").exists(), (
        "extractor/ must be removed — BRAINDUMP is the sole extractor"
    )
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python -m pytest tests/test_no_athlete_context_leak.py -v`
Expected: FAIL — both tests. `summarizer/prompts.py` still holds the profile, and `extractor/` still exists.

- [ ] **Step 3: Archive the old summaries**

```bash
git mv summaries summaries_archive
```

This is the control for the old-vs-new diff in Task 6. Do not delete it.

- [ ] **Step 4: Delete the retired code**

```bash
git rm -r extractor
git rm summarizer/source_summarizer.py summarizer/video_summarizer.py
git rm tests/test_channel.py tests/test_playlist.py tests/test_transcript.py
git rm tests/test_web.py tests/test_export.py tests/test_telegram.py
```

If `summarizer/channel_summarizer.py` or `summarizer/ollama_client.py` exist, remove them too:

```bash
git rm -f summarizer/channel_summarizer.py summarizer/ollama_client.py 2>/dev/null || true
```

- [ ] **Step 5: Strip the retired prompts**

Replace the entire contents of `summarizer/prompts.py` with only what the cue indexer still needs — note `ATHLETE_CONTEXT` is gone and the cue prompts no longer interpolate it:

```python
"""Prompts retained for the technique-cue index.

The per-video, chunk-merge, channel roll-up, and master-synthesis prompts were
removed when BRAINDUMP became the sole extractor; synthesis prompts now live in
synthesis/prompts.py. ATHLETE_CONTEXT deliberately does NOT live here — cue
extraction must describe what a coach said, not what one athlete should do.
"""

CUE_EXTRACT_PROMPT = """You are building a technique-cue index from weightlifting
coaching material, for a self-coached athlete with no in-person coach.

From the text below, extract every concrete, actionable technique CUE — a short
instruction a lifter can apply mid-session (a bar-path detail, a positional fix, a
body-part cue). Do NOT include programming, periodization, or recovery advice —
cues only. Do not invent cues that are not present in the text.

Organize each cue under exactly one of these phase headers (omit headers with no cues):
## snatch_pull
## snatch_receive
## clean_pull
## clean_receive
## jerk_drive
## jerk_lockout
## back_posterior_chain

List cues as bullets, each prefixed with the source title in brackets, e.g.:
- [Source Title] Keep the bar close through the pull.

Source material:
{summaries}"""

CUE_MERGE_PROMPT = """You are finalizing a technique-cue index for a self-coached athlete.

Below are raw cue extractions from two coaches: DOZER cues (unmarked) and WEBSTER
cues (marked [WEBSTER] in their source label). Merge them into one clean index:

1. Keep the same phase headers: snatch_pull, snatch_receive, clean_pull,
   clean_receive, jerk_drive, jerk_lockout, back_posterior_chain (omit empty ones)
2. Deduplicate near-identical cues, keeping the clearest phrasing
3. Tag every Webster-sourced cue with [WEBSTER] at the end of the line
4. Where a Dozer cue and a Webster cue express the same underlying instruction,
   merge them into ONE line tagged [HIGH_CONFIDENCE] instead of listing both
5. Keep each cue to one line, imperative, actionable — preserve the source title
   in brackets at the start of the line

Output ONLY the final markdown index, starting with
"# Dozer + Webster Technique Cue Index" and a one-line note explaining that
[HIGH_CONFIDENCE] means both coaches independently gave the same cue.

Raw extractions:
{extractions}"""
```

If `summarizer/cue_indexer.py` passes `athlete_context=` into either prompt, remove that keyword argument from those `.format(...)` calls.

- [ ] **Step 6: Rewrite `main.py`**

Replace the whole file:

```python
"""OlyTracker knowledge pipeline CLI.

Extraction lives in BRAINDUMP now. This drives the two remaining steps:
indexing BRAINDUMP's persisted transcripts (run on the Z840) and building the
master synthesis from them (run anywhere with LAN access to the Z840).
"""

import argparse
import logging
import sys
from pathlib import Path

import config

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(message)s",
    handlers=[
        logging.FileHandler("extraction.log", encoding="utf-8"),
        logging.StreamHandler(),
    ],
)
logger = logging.getLogger(__name__)


def _braindump_on_path():
    if config.BRAINDUMP_PATH not in sys.path:
        sys.path.insert(0, config.BRAINDUMP_PATH)


def _backends():
    """Embedder + store, both configured from Brain_Dump's own config so the
    values can never drift from the pipeline that produced the data."""
    _braindump_on_path()
    from indexer.config_loader import load_config
    from indexer.embedder import OllamaEmbedder
    from indexer.vector_store import QdrantStore

    cfg = load_config(config.BRAINDUMP_CONFIG)
    q, o = cfg["qdrant"], cfg["ollama"]
    embedder = OllamaEmbedder(o["host"], o["embedding_model"])
    store = QdrantStore(q["host"], config.SYNTHESIS_COLLECTION,
                        q["vector_size"], q.get("distance", "Cosine"))
    return cfg, embedder, store


def cmd_index(args) -> int:
    cfg, embedder, store = _backends()
    from indexer.errors import BackendUnavailable
    from synthesis.index import index_dir

    transcript_dir = args.transcript_dir or cfg["processing"]["transcript_dir"]
    ch = cfg["chunking"]
    try:
        n = index_dir(transcript_dir, store, embedder,
                      chunk_chars=ch["chunk_chars"],
                      overlap_chars=ch["overlap_chars"])
    except BackendUnavailable as e:
        print(f"Z840 unreachable; run again when it's up ({e})", file=sys.stderr)
        return 3
    print(f"indexed {n} transcripts into {config.SYNTHESIS_COLLECTION}")
    return 0


def cmd_synthesize(args) -> int:
    cfg, embedder, store = _backends()
    from indexer.errors import BackendUnavailable
    from summarizer.llm_client import LLMError
    from synthesis.build import NoCoverageError, build_synthesis, gather

    threshold = cfg["qdrant"]["similarity_threshold"]
    try:
        results = gather(embedder, store, limit=config.SYNTHESIS_MAX_CHUNKS,
                         threshold=threshold)
        text = build_synthesis(results)
    except BackendUnavailable as e:
        print(f"Z840 unreachable; run again when it's up ({e})", file=sys.stderr)
        return 3
    except NoCoverageError as e:
        print(f"ERROR: {e}", file=sys.stderr)
        return 4
    except LLMError as e:
        print(f"synthesis call failed: {e}", file=sys.stderr)
        return 3

    out = Path(config.MASTER_SYNTHESIS_PATH)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(text, encoding="utf-8")
    covered = sum(1 for r in results if r.covered)
    print(f"wrote {out} ({covered}/{len(results)} topics covered)")
    return 0


def main(argv=None) -> int:
    p = argparse.ArgumentParser(prog="olytracker")
    sub = p.add_subparsers(dest="command", required=True)

    pi = sub.add_parser("index", help="Index BRAINDUMP transcripts (run on the Z840)")
    pi.add_argument("--transcript-dir", default=None,
                    help="Override processing.transcript_dir from Brain_Dump's config")
    pi.set_defaults(func=cmd_index)

    ps = sub.add_parser("synthesize", help="Build master_synthesis.md from retrieval")
    ps.set_defaults(func=cmd_synthesize)

    args = p.parse_args(argv)
    return args.func(args)


if __name__ == "__main__":
    sys.exit(main())
```

- [ ] **Step 7: Trim `requirements.txt`**

Replace with:

```
requests
tqdm
anthropic
qdrant-client
PyYAML
pytest
```

`yt-dlp`, `youtube-transcript-api`, `faster-whisper`, `beautifulsoup4`, and `tiktoken` were only used by the retired extractor and summarizer.

- [ ] **Step 8: Run the full suite**

Run: `python -m pytest tests/ -v`
Expected: PASS. The two guard tests now pass, and no retired-module tests remain to fail on missing imports.

- [ ] **Step 9: Update CLAUDE.md**

In `D:\Programming\OlyTracker\CLAUDE.md`, replace the `## CLI Usage` section's command list with:

```bash
# Index BRAINDUMP's persisted transcripts (run ON the Z840)
python main.py index

# Build master_synthesis.md from retrieval (run anywhere with LAN access)
python main.py synthesize
```

And under `## Project Structure`, replace the `extractor/` and `summarizer/` trees with:

```
├── synthesis/
│   ├── index.py                 # transcripts -> oly_transcripts (runs on Z840)
│   ├── retrieve.py              # topic query -> citable passages
│   ├── prompts.py               # TOPICS + the ONLY ATHLETE_CONTEXT in the repo
│   └── build.py                 # passages -> master_synthesis.md (Sonnet)
├── summarizer/
│   ├── llm_client.py            # Claude API wrapper
│   ├── prompts.py               # cue-index prompts only
│   └── cue_indexer.py
├── summaries_archive/           # pre-2026-08 output, kept as the bias-fix control
```

Add a note under Development Rules:

```markdown
- **BRAINDUMP is the sole extractor.** OlyTracker no longer downloads or
  transcribes anything — see `docs/superpowers/specs/2026-08-07-braindump-unified-extraction-design.md`.
  The athlete profile lives in exactly one place, `synthesis/prompts.py`;
  `tests/test_no_athlete_context_leak.py` fails if it reappears elsewhere.
```

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "refactor: retire OlyTracker's extraction and summarization pipeline

BRAINDUMP is the sole extractor now. Removes extractor/, the per-video and
channel roll-up summarizers, and their prompts; summaries/ is archived as
summaries_archive/ to serve as the old-vs-new control. main.py becomes two
subcommands: index and synthesize. Adds a guard test that fails if the
athlete profile reappears outside synthesis/prompts.py."
```

---

### Task 6: Migrate the back-catalog and verify the bias fix

**Repo:** `D:\Programming\OlyTracker` (ops task; commits only the verification note)

**Files:**
- Create: `docs/superpowers/plans/2026-08-08-migration-log.md`

**Interfaces:**
- Consumes: everything from Tasks 1–5.
- Produces: a populated `oly_transcripts` collection and a regenerated `summaries/master_synthesis.md`.

- [ ] **Step 1: Copy the back-catalog to the Z840, excluding the compromised source**

The existing 2,554 transcripts are on Windows; the indexer runs on the Z840. `last_manorg` (618 files) is excluded — its raw text carries the PHP backdoor and spam that the old summarization layer was silently stripping.

```bash
cd "D:\Programming\OlyTracker"
tar --exclude='*last_manorg*' --exclude='merged.txt' -czf /tmp/oly-transcripts.tar.gz transcripts/
scp /tmp/oly-transcripts.tar.gz ivanb@10.0.0.9:/tmp/
ssh ivanb@10.0.0.9 'mkdir -p /home/ivanb/braindump/transcripts /tmp/olyx && \
  tar -xzf /tmp/oly-transcripts.tar.gz -C /tmp/olyx && \
  find /tmp/olyx -name "*.txt" -exec cp {} /home/ivanb/braindump/transcripts/ \;'
```

Those back-catalog files are bare `.txt` with OlyTracker's own header, not the
frontmatter `.md` shape Task 1 writes. Convert them in place so
`indexer.note_parser.parse_note` can read them — otherwise every back-catalog
chunk loses its source attribution and the synthesis cannot cite it:

```bash
ssh ivanb@10.0.0.9 'cd /home/ivanb/braindump && .venv/bin/python - <<"PY"
from pathlib import Path
import yaml

d = Path("transcripts")
converted = 0
for txt in d.glob("*.txt"):
    raw = txt.read_text(encoding="utf-8", errors="replace")
    meta, _, body = raw.partition("---\n")
    fm = {"source": None, "source_type": "youtube", "title": txt.stem,
          "extracted_at": None}
    for line in meta.splitlines():
        k, _, v = line.partition(":")
        k, v = k.strip().lower(), v.strip()
        if k == "source" or k == "url":
            fm["source"] = v
        elif k == "title" and v:
            fm["title"] = v
        elif k == "type" and v:
            fm["source_type"] = v
    if not body.strip():
        continue
    head = yaml.safe_dump(fm, sort_keys=False, allow_unicode=True).rstrip()
    (d / f"{txt.stem}.md").write_text(
        f"---\n{head}\n---\n\n{body.strip()}\n", encoding="utf-8")
    txt.unlink()
    converted += 1
print(f"converted {converted} back-catalog transcripts to frontmatter form")
PY'
```

Verify the exclusion actually held before indexing anything:

```bash
ssh ivanb@10.0.0.9 'ls /home/ivanb/braindump/transcripts | wc -l; \
  ls /home/ivanb/braindump/transcripts | grep -ci last_man || echo "0 last_man files — correct"'
```

Expected: roughly 1,936 files, and zero matching `last_man`.

- [ ] **Step 2: Deploy the indexer to the Z840 and smoke-test on one source**

Per `safe-batch-llm-runs`: sample before committing the full batch.

Push your local work first — the box clones from GitHub, so anything uncommitted
locally will not be there:

```bash
cd "D:\Programming\OlyTracker" && git push origin master
ssh ivanb@10.0.0.9 'cd /home/ivanb && \
  (test -d olytracker && cd olytracker && git pull) || \
  git clone https://github.com/Shabazz84/OlyTracker.git olytracker'
ssh ivanb@10.0.0.9 'mkdir -p /tmp/oly-sample && \
  ls /home/ivanb/braindump/transcripts/*.md | head -50 | xargs -I{} cp {} /tmp/oly-sample/'
ssh ivanb@10.0.0.9 'cd /home/ivanb/braindump && \
  BRAINDUMP_PATH=/home/ivanb/braindump \
  .venv/bin/python /home/ivanb/olytracker/main.py index --transcript-dir /tmp/oly-sample'
```

Expected: `indexed 50 transcripts into oly_transcripts`.

- [ ] **Step 3: Verify retrieval quality on the sample before the full run**

```bash
ssh ivanb@10.0.0.9 'cd /home/ivanb/braindump && \
  BRAINDUMP_PATH=/home/ivanb/braindump .venv/bin/python -c "
import sys; sys.path.insert(0, \"/home/ivanb/olytracker\")
from main import _backends
from synthesis.retrieve import retrieve_topic
cfg, emb, store = _backends()
ps = retrieve_topic(\"What do these coaches say about snatch technique?\",
                    emb, store, limit=10, threshold=cfg[\"qdrant\"][\"similarity_threshold\"])
print(len(ps), \"passages\")
for p in ps[:3]: print(round(p.score,3), p.title, \"|\", p.text[:120])
"'
```

Expected: several passages, scores above 0.58, text that is recognisably weightlifting coaching. If passages look off-topic or scores cluster at the threshold, stop and investigate before indexing 1,900 more files.

- [ ] **Step 4: Index the full corpus**

```bash
ssh ivanb@10.0.0.9 'cd /home/ivanb/braindump && \
  BRAINDUMP_PATH=/home/ivanb/braindump \
  nohup .venv/bin/python /home/ivanb/olytracker/main.py index \
  > /tmp/oly-index.log 2>&1 &'
```

Poll until done, then confirm the count:

```bash
ssh ivanb@10.0.0.9 'tail -5 /tmp/oly-index.log'
curl -s http://10.0.0.9:6333/collections/oly_transcripts | python -m json.tool | grep points_count
```

- [ ] **Step 5: Regenerate the synthesis**

```bash
cd "D:\Programming\OlyTracker"
python main.py synthesize
```

Expected: `wrote summaries/master_synthesis.md (7/7 topics covered)`.

- [ ] **Step 6: Run the three bias checks**

**Check 1 — the fabricated-exercise class is gone.** The archived synthesis and channel summaries prescribed Western-gym exercises that do not plausibly come from the Russian sources they cited:

```bash
grep -inE "landmine|face pull|trap bar" summaries/master_synthesis.md
```

Expected: no matches. (For contrast, `grep -inE "landmine|face pull|trap bar" summaries_archive/web_last_manorg/channel_summary.md` does match — that is the bug being fixed.)

**Check 2 — every claim is citable.** Confirm the document actually cites:

```bash
grep -c "\[[0-9]" summaries/master_synthesis.md
```

Expected: a substantial count. Then read ~15 cited claims and confirm each corresponds to a real retrieved passage.

**Check 3 — refusal behaviour.** Query a topic the corpus genuinely does not cover and confirm zero passages come back rather than invented ones:

```bash
python -c "
from main import _backends
from synthesis.retrieve import retrieve_topic
cfg, emb, store = _backends()
ps = retrieve_topic('What do these coaches say about marathon fuelling strategy?',
                    emb, store, limit=30,
                    threshold=cfg['qdrant']['similarity_threshold'])
print(len(ps), 'passages')
"
```

Expected: `0 passages`.

- [ ] **Step 7: Confirm no regression to the Telegram bot**

Separate collection makes this near-certain, but verify rather than assume:

```bash
ssh ivanb@10.0.0.9 'cd /home/ivanb/braindump && \
  .venv/bin/python -m query "what do my notes say about snatch technique" | head -20'
curl -s http://10.0.0.9:6333/collections/braindump_hybrid | python -m json.tool | grep points_count
```

Expected: a normal grounded answer citing vault notes, and a `braindump_hybrid` point count unchanged from before the migration.

- [ ] **Step 8: End-to-end single-source check**

Paste a fresh YouTube link to the Telegram bot, wait for "✅ indexed", then confirm one extraction reached both consumers:

```bash
ssh ivanb@10.0.0.9 'ls -t /home/ivanb/braindump/transcripts | head -3'
ssh ivanb@10.0.0.9 'ls -t /home/ivanb/braindump/vault/BRAINDUMP/youtube | head -3'
```

Expected: the same slug appears in both, from a single download and transcription.

- [ ] **Step 9: Write the migration log and commit**

Create `docs/superpowers/plans/2026-08-08-migration-log.md` recording: files copied, files excluded, points indexed, the three bias-check results (with the actual grep output), the bot regression check, and anything that surprised you. Then:

```bash
git add summaries/master_synthesis.md docs/superpowers/plans/2026-08-08-migration-log.md
git commit -m "feat: regenerate master_synthesis.md from retrieved source passages

First synthesis built via RAG over BRAINDUMP transcripts rather than
athlete-biased per-video summaries. Every claim cites a retrieved passage.
Migration log records the bias-check results against the archived control."
```

---

## Notes for the implementer

- **Import order matters.** `synthesis/*` imports Brain_Dump modules (`indexer.*`, `query.*`). Anything importing them must put `config.BRAINDUMP_PATH` on `sys.path` first — the tests do this at the top of each file, and `main.py` does it in `_braindump_on_path()`.
- **Do not touch `braindump_hybrid`.** If you find yourself writing to it, something is wrong: OlyTracker writes only to `oly_transcripts`.
- **The guard test is the point.** `tests/test_no_athlete_context_leak.py` is not a formality — it is the regression test for the entire reason this work exists. If it starts failing later, the bias has come back.
- **Task 6 is the only task that spends money or GPU time.** Tasks 1–5 are all offline with fakes.
