import numpy as np
from sqlalchemy.orm import Session
from database import SessionLocal
from models import Article, TopicTimeline
from extractor import extract_article_data
from embeddings import get_text_embedding # Real BERT

# --- SEMANTIC DEDUPLICATION ---
def is_semantic_duplicate(db: Session, new_vector, threshold=0.90):
    """
    Checks if an article is a duplicate using pgvector cosine distance.
    Distance = 1 - Similarity. 0.90 similarity = 0.10 distance.
    """
    # Using pgvector's <=> operator (cosine distance)
    # The math involved is: $$1 - \frac{\mathbf{A} \cdot \mathbf{B}}{\|\mathbf{A}\| \|\mathbf{B}\|}$$
    duplicate = db.query(Article).filter(
        Article.vector.cosine_distance(new_vector) < (1 - threshold)
    ).first()
    return duplicate is not None

# --- PIPELINE EXECUTION ---
def process_new_url(url: str, source_name: str):
    db = SessionLocal()
    try:
        # 1. Extraction - MUST HAPPEN FIRST
        data = extract_article_data(url, source_name)
        if not data:
            return "Extraction failed."

        # 2. Vectorization - Use the extracted data
        # We combine Title + Snippet for a stronger semantic fingerprint
        content_to_vectorize = f"{data['title']} {data['full_text'][:500]}"
        vector = get_text_embedding(content_to_vectorize)

        # 3. Deduplication 
        if is_semantic_duplicate(db, vector):
            return "Skipped: Semantic duplicate found."

        # 4. Save to Article Pool 
        new_article = Article(
            title=data['title'],
            url=data['url'],
            full_text=data['full_text'],
            source=data['source'],
            published=data['published'],
            vector=vector,
            credibility_score=data['credibility_score']
        )
        db.add(new_article)
        db.flush() # Secure the ID

        # 5. Update Topic Timeline 
        # (Cluster ID logic will be handled by Person 3 later)
        timeline_entry = TopicTimeline(article_id=new_article.id, cluster_id=1)
        db.add(timeline_entry)
        
        db.commit()
        return f"Success: Saved '{data['title']}'"

    except Exception as e:
        db.rollback()
        return f"Error processing {url}: {e}"
    finally:
        db.close()