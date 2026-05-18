import pytest
import subprocess as sp
from unittest.mock import patch, MagicMock
from extractor.channel import get_channel_videos, channel_name_from_url


def test_get_channel_videos_parses_tab_separated_output():
    mock_output = "abc123\tVideo Title One\ndef456\tVideo Title Two\n"
    with patch("subprocess.run") as mock_run:
        mock_run.return_value = MagicMock(returncode=0, stdout=mock_output, stderr="")
        videos = get_channel_videos("https://youtube.com/@test")
    assert len(videos) == 2
    assert videos[0] == {"video_id": "abc123", "title": "Video Title One"}
    assert videos[1] == {"video_id": "def456", "title": "Video Title Two"}


def test_get_channel_videos_returns_empty_on_yt_dlp_failure():
    with patch("subprocess.run") as mock_run:
        mock_run.return_value = MagicMock(returncode=1, stdout="", stderr="some error")
        videos = get_channel_videos("https://youtube.com/@test")
    assert videos == []


def test_get_channel_videos_skips_malformed_lines():
    mock_output = "abc123\tGood Title\nbadline\ndef456\tAnother Title\n"
    with patch("subprocess.run") as mock_run:
        mock_run.return_value = MagicMock(returncode=0, stdout=mock_output, stderr="")
        videos = get_channel_videos("https://youtube.com/@test")
    assert len(videos) == 2


def test_get_channel_videos_passes_playlist_end_when_max_set():
    with patch("subprocess.run") as mock_run:
        mock_run.return_value = MagicMock(returncode=0, stdout="", stderr="")
        get_channel_videos("https://youtube.com/@test", max_videos=5)
        cmd = mock_run.call_args[0][0]
    assert "--playlist-end" in cmd
    assert "5" in cmd


def test_get_channel_videos_no_playlist_end_when_max_none():
    with patch("subprocess.run") as mock_run:
        mock_run.return_value = MagicMock(returncode=0, stdout="", stderr="")
        get_channel_videos("https://youtube.com/@test", max_videos=None)
        cmd = mock_run.call_args[0][0]
    assert "--playlist-end" not in cmd


def test_channel_name_from_url_handle():
    assert channel_name_from_url("https://www.youtube.com/@pavlukhinweightlifting") == "pavlukhinweightlifting"


def test_channel_name_from_url_channel_id():
    assert channel_name_from_url("https://www.youtube.com/channel/UCvHbRb9z_sIRzO7EHnN66SQ") == "UCvHbRb9z_sIRzO7EHnN66SQ"


def test_channel_name_from_url_user():
    assert channel_name_from_url("https://www.youtube.com/user/sonnywebsterGB") == "sonnywebsterGB"


def test_get_channel_videos_returns_empty_when_ytdlp_missing():
    with patch("subprocess.run", side_effect=FileNotFoundError("yt-dlp not found")):
        videos = get_channel_videos("https://youtube.com/@test")
    assert videos == []


def test_get_channel_videos_returns_empty_on_timeout():
    with patch("subprocess.run", side_effect=sp.TimeoutExpired(["yt-dlp"], 120)):
        videos = get_channel_videos("https://youtube.com/@test")
    assert videos == []
