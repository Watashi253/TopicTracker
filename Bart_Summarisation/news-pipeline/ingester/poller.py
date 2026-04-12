import logging
from datetime import datetime, timezone

import httpx
from pymongo.errors import DuplicateKeyError

from config.settings import settings
from db.mongo import get_sync_db
from db.redis_client import get_redis

logger = logging.getLogger(__name__)


def poll_and_ingest() -> None:
    logger.info("[Poller] Poll started at %s", datetime.now(timezone.utc).isoformat())

    # Parse comma-separated URLs from .env
    urls = [u.strip() for u in settings.NEWS_URLS.split(",") if u.strip()]
    if not urls:
        logger.error("[Poller] NEWS_URLS is empty in .env — nothing to poll")
        return

    db = get_sync_db()
    raw_col = db[settings.RAW_COLLECTION]
    raw_col.create_index("url", unique=True)
    r = get_redis()

    for endpoint in urls:
        logger.info("[Poller] Fetching: %s", endpoint)
        try:
            with httpx.Client(timeout=30) as client:
                response = client.get(endpoint)
                response.raise_for_status()
                data = response.json()
        except Exception as exc:
            logger.error("[Poller] Failed to fetch %s: %s", endpoint, exc)
            continue  # skip this source, try the next one

        articles = data if isinstance(data, list) else [data]
        logger.info("[Poller] Got %d article(s) from %s", len(articles), endpoint)

        new_count = 0
        for article in articles:
            article["ingested_at"] = datetime.now(timezone.utc).isoformat()
            article["summarized"] = False

            try:
                result = raw_col.insert_one(article)
                r.rpush(settings.REDIS_QUEUE_KEY, str(result.inserted_id))
                new_count += 1
                logger.info("[Poller] ✓ Ingested: %s", article.get("title", "—"))
            except DuplicateKeyError:
                logger.debug("[Poller] Duplicate skipped: %s", article.get("url"))
            except Exception as exc:
                logger.error("[Poller] Insert error: %s", exc)

        logger.info("[Poller] %d new article(s) from %s", new_count, endpoint)