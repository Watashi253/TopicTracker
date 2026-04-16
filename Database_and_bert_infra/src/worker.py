import os
from celery import Celery
from dotenv import load_dotenv
from src.processor import process_new_url
from datetime import datetime, timedelta
from src.database import SessionLocal
from src.models import Article
from celery.schedules import crontab
load_dotenv()
REDIS_URL = f"redis://{os.getenv('REDIS_HOST')}:{os.getenv('REDIS_PORT')}/0"
celery_app = Celery("tasks", broker=REDIS_URL, backend=REDIS_URL)
celery_app.conf.update(
    task_default_queue="extraction",
    worker_prefetch_multiplier=int(os.getenv("CELERY_PREFETCH_MULTIPLIER", "8")),
    broker_pool_limit=int(os.getenv("CELERY_BROKER_POOL_LIMIT", "20")),
    task_acks_late=True,
    task_reject_on_worker_lost=True,
    worker_max_tasks_per_child=int(os.getenv("CELERY_MAX_TASKS_PER_CHILD", "200")),
    timezone="UTC",
    enable_utc=True,
    task_annotations={
        "tasks.perform_extraction": {
            "rate_limit": os.getenv("EXTRACTION_RATE_LIMIT", "240/m")
        }
    },
)


@celery_app.task(name="tasks.perform_extraction", queue="extraction")
def extraction_task(url: str, source: str):
    return process_new_url(url, source)


@celery_app.task(name="tasks.cleanup_old_articles", queue="maintenance")
def purge_stale_content():
    db = SessionLocal()
    try:
        limit = datetime.now() - timedelta(hours = 40)
        deleted = db.query(Article).filter(Article.last_seen_at < limit).delete()

        db.commit()
        print(f"🧹 Purged {deleted} stale articles not seen since {limit.isoformat()}")

    finally: 
        db.close()
def hand_to_summarizzer(article_id: int):
    try:
        celery_app.send_task("app.tasks.send_summarizer", args=[{"article_id": article_id}])
        print(f"[Worker] Handed article {article_id} to summarizer.")
    except Exception as e:
        print(f"[Worker] Failed to send article {article_id} to summarizer: {e}")   

celery_app.conf.beat_schedule = {
    "purge-stale-articles-daily": {
        "task": "tasks.cleanup_old_articles",
        "schedule": crontab(hour=0, minute=0),  
        "options": {"queue": "maintenance"}     
    },
}