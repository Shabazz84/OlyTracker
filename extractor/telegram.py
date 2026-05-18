import json
import logging
from pathlib import Path
import config
from extractor.export import sanitize_name

logger = logging.getLogger(__name__)


def parse_export(json_path: str) -> list[dict]:
    """Parse a Telegram Desktop JSON export file.

    Extracts text messages only, skips service messages and empty text.
    Handles both plain text and rich text (list with embedded objects).

    Args:
        json_path: Path to the Telegram Desktop export JSON file

    Returns:
        List of message dicts with keys: date, from, text
    """
    path = Path(json_path)
    if not path.exists():
        logger.warning(f"Telegram export not found: {json_path}")
        return []

    with open(path, encoding="utf-8") as f:
        data = json.load(f)

    messages = []
    for msg in data.get("messages", []):
        if msg.get("type") != "message":
            continue

        text = msg.get("text", "")

        # Handle rich text (list of strings and objects)
        if isinstance(text, list):
            text = "".join(
                part if isinstance(part, str) else part.get("text", "")
                for part in text
            )

        # Skip empty or whitespace-only text
        if text.strip():
            messages.append({
                "date": msg.get("date", ""),
                "from": msg.get("from", ""),
                "text": text.strip(),
            })

    logger.info(f"Parsed {len(messages)} messages from {json_path}")
    return messages


def save_telegram_transcript(messages: list[dict], channel_name: str = "atletisty") -> None:
    """Save parsed Telegram messages to a transcript file.

    Args:
        messages: List of message dicts from parse_export
        channel_name: Name of the Telegram channel for naming
    """
    out_dir = Path(config.TRANSCRIPT_DIR) / "telegram"
    out_dir.mkdir(parents=True, exist_ok=True)

    body = "\n\n".join(
        f"[{m['date']}] {m['from']}:\n{m['text']}" for m in messages
    )

    path = out_dir / f"{sanitize_name(channel_name)}.txt"
    content = (
        f"Source: Telegram export\n"
        f"Channel: {channel_name}\n"
        f"Messages: {len(messages)}\n"
        f"---\n"
        f"{body}\n"
    )

    path.write_text(content, encoding="utf-8")
    logger.info(f"Saved Telegram: {path}")
