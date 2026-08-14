"""Verify a program document's prose against its own prescriptions.

`tools/check_citations.py` proves a citation handle exists in the pack. It
cannot prove the sentence around the handle agrees with the table under it —
and that is where four fix rounds on the Block 2 document went: prose asserting
more than the prescriptions delivered, counts that did not match the rows they
counted, and questions declared unusable whose handles the document cited
anyway. Each of those was caught by a human reading carefully. This makes them
mechanical.

Three checks fail the run:

* **Table structure** — exactly one header row, one delimiter row, a consistent
  column count, at least one body row, and a blank line before any following
  paragraph. An orphan header swallows the paragraph beneath it: under GFM a
  table body ends at a blank line, not at a paragraph, so a safety note glued
  to a table renders as a mangled one-cell row.
* **Stated count vs actual rows** — "Fourteen items" above a 13-row table.
* **Claimed unusable but cited anyway** — a question named in a
  "returned nothing usable" list whose handles the prescriptive body cites.

One check is advisory and only fails under `--strict`:

* **Unscoped absolute claims** — "Every cell ...", "No cell ...". These are
  true of the loading weeks and false of the back-off and test weeks, which is
  exactly how one shipped. A scoped version ("In loading weeks 9-14, no cell
  ...") is accepted silently.

Usage:
    python -m tools.check_claims docs/programs/<document>.md [--strict]
"""

from __future__ import annotations

import re
import sys
from dataclasses import dataclass
from pathlib import Path

#: Number words a document actually uses to count its own rows.
NUMBER_WORDS = {
    "one": 1, "two": 2, "three": 3, "four": 4, "five": 5, "six": 6,
    "seven": 7, "eight": 8, "nine": 9, "ten": 10, "eleven": 11,
    "twelve": 12, "thirteen": 13, "fourteen": 14, "fifteen": 15,
    "sixteen": 16, "seventeen": 17, "eighteen": 18, "nineteen": 19,
    "twenty": 20,
}

#: A COUNT CLAIM, not merely a number. A training document is made of numbers —
#: percentages, rep brackets, week indices — and reading every one of them as a
#: claim about the next table produced sixteen false positives on the Block 2
#: document and one on its diff. A claim is a number heading a plural noun
#: phrase, and appearing where a claim appears: at the start of a sentence or
#: emphasised. `**Seven** questions`, `**Fifteen items.**`, `**23 claims`.
#: Never `Block 1 described`, `for 3 seconds`, `(22 claims, excluding ...)`.
_COUNT_RE = re.compile(
    r"(?:^|(?<=[.!?:]\s)|(?<=\*\*))\**\s*"
    r"(\d{1,3}|" + "|".join(NUMBER_WORDS) + r")\**\s+"
    r"(?:\*\*\s*)?[a-z]+s\b",
    re.IGNORECASE)

#: E<question>.<passage>, same handle grammar as tools/check_citations.py.
_HANDLE_RE = re.compile(r"\bE(\d+)\.(\d+)\b")

#: The section where a document explains what each question returned. Handles
#: named there are the explanation, not a prescription.
_RETRIEVAL_BOUNDARY_RE = re.compile(
    r"^#{2,3}\s+.*\bRetrieval\b", re.IGNORECASE | re.MULTILINE)

_UNUSABLE_RE = re.compile(
    r"(returned|yielded|came back with)\s+(nothing|no)\s+usable"
    r"|nothing\s+usable\s+at\s+all"
    r"|(returned|yielded)\s+nothing\s+on\s+topic",
    re.IGNORECASE)

#: A denial of the claim rather than the claim: the Block 2 document says
#: *There is no "returned nothing usable" bucket*.
_UNUSABLE_NEGATED_RE = re.compile(
    r"(there\s+is\s+no|there\s+was\s+no|not\s+a|no)\s+[\"“']?(returned|yielded)",
    re.IGNORECASE)

_QID_RE = re.compile(r"\bq(\d{1,2})\b")

_ABSOLUTE_RE = re.compile(
    r"(?<![\w])(every|no)\s+(?:\w+\s+){0,2}cell\b", re.IGNORECASE)

#: A qualifier that turns an absolute into a scoped claim. Looked for on the
#: same line, before the absolute.
_SCOPE_RE = re.compile(
    r"\b(in|for|across|during|within|throughout)\b[^.]{0,60}?"
    r"\b(week|weeks|wk|row|rows|loading|column)\b", re.IGNORECASE)

