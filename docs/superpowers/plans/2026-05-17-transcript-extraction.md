# Transcript Extraction Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a working CLI pipeline that fetches transcripts from YouTube channels, playlists, web pages, and Telegram exports, saving them as structured `.txt` files ready for LLM summarization.

**Architecture:** Thin extraction modules (one per source type), shared export module for all file I/O, `main.py` as the CLI orchestrator. External calls (yt-dlp subprocess, youtube-transcript-api, requests) are fully mocked in tests. Summarizer included as a stub — full summarizer is a separate plan.

**Tech Stack:** Python 3.14, yt-dlp (subprocess), youtube-transcript-api, requests, beautifulsoup4, tiktoken, pytest, unittest.mock

---

## File Map

| File | Responsibility |
|------|----------------|
| `requirements.txt` | All dependencies |
| `config.py` | All channels, paths, settings — no hardcoded values elsewhere |
| `extractor/__init__.py` | Empty package marker |
| `extractor/export.py` | Sanitize names, compute paths, save/load transcripts, merge |
| `extractor/transcript.py` | Fetch and clean YouTube transcripts via youtube-transcript-api |
| `extractor/channel.py` | Get video ID+title list from a channel URL via yt-dlp |
| `extractor/playlist.py` | Thin wrapper over channel.py for playlist URLs |
| `extractor/web.py` | Scrape text content from web pages |
| `extractor/telegram.py` | Parse Telegram Desktop JSON export |
| `summarizer/__init__.py` | Empty package marker |
| `summarizer/video_summarizer.py` | Stub — prevents ImportError when SUMMARIZE_ON_EXTRACT=True |
| `main.py` | CLI entry point (argparse), orchestrates all extractors |
| `tests/__init__.py` | Empty |
| `tests/test_export.py` | Tests for export.py |
| `tests/test_transcript.py` | Tests for transcript.py |
| `tests/test_channel.py` | Tests for channel.py |
| `tests/test_playlist.py` | Tests for playlist.py |
| `tests/test_web.py` | Tests for web.py |
| `tests/test_telegram.py` | Tests for telegram.py |

---

### Task 1: Project Setup

**Files:**
- Create: `requirements.txt`
- Create: `config.py`
- Create: `extractor/__init__.py`
- Create: `summarizer/__init__.py`
- Create: `tests/__init__.py`

- [ ] **Step 1: Create directory structure**

```powershell
New-Item -ItemType Directory -Force "extractor"
New-Item -ItemType Directory -Force "summarizer"
New-Item -ItemType Directory -Force "tests"
New-Item -ItemType Directory -Force "transcripts"
New-Item -ItemType Directory -Force "summaries"
New-Item -ItemType Directory -Force "data"
New-Item -ItemType Directory -Force "program"
```

- [ ] **Step 2: Write `requirements.txt`**

```
yt-dlp
youtube-transcript-api
requests
beautifulsoup4
tiktoken
tqdm
pytest
```

- [ ] **Step 3: Install dependencies**

```powershell
pip install -r requirements.txt
```

Expected: all packages install without error.

- [ ] **Step 4: Write `config.py`**

