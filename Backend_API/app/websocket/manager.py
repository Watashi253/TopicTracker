from fastapi             import APIRouter, WebSocket, WebSocketDisconnect, Query
from typing              import Dict, List
import json
import asyncio

router = APIRouter()


# ── Connection Manager ────────────────────────────────────────────────────────
# Keeps track of all active WebSocket connections.
# Each user_id maps to a list of WebSocket objects — one user can have
# multiple tabs open and all of them receive the alert.
#
# Why a class?
#   We need a single shared state across all requests. A module-level
#   instance (manager = ConnectionManager()) gives us that cleanly.
class ConnectionManager:
    def __init__(self):
        # { user_id: [WebSocket, WebSocket, ...] }
        self.active: Dict[str, List[WebSocket]] = {}

    async def connect(self, user_id: str, websocket: WebSocket):
        await websocket.accept()
        if user_id not in self.active:
            self.active[user_id] = []
        self.active[user_id].append(websocket)

    def disconnect(self, user_id: str, websocket: WebSocket):
        if user_id in self.active:
            self.active[user_id].remove(websocket)
            if not self.active[user_id]:
                del self.active[user_id]

    async def send_to_user(self, user_id: str, payload: dict):
        """Push a JSON payload to all open tabs for this user."""
        connections = self.active.get(user_id, [])
        dead        = []
        for ws in connections:
            try:
                await ws.send_text(json.dumps(payload))
            except Exception:
                dead.append(ws)
        # Clean up broken connections
        for ws in dead:
            self.disconnect(user_id, ws)

    async def broadcast(self, payload: dict):
        """Push a payload to every connected user (e.g. breaking news)."""
        for user_id in list(self.active.keys()):
            await self.send_to_user(user_id, payload)

    def connected_users(self) -> List[str]:
        return list(self.active.keys())


# Singleton — imported by routers and the alert watcher
manager = ConnectionManager()


# ── WebSocket endpoint ────────────────────────────────────────────────────────
# Frontend connects here:
#   ws://localhost:8001/ws/{user_id}
#
# Once connected the user receives alerts in real time.
# The connection stays open until the user closes the tab.
@router.websocket("/ws/{user_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    user_id:   str
):
    await manager.connect(user_id, websocket)
    try:
        # Send a confirmation ping so the frontend knows it's live
        await websocket.send_text(json.dumps({
            "type":    "connected",
            "user_id": user_id,
            "message": "Connected to alert feed. Waiting for new articles..."
        }))

        # Keep the connection alive — we receive heartbeat pings from
        # the frontend here. If the client disconnects, the exception fires.
        while True:
            data = await websocket.receive_text()
            # Echo back heartbeats so frontend knows connection is healthy
            if data == "ping":
                await websocket.send_text(json.dumps({"type": "pong"}))

    except WebSocketDisconnect:
        manager.disconnect(user_id, websocket)