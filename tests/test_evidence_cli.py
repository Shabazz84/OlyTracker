"""`python main.py evidence` — build the pack, make no LLM call.

Exit codes carry meaning for the operator: 3 means the box is down and the run
should be retried, 4 means the corpus genuinely covered nothing, which points
at an empty or misconfigured collection rather than a transport failure.
"""

import sys

import pytest

import config

sys.path.insert(0, config.BRAINDUMP_PATH)

import main as cli  # noqa: E402
from synthesis import evidence as sev  # noqa: E402
from synthesis.questions import Question  # noqa: E402
from synthesis.retrieve import Passage  # noqa: E402


class _Args:
    def __init__(self, out=None, limit=12, citations_out=None,
                 overwrite_citations=False):
        self.out = out
        self.limit = limit
        self.citations_out = citations_out
        self.overwrite_citations = overwrite_citations


def _p(text="body"):
    return Passage(text, "https://y/1", "T", "a.md", 0.66)


def _one_question(monkeypatch):
    monkeypatch.setattr(
        sev, "QUESTIONS",
        [Question(1, "deload_frequency",
                  "What do these coaches say about deloading?")])


def _stub_backends(monkeypatch):
    monkeypatch.setattr(
        cli, "_backends",
        lambda: ({"qdrant": {"similarity_threshold": 0.58}}, None, None))


def test_evidence_writes_a_pack_and_exits_zero(monkeypatch, tmp_path):
    _stub_backends(monkeypatch)
    _one_question(monkeypatch)
    monkeypatch.setattr(
        sev, "retrieve_topic",
        lambda q, e, s, *, limit, threshold, vocab=None: [_p()])

    # citations_out pointed at tmp_path too: cmd_evidence's default path is
    # the real committed docs/programs/<today>-citations.json, and this stub
    # question's citations would legitimately differ from that file's
    # content and trip the CitationsConflictError guard.
    rc = cli.cmd_evidence(_Args(out=str(tmp_path),
                                citations_out=str(tmp_path / "citations.json")))

    assert rc == 0
    assert (tmp_path / "manifest.json").exists()
    assert (tmp_path / "q01-deload_frequency.md").exists()


def test_evidence_returns_3_when_backend_is_down(monkeypatch, tmp_path):
    from indexer.errors import BackendUnavailable

    _stub_backends(monkeypatch)
    _one_question(monkeypatch)

    def _boom(q, e, s, *, limit, threshold, vocab=None):
        raise BackendUnavailable("qdrant down")

    monkeypatch.setattr(sev, "retrieve_topic", _boom)

    rc = cli.cmd_evidence(_Args(out=str(tmp_path)))

    assert rc == 3
    assert not (tmp_path / "manifest.json").exists()


def test_evidence_returns_4_when_nothing_is_covered(monkeypatch, tmp_path):
    """Zero coverage across the whole catalog means the collection is empty or
    misconfigured — not that weightlifting has no literature."""
    _stub_backends(monkeypatch)
    _one_question(monkeypatch)
    monkeypatch.setattr(
        sev, "retrieve_topic",
        lambda q, e, s, *, limit, threshold, vocab=None: [])

    rc = cli.cmd_evidence(_Args(out=str(tmp_path)))

    assert rc == 4


def test_evidence_subcommand_is_registered():
    """argparse exits 2 on an unknown subcommand and 0 after printing --help,
    so the exit code distinguishes 'registered' from 'not registered'."""
    with pytest.raises(SystemExit) as exc:
        cli.main(["evidence", "--help"])
    assert exc.value.code == 0
