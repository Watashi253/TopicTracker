"""
Ingester service
----------------
FastAPI app that wraps a background APScheduler cron job.

  - On startup  → runs one poll immediately, then schedules repeating polls
  - GET  /health           → liveness check
  - POST /poll/trigger     → manually fire a poll (useful during development)

Start with:
    make ingester
or:
    python -m uvicorn ingester.main:app --host 0.0.0.0 --port 8000 --reload
"""
import logging

import uvicorn
from apscheduler.schedulers.background import BackgroundScheduler
from fastapi import FastAPI

from config.settings import settings
from ingester.poller import poll_and_ingest

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(message)s",
)
logger = logging.getLogger(__name__)

app = FastAPI(title="News Ingester", version="1.0")
_scheduler = BackgroundScheduler()


@app.on_event("startup")
def _startup() -> None:
    # Fire once immediately so we don't wait for the first interval
    poll_and_ingest()

    _scheduler.add_job(
        poll_and_ingest,
        trigger="interval",
        seconds=settings.POLL_INTERVAL_SECONDS,
        id="poll_news",
        replace_existing=True,
    )
    _scheduler.start()
    logger.info(
        "[Ingester] Scheduler running — polling every %ds", settings.POLL_INTERVAL_SECONDS
    )


@app.on_event("shutdown")
def _shutdown() -> None:
    _scheduler.shutdown(wait=False)


@app.get("/health")
def health():
    return {"status": "ok", "service": "ingester"}


@app.post("/poll/trigger")
def manual_trigger():
    """Manually trigger a poll cycle without waiting for the next interval."""
    poll_and_ingest()
    return {"status": "triggered"}


if __name__ == "__main__":
    uvicorn.run("ingester.main:app", host="0.0.0.0", port=8000, reload=False)
