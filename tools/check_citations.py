"""Verify every citation in a rebuilt program resolves to a real passage.

A fabricated citation is indistinguishable from a real one by eye, and it would
make the entire artifact worthless — the document's only claim to authority is
that its numbers came from somewhere checkable. This resolves each handle
against the pack that produced it.

It also checks every quotation: a `"quoted phrase" [E12.3]` pair must appear in
passage E12.3 itself — a resolvable handle can still carry a paraphrase that
reads exactly like the coach. Case, whitespace and curly apostrophes are
ignored; `...` marks an elision and `[word]` an editorial change, and the
fragments around them must appear in order.

Usage:
    python -m tools.check_citations docs/programs/<rebuild>.md evidence/<date>
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

#: E<question>.<passage> — the handle written by synthesis/evidence.py.
HANDLE_RE = re.compile(r"\bE(\d+)\.(\d+)\b")

#: Section heading in a pack file: "## E12.3 — score 0.66"
PACK_HANDLE_RE = re.compile(r"^##\s+E(\d+)\.(\d+)\b", re.MULTILINE)


def parse_handles(text: str) -> list[str]:
    """Every citation handle in document order, deduplicated."""
    seen, out = set(), []
    for m in HANDLE_RE.finditer(text):
        h = f"E{int(m.group(1))}.{int(m.group(2))}"
        if h not in seen:
            seen.add(h)
            out.append(h)
    return out


def pack_handles(pack_dir) -> set[str]:
    """Every handle the pack actually defines."""
    out = set()
    for path in Path(pack_dir).glob("q*.md"):
        text = path.read_text(encoding="utf-8")
        for m in PACK_HANDLE_RE.finditer(text):
            out.add(f"E{int(m.group(1))}.{int(m.group(2))}")
    return out


def unresolved(doc_text: str, pack_dir) -> list[str]:
    """Handles cited by the document that the pack does not define."""
    defined = pack_handles(pack_dir)
    return [h for h in parse_handles(doc_text) if h not in defined]


#: A double-quoted phrase (optionally *italic*) directly followed by one handle.
QUOTE_RE = re.compile(r'\*?"([^"\n]+)"\*?\s*\[(E\d+\.\d+)\]')

#: A pack section: heading, metadata lines, then the passage after **Note:**.
PACK_SECTION_RE = re.compile(r"^##\s+(E\d+\.\d+)\b[^\n]*\n(.*?)(?=^##\s+E\d|\Z)",
                             re.MULTILINE | re.DOTALL)


def _norm(text: str) -> str:
    """Letters and digits only, lowercased: punctuation, spacing, emphasis and
    apostrophe style never decide a match, while any changed word still does
    ("prove" is not "proves"). Unicode-aware, so Cyrillic quotes work too."""
    return "".join(ch for ch in text.lower() if ch.isalnum())


def pack_passages(pack_dir) -> dict[str, str]:
    """Handle -> passage text, as written to the pack."""
    out = {}
    for path in Path(pack_dir).glob("q*.md"):
        for h, body in PACK_SECTION_RE.findall(path.read_text(encoding="utf-8")):
            out[h] = body.split("**Note:**", 1)[-1].split("\n", 1)[-1]
    return out


def misquoted(doc_text: str, pack_dir) -> list[tuple[str, str]]:
    """(handle, quote) pairs whose quote is not in the passage the handle names.

    Handles the pack does not define are left to `unresolved`."""
    passages = pack_passages(pack_dir)
    bad = []
    for quote, h in QUOTE_RE.findall(doc_text):
        if h not in passages:
            continue
        text, pos = _norm(passages[h]), 0
        for frag in (f for f in re.split(r"\.\.\.|…|\[[^\]]*\]", quote) if f.strip()):
            pos = text.find(_norm(frag), pos)
            if pos < 0:
                bad.append((h, quote))
                break
            pos += len(_norm(frag))
    return bad


def main(argv=None) -> int:
    argv = list(sys.argv[1:] if argv is None else argv)
    if len(argv) != 2:
        print(__doc__, file=sys.stderr)
        return 2

    doc_path, pack_dir = Path(argv[0]), Path(argv[1])
    text = doc_path.read_text(encoding="utf-8")
    cited = parse_handles(text)
    missing = unresolved(text, pack_dir)

    if missing:
        print(f"FAIL: {len(missing)} unresolved citation(s) in {doc_path}:",
              file=sys.stderr)
        for h in missing:
            print(f"  {h}", file=sys.stderr)
        return 1

    bad_quotes = misquoted(text, pack_dir)
    if bad_quotes:
        print(f"FAIL: {len(bad_quotes)} quote(s) in {doc_path} not found in "
              "the passage they cite:", file=sys.stderr)
        for h, quote in bad_quotes:
            print(f'  [{h}] "{quote}"', file=sys.stderr)
        return 1

    n_quotes = len(QUOTE_RE.findall(text))
    print(f"OK: {len(cited)} citation(s) in {doc_path} all resolve "
          f"against {pack_dir}; {n_quotes} quote(s) match their passages")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
