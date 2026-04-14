import asyncio
import sys
from pathlib import Path
from typing import Optional

import uvicorn
from fastapi import FastAPI, HTTPException, Query


if __name__ == "__main__" and __package__ is None:
    sys.path.append(str(Path(__file__).resolve().parents[1]))

from app.adapters.rss     import fetch_rss
from app.adapters.twitter import search_twitter, fetch_user_tweets
from app.adapters.gdelt   import search_gdelt, fetch_gdelt_timeline
from app.models.models    import RawArticle

app = FastAPI(
    title       = "Article Ingestion API",
    description = "Unified ingestion layer for RSS, Twitter/X and GDELT",
    version     = "2.0"
)

RSS_SOURCES = {
    "reuters":   "https://feeds.reuters.com/reuters/worldNews",
    "bbc":       "http://feeds.bbci.co.uk/news/rss.xml",
    "ap":        "https://rsshub.app/apnews/topics/apf-topnews",
    "aljazeera": "https://www.aljazeera.com/xml/rss/all.xml",
}


@app.get(
    "/fetch/rss/all",
    response_model = list[RawArticle],
    summary        = "Fetch all RSS sources",
    tags           = ["RSS"]
)
async def fetch_all_rss():
    """
    Fetches all configured RSS sources in parallel and returns
    a unified list of RawArticle objects.
    """
    loop     = asyncio.get_event_loop()
    articles = []

    for source_name, url in RSS_SOURCES.items():
        result = await loop.run_in_executor(None, fetch_rss, url, source_name)
        articles.extend(result)

    return articles


@app.get(
    "/fetch/rss/{source}",
    response_model = list[RawArticle],
    summary        = "Fetch a single RSS source",
    tags           = ["RSS"]
)
async def fetch_single_rss(source: str):
    """
    Fetch articles from a specific RSS source.
    Available: reuters, bbc, ap, aljazeera
    """
    if source not in RSS_SOURCES:
        raise HTTPException(
            status_code = 404,
            detail      = f"Unknown source '{source}'. Available: {list(RSS_SOURCES.keys())}"
        )
    loop   = asyncio.get_event_loop()
    result = await loop.run_in_executor(None, fetch_rss, RSS_SOURCES[source], source)
    return result


@app.get(
    "/fetch/twitter",
    response_model = list[RawArticle],
    summary        = "Search Twitter/X by topic query",
    tags           = ["Twitter"]
)
async def fetch_twitter(
    query: str = Query(..., description="Topic to search for e.g. 'oil crisis'"),
    limit: int = Query(default=25, le=100),
    lang:  str = Query(default="en", description="Language filter e.g. en, ar, fr"),
    since: Optional[str] = Query(
        default     = None,
        description = "Fetch tweets since this date (YYYY-MM-DD). Defaults to last 7 days."
    ),
):
    """
    Searches Twitter/X for tweets matching the query.
    Retweets are automatically excluded.
    Short tweets under 30 characters are filtered out.

    Note: Uses snscrape which does not require the official API.
    If Twitter changes its frontend, this may temporarily break.
    """
    loop   = asyncio.get_event_loop()
    result = await loop.run_in_executor(None, search_twitter, query, limit, lang, since)
    return result


@app.get(
    "/fetch/twitter/user/{username}",
    response_model = list[RawArticle],
    summary        = "Fetch tweets from a specific account",
    tags           = ["Twitter"]
)
async def fetch_twitter_user(
    username: str,
    limit:    int = Query(default=25, le=100)
):
    """
    Fetch recent tweets from a specific account.
    Useful for monitoring journalists, news agencies, or official accounts.
    e.g. /fetch/twitter/user/Reuters
    """
    loop   = asyncio.get_event_loop()
    result = await loop.run_in_executor(None, fetch_user_tweets, username, limit)
    return result


@app.get(
    "/fetch/gdelt",
    response_model = list[RawArticle],
    summary        = "Search GDELT global event database",
    tags           = ["GDELT"]
)
async def fetch_gdelt(
    query:    str = Query(..., description="Topic to search for"),
    limit:    int = Query(default=25, le=250),
    sort:     str = Query(
        default     = "HybridRel",
        description = "DateDesc | ToneDesc | HybridRel"
    ),
    timespan: str = Query(
        default     = "1week",
        description = "15min | 1hour | 1day | 1week | 1month"
    ),
    language: str = Query(default="English", description="Language filter"),
):
    """
    Searches GDELT — a global database monitoring news from 100+ countries
    across 65+ languages, updated every 15 minutes.

    HybridRel sort blends relevance + recency — best for topic tracking.
    DateDesc is better for breaking news.
    """
    loop   = asyncio.get_event_loop()
    result = await loop.run_in_executor(
        None, search_gdelt, query, limit, sort, timespan, language
    )
    return result


@app.get(
    "/fetch/gdelt/timeline",
    summary = "Get GDELT volume timeline for trend detection",
    tags    = ["GDELT"]
)
async def fetch_gdelt_volume_timeline(
    query: str = Query(..., description="Topic to get timeline for")
):
    """
    Returns a volume-over-time timeline for the query from GDELT.
    A spike in this timeline signals an emerging event or trend change.
    This data feeds into the topic_timeline table in the DB.
    """
    loop   = asyncio.get_event_loop()
    result = await loop.run_in_executor(None, fetch_gdelt_timeline, query)
    return result


@app.get(
    "/fetch/all",
    response_model = list[RawArticle],
    summary        = "Fetch from ALL sources for a query",
    tags           = ["Unified"]
)
async def fetch_all_sources(
    query: str = Query(..., description="Topic to search across all sources"),
    limit: int = Query(default=25, le=100, description="Max results per source"),
):
    """
    Fetches from RSS (all feeds) + Twitter + GDELT simultaneously
    for a given query and returns one unified list of RawArticle objects.

    All articles share the same schema regardless of source.
    Use this endpoint to flood the extraction queue for a subscription.
    """
    loop = asyncio.get_event_loop()

    rss_tasks = [
        loop.run_in_executor(None, fetch_rss, url, name)
        for name, url in RSS_SOURCES.items()
    ]
    twitter_task = loop.run_in_executor(None, search_twitter, query, limit, "en", None)
    gdelt_task   = loop.run_in_executor(None, search_gdelt, query, limit, "HybridRel", "1week", "English")

    all_tasks = rss_tasks + [twitter_task, gdelt_task]
    results   = await asyncio.gather(*all_tasks, return_exceptions=True)

    articles = []
    for result in results:
        if isinstance(result, Exception):
            continue
        articles.extend(result)

    return articles



if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8002)
