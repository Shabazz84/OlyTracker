"""Retrieve source passages for one synthesis topic.

Thin wrapper over Brain_Dump's hybrid retriever, differing only in budget: a
synthesis section needs breadth (~30 chunks), while the chat path is tuned to
qdrant.max_chunks=5 for a single conversational answer.
"""

from __future__ import annotations

from dataclasses import dataclass

from query.retriever import retrieve_hybrid


@dataclass(frozen=True)
class Passage:
    text: str
    source: str | None
    title: str | None
    note_path: str
    score: float


def retrieve_topic(question: str, embedder, store, *, limit: int,
                   threshold: float, vocab=None) -> list[Passage]:
    """Passages for one topic query, best first. Empty list means the corpus has
    no coverage — callers MUST record that as a gap rather than proceeding."""
    hits = retrieve_hybrid(question, embedder, store, limit, threshold, vocab)
    return [
        Passage(
            text=h.payload.get("text", ""),
            source=h.payload.get("source"),
            title=h.payload.get("title"),
            note_path=h.payload.get("note_path", ""),
            score=h.score,
        )
        for h in hits
    ]


def format_passages(passages: list[Passage]) -> str:
    """A numbered context block. The numbers are the citation handles the
    synthesis prompt requires the model to cite, which is what makes every
    claim in the output traceable back to a real retrieved chunk."""
    if not passages:
        return "(no passages retrieved)"
    blocks = []
    for i, p in enumerate(passages, start=1):
        label = p.title or p.note_path
        origin = f"{label} — {p.source}" if p.source else label
        blocks.append(f"[{i}] {origin}\n{p.text}")
    return "\n\n".join(blocks)
