import os
from celery import Celery
from dotenv import load_dotenv
from src.processor import process_new_url

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