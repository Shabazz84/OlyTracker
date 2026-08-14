"""Persist retrieved passages for the whole question catalog, verbatim.

Retrieval reorders near-tied results between runs, so a bare citation number is
not reproducible and cannot be audited after the fact (recorded as an open item
in STATUS.md). Writing the passages to disk fixes that: `E12.3` stays resolvable
because question 12's third passage is in a file.

No LLM call happens here, by design — the same property that makes `main.py ask`
trustworthy. Nothing sits between the coach's words and the document.
"""

from __future__ import annotations

import hashlib
import json
import logging
import re
from dataclasses import dataclass
from pathlib import Path

from synthesis.questions import QUESTIONS, Question
from synthesis.retrieve import Passage, retrieve_topic

logger = logging.getLogger(__name__)


# --------------------------------------------------------------------------
# Comment-section detection
#
# Article pages scrape whole, so a chunk of the reader comment thread carries
# the article's real title, source URL and note path. In the pack file, in
# citations.json and to tools/check_citations.py it is indistinguishable from
# the coach's own words — two positions in the Block 2 document were attributed
# to coaches when the passage was a reader asking a question.
#
# This is a HEURISTIC and it is ADVISORY. A flagged passage is still written in
# full, still numbered, still citable; the flag only tells a reader to check who
# is speaking. A false positive costs ten seconds. A false negative is what
# shipped a reader's comment as a coach's prescription — so the patterns below
# are tuned to catch the real cases, and each one is justified against the real
# pack in .superpowers/sdd/2026-08-12-block2/task-9-report.md.
# --------------------------------------------------------------------------

_MONTH = (r"(?:January|February|March|April|May|June|July|August|September"
          r"|October|November|December)")

#: One capitalised word of a display name. Accented letters included on
#: purpose: `Jord Gabriël July 8, 2019` is a real commenter in the pack.
_NAME_TOKEN = r"[A-ZÀ-Þ][A-Za-zÀ-ɏ'’.\-]*"

#: A display name (1–3 tokens) immediately followed by a full date: the
#: signature every commenter's post carries. Bare dates are deliberately NOT
#: matched — coaches narrate dates in prose ("back in March 2019 I...").
_COMMENTER_STAMP = re.compile(
    rf"(?<![A-Za-z]){_NAME_TOKEN}(?:\s+{_NAME_TOKEN}){{0,2}}\s+{_MONTH}"
    rf"\s+\d{{1,2}},\s+\d{{4}}"
)

#: The article BYLINE has the identical shape to a commenter stamp
#: (`Greg Everett July 9, 2012`) and is followed by the site's related-articles
#: nav. Without this suppressor every article-head chunk in the pack flags —
#: 20 false positives out of 68 raw stamp hits, and they are exactly the
#: passages the Block 2 document leans on hardest.
_BYLINE_TAIL = re.compile(r"\s*See Related Articles")

#: The boundary the page prints between the article and its thread. A count of
#: zero means the chunk ran into the author bio, not into comments.
_COMMENT_THREAD_HEADER = re.compile(
    r"\b[1-9]\d*\s+Comments?\b[\s\S]{0,60}?log in to post a comment",
    re.IGNORECASE)

#: Page furniture printed *after* the article: the author-bio block, the
#: read-more link and the site footer. Exact site strings, so effectively zero
#: false-positive risk — and the bio tail is what catches a chunk whose comment
#: text was cut off before any date stamp survived into it (E11.9, E38.11 in
#: the 2026-08-12 pack both open mid-question and run straight into the bio).
_FOOTER_TAIL = re.compile(
    r"(\bRead more by\b"
    r"|All content\s*\S{0,3}\s*Catalyst Athletics"
    r"|Website by Greg Everett"
    r"|\bis the owner of Catalyst Athletics\b"
    r"|\bis a weightlifter for Team Catalyst Athletics\b)",
    re.IGNORECASE)


def comment_signatures(text: str) -> list[str]:
    """Names of the comment-thread signatures present in `text`.

    Returned as names rather than a bare bool so a reader (and the report) can
    see *why* a passage flagged, and so a bad pattern can be retired on
    evidence instead of on impression.
    """
    found = []
    if any(not _BYLINE_TAIL.match(text[m.end():m.end() + 25])
           for m in _COMMENTER_STAMP.finditer(text)):
        found.append("commenter_stamp")
    if _COMMENT_THREAD_HEADER.search(text):
        found.append("thread_header")
    if _FOOTER_TAIL.search(text):
        found.append("footer_tail")
    return found


def looks_like_comment_section(text: str) -> bool:
    """True if the passage carries reader-comment or page-furniture text.

    Advisory only. Nothing in this module drops, truncates or reorders a
    flagged passage.
    """
    return bool(comment_signatures(text))