```python
import os

CHANNELS = [
    "https://www.youtube.com/@pavlukhinweightlifting",
    "https://www.youtube.com/@athletists",
    "https://www.youtube.com/@catalystathletics",
    "https://www.youtube.com/@torokhtiy",
    "https://www.youtube.com/channel/UCvHbRb9z_sIRzO7EHnN66SQ",
    "https://www.youtube.com/@DozerWeightlifting",
    "https://www.youtube.com/user/sonnywebsterGB",
]

PLAYLISTS = [
    "https://youtube.com/playlist?list=PLf-VoST4p_FpSx1M4hV2RY4IsupbJhMU1",
]

WEB_SOURCES = [
    "https://berestovteam.ru",
    "https://www.catalystathletics.com/article/",
    "https://blog.torokhtiy.com/",
    "https://power35.ru/biblioteka/last-man-standing-lms-trenirovki-s-dmitriem-golovinskim-denis-pikljaev/",
    "https://dozerweightlifting.com/",
    "https://www.theliftingzone.com/",
    "https://www.sonnywebster.com/",
]

TELEGRAM_EXPORT = "data/telegram_atletisty.json"

USE_YOUTUBE_API = False
YOUTUBE_API_KEY = os.getenv("YOUTUBE_API_KEY", "")

TRANSCRIPT_DIR = "transcripts"
SUMMARY_DIR = "summaries"

TRANSCRIPT_LANGUAGES = ["ru", "uk", "en"]
REQUEST_DELAY = 1.5
MAX_VIDEOS = None
SKIP_MISSING = True

OLLAMA_BASE_URL = "http://localhost:11434"
OLLAMA_MODEL = "qwen2.5:32b"
OLLAMA_FALLBACK_MODEL = "qwen2.5:14b"
OLLAMA_TIMEOUT = 120

SUMMARIZE_ON_EXTRACT = True

SUMMARY_CHUNK_TOKENS = 6000

OLY_PRIORITY_CHANNELS = [
    "UCvHbRb9z_sIRzO7EHnN66SQ",
]

DOZER_CHANNEL_HANDLE = "@DozerWeightlifting"
DOZER_CUE_INDEX_OUTPUT = "summaries/dozer_cue_index.md"
DOZER_CUE_KEYWORDS = ["back", "demon", "snatch receive", "overhead squat", "jerk", "position", "cue"]

WEBSTER_CHANNEL_HANDLE = "sonnywebsterGB"
WEBSTER_MOBILITY_KEYWORDS = ["mobility", "flexibility", "thoracic", "shoulder", "hip", "ankle", "stretch"]
```

- [ ] **Step 5: Create empty package markers**

```python
# extractor/__init__.py  — empty
# summarizer/__init__.py — empty
# tests/__init__.py      — empty
```

- [ ] **Step 6: Commit**

```powershell
git init
git add requirements.txt config.py extractor/__init__.py summarizer/__init__.py tests/__init__.py
git commit -m "feat: project setup, config, and package structure"
```

---

### Task 2: Export Module

**Files:**
- Create: `extractor/export.py`
- Create: `tests/test_export.py`

- [ ] **Step 1: Write failing tests**

```python
# tests/test_export.py
import pytest
from pathlib import Path
from extractor.export import sanitize_name, transcript_path, exists, save_transcript, merge_transcripts


def test_sanitize_name_basic():
    assert sanitize_name("Hello World!") == "hello_world"


def test_sanitize_name_strips_special_chars():
    assert sanitize_name("Рывкачи #1 – Кlokov") == "1_klokov"


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
```

- [ ] **Step 2: Run tests to verify they fail**

```powershell
pytest tests/test_export.py -v
```

Expected: `ModuleNotFoundError` or `ImportError` — `extractor.export` does not exist yet.

- [ ] **Step 3: Implement `extractor/export.py`**

```python
import re
import logging
from pathlib import Path
import config

logger = logging.getLogger(__name__)


def sanitize_name(name: str, max_len: int = 60) -> str:
    name = re.sub(r'[^\w\s-]', '', name.lower())
    name = re.sub(r'[\s\-]+', '_', name)
    name = name.strip('_')
    return name[:max_len]


def get_channel_dir(channel_name: str) -> Path:
    return Path(config.TRANSCRIPT_DIR) / sanitize_name(channel_name)


def transcript_path(channel_name: str, video_id: str, title: str) -> Path:
    safe_title = sanitize_name(title)
    return get_channel_dir(channel_name) / f"{video_id}_{safe_title}.txt"


def exists(channel_name: str, video_id: str, title: str) -> bool:
    return transcript_path(channel_name, video_id, title).exists()


def save_transcript(
    channel_name: str,
    video_id: str,
    title: str,
    language: str,
    text: str,
    upload_date: str = "",
) -> Path:
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
    channel_dir = get_channel_dir(channel_name)
    files = sorted(f for f in channel_dir.glob("*.txt") if f.name != "merged.txt")
    merged_path = channel_dir / "merged.txt"
    merged_path.write_text(
        "\n\n".join(f.read_text(encoding="utf-8") for f in files),
        encoding="utf-8",
    )
    logger.info(f"Merged {len(files)} transcripts → {merged_path}")
    return merged_path
```

