try:
    import snscrape.modules.twitter as sntwitter
except Exception as exc:
    sntwitter = None
    _SNSCRAPE_IMPORT_ERROR = exc

from datetime import datetime, timezone, timedelta
from app.models.models import RawArticle, SourceType


def _build_twitter_query(
    query:    str,
    lang:     str  = "en",
    since:    str  = None,
    exclude:  list = None,
) -> str:
    """
    Builds a Twitter advanced search query string.
    e.g. "oil crisis lang:en -retweet since:2026-03-22"
    """
    parts = [query]

    if lang:
        parts.append(f"lang:{lang}")

    if since:
        parts.append(f"since:{since}")
    else:
        week_ago = (datetime.now() - timedelta(days=7)).strftime("%Y-%m-%d")
        parts.append(f"since:{week_ago}")

    if exclude:
        for word in exclude:
            parts.append(f"-{word}")

    parts.append("-filter:retweets")

    return " ".join(parts)


def _map_tweet(tweet, query: str) -> RawArticle:
    return RawArticle(
        source_type  = SourceType.TWITTER,
        source_name  = "twitter",
        url          = tweet.url,
        title        = tweet.content[:100],
        snippet      = tweet.content,
        author       = f"@{tweet.user.username}" if tweet.user else None,
        published_at = tweet.date.replace(tzinfo=timezone.utc)
                       if tweet.date.tzinfo is None
                       else tweet.date,
        fetched_at   = datetime.now(timezone.utc),
        raw_score    = float(tweet.likeCount) if tweet.likeCount else 0.0,
        language     = tweet.lang if hasattr(tweet, "lang") else None,
        metadata     = {
            "tweet_id":      str(tweet.id),
            "username":      tweet.user.username if tweet.user else None,
            "retweet_count": tweet.retweetCount if hasattr(tweet, "retweetCount") else 0,
            "reply_count":   tweet.replyCount   if hasattr(tweet, "replyCount")   else 0,
            "quote_count":   tweet.quoteCount   if hasattr(tweet, "quoteCount")   else 0,
            "search_query":  query,
        }
    )


def search_twitter(
    query:   str,
    limit:   int  = 25,
    lang:    str  = "en",
    since:   str  = None,
) -> list[RawArticle]:
    """
    Search Twitter/X for tweets matching the query.
    Uses snscrape which does not require the official API.

    WARNING: snscrape breaks when Twitter changes its frontend.
    If it fails, the adapter returns [] silently — the pipeline
    continues without Twitter data.
    """
    if sntwitter is None:
        print(f"[Twitter] snscrape unavailable: {_SNSCRAPE_IMPORT_ERROR}")
        return []

    try:
        search_query = _build_twitter_query(
            query   = query,
            lang    = lang,
            since   = since,
            exclude = ["retweet"],
        )

        articles = []
        scraper  = sntwitter.TwitterSearchScraper(search_query)

        for tweet in scraper.get_items():
            if len(articles) >= limit:
                break

            if len(tweet.content) < 30:
                continue

            articles.append(_map_tweet(tweet, query))

        return articles

    except Exception as e:
        print(f"[Twitter] search failed for query='{query}': {e}")
        print("[Twitter] snscrape may have broken due to Twitter frontend changes.")
        return []


def fetch_user_tweets(username: str, limit: int = 25) -> list[RawArticle]:
    """
    Fetch recent tweets from a specific account.
    Useful for monitoring journalists, analysts, official accounts.
    e.g. fetch_user_tweets("Reuters") for Reuters official tweets
    """
    if sntwitter is None:
        print(f"[Twitter] snscrape unavailable: {_SNSCRAPE_IMPORT_ERROR}")
        return []

    try:
        articles  = []
        scraper   = sntwitter.TwitterUserScraper(username)

        for tweet in scraper.get_items():
            if len(articles) >= limit:
                break
            articles.append(_map_tweet(tweet, query=f"user:{username}"))

        return articles

    except Exception as e:
        print(f"[Twitter] fetch_user_tweets failed for @{username}: {e}")
        return []
