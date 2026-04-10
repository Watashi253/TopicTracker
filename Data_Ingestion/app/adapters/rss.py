import feedparser
import requests
from bs4 import BeautifulSoup
from datetime import datetime, timezone
from newspaper import Article, Config
from app.models.models import RawArticle, SourceType


def _get_newspaper_config() -> Config:
    config = Config()
    config.browser_user_agent = (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    )
    config.request_timeout = 10
    config.fetch_images = False
    config.memoize_articles = False
    return config


# ── Generic browser headers for requests ────────────────────────────────────
BROWSER_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Referer": "https://www.google.com/",
}


def _parse_date(entry) -> datetime | None:
    try:
        return datetime(*entry.published_parsed[:6], tzinfo=timezone.utc)
    except Exception:
        return None


def _extract_rss_text(entry) -> str:
    if hasattr(entry, "content") and entry.content:
        return entry.content[0].value

    desc = entry.get("description", "")
    if len(desc) > 100:
        return desc

    return entry.get("summary", "")


def _fetch_with_newspaper(url: str) -> str | None:
    try:
        article = Article(url, config=_get_newspaper_config())
        article.download()
        article.parse()
        if article.text and len(article.text) > 200:
            return article.text
    except Exception:
        pass
    return None


def _scrape_ap_article(url: str) -> str | None:
    try:
        response = requests.get(url, headers=BROWSER_HEADERS, timeout=10)
        response.raise_for_status()
        soup = BeautifulSoup(response.text, "lxml")

        body = soup.find("div", class_="RichTextStoryBody")
        if body:
            paragraphs = body.find_all("p")
            text = " ".join(p.get_text(strip=True) for p in paragraphs)
            if len(text) > 200:
                return text
    except Exception:
        pass
    return None


def _extract_reuters_text(entry) -> str:
    summary_detail = getattr(entry, "summary_detail", None)
    if summary_detail and len(summary_detail.get("value", "")) > 100:
        return summary_detail["value"]

    return _extract_rss_text(entry)


def _scrape_generic(url: str) -> str | None:
    try:
        response = requests.get(url, headers=BROWSER_HEADERS, timeout=10)
        response.raise_for_status()
        soup = BeautifulSoup(response.text, "lxml")

        for tag in soup(["nav", "header", "footer", "aside", "script", "style"]):
            tag.decompose()

        paragraphs = soup.find_all("p")
        text = " ".join(p.get_text(strip=True) for p in paragraphs)
        if len(text) > 200:
            return text
    except Exception:
        pass
    return None


def extract_full_text(url: str, snippet: str, source_name: str) -> str:
    if "apnews.com" in url:
        text = _scrape_ap_article(url)
        if text:
            return text

    if "reuters.com" in url:
        text = _fetch_with_newspaper(url)
        if text:
            return text
        return snippet

    text = _fetch_with_newspaper(url)
    if text:
        return text

    text = _scrape_generic(url)
    if text:
        return text

    return snippet


def fetch_rss(url: str, source_name: str) -> list[RawArticle]:
    feed = feedparser.parse(url)
    articles = []

    for entry in feed.entries:
        article_url = entry.get("link", "")
        if not article_url:
            continue

        if source_name == "reuters":
            rss_text = _extract_reuters_text(entry)
        else:
            rss_text = _extract_rss_text(entry)

        full_text = extract_full_text(article_url, rss_text, source_name)

        articles.append(RawArticle(
            source_type  = SourceType.RSS,
            source_name  = source_name,
            url          = article_url,
            title        = entry.get("title", ""),
            snippet      = full_text,
            author       = entry.get("author", None),
            published_at = _parse_date(entry),
            fetched_at   = datetime.now(timezone.utc),
            raw_score    = None,
            language     = None,
            metadata     = {
                "feed_url": url,
            }
        ))

    return articles
