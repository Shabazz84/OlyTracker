from extractor.channel import get_channel_videos


def get_playlist_videos(url: str, max_videos: int | None = None) -> list[dict]:
    """Fetch video IDs and titles from a YouTube playlist.

    This is a thin wrapper around get_channel_videos, since yt-dlp handles
    both channels and playlists with identical --flat-playlist logic.

    Args:
        url: YouTube playlist URL
        max_videos: Optional limit on number of videos to fetch

    Returns:
        List of dicts with keys 'video_id' and 'title'. Empty list on error.
    """
    return get_channel_videos(url, max_videos=max_videos)
