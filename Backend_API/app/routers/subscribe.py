from fastapi                import APIRouter, Depends, HTTPException
from sqlalchemy             import text, select
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic               import BaseModel
from typing                 import Optional
import uuid

from app.db.database  import get_db
from app.models.models import Subscription, Cluster
from app.config       import DEFAULT_SIMILARITY_THRESHOLD

router = APIRouter()


# ── Request / Response schemas ────────────────────────────────────────────────
class SubscribeRequest(BaseModel):
    user_id:   str
    topic:     str
    threshold: Optional[float]  = DEFAULT_SIMILARITY_THRESHOLD
    channel:   Optional[str]    = "websocket"   # websocket | email | webhook


class SubscribeResponse(BaseModel):
    subscription_id: str
    user_id:         str
    topic:           str
    threshold:       float
    channel:         str
    cluster_id:      Optional[str]
    message:         str


# ── POST /api/subscribe ───────────────────────────────────────────────────────
# What it does:
#   1. Checks if this user already has an active subscription for this topic
#      (no duplicates).
#   2. Looks for an existing cluster whose centroid is close enough to this
#      topic (similarity > 0.80). If found, joins that cluster — so the user
#      shares BERT checks with others tracking the same topic.
#   3. If no cluster matches, creates a new one.
#   4. Writes the subscription row to DB.

@router.post(
    "/subscribe",
    response_model = SubscribeResponse,
    summary        = "Register a topic subscription for a user",
    tags           = ["Subscribe"]
)
async def subscribe(
    body: SubscribeRequest,
    db:   AsyncSession = Depends(get_db)
):
    # ── Step 1: Prevent duplicate subscriptions ──────────────────────────────
    existing = await db.execute(
        text("""
            SELECT id FROM subscriptions
            WHERE  user_id = :user_id
            AND    LOWER(topic) = LOWER(:topic)
            LIMIT  1
        """),
        {"user_id": body.user_id, "topic": body.topic}
    )
    if existing.fetchone():
        raise HTTPException(
            status_code = 409,
            detail      = f"User '{body.user_id}' is already subscribed to '{body.topic}'"
        )

    # ── Step 2: Find or create a cluster ────────────────────────────────────
    # For now we do simple text-based cluster matching.
    # Once Person 3 wires up BERT vectors, this becomes a cosine similarity
    # check against cluster centroids stored in the clusters table.
    cluster_id = await _find_or_create_cluster(db, body.topic)

    # ── Step 3: Write subscription to DB ────────────────────────────────────
    subscription = Subscription(
        user_id    = body.user_id,
        topic      = body.topic,
        vector     = None,           # Person 3 will backfill BERT vector
        cluster_id = cluster_id,
        threshold  = body.threshold,
        channel    = body.channel,
    )
    db.add(subscription)
    await db.commit()
    await db.refresh(subscription)

    return SubscribeResponse(
        subscription_id = str(subscription.id),
        user_id         = subscription.user_id,
        topic           = subscription.topic,
        threshold       = subscription.threshold,
        channel         = subscription.channel,
        cluster_id      = str(cluster_id) if cluster_id else None,
        message         = f"Subscribed to '{body.topic}'. Alerts will arrive via {body.channel}."
    )


# ── DELETE /api/subscribe ─────────────────────────────────────────────────────
# Lets a user cancel a subscription.
@router.delete(
    "/subscribe/{subscription_id}",
    summary = "Cancel a subscription",
    tags    = ["Subscribe"]
)
async def unsubscribe(
    subscription_id: str,
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        text("DELETE FROM subscriptions WHERE id = :id RETURNING id"),
        {"id": subscription_id}
    )
    deleted = result.fetchone()
    if not deleted:
        raise HTTPException(status_code=404, detail="Subscription not found")

    await db.commit()
    return {"message": "Subscription cancelled", "subscription_id": subscription_id}


# ── GET /api/subscribe/{user_id} ──────────────────────────────────────────────
# Returns all active subscriptions for a user (for the UI management panel).
@router.get(
    "/subscribe/{user_id}",
    summary = "List all subscriptions for a user",
    tags    = ["Subscribe"]
)
async def list_subscriptions(
    user_id: str,
    db:      AsyncSession = Depends(get_db)
):
    rows = await db.execute(
        text("""
            SELECT id, topic, threshold, channel, cluster_id, created_at
            FROM   subscriptions
            WHERE  user_id = :user_id
            ORDER  BY created_at DESC
        """),
        {"user_id": user_id}
    )
    subs = []
    for row in rows.mappings():
        subs.append({
            "subscription_id": str(row["id"]),
            "topic":           row["topic"],
            "threshold":       row["threshold"],
            "channel":         row["channel"],
            "cluster_id":      str(row["cluster_id"]) if row["cluster_id"] else None,
            "created_at":      str(row["created_at"]),
        })
    return subs


# ── Helper: find or create a cluster for this topic ──────────────────────────
async def _find_or_create_cluster(
    db:    AsyncSession,
    topic: str
) -> uuid.UUID:
    # Naive text match for now — Person 3 replaces this with vector centroid check.
    # We look for a cluster that already has a member with the same topic keyword.
    rows = await db.execute(
        text("""
            SELECT c.id
            FROM   clusters     c
            JOIN   subscriptions s ON s.cluster_id = c.id
            WHERE  LOWER(s.topic) LIKE LOWER(:keyword)
            LIMIT  1
        """),
        {"keyword": f"%{topic.split()[0]}%"}   # match on first keyword
    )
    row = rows.fetchone()
    if row:
        # Add this user to the cluster's member list
        await db.execute(
            text("""
                UPDATE clusters
                SET    member_user_ids = array_append(member_user_ids, :topic)
                WHERE  id = :cluster_id
            """),
            {"topic": topic, "cluster_id": str(row[0])}
        )
        await db.commit()
        return row[0]

    # No matching cluster — create a new one
    new_cluster = Cluster(
        centroid        = None,          # Person 3 fills this in
        member_user_ids = [topic],
    )
    db.add(new_cluster)
    await db.commit()
    await db.refresh(new_cluster)
    return new_cluster.id