- [ ] **Step 4: Run tests to verify they pass**

```powershell
pytest tests/test_export.py -v
```

Expected: all 8 tests PASS.

- [ ] **Step 5: Commit**

```powershell
git add extractor/export.py tests/test_export.py
git commit -m "feat: export module — save, path, merge transcript files"
```

---

### Task 3: Transcript Fetcher

**Files:**
- Create: `extractor/transcript.py`
- Create: `tests/test_transcript.py`

- [ ] **Step 1: Write failing tests**

```python
# tests/test_transcript.py
import pytest
from unittest.mock import patch, MagicMock
from extractor.transcript import fetch_transcript, clean_text


def test_clean_text_removes_bracket_annotations():
    assert clean_text("[Music] hello [Applause] world") == "hello world"


def test_clean_text_normalizes_whitespace():
    assert clean_text("hello   \n world") == "hello world"


def test_clean_text_strips_edges():
    assert clean_text("  hello  ") == "hello"


def test_fetch_transcript_success():
    mock_snippet = [
        {"text": "привет", "start": 0.0, "duration": 1.0},
        {"text": "мир", "start": 1.0, "duration": 1.0},
    ]
    mock_transcript = MagicMock()
    mock_transcript.fetch.return_value = mock_snippet
    mock_list = MagicMock()
    mock_list.find_transcript.return_value = mock_transcript

    with patch("extractor.transcript.YouTubeTranscriptApi.list_transcripts", return_value=mock_list):
        result = fetch_transcript("vid123")

    assert result is not None
    assert "привет" in result["text"]
    assert result["language"] in ("ru", "uk", "en")


def test_fetch_transcript_returns_none_when_disabled():
    from youtube_transcript_api import TranscriptsDisabled
    with patch(
        "extractor.transcript.YouTubeTranscriptApi.list_transcripts",
        side_effect=TranscriptsDisabled("vid"),
    ):
        result = fetch_transcript("vid123")
    assert result is None


def test_fetch_transcript_returns_none_on_generic_error():
    with patch(
        "extractor.transcript.YouTubeTranscriptApi.list_transcripts",
        side_effect=Exception("network error"),
    ):
        result = fetch_transcript("vid123")
    assert result is None


def test_fetch_transcript_falls_back_to_next_language():
    from youtube_transcript_api import NoTranscriptFound

    mock_snippet = [{"text": "hello", "start": 0.0, "duration": 1.0}]
    mock_transcript = MagicMock()
    mock_transcript.fetch.return_value = mock_snippet

    mock_list = MagicMock()
    # ru fails, uk fails, en succeeds
    mock_list.find_transcript.side_effect = [
        NoTranscriptFound("vid", ["ru"], {}),
        NoTranscriptFound("vid", ["uk"], {}),
        mock_transcript,
    ]

    with patch("extractor.transcript.YouTubeTranscriptApi.list_transcripts", return_value=mock_list):
        result = fetch_transcript("vid123")

    assert result is not None
    assert result["language"] == "en"
```

- [ ] **Step 2: Run tests to verify they fail**

```powershell
pytest tests/test_transcript.py -v
```

Expected: `ModuleNotFoundError` for `extractor.transcript`.

- [ ] **Step 3: Implement `extractor/transcript.py`**

```python
import re
import logging
from youtube_transcript_api import YouTubeTranscriptApi, TranscriptsDisabled, NoTranscriptFound
import config

logger = logging.getLogger(__name__)


def clean_text(text: str) -> str:
    text = re.sub(r'\[.*?\]', '', text)
    text = re.sub(r'\s+', ' ', text)
    return text.strip()


def fetch_transcript(video_id: str) -> dict | None:
    try:
        transcript_list = YouTubeTranscriptApi.list_transcripts(video_id)
        for lang in config.TRANSCRIPT_LANGUAGES:
            try:
                transcript = transcript_list.find_transcript([lang])
                snippets = transcript.fetch()
                text = " ".join(s["text"] for s in snippets)
                return {"text": clean_text(text), "language": lang}
            except NoTranscriptFound:
                continue
        logger.warning(f"No transcript in preferred languages for {video_id}")
        return None
    except TranscriptsDisabled:
        logger.warning(f"Transcripts disabled: {video_id}")
        return None
    except Exception as e:
        logger.error(f"Transcript fetch failed for {video_id}: {e}")
        return None
```

