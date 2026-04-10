import requests
from datetime import datetime, timezone
from app.models.models import RawArticle, SourceType


GDELT_API_URL = "https://api.gdeltproject.org/api/v2/doc/doc"


def _parse_gdelt_date(date_str: str) -> datetime | None:
    """
    GDELT dates come as "20260329120000" (YYYYMMDDHHmmss)
    """
    try:
        return datetime.strptime(date_str, "%Y%m%d%H%M%S").replace(tzinfo=timezone.utc)
    except Exception:
        return None


def _map_gdelt_article(article: dict, query: str) -> RawArticle:
    return RawArticle(
        source_type  = SourceType.GDELT,
        source_name  = "gdelt",
        url          = article.get("url", ""),
        title        = article.get("title", ""),
        snippet      = article.get("seendate", ""),
        author       = None,
        published_at = _parse_gdelt_date(article.get("seendate", "")),
        fetched_at   = datetime.now(timezone.utc),
        raw_score    = None,
        language     = article.get("language", None),
        metadata     = {
            "domain":       article.get("domain", None),
            "sourcecountry":article.get("sourcecountry", None),
            "tone":         article.get("tone", None),
            "search_query": query,
        }
    )


def search_gdelt(
    query:      str,
    limit:      int  = 25,
    sort:       str  = "DateDesc",
    timespan:   str  = "1week",
    language:   str  = "English",
) -> list[RawArticle]:
    """
    Search GDELT's global event database for articles matching the query.

    GDELT monitors 65+ languages across 100+ countries in real time.
    It is updated every 15 minutes — much fresher than most RSS feeds.

    sort options:
        DateDesc  → newest first (good for real-time tracking)
        ToneDesc  → most positive first
        HybridRel → blend of relevance + recency (best for topic tracking)
    """
    try:
        params = {
            "query":      f"{query} sourcelang:{language}",
            "mode":       "artlist",
            "maxrecords": min(limit, 250),
            "format":     "json",
            "sort":       sort,
            "timespan":   timespan,
        }

        response = requests.get(
            GDELT_API_URL,
            params  = params,
            timeout = 15,
            headers = {"User-Agent": "TopicTracker/1.0 Research Project"}
        )
        response.raise_for_status()

        data     = response.json()
        raw_list = data.get("articles", [])

        articles = []
        for item in raw_list:
            url = item.get("url", "")
            if not url:
                continue
            articles.append(_map_gdelt_article(item, query))

        return articles

    except Exception as e:
        print(f"[GDELT] search failed for query='{query}': {e}")
        return []


def search_gdelt_by_country(
    query:   str,
    country: str,
    limit:   int = 25,
) -> list[RawArticle]:
    """
    Search GDELT for articles about a query filtered to a specific country.
    e.g. search_gdelt_by_country("election", "IN") → India election news
    """
    country_query = f"{query} sourcecountry:{country}"
    return search_gdelt(country_query, limit=limit)


def fetch_gdelt_timeline(query: str) -> dict:
    """
    Returns a volume timeline for the query over time.
    Useful for detecting spikes in coverage — trend change identification.
    This feeds into the topic_timeline table.

    Returns dict with "timeline" list of {date, value} pairs.
    """
    try:
        params = {
            "query":    query,
            "mode":     "timelinevol",
            "format":   "json",
            "timespan": "1month",
        }

        response = requests.get(GDELT_API_URL, params=params, timeout=15)
        response.raise_for_status()
        return response.json()

    except Exception as e:
        print(f"[GDELT] timeline fetch failed for query='{query}': {e}")
        return {}
