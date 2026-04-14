"""
MongoDB helpers.

  - Async (motor) client  → used by the FastAPI read API
  - Sync (pymongo) helper → used by the ingester and summarizer worker
"""
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import MongoClient

from config.settings import settings

# ── Async client (FastAPI) ────────────────────────────────────────────────────
_async_client: AsyncIOMotorClient | None = None


async def connect_async() -> None:
    global _async_client
    _async_client = AsyncIOMotorClient(settings.MONGO_URI)


async def close_async() -> None:
    if _async_client:
        _async_client.close()


def get_async_db():
    """Return the async Motor database handle."""
    return _async_client[settings.MONGO_DB]


# ── Sync client (ingester / worker) ──────────────────────────────────────────
def get_sync_db():
    """
    Return a new synchronous pymongo database handle.
    Call once per process — reuse the returned db object.
    """
    client = MongoClient(settings.MONGO_URI)
    return client[settings.MONGO_DB]
