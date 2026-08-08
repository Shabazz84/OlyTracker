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
