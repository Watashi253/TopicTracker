import os
from celery import Celery
from dotenv import load_dotenv
from src.processor import process_new_url

load_dotenv()
REDIS_URL = f"redis://{os.getenv('REDIS_HOST')}:{os.getenv('REDIS_PORT')}/0"
celery_app = Celery("tasks", broker=REDIS_URL, backend=REDIS_URL)

@celery_app.task(name="tasks.perform_extraction", queue="extraction")
def extraction_task(url: str, source: str):
    return process_new_url(url, source)