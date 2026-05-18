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
