from sqlalchemy              import Column, Integer, Text, TIMESTAMP, Float, ForeignKey, String, Index
from pgvector.sqlalchemy     import Vector
from sqlalchemy.dialects.postgresql import ARRAY
from app.db.database         import Base
import datetime


# ── Articles ──────────────────────────────────────────────────────────────────
# Written by Person 2 after extraction + BERT + BART.
# We only READ from this table — never write.
# Schema kept identical to Person 2's models.py to share the same DB table.
class Article(Base):
    __tablename__ = "articles"

    id                = Column(Integer, primary_key=True, index=True)
    title             = Column(Text)
    url               = Column(Text, unique=True, index=True)
    full_text         = Column(Text)
    source            = Column(Text)
    published         = Column(TIMESTAMP)                          
    vector            = Column(Vector(384))                       
    summary           = Column(Text)
    credibility_score = Column(Float)
    created_at        = Column(TIMESTAMP, default=datetime.datetime.utcnow)

    __table_args__ = (
        Index(
            "articles_vector_idx", "vector",
            postgresql_using = "hnsw",
            postgresql_with  = {"m": 16, "ef_construction": 64},
            postgresql_ops   = {"vector": "vector_cosine_ops"}
        ),
    )


# ── Topic Timeline ─────────────────────────────────────────────────────────────
# Also written by Person 2 / Person 3.
# We INSERT here after firing an alert — to record when this article
# arrived for this cluster (powers the frontend timeline view).
class TopicTimeline(Base):
    __tablename__ = "topic_timeline"

    id         = Column(Integer, primary_key=True, index=True)
    cluster_id = Column(Integer)
    article_id = Column(Integer, ForeignKey("articles.id"))
    arrived_at = Column(TIMESTAMP, default=datetime.datetime.utcnow)


# ── Subscriptions ─────────────────────────────────────────────────────────────
# Owned entirely by us. One row per user per topic.
# Person 3 will backfill the vector column once their BERT pipeline is ready.
class Subscription(Base):
    __tablename__ = "subscriptions"

    id         = Column(Integer, primary_key=True, index=True)
    user_id    = Column(Text,    nullable=False, index=True)
    topic      = Column(Text,    nullable=False)
    vector     = Column(Vector(384), nullable=True)               # filled by Person 3
    cluster_id = Column(Integer, nullable=True)
    threshold  = Column(Float,   nullable=False, default=0.75)
    channel    = Column(Text,    nullable=False, default="websocket")
    created_at = Column(TIMESTAMP, default=datetime.datetime.utcnow)


# ── Clusters ───────────────────────────────────────────────────────────────────
# Owned by Person 3, but we reference cluster_id in subscriptions.
# Defined here so SQLAlchemy knows the table exists when creating schema.
class Cluster(Base):
    __tablename__ = "clusters"

    id              = Column(Integer, primary_key=True, index=True)
    centroid        = Column(Vector(384), nullable=True)
    created_at      = Column(TIMESTAMP, default=datetime.datetime.utcnow)


# ── Alerts Sent ────────────────────────────────────────────────────────────────
# Audit log we own. Every alert we deliver goes here.
# Prevents duplicate alerts to the same user for the same article.
class AlertSent(Base):
    __tablename__ = "alerts_sent"

    id         = Column(Integer, primary_key=True, index=True)
    user_id    = Column(Text,    nullable=False, index=True)
    article_id = Column(Integer, ForeignKey("articles.id"), nullable=False)
    channel    = Column(Text,    nullable=False)
    sent_at    = Column(TIMESTAMP, default=datetime.datetime.utcnow)