"""Finding I2 (2026-08-16 final-branch review): Task 9's comment-section
detector shipped but was never run against the committed 2026-08-12 pack, so
the manifest — the only durable audit artifact, since evidence/ is gitignored
— carried neither flag. This is the one-shot that backfills them without
rerunning retrieval, which risks reordering near-tied passages and moving
handles. These tests cover the safety property that matters most: it must
never silently write a flag for a passage that isn't the one the citation
actually points at.
"""

import hashlib

import pytest

from tools.backfill_citation_flags import (
    BackfillError, backfill, compute_flags, parse_pack_file)


def _pack_text(qid, blocks):
    """blocks: list of (n, note_path, source, body) in passage-rank order."""
    lines = [f"# E{qid} — key", ""]
    for n, note_path, source, body in blocks:
        lines += [
            f"## E{qid}.{n} — score 0.66",
            "",
            "**Title:** T",
            f"**Source:** {source}",
            f"**Note:** {note_path}",
            "",
            body,
            "",
        ]
    return "\n".join(lines)


def _citation(handle, note_path, source, body, **extra):
    return {
        "handle": handle,
        "question_key": "key",
        "note_path": note_path,
        "source": source,
        "score": 0.66,
        "sha256": hashlib.sha256(body.encode("utf-8")).hexdigest(),
        **extra,
    }


def test_parse_pack_file_extracts_handle_and_body():
    text = _pack_text(1, [(1, "a.md", "https://x/1", "hello world")])
    pairs = parse_pack_file(text)
    assert [h for h, _ in pairs] == ["E1.1"]
    p = pairs[0][1]
    assert p.note_path == "a.md"
    assert p.source == "https://x/1"
    assert p.text == "hello world"


def test_backfill_writes_comment_section_and_same_source_for_matching_sha256(tmp_path):
    body1, body2 = "plain body one", "plain body two"
    citations = {"citations": [
        _citation("E1.1", "a.md", "https://x/1", body1),
        _citation("E1.2", "a.md", "https://x/1", body2),
    ]}
    text = _pack_text(1, [(1, "a.md", "https://x/1", body1),
                          (2, "a.md", "https://x/1", body2)])
    (tmp_path / "q01-key.md").write_text(text, encoding="utf-8")
    flags = compute_flags(tmp_path)

    updated, changed, soft = backfill(citations, flags)
    assert changed == 2
    assert soft == []
    e1, e2 = updated["citations"]
    assert e1["comment_section"] is False
    assert e1["same_source_as"] == ["E1.2"]
    assert e2["same_source_as"] == ["E1.1"]


def test_backfill_downgrades_sha256_only_mismatch_to_a_soft_warning():
    """build_citations hashes the raw retrieved text; the pack file on disk
    stores whitespace-collapsed text. A passage whose raw text had a line
    break hashes differently with no change in identity — verified this is
    exactly what happens on the real 2026-08-12 pack (37/465 handles)."""
    body = "plain body"
    citations = {"citations": [
        _citation("E1.1", "a.md", "https://x/1", body, sha256="not-the-real-hash"),
    ]}
    flags = {"E1.1": {
        "comment_section": False, "same_source_as": [],
        "sha256": hashlib.sha256(body.encode("utf-8")).hexdigest(),
        "note_path": "a.md", "source": "https://x/1",
    }}

    updated, changed, soft = backfill(citations, flags)
    assert soft == ["E1.1"]
    assert updated["citations"][0]["comment_section"] is False


def test_backfill_aborts_on_note_path_mismatch():
    """note_path disagreeing means the handle now points at a DIFFERENT
    passage than the one the manifest committed — a real "handle moved"
    hazard, not the harmless hashing artifact above. Must not backfill
    through it."""
    body = "plain body"
    citations = {"citations": [_citation("E1.1", "a.md", "https://x/1", body)]}
    flags = {"E1.1": {
        "comment_section": False, "same_source_as": [],
        "sha256": hashlib.sha256(body.encode("utf-8")).hexdigest(),
        "note_path": "different-note.md", "source": "https://x/1",
    }}

    with pytest.raises(BackfillError, match="note_path/source mismatch"):
        backfill(citations, flags)


def test_backfill_aborts_when_a_citation_handle_is_missing_from_the_pack():
    citations = {"citations": [_citation("E1.1", "a.md", "https://x/1", "body")]}
    with pytest.raises(BackfillError, match="not found in pack"):
        backfill(citations, {})


def test_compute_flags_detects_a_real_comment_signature(tmp_path):
    """End-to-end through the actual detector, not a hand-set flag — a
    commenter's name+date stamp is the signature `looks_like_comment_section`
    matches (see synthesis/evidence.py's _COMMENTER_STAMP)."""
    body = ("Article prose continues here for a while so this reads as real "
            "content. Jason September 17, 2015 I love this article, thanks.")
    (tmp_path / "q01-key.md").write_text(
        _pack_text(1, [(1, "a.md", "https://x/1", body)]), encoding="utf-8")

    flags = compute_flags(tmp_path)
    assert flags["E1.1"]["comment_section"] is True
