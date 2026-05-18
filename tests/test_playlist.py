import pytest
from unittest.mock import patch, MagicMock
from extractor.playlist import get_playlist_videos


def test_get_playlist_videos_returns_video_list():
    mock_output = "xid1\tTitle A\nxid2\tTitle B\n"
    with patch("subprocess.run") as mock_run:
        mock_run.return_value = MagicMock(returncode=0, stdout=mock_output, stderr="")
        videos = get_playlist_videos("https://youtube.com/playlist?list=ABC")
    assert len(videos) == 2
    assert videos[0]["video_id"] == "xid1"


def test_get_playlist_videos_passes_url_to_yt_dlp():
    with patch("subprocess.run") as mock_run:
        mock_run.return_value = MagicMock(returncode=0, stdout="", stderr="")
        url = "https://youtube.com/playlist?list=PLfake123"
        get_playlist_videos(url)
        cmd = mock_run.call_args[0][0]
    assert url in cmd


def test_get_playlist_videos_respects_max():
    with patch("subprocess.run") as mock_run:
        mock_run.return_value = MagicMock(returncode=0, stdout="", stderr="")
        get_playlist_videos("https://youtube.com/playlist?list=ABC", max_videos=3)
        cmd = mock_run.call_args[0][0]
    assert "--playlist-end" in cmd
    assert "3" in cmd
