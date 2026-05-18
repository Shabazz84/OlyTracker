import pytest
from pathlib import Path
from extractor.export import sanitize_name, transcript_path, exists, save_transcript, merge_transcripts


def test_sanitize_name_basic():
    assert sanitize_name("Hello World!") == "hello_world"


def test_sanitize_name_strips_special_chars():
    assert sanitize_name("Рывкачи #1 – klokov") == "1_klokov"


def test_sanitize_name_max_len():
    assert len(sanitize_name("a" * 100, max_len=60)) == 60


def test_transcript_path_contains_video_id():
    path = transcript_path("TestChannel", "abc123", "My Video")
    assert "abc123" in str(path)


def test_transcript_path_contains_channel():
    path = transcript_path("TestChannel", "abc123", "My Video")
    assert "testchannel" in str(path).lower()


def test_save_creates_file(tmp_path, monkeypatch):
    monkeypatch.setattr("config.TRANSCRIPT_DIR", str(tmp_path))
    save_transcript("chan", "vid1", "title one", "ru", "text content")
    assert exists("chan", "vid1", "title one")


def test_save_file_contains_metadata(tmp_path, monkeypatch):
    monkeypatch.setattr("config.TRANSCRIPT_DIR", str(tmp_path))
    save_transcript("chan", "vid1", "title one", "ru", "hello world", upload_date="2024-01-01")
    path = transcript_path("chan", "vid1", "title one")
    content = path.read_text(encoding="utf-8")
    assert "title one" in content
    assert "vid1" in content
    assert "2024-01-01" in content
    assert "hello world" in content


def test_exists_false_before_save(tmp_path, monkeypatch):
    monkeypatch.setattr("config.TRANSCRIPT_DIR", str(tmp_path))
    assert not exists("chan", "nope", "nope")


def test_merge_combines_all_transcripts(tmp_path, monkeypatch):
    monkeypatch.setattr("config.TRANSCRIPT_DIR", str(tmp_path))
    save_transcript("chan", "v1", "title one", "ru", "text one")
    save_transcript("chan", "v2", "title two", "en", "text two")
    merged = merge_transcripts("chan")
    content = merged.read_text(encoding="utf-8")
    assert "text one" in content
    assert "text two" in content


def test_merge_excludes_itself(tmp_path, monkeypatch):
    monkeypatch.setattr("config.TRANSCRIPT_DIR", str(tmp_path))
    save_transcript("chan", "v1", "title one", "ru", "text one")
    merge_transcripts("chan")
    # calling twice should not double-count
    merged = merge_transcripts("chan")
    content = merged.read_text(encoding="utf-8")
    assert content.count("text one") == 1
