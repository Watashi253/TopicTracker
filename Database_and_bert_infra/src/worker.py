import os
from celery import Celery
from dotenv import load_dotenv
from processor import process_new_url

load_dotenv()

REDIS_URL = os.getenv("REDIS_URL")  # reads directly from .env

celery_app = Celery("tasks", broker=REDIS_URL, backend=REDIS_URL)

# Required for Upstash TLS connection
celery_app.conf.update(
    broker_use_ssl={"ssl_cert_reqs": "required"},
    redis_backend_use_ssl={"ssl_cert_reqs": "required"},
)

@celery_app.task(name="tasks.perform_extraction", queue="extraction")
def extraction_task(url: str, source: str):
    return process_new_url(url, source)