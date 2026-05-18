import json
import pytest
from pathlib import Path
from extractor.telegram import parse_export, save_telegram_transcript


def _write_export(tmp_path, messages):
    path = tmp_path / "export.json"
    path.write_text(json.dumps({"messages": messages}), encoding="utf-8")
    return str(path)


def test_parse_export_returns_text_messages(tmp_path):
    path = _write_export(tmp_path, [
        {"type": "message", "date": "2024-01-01", "from": "Coach", "text": "Train hard"},
        {"type": "message", "date": "2024-01-02", "from": "Coach", "text": "Rest day"},
    ])
    messages = parse_export(path)
    assert len(messages) == 2
    assert messages[0]["text"] == "Train hard"


def test_parse_export_skips_service_messages(tmp_path):
    path = _write_export(tmp_path, [
        {"type": "service", "date": "2024-01-01", "text": "User joined"},
        {"type": "message", "date": "2024-01-02", "from": "Coach", "text": "Hello"},
    ])
    messages = parse_export(path)
    assert len(messages) == 1


def test_parse_export_skips_empty_text(tmp_path):
    path = _write_export(tmp_path, [
        {"type": "message", "date": "2024-01-01", "from": "Coach", "text": ""},
        {"type": "message", "date": "2024-01-02", "from": "Coach", "text": "  "},
        {"type": "message", "date": "2024-01-03", "from": "Coach", "text": "Real text"},
    ])
    messages = parse_export(path)
    assert len(messages) == 1


def test_parse_export_handles_rich_text(tmp_path):
    path = _write_export(tmp_path, [
        {"type": "message", "date": "2024-01-01", "from": "Coach",
         "text": ["Hello ", {"type": "bold", "text": "world"}, "!"]}
    ])
    messages = parse_export(path)
    assert messages[0]["text"] == "Hello world!"


def test_parse_export_returns_empty_list_if_file_missing():
    messages = parse_export("nonexistent_path.json")
    assert messages == []


def test_save_telegram_transcript_creates_file(tmp_path, monkeypatch):
    monkeypatch.setattr("config.TRANSCRIPT_DIR", str(tmp_path))
    messages = [
        {"date": "2024-01-01", "from": "Coach", "text": "Train hard"},
        {"date": "2024-01-02", "from": "Coach", "text": "Rest day"},
    ]
    save_telegram_transcript(messages, channel_name="test_channel")
    files = list((tmp_path / "telegram").rglob("*.txt"))
    assert len(files) == 1
    content = files[0].read_text(encoding="utf-8")
    assert "Train hard" in content
    assert "2024-01-01" in content
