import os
import redis
from celery import Celery
from dotenv import load_dotenv

from app.adapters.rss     import fetch_rss
from app.adapters.twitter import search_twitter
from app.adapters.gdelt   import search_gdelt

try:
    from app.adapters.reddit import smart_reddit_fetch
except ModuleNotFoundError:
    smart_reddit_fetch = None

load_dotenv()

# ── Celery app ────────────────────────────────────────────────────────────────
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

celery_app = Celery(
    "ingestion",
    broker  = REDIS_URL,
    backend = REDIS_URL,
)

celery_app.conf.timezone = "UTC"

# ── Redis client for locks + seen_urls ───────────────────────────────────────
r = redis.Redis.from_url(REDIS_URL)

# ── RSS Sources ───────────────────────────────────────────────────────────────
RSS_SOURCES = {
    "reuters":   "https://feeds.reuters.com/reuters/worldNews",
    "bbc":       "http://feeds.bbci.co.uk/news/rss.xml",
    "ap":        "https://rsshub.app/apnews/topics/apf-topnews",
    "aljazeera": "https://www.aljazeera.com/xml/rss/all.xml",
}


# ═══════════════════════════════════════════════════════════════════════════════
# HELPERS
# ═══════════════════════════════════════════════════════════════════════════════

def already_seen(url: str) -> bool:
    """Check if this URL has already been processed."""
    return r.sismember("seen_urls", url)


def mark_seen(url: str):
    """Mark URL as seen so it is never processed twice."""
    r.sadd("seen_urls", url)


def acquire_lock(lock_name: str, ttl: int) -> bool:
    """
    Try to acquire a Redis lock.
    Returns True if lock acquired, False if already locked.
    TTL is how long the lock lives in seconds.
    """
    return r.set(lock_name, 1, ex=ttl, nx=True)


def release_lock(lock_name: str):
    """Release a Redis lock."""
    r.delete(lock_name)


def hand_off_to_extraction(articles: list, source_name: str):
    """
    Filter out seen URLs and push new articles to the extraction queue.
    This is the handoff point between Person 1 and Person 2.
    """
    new_count = 0
    for article in articles:
        if not article.url:
            continue
        if already_seen(article.url):
            continue

        mark_seen(article.url)

        celery_app.send_task(
            "tasks.perform_extraction",
            args=[article.url, article.source_name],
            queue="extraction",
            routing_key="extraction",
        )
        new_count += 1

    print(f"[{source_name}] {new_count} new articles sent to extraction queue")
    return new_count


# ═══════════════════════════════════════════════════════════════════════════════
# EXTRACTION HANDOFF TASK
# this task lives in the extraction queue — Person 2 will override this
# we define it here just to have something to push to
# ═══════════════════════════════════════════════════════════════════════════════

@celery_app.task(queue="extraction", name="app.tasks.send_to_extraction")
def send_to_extraction(raw_article_dict: dict):
    """
    Placeholder — Person 2 replaces this with actual extraction logic.
    newspaper3k → BERT dedup → BART summary → write to PostgreSQL
    """
    print(f"[Extraction] received: {raw_article_dict.get('url', 'unknown')}")



# ═══════════════════════════════════════════════════════════════════════════════
# PHASE 1 — RSS TASKS (one per source, dedicated queue each)
# ══
@celery_app.task(queue="reuters", name="app.tasks.fetch_reuters")
def fetch_reuters():
    """
    Fetch Reuters RSS feed.
    Lock TTL = 280s (just under the 300s Beat interval).
    """
    lock = "lock:reuters"
    if not acquire_lock(lock, ttl=280):
        print("[Reuters] already running, skipping this round")
        return

    try:
        articles = fetch_rss(RSS_SOURCES["reuters"], "reuters")
        hand_off_to_extraction(articles, "reuters")
    except Exception as e:
        print(f"[Reuters] failed: {e}")
    finally:
        release_lock(lock)


