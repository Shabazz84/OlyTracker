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
