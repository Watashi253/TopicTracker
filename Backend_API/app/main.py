import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers           import query, subscribe, results
from app.websocket.manager import router as ws_router
from app.db.database       import engine, Base
from app.config            import API_HOST, API_PORT


# ── App ───────────────────────────────────────────────────────────────────────
app = FastAPI(
    title       = "Topic Tracker — Backend API & Alert Delivery",
    description = (
        "REST endpoints for topic querying, subscription management, "
        "and ranked article results. WebSocket endpoint for real-time alerts."
    ),
    version     = "1.0"
)


# ── CORS ──────────────────────────────────────────────────────────────────────
# Allow the React frontend (localhost:3000) to call our API.
# In production, replace "*" with the actual frontend domain.
app.add_middleware(
    CORSMiddleware,
    allow_origins     = ["*"],
    allow_credentials = True,
    allow_methods     = ["*"],
    allow_headers     = ["*"],
)


# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(query.router,     prefix="/api", tags=["Query"])
app.include_router(subscribe.router, prefix="/api", tags=["Subscribe"])
app.include_router(results.router,   prefix="/api", tags=["Results"])
app.include_router(ws_router,                       tags=["WebSocket"])


# ── Startup: create all tables if they don't exist ────────────────────────────
# This is a dev convenience — in production use Alembic migrations instead.
@app.on_event("startup")
async def on_startup():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


# ── Health check ──────────────────────────────────────────────────────────────
@app.get("/health", tags=["Health"])
def health():
    return {"status": "ok", "service": "backend-api"}


# ── Run ───────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    uvicorn.run("app.main:app", host=API_HOST, port=API_PORT, reload=True)