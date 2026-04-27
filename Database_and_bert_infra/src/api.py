from fastapi import FastAPI, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc, update
from src.database import get_db, Base, engine
from src.models import Article, TopicTimeline, Cluster, Subscription
from src.processor import process_new_url
from typing import List, Optional
from datetime import datetime
import requests
import os
import logging

# Assume your BERT model is initialized in processor.py
from src.embeddings import model 

logger = logging.getLogger(__name__)

# Data Ingestion service URL
# Default: localhost:8002 for local dev. Docker overrides via env var in docker-compose.yml
INGESTION_BASE_URL = os.getenv("INGESTION_BASE_URL", "http://localhost:8002")

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
    Full search pipeline:
      1. Search existing clusters via BERT cosine similarity
      2. Fetch fresh articles from Data Ingestion service (:8002)
      3. Process each fresh article through BERT pipeline (embed, dedup, cluster, save)
      4. Merge all cluster IDs (existing + newly created)
      5. Return all articles from the merged clusters
    """
    print(f"\n{'='*60}")
    print(f"[Search] New search request: query='{query}', email='{email}'")
    print(f"[Search] Ingestion URL: {INGESTION_BASE_URL}")
    print(f"{'='*60}")

    query_vector = model.encode(query).tolist()

    # ── Step 1: Search existing clusters ─────────────────────────────────────
    # Threshold 0.50 = similarity > 0.50. Relaxed because query vectors (short text)
    # and cluster centroids (article vectors from full text) can differ significantly.
    matching_clusters = db.query(Cluster).filter(
        Cluster.centroid_vector.cosine_distance(query_vector) < 0.50
    ).all()

    cluster_ids = set(c.id for c in matching_clusters)
    print(f"[Search] Step 1 — Found {len(cluster_ids)} existing clusters for query: '{query}'")

    # ── Step 2: Fetch fresh articles from Data Ingestion ─────────────────────
    raw_articles = []
    ingestion_url = f"{INGESTION_BASE_URL}/fetch/all"
    print(f"[Search] Step 2 — Calling ingestion: {ingestion_url}?query={query}&limit=25")
    try:
        resp = requests.get(
            ingestion_url,
            params={"query": query, "limit": 25},
            timeout=60
        )
        print(f"[Search] Step 2 — Ingestion responded with status {resp.status_code}")
        if resp.status_code == 200:
            raw_articles = resp.json()
            print(f"[Search] Step 2 — Got {len(raw_articles)} raw articles from ingestion")
        else:
            print(f"[Search] Step 2 — Ingestion error response: {resp.text[:200]}")
    except Exception as e:
        print(f"[Search] Step 2 — ❌ Ingestion service FAILED: {type(e).__name__}: {e}")

    # ── Step 3: Process each article through BERT pipeline ───────────────────
    new_cluster_ids = set()
    processed_count = 0
    total_raw = len(raw_articles)
    print(f"[Search] Step 3 — Processing {total_raw} articles through BERT pipeline...")
    
    for i, raw in enumerate(raw_articles):
        url = raw.get("url", "")
        source = raw.get("source_name", "unknown")
        if not url:
            continue
        
        try:
            print(f"[Search] Step 3 — [{i+1}/{total_raw}] Processing: {url[:80]}...")
            result = process_new_url(url, source)
            cid = result.get("cluster_id")
            status = result.get("status", "unknown")
            if cid is not None:
                new_cluster_ids.add(cid)
                processed_count += 1
            print(f"[Search] Step 3 — [{i+1}/{total_raw}] {status}: cluster_id={cid}")
        except Exception as e:
            print(f"[Search] Step 3 — [{i+1}/{total_raw}] ❌ Failed: {e}")

    print(f"[Search] Step 3 — Done. Processed {processed_count} articles, got {len(new_cluster_ids)} cluster IDs")

    # ── Step 4: Merge all cluster IDs ────────────────────────────────────────
    all_cluster_ids = list(cluster_ids | new_cluster_ids)
    print(f"[Search] Step 4 — Merged cluster IDs: {all_cluster_ids}")

    if not all_cluster_ids:
        print(f"[Search] ⚠️  No clusters found at all. Returning empty.")
        return {
            "query": query,
            "clusters_matched": 0,
            "cluster_ids": [],
            "subscribed": False,
            "results": [],
            "message": "No matching topics found from DB or ingestion."
        }

    # ── Refresh 'last_seen_at' (The Janitor Nudge) ───────────────────────────
    db.execute(
        update(Article)
        .where(Article.cluster_id.in_(all_cluster_ids))
        .values(last_seen_at=datetime.now())
    )
    db.commit()

    # ── Step 5: Retrieve ALL articles from merged clusters ───────────────────
    articles = db.query(Article).filter(
        Article.cluster_id.in_(all_cluster_ids)
    ).order_by(
        desc(Article.credibility_score), 
        desc(Article.created_at)
    ).all()
    
    print(f"[Search] Step 5 — Returning {len(articles)} articles from {len(all_cluster_ids)} clusters")
    print(f"{'='*60}\n")

    return {
        "query": query,
        "clusters_matched": len(all_cluster_ids),
        "cluster_ids": all_cluster_ids,
        "subscribed": False,
        "results": [
            {
                "id": a.id, 
                "title": a.title, 
                "url": a.url, 
                "source": a.source,
                "summary": a.summary,
                "credibility_score": float(a.credibility_score) if a.credibility_score is not None else 0.0,
                "cluster_id": a.cluster_id,
                "created_at": a.created_at.isoformat() if a.created_at is not None else None
            } 
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

@app.get("/subscriptions/{email}")
def get_subscriptions(email: str, db: Session = Depends(get_db)):
    subs = db.query(Subscription).filter(Subscription.user_email == email).all()
    
    formatted_subs = []
    for sub in subs:
        articles = db.query(Article)\
            .filter(Article.cluster_id == sub.cluster_id)\
            .order_by(desc(Article.created_at))\
            .limit(10)\
            .all()
            
        topic_name = articles[0].title if articles else f"Topic {sub.cluster_id}"
        sources = list(set([a.source for a in articles if a.source]))
        
        valid_scores = [float(a.credibility_score) for a in articles if a.credibility_score is not None]
        avg_credibility = sum(valid_scores) / len(valid_scores) if valid_scores else 0.0
        
        formatted_articles = [
            {
                "id": a.id,
                "title": a.title,
                "summary": a.summary,
                "source": a.source,
                "url": a.url,
                "created_at": a.created_at.isoformat() if a.created_at else None,
                "credibility_score": float(a.credibility_score) if a.credibility_score is not None else 0.0
            }
            for a in articles
        ]
        
        formatted_subs.append({
            "cluster_id": sub.cluster_id,
            "topic_name": topic_name,
            "sources": sources,
            "articles": formatted_articles,
            "avg_credibility": avg_credibility
        })
        
    return formatted_subs


# ── Subscribe / Unsubscribe endpoints ────────────────────────────────────────

@app.post("/subscribe/{email}/{cluster_id}")
def subscribe_to_cluster(email: str, cluster_id: int, db: Session = Depends(get_db)):
    """Subscribe a user to a cluster."""
    existing = db.query(Subscription).filter_by(user_email=email, cluster_id=cluster_id).first()
    if existing:
        return {"status": "already_subscribed", "message": f"Already subscribed to cluster {cluster_id}"}
    
    db.add(Subscription(user_email=email, cluster_id=cluster_id))
    db.commit()
    print(f"[Subscribe] {email} subscribed to cluster {cluster_id}")
    return {"status": "subscribed", "message": f"Subscribed to cluster {cluster_id}"}


@app.delete("/unsubscribe/{email}/{cluster_id}")
def unsubscribe_from_cluster(email: str, cluster_id: int, db: Session = Depends(get_db)):
    """Unsubscribe a user from a cluster."""
    sub = db.query(Subscription).filter_by(user_email=email, cluster_id=cluster_id).first()
    if not sub:
        return {"status": "not_found", "message": f"No subscription found for cluster {cluster_id}"}
    
    db.delete(sub)
    db.commit()
    print(f"[Unsubscribe] {email} unsubscribed from cluster {cluster_id}")
    return {"status": "unsubscribed", "message": f"Unsubscribed from cluster {cluster_id}"}


@app.get("/subscribed-cluster-ids/{email}")
def get_subscribed_cluster_ids(email: str, db: Session = Depends(get_db)):
    """Return just the list of cluster IDs a user is subscribed to (for toggle state)."""
    subs = db.query(Subscription).filter(Subscription.user_email == email).all()
    return {"cluster_ids": [s.cluster_id for s in subs]}