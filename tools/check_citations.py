"""Verify every citation in a rebuilt program resolves to a real passage.

A fabricated citation is indistinguishable from a real one by eye, and it would
make the entire artifact worthless — the document's only claim to authority is
that its numbers came from somewhere checkable. This resolves each handle
against the pack that produced it.

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

    print(f"OK: {len(cited)} citation(s) in {doc_path} all resolve "
          f"against {pack_dir}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
