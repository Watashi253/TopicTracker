import numpy as np
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from datetime import datetime, timedelta

from src.database import SessionLocal
from src.models import Article, TopicTimeline, Cluster, Subscription
from src.extractor import extract_article_data
from src.embeddings import get_text_embedding

# --- 1. Deduplication (Hard Gate) ---
def is_semantic_duplicate(db: Session, new_vector, threshold=0.95):
    """
    Checks the Article table for existing exact matches.
    HNSW-accelerated via pgvector.
    """
    duplicate = db.query(Article).filter(
        Article.vector.cosine_distance(new_vector) < (1 - threshold)
    ).first()
    return duplicate is not None

# --- 2. O(log n) Clustering (Soft Gate) ---
def find_best_cluster(db: Session, new_vector, threshold=0.70):
    """
    HNSW search against the 'Centroids' in the Cluster table.
    This is much faster than checking every article.
    """
    match = db.query(Cluster).filter(
        Cluster.centroid_vector.cosine_distance(new_vector) < (1 - threshold)
    ).order_by(Cluster.centroid_vector.cosine_distance(new_vector)).first()

    if match:
        return match.id
    return None

# --- 3. Phase 2: Notification Dispatcher ---
def notify_subscribers(db: Session, cluster_id: int, article_title: str):
    
    from src.worker import send_nudge
    """
    Identifies users who subscribed to this topic during a search.
    Implements a 4-hour cooldown to prevent spam.
    """
    cooldown_limit = datetime.now() - timedelta(hours=4)
    
    subs = db.query(Subscription).filter(
        Subscription.cluster_id == cluster_id,
        Subscription.last_notified_at < cooldown_limit
    ).all()

    for sub in subs:
        # Fire and forget SMTP nudge via Celery maintenance queue
        send_nudge.delay(
            sub.user_email, 
            "Clusters updated. Visit the application now."
        )
        sub.last_notified_at = datetime.now()
    
    db.commit()

# --- THE MAIN PIPELINE ---
def process_new_url(url: str, source_name: str):
    """
    Full extraction pipeline: download → BERT embed → dedup → cluster → save → summarizer.
    Returns a dict with: status ('success'|'skipped'|'error'), message, and cluster_id.
    """
    from src.worker import hand_to_summarizzer
    db = SessionLocal()
    try:
        # Fast URL-based dedup: if this URL is already in our DB, skip extraction entirely
        existing_article = db.query(Article).filter(Article.url == url).first()
        if existing_article:
            return {
                "status": "skipped", 
                "message": f"URL already in DB: '{existing_article.title}'", 
                "cluster_id": existing_article.cluster_id
            }

        data = extract_article_data(url, source_name)
        if not data:
            return {"status": "error", "message": "Extraction failed.", "cluster_id": None}
        content_to_vectorize = f"{data['title']} {data['full_text'][:500]}"
        vector = get_text_embedding(content_to_vectorize)

        # Deduplicate (Hard Gate)
        if is_semantic_duplicate(db, vector, threshold=0.95):
            # Even though it's a duplicate, find which cluster it belongs to
            existing = db.query(Article).filter(
                Article.vector.cosine_distance(vector) < (1 - 0.95)
            ).first()
            dup_cluster_id = existing.cluster_id if existing else None
            return {"status": "skipped", "message": f"Skipped: '{data['title']}' is a duplicate.", "cluster_id": dup_cluster_id}

        # Clustering (Soft Gate) via Centroids
        cluster_id = find_best_cluster(db, vector, threshold=0.70)
        
        if cluster_id:
            status = f"Joined existing cluster {cluster_id}"
        else:
            new_cluster = Cluster(centroid_vector=vector)
            db.add(new_cluster)
            db.flush()
            cluster_id = new_cluster.id
            status = f"Created new cluster {cluster_id}"

        #  Save Article
        new_article = Article(
            title=data['title'],
            url=data['url'],
            full_text=data['full_text'],
            source=data['source'],
            published=data['published'],
            vector=vector,
            summary="Summary pending.",
            credibility_score=data['credibility_score'],
            cluster_id=cluster_id
        )
        db.add(new_article)
        db.flush() 

        # Timeline Record
        timeline_entry = TopicTimeline(
            article_id=new_article.id, 
            cluster_id=cluster_id
        )
        db.add(timeline_entry)
        # Finalize
        db.commit()
        # Phase 2: Alert interested users
        notify_subscribers(db, cluster_id, data['title'])
        # Pass to summarizer worker
        hand_to_summarizzer(new_article.id)
        
        return {"status": "success", "message": f"Success: {status} - '{data['title']}'", "cluster_id": cluster_id}

    except Exception as e:
        db.rollback()
        return {"status": "error", "message": f"Error processing {url}: {e}", "cluster_id": None}
    finally:
        db.close()