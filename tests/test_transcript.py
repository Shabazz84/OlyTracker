import subprocess
import pytest
from pathlib import Path
from unittest.mock import patch, MagicMock

from extractor.transcript import fetch_transcript, clean_text, parse_vtt, _find_subtitle


# ── clean_text ────────────────────────────────────────────────────────────────

def test_clean_text_removes_bracket_annotations():
    assert clean_text("[Music] hello [Applause] world") == "hello world"


def test_clean_text_normalizes_whitespace():
    assert clean_text("hello   \n world") == "hello world"


def test_clean_text_strips_edges():
    assert clean_text("  hello  ") == "hello"


# ── parse_vtt ─────────────────────────────────────────────────────────────────

def test_parse_vtt_extracts_text():
    vtt = "WEBVTT\n\n00:00:00.000 --> 00:00:01.000\nпривет мир\n"
    assert parse_vtt(vtt) == "привет мир"


def test_parse_vtt_removes_html_tags():
    vtt = "WEBVTT\n\n00:00:00.000 --> 00:00:01.000\n<b>hello</b> <i>world</i>\n"
    assert parse_vtt(vtt) == "hello world"


def test_parse_vtt_removes_inline_timestamps():
    vtt = "WEBVTT\n\n00:00:00.000 --> 00:00:02.000\n<00:00:00.000><c>Hello</c><00:00:01.000><c> world</c>\n"
    assert parse_vtt(vtt) == "Hello world"


def test_parse_vtt_deduplicates_rolling_captions():
    vtt = (
        "WEBVTT\n\n"
        "00:00:00.000 --> 00:00:01.000\nhello\n\n"
        "00:00:01.000 --> 00:00:02.000\nhello\n\n"
        "00:00:02.000 --> 00:00:03.000\nworld\n"
    )
    assert parse_vtt(vtt) == "hello world"


def test_parse_vtt_handles_empty():
    assert parse_vtt("WEBVTT\n\n") == ""


def test_parse_vtt_skips_cue_positioning():
    vtt = "WEBVTT\n\nalign:start position:0%\n\n00:00:00.000 --> 00:00:01.000\ntest\n"
    assert parse_vtt(vtt) == "test"


def test_parse_vtt_skips_kind_and_language_headers():
    vtt = "WEBVTT\nKind: captions\nLanguage: ru\n\n00:00:00.000 --> 00:00:01.000\nтекст\n"
    assert parse_vtt(vtt) == "текст"


# ── _find_subtitle ────────────────────────────────────────────────────────────

def test_find_subtitle_finds_vtt(tmp_path):
    vtt = "WEBVTT\n\n00:00:00.000 --> 00:00:01.000\nпривет мир\n"
    (tmp_path / "vid123.ru.vtt").write_text(vtt, encoding="utf-8")
    result = _find_subtitle(tmp_path, "vid123")
    assert result is not None
    assert result["language"] == "ru"
    assert "привет" in result["text"]


def test_find_subtitle_respects_language_priority(tmp_path):
    (tmp_path / "vid123.en.vtt").write_text(
        "WEBVTT\n\n00:00:00.000 --> 00:00:01.000\nhello\n", encoding="utf-8"
    )
    (tmp_path / "vid123.ru.vtt").write_text(
        "WEBVTT\n\n00:00:00.000 --> 00:00:01.000\nпривет\n", encoding="utf-8"
    )
    result = _find_subtitle(tmp_path, "vid123")
    assert result["language"] == "ru"  # ru has priority over en


def test_find_subtitle_returns_none_when_no_files(tmp_path):
    assert _find_subtitle(tmp_path, "vid123") is None


def test_find_subtitle_skips_empty_content(tmp_path):
    (tmp_path / "vid123.ru.vtt").write_text("WEBVTT\n\n", encoding="utf-8")
    (tmp_path / "vid123.en.vtt").write_text(
        "WEBVTT\n\n00:00:00.000 --> 00:00:01.000\nhello\n", encoding="utf-8"
    )
    result = _find_subtitle(tmp_path, "vid123")
    assert result is not None
    assert result["language"] == "en"


# ── fetch_transcript ──────────────────────────────────────────────────────────

def _write_vtt_side_effect(files: dict):
    """Returns a subprocess.run side_effect that writes VTT files into the tmpdir."""
    def side_effect(cmd, **kwargs):
        try:
            out_idx = cmd.index("--output") + 1
            outpath = Path(cmd[out_idx]).parent
            for filename, content in files.items():
                (outpath / filename).write_text(content, encoding="utf-8")
        except (ValueError, IndexError):
            pass
        return MagicMock(returncode=0, stdout="", stderr="")
    return side_effect


def test_fetch_transcript_success():
    vtt = "WEBVTT\n\n00:00:00.000 --> 00:00:01.000\nпривет мир\n"
    with patch("extractor.transcript.subprocess.run",
               side_effect=_write_vtt_side_effect({"vid123.ru.vtt": vtt})):
        result = fetch_transcript("vid123")
    assert result is not None
    assert "привет" in result["text"]
    assert result["language"] == "ru"


def test_fetch_transcript_returns_none_when_no_files():
    with patch("extractor.transcript.subprocess.run",
               side_effect=_write_vtt_side_effect({})):
        result = fetch_transcript("vid123")
    assert result is None


def test_fetch_transcript_handles_timeout():
    with patch("extractor.transcript.subprocess.run") as mock_run:
        mock_run.side_effect = subprocess.TimeoutExpired("yt-dlp", 60)
        result = fetch_transcript("vid123")
    assert result is None


def test_fetch_transcript_handles_not_found():
    with patch("extractor.transcript.subprocess.run") as mock_run:
        mock_run.side_effect = FileNotFoundError("yt-dlp not found")
        result = fetch_transcript("vid123")
    assert result is None


def test_fetch_transcript_falls_back_to_english():
    vtt = "WEBVTT\n\n00:00:00.000 --> 00:00:01.000\nhello world\n"
    with patch("extractor.transcript.subprocess.run",
               side_effect=_write_vtt_side_effect({"vid123.en.vtt": vtt})):
        result = fetch_transcript("vid123")
    assert result is not None
    assert result["language"] == "en"


def test_fetch_transcript_uses_cookies_when_present():
    vtt = "WEBVTT\n\n00:00:00.000 --> 00:00:01.000\ntest\n"
    captured_cmd = []

    def capture_side_effect(cmd, **kwargs):
        captured_cmd.extend(cmd)
        out_idx = cmd.index("--output") + 1
        outpath = Path(cmd[out_idx]).parent
        (outpath / "vid123.en.vtt").write_text(vtt, encoding="utf-8")
        return MagicMock(returncode=0, stdout="", stderr="")

    with patch("extractor.transcript.subprocess.run", side_effect=capture_side_effect):
        with patch("extractor.transcript.COOKIES_PATH") as mock_path:
            mock_path.exists.return_value = True
            mock_path.__str__ = lambda self: "data/cookies.txt"
            fetch_transcript("vid123")

    assert "--cookies" in captured_cmd
