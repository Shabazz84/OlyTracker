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