def same_source_siblings(passages: list[Passage], qid: int) -> list[list[str]]:
    """For each passage, the handles of the OTHER passages in the same
    question that came from the same note.

    Overlapping chunks of one source read as independent corroboration: `E20.7`
    and `E20.10` are consecutive chunks of one video, and E20.10 opens with
    E20.7's closing words. Citing both looks like two sources agreeing; it is
    one source quoted twice. `note_path` equality is a fact, not a heuristic,
    so this is exact.

    Scoped to a single question on purpose — the same note turning up under two
    different questions says nothing about corroboration inside one answer.
    """
    by_note: dict[str, list[str]] = {}
    for i, p in enumerate(passages, start=1):
        by_note.setdefault(p.note_path, []).append(handle(qid, i))
    return [[h for h in by_note[p.note_path] if h != handle(qid, i)]
            for i, p in enumerate(passages, start=1)]


class CitationsConflictError(Exception):
    """Raised when write_pack would silently replace a committed citations
    manifest whose content differs from this run's.

    Retrieval reorders near-tied passages between runs, so a second run on
    the same date can produce a different handle->sha256 mapping. Since the
    whole point of the manifest is a re-resolvable citation trail, replacing
    it without the operator noticing is an audit-trail gap, not a routine
    overwrite. Pass overwrite=True to replace it deliberately."""


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

    siblings = same_source_siblings(result.passages, q.id)

    blocks = []
    for i, p in enumerate(result.passages, start=1):
        # Transcript bodies are one unwrapped blob; collapse so the file reads.
        body = " ".join(p.text.split())
        # Advisory markers only: the passage below is written in full either
        # way. They sit on the heading so a reader sees them before the text.
        flags = ""
        if looks_like_comment_section(p.text):
            flags += " [COMMENT SECTION]"
        if siblings[i - 1]:
            flags += f" [SAME SOURCE AS {', '.join(siblings[i - 1])}]"
        blocks.append("\n".join([
            f"## {handle(q.id, i)} — score {p.score:.2f}{flags}",
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


def build_citations(results: list[QuestionResult], *, limit: int,
                    threshold: float, collection: str) -> dict:
    """One record per retrieved passage, committed to git alongside the
    document that cites it.

    Retrieval reorders near-tied results between runs, so `E31.4` on Tuesday
    need not be `E31.4` on Wednesday. This pins each handle to a content hash,
    which proves identity on a later run WITHOUT storing the passage text —
    the pack itself is gitignored transcript material and must stay that way.
    Human-readable auditing comes from the document, which quotes inline.
    """
    entries = []
    for r in results:
        siblings = same_source_siblings(r.passages, r.question.id)
        for i, p in enumerate(r.passages, start=1):
            entries.append({
                "handle": handle(r.question.id, i),
                "question_key": r.question.key,
                "note_path": p.note_path,
                "source": p.source,
                "score": p.score,
                "sha256": hashlib.sha256(p.text.encode("utf-8")).hexdigest(),
                # Structural signals only — a quote here would put transcript
                # text in git. See looks_like_comment_section (advisory) and
                # same_source_siblings (exact).
                "comment_section": looks_like_comment_section(p.text),
                "same_source_as": siblings[i - 1],
            })
    return {
        "retrieval": {
            "limit": limit,
            "threshold": threshold,
            "collection": collection,
        },
        "citations": entries,
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
        "## Passage markers",
        "",
        "Both markers are advisory. No passage is ever dropped, truncated or "
        "reordered because of them.",
        "",
        "- `[COMMENT SECTION]` — the passage carries reader-comment or "
        "page-footer text. Article pages scrape whole, so a comment thread "
        "arrives with the article's real title, source URL and note path. "
        "**Check who is speaking before citing it.** This is a heuristic: it "
        "can miss a comment, and it can flag a chunk whose article body is "
        "mostly intact but whose tail runs into the thread.",
        "- `[SAME SOURCE AS ...]` — the listed passages came from the same "
        "note as this one. Citing them together is **not** two sources "
        "agreeing; it is one source quoted twice. Exact, not heuristic, and "
        "scoped to this question only.",
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
               threshold: float, collection: str,
               citations_path=None, overwrite: bool = False) -> Path:
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

    if citations_path is not None:
        cit = Path(citations_path)
        cit.parent.mkdir(parents=True, exist_ok=True)
        new_content = json.dumps(
            build_citations(results, limit=limit, threshold=threshold,
                            collection=collection),
            indent=2, ensure_ascii=False)

        if cit.exists():
            existing_content = cit.read_text(encoding="utf-8")
            if existing_content == new_content:
                pass  # byte-identical — nothing to do, not an error
            elif not overwrite:
                raise CitationsConflictError(
                    f"{cit} already exists and differs from this run's "
                    "citations (retrieval reorders near-tied passages "
                    "between runs, so this is expected, not a bug). "
                    "Refusing to silently replace a committed manifest. "
                    "Pass overwrite=True (CLI: --overwrite-citations) to "
                    "replace it deliberately."
                )
            else:
                cit.write_text(new_content, encoding="utf-8")
        else:
            cit.write_text(new_content, encoding="utf-8")

    return out
