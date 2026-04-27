"""
Google News + Web Search scraper adapter.

Two-pronged approach:
  1. Google News RSS  — high-quality curated news with publisher info & dates
  2. DuckDuckGo HTML  — reliable web search with real article URLs

Both return RawArticle objects matching the unified schema.
No API keys required.
"""

import requests
from bs4 import BeautifulSoup
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from urllib.parse import urlparse, parse_qs, unquote
import xml.etree.ElementTree as ET
from app.models.models import RawArticle, SourceType


# ── Shared headers ──────────────────────────────────────────────────────────
BROWSER_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
}

GOOGLE_NEWS_RSS = "https://news.google.com/rss/search"


# ── Helper functions ────────────────────────────────────────────────────────

def _parse_rfc822_date(date_str: str) -> datetime | None:
    """Parse RFC-822 date format used in RSS (e.g. 'Mon, 27 Apr 2026 04:00:34 GMT')."""
    try:
        return parsedate_to_datetime(date_str)
    except Exception:
        return None


def _extract_domain(url: str) -> str:
    """Pull a clean domain from a URL."""
    try:
        domain = urlparse(url).netloc
        if domain.startswith("www."):
            domain = domain[4:]
        return domain
    except Exception:
        return "unknown"


def _decode_ddg_url(href: str) -> str:
    """
    DuckDuckGo wraps URLs in redirects like:
      //duckduckgo.com/l/?uddg=https%3A%2F%2Freal-url.com%2F...
    Extract the real destination URL.
    """
    if "uddg=" in href:
        parsed = parse_qs(urlparse(href).query)
        uddg = parsed.get("uddg")
        if uddg:
            return unquote(uddg[0])

    # If it starts with //, it's protocol-relative
    if href.startswith("//"):
        return "https:" + href

    return href


# ═══════════════════════════════════════════════════════════════════════════
#  1. Google News RSS — curated news with publisher info
# ═══════════════════════════════════════════════════════════════════════════

def search_google_news_rss(query: str, num_results: int = 6) -> list[RawArticle]:
    """
    Fetch articles from Google News RSS feed.

    Note: Article URLs are Google News redirect links — they redirect
    to the original article via JavaScript in a browser. The extraction
    pipeline handles this via newspaper3k's built-in redirect following.
    """
    try:
        params = {
            "q":    query,
            "hl":   "en",
            "gl":   "US",
            "ceid": "US:en",
        }

        response = requests.get(
            GOOGLE_NEWS_RSS,
            params=params,
            headers={"User-Agent": "TopicTracker/1.0 Research Project"},
            timeout=12,
        )
        response.raise_for_status()

        root = ET.fromstring(response.text)
        items = root.findall(".//item")
        articles = []

        for item in items[:num_results]:
            title_el = item.find("title")
            link_el = item.find("link")
            pub_el = item.find("pubDate")
            source_el = item.find("source")
            desc_el = item.find("description")

            title = title_el.text.strip() if title_el is not None and title_el.text else ""
            if not title:
                continue

            # Clean title — Google often appends " - Source Name"
            # Keep it for context since we have the source separately too
            link = link_el.text.strip() if link_el is not None and link_el.text else ""
            if not link:
                continue

            # Publisher info
            publisher = source_el.text.strip() if source_el is not None and source_el.text else "Unknown"
            publisher_url = source_el.get("url", "") if source_el is not None else ""

            # Parse date
            published_at = None
            if pub_el is not None and pub_el.text:
                published_at = _parse_rfc822_date(pub_el.text.strip())

            # Extract snippet from description HTML
            snippet = ""
            if desc_el is not None and desc_el.text:
                soup = BeautifulSoup(desc_el.text, "lxml")
                snippet = soup.get_text(separator=" ", strip=True)
                # Remove trailing publisher name if it duplicates
                if snippet.endswith(publisher):
                    snippet = snippet[: -len(publisher)].strip()

            articles.append(RawArticle(
                source_type  = SourceType.WEB,
                source_name  = "google_news",
                url          = link,
                title        = title,
                snippet      = snippet or None,
                author       = publisher,
                published_at = published_at,
                fetched_at   = datetime.now(timezone.utc),
                raw_score    = None,
                language     = "en",
                metadata     = {
                    "search_query":  query,
                    "publisher":     publisher,
                    "publisher_url": publisher_url,
                }
            ))

        print(f"[GoogleNews RSS] Fetched {len(articles)} articles for query='{query}'")
        return articles

    except Exception as e:
        print(f"[GoogleNews RSS] Failed for query='{query}': {e}")
        return []


# ═══════════════════════════════════════════════════════════════════════════
#  2. DuckDuckGo HTML — reliable web search with real URLs
# ═══════════════════════════════════════════════════════════════════════════

def search_duckduckgo(query: str, num_results: int = 6) -> list[RawArticle]:
    """
    Scrape DuckDuckGo HTML search results for news articles.

    Uses the HTML-only endpoint which is scraper-friendly.
    Returns actual article URLs (not redirect links).
    """
    try:
        search_query = f"{query} news"
        response = requests.get(
            "https://html.duckduckgo.com/html/",
            params={"q": search_query},
            headers=BROWSER_HEADERS,
            timeout=12,
        )
        response.raise_for_status()

        soup = BeautifulSoup(response.text, "lxml")
        result_blocks = soup.select("div.result")
        articles = []

        for block in result_blocks[:num_results]:
            # Title & URL
            title_el = block.select_one("a.result__a")
            if not title_el:
                continue

            title = title_el.get_text(strip=True)
            raw_href = title_el.get("href", "")
            url = _decode_ddg_url(raw_href)

            if not url or "duckduckgo.com" in url:
                continue

            # Snippet
            snippet_el = block.select_one("a.result__snippet")
            snippet = snippet_el.get_text(strip=True) if snippet_el else ""

            # Display URL / domain
            domain = _extract_domain(url)

            articles.append(RawArticle(
                source_type  = SourceType.WEB,
                source_name  = "web_search",
                url          = url,
                title        = title,
                snippet      = snippet or None,
                author       = domain,
                published_at = None,
                fetched_at   = datetime.now(timezone.utc),
                raw_score    = None,
                language     = "en",
                metadata     = {
                    "search_query": query,
                    "publisher":    domain,
                    "search_engine": "duckduckgo",
                }
            ))

        print(f"[DuckDuckGo] Scraped {len(articles)} articles for query='{query}'")
        return articles

    except Exception as e:
        print(f"[DuckDuckGo] Search failed for query='{query}': {e}")
        return []


# ═══════════════════════════════════════════════════════════════════════════
#  Combined search — tries both, merges & deduplicates
# ═══════════════════════════════════════════════════════════════════════════

def search_google_news(query: str, num_results: int = 6) -> list[RawArticle]:
    """
    Main entry point. Combines Google News RSS + DuckDuckGo search
    for maximum coverage. Returns up to num_results articles,
    prioritising Google News (curated) first, then DuckDuckGo.

    Deduplicates by title similarity to avoid showing the same article twice.
    """
    gnews_articles = search_google_news_rss(query, num_results)
    ddg_articles   = search_duckduckgo(query, num_results)

    # Deduplicate by lowercase title prefix (first 40 chars)
    seen_titles = set()
    combined = []

    for article in gnews_articles + ddg_articles:
        title_key = article.title.lower()[:40].strip()
        if title_key in seen_titles:
            continue
        seen_titles.add(title_key)
        combined.append(article)

    print(f"[GoogleNews+DDG] Combined {len(combined)} unique articles for query='{query}'")
    return combined[:num_results * 2]  # Return up to 2x requested for variety
