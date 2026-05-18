import logging
from pathlib import Path
from urllib.parse import urlparse
import requests
from bs4 import BeautifulSoup
import config
from extractor.export import sanitize_name

logger = logging.getLogger(__name__)


def scrape_url(url: str) -> str | None:
    """Fetch a URL and extract plain text, removing scripts, styles, and navigation.

    Args:
        url: The URL to scrape

    Returns:
        Cleaned text content, or None if fetch/parse fails
    """
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
    """Save scraped web content to a text file.

    Args:
        url: The source URL
        text: The extracted text content
    """
    parsed = urlparse(url)
    domain = parsed.netloc.replace("www.", "") or sanitize_name(url)[:30]
    out_dir = Path(config.TRANSCRIPT_DIR) / "web" / sanitize_name(domain)
    out_dir.mkdir(parents=True, exist_ok=True)
    slug = sanitize_name(url.replace("https://", "").replace("http://", ""), max_len=80)
    path = out_dir / f"{slug}.txt"
    content = f"Source: {url}\nType: web\n---\n{text}\n"
    path.write_text(content, encoding="utf-8")
    logger.info(f"Saved web: {path}")
