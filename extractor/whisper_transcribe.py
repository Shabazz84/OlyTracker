import logging
from pathlib import Path

import config

logger = logging.getLogger(__name__)

_model = None


def _get_model():
    global _model
    if _model is None:
        from faster_whisper import WhisperModel
        logger.info(
            f"Loading Whisper model {config.WHISPER_MODEL} "
            f"({config.WHISPER_DEVICE}/{config.WHISPER_COMPUTE_TYPE})..."
        )
        _model = WhisperModel(
            config.WHISPER_MODEL,
            device=config.WHISPER_DEVICE,
            compute_type=config.WHISPER_COMPUTE_TYPE,
        )
    return _model


def transcribe_audio(path: Path) -> dict | None:
    """Transcribe an audio file locally with faster-whisper.

    Args:
        path: Path to an audio file (mp3, etc.)

    Returns:
        Dict with keys 'text' (cleaned) and 'language' (detected code),
        or None if transcription fails or produces no text.
    """
    model = _get_model()
    try:
        segments, info = model.transcribe(str(path), vad_filter=True)
        text = " ".join(seg.text.strip() for seg in segments).strip()
    except Exception as e:
        logger.error(f"Whisper transcription failed for {path}: {e}")
        return None

    if not text:
        logger.warning(f"Whisper produced no text for {path}")
        return None

    return {"text": text, "language": info.language}
