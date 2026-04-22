from sqlalchemy import Column, Integer, Text, TIMESTAMP, Float, ForeignKey, Index, DateTime, func
from pgvector.sqlalchemy import Vector
from src.database import Base
from datetime import datetime
from sqlalchemy.orm import Mapped, mapped_column, relationship

class Cluster(Base):
    __tablename__ = 'clusters'
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    centroid_vector: Mapped[list] = mapped_column(Vector(384)) 
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    articles = relationship("Article", back_populates="cluster")
    subscriptions = relationship("Subscription", back_populates="cluster")
    __table_args__ = (
        Index('clusters_centroid_idx', 'centroid_vector', postgresql_using='hnsw', 
              postgresql_with={'m': 16, 'ef_construction': 64},
              postgresql_ops={'centroid_vector': 'vector_cosine_ops'}),
    )

class Article(Base):
    __tablename__ = 'articles'
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    title: Mapped[str] = mapped_column(Text)
    url: Mapped[str] = mapped_column(Text, unique=True, index=True)
    full_text: Mapped[str] = mapped_column(Text)
    source: Mapped[str] = mapped_column(Text)
    published: Mapped[datetime] = mapped_column(TIMESTAMP)
    vector: Mapped[list] = mapped_column(Vector(384))
    summary: Mapped[str] = mapped_column(Text)
    credibility_score: Mapped[float] = mapped_column(Float)
    cluster_id: Mapped[int] = mapped_column(Integer, ForeignKey('clusters.id', ondelete="CASCADE"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, 
        server_default=func.now()
    )
    last_seen_at: Mapped[datetime] = mapped_column(
        DateTime, 
        server_default=func.now(), 
        onupdate=func.now()
    )
    cluster = relationship("Cluster", back_populates="articles")
    __table_args__ = (
        Index('articles_vector_idx', 'vector', postgresql_using='hnsw', 
              postgresql_with={'m': 16, 'ef_construction': 64},
              postgresql_ops={'vector': 'vector_cosine_ops'}),
    )

class TopicTimeline(Base):
    __tablename__ = 'topic_timeline'
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    cluster_id: Mapped[int] = mapped_column(Integer)
    article_id: Mapped[int] = mapped_column(Integer, ForeignKey('articles.id', ondelete="CASCADE"))
    arrived_at: Mapped[datetime] = mapped_column(
        DateTime, 
        server_default=func.now()
    )

class Subscription(Base):
    __tablename__ = 'subscriptions'
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_email: Mapped[str] = mapped_column(Text, index=True)
    cluster_id: Mapped[int] = mapped_column(
        Integer, 
        ForeignKey('clusters.id', ondelete="CASCADE")
    )
    last_notified_at: Mapped[datetime] = mapped_column(
        DateTime, 
        server_default=func.now()
    )
    cluster = relationship("Cluster", back_populates="subscriptions")