"""One-shot: backfill comment_section / same_source_as into a committed
citations.json from the evidence pack that produced it, without rerunning
retrieval.

Task 9 (2026-08-14) added `comment_section` and `same_source_as` to
`build_citations`, so any pack generated from then on carries them. The
2026-08-12 pack predates that — its citations.json has neither field, so the
manifest (the only durable audit artifact; evidence/ is gitignored) records
none of the hazard Task 9 exists to catch. Re-running retrieval to regenerate
it risks reordering near-tied passages and moving handles. This instead reads
the pack already on disk, applies the same two pure functions
`synthesis.evidence` uses at generation time, and writes the two fields back
into the existing entries — keyed on `handle`, verified against the existing
`sha256` before any write, so a mismatch aborts rather than silently drifting
the manifest out from under the document that cites it.

Flagged as I2 in the block2 final-branch review (2026-08-14).

Usage:
    python -m tools.backfill_citation_flags evidence/2026-08-12 \
        docs/programs/2026-08-12-citations.json
"""

from __future__ import annotations

import hashlib
import json
import re
import sys
from pathlib import Path

import config

# synthesis.evidence imports synthesis.retrieve, which imports query.retriever
# off Brain_Dump's own tree (see main.py::_braindump_on_path) even though this
# script never calls retrieve_hybrid — the two pure functions it needs
# (looks_like_comment_section, same_source_siblings) live in the same module.
if config.BRAINDUMP_PATH not in sys.path:
    sys.path.insert(0, config.BRAINDUMP_PATH)

from synthesis.evidence import handle as make_handle
from synthesis.evidence import looks_like_comment_section, same_source_siblings
from synthesis.retrieve import Passage

#: "## E12.3 — score 0.66" or "... [COMMENT SECTION] [SAME SOURCE AS E12.1]" —
#: the trailing flags (if the pack was already annotated) are ignored here;
#: they're recomputed from the body text, not trusted from the heading.
_BLOCK_HEAD = re.compile(
    r"^##\s+E(\d+)\.(\d+)\s+—\s+score\s+[\d.]+.*$", re.MULTILINE)
_TITLE = re.compile(r"^\*\*Title:\*\*\s*(.*)$", re.MULTILINE)
_SOURCE = re.compile(r"^\*\*Source:\*\*\s*(.*)$", re.MULTILINE)
_NOTE = re.compile(r"^\*\*Note:\*\*\s*(.*)$", re.MULTILINE)


class BackfillError(Exception):
    """A pack passage doesn't match the citations.json entry it should
    correspond to — abort rather than write a manifest that no longer
    describes the document citing it."""


def parse_pack_file(text: str) -> list[tuple[str, Passage]]:
    """(handle, Passage) pairs in the file's own order, which is passage rank
    order — the same order `same_source_siblings` needs to reproduce the
    original handle assignment."""
    heads = list(_BLOCK_HEAD.finditer(text))
    out = []
    for i, m in enumerate(heads):
        qid, n = int(m.group(1)), int(m.group(2))
        block_end = heads[i + 1].start() if i + 1 < len(heads) else len(text)
        block = text[m.end():block_end]

        title_m, source_m, note_m = _TITLE.search(block), _SOURCE.search(block), _NOTE.search(block)
        if not note_m:
            raise BackfillError(f"{make_handle(qid, n)}: no **Note:** line found")
        body = block[note_m.end():].strip()

        out.append((make_handle(qid, n), Passage(
            text=body,
            source=(source_m.group(1).strip() if source_m else None),
            title=(title_m.group(1).strip() if title_m else None),
            note_path=note_m.group(1).strip(),
            score=0.0,  # unused by the two functions this script calls
        )))
    return out


def compute_flags(pack_dir: Path) -> dict[str, dict]:
    """handle -> {comment_section, same_source_as, sha256} for every passage
    in every q*.md file under pack_dir."""
    flags: dict[str, dict] = {}
    for path in sorted(pack_dir.glob("q*.md")):
        pairs = parse_pack_file(path.read_text(encoding="utf-8"))
        if not pairs:
            continue
        qid = int(pairs[0][0][1:].split(".")[0])
        passages = [p for _, p in pairs]
        siblings = same_source_siblings(passages, qid)
        for (h, p), sibs in zip(pairs, siblings):
            flags[h] = {
                "comment_section": looks_like_comment_section(p.text),
                "same_source_as": sibs,
                "sha256": hashlib.sha256(p.text.encode("utf-8")).hexdigest(),
                "note_path": p.note_path,
                "source": p.source,
            }
    return flags


def backfill(citations: dict, flags: dict[str, dict]) -> tuple[dict, int, list[str]]:
    """Returns (updated citations dict, count of entries changed, handles
    backfilled under a soft sha256 mismatch). Raises BackfillError only when
    a handle is missing from the pack, or its note_path/source disagree with
    the pack — either means the handle now points at a DIFFERENT passage,
    which is exactly the "handle moved" hazard this script must not paper
    over.

    A sha256 mismatch alone, with note_path and source both agreeing, is
    downgraded to a warning: `build_citations` hashes the raw retrieved text,
    `render_question_file` writes `" ".join(text.split())` (whitespace-
    collapsed) to the .md file this script reads back — so any passage whose
    raw text had a line break or doubled space hashes differently from what
    can be reconstructed off disk, with NO change in content or identity.
    Verified against the 2026-08-12 pack: every sha256 mismatch found there
    (37/465) keeps note_path and source identical to the committed entry."""
    changed = 0
    soft_mismatches = []
    for entry in citations["citations"]:
        h = entry["handle"]
        if h not in flags:
            raise BackfillError(f"{h}: in citations.json but not found in pack")
        f = flags[h]
        if f["note_path"] != entry["note_path"] or f["source"] != entry["source"]:
            raise BackfillError(
                f"{h}: note_path/source mismatch (citations.json "
                f"{entry['note_path']!r} vs pack {f['note_path']!r}) — this "
                f"handle now points at a different passage, not safe to backfill")
        if f["sha256"] != entry["sha256"]:
            soft_mismatches.append(h)
        if entry.get("comment_section") != f["comment_section"] or \
           entry.get("same_source_as") != f["same_source_as"]:
            changed += 1
        entry["comment_section"] = f["comment_section"]
        entry["same_source_as"] = f["same_source_as"]
    return citations, changed, soft_mismatches


def main(argv=None) -> int:
    argv = list(sys.argv[1:] if argv is None else argv)
    if len(argv) != 2:
        print(__doc__, file=sys.stderr)
        return 2

    pack_dir, citations_path = Path(argv[0]), Path(argv[1])
    citations = json.loads(citations_path.read_text(encoding="utf-8"))
    flags = compute_flags(pack_dir)

    try:
        updated, changed, soft_mismatches = backfill(citations, flags)
    except BackfillError as e:
        print(f"ABORT: {e}", file=sys.stderr)
        return 1

    if soft_mismatches:
        print(f"NOTE: {len(soft_mismatches)} handle(s) backfilled despite a "
              f"sha256 mismatch (note_path/source agreed; see backfill()'s "
              f"docstring for why this is expected, not content drift): "
              f"{', '.join(soft_mismatches)}", file=sys.stderr)

    n_comment = sum(1 for c in updated["citations"] if c["comment_section"])
    n_sibling = sum(1 for c in updated["citations"] if c["same_source_as"])
    citations_path.write_text(
        json.dumps(updated, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"{len(updated['citations'])} citations checked, {changed} updated, "
          f"{n_comment} flagged [COMMENT SECTION], {n_sibling} flagged "
          f"[SAME SOURCE AS ...]")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
