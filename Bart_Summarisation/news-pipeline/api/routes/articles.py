"""
Article endpoints
-----------------
GET /articles               → paginated list of processed articles
GET /articles/{id}          → single processed article (short_title + medium_summary)
GET /articles/{id}/raw      → the original raw article linked to a processed one
"""
from typing import Optional

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query
from motor.motor_asyncio import AsyncIOMotorDatabase

from api.deps import get_db
from config.settings import settings

router = APIRouter(prefix="/articles", tags=["articles"])


def _serialize(doc: dict) -> dict:
    """Convert ObjectId fields to plain strings for JSON serialisation."""
    doc["_id"] = str(doc["_id"])
    return doc


@router.get("/", summary="List processed articles")
async def list_articles(
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=100, description="Max records to return"),
    source: Optional[str] = Query(None, description="Filter by source_name (e.g. 'bbc')"),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """
    Returns processed articles newest-first.
    Each document includes:  short_title, medium_summary, original_title,
                             original_url, source_name, published_at, processed_at
    To read the full original article use GET /articles/{id}/raw
    """
    query: dict = {}
    if source:
        query["source_name"] = source

    cursor = (
        db[settings.PROCESSED_COLLECTION]
        .find(query, {"_id": 1, "short_title": 1, "medium_summary": 1,
                      "original_title": 1, "original_url": 1,
                      "source_name": 1, "published_at": 1, "processed_at": 1})
        .sort("processed_at", -1)
        .skip(skip)
        .limit(limit)
    )
    docs = await cursor.to_list(length=limit)
    return [_serialize(d) for d in docs]


@router.get("/{article_id}", summary="Get a single processed article")
async def get_article(
    article_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Full processed document including short_title and medium_summary."""
    try:
        oid = ObjectId(article_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid article ID format")

    doc = await db[settings.PROCESSED_COLLECTION].find_one({"_id": oid})
    if not doc:
        raise HTTPException(status_code=404, detail="Processed article not found")

    return _serialize(doc)


@router.get("/{article_id}/raw", summary="Get the original raw article")
async def get_raw_article(
    article_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """
    Fetches the original unmodified article from raw_articles.
    Use this when the reader wants to see the full source content.
    Linked via processed_articles.raw_article_id → raw_articles._id
    """
    try:
        oid = ObjectId(article_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid article ID format")

    processed = await db[settings.PROCESSED_COLLECTION].find_one(
        {"_id": oid}, {"raw_article_id": 1}
    )
    if not processed:
        raise HTTPException(status_code=404, detail="Processed article not found")

    raw_oid = ObjectId(processed["raw_article_id"])
    raw_doc = await db[settings.RAW_COLLECTION].find_one({"_id": raw_oid})
    if not raw_doc:
        raise HTTPException(status_code=404, detail="Original raw article not found")

    return _serialize(raw_doc)
