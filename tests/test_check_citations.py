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
