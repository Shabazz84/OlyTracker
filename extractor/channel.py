import subprocess
import sys
import logging

logger = logging.getLogger(__name__)


class ChannelFetchError(Exception):
    """Raised when channel video fetching fails."""
    pass


def channel_name_from_url(url: str) -> str:
    """Extract channel name from YouTube URL.

    Handles three formats:
    - https://www.youtube.com/@pavlukhinweightlifting → pavlukhinweightlifting
    - https://www.youtube.com/channel/UCvHbRb9z_sIRzO7EHnN66SQ → UCvHbRb9z_sIRzO7EHnN66SQ
    - https://www.youtube.com/user/sonnywebsterGB → sonnywebsterGB
    """
    for part in url.rstrip("/").split("/"):
        if part.startswith("@"):
            return part[1:]
        if part.startswith("UC") and len(part) == 24:
            return part
        if part and part not in ("", "youtube.com", "www.youtube.com", "https:", "http:", "channel", "user", "watch"):
            return part
    return url.split("/")[-1]


def get_channel_videos(url: str, max_videos: int | None = None) -> list[dict]:
    """Fetch video IDs and titles from a YouTube channel.

    Uses yt-dlp to extract videos in tab-separated format: video_id\ttitle

    Args:
        url: YouTube channel URL
        max_videos: Optional limit on number of videos to fetch

    Returns:
        List of dicts with keys 'video_id' and 'title'. Empty list on error.
    """
    cmd = [
        sys.executable, "-m", "yt_dlp",
        "--flat-playlist",
        "--print", "%(id)s\t%(title)s",
        url,
    ]
    if max_videos is not None:
        cmd += ["--playlist-end", str(max_videos)]

    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
    except FileNotFoundError:
        logger.error("yt-dlp not found — install with: pip install yt-dlp or python -m pip install yt-dlp")
        return []
    except subprocess.TimeoutExpired:
        logger.error(f"yt-dlp timed out (120s) for {url}")
        return []

    if result.returncode != 0:
        logger.error(f"yt-dlp failed for {url}: {result.stderr}")
        return []

    videos = []
    for line in result.stdout.strip().splitlines():
        if "\t" in line:
            vid_id, title = line.split("\t", 1)
            videos.append({"video_id": vid_id.strip(), "title": title.strip()})
        else:
            logger.debug(f"Skipping malformed line: {line!r}")
    return videos
