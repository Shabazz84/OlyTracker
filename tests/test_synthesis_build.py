import sys

import config

sys.path.insert(0, config.BRAINDUMP_PATH)

import pytest  # noqa: E402

from synthesis import build as sbuild  # noqa: E402
from synthesis import prompts as sprompts  # noqa: E402
from synthesis.retrieve import Passage  # noqa: E402
from tests.test_no_athlete_context_leak import PROFILE_MARKERS  # noqa: E402


def _p(text, n=1):
    return Passage(text, f"https://y/{n}", f"Title {n}", f"{n}.md", 0.7)


def test_athlete_context_appears_only_in_the_synthesis_prompt():
    assert "{athlete_context}" in sprompts.SYNTHESIS_PROMPT
    # Topic questions must carry no athlete-SPECIFIC marker. General coaching
    # vocabulary ("back pain", "overhead squat") is exactly what we want to
    # retrieve on and is not a leak; what must never appear is this athlete's
    # identifying profile, which would bias the retrieval query itself.
    #
    # Markers are pulled from the leak-guard test's own canonical list rather
    # than duplicated here as literals — this file is itself scanned by that
    # guard (it's not in its ALLOWED set), so a literal copy of e.g. "primary
    # snatch limiter" here would trip the guard as a false-positive "leak".
    for topic in sprompts.TOPICS:
        q = topic.question.lower()
        assert "night shift" not in q
        for marker in PROFILE_MARKERS:
            assert marker.lower() not in q


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


def test_render_context_numbers_continuously_across_covered_topics():
    # Citation numbering must be one continuous sequence across ALL covered
    # topics, not reset per topic — that's what makes every [N] in the final
    # document traceable to exactly one passage. An uncovered topic sits
    # between the two covered ones here specifically to prove it consumes no
    # number: a regression that reset the counter per topic, or that assigned
    # a number to skipped topics, would still pass every other existing test.
    results = [
        sbuild.TopicResult(sprompts.TOPICS[0], [_p("first passage", 1), _p("second passage", 2)], True),
        sbuild.TopicResult(sprompts.TOPICS[1], [], False),
        sbuild.TopicResult(sprompts.TOPICS[2], [_p("third passage", 3)], True),
    ]

    context = sbuild._render_context(results)

    assert "[1] Title 1" in context
    assert "[2] Title 2" in context
    assert "[3] Title 3" in context
    # the uncovered topic in between contributes no block and no number
    assert sprompts.TOPICS[1].key not in context
    assert context.count("[1]") == 1
    assert context.count("[2]") == 1
    assert context.count("[3]") == 1
    assert "[4]" not in context


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
