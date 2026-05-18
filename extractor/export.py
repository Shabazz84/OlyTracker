import re
import logging
from pathlib import Path
import config

logger = logging.getLogger(__name__)


def sanitize_name(name: str, max_len: int = 60) -> str:
    """Convert any string to a safe filesystem name.

    - Converts to lowercase
    - Strips non-ASCII-word characters and hyphens
    - Replaces whitespace and hyphens with underscores
    - Collapses consecutive underscores
    - Limits to max_len characters
    """
    name = re.sub(r'[^\w\s-]', '', name.lower(), flags=re.ASCII)
    name = re.sub(r'[\s\-]+', '_', name)
    name = re.sub(r'_+', '_', name)
    name = name.strip('_')
    return name[:max_len]


def get_channel_dir(channel_name: str) -> Path:
    """Return the channel subdirectory path."""
    return Path(config.TRANSCRIPT_DIR) / sanitize_name(channel_name)


def transcript_path(channel_name: str, video_id: str, title: str) -> Path:
    """Return the full path to a transcript file."""
    safe_title = sanitize_name(title)
    return get_channel_dir(channel_name) / f"{video_id}_{safe_title}.txt"


def exists(channel_name: str, video_id: str, title: str) -> bool:
    """Check if a transcript file already exists."""
    return transcript_path(channel_name, video_id, title).exists()


def save_transcript(
    channel_name: str,
    video_id: str,
    title: str,
    language: str,
    text: str,
    upload_date: str = "",
) -> Path:
    """Save transcript to file with metadata header."""
    path = transcript_path(channel_name, video_id, title)
    path.parent.mkdir(parents=True, exist_ok=True)
    content = (
        f"Title: {title}\n"
        f"Channel: {channel_name}\n"
        f"Language: {language}\n"
        f"Video ID: {video_id}\n"
        f"URL: https://www.youtube.com/watch?v={video_id}\n"
        f"Date: {upload_date}\n"
        f"---\n"
        f"{text}\n"
    )
    path.write_text(content, encoding="utf-8")
    logger.info(f"Saved: {path}")
    return path


def merge_transcripts(channel_name: str) -> Path:
    """Merge all transcripts in a channel into merged.txt."""
    channel_dir = get_channel_dir(channel_name)
    channel_dir.mkdir(parents=True, exist_ok=True)
    files = sorted(f for f in channel_dir.glob("*.txt") if f.name != "merged.txt")
    merged_path = channel_dir / "merged.txt"
    merged_path.write_text(
        "\n\n".join(f.read_text(encoding="utf-8") for f in files),
        encoding="utf-8",
    )
    logger.info(f"Merged {len(files)} transcripts → {merged_path}")
    return merged_path
