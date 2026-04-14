from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc
from src.database import get_db, Base, engine
from src.models import Article, TopicTimeline
from typing import List

app = FastAPI(
    title="News Article Processing API",
    description="API for processing news articles, including extraction, deduplication, and timeline management.",
)


@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine)

@app.get("/health")
def health_check():
    return {"status": "online", "engine": "BERT-L6", "db": "pgvector-HNSW"}

@app.get("/articles/latest")
def get_latest_news(limit: int = 20, db: Session = Depends(get_db)):
    """
    Returns the latest news articles. We manually map to a dict 
    to avoid JSON serialization errors with the 'vector' field.
    """
    articles = db.query(Article)\
        .order_by(desc(Article.credibility_score), desc(Article.created_at))\
        .limit(limit)\
        .all()
    
    output = []
    for a in articles:
        # We use float() to ensure it's serializable, 
        # and # type: ignore to tell Pylance we know what we're doing.
        score = float(a.credibility_score) if a.credibility_score is not None else 0.0 # type: ignore
        
        output.append({
            "id": a.id,
            "title": a.title,
            "url": a.url,
            "source": a.source,
            "credibility_score": score,
            "cluster_id": a.cluster_id,
            "created_at": a.created_at.isoformat() if a.created_at is not None else None
        })
        
    return output

@app.get("/evolution/{cluster_id}")
def get_topic_evolution(cluster_id: int, db: Session=Depends(get_db)):
    """
    Powers the evolution graph. Returns titles and arrival times 
    for all articles in a specific cluster.
    """
    results = db.query(
        Article.title, 
        Article.source, 
        Article.url,
        TopicTimeline.arrived_at
    ).join(TopicTimeline, Article.id == TopicTimeline.article_id)\
     .filter(TopicTimeline.cluster_id == cluster_id)\
     .order_by(TopicTimeline.arrived_at.asc())\
     .all()
    
    if not results:
        raise HTTPException(status_code=404, detail="Cluster not found")
    
    return results