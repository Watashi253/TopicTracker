from motor.motor_asyncio import AsyncIOMotorDatabase

from db.mongo import get_async_db


async def get_db() -> AsyncIOMotorDatabase:
    return get_async_db()
