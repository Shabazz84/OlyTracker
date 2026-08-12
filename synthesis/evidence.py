"""Persist retrieved passages for the whole question catalog, verbatim.

Retrieval reorders near-tied results between runs, so a bare citation number is
not reproducible and cannot be audited after the fact (recorded as an open item
in STATUS.md). Writing the passages to disk fixes that: `E12.3` stays resolvable
because question 12's third passage is in a file.

No LLM call happens here, by design — the same property that makes `main.py ask`
trustworthy. Nothing sits between the coach's words and the document.
"""

from __future__ import annotations

import json
import logging
from dataclasses import dataclass
from pathlib import Path

from synthesis.questions import QUESTIONS, Question
from synthesis.retrieve import Passage, retrieve_topic

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class QuestionResult:
    question: Question
    passages: list[Passage]
    covered: bool


def handle(qid: int, n: int) -> str:
    """The citation handle: question id, passage rank. Unpadded — `E1.3` reads
    the same as `E12.3` in prose."""
    return f"E{qid}.{n}"


def question_filename(q: Question) -> str:
    """Zero-padded so the pack directory sorts in catalog order."""
    return f"q{q.id:02d}-{q.key}.md"


def gather_evidence(embedder, store, *, limit: int, threshold: float,
                    questions: list[Question] | None = None,
                    vocab=None) -> list[QuestionResult]:
    """Retrieve for every question. A question with no hits is recorded as
    uncovered, never dropped — 'asked, and the corpus had nothing' is a finding,
    while a missing entry reads as 'never asked'.

    BackendUnavailable is deliberately NOT caught: a partial pack reported as a
    clean run would disguise an outage as a set of corpus gaps.
    """
    results = []
    for q in questions if questions is not None else QUESTIONS:
        passages = retrieve_topic(q.text, embedder, store,
                                  limit=limit, threshold=threshold, vocab=vocab)
        if not passages:
            logger.warning("no coverage for question %r", q.key)
        results.append(QuestionResult(q, passages, bool(passages)))
    return results


def render_question_file(result: QuestionResult, *, limit: int,
                         threshold: float) -> str:
    q = result.question
    head = [
        f"# E{q.id} — {q.key}",
        "",
        f"**Question:** {q.text}",
        f"**Retrieval:** limit {limit}, threshold {threshold}",
    ]

    if not result.covered:
        head += [
            "",
            "## NO COVERAGE",
            "",
            "No passage cleared the similarity threshold. The corpus does not "
            "cover this question. Do not fill the gap from memory — record it "
            "as a gap in the rebuild instead.",
            "",
        ]
        return "\n".join(head)

    n_sources = len({p.note_path for p in result.passages})
    head += [
        f"**Retrieved:** {len(result.passages)} passage(s) from {n_sources} source(s).",
        "",
    ]

    blocks = []
    for i, p in enumerate(result.passages, start=1):
        # Transcript bodies are one unwrapped blob; collapse so the file reads.
        body = " ".join(p.text.split())
        blocks.append("\n".join([
            f"## {handle(q.id, i)} — score {p.score:.2f}",
            "",
            f"**Title:** {p.title or '(untitled)'}",
            f"**Source:** {p.source or '(no source)'}",
            f"**Note:** {p.note_path}",
            "",
            body,
            "",
        ]))
    return "\n".join(head) + "\n".join(blocks)


def build_manifest(results: list[QuestionResult], *, limit: int,
                   threshold: float, collection: str) -> dict:
    return {
        "retrieval": {
            "limit": limit,
            "threshold": threshold,
            "collection": collection,
        },
        "questions": [
            {
                "id": r.question.id,
                "key": r.question.key,
                # Phrasing steers retrieval; persisting it makes that auditable.
                "text": r.question.text,
                "file": question_filename(r.question),
                "n_passages": len(r.passages),
                "n_sources": len({p.note_path for p in r.passages}),
                "covered": r.covered,
            }
            for r in results
        ],
    }


def render_readme(results: list[QuestionResult]) -> str:
    covered = sum(1 for r in results if r.covered)
    lines = [
        "# Evidence Pack",
        "",
        "Verbatim retrieved passages, one file per question. Citation handles "
        "are `E<question>.<passage>` — `E12.3` is the third passage in "
        "question 12's file.",
        "",
        "This directory is gitignored: it is raw transcript text. Regenerate "
        "with `python main.py evidence`.",
        "",
        f"**Coverage: {covered}/{len(results)} covered**",
        "",
        "| # | Key | Passages | Sources | Covered |",
        "|---|-----|----------|---------|---------|",
    ]
    for r in results:
        n_sources = len({p.note_path for p in r.passages})
        mark = "yes" if r.covered else "**NO**"
        lines.append(
            f"| {r.question.id} | {r.question.key} | {len(r.passages)} | "
            f"{n_sources} | {mark} |"
        )

    uncovered = [r.question.key for r in results if not r.covered]
    if uncovered:
        lines += [
            "",
            "## No coverage",
            "",
            "The corpus does not speak to these. They must appear in the "
            "rebuild as `[JUDGMENT — NO COVERAGE]`, never filled from memory.",
            "",
        ]
        lines += [f"- {k}" for k in uncovered]
    return "\n".join(lines) + "\n"


def write_pack(results: list[QuestionResult], out_dir, *, limit: int,
               threshold: float, collection: str) -> Path:
    out = Path(out_dir)
    out.mkdir(parents=True, exist_ok=True)

    for r in results:
        (out / question_filename(r.question)).write_text(
            render_question_file(r, limit=limit, threshold=threshold),
            encoding="utf-8")

    manifest = build_manifest(results, limit=limit, threshold=threshold,
                              collection=collection)
    (out / "manifest.json").write_text(
        json.dumps(manifest, indent=2, ensure_ascii=False), encoding="utf-8")
    (out / "README.md").write_text(render_readme(results), encoding="utf-8")
    return out