- [ ] **Step 4: Run tests to verify they pass**

```powershell
pytest tests/test_transcript.py -v
```

Expected: all 6 tests PASS.

- [ ] **Step 5: Commit**

```powershell
git add extractor/transcript.py tests/test_transcript.py
git commit -m "feat: transcript fetcher with language fallback and error handling"
```

---

### Task 4: Channel Video ID Fetcher

**Files:**
- Create: `extractor/channel.py`
- Create: `tests/test_channel.py`

- [ ] **Step 1: Write failing tests**

```python
# tests/test_channel.py
import pytest
from unittest.mock import patch, MagicMock
from extractor.channel import get_channel_videos, channel_name_from_url


def test_get_channel_videos_parses_tab_separated_output():
    mock_output = "abc123\tVideo Title One\ndef456\tVideo Title Two\n"
    with patch("subprocess.run") as mock_run:
        mock_run.return_value = MagicMock(returncode=0, stdout=mock_output, stderr="")
        videos = get_channel_videos("https://youtube.com/@test")
    assert len(videos) == 2
    assert videos[0] == {"video_id": "abc123", "title": "Video Title One"}
    assert videos[1] == {"video_id": "def456", "title": "Video Title Two"}


def test_get_channel_videos_returns_empty_on_yt_dlp_failure():
    with patch("subprocess.run") as mock_run:
        mock_run.return_value = MagicMock(returncode=1, stdout="", stderr="some error")
        videos = get_channel_videos("https://youtube.com/@test")
    assert videos == []


def test_get_channel_videos_skips_malformed_lines():
    mock_output = "abc123\tGood Title\nbadline\ndef456\tAnother Title\n"
    with patch("subprocess.run") as mock_run:
        mock_run.return_value = MagicMock(returncode=0, stdout=mock_output, stderr="")
        videos = get_channel_videos("https://youtube.com/@test")
    assert len(videos) == 2


def test_get_channel_videos_passes_playlist_end_when_max_set():
    with patch("subprocess.run") as mock_run:
        mock_run.return_value = MagicMock(returncode=0, stdout="", stderr="")
        get_channel_videos("https://youtube.com/@test", max_videos=5)
        cmd = mock_run.call_args[0][0]
    assert "--playlist-end" in cmd
    assert "5" in cmd


def test_get_channel_videos_no_playlist_end_when_max_none():
    with patch("subprocess.run") as mock_run:
        mock_run.return_value = MagicMock(returncode=0, stdout="", stderr="")
        get_channel_videos("https://youtube.com/@test", max_videos=None)
        cmd = mock_run.call_args[0][0]
    assert "--playlist-end" not in cmd


def test_channel_name_from_url_handle():
    assert channel_name_from_url("https://www.youtube.com/@pavlukhinweightlifting") == "pavlukhinweightlifting"


def test_channel_name_from_url_channel_id():
    assert channel_name_from_url("https://www.youtube.com/channel/UCvHbRb9z_sIRzO7EHnN66SQ") == "UCvHbRb9z_sIRzO7EHnN66SQ"


def test_channel_name_from_url_user():
    assert channel_name_from_url("https://www.youtube.com/user/sonnywebsterGB") == "sonnywebsterGB"
```

- [ ] **Step 2: Run tests to verify they fail**

```powershell
pytest tests/test_channel.py -v
```

Expected: `ModuleNotFoundError` for `extractor.channel`.

- [ ] **Step 3: Implement `extractor/channel.py`**

```python
import subprocess
import logging

logger = logging.getLogger(__name__)


def channel_name_from_url(url: str) -> str:
    for part in url.rstrip("/").split("/"):
        if part.startswith("@"):
            return part[1:]
        if part.startswith("UC") and len(part) > 20:
            return part
        if part and part not in ("", "youtube.com", "www.youtube.com", "https:", "http:", "channel", "user", "watch"):
            return part
    return url.split("/")[-1]


def get_channel_videos(url: str, max_videos: int | None = None) -> list[dict]:
    cmd = [
        "yt-dlp",
        "--flat-playlist",
        "--print", "%(id)s\t%(title)s",
        "--no-warnings",
        url,
    ]
    if max_videos is not None:
        cmd += ["--playlist-end", str(max_videos)]

    result = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
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
```

