from fastapi import FastAPI, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc, update
from src.database import get_db, Base, engine
from src.models import Article, TopicTimeline, Cluster, Subscription
from typing import List, Optional
from datetime import datetime

# Assume your BERT model is initialized in processor.py
from src.embeddings import model 

app = FastAPI(
    title="News Article Processing API",
    description="API for processing news articles with HNSW-accelerated search and auto-subscriptions.",
)

@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine)

@app.get("/health")
def health_check():
    return {"status": "online", "engine": "BERT-L6", "db": "pgvector-HNSW"}

@app.get("/articles/latest")
def get_latest_news(limit: int = 20, db: Session = Depends(get_db)):
    articles = db.query(Article)\
        .order_by(desc(Article.credibility_score), desc(Article.created_at))\
        .limit(limit)\
        .all()
    
    output = []
    for a in articles:
        score = float(a.credibility_score) if a.credibility_score is not None else 0.0 # type: ignore
        output.append({
            "id": a.id,
            "title": a.title,
            "url": a.url,
            "summary": a.summary,
            "source": a.source,
            "credibility_score": score,
            "cluster_id": a.cluster_id,
            "created_at": a.created_at.isoformat() if a.created_at is not None else None
        })
    return output

@app.get("/search")
def search(
    query: str, 
    email: Optional[str] = None, 
    db: Session = Depends(get_db)
):
    """
    Phase 1: Query Receiving
    - O(log n) search using HNSW on Cluster Centroids.
    - Auto-subscription if Similarity > 0.85 (Distance < 0.15).
    - Refreshes 'last_seen_at' for all articles in matched clusters.
    """
    query_vector = model.encode(query).tolist()

    matching_clusters = db.query(Cluster).filter(
        Cluster.centroid_vector.cosine_distance(query_vector) < 0.15
    ).all()

    cluster_ids = [c.id for c in matching_clusters]

    if not cluster_ids:
        return {"message": "No matching topics found.", "results": []}

    # 3. Phase 1: Subscription Logic
    if email:
        for c_id in cluster_ids:
            existing = db.query(Subscription).filter_by(user_email=email, cluster_id=c_id).first()
            if not existing:
                db.add(Subscription(user_email=email, cluster_id=c_id))
        db.commit()

    # 4. Refresh 'last_seen_at' (The Janitor Nudge)
    # Instead of a loop, we use a bulk update for speed
    db.execute(
        update(Article)
        .where(Article.cluster_id.in_(cluster_ids))
        .values(last_seen_at=datetime.now())
    )
    db.commit()

    # 5. Retrieve Articles from matched clusters
    articles = db.query(Article).filter(Article.cluster_id.in_(cluster_ids)).all()
    
    return {
        "query": query,
        "clusters_matched": len(cluster_ids),
        "subscribed": True if email else False,
        "results": [
            {"id": a.id, "title": a.title, "url": a.url, "source": a.source} 
            for a in articles
        ]
    }

@app.get("/evolution/{cluster_id}")
def get_topic_evolution(cluster_id: int, db: Session=Depends(get_db)):
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
    
    return [
        {"title": r[0], "source": r[1], "url": r[2], "arrived_at": r[3].isoformat()} 
        for r in results
    ]