#: A sentence withdrawing an absolute is not making one. The Block 2 document's
#: correction reads *So: it is not true that every cell resolves to a cited
#: band* — flagging that would point a reader at the fix, not the defect.
_ABSOLUTE_NEGATION_RE = re.compile(
    r"\b(not\s+true|no\s+longer|is\s+not|was\s+not|never)\b[^.]{0,40}$",
    re.IGNORECASE)


@dataclass(frozen=True)
class Finding:
    line: int          # 1-indexed
    code: str
    message: str
    advisory: bool = False

    def __str__(self) -> str:
        return f"line {self.line}: {self.code}: {self.message}"


@dataclass(frozen=True)
class Table:
    start: int         # 1-indexed line of the header row
    n_cols: int
    n_body_rows: int
    #: Totals of every column whose body cells are all plain integers. A
    #: roll-up table ("23 claims" over a five-row verdict breakdown summing to
    #: 23) states a count of the thing tallied, not of the rows.
    col_sums: tuple[int, ...] = ()

    def satisfies(self, n: int) -> bool:
        return n == self.n_body_rows or n in self.col_sums


def _is_row(line: str) -> bool:
    s = line.strip()
    return s.startswith("|") and s.endswith("|") and len(s) > 1


def _is_delimiter(line: str) -> bool:
    s = line.strip()
    return bool(_is_row(s) and re.fullmatch(r"\|(?:\s*:?-{2,}:?\s*\|)+", s))


def _n_cols(line: str) -> int:
    return len([c for c in line.strip().strip("|").split("|")])


def _cells(line: str) -> list[str]:
    return [c.strip() for c in line.strip().strip("|").split("|")]


def _column_sums(body: list[str], n_cols: int) -> tuple[int, ...]:
    sums = []
    for c in range(n_cols):
        vals = []
        for row in body:
            cells = _cells(row)
            if c >= len(cells) or not re.fullmatch(r"\d{1,4}", cells[c]):
                vals = None
                break
            vals.append(int(cells[c]))
        if vals:
            sums.append(sum(vals))
    return tuple(sums)


def _check_tables(lines: list[str]) -> tuple[list[Finding], list[Table]]:
    findings: list[Finding] = []
    tables: list[Table] = []
    i = 0
    while i < len(lines):
        if _is_delimiter(lines[i]):
            # A delimiter must be preceded by exactly one header row.
            if i == 0 or not _is_row(lines[i - 1]) or _is_delimiter(lines[i - 1]):
                findings.append(Finding(
                    i + 1, "TABLE_ORPHAN_DELIMITER",
                    "delimiter row with no header row above it"))
                i += 1
                continue

            header_line = i - 1
            n_cols = _n_cols(lines[header_line])
            j = i + 1
            n_body = 0
            while j < len(lines) and _is_row(lines[j]):
                if _is_delimiter(lines[j]):
                    findings.append(Finding(
                        j + 1, "TABLE_SECOND_DELIMITER",
                        "a second delimiter row inside one table body"))
                elif _n_cols(lines[j]) != n_cols:
                    findings.append(Finding(
                        j + 1, "TABLE_RAGGED",
                        f"row has {_n_cols(lines[j])} columns, header has "
                        f"{n_cols}"))
                n_body += 1
                j += 1

            if n_body == 0:
                findings.append(Finding(
                    header_line + 1, "TABLE_NO_BODY",
                    "table has a header and delimiter but no body rows — the "
                    "paragraph below it will render as a table row"))

            # A non-blank, non-row line directly after the body is swallowed by
            # the table under GFM.
            if j < len(lines) and lines[j].strip():
                findings.append(Finding(
                    j + 1, "TABLE_STRAY_ROW",
                    "no blank line between the table and the text below it — "
                    "that text renders as a table row"))

            body = [lines[k] for k in range(i + 1, j) if not _is_delimiter(lines[k])]
            tables.append(Table(header_line + 1, n_cols, n_body,
                                _column_sums(body, n_cols)))
            i = j
            continue
        i += 1
    return findings, tables


def _paragraphs(lines: list[str]) -> list[tuple[int, int]]:
    """(start, end) 0-indexed half-open ranges of non-blank line runs."""
    out, start = [], None
    for i, line in enumerate(lines):
        if line.strip():
            if start is None:
                start = i
        elif start is not None:
            out.append((start, i))
            start = None
    if start is not None:
        out.append((start, len(lines)))
    return out


