from sqlalchemy import Column, Integer, Text, TIMESTAMP, Float, ForeignKey, Index , DateTime, func
from pgvector.sqlalchemy import Vector
from src.database import Base
from datetime import datetime
from sqlalchemy.orm import Mapped, mapped_column

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
    created_at: Mapped[datetime] = mapped_column(
        DateTime, 
        server_default=func.now()
    )
    last_seen_at: Mapped[datetime] = mapped_column(
        DateTime, 
        server_default=func.now(), 
        onupdate=func.now()
    )

    __table_args__ = (
        Index('articles_vector_idx', 'vector', postgresql_using='hnsw', 
              postgresql_with={'m': 16, 'ef_construction': 64},
              postgresql_ops={'vector': 'vector_cosine_ops'}),
    )

class TopicTimeline(Base):
    __tablename__ = 'topic_timeline'
    id = Column(Integer, primary_key=True, index=True)
    cluster_id = Column(Integer)
    article_id = Column(Integer, ForeignKey('articles.id'))
    arrived_at: Mapped[datetime] = mapped_column(
        DateTime, 
        server_default=func.now()
    )