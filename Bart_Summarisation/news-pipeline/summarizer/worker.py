import os
from celery import Celery
from dotenv import load_dotenv
import logging
from db.postgres import SessionLocal
from summarizer.hf_client import get_medium_summary, get_short_title
from sqlalchemy import Column, Integer, Text, TIMESTAMP, Float, ForeignKey, Index
from pgvector.sqlalchemy import Vector
from sqlalchemy.ext.declarative import declarative_base
import datetime
logger = logging.getLogger(__name__)
Base = declarative_base()
class Article(Base):
    __tablename__ = 'articles'
    id = Column(Integer, primary_key=True, index=True)
    title = Column(Text)
    url = Column(Text, unique=True, index=True)
    full_text = Column(Text)
    source = Column(Text)
    published = Column(TIMESTAMP)
    vector = Column(Vector(384))
    summary = Column(Text)
    credibility_score = Column(Float)
    cluster_id = Column(Integer, nullable=True)
    created_at = Column(TIMESTAMP, default=datetime.datetime.utcnow)

    __table_args__ = (
        Index('articles_vector_idx', 'vector', postgresql_using='hnsw', 
              postgresql_with={'m': 16, 'ef_construction': 64},
              postgresql_ops={'vector': 'vector_cosine_ops'}),
    )
load_dotenv()
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

celery_app = Celery(
    "news_pipeline",
    broker=REDIS_URL,
    backend=REDIS_URL, 
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_routes={
        "app.tasks.send_summarizer": {"queue": "summarizer"},
        "tasks.perform_extraction": {"queue": "extraction"},
    }
)

@celery_app.task(name="app.tasks.send_summarizer", queue="summarizer")
def summarizer_task(payload: dict):
   
    article_id = payload.get("article_id")
    if not article_id:
        logger.error("[Summarizer] No article_id provided in payload.")
        return

    db = SessionLocal()
    try:
        article = db.query(Article).filter(Article.id == article_id).first()
        
        if not article:
            logger.warning(f"[Summarizer] Article {article_id} not found in database.")
            return

        logger.info(f"[Summarizer] Processing Article {article_id}: {article.title[:50]}...")

        text_to_process = f"{article.title}. {article.full_text}".strip()

        if len(text_to_process) < 50:
            logger.warning(f"[Summarizer] Article {article_id} text too short. Skipping.")
            return
        if article.summary:
            logger.info(f"[Summarizer] Article {article_id} already has a summary. Skipping.")
            return
        try:
            
            medium_summary = get_medium_summary(text_to_process)
        except Exception as ai_exc:
            logger.error(f"[Summarizer] AI Model error for {article_id}: {ai_exc}")
            raise ai_exc

        article.summary = medium_summary
        
        db.commit()
        logger.info(f"[Summarizer] Done: '{short_title}'")

    except Exception as e:
        db.rollback()
        logger.error(f"[Summarizer] Fatal error on article {article_id}: {e}")
    finally:
        db.close()