- [ ] **Step 4: Run tests to verify they pass**

```powershell
pytest tests/test_channel.py -v
```

Expected: all 8 tests PASS.

- [ ] **Step 5: Commit**

```powershell
git add extractor/channel.py tests/test_channel.py
git commit -m "feat: channel video ID fetcher via yt-dlp subprocess"
```

---

### Task 5: Playlist Video ID Fetcher

**Files:**
- Create: `extractor/playlist.py`
- Create: `tests/test_playlist.py`

- [ ] **Step 1: Write failing tests**

```python
# tests/test_playlist.py
import pytest
from unittest.mock import patch, MagicMock
from extractor.playlist import get_playlist_videos


def test_get_playlist_videos_returns_video_list():
    mock_output = "xid1\tTitle A\nxid2\tTitle B\n"
    with patch("subprocess.run") as mock_run:
        mock_run.return_value = MagicMock(returncode=0, stdout=mock_output, stderr="")
        videos = get_playlist_videos("https://youtube.com/playlist?list=ABC")
    assert len(videos) == 2
    assert videos[0]["video_id"] == "xid1"


def test_get_playlist_videos_passes_url_to_yt_dlp():
    with patch("subprocess.run") as mock_run:
        mock_run.return_value = MagicMock(returncode=0, stdout="", stderr="")
        url = "https://youtube.com/playlist?list=PLfake123"
        get_playlist_videos(url)
        cmd = mock_run.call_args[0][0]
    assert url in cmd


def test_get_playlist_videos_respects_max():
    with patch("subprocess.run") as mock_run:
        mock_run.return_value = MagicMock(returncode=0, stdout="", stderr="")
        get_playlist_videos("https://youtube.com/playlist?list=ABC", max_videos=3)
        cmd = mock_run.call_args[0][0]
    assert "--playlist-end" in cmd
    assert "3" in cmd
```

- [ ] **Step 2: Run tests to verify they fail**

```powershell
pytest tests/test_playlist.py -v
```

Expected: `ModuleNotFoundError` for `extractor.playlist`.

- [ ] **Step 3: Implement `extractor/playlist.py`**

```python
from extractor.channel import get_channel_videos


def get_playlist_videos(url: str, max_videos: int | None = None) -> list[dict]:
    return get_channel_videos(url, max_videos=max_videos)
```

- [ ] **Step 4: Run tests to verify they pass**

```powershell
pytest tests/test_playlist.py -v
```

Expected: all 3 tests PASS.

- [ ] **Step 5: Commit**

```powershell
git add extractor/playlist.py tests/test_playlist.py
git commit -m "feat: playlist fetcher (thin wrapper over channel fetcher)"
```

---

### Task 6: Web Scraper

**Files:**
- Create: `extractor/web.py`
- Create: `tests/test_web.py`

- [ ] **Step 1: Write failing tests**

```python
# tests/test_web.py
import pytest
from unittest.mock import patch, MagicMock
from extractor.web import scrape_url, save_web_transcript


def test_scrape_url_returns_text():
    mock_resp = MagicMock()
    mock_resp.text = "<html><body><p>Hello world</p><script>bad js</script></body></html>"
    mock_resp.raise_for_status = MagicMock()
    with patch("requests.get", return_value=mock_resp):
        text = scrape_url("https://example.com")
    assert "Hello world" in text
    assert "bad js" not in text


def test_scrape_url_removes_nav_and_footer():
    mock_resp = MagicMock()
    mock_resp.text = "<html><body><nav>Skip nav</nav><p>Content</p><footer>Skip footer</footer></body></html>"
    mock_resp.raise_for_status = MagicMock()
    with patch("requests.get", return_value=mock_resp):
        text = scrape_url("https://example.com")
    assert "Content" in text
    assert "Skip nav" not in text
    assert "Skip footer" not in text


def test_scrape_url_returns_none_on_network_error():
    with patch("requests.get", side_effect=Exception("timeout")):
        result = scrape_url("https://example.com")
    assert result is None


def test_scrape_url_returns_none_on_http_error():
    mock_resp = MagicMock()
    mock_resp.raise_for_status.side_effect = Exception("404")
    with patch("requests.get", return_value=mock_resp):
        result = scrape_url("https://example.com")
    assert result is None


def test_save_web_transcript_creates_file(tmp_path, monkeypatch):
    monkeypatch.setattr("config.TRANSCRIPT_DIR", str(tmp_path))
    save_web_transcript("https://example.com/article", "Some article text")
    files = list((tmp_path / "web").rglob("*.txt"))
    assert len(files) == 1
    assert "Some article text" in files[0].read_text(encoding="utf-8")
```

