import os
from dotenv import load_dotenv

# ── Load .env file if present (for local development) ───────────────────────
load_dotenv()


# ── PostgreSQL ───────────────────────────────────────────────────────────────
# This is the central database shared across all backend services.
# Person 2 writes articles here; we read and write subscriptions / alerts.
DATABASE_URL: str = os.getenv(
    "DATABASE_URL",
    "postgresql+asyncpg://postgres:password@localhost:5432/topic_tracker"
)

# ── Redis ────────────────────────────────────────────────────────────────────
# Used by Celery (Person 1) as a message broker.
# We use it to cache seen article IDs and pub/sub for WebSocket fan-out.
REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")


# ── Ingestion Service ────────────────────────────────────────────────────────
# Base URL of Person 1's running FastAPI ingestion app (port 8000).
# We call their /fetch/all endpoint when a user submits a query.
INGESTION_BASE_URL: str = os.getenv("INGESTION_BASE_URL", "http://localhost:8000")


# ── SMTP Email Alerts ────────────────────────────────────────────────────────
# Credentials for sending email alerts to subscribed users.
SMTP_HOST:     str = os.getenv("SMTP_HOST",     "smtp.gmail.com")
SMTP_PORT:     int = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER:     str = os.getenv("SMTP_USER",     "")
SMTP_PASSWORD: str = os.getenv("SMTP_PASSWORD", "")
SMTP_FROM:     str = os.getenv("SMTP_FROM",     "alerts@topictracker.dev")


# ── Webhook / SMS ────────────────────────────────────────────────────────────
# Generic outbound webhook URL (e.g. Slack, Discord, custom endpoint).
# SMS can be wired to Twilio or Fast2SMS here.
WEBHOOK_SECRET: str = os.getenv("WEBHOOK_SECRET", "changeme")


# ── Similarity Threshold (default) ──────────────────────────────────────────
# Minimum cosine similarity score for an article to match a subscription.
# Users can override this per-subscription (stored in DB).
DEFAULT_SIMILARITY_THRESHOLD: float = float(
    os.getenv("DEFAULT_SIMILARITY_THRESHOLD", "0.75")
)


# ── App ──────────────────────────────────────────────────────────────────────
API_HOST: str = os.getenv("API_HOST", "0.0.0.0")
API_PORT: int = int(os.getenv("API_PORT", "8001"))   # 8000 is taken by ingestion