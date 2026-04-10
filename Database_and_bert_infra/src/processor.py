import numpy as np
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from src.database import SessionLocal
from src.models import Article, TopicTimeline
from src.extractor import extract_article_data
from src.embeddings import get_text_embedding

# --- 1.  Deduplication ---
def is_semantic_duplicate(db: Session, new_vector, threshold=0.95):
    """
    Prevents the exact same story from being saved twice.
    If similarity > 0.95, we treat it as a duplicate.
    """
    # Using pgvector's <=> operator (cosine distance)
    # Cosine Similarity = 1 - Cosine Distance
    duplicate = db.query(Article).filter(
        Article.vector.cosine_distance(new_vector) < (1 - threshold)
    ).first()
    return duplicate is not None

# --- 2. THE SOFT GATE: Clustering ---
def find_best_cluster(db: Session, new_vector, threshold=0.70):
    """
    Looks for a related "Leader" article to join its cluster.
    """
    match = db.query(
        Article.cluster_id, 
        (1 - Article.vector.cosine_distance(new_vector)).label('similarity')
    ).filter(Article.cluster_id.isnot(None))\
     .order_by(desc('similarity'))\
     .first()

    if match and match.similarity >= threshold:
        return match.cluster_id, match.similarity
    return None, 0.0

# --- 3. THE UTILITY: ID Generator ---
def get_next_cluster_id(db: Session):
    """Calculates the next available cluster ID for a new story."""
    max_id = db.query(func.max(Article.cluster_id)).scalar()
    return (max_id or 0) + 1

# --- THE MAIN PIPELINE ---
def process_new_url(url: str, source_name: str):
    db = SessionLocal()
    try:
        # Step 1: Extract
        data = extract_article_data(url, source_name)
        if not data:
            return "Extraction failed."

        # Step 2: Vectorize
        content_to_vectorize = f"{data['title']} {data['full_text'][:500]}"
        vector = get_text_embedding(content_to_vectorize)

        # Step 3: Deduplicate (Hard Gate)
        if is_semantic_duplicate(db, vector, threshold=0.95):
            return f"Skipped: '{data['title']}' is a duplicate of an existing article."

        # Step 4: Cluster (Soft Gate)
        cluster_id, confidence = find_best_cluster(db, vector, threshold=0.70)
        
        if cluster_id:
            status = f"Joined cluster {cluster_id} (Similarity: {confidence:.2f})"
        else:
            cluster_id = get_next_cluster_id(db)
            status = f"Started new cluster {cluster_id}"

        # Step 5: Save
        new_article = Article(
            title=data['title'],
            url=data['url'],
            full_text=data['full_text'],
            source=data['source'],
            published=data['published'],
            vector=vector,
            credibility_score=data['credibility_score'],
            cluster_id=cluster_id
        )
        db.add(new_article)
        db.flush() 

        # Step 6: Timeline Record
        timeline_entry = TopicTimeline(
            article_id=new_article.id, 
            cluster_id=cluster_id
        )
        db.add(timeline_entry)
        
        db.commit()
        return f"Success: {status} - '{data['title']}'"

    except Exception as e:
        db.rollback()
        return f"Error processing {url}: {e}"
    finally:
        db.close()