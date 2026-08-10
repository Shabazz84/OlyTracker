"""`python main.py ask "<question>"` — interrogate the corpus directly.

The reliability property this command exists for: it performs NO LLM call. It
prints retrieved passages verbatim with their source URLs, so nothing between
the coach's words and the reader can invent a number. The archived
master_synthesis.md is the cautionary case — it asserted "deload every 4th week"
and "stop if pain >3/10" with no way to check either.
"""

import sys

import config

sys.path.insert(0, config.BRAINDUMP_PATH)

import main as cli  # noqa: E402
from synthesis import retrieve as sretrieve  # noqa: E402


def _p(text, source, title, score, note_path="a.md"):
    return sretrieve.Passage(text, source, title, note_path, score)


# ---------------------------------------------------------------- rendering


def test_format_for_cli_shows_rank_score_title_and_source():
    out = sretrieve.format_for_cli([
        _p("keep the bar close to the body", "https://y/1", "Snatch Pull", 0.71),
    ])

    assert "[1]" in out
    assert "0.71" in out
    assert "Snatch Pull" in out
    assert "https://y/1" in out
    assert "keep the bar close to the body" in out


def test_format_for_cli_collapses_transcript_whitespace():
    """Transcript bodies are one long unwrapped blob; raw echo is unreadable."""
    out = sretrieve.format_for_cli([
        _p("keep   the\n\n bar\tclose", "https://y/1", "T", 0.7),
    ])

    assert "keep the bar close" in out


def test_format_for_cli_truncates_by_default():
    long_text = "word " * 400
    out = sretrieve.format_for_cli([_p(long_text, "https://y/1", "T", 0.7)])

    assert len(out) < len(long_text)
    assert "…" in out


def test_format_for_cli_full_keeps_the_whole_passage():
    long_text = "word " * 400
    out = sretrieve.format_for_cli([_p(long_text, "https://y/1", "T", 0.7)],
                                   full=True)

    assert "…" not in out
    assert out.count("word") == 400


def test_format_for_cli_falls_back_to_note_path_when_untitled():
    out = sretrieve.format_for_cli([
        sretrieve.Passage("body", None, None, "some_note.md", 0.6),
    ])

    assert "some_note.md" in out


def test_format_for_cli_empty_is_an_explicit_refusal():
    """No coverage must read as 'the corpus does not say', never as silence."""
    out = sretrieve.format_for_cli([])

    assert "no passages" in out.lower()


# ---------------------------------------------------------------- the command


class _Args:
    def __init__(self, question, limit=8, full=False):
        self.question = question
        self.limit = limit
        self.full = full


def _stub_backends(monkeypatch):
    cfg = {"qdrant": {"similarity_threshold": 0.58}}
    monkeypatch.setattr(cli, "_backends", lambda: (cfg, object(), object()))
    return cfg


def test_cmd_ask_prints_passages_and_succeeds(monkeypatch, capsys):
    _stub_backends(monkeypatch)
    monkeypatch.setattr(sretrieve, "retrieve_topic", lambda *a, **k: [
        _p("the split jerk offers the greatest margin for error",
           "https://y/1", "Live Q&A", 0.72),
    ])

    rc = cli.cmd_ask(_Args("how do I program the jerk?"))
    out = capsys.readouterr().out

    assert rc == 0
    assert "the split jerk offers the greatest margin for error" in out
    assert "https://y/1" in out


def test_cmd_ask_reports_no_coverage_and_exits_nonzero(monkeypatch, capsys):
    """A question the corpus cannot answer must fail loudly, not print nothing
    and return success — that is how an absent answer becomes an assumed one."""
    _stub_backends(monkeypatch)
    monkeypatch.setattr(sretrieve, "retrieve_topic", lambda *a, **k: [])

    rc = cli.cmd_ask(_Args("what about marathon fuelling?"))
    captured = capsys.readouterr()

    assert rc == 4
    assert "no passages" in (captured.out + captured.err).lower()


def test_cmd_ask_honours_the_limit_flag(monkeypatch, capsys):
    _stub_backends(monkeypatch)
    seen = {}

    def _spy(question, embedder, store, *, limit, threshold, **k):
        seen["limit"] = limit
        seen["threshold"] = threshold
        seen["question"] = question
        return [_p("x", "https://y/1", "T", 0.6)]

    monkeypatch.setattr(sretrieve, "retrieve_topic", _spy)
    cli.cmd_ask(_Args("jerk?", limit=25))

    assert seen["limit"] == 25
    assert seen["threshold"] == 0.58
    assert seen["question"] == "jerk?"


def test_cmd_ask_uses_the_shared_threshold_not_a_private_one(monkeypatch):
    """The threshold must come from Brain_Dump's config, the same value the
    synthesis path uses — a second hardcoded number here would drift."""
    cfg = _stub_backends(monkeypatch)
    cfg["qdrant"]["similarity_threshold"] = 0.42
    seen = {}

    def _spy(question, embedder, store, *, limit, threshold, **k):
        seen["threshold"] = threshold
        return [_p("x", "https://y/1", "T", 0.6)]

    monkeypatch.setattr(sretrieve, "retrieve_topic", _spy)
    cli.cmd_ask(_Args("q"))

    assert seen["threshold"] == 0.42


def test_ask_is_wired_into_the_argument_parser(monkeypatch):
    called = {}
    monkeypatch.setattr(cli, "cmd_ask", lambda args: called.setdefault(
        "q", args.question) and 0 or 0)

    rc = cli.main(["ask", "how do I program the jerk?", "--limit", "3"])

    assert rc == 0
    assert called["q"] == "how do I program the jerk?"
