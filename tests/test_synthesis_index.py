import sys
from pathlib import Path

import pytest

import config

sys.path.insert(0, config.BRAINDUMP_PATH)

from indexer.errors import BackendUnavailable  # noqa: E402
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

# Real BRAINDUMP filenames are `slugify(title, source)` = `<title-slug>-<sha1(source)[:8]>.md`
# — the domain never appears in the filename, only in the frontmatter `source:`.
LAST_MAN_NOTE = """---
source: https://last-man.org/blockedsrsbenchpress/
source_type: web
title: Bench Press Article
extracted_at: '2026-08-08T00:00:00Z'
---

Some backdoor-laced content that must never reach the retrievable corpus.
"""

# No `source:` key at all — the same shape produced when note_parser swallows
# a YAMLError into `fm = {}` (unparseable frontmatter fails closed the same way).
NO_SOURCE_NOTE = """---
source_type: youtube
title: Mystery Video
extracted_at: '2026-08-08T00:00:00Z'
---

Content with no attributable source.
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


class _FlakyEmbedder:
    """Fails on the Nth `embed()` call (1-indexed), succeeds otherwise —
    used to prove index_dir isolates a per-file embed failure."""

    def __init__(self, fail_on_call):
        self.fail_on_call = fail_on_call
        self.calls = 0

    def embed(self, texts):
        self.calls += 1
        if self.calls == self.fail_on_call:
            raise RuntimeError("boom")
        return [[float(len(t)), 1.0, 0.0, 0.0] for t in texts]


class _OutageEmbedder:
    """Raises BackendUnavailable on the Nth `embed()` call — simulates Ollama
    dropping mid-batch, as opposed to a per-file processing error."""

    def __init__(self, fail_on_call):
        self.fail_on_call = fail_on_call
        self.calls = 0

    def embed(self, texts):
        self.calls += 1
        if self.calls == self.fail_on_call:
            raise BackendUnavailable("ollama connection refused")
        return [[float(len(t)), 1.0, 0.0, 0.0] for t in texts]


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


# ── Finding 1: source-URL exclusion layer ──────────────────────────────────────

def test_is_excluded_source_matches_domain_regardless_of_filename():
    assert sindex.is_excluded_source("https://last-man.org/blockedsrsbenchpress/")


def test_is_excluded_source_case_insensitive():
    assert sindex.is_excluded_source("https://LAST-MAN.ORG/foo")


def test_is_excluded_source_allows_normal_source():
    assert not sindex.is_excluded_source("https://youtube.com/watch?v=abc")


def test_is_excluded_source_tolerates_missing_source():
    assert not sindex.is_excluded_source(None)
    assert not sindex.is_excluded_source("")


def test_index_dir_skips_note_by_source_domain_even_without_filename_hint(tmp_path):
    # Slugified filename per BRAINDUMP's vault_writer.slugify carries no domain
    # substring — exclusion must catch this via frontmatter `source`, not the
    # filename, or a future last-man.org extraction sails straight through.
    (tmp_path / "bench-press-article-deadbeef.md").write_text(
        LAST_MAN_NOTE, encoding="utf-8")
    (tmp_path / "snatch-basics-abc12345.md").write_text(NOTE, encoding="utf-8")

    store, embedder = _FakeStore(), _FakeEmbedder()
    n = sindex.index_dir(tmp_path, store, embedder,
                         chunk_chars=1200, overlap_chars=200)

    assert n == 1
    assert {p.payload["note_path"] for p in store.points} == {
        "snatch-basics-abc12345.md"}


# ── Finding 2: build_points length check ───────────────────────────────────────

def test_build_points_raises_on_vector_chunk_length_mismatch():
    parsed, chunks = sindex.prepare(NOTE, "n.md", chunk_chars=1200, overlap_chars=200)
    assert chunks  # sanity: there is something to mismatch against

    with pytest.raises(ValueError) as exc_info:
        sindex.build_points(parsed, chunks, "n.md", vectors=[])

    msg = str(exc_info.value)
    assert str(len(chunks)) in msg
    assert "0" in msg


# ── Finding 3: per-file error isolation ─────────────────────────────────────────

def test_index_dir_continues_after_embed_failure(tmp_path):
    (tmp_path / "a-abc12345.md").write_text(NOTE, encoding="utf-8")
    (tmp_path / "b-abc12345.md").write_text(NOTE, encoding="utf-8")

    store = _FakeStore()
    embedder = _FlakyEmbedder(fail_on_call=1)  # "a" sorts first and fails

    n = sindex.index_dir(tmp_path, store, embedder,
                         chunk_chars=1200, overlap_chars=200)

    assert n == 1
    assert {p.payload["note_path"] for p in store.points} == {"b-abc12345.md"}


def test_index_dir_continues_after_read_error(tmp_path, monkeypatch):
    (tmp_path / "a-abc12345.md").write_text(NOTE, encoding="utf-8")
    (tmp_path / "b-abc12345.md").write_text(NOTE, encoding="utf-8")

    store, embedder = _FakeStore(), _FakeEmbedder()
    real_read_text = Path.read_text

    def flaky_read_text(self, *args, **kwargs):
        if self.name == "a-abc12345.md":
            raise OSError("disk gremlin")
        return real_read_text(self, *args, **kwargs)

    monkeypatch.setattr(Path, "read_text", flaky_read_text)

    n = sindex.index_dir(tmp_path, store, embedder,
                         chunk_chars=1200, overlap_chars=200)

    assert n == 1
    assert {p.payload["note_path"] for p in store.points} == {"b-abc12345.md"}


def test_index_dir_does_not_report_all_failures_as_success(tmp_path, caplog):
    (tmp_path / "a-abc12345.md").write_text(NOTE, encoding="utf-8")

    store = _FakeStore()
    embedder = _FlakyEmbedder(fail_on_call=1)

    with caplog.at_level("INFO"):
        n = sindex.index_dir(tmp_path, store, embedder,
                             chunk_chars=1200, overlap_chars=200)

    assert n == 0
    assert any(
        "1 failed" in rec.getMessage() or "failed=1" in rec.getMessage()
        for rec in caplog.records
    ), "expected a logged summary reporting the failure count"


# ── Finding I3: backend outage aborts rather than reporting success ────────────

def test_index_dir_reraises_backend_unavailable_instead_of_swallowing_it(tmp_path):
    (tmp_path / "a-abc12345.md").write_text(NOTE, encoding="utf-8")
    (tmp_path / "b-abc12345.md").write_text(NOTE, encoding="utf-8")

    store = _FakeStore()
    embedder = _OutageEmbedder(fail_on_call=1)  # "a" sorts first and hits the outage

    with pytest.raises(BackendUnavailable):
        sindex.index_dir(tmp_path, store, embedder,
                         chunk_chars=1200, overlap_chars=200)

    # Must abort on the outage rather than continuing to "b" and reporting
    # a clean (or partially-clean) run.
    assert store.points == []


# ── Finding I4: exclusion purges already-indexed vectors, not just prevents new ones ──

def test_index_dir_purges_vectors_when_filename_excluded_on_reindex(tmp_path):
    (tmp_path / "last_manorg-def67890.md").write_text(NOTE, encoding="utf-8")
    store, embedder = _FakeStore(), _FakeEmbedder()

    n = sindex.index_dir(tmp_path, store, embedder,
                         chunk_chars=1200, overlap_chars=200)

    assert n == 0
    assert store.deleted == ["last_manorg-def67890.md"], (
        "an excluded note must have its previously-indexed points purged, "
        "not just be skipped for future indexing"
    )


def test_index_dir_purges_vectors_when_source_domain_excluded_on_reindex(tmp_path):
    (tmp_path / "bench-press-article-deadbeef.md").write_text(
        LAST_MAN_NOTE, encoding="utf-8")
    store, embedder = _FakeStore(), _FakeEmbedder()

    n = sindex.index_dir(tmp_path, store, embedder,
                         chunk_chars=1200, overlap_chars=200)

    assert n == 0
    assert store.deleted == ["bench-press-article-deadbeef.md"], (
        "a note newly excluded by source domain must have its previously-"
        "indexed points purged on the re-run that adds the domain to "
        "EXCLUDED_SOURCE_DOMAINS"
    )


# ── Finding I5: unparseable/missing frontmatter fails closed ───────────────────

def test_index_dir_skips_note_with_no_source(tmp_path, caplog):
    (tmp_path / "mystery-abc12345.md").write_text(NO_SOURCE_NOTE, encoding="utf-8")
    store, embedder = _FakeStore(), _FakeEmbedder()

    with caplog.at_level("WARNING"):
        n = sindex.index_dir(tmp_path, store, embedder,
                             chunk_chars=1200, overlap_chars=200)

    assert n == 0
    assert store.points == []
    assert any(
        "mystery-abc12345.md" in rec.getMessage() for rec in caplog.records
    ), "expected a warning naming the file with no source"


def test_index_dir_skips_only_the_sourceless_note_and_indexes_the_rest(tmp_path):
    (tmp_path / "mystery-abc12345.md").write_text(NO_SOURCE_NOTE, encoding="utf-8")
    (tmp_path / "snatch-basics-abc12345.md").write_text(NOTE, encoding="utf-8")
    store, embedder = _FakeStore(), _FakeEmbedder()

    n = sindex.index_dir(tmp_path, store, embedder,
                         chunk_chars=1200, overlap_chars=200)

    assert n == 1
    assert {p.payload["note_path"] for p in store.points} == {
        "snatch-basics-abc12345.md"}
