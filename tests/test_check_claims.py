"""Four fix rounds on the Block 2 document were spent on prose that asserted
more than the prescriptions delivered. `check_citations` proves a handle
exists; nothing proved a sentence agreed with the table under it. These tests
cover the three checks that reproduced real findings during Task 4.
"""

from tools.check_claims import check_document


def _findings(text):
    return [(f.line, f.code, f.message) for f in check_document(text)]


def _codes(text):
    return [f.code for f in check_document(text)]


# ------------------------------------------------------------- table shape


GOOD_TABLE = """Intro paragraph.

| Wk | Squat |
|---|---|
| 9 | 65-70% |
| 10 | 65-70% |

Trailing paragraph.
"""


def test_a_well_formed_table_reports_nothing():
    assert _findings(GOOD_TABLE) == []


def test_orphan_header_with_no_body_rows_is_a_finding():
    """A header + delimiter with no rows swallows the paragraph after it: under
    GFM a table body ends at a blank line, not at a paragraph, so the sentence
    below renders as a mangled one-cell row. This shipped once already, and the
    sentence it swallowed was the most safety-relevant one in the section."""
    text = "| Wk | Squat |\n|---|---|\nThe note that gets swallowed.\n"
    assert "TABLE_NO_BODY" in _codes(text) or "TABLE_STRAY_ROW" in _codes(text)


def test_ragged_column_count_is_a_finding():
    text = "| A | B |\n|---|---|\n| 1 | 2 |\n| 1 | 2 | 3 |\n\nafter\n"
    assert "TABLE_RAGGED" in _codes(text)


def test_a_paragraph_glued_to_the_table_with_no_blank_line_is_a_finding():
    text = "| A | B |\n|---|---|\n| 1 | 2 |\nGlued paragraph.\n"
    assert "TABLE_STRAY_ROW" in _codes(text)


def test_a_table_at_end_of_file_needs_no_trailing_blank_line():
    assert _findings("| A | B |\n|---|---|\n| 1 | 2 |\n") == []


def test_a_delimiter_row_with_no_header_is_a_finding():
    text = "Some prose.\n\n|---|---|\n| 1 | 2 |\n\nafter\n"
    assert "TABLE_ORPHAN_DELIMITER" in _codes(text)


# ------------------------------------------------------------ stated counts


def test_stated_count_below_actual_row_count_is_a_finding():
    text = ("**Fourteen** items are logged below.\n\n"
            "| # | Item |\n|---|---|\n"
            + "".join(f"| {i} | x |\n" for i in range(1, 14))
            + "\nafter\n")
    findings = _findings(text)
    assert any(c == "COUNT" for _, c, _ in findings)
    assert any("14" in m and "13" in m for _, _, m in findings)


def test_stated_count_matching_actual_row_count_passes():
    text = ("**Three** items are logged below.\n\n"
            "| # | Item |\n|---|---|\n| 1 | x |\n| 2 | x |\n| 3 | x |\n\nafter\n")
    assert _codes(text) == []


def test_a_numeral_count_is_checked_too():
    text = ("**5 rows** are listed below.\n\n"
            "| # |\n|---|\n| 1 |\n| 2 |\n\nafter\n")
    assert "COUNT" in _codes(text)


def test_a_count_separated_from_its_table_by_a_lead_in_paragraph_is_checked():
    """The count sentence and the table it counts are usually separated by a
    lead-in. The claim's reach ends at the next heading, not at the next
    blank line."""
    text = ("**Seven** questions missed.\n\nThe table below states, per "
            "question, what was retrieved.\n\n"
            "| Q |\n|---|\n| q41 |\n| q35 |\n\nafter\n")
    assert "COUNT" in _codes(text)


def test_a_number_that_is_not_a_count_claim_is_ignored():
    """A training document is made of numbers. Only a number *heading a plural
    noun phrase*, at a sentence start or emphasised, is a claim about a table.
    Reading every numeral as one produced sixteen false positives on the
    committed Block 2 document — `Block 1 described`, `for 3 seconds`,
    `claimed one, and it was false`."""
    text = ("Block 1 described this as a three-way split, holding the last rep "
            "for 3 seconds at 65-70%.\n\n"
            "| A |\n|---|\n| 1 |\n\nafter\n")
    assert _codes(text) == []


def test_a_roll_up_count_matching_a_column_sum_passes():
    """`**23 claims, all assessed.**` above a five-row verdict breakdown is a
    count of the thing tallied, not of the rows — and the column sums to 23."""
    text = ("**23 claims, all assessed.**\n\n"
            "| Verdict | Count |\n|---|---|\n"
            "| SUPPORTED | 8 |\n| CONTRADICTED | 8 |\n| UNFOUNDED | 5 |\n"
            "| ABSENT | 1 |\n| CONTESTED | 1 |\n\nafter\n")
    assert _codes(text) == []