@celery_app.task(queue="bbc", name="app.tasks.fetch_bbc")
def fetch_bbc():
    """Fetch BBC RSS feed."""
    lock = "lock:bbc"
    if not acquire_lock(lock, ttl=280):
        print("[BBC] already running, skipping this round")
        return

    try:
        articles = fetch_rss(RSS_SOURCES["bbc"], "bbc")
        hand_off_to_extraction(articles, "bbc")
    except Exception as e:
        print(f"[BBC] failed: {e}")
    finally:
        release_lock(lock)


@celery_app.task(queue="ap", name="app.tasks.fetch_ap")
def fetch_ap():
    """Fetch AP News RSS feed."""
    lock = "lock:ap"
    if not acquire_lock(lock, ttl=280):
        print("[AP] already running, skipping this round")
        return

    try:
        articles = fetch_rss(RSS_SOURCES["ap"], "ap")
        hand_off_to_extraction(articles, "ap")
    except Exception as e:
        print(f"[AP] failed: {e}")
    finally:
        release_lock(lock)


@celery_app.task(queue="aljazeera", name="app.tasks.fetch_aljazeera")
def fetch_aljazeera():
    """Fetch Al Jazeera RSS feed."""
    lock = "lock:aljazeera"
    if not acquire_lock(lock, ttl=280):
        print("[AlJazeera] already running, skipping this round")
        return

    try:
        articles = fetch_rss(RSS_SOURCES["aljazeera"], "aljazeera")
        hand_off_to_extraction(articles, "aljazeera")
    except Exception as e:
        print(f"[AlJazeera] failed: {e}")
    finally:
        release_lock(lock)


# ═══════════════════════════════════════════════════════════════════════════════
# PHASE 1 — REDDIT TASKS (query-driven, one task per subscription)
# ═══════════════════════════════════════════════════════════════════════════════

@celery_app.task(queue="reddit", name="app.tasks.fetch_reddit_for_query")
def fetch_reddit_for_query(query: str):
    """
    Search Reddit for posts matching a specific user subscription query.
    Lock key includes the query so different topics run independently.
    Lock TTL = 580s (just under the 600s Beat interval).
    """
    lock = f"lock:reddit:{query}"
    if not acquire_lock(lock, ttl=580):
        print(f"[Reddit] already running for query='{query}', skipping")
        return

    try:
        if smart_reddit_fetch is None:
            print("[Reddit] adapter not available, skipping")
            return
        articles = smart_reddit_fetch(query, limit=25)
        hand_off_to_extraction(articles, f"reddit:{query}")
    except Exception as e:
        print(f"[Reddit] failed for query='{query}': {e}")
    finally:
        release_lock(lock)


# ═══════════════════════════════════════════════════════════════════════════════
# PHASE 1 — TWITTER TASKS (query-driven)
# ═══════════════════════════════════════════════════════════════════════════════

@celery_app.task(queue="twitter", name="app.tasks.fetch_twitter_for_query")
def fetch_twitter_for_query(query: str):
    """
    Search Twitter/X for tweets matching a specific user subscription query.
    Lock TTL = 880s (just under the 900s Beat interval).
    """
    lock = f"lock:twitter:{query}"
    if not acquire_lock(lock, ttl=880):
        print(f"[Twitter] already running for query='{query}', skipping")
        return

    try:
        articles = search_twitter(query, limit=25)
        hand_off_to_extraction(articles, f"twitter:{query}")
    except Exception as e:
        print(f"[Twitter] failed for query='{query}': {e}")
    finally:
        release_lock(lock)


# ═══════════════════════════════════════════════════════════════════════════════
# PHASE 1 — GDELT TASKS (query-driven)
# ═══════════════════════════════════════════════════════════════════════════════

