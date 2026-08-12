"""The evidence pack is what makes a citation auditable.

Retrieval reorders near-tied results between runs, so a citation number is
meaningless unless the passage it points at is written down. These tests cover
the properties that make the pack trustworthy: gaps are recorded rather than
dropped, a backend outage aborts instead of producing a partial pack reported
as success, and passage text is stored in full rather than snipped.
"""

import json
import sys

import pytest

import config

# synthesis.retrieve imports Brain_Dump's query.retriever at module load, so the
# path insert has to happen before it — same ordering as tests/test_ask_cli.py.
sys.path.insert(0, config.BRAINDUMP_PATH)

from synthesis import evidence as sev  # noqa: E402
from synthesis.questions import Question  # noqa: E402
from synthesis.retrieve import Passage  # noqa: E402


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
    qs = [
        _q(1, "deload_frequency"),
        Question(2, "squat_dosing", "What do these coaches say about squats?"),
    ]
    results = sev.gather_evidence(None, None, limit=12, threshold=0.58, questions=qs)

    assert [r.question.key for r in results] == ["deload_frequency", "squat_dosing"]
    assert [r.covered for r in results] == [False, True]


def test_gather_propagates_backend_unavailable(monkeypatch):
    """A partial pack reported as success is worse than a failed run: the
    missing questions look like corpus gaps."""
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
