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


# ------------------------------------------------- comment-section flagging

# EVERY FIXTURE BELOW IS INVENTED. Names, dates, article prose, bylines and
# site name are written for these tests. None is copied from — or paraphrased
# from — a pack passage: `evidence/` and `transcripts/` are gitignored raw
# transcript text and CLAUDE.md forbids committing any of it, the more so
# because the corpus includes material from a source with a known site-wide
# compromise.
#
# What a fixture reproduces is the SHAPE the detector keys on. Where a trigger
# is an exact site-boilerplate string it is quoted from the pattern in
# `synthesis/evidence.py` (which is where that string lives in this repo), and
# everything around it is invented.

# A comment thread, as it arrives from a whole-page scrape: the article's
# title, source URL and note path are identical to a body chunk's, and the
# text is the only thing that gives it away.
COMMENT_BODY = (
    "the bar drifts forward on me every single rep and I cannot work out why. "
    "Hallvard Ostrowski March 4, 2011 Marguerite, that is nearly always a "
    "balance problem rather than a strength one. Film yourself from the side "
    "before you put another kilo on the bar."
)

ARTICLE_BODY = (
    "A lifter who cannot hold a flat back under a moderate load will not "
    "suddenly discover one under a heavy load. Build the position first with "
    "submaximal work and let the weight follow it. The order matters a great "
    "deal more than the numbers do."
)

# The head of a scraped article: site nav, then the BYLINE — author plus date,
# the exact shape of a commenter signature — then article prose. Flagging this
# would be a false positive, and it is the most common near-miss in the pack:
# without the byline suppressor, 20 of 68 raw stamp hits are article heads.
ARTICLE_HEAD_WITH_BYLINE = (
    "Holding the Flat Back Under Load by Hallvard Ostrowski - Barbell Notes "
    "Coaching & Programming Articles Login / Register Subscribe "
    "Articles > Program Design Holding the Flat Back Under Load "
    "Hallvard Ostrowski May 6, 2009 See Related Articles A lifter who cannot "
    "hold a flat back under a moderate load will not suddenly discover one "
    "under a heavy load."
)


def test_comment_signature_is_detected():
    assert sev.looks_like_comment_section(COMMENT_BODY) is True


def test_plain_article_prose_is_not_flagged():
    assert sev.looks_like_comment_section(ARTICLE_BODY) is False


def test_article_byline_is_not_mistaken_for_a_commenter_signature():
    """A byline (`<author> <Month DD, YYYY>`) sits at the top of every scraped
    article and has the exact shape of a commenter stamp. The site's
    `See Related Articles` nav immediately after it is what separates the
    two, and per-occurrence suppression means a chunk carrying a byline AND a
    comment still flags."""
    assert sev.looks_like_comment_section(ARTICLE_HEAD_WITH_BYLINE) is False


def test_a_byline_does_not_suppress_a_real_comment_later_in_the_chunk():
    """Suppression is per occurrence, not per passage."""
    body = (ARTICLE_HEAD_WITH_BYLINE
            + " Marguerite Okonkwo August 19, 2013 this finally made it click "
              "for me, thank you.")
    assert sev.looks_like_comment_section(body) is True


def test_comment_thread_boundary_marker_is_detected():
    body = ("...and that is the whole of the fix. Related Articles "
            "Bracing Before The Pull Hallvard Ostrowski | Program Design "
            "2 Comments Please log in to post a comment finally something "
            "here that made sense to me, thank you")
    assert sev.looks_like_comment_section(body) is True


def test_zero_comments_boundary_is_not_flagged():
    """`0 Comments` means the chunk ran into the author bio, not a thread."""
    body = ("...and that is the whole of the fix. 0 Comments Please log in to "
            "post a comment Ingrid Vasseur coaches at a small club in Lyon.")
    assert sev.looks_like_comment_section(body) is False


