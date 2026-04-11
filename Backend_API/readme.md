# Backend API & Alert Delivery

FastAPI service for query handling, subscriptions, and real-time alert delivery.
Runs on `http://localhost:8001`.

## Getting Started

First, make sure PostgreSQL and ingestion service (port 8000) are running.

Set up your environment:

```bash
cp .env.example .env

```

Install dependencies and run:

```bash
pip install -r req.txt
python -m app.main
```

Open `http://localhost:8001/docs` to see all endpoints and test them interactively.

## Endpoints

```
POST   /api/query                         Search articles for a topic
POST   /api/subscribe                     Register a topic subscription
GET    /api/subscribe/{user_id}           List subscriptions for a user
DELETE /api/subscribe/{subscription_id}  Cancel a subscription
GET    /api/results/{user_id}             Alert feed for a user
GET    /api/results/{user_id}/timeline    Topic evolution timeline
WS     /ws/{user_id}                      Real-time alert stream
```

## WebSocket (for Person 5)

```javascript
const ws = new WebSocket("ws://localhost:8001/ws/user_123");
ws.onmessage = (e) => console.log(JSON.parse(e.data));
setInterval(() => ws.send("ping"), 30000);
```

## Project Structure

```
app/
├── main.py
├── config.py
├── models/db_models.py
├── db/database.py
├── routers/
│   ├── query.py
│   ├── subscribe.py
│   └── results.py
├── websocket/manager.py
└── alerts/
    ├── email_alert.py
    └── webhook_alert.py
```