- [ ] **Step 2: Run tests to verify they fail**

```powershell
pytest tests/test_web.py -v
```

Expected: `ModuleNotFoundError` for `extractor.web`.

- [ ] **Step 3: Implement `extractor/web.py`**

```python
import logging
from pathlib import Path
import requests
from bs4 import BeautifulSoup
import config
from extractor.export import sanitize_name

logger = logging.getLogger(__name__)


def scrape_url(url: str) -> str | None:
    try:
        headers = {"User-Agent": "Mozilla/5.0 (compatible; OlyTracker/1.0)"}
        resp = requests.get(url, headers=headers, timeout=30)
        resp.raise_for_status()
        soup = BeautifulSoup(resp.text, "html.parser")
        for tag in soup(["script", "style", "nav", "footer", "header"]):
            tag.decompose()
        return soup.get_text(separator=" ", strip=True)
    except Exception as e:
        logger.error(f"Failed to scrape {url}: {e}")
        return None


def save_web_transcript(url: str, text: str) -> None:
    domain = url.split("//")[-1].split("/")[0].replace("www.", "")
    out_dir = Path(config.TRANSCRIPT_DIR) / "web" / sanitize_name(domain)
    out_dir.mkdir(parents=True, exist_ok=True)
    slug = sanitize_name(url.replace("https://", "").replace("http://", ""))[:80]
    path = out_dir / f"{slug}.txt"
    content = f"Source: {url}\nType: web\n---\n{text}\n"
    path.write_text(content, encoding="utf-8")
    logger.info(f"Saved web: {path}")
```

- [ ] **Step 4: Run tests to verify they pass**

```powershell
pytest tests/test_web.py -v
```

Expected: all 5 tests PASS.

- [ ] **Step 5: Commit**

```powershell
git add extractor/web.py tests/test_web.py
git commit -m "feat: web scraper with BeautifulSoup tag removal"
```

---

### Task 7: Telegram Parser

**Files:**
- Create: `extractor/telegram.py`
- Create: `tests/test_telegram.py`

- [ ] **Step 1: Write failing tests**

```python
# tests/test_telegram.py
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
```

- [ ] **Step 2: Run tests to verify they fail**

```powershell
pytest tests/test_telegram.py -v
```

Expected: `ModuleNotFoundError` for `extractor.telegram`.

- [ ] **Step 3: Implement `extractor/telegram.py`**

```python
import json
import logging
from pathlib import Path
import config
from extractor.export import sanitize_name

logger = logging.getLogger(__name__)


def parse_export(json_path: str) -> list[dict]:
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
        if isinstance(text, list):
            text = "".join(
                part if isinstance(part, str) else part.get("text", "")
                for part in text
            )
        if text.strip():
            messages.append({
                "date": msg.get("date", ""),
                "from": msg.get("from", ""),
                "text": text.strip(),
            })
    logger.info(f"Parsed {len(messages)} messages from {json_path}")
    return messages


def save_telegram_transcript(messages: list[dict], channel_name: str = "atletisty") -> None:
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
```

- [ ] **Step 4: Run tests to verify they pass**

```powershell
pytest tests/test_telegram.py -v
```

Expected: all 7 tests PASS.

- [ ] **Step 5: Commit**

```powershell
git add extractor/telegram.py tests/test_telegram.py
git commit -m "feat: Telegram Desktop JSON export parser"
```

---

### Task 8: Main CLI Entry Point

**Files:**
- Create: `summarizer/video_summarizer.py` (stub)
- Create: `main.py`