def test_a_quoted_reader_question_in_an_article_body_is_deliberately_not_flagged():
    """A DIFFERENT hazard, deliberately out of scope. `Ask the coach` article
    formats quote the reader's question inside the authored body — the
    reader's words, but not a comment thread. Nine passages in the 2026-08-12
    pack are this shape (E9.6, E11.10, E13.2, E13.5, E14.2, E17.3, E17.5,
    E17.10, E18.6). Marking them `[COMMENT SECTION]` would be false, and would
    teach a reader to distrust the coach's own answers. It wants its own
    marker; recorded in task-9-report.md instead."""
    body = ("Marguerite Asks : how heavy should my pulls be next to my best "
            "clean? Coach Says: heavier is not automatically better — past a "
            "point you are simply training a different movement.")
    assert sev.looks_like_comment_section(body) is False


def test_site_footer_tail_is_detected():
    body = ("so keep the first pull patient and let the bar stay close to you. "
            "Read more by Ingrid Vasseur Subscribe All content (c) Barbell "
            "Notes, Inc.")
    assert sev.looks_like_comment_section(body) is True


def test_every_footer_boilerplate_branch_is_detected():
    """Branch coverage for `_FOOTER_TAIL`. Each string below is quoted from the
    pattern in `synthesis/evidence.py` — it is site boilerplate the detector is
    *defined* by, not anyone's words and not a pack passage — and the prose
    around it is invented for this test."""
    for boilerplate in ("Read more by Ingrid Vasseur",
                        "All content (c) Catalyst Athletics, Inc.",
                        "Website by Greg Everett",
                        "A. Coach is the owner of Catalyst Athletics",
                        "R. Lifter is a weightlifter for Team Catalyst Athletics"):
        body = f"keep the bar close and stay patient off the floor. {boilerplate}"
        assert sev.looks_like_comment_section(body) is True, boilerplate


def test_author_bio_tail_is_detected():
    """Two passages in the real pack open mid-reader-question and run straight
    into the site's author-bio block, with no date stamp surviving into the
    chunk (E11.9, E38.11) — the bio tail is the only thing that catches them.

    The question here is invented. The bio phrase is the site boilerplate that
    `_FOOTER_TAIL` matches, quoted from the pattern in `synthesis/evidence.py`
    rather than from any passage, and everything around it is written for this
    test."""
    bio_boilerplate = "is the owner of Catalyst Athletics"   # from _FOOTER_TAIL
    body = ("I keep missing the jerk behind me once I get tired. Is that a "
            "strength problem or a timing problem? Thanks! A. Coach "
            + bio_boilerplate + " and has coached for eleven years.")
    assert sev.looks_like_comment_section(body) is True


def test_comment_signatures_names_why_a_passage_flagged():
    """Named signatures, not a bare bool, so a bad pattern can be retired on
    evidence rather than on impression."""
    assert sev.comment_signatures(COMMENT_BODY) == ["commenter_stamp"]
    assert sev.comment_signatures(ARTICLE_BODY) == []


def test_render_marks_a_comment_passage_and_still_writes_it_in_full():
    """Advisory, never exclusionary: the flag is a warning to a reader, not a
    filter. A dropped or truncated passage would be a worse failure than the
    misattribution the flag exists to prevent."""
    r = sev.QuestionResult(_q(3, "deload_frequency"), [_p(COMMENT_BODY)], True)
    out = sev.render_question_file(r, limit=12, threshold=0.58)

    assert "## E3.1 — score 0.66 [COMMENT SECTION]" in out
    assert "Film yourself from the side before you put another kilo on the " \
           "bar." in out


def test_render_leaves_an_ordinary_passage_heading_untouched():
    r = sev.QuestionResult(_q(3, "deload_frequency"), [_p(ARTICLE_BODY)], True)
    out = sev.render_question_file(r, limit=12, threshold=0.58)

    assert "## E3.1 — score 0.66\n" in out
    assert "COMMENT SECTION" not in out


def test_comment_flag_does_not_break_the_citation_checker_handle_regex():
    from tools.check_citations import PACK_HANDLE_RE

    r = sev.QuestionResult(_q(3, "deload_frequency"), [_p(COMMENT_BODY)], True)
    out = sev.render_question_file(r, limit=12, threshold=0.58)

    assert [f"E{m.group(1)}.{m.group(2)}" for m in PACK_HANDLE_RE.finditer(out)] \
        == ["E3.1"]


# --------------------------------------------------- same-source disclosure


def test_render_discloses_two_passages_sharing_a_note_path():
    """Overlapping chunks of one video read as two sources agreeing. They are
    one source quoted twice — `note_path` equality is a fact, not a guess."""
    r = sev.QuestionResult(
        _q(20, "squat_reps_long_limbs"),
        [_p("a", note_path="tall.md"), _p("b", note_path="other.md"),
         _p("c", note_path="tall.md")],
        True)
    out = sev.render_question_file(r, limit=12, threshold=0.58)

    assert "## E20.1 — score 0.66 [SAME SOURCE AS E20.3]" in out
    assert "## E20.3 — score 0.66 [SAME SOURCE AS E20.1]" in out
    assert "## E20.2 — score 0.66\n" in out


def test_render_lists_every_sibling_when_a_source_appears_three_times():
    r = sev.QuestionResult(
        _q(20, "squat_reps_long_limbs"),
        [_p("a", note_path="t.md"), _p("b", note_path="t.md"),
         _p("c", note_path="t.md")],
        True)
    out = sev.render_question_file(r, limit=12, threshold=0.58)

    assert "## E20.1 — score 0.66 [SAME SOURCE AS E20.2, E20.3]" in out


def test_a_lone_passage_discloses_nothing():
    r = sev.QuestionResult(_q(20, "squat_reps_long_limbs"),
                           [_p("a", note_path="t.md")], True)
    out = sev.render_question_file(r, limit=12, threshold=0.58)

    assert "SAME SOURCE" not in out


def test_both_signals_can_appear_on_one_heading():
    r = sev.QuestionResult(
        _q(37, "technique_under_load"),
        [_p(COMMENT_BODY, note_path="a.md"), _p(COMMENT_BODY, note_path="a.md")],
        True)
    out = sev.render_question_file(r, limit=12, threshold=0.58)

    assert "## E37.1 — score 0.66 [COMMENT SECTION] [SAME SOURCE AS E37.2]" in out


def test_same_source_disclosure_is_scoped_to_one_question():
    """Cross-question overlap is out of scope — E20.1 and E42.1 sharing a note
    is expected and says nothing about corroboration inside one answer."""
    results = [
        sev.QuestionResult(_q(20, "squat_reps_long_limbs"),
                           [_p("a", note_path="shared.md")], True),
        sev.QuestionResult(Question(42, "second_pull_timing", "What about the second pull?"),
                           [_p("b", note_path="shared.md")], True),
    ]
    for r in results:
        assert "SAME SOURCE" not in sev.render_question_file(
            r, limit=12, threshold=0.58)


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


def test_citations_carry_the_comment_section_flag():
    results = [sev.QuestionResult(_q(3, "deload_frequency"),
                                  [_p(COMMENT_BODY), _p(ARTICLE_BODY)], True)]
    c = sev.build_citations(results, limit=12, threshold=0.58, collection="oly")

    assert c["citations"][0]["comment_section"] is True
    assert c["citations"][1]["comment_section"] is False


def test_citations_carry_same_source_sibling_handles():
    results = [sev.QuestionResult(
        _q(20, "squat_reps_long_limbs"),
        [_p("a", note_path="t.md"), _p("b", note_path="u.md"),
         _p("c", note_path="t.md")],
        True)]
    c = sev.build_citations(results, limit=12, threshold=0.58, collection="oly")

    assert c["citations"][0]["same_source_as"] == ["E20.3"]
    assert c["citations"][1]["same_source_as"] == []
    assert c["citations"][2]["same_source_as"] == ["E20.1"]


def test_citations_signals_add_no_transcript_text():
    """The new signals are structural. The manifest is committed; the pack is
    not. One quoted word here would put transcript text in the repo."""
    body = COMMENT_BODY + " zzdistinctivetranscriptphrasezz"
    c = sev.build_citations([sev.QuestionResult(_q(), [_p(body)], True)],
                            limit=12, threshold=0.58, collection="oly")

    assert "zzdistinctivetranscriptphrasezz" not in json.dumps(c)
    assert "Ostrowski" not in json.dumps(c)
    assert c["citations"][0]["comment_section"] is True


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
