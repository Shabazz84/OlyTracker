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
#:
#: This is a cheap pre-filter only, for OlyTracker's retired
#: `transcripts/web/last_manorg/...` layout. It does NOT catch current BRAINDUMP
#: output: files there are named `slugify(title, source)` = `<title-slug>-
#: <sha1(source)[:8]>.md` — the domain never appears in the filename. The
#: authoritative check is `is_excluded_source`, applied to the parsed
#: frontmatter `source` URL once it's known (see `index_dir`).
EXCLUDED_SOURCES = frozenset({"last_manorg"})

#: Domains excluded by frontmatter `source` URL — the layer that actually
#: catches BRAINDUMP-slugified filenames, which carry no domain hint.
EXCLUDED_SOURCE_DOMAINS = frozenset({"last-man.org"})


def _now_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def is_excluded(path: Path) -> bool:
    """True if the file belongs to an excluded source, by filename or parent dir.

    Cheap pre-filter for the retired `transcripts/web/last_manorg/...` layout
    only — see `is_excluded_source` for the check that covers current
    BRAINDUMP-slugified filenames.
    """
    name = path.name.lower()
    parts = {p.lower() for p in path.parts}
    return any(bad in name or bad in parts for bad in EXCLUDED_SOURCES)


def is_excluded_source(source: str | None) -> bool:
    """True if the frontmatter `source` URL belongs to an excluded domain.

    Case-insensitive substring match against `EXCLUDED_SOURCE_DOMAINS`, tolerant
    of `None`/missing `source`. This is the authoritative exclusion check: a
    BRAINDUMP-slugified filename never carries a domain hint, so the URL is the
    only place this can be caught.
    """
    if not source:
        return False
    lowered = source.lower()
    return any(domain in lowered for domain in EXCLUDED_SOURCE_DOMAINS)


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
    if len(vectors) != len(chunks):
        raise ValueError(
            f"build_points: {len(vectors)} vectors for {len(chunks)} chunks "
            f"in {note_path!r} — vectors must line up 1:1 with chunks"
        )
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
    number of notes successfully indexed (not chunks).

    A failure on one file (unreadable file, embedder unavailable, etc.) is
    logged with the filename and exception, then the loop moves on to the
    next file rather than aborting the whole ~1,936-file run. The failure
    count is logged in the completion summary so a run where every file
    failed is never silently indistinguishable from a clean pass — the
    return value only ever counts real successes.
    """
    transcript_dir = Path(transcript_dir)
    store.ensure_collection()
    indexed = 0
    failed = 0

    for path in sorted(transcript_dir.glob("*.md")):
        if is_excluded(path):
            logger.info("skip (excluded source): %s", path.name)
            continue
        note_path = path.name
        try:
            raw = path.read_text(encoding="utf-8", errors="replace")
            parsed, chunks = prepare(raw, note_path, chunk_chars, overlap_chars)
            if is_excluded_source(parsed.source):
                # First point the URL is known — a BRAINDUMP-slugified filename
                # carries no domain hint, so this can't happen in is_excluded.
                logger.info("skip (excluded source domain): %s (%s)",
                           note_path, parsed.source)
                continue
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
        except Exception:
            failed += 1
            logger.exception("failed to index %s", note_path)

    logger.info("index_dir complete: %d indexed, %d failed", indexed, failed)
    return indexed
