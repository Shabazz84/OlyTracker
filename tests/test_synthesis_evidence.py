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


# -------------------------------------------------------------- citations


def test_citations_record_one_entry_per_passage():
    results = [
        sev.QuestionResult(_q(1, "deload_frequency"), [_p("a"), _p("b")], True),
    ]
    c = sev.build_citations(results, limit=12, threshold=0.58, collection="oly")

    assert [e["handle"] for e in c["citations"]] == ["E1.1", "E1.2"]


def test_citations_carry_source_note_and_score():
    results = [sev.QuestionResult(
        _q(7, "session_opener"),
        [_p("a", source="https://y/abc", note_path="n/one.md", score=0.712)],
        True)]
    c = sev.build_citations(results, limit=12, threshold=0.58, collection="oly")
    e = c["citations"][0]

    assert e["source"] == "https://y/abc"
    assert e["note_path"] == "n/one.md"
    assert e["score"] == 0.712
    assert e["question_key"] == "session_opener"


def test_citations_hash_is_stable_for_identical_text():
    a = sev.build_citations([sev.QuestionResult(_q(), [_p("same body")], True)],
                            limit=12, threshold=0.58, collection="oly")
    b = sev.build_citations([sev.QuestionResult(_q(), [_p("same body")], True)],
                            limit=12, threshold=0.58, collection="oly")

    assert a["citations"][0]["sha256"] == b["citations"][0]["sha256"]


def test_citations_hash_differs_for_different_text():
    a = sev.build_citations([sev.QuestionResult(_q(), [_p("body one")], True)],
                            limit=12, threshold=0.58, collection="oly")
    b = sev.build_citations([sev.QuestionResult(_q(), [_p("body two")], True)],
                            limit=12, threshold=0.58, collection="oly")

    assert a["citations"][0]["sha256"] != b["citations"][0]["sha256"]


def test_citations_contain_no_transcript_text():
    """The manifest is committed to git; the pack is not. A quote here would
    put transcript text in the repo, which CLAUDE.md forbids outright."""
    body = "zzdistinctivetranscriptphrasezz"
    c = sev.build_citations([sev.QuestionResult(_q(), [_p(body)], True)],
                            limit=12, threshold=0.58, collection="oly")

    assert body not in json.dumps(c)


def test_uncovered_questions_contribute_no_citations():
    results = [
        sev.QuestionResult(_q(1, "deload_frequency"), [], False),
        sev.QuestionResult(Question(2, "squat_dosing",
                                    "What do these coaches say about squats?"),
                           [_p("a")], True),
    ]
    c = sev.build_citations(results, limit=12, threshold=0.58, collection="oly")

    assert [e["handle"] for e in c["citations"]] == ["E2.1"]


def test_write_pack_writes_citations_to_the_given_path(tmp_path):
    """Written OUTSIDE the pack on purpose: `evidence/` is gitignored, and git
    cannot re-include a file under an excluded directory."""
    results = [sev.QuestionResult(_q(), [_p("a")], True)]
    cit = tmp_path / "committed" / "2026-08-12-citations.json"

    sev.write_pack(results, tmp_path / "pack", limit=12, threshold=0.58,
                   collection="oly", citations_path=cit)

    assert cit.exists()
    assert json.loads(cit.read_text(encoding="utf-8"))["citations"][0]["handle"] == "E1.1"


def test_write_pack_without_citations_path_writes_no_manifest(tmp_path):
    results = [sev.QuestionResult(_q(), [_p("a")], True)]
    out = sev.write_pack(results, tmp_path, limit=12, threshold=0.58,
                         collection="oly")

    assert not (out / "citations.json").exists()


# ------------------------------------------ write_pack: citations conflicts


def test_write_pack_refuses_to_overwrite_a_differing_manifest(tmp_path):
    """Retrieval reorders near-tied passages between runs, so a second run
    can produce a different handle->sha256 mapping. Silently replacing an
    already-committed manifest is the audit-trail gap this guards against."""
    cit = tmp_path / "committed" / "2026-08-12-citations.json"
    first = [sev.QuestionResult(_q(), [_p("body one")], True)]
    second = [sev.QuestionResult(_q(), [_p("body two")], True)]

    sev.write_pack(first, tmp_path / "pack1", limit=12, threshold=0.58,
                   collection="oly", citations_path=cit)
    before = cit.read_text(encoding="utf-8")

    with pytest.raises(sev.CitationsConflictError) as exc_info:
        sev.write_pack(second, tmp_path / "pack2", limit=12, threshold=0.58,
                       collection="oly", citations_path=cit)

    # named the path and the override in the error, and left the file alone
    assert str(cit) in str(exc_info.value)
    assert "overwrite" in str(exc_info.value)
    assert cit.read_text(encoding="utf-8") == before


def test_write_pack_overwrite_true_replaces_a_differing_manifest(tmp_path):
    cit = tmp_path / "committed" / "2026-08-12-citations.json"
    first = [sev.QuestionResult(_q(), [_p("body one")], True)]
    second = [sev.QuestionResult(_q(), [_p("body two")], True)]

    sev.write_pack(first, tmp_path / "pack1", limit=12, threshold=0.58,
                   collection="oly", citations_path=cit)
    sev.write_pack(second, tmp_path / "pack2", limit=12, threshold=0.58,
                   collection="oly", citations_path=cit, overwrite=True)

    written = json.loads(cit.read_text(encoding="utf-8"))
    expected = sev.build_citations(second, limit=12, threshold=0.58,
                                   collection="oly")
    assert written == expected


def test_write_pack_is_a_noop_when_new_content_is_byte_identical(tmp_path):
    """A repeat run that changed nothing must not fail — only a real
    difference in content should trigger the refusal."""
    cit = tmp_path / "committed" / "2026-08-12-citations.json"
    results = [sev.QuestionResult(_q(), [_p("same body")], True)]

    sev.write_pack(results, tmp_path / "pack1", limit=12, threshold=0.58,
                   collection="oly", citations_path=cit)
    before = cit.read_text(encoding="utf-8")

    # no overwrite=True passed — must not raise, since content is identical
    sev.write_pack(results, tmp_path / "pack2", limit=12, threshold=0.58,
                   collection="oly", citations_path=cit)

    assert cit.read_text(encoding="utf-8") == before