@celery_app.task(queue="gdelt", name="app.tasks.fetch_gdelt_for_query")
def fetch_gdelt_for_query(query: str):
    """
    Search GDELT global event database for a specific user subscription query.
    GDELT updates every 15 mins so we use 15 min interval.
    Lock TTL = 880s.
    """
    lock = f"lock:gdelt:{query}"
    if not acquire_lock(lock, ttl=880):
        print(f"[GDELT] already running for query='{query}', skipping")
        return

    try:
        articles = search_gdelt(query, limit=25, sort="HybridRel", timespan="1day")
        hand_off_to_extraction(articles, f"gdelt:{query}")
    except Exception as e:
        print(f"[GDELT] failed for query='{query}': {e}")
    finally:
        release_lock(lock)


# ═══════════════════════════════════════════════════════════════════════════════
# SUBSCRIPTION MANAGEMENT
# called by Person 4 (FastAPI backend) when a user registers a new topic
# ═══════════════════════════════════════════════════════════════════════════════

@celery_app.task(name="app.tasks.register_new_subscription")
def register_new_subscription(query: str):
    """
    Called when a user subscribes to a new topic.

    Does two things:
    1. Immediately triggers a one-time fetch across all query-driven sources
    2. Adds the query to the Beat schedule for continuous monitoring

    RSS sources always run in the background — no per-query task needed for them.
    """
    print(f"[Subscription] registering new query: '{query}'")

    # 1 — immediate one-time fetch across all sources
    fetch_reddit_for_query.apply_async(args=[query], queue="reddit")
    fetch_twitter_for_query.apply_async(args=[query], queue="twitter")
    fetch_gdelt_for_query.apply_async(args=[query],   queue="gdelt")

    # 2 — add to recurring Beat schedule
    _add_to_beat_schedule(query)

    print(f"[Subscription] '{query}' is now being monitored continuously")


def _add_to_beat_schedule(query: str):
    """
    Dynamically adds recurring Celery Beat tasks for a new subscription query.
    Reddit every 10 mins, Twitter every 15 mins, GDELT every 15 mins.
    """
    celery_app.conf.beat_schedule[f"reddit-{query}"] = {
        "task":     "app.tasks.fetch_reddit_for_query",
        "schedule": 600.0,
        "args":     [query],
        "options":  {"queue": "reddit"},
    }
    celery_app.conf.beat_schedule[f"twitter-{query}"] = {
        "task":     "app.tasks.fetch_twitter_for_query",
        "schedule": 900.0,
        "args":     [query],
        "options":  {"queue": "twitter"},
    }
    celery_app.conf.beat_schedule[f"gdelt-{query}"] = {
        "task":     "app.tasks.fetch_gdelt_for_query",
        "schedule": 900.0,
        "args":     [query],
        "options":  {"queue": "gdelt"},
    }


# ═══════════════════════════════════════════════════════════════════════════════
# CELERY BEAT SCHEDULE — static tasks (RSS always runs regardless of queries)
# ═══════════════════════════════════════════════════════════════════════════════

celery_app.conf.beat_schedule = {

    # ── RSS sources (every 5 mins, always running) ──────────────────────────
    "fetch-reuters": {
        "task":     "app.tasks.fetch_reuters",
        "schedule": 300.0,
        "options":  {"queue": "reuters"},
    },
    "fetch-bbc": {
        "task":     "app.tasks.fetch_bbc",
        "schedule": 300.0,
        "options":  {"queue": "bbc"},
    },
    "fetch-ap": {
        "task":     "app.tasks.fetch_ap",
        "schedule": 300.0,
        "options":  {"queue": "ap"},
    },
    "fetch-aljazeera": {
        "task":     "app.tasks.fetch_aljazeera",
        "schedule": 300.0,
        "options":  {"queue": "aljazeera"},
    },

    # ── Query-driven sources have NO static schedule here ───────────────────
    # They are added dynamically when a user subscribes via register_new_subscription()
    # Reddit, Twitter, GDELT only run when there is at least one active subscription
}
