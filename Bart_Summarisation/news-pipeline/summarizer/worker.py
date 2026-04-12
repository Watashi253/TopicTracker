"""
Summarizer worker
-----------------
A long-running blocking process that:

  1. BLPOP  article _id from Redis queue  (blocks until one arrives)
  2. Fetch  raw article from MongoDB raw_articles
  3. Skip   if already processed (safe on worker restart)
  4. Call   HuggingFace BART → short_title  (2-6 words)
                              → medium_summary (1-3 sentences)
  5. Insert processed document into processed_articles
  6. Update raw article: summarized=True

The two collections are linked by  processed_articles.raw_article_id → raw_articles._id

Start with:
    make worker
or:
    python -m summarizer.worker
"""
import logging
import time
from datetime import datetime, timezone

from bson import ObjectId
from pymongo.errors import DuplicateKeyError

from config.settings import settings
from db.mongo import get_sync_db
from db.redis_client import get_redis
from summarizer.hf_client import get_medium_summary, get_short_title

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(message)s",
)
logger = logging.getLogger(__name__)


def run_worker() -> None:  # noqa: C901 — intentionally one long function
    r = get_redis()
    db = get_sync_db()
    raw_col = db[settings.RAW_COLLECTION]
    proc_col = db[settings.PROCESSED_COLLECTION]

    # Unique index — prevents double-processing even if _id appears in queue twice
    proc_col.create_index("raw_article_id", unique=True)

    logger.info("[Worker] Summarizer worker started. Listening on '%s'…", settings.REDIS_QUEUE_KEY)

    while True:
        try:
            # BLPOP blocks for up to 5 s, then returns None (so we can loop cleanly)
            item = r.blpop(settings.REDIS_QUEUE_KEY, timeout=5)
            if item is None:
                continue  # timeout → loop back

            _, raw_id_str = item
            logger.info("[Worker] Picked up article id: %s", raw_id_str)

            # ── Fetch raw article ────────────────────────────────────────────
            try:
                raw_article = raw_col.find_one({"_id": ObjectId(raw_id_str)})
            except Exception as exc:
                logger.error("[Worker] Bad ObjectId '%s': %s", raw_id_str, exc)
                continue

            if not raw_article:
                logger.warning("[Worker] Article %s not found in raw_articles", raw_id_str)
                continue

            # ── Skip if already processed (idempotent on restart) ────────────
            if proc_col.find_one({"raw_article_id": raw_id_str}):
                logger.info("[Worker] Already processed %s — skipping", raw_id_str)
                continue

            # ── Build text for BART ──────────────────────────────────────────
            title = raw_article.get("title") or ""
            snippet = raw_article.get("snippet") or ""
            full_text = f"{title}. {snippet}".strip(". ")

            if len(full_text) < 20:
                logger.warning("[Worker] Too little text for %s — skipping", raw_id_str)
                continue

            # ── Call HuggingFace BART ────────────────────────────────────────
            try:
                short_title = get_short_title(full_text)
                medium_summary = get_medium_summary(full_text)
            except Exception as exc:
                logger.error("[Worker] BART API error for %s: %s — re-queuing", raw_id_str, exc)
                time.sleep(3)
                r.rpush(settings.REDIS_QUEUE_KEY, raw_id_str)  # retry later
                continue

            # ── Write processed document ────────────────────────────────────
            processed_doc = {
                # Link back to raw_articles so callers can always fetch the original
                "raw_article_id": raw_id_str,
                # Convenience copies to avoid a second DB round-trip on reads
                "source_name": raw_article.get("source_name"),
                "source_type": raw_article.get("source_type"),
                "original_url": raw_article.get("url"),
                "original_title": title,
                "published_at": raw_article.get("published_at"),
                # The summarised output
                "short_title": short_title,
                "medium_summary": medium_summary,
                "processed_at": datetime.now(timezone.utc).isoformat(),
            }

            try:
                proc_col.insert_one(processed_doc)
                # Mark the raw article as done
                raw_col.update_one(
                    {"_id": ObjectId(raw_id_str)},
                    {
                        "$set": {
                            "summarized": True,
                            "summarized_at": datetime.now(timezone.utc).isoformat(),
                        }
                    },
                )
                logger.info('[Worker] ✓ Done: "%s"', short_title)
            except DuplicateKeyError:
                logger.info("[Worker] Race condition — %s already saved, skipping", raw_id_str)
            except Exception as exc:
                logger.error("[Worker] DB write failed for %s: %s", raw_id_str, exc)

        except KeyboardInterrupt:
            logger.info("[Worker] Received interrupt — shutting down cleanly.")
            break
        except Exception as exc:
            logger.error("[Worker] Unexpected error: %s", exc)
            time.sleep(1)


if __name__ == "__main__":
    run_worker()
