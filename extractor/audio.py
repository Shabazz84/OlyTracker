import subprocess
import sys
import logging
from pathlib import Path

import config

logger = logging.getLogger(__name__)

COOKIES_PATH = Path("data/cookies.txt")


def download_audio(video_id: str, out_path: Path) -> bool:
    """Download a video's audio track as mp3 via yt-dlp.

    Args:
        video_id: YouTube video ID
        out_path: Destination .mp3 path (parent dirs are created)

    Returns:
        True if the file was downloaded successfully.
    """
    if out_path.exists():
        return True

    out_path.parent.mkdir(parents=True, exist_ok=True)
    template = str(out_path.with_suffix(""))
    cmd = [
        sys.executable, "-m", "yt_dlp",
        "-x", "--audio-format", "mp3",
        "--no-warnings",
        "-o", template + ".%(ext)s",
        f"https://www.youtube.com/watch?v={video_id}",
    ]
    if getattr(config, "YTDLP_COOKIES_BROWSER", None):
        cmd += ["--cookies-from-browser", config.YTDLP_COOKIES_BROWSER]
    elif COOKIES_PATH.exists():
        cmd += ["--cookies", str(COOKIES_PATH)]

    try:
        proc = subprocess.run(
            cmd, capture_output=True, text=True, encoding="utf-8",
            errors="replace", timeout=600,
        )
    except FileNotFoundError:
        logger.error("yt-dlp not found — install with: pip install yt-dlp")
        return False
    except subprocess.TimeoutExpired:
        logger.error(f"yt-dlp audio download timed out for {video_id}")
        return False

    if proc.returncode != 0:
        logger.error(f"Audio download failed for {video_id}: {proc.stderr[-500:]}")
        return False

    return out_path.exists()