- [ ] **Step 1: Write the summarizer stub**

```python
# summarizer/video_summarizer.py
import logging

logger = logging.getLogger(__name__)


def summarize_video(channel_name: str, video_id: str, title: str, text: str) -> None:
    logger.debug(f"Summarizer stub called for {video_id} — not yet implemented")
```

- [ ] **Step 2: Write `main.py`**

```python
import argparse
import logging
import time

import config
from extractor.channel import get_channel_videos, channel_name_from_url
from extractor.playlist import get_playlist_videos
from extractor.transcript import fetch_transcript
from extractor.export import exists, save_transcript, merge_transcripts
from extractor.web import scrape_url, save_web_transcript
from extractor.telegram import parse_export, save_telegram_transcript

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(message)s",
    handlers=[
        logging.FileHandler("extraction.log", encoding="utf-8"),
        logging.StreamHandler(),
    ],
)
logger = logging.getLogger(__name__)


def _maybe_summarize(channel_name: str, video_id: str, title: str, text: str) -> None:
    if not config.SUMMARIZE_ON_EXTRACT:
        return
    try:
        from summarizer.video_summarizer import summarize_video
        summarize_video(channel_name, video_id, title, text)
    except Exception as e:
        logger.error(f"Summarization failed for {video_id}: {e}")


def process_channel(url: str, force: bool = False, max_videos: int | None = None) -> tuple[int, int, int]:
    channel_name = channel_name_from_url(url)
    logger.info(f"Channel: {channel_name} ({url})")
    videos = get_channel_videos(url, max_videos=max_videos)
    logger.info(f"  {len(videos)} videos found")
    extracted = skipped = errors = 0
    for video in videos:
        vid_id = video["video_id"]
        title = video["title"]
        if not force and exists(channel_name, vid_id, title):
            skipped += 1
            continue
        result = fetch_transcript(vid_id)
        time.sleep(config.REQUEST_DELAY)
        if result is None:
            skipped += 1 if config.SKIP_MISSING else None
            errors += 0 if config.SKIP_MISSING else 1
            continue
        save_transcript(channel_name, vid_id, title, result["language"], result["text"])
        _maybe_summarize(channel_name, vid_id, title, result["text"])
        extracted += 1
    if extracted > 0:
        merge_transcripts(channel_name)
    return extracted, skipped, errors


def process_playlist(url: str, force: bool = False, max_videos: int | None = None) -> tuple[int, int, int]:
    playlist_id = url.split("list=")[-1][:24]
    name = f"playlist_{playlist_id}"
    logger.info(f"Playlist: {name}")
    videos = get_playlist_videos(url, max_videos=max_videos)
    extracted = skipped = errors = 0
    for video in videos:
        vid_id = video["video_id"]
        title = video["title"]
        if not force and exists(name, vid_id, title):
            skipped += 1
            continue
        result = fetch_transcript(vid_id)
        time.sleep(config.REQUEST_DELAY)
        if result is None:
            skipped += 1
            continue
        save_transcript(name, vid_id, title, result["language"], result["text"])
        _maybe_summarize(name, vid_id, title, result["text"])
        extracted += 1
    if extracted > 0:
        merge_transcripts(name)
    return extracted, skipped, errors


def process_web() -> int:
    saved = 0
    for url in config.WEB_SOURCES:
        text = scrape_url(url)
        if text:
            save_web_transcript(url, text)
            saved += 1
        time.sleep(config.REQUEST_DELAY)
    return saved


def process_telegram() -> int:
    messages = parse_export(config.TELEGRAM_EXPORT)
    if messages:
        save_telegram_transcript(messages)
    return len(messages)


def main() -> None:
    parser = argparse.ArgumentParser(description="OlyTracker transcript extractor")
    parser.add_argument("--channel", help="Extract single channel URL")
    parser.add_argument("--playlist", help="Extract single playlist URL")
    parser.add_argument("--web", action="store_true")
    parser.add_argument("--telegram", action="store_true")
    parser.add_argument("--extract-only", action="store_true", help="Skip LLM summarization")
    parser.add_argument("--summarize-only", action="store_true", help="Run summarizer on existing transcripts")
    parser.add_argument("--force", action="store_true", help="Re-download existing transcripts")
    parser.add_argument("--max", type=int, help="Max videos per channel/playlist")
    parser.add_argument("--priority-oly", action="store_true", help="Only Golovinsky OLY channel")
    parser.add_argument("--synthesize", action="store_true", help="Generate master synthesis (not yet implemented)")
    parser.add_argument("--cue-index", action="store_true", help="Generate cue index (not yet implemented)")
    args = parser.parse_args()

    if args.extract_only:
        config.SUMMARIZE_ON_EXTRACT = False

    if args.summarize_only:
        logger.info("--summarize-only: summarizer not yet implemented")
        return

    if args.synthesize or args.cue_index:
        logger.info("--synthesize / --cue-index: not yet implemented")
        return

    totals = {"extracted": 0, "skipped": 0, "errors": 0}

    def _add(e, s, err):
        totals["extracted"] += e
        totals["skipped"] += s
        totals["errors"] += err

    if args.channel:
        _add(*process_channel(args.channel, force=args.force, max_videos=args.max))
    elif args.playlist:
        _add(*process_playlist(args.playlist, force=args.force, max_videos=args.max))
    elif args.web:
        saved = process_web()
        logger.info(f"Web: saved {saved} pages")
    elif args.telegram:
        n = process_telegram()
        logger.info(f"Telegram: {n} messages parsed")
    else:
        channels = config.CHANNELS
        if args.priority_oly:
            channels = [
                url for url in config.CHANNELS
                if any(p in url for p in config.OLY_PRIORITY_CHANNELS)
            ]
        for url in channels:
            _add(*process_channel(url, force=args.force, max_videos=args.max))
        for url in config.PLAYLISTS:
            _add(*process_playlist(url, force=args.force, max_videos=args.max))
        process_web()
        process_telegram()

    logger.info(
        f"\nDone — extracted: {totals['extracted']}, "
        f"skipped: {totals['skipped']}, errors: {totals['errors']}"
    )


if __name__ == "__main__":
    main()
```

