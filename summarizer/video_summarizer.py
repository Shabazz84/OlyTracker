import logging

logger = logging.getLogger(__name__)


def summarize_video(channel_name: str, video_id: str, title: str, text: str) -> None:
    logger.debug(f"Summarizer stub called for {video_id} — not yet implemented")