def _check_counts(lines: list[str], tables: list[Table]) -> list[Finding]:
    """A count in the paragraph immediately above a table is a claim about
    that table's rows.

    Scoped tightly on purpose: a training document is made of numbers, and
    every percentage, rep count and week number would otherwise be read as a
    claim about the next table it happened to precede.
    """
    by_start = {t.start: t for t in tables}
    findings = []
    for start, end in _paragraphs(lines):
        if _is_row(lines[start]):        # the paragraph IS a table
            continue
        # The next table in this section. Intervening prose is allowed — the
        # count sentence and its table are often separated by a lead-in — but a
        # heading ends the section and with it the claim's reach.
        table = None
        for k in range(end, len(lines)):
            if lines[k].lstrip().startswith("#"):
                break
            if k + 1 in by_start:
                table = by_start[k + 1]
                break
            if _is_row(lines[k]):
                break
        if table is None:
            continue
        text = " ".join(lines[start:end])
        for m in _COUNT_RE.finditer(text):
            tok = m.group(1).lower()
            n = NUMBER_WORDS.get(tok, int(tok) if tok.isdigit() else None)
            if n is None or table.satisfies(n):
                continue
            findings.append(Finding(
                start + 1, "COUNT",
                f"says {m.group(1)} ({n}) but the table at line "
                f"{table.start} has {table.n_body_rows} rows"))
    return findings


def _check_unusable(text: str, lines: list[str]) -> list[Finding]:
    """A question declared to have returned nothing usable, whose handles the
    prescriptive body nonetheless cites, is falsified by the document itself.
    """
    boundary = _RETRIEVAL_BOUNDARY_RE.search(text)
    body_end_char = boundary.start() if boundary else len(text)
    body_qids = {int(m.group(1)) for m in _HANDLE_RE.finditer(text[:body_end_char])}

    findings = []
    for start, end in _paragraphs(lines):
        para = " ".join(lines[start:end])
        if not _UNUSABLE_RE.search(para) or _UNUSABLE_NEGATED_RE.search(para):
            continue
        for m in _QID_RE.finditer(para):
            qid = int(m.group(1))
            if qid in body_qids:
                cited = sorted({f"E{a}.{b}" for a, b in
                                (mm.groups() for mm in
                                 _HANDLE_RE.finditer(text[:body_end_char]))
                                if int(a) == qid})
                findings.append(Finding(
                    start + 1, "FALSIFIED",
                    f"q{qid:02d} is claimed to have returned nothing usable, "
                    f"but the prescriptive body cites {cited}"))
    return findings


def _check_absolutes(lines: list[str]) -> list[Finding]:
    findings = []
    for i, line in enumerate(lines):
        m = _ABSOLUTE_RE.search(line)
        if not m:
            continue
        if _SCOPE_RE.search(line[:m.start()]) or _SCOPE_RE.search(line[m.end():]):
            continue
        if _ABSOLUTE_NEGATION_RE.search(line[:m.start()]):
            continue
        findings.append(Finding(
            i + 1, "ABSOLUTE",
            f"unscoped absolute claim {m.group(0)!r} — verify it against "
            "every row, including back-off and test weeks",
            advisory=True))
    return findings


def check_document(text: str, *, strict: bool = False) -> list[Finding]:
    """Every finding in line order. Advisory findings only appear under strict."""
    lines = text.splitlines()
    findings, tables = _check_tables(lines)
    findings += _check_counts(lines, tables)
    findings += _check_unusable(text, lines)
    if strict:
        findings += _check_absolutes(lines)
    return sorted(findings, key=lambda f: (f.line, f.code))


def main(argv=None) -> int:
    argv = list(sys.argv[1:] if argv is None else argv)
    strict = "--strict" in argv
    paths = [a for a in argv if not a.startswith("--")]
    if len(paths) != 1:
        print(__doc__, file=sys.stderr)
        return 2

    doc = Path(paths[0])
    text = doc.read_text(encoding="utf-8")
    findings = check_document(text, strict=strict)

    n_tables = len(_check_tables(text.splitlines())[1])
    if not findings:
        print(f"OK: {doc} — {n_tables} table(s), no claim findings")
        return 0

    print(f"FAIL: {len(findings)} finding(s) in {doc}:", file=sys.stderr)
    for f in findings:
        print(f"  {f}", file=sys.stderr)
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
