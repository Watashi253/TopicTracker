from newspaper import Article as NewsArticle
from newspaper.article import ArticleDownloadState
import datetime

# Source credibility weights
SOURCE_CREDIBILITY = {
    "Reuters": 1.0,
    "BBC News": 1.0,
    "AP News": 1.0,
    "Al Jazeera": 0.95,
    "Reddit": 0.60,
    "Twitter": 0.50
}

from playwright.sync_api import sync_playwright
from newspaper import Article as NewsArticle
import datetime
# ... (SOURCE_CREDIBILITY dictionary remains same)

def extract_with_playwright(url: str):
    """Fallback: Uses a headless browser to render JS and bypass basic blocks."""
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            page.goto(url, wait_until="networkidle", timeout=30000)
            content = page.content()
            title = page.title()
            browser.close()
            return title, content
        except Exception as e:
            browser.close()
            return None, None

def extract_article_data(url: str, source_name: str):
    try:
        article = NewsArticle(url)
        article.download()
        # Use the Enum for comparison
        if article.download_state != ArticleDownloadState.SUCCESS:
            print(f"🔄 newspaper4k blocked for {url}. Trying Playwright...")
            title, html = extract_with_playwright(url)
            if not html: return None
           # Use the Enum for assignment to fix Pylance error
            article.html = html
            article.download_state = ArticleDownloadState.SUCCESS
        article.parse()
        # Validation: ensure text was actually extracted
        if not article.text or len(article.text) < 100:
            return None

        score = SOURCE_CREDIBILITY.get(source_name, 0.75)
        return {
            "title": article.title,
            "url": url,
            "full_text": article.text,
            "source": source_name,
            "published": article.publish_date or datetime.datetime.now(),
            "credibility_score": score
        }
    except Exception as e:
        print(f"Extraction failed for {url}: {e}")
        return None