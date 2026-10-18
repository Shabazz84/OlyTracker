"""A fabricated citation is the one failure that would make the whole rebuild
worthless: it looks exactly like a real one. This checker is the guard."""

from tools.check_citations import pack_handles, parse_handles, unresolved


def _write_pack(tmp_path, qid, key, n_passages):
    lines = [f"# E{qid} — {key}", ""]
    for i in range(1, n_passages + 1):
        lines += [f"## E{qid}.{i} — score 0.66", "", "body", ""]
    (tmp_path / f"q{qid:02d}-{key}.md").write_text("\n".join(lines), encoding="utf-8")


def test_parse_handles_finds_citations_in_prose():
    text = "Pause front squat 4x6 [E19.2], deload sets -40% [E4.1]."
    assert parse_handles(text) == ["E19.2", "E4.1"]


def test_parse_handles_deduplicates():
    text = "[E19.2] and again [E19.2]"
    assert parse_handles(text) == ["E19.2"]


def test_parse_handles_ignores_judgment_tags():
    text = "Jerk daily max [JUDGMENT - NO COVERAGE] and OHS 4x4 [E10.1]"
    assert parse_handles(text) == ["E10.1"]


def test_pack_handles_reads_what_the_pack_defines(tmp_path):
    _write_pack(tmp_path, 4, "deload_magnitude", 2)
    assert pack_handles(tmp_path) == {"E4.1", "E4.2"}


def test_unresolved_flags_a_handle_the_pack_does_not_define(tmp_path):
    _write_pack(tmp_path, 4, "deload_magnitude", 2)
    doc = "Deload -40% [E4.1]. Squat 5x5 [E4.9]."

    assert unresolved(doc, tmp_path) == ["E4.9"]


def test_unresolved_is_empty_when_every_handle_resolves(tmp_path):
    _write_pack(tmp_path, 4, "deload_magnitude", 2)
    doc = "Deload [E4.1] and [E4.2]."

    assert unresolved(doc, tmp_path) == []


def test_unresolved_flags_a_handle_from_a_question_that_does_not_exist(tmp_path):
    _write_pack(tmp_path, 4, "deload_magnitude", 1)
    doc = "Something [E99.1]."

    assert unresolved(doc, tmp_path) == ["E99.1"]


# ── Quotes ─────────────────────────────────────────────────────────────────
# A handle that resolves can still carry a quote the passage never said — a
# paraphrase drifting inside quotation marks reads exactly like the coach.

from tools.check_citations import misquoted  # noqa: E402


def _write_texts(tmp_path, qid, key, texts):
    lines = [f"# E{qid} — {key}", ""]
    for i, body in enumerate(texts, start=1):
        lines += [f"## E{qid}.{i} — score 0.66", "", "**Title:** T",
                  "**Source:** https://y/1", "**Note:** a.md", "", body, ""]
    (tmp_path / f"q{qid:02d}-{key}.md").write_text("\n".join(lines), encoding="utf-8")


def test_a_verbatim_quote_passes(tmp_path):
    _write_texts(tmp_path, 101, "snatch", ["keep the elbows higher than the barbell"])
    assert misquoted('Elbows up: "keep the elbows higher" [E101.1]', tmp_path) == []


def test_case_whitespace_and_curly_apostrophes_do_not_count(tmp_path):
    _write_texts(tmp_path, 101, "snatch", ["it's  really easy to\nlet those hips go up"])
    assert misquoted('*"It’s really easy to let those hips go up"* [E101.1]', tmp_path) == []


def test_an_elided_quote_must_keep_its_fragments_in_order(tmp_path):
    _write_texts(tmp_path, 101, "snatch", ["stay up and keep adding height then turn it around"])
    assert misquoted('"stay up ... turn it around" [E101.1]', tmp_path) == []
    assert misquoted('"turn it around ... stay up" [E101.1]', tmp_path) == [
        ("E101.1", "turn it around ... stay up")]


def test_a_quote_the_passage_never_said_is_flagged(tmp_path):
    _write_texts(tmp_path, 101, "snatch", ["shoulders and hips rise together"])
    assert misquoted('"shins stay vertical" [E101.1]', tmp_path) == [
        ("E101.1", "shins stay vertical")]


def test_a_quote_cited_to_the_wrong_passage_is_flagged(tmp_path):
    _write_texts(tmp_path, 101, "snatch", ["first passage", "second passage"])
    assert misquoted('"second passage" [E101.1]', tmp_path) == [
        ("E101.1", "second passage")]


def test_markdown_emphasis_inside_a_quote_is_not_part_of_it(tmp_path):
    _write_texts(tmp_path, 24, "trunk", ["such light work often proves recuperative"])
    assert misquoted('"often proves **recuperative**" [E24.1]', tmp_path) == []


def test_punctuation_never_decides_a_match_but_a_changed_word_does(tmp_path):
    _write_texts(tmp_path, 16, "rep_schemes", ["i like it like 4x3 like 5 by two"])
    assert misquoted('"like 4x3, like 5 by two" [E16.1]', tmp_path) == []
    assert misquoted('"like 4x3, like 6 by two" [E16.1]', tmp_path) == [
        ("E16.1", "like 4x3, like 6 by two")]


def test_square_brackets_mark_an_editorial_change(tmp_path):
    """Standard quoting: [distant] corrects a transcription ('distance') in
    the open, where the reader can see the quote was touched."""
    _write_texts(tmp_path, 9, "hang_vs_floor", ["blocks would be a third and distance option"])
    assert misquoted('"a third and [distant] option" [E9.1]', tmp_path) == []
    assert misquoted('"a third and distant option" [E9.1]', tmp_path) == [
        ("E9.1", "a third and distant option")]
