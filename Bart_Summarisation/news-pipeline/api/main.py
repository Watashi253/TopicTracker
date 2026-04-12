"""
Read API
--------
FastAPI app that serves summarised news articles from MongoDB.

Endpoints (all under /articles):
  GET /articles               → paginated list (short_title + medium_summary)
  GET /articles/{id}          → single processed article
  GET /articles/{id}/raw      → original raw article (linked via raw_article_id)

Start with:
    make api
or:
    python -m uvicorn api.main:app --host 0.0.0.0 --port 8002 --reload
"""
import logging
from contextlib import asynccontextmanager

import uvicorn
from fastapi import FastAPI

from api.routes.articles import router as articles_router
from db.mongo import close_async, connect_async

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(message)s",
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect_async()
    yield
    await close_async()


app = FastAPI(
    title="News Summary API",
    version="1.0",
    description="Serves BART-summarised news articles stored in MongoDB.",
    lifespan=lifespan,
)

app.include_router(articles_router)


@app.get("/health", tags=["health"])
def health():
    return {"status": "ok", "service": "api"}


if __name__ == "__main__":
    uvicorn.run("api.main:app", host="0.0.0.0", port=8002, reload=True)
