import re
import logging
from youtube_transcript_api import YouTubeTranscriptApi, TranscriptsDisabled, NoTranscriptFound
import config

logger = logging.getLogger(__name__)


def clean_text(text: str) -> str:
    """Remove bracket annotations and normalize whitespace.

    - Removes text within square brackets (e.g., [Music], [Applause])
    - Collapses multiple whitespace characters to single spaces
    - Strips leading/trailing whitespace
    """
    text = re.sub(r'\[.*?\]', '', text)
    text = re.sub(r'\s+', ' ', text)
    return text.strip()


def fetch_transcript(video_id: str) -> dict | None:
    """Fetch transcript for a video ID with language fallback.

    Args:
        video_id: YouTube video ID

    Returns:
        Dict with keys 'text' (cleaned) and 'language' (ru/uk/en),
        or None if transcript unavailable or error occurs.
    """
    try:
        transcript_list = YouTubeTranscriptApi().list(video_id)

        # Try each language in priority order
        for lang in config.TRANSCRIPT_LANGUAGES:
            try:
                transcript = transcript_list.find_transcript([lang])
                # transcript.fetch() returns a FetchedTranscript iterable of
                # FetchedTranscriptSnippet objects with a .text attribute
                snippets = transcript.fetch()
                text = clean_text(" ".join(s.text for s in snippets))
                if not text:
                    continue
                return {"text": text, "language": lang}
            except NoTranscriptFound:
                continue
            except Exception:
                logger.debug(f"Failed to fetch {lang} transcript for {video_id}, trying next")
                continue

        logger.warning(f"No transcript in preferred languages for {video_id}")
        return None
    except TranscriptsDisabled:
        logger.warning(f"Transcripts disabled: {video_id}")
        return None
    except Exception as e:
        logger.error(f"Transcript fetch failed for {video_id}: {e}")
        return None
