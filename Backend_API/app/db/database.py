from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm           import DeclarativeBase

from app.config import DATABASE_URL


# ── Engine ───────────────────────────────────────────────────────────────────
# create_async_engine gives us a non-blocking DB connection pool.
# echo=True logs every SQL query to stdout — useful during development,
# set to False in production.
engine = create_async_engine(
    DATABASE_URL,
    echo        = True,
    pool_size   = 10,     # max persistent connections in the pool
    max_overflow= 20,     # extra connections allowed when pool is full
)


# ── Session factory ──────────────────────────────────────────────────────────
# AsyncSessionLocal is a factory: calling it creates one DB session.
# expire_on_commit=False means objects stay readable after a commit
# (important for async — we don't want implicit lazy-loads firing).
AsyncSessionLocal = async_sessionmaker(
    bind            = engine,
    class_          = AsyncSession,
    expire_on_commit= False,
)


# ── Base class for all ORM models ────────────────────────────────────────────
# Every table model (Article, Subscription, etc.) will inherit from Base.
class Base(DeclarativeBase):
    pass


# ── Dependency for FastAPI routes ────────────────────────────────────────────
# FastAPI calls get_db() for every request that declares it as a dependency.
# The `yield` hands the session to the route; the finally block closes it
# automatically after the response is sent — no manual cleanup needed.
async def get_db() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()