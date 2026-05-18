import pytest
from unittest.mock import patch, MagicMock
from extractor.transcript import fetch_transcript, clean_text


def test_clean_text_removes_bracket_annotations():
    assert clean_text("[Music] hello [Applause] world") == "hello world"


def test_clean_text_normalizes_whitespace():
    assert clean_text("hello   \n world") == "hello world"


def test_clean_text_strips_edges():
    assert clean_text("  hello  ") == "hello"


def test_fetch_transcript_success():
    # Create mock snippet objects that look like FetchedTranscriptSnippet
    mock_snippet_1 = MagicMock()
    mock_snippet_1.text = "привет"
    mock_snippet_1.start = 0.0
    mock_snippet_1.duration = 1.0

    mock_snippet_2 = MagicMock()
    mock_snippet_2.text = "мир"
    mock_snippet_2.start = 1.0
    mock_snippet_2.duration = 1.0

    mock_snippets = [mock_snippet_1, mock_snippet_2]

    # Mock transcript.fetch() to return the list of snippets
    mock_transcript_list = MagicMock()
    mock_transcript = MagicMock()
    mock_transcript.fetch.return_value = mock_snippets

    mock_transcript_list.find_transcript.return_value = mock_transcript

    with patch(
        "extractor.transcript.YouTubeTranscriptApi",
    ) as MockApi:
        MockApi.return_value.list.return_value = mock_transcript_list
        result = fetch_transcript("vid123")

    assert result is not None
    assert "привет" in result["text"]
    assert result["language"] in ("ru", "uk", "en")


def test_fetch_transcript_returns_none_when_disabled():
    from youtube_transcript_api import TranscriptsDisabled

    with patch("extractor.transcript.YouTubeTranscriptApi") as MockApi:
        MockApi.return_value.list.side_effect = TranscriptsDisabled("vid123")
        result = fetch_transcript("vid123")
    assert result is None


def test_fetch_transcript_returns_none_on_generic_error():
    with patch("extractor.transcript.YouTubeTranscriptApi") as MockApi:
        MockApi.return_value.list.side_effect = Exception("network error")
        result = fetch_transcript("vid123")
    assert result is None


def test_fetch_transcript_falls_back_to_next_language():
    from youtube_transcript_api import NoTranscriptFound

    # Mock for successful en transcript
    mock_snippet = MagicMock()
    mock_snippet.text = "hello"
    mock_snippet.start = 0.0
    mock_snippet.duration = 1.0

    mock_transcript_list = MagicMock()
    mock_transcript = MagicMock()
    mock_transcript.fetch.return_value = [mock_snippet]

    # ru and uk fail, en succeeds
    mock_transcript_list.find_transcript.side_effect = [
        NoTranscriptFound("vid123", ["ru"], MagicMock()),
        NoTranscriptFound("vid123", ["uk"], MagicMock()),
        mock_transcript,
    ]

    with patch("extractor.transcript.YouTubeTranscriptApi") as MockApi:
        MockApi.return_value.list.return_value = mock_transcript_list
        result = fetch_transcript("vid123")

    assert result is not None
    assert result["language"] == "en"
    assert "hello" in result["text"]


def test_fetch_transcript_skips_empty_transcript():
    """Empty transcripts (after cleaning) should be skipped and try next language."""
    from youtube_transcript_api import NoTranscriptFound

    # Create mock snippet that yields empty text after joining
    mock_empty_snippet = MagicMock()
    mock_empty_snippet.text = ""

    mock_transcript_empty = MagicMock()
    mock_transcript_empty.fetch.return_value = [mock_empty_snippet]

    # Create successful en transcript
    mock_snippet_en = MagicMock()
    mock_snippet_en.text = "hello"

    mock_transcript_en = MagicMock()
    mock_transcript_en.fetch.return_value = [mock_snippet_en]

    mock_transcript_list = MagicMock()
    # ru returns empty, en returns content
    mock_transcript_list.find_transcript.side_effect = [
        mock_transcript_empty,
        NoTranscriptFound("vid123", ["uk"], MagicMock()),
        mock_transcript_en,
    ]

    with patch("extractor.transcript.YouTubeTranscriptApi") as MockApi:
        MockApi.return_value.list.return_value = mock_transcript_list
        result = fetch_transcript("vid123")

    assert result is not None
    assert result["language"] == "en"
    assert "hello" in result["text"]


def test_fetch_transcript_handles_fetch_error():
    """Errors from transcript.fetch() should be caught and next language tried."""
    from youtube_transcript_api import NoTranscriptFound

    mock_transcript_bad = MagicMock()
    mock_transcript_bad.fetch.side_effect = RuntimeError("corrupt data")

    # Create successful en transcript
    mock_snippet_en = MagicMock()
    mock_snippet_en.text = "hello"

    mock_transcript_en = MagicMock()
    mock_transcript_en.fetch.return_value = [mock_snippet_en]

    mock_transcript_list = MagicMock()
    # ru fails with fetch error, en succeeds
    mock_transcript_list.find_transcript.side_effect = [
        mock_transcript_bad,
        NoTranscriptFound("vid123", ["uk"], MagicMock()),
        mock_transcript_en,
    ]

    with patch("extractor.transcript.YouTubeTranscriptApi") as MockApi:
        MockApi.return_value.list.return_value = mock_transcript_list
        result = fetch_transcript("vid123")

    assert result is not None
    assert result["language"] == "en"
    assert "hello" in result["text"]
