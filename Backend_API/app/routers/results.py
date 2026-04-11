from fastapi                import APIRouter, Depends, Query
from sqlalchemy             import text
from sqlalchemy.ext.asyncio import AsyncSession
from typing                 import Optional

from app.db.database import get_db

router = APIRouter()


# ── GET /api/results/{user_id} ────────────────────────────────────────────────
# What it does:
#   Returns all articles for which this user has already received an alert.
#   This powers the "your feed" panel in the frontend.
#
#   The articles are sorted by:
#     1. sent_at DESC  — most recent alert first
#     2. credibility   — within same time window, higher credibility first
#
# Why not re-query articles directly?
#   Because alerts_sent is our audit log — it's the source of truth for
#   what *this user* has seen. Querying articles directly would show
#   everything in the DB, not just what matched their subscription.
@router.get(
    "/results/{user_id}",
    summary = "Get alert feed for a user",
    tags    = ["Results"]
)
async def get_results(
    user_id: str,
    limit:   int           = Query(default=20, le=100),
    offset:  int           = Query(default=0),
    channel: Optional[str] = Query(default=None, description="Filter by channel: websocket | email | webhook"),
    db:      AsyncSession  = Depends(get_db)
):
    # Build optional channel filter
    channel_filter = "AND al.channel = :channel" if channel else ""

    rows = await db.execute(
        text(f"""
            SELECT  a.id,
                    a.title,
                    a.url,
                    a.source,
                    a.summary,
                    a.credibility_score,
                    a.published_at,
                    al.channel,
                    al.sent_at
            FROM    alerts_sent  al
            JOIN    articles     a  ON a.id = al.article_id
            WHERE   al.user_id = :user_id
            {channel_filter}
            ORDER   BY al.sent_at DESC,
                       a.credibility_score DESC NULLS LAST
            LIMIT   :limit
            OFFSET  :offset
        """),
        {
            "user_id": user_id,
            "limit":   limit,
            "offset":  offset,
            **({"channel": channel} if channel else {})
        }
    )

    results = []
    for row in rows.mappings():
        results.append({
            "id":               str(row["id"]),
            "title":            row["title"],
            "url":              row["url"],
            "source":           row["source"],
            "summary":          row["summary"],
            "credibility_score": row["credibility_score"],
            "published_at":     str(row["published_at"]) if row["published_at"] else None,
            "alert_channel":    row["channel"],
            "alerted_at":       str(row["sent_at"]),
        })

    return {
        "user_id":  user_id,
        "count":    len(results),
        "offset":   offset,
        "articles": results,
    }


# ── GET /api/results/{user_id}/timeline ───────────────────────────────────────
# What it does:
#   Returns the topic evolution timeline for a user — how many articles
#   arrived per day for their subscribed clusters.
#   This directly feeds the frontend "timeline evolution view".
@router.get(
    "/results/{user_id}/timeline",
    summary = "Get topic evolution timeline for a user",
    tags    = ["Results"]
)
async def get_timeline(
    user_id: str,
    db:      AsyncSession = Depends(get_db)
):
    rows = await db.execute(
        text("""
            SELECT  DATE(tt.arrived_at)     AS day,
                    COUNT(tt.article_id)    AS article_count,
                    s.topic
            FROM    topic_timeline  tt
            JOIN    clusters        c   ON c.id  = tt.cluster_id
            JOIN    subscriptions   s   ON s.cluster_id = c.id
                                       AND s.user_id    = :user_id
            GROUP   BY day, s.topic
            ORDER   BY day ASC
        """),
        {"user_id": user_id}
    )

    timeline = []
    for row in rows.mappings():
        timeline.append({
            "day":           str(row["day"]),
            "article_count": row["article_count"],
            "topic":         row["topic"],
        })

    return {"user_id": user_id, "timeline": timeline}