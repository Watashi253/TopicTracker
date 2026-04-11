import httpx
from fastapi           import APIRouter, Depends, HTTPException, Query
from sqlalchemy        import text
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic          import BaseModel
from typing            import Optional

from app.db.database   import get_db
from app.config        import INGESTION_BASE_URL, DEFAULT_SIMILARITY_THRESHOLD

router = APIRouter()


# ── Request / Response schemas ────────────────────────────────────────────────
class QueryRequest(BaseModel):
    topic:  str
    limit:  Optional[int]   = 10
    user_id: Optional[str]  = None    # if provided, personalised threshold is applied


class ArticleResult(BaseModel):
    id:               str
    title:            str
    url:              str
    source:           str
    summary:          Optional[str]
    credibility_score: Optional[float]
    published_at:     Optional[str]
    relevance_score:  Optional[float]  # cosine similarity to the query


# ── POST /api/query ───────────────────────────────────────────────────────────
# What it does:
#   1. Calls Person 1's /fetch/all to pull fresh articles for the topic.
#      These are raw articles — no BERT vectors yet.
#   2. Also searches our own DB (articles table) for already-processed
#      articles whose vectors are close to this query.
#   3. Returns a ranked merged list — DB results first (they have summaries
#      + credibility), then raw ingestion results as supplementary.
#
# Why two sources?
#   The ingestion layer gives freshness. The DB gives quality (BERT + BART).
#   Together they cover both recency and relevance.
@router.post(
    "/query",
    response_model = list[ArticleResult],
    summary        = "Search articles for a topic",
    tags           = ["Query"]
)
async def query_topic(
    body: QueryRequest,
    db:   AsyncSession = Depends(get_db)
):
    # ── Step 1: Pull fresh articles from ingestion service ───────────────────
    ingestion_results = []
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.get(
                f"{INGESTION_BASE_URL}/fetch/all",
                params={"query": body.topic, "limit": body.limit}
            )
            if response.status_code == 200:
                ingestion_results = response.json()
    except Exception:
        # Ingestion service being down should not kill the query —
        # we still return DB results below.
        pass

    # ── Step 2: Search DB for processed articles via keyword match ───────────
    # Full vector search (pgvector cosine) is Person 3's job.
    # We do a lightweight full-text search for now so the endpoint works
    # independently before Person 3's BERT pipeline is ready.
    db_results = []
    try:
        rows = await db.execute(
            text("""
                SELECT id, title, url, source, summary, credibility_score,
                       published_at
                FROM   articles
                WHERE  to_tsvector('english', title || ' ' || COALESCE(full_text, ''))
                       @@ plainto_tsquery('english', :topic)
                ORDER  BY credibility_score DESC NULLS LAST,
                          published_at      DESC NULLS LAST
                LIMIT  :limit
            """),
            {"topic": body.topic, "limit": body.limit}
        )
        for row in rows.mappings():
            db_results.append(ArticleResult(
                id                = str(row["id"]),
                title             = row["title"],
                url               = row["url"],
                source            = row["source"],
                summary           = row["summary"],
                credibility_score = row["credibility_score"],
                published_at      = str(row["published_at"]) if row["published_at"] else None,
                relevance_score   = None    # vector score comes from Person 3
            ))
    except Exception as e:
        # DB not yet set up or table missing — return ingestion results only
        pass

    # ── Step 3: Convert raw ingestion articles to ArticleResult ─────────────
    ingestion_articles = []
    for raw in ingestion_results:
        ingestion_articles.append(ArticleResult(
            id                = raw.get("url", ""),   # no DB id yet
            title             = raw.get("title", ""),
            url               = raw.get("url", ""),
            source            = raw.get("source_name", ""),
            summary           = raw.get("snippet", ""),
            credibility_score = None,
            published_at      = raw.get("published_at"),
            relevance_score   = None
        ))

    # ── Step 4: Merge — DB articles first (higher quality), then fresh ones ──
    seen_urls = {a.url for a in db_results}
    merged    = db_results[:]
    for article in ingestion_articles:
        if article.url not in seen_urls:
            merged.append(article)
            seen_urls.add(article.url)

    return merged[: body.limit]