- [ ] **Step 3: Smoke test the CLI (dry run with --max 1 on a single channel)**

```powershell
python main.py --channel "https://www.youtube.com/@catalystathletics" --max 1 --extract-only
```

Expected: prints channel name, video count, fetches 1 transcript (or logs "skipped" if no transcript available), creates file in `transcripts/catalystathletics/`.

- [ ] **Step 4: Run full test suite**

```powershell
pytest tests/ -v
```

Expected: all tests PASS.

- [ ] **Step 5: Commit**

```powershell
git add main.py summarizer/video_summarizer.py
git commit -m "feat: main CLI entry point and summarizer stub"
```

---

## Self-Review

### Spec coverage check

| Requirement | Task |
|-------------|------|
| channel.py — fetch video IDs | Task 4 |
| playlist.py — fetch video IDs | Task 5 |
| transcript.py — fetch and clean | Task 3 |
| web.py — scrape web sources | Task 6 |
| telegram.py — parse JSON export | Task 7 |
| export.py — save .txt, merged.txt | Task 2 |
| main.py — all CLI flags | Task 8 |
| config.py — all settings | Task 1 |
| `--extract-only`, `--force`, `--max` flags | Task 8 |
| `--priority-oly` flag | Task 8 |
| SKIP_MISSING, REQUEST_DELAY respected | Task 8 |
| Transcript format: Title/Channel/Language/Video ID/URL/Date/--- | Task 2 |
| Logging to extraction.log | Task 8 |
| Check existing before fetching | Task 8 |
| SUMMARIZE_ON_EXTRACT hook | Task 8 |

All requirements covered. `--synthesize` and `--cue-index` are stubbed — those belong to the summarizer plan.

### Type consistency

- `get_channel_videos` → `list[dict]` with keys `video_id`, `title` — used consistently in Task 8.
- `fetch_transcript` → `dict | None` with keys `text`, `language` — used consistently in Task 8.
- `save_transcript(channel_name, video_id, title, language, text, upload_date="")` — signature matches call sites.
- `process_channel` → `tuple[int, int, int]` — matches `_add(*process_channel(...))` in Task 8.
