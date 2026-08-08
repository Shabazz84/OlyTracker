"""Index BRAINDUMP-persisted transcripts into OlyTracker's own Qdrant collection.

Runs on the Z840, where the transcripts, the embedder, and Qdrant all live —
see the spec's deployment split. Imports Brain_Dump's chunker/embedder/store
rather than reimplementing them, so retrieval behaviour cannot drift from the
pipeline that produced the data.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from pathlib import Path

from indexer.chunker import chunk_note, embed_text
from indexer.note_parser import parse_note
from indexer.vector_store import Point, point_id

logger = logging.getLogger(__name__)

#: last-man.org carries a site-wide WordPress compromise — a PHP eval() backdoor
#: header and a gambling spam-link footer on every scraped page. The old pipeline
#: was safe only because Claude's summarization layer stripped it; indexing RAW
#: transcripts bypasses that entirely, so the source is excluded outright.
EXCLUDED_SOURCES = frozenset({"last_manorg"})


def _now_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def is_excluded(path: Path) -> bool:
    """True if the file belongs to an excluded source, by filename or parent dir."""
    name = path.name.lower()
    parts = {p.lower() for p in path.parts}
    return any(bad in name or bad in parts for bad in EXCLUDED_SOURCES)


def prepare(raw: str, note_path: str, chunk_chars: int, overlap_chars: int):
    """Parse one transcript file and chunk its body — once.

    Returns `(parsed, chunks)`. Callers embed `chunks` and hand both back to
    `build_points`, so nothing re-parses or re-chunks the same file.
    """
    parsed = parse_note(raw)
    chunks = chunk_note(parsed.body, Path(note_path).stem,
                        chunk_chars, overlap_chars)
    return parsed, chunks


def build_points(parsed, chunks, note_path: str,
                 vectors: list[list[float]]) -> list[Point]:
    """Turn a prepared transcript into Qdrant points.

    `vectors` must line up 1:1 with `chunks` — callers embed in a separate step
    so embedding can be batched.
    """
    now = _now_iso()
    return [
        Point(
            id=point_id(note_path, c.chunk_index),
            vector=v,
            payload={
                "note_path": note_path,
                "chunk_index": c.chunk_index,
                "chunk_count": len(chunks),
                "text": c.body,
                "heading": c.heading,
                "source": parsed.source,
                "title": parsed.title,
                "source_type": parsed.source_type,
                "extracted_at": parsed.extracted_at,
                "indexed_at": now,
            },
        )
        for c, v in zip(chunks, vectors)
    ]


def index_dir(transcript_dir, store, embedder, *, chunk_chars: int,
              overlap_chars: int) -> int:
    """Index every non-excluded transcript in `transcript_dir`. Returns the
    number of notes indexed (not chunks)."""
    transcript_dir = Path(transcript_dir)
    store.ensure_collection()
    indexed = 0

    for path in sorted(transcript_dir.glob("*.md")):
        if is_excluded(path):
            logger.info("skip (excluded source): %s", path.name)
            continue
        raw = path.read_text(encoding="utf-8", errors="replace")
        note_path = path.name
        parsed, chunks = prepare(raw, note_path, chunk_chars, overlap_chars)
        if not chunks:
            logger.warning("no chunks (empty body): %s", note_path)
            continue
        vectors = embedder.embed([embed_text(c) for c in chunks])
        points = build_points(parsed, chunks, note_path, vectors)
        # Delete-then-upsert AFTER a successful embed, matching the Phase 1
        # consumer: if embedding fails, stale vectors remain rather than the
        # note going unindexed entirely.
        store.delete_by_note(note_path)
        store.upsert(points)
        indexed += 1
        logger.info("indexed %s (%d chunks)", note_path, len(chunks))

    return indexed
