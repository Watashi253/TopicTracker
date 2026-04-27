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

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

celery_app = Celery(
    "ingestion",
    broker  = REDIS_URL,
    backend = REDIS_URL,
)

celery_app.conf.timezone = "UTC"
r = redis.Redis.from_url(REDIS_URL)
RSS_SOURCES = {
    "reuters":   "https://feeds.reuters.com/reuters/worldNews",
    "bbc":       "http://feeds.bbci.co.uk/news/rss.xml",
    "ap":        "https://rsshub.app/apnews/topics/apf-topnews",
    "aljazeera": "https://www.aljazeera.com/xml/rss/all.xml",
}


def already_seen(url: str) -> bool:
    """Check if this URL has already been processed."""
    return r.sismember("seen_urls", url)


def mark_seen(url: str):
    r.sadd("seen_urls", url)


def acquire_lock(lock_name: str, ttl: int) -> bool:
    
    return r.set(lock_name, 1, ex=ttl, nx=True)


def release_lock(lock_name: str):
    """Release a Redis lock."""
    r.delete(lock_name)


def hand_off_to_extraction(articles: list, source_name: str):
    
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


@celery_app.task(queue="extraction", name="app.tasks.send_to_extraction")
def send_to_extraction(raw_article_dict: dict):
    """
    Placeholder — Person 2 replaces this with actual extraction logic.
    newspaper3k → BERT dedup → BART summary → write to PostgreSQL
    """
    print(f"[Extraction] received: {raw_article_dict.get('url', 'unknown')}")

@celery_app.task(queue="reuters", name="app.tasks.fetch_reuters")
def fetch_reuters():
    
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


@celery_app.task(queue="reddit", name="app.tasks.fetch_reddit_for_query")
def fetch_reddit_for_query(query: str):
    
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



@celery_app.task(queue="gdelt", name="app.tasks.fetch_gdelt_for_query")
def fetch_gdelt_for_query(query: str):
   
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



@celery_app.task(name="app.tasks.register_new_subscription")
def register_new_subscription(query: str):
    
    print(f"[Subscription] registering new query: '{query}'")

    # 1 — immediate one-time fetch across all sources
    fetch_reddit_for_query.apply_async(args=[query], queue="reddit")
    fetch_twitter_for_query.apply_async(args=[query], queue="twitter")
    fetch_gdelt_for_query.apply_async(args=[query],   queue="gdelt")

    # 2 — add to recurring Beat schedule
    _add_to_beat_schedule(query)

    print(f"[Subscription] '{query}' is now being monitored continuously")


def _add_to_beat_schedule(query: str):
    
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



@celery_app.task(queue="maintenance", name="app.tasks.send_cluster_alerts")
def send_cluster_alerts_task(cluster_id: int, article_data: dict):
    """
    Celery task to send email alerts to all users subscribed to a cluster.
    Called by Database_and_bert_infra when a new article is added to a cluster.
    
    Args:
        cluster_id: ID of the cluster
        article_data: Dictionary with article info {id, title, url, source, summary, credibility_score}
    """
    from app.alerts.email_alert import send_cluster_alerts
    
    try:
        # Import database session
        from sqlalchemy import create_engine
        from sqlalchemy.orm import sessionmaker
        from app.config import DATABASE_URL
        
        engine = create_engine(DATABASE_URL)
        Session = sessionmaker(bind=engine)
        db = Session()
        
        sent_count = send_cluster_alerts(db, cluster_id, article_data)
        print(f"[send_cluster_alerts_task] Sent {sent_count} alerts for cluster {cluster_id}")
        
        db.close()
        return sent_count
        
    except Exception as e:
        print(f"[send_cluster_alerts_task] Error: {e}")
        return 0


celery_app.conf.beat_schedule = {

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

}
