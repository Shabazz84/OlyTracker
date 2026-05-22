import re
import sys
import subprocess
import tempfile
import logging
from pathlib import Path

import config

logger = logging.getLogger(__name__)

COOKIES_PATH = Path("data/cookies.txt")


def clean_text(text: str) -> str:
    """Remove bracket annotations and normalize whitespace."""
    text = re.sub(r'\[.*?\]', '', text)
    text = re.sub(r'\s+', ' ', text)
    return text.strip()


def parse_vtt(content: str) -> str:
    """Parse WebVTT subtitle content into clean text.

    Handles YouTube's auto-generated VTT format with rolling captions
    (overlapping cues that need deduplication).
    """
    lines = []
    for line in content.split('\n'):
        line = line.strip()
        if not line:
            continue
        if line.startswith(('WEBVTT', 'Kind:', 'Language:')):
            continue
        if '-->' in line:
            continue
        if re.match(r'^\d+$', line):
            continue
        # Skip VTT cue positioning directives
        if re.match(r'^(align:|position:|line:|size:|vertical:)', line):
            continue
        # Remove HTML tags including inline timestamps like <00:00:00.000>
        line = re.sub(r'<[^>]+>', '', line).strip()
        if line:
            lines.append(line)

    # Deduplicate consecutive identical lines from YouTube's rolling captions
    deduped = []
    for line in lines:
        if not deduped or line != deduped[-1]:
            deduped.append(line)

    return clean_text(' '.join(deduped))


def _find_subtitle(tmpdir: Path, video_id: str) -> dict | None:
    """Find and parse a subtitle file from tmpdir in language priority order."""
    for lang in config.TRANSCRIPT_LANGUAGES:
        candidates = sorted(tmpdir.glob(f"{video_id}*{lang}*.vtt"))
        if not candidates:
            candidates = sorted(tmpdir.glob(f"{video_id}*{lang}*"))
        if candidates:
            try:
                content = candidates[0].read_text(encoding="utf-8")
                text = parse_vtt(content)
                if text:
                    return {"text": text, "language": lang}
            except Exception as e:
                logger.debug(f"Failed to parse subtitle for {video_id} ({lang}): {e}")
    return None


def fetch_transcript(video_id: str) -> dict | None:
    """Fetch transcript for a video using yt-dlp subtitle download.

    Downloads subtitle files (manual + auto-generated) via yt-dlp, which
    handles YouTube auth via cookies.txt and bypasses the IP blocking that
    affects youtube-transcript-api.

    Args:
        video_id: YouTube video ID

    Returns:
        Dict with keys 'text' (cleaned) and 'language' (ru/uk/en),
        or None if transcript unavailable or error occurs.
    """
    with tempfile.TemporaryDirectory() as tmpdir:
        output_template = str(Path(tmpdir) / "%(id)s")
        lang_codes = ",".join(config.TRANSCRIPT_LANGUAGES)
        cmd = [
            sys.executable, "-m", "yt_dlp",
            "--write-sub",
            "--write-auto-sub",
            "--sub-langs", lang_codes,
            "--skip-download",
            "--no-warnings",
            "--output", output_template,
            f"https://www.youtube.com/watch?v={video_id}",
        ]
        if COOKIES_PATH.exists():
            cmd += ["--cookies", str(COOKIES_PATH)]

        try:
            proc = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", timeout=60)
        except FileNotFoundError:
            logger.error("yt-dlp not found — install with: pip install yt-dlp")
            return None
        except subprocess.TimeoutExpired:
            logger.error(f"yt-dlp timed out for {video_id}")
            return None

        if proc.returncode != 0 and "429" in proc.stderr:
            logger.warning(f"Rate limited (429) for {video_id} — IP blocked, retry later")
            return None

        result = _find_subtitle(Path(tmpdir), video_id)
        if result is None:
            logger.warning(f"No transcript in preferred languages for {video_id}")
        return result