def test_a_roll_up_count_matching_neither_rows_nor_a_column_sum_is_a_finding():
    text = ("**24 claims, all assessed.**\n\n"
            "| Verdict | Count |\n|---|---|\n"
            "| SUPPORTED | 8 |\n| CONTRADICTED | 8 |\n| UNFOUNDED | 5 |\n"
            "| ABSENT | 1 |\n| CONTESTED | 1 |\n\nafter\n")
    assert "COUNT" in _codes(text)


def test_a_number_in_a_paragraph_not_followed_by_a_table_is_ignored():
    """Percentages, rep counts and week numbers are everywhere in a training
    document. Only a count claim reaching a table in the same section counts."""
    text = "The squat sits at 65-70% for 3-5 reps in all six loading weeks.\n"
    assert _codes(text) == []


# ------------------------------------------ claimed unusable but cited anyway


UNUSABLE_DOC = """# Doc

The overhead protocol runs five phases [E31.8], and the taper is [E12.2].

## Retrieval Notes

Three questions returned nothing usable at all: q12, q35, q41.
"""


def test_a_question_claimed_unusable_whose_handles_are_cited_is_a_finding():
    findings = _findings(UNUSABLE_DOC)
    assert any(c == "FALSIFIED" and "q12" in m for _, c, m in findings)


def test_a_question_claimed_unusable_and_never_cited_passes():
    findings = _findings(UNUSABLE_DOC)
    assert not any(c == "FALSIFIED" and ("q35" in m or "q41" in m)
                   for _, c, m in findings)


def test_citations_after_the_retrieval_notes_boundary_do_not_falsify():
    """The retrieval-notes section exists to explain what each question did
    return. Naming a handle there is the explanation, not a prescription."""
    text = ("# Doc\n\nProse with no handles.\n\n"
            "## Retrieval Notes\n\n"
            "q12 returned nothing usable at all — the nearest is [E12.5].\n")
    assert "FALSIFIED" not in _codes(text)


def test_a_negated_unusable_claim_is_not_treated_as_a_claim():
    """The Block 2 document says *There is no \"returned nothing usable\"
    bucket* — a denial of the claim, not the claim."""
    text = ('# Doc\n\nThe taper is [E12.2].\n\n'
            'There is no "returned nothing usable" bucket for q12.\n')
    assert "FALSIFIED" not in _codes(text)


# --------------------------------------------------- advisory absolute claims


def test_an_unscoped_absolute_claim_is_advisory_not_a_finding():
    text = "Every cell resolves to a cited band.\n"
    assert _codes(text) == []
    assert [a.code for a in check_document(text, strict=True)] == ["ABSOLUTE"]


def test_a_scoped_absolute_claim_is_not_even_advisory():
    text = "In loading weeks 9-14, no cell exceeds a cited band.\n"
    assert [a.code for a in check_document(text, strict=True)] == []


def test_a_withdrawn_absolute_is_not_advisory():
    """A sentence retracting an absolute is not making one — flagging it would
    point a reader at the fix instead of the defect."""
    text = "So: it is not true that every cell resolves to a cited band.\n"
    assert [a.code for a in check_document(text, strict=True)] == []


# --------------------------------------------------------------------- CLI


def test_cli_exits_zero_on_a_clean_document(tmp_path, capsys):
    from tools.check_claims import main

    p = tmp_path / "clean.md"
    p.write_text(GOOD_TABLE, encoding="utf-8")

    assert main([str(p)]) == 0


def test_cli_exits_one_and_prints_line_numbers_on_a_finding(tmp_path, capsys):
    from tools.check_claims import main

    p = tmp_path / "bad.md"
    p.write_text(UNUSABLE_DOC, encoding="utf-8")

    assert main([str(p)]) == 1
    out = capsys.readouterr()
    assert "line" in (out.out + out.err)


# ---------------------------------------- the two committed Block 2 documents


def test_it_passes_on_the_committed_block2_document():
    """Freshly reviewed. A finding here is a genuine discovery, not a reason to
    weaken the check."""
    from pathlib import Path

    text = Path("docs/programs/2026-08-12-block2.md").read_text(encoding="utf-8")
    assert _findings(text) == []


def test_it_passes_on_the_committed_block2_diff():
    from pathlib import Path

    text = Path("docs/programs/2026-08-12-block2-diff.md").read_text(encoding="utf-8")
    assert _findings(text) == []
