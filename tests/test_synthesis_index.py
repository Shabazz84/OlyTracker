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
