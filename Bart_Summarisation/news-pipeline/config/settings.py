from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # MongoDB
    MONGO_URI: str = "mongodb://localhost:27017"
    MONGO_DB: str = "news_test"
    RAW_COLLECTION: str = "raw_articles"
    PROCESSED_COLLECTION: str = "processed_articles"

    # Redis (Upstash — use the full rediss:// URL from the Upstash console)
    REDIS_URL: str = "rediss://localhost:6379"  # overridden in .env
    REDIS_QUEUE_KEY: str = "articles:to_summarize"

    # News microservice (your existing service)
    NEWS_URLS: str = ""  # comma-separated list of endpoints, set in .env
    POLL_INTERVAL_SECONDS: int = 300

    # HuggingFace Inference API
    HF_API_TOKEN: str = ""
    HF_BART_URL: str = (
        "https://router.huggingface.co/hf-inference/models/facebook/bart-large-cnn"
    )

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
