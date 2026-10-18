"""The question catalog is the highest-leverage input to the rebuild: anything
missing here simply will not exist in the program. These tests guard its
structural invariants — contiguous ids so citation handles are unambiguous,
unique keys so filenames don't collide, and no athlete context so retrieval
stays unbiased."""

from synthesis.questions import QUESTIONS, Question

# Imported, never redefined: spelling the markers out here would itself trip
# the repo-wide guard (it scans every .py), and a second copy could drift from
# the real list. One definition, in the test that owns it.
from tests.test_no_athlete_context_leak import PROFILE_MARKERS


def test_catalog_has_forty_two_questions():
    assert len(QUESTIONS) == 42


def test_ids_are_contiguous_from_one():
    assert [q.id for q in QUESTIONS] == list(range(1, 43))


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


# ── Cue catalog ────────────────────────────────────────────────────────────
# One question per exercise, retrieved into its own pack so every cue in the
# app's EXERCISE_CATALOG `desc` traces to a verbatim passage.

import re  # noqa: E402
from pathlib import Path  # noqa: E402

from synthesis.questions import CUE_QUESTIONS  # noqa: E402

_APP = Path(__file__).resolve().parents[1] / "docs" / "src" / "app.jsx"


def _catalog_ids():
    return set(re.findall(r"^\s+(\w+):\s+\{ id:'\1'", _APP.read_text("utf-8"),
                          re.MULTILINE))


def test_cue_ids_are_contiguous_from_101():
    """Starting at 101 keeps E101.3 unambiguous next to the program packs'
    E1–E42 handles, which already appear in the app's older cue text."""
    assert [q.id for q in CUE_QUESTIONS] == list(
        range(101, 101 + len(CUE_QUESTIONS)))


def test_cue_ids_never_collide_with_the_program_catalog():
    assert not {q.id for q in CUE_QUESTIONS} & {q.id for q in QUESTIONS}


def test_cue_keys_are_exercise_catalog_ids():
    """The key names the exercise the cue is written for — a typo would
    produce a pack nobody can map back to a catalog entry."""
    ids = _catalog_ids()
    assert len(ids) > 100  # the regex really read the catalog
    for q in CUE_QUESTIONS:
        assert q.key in ids, q.key


def test_cue_keys_are_unique_and_filename_safe():
    keys = [q.key for q in CUE_QUESTIONS]
    assert len(set(keys)) == len(keys)
    for k in keys:
        assert k.replace("_", "").isalnum(), k


def test_cue_questions_are_topic_only():
    for q in CUE_QUESTIONS:
        assert "these coaches" in q.text, q.key
        low = q.text.lower()
        for marker in PROFILE_MARKERS:
            assert marker.lower() not in low, f"{q.key} leaks {marker!r}"
