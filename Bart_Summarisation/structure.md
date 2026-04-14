# News Pipeline

A three-service Python pipeline that ingests news articles, summarises them
with Facebook BART via the HuggingFace Inference API, and serves them through
a FastAPI read endpoint.

```
Your microservice
      │  JSON articles
      ▼
┌─────────────────┐   save    ┌──────────────────┐
│  Ingester       │ ────────► │ MongoDB           │
│  FastAPI +      │           │ raw_articles      │
│  APScheduler    │           └──────────────────┘
└─────────────────┘                    ▲
      │  push _id                      │ raw_article_id ref
      ▼                                │
┌─────────────────┐  BART API ┌────────────────────┐  reads  ┌────────────────┐
│  Redis queue    │ ────────► │ Summarizer worker  │ ──────► │ MongoDB        │
│  articles:to_   │           │                    │         │ processed_     │
│  summarize      │           │ short_title        │         │ articles       │
└─────────────────┘           │ medium_summary     │         └────────────────┘
                              └────────────────────┘                ▲
                                                                     │
                                                         ┌───────────────────┐
                                                         │ FastAPI Read API  │
                                                         │ GET /articles     │
                                                         │ GET /articles/:id │
                                                         │        /raw       │
                                                         └───────────────────┘
```

---

## Prerequisites

- Python 3.11+
- Docker (for MongoDB and Redis)
- HuggingFace account with a free API token

---

## Setup

### 1. Install Python dependencies

```bash
pip install -r requirements.txt
```

### 2. Configure environment

```bash
cp .env.example .env
```

Open `.env` and fill in:

| Variable | Description |
|---|---|
| `NEWS_SERVICE_URL` | Full URL of your existing news microservice endpoint |
| `HF_API_TOKEN` | Your HuggingFace token from https://huggingface.co/settings/tokens |
| `POLL_INTERVAL_SECONDS` | How often to poll (default: 300 = 5 minutes) |

Everything else can stay as-is for local development.

### 3. Start MongoDB and Redis

```bash
make services
# MongoDB → localhost:27017
# Redis   → localhost:6379
```

---

## Running the pipeline

Open **three separate terminals** in your Codespace:

**Terminal 1 — Ingester** (polls your microservice on a cron schedule)
```bash
make ingester
# Starts on http://localhost:8000
# Fires one poll immediately, then every POLL_INTERVAL_SECONDS
```

**Terminal 2 — Summarizer worker** (blocking Redis consumer)
```bash
make worker
# Picks up article IDs from Redis one-by-one
# Calls HuggingFace BART, writes to processed_articles
```

**Terminal 3 — Read API**
```bash
make api
# Starts on http://localhost:8002
# Auto-reload enabled
```

---

## API reference

Base URL: `http://localhost:8002`

### List processed articles
```
GET /articles?skip=0&limit=20&source=bbc
```
Returns newest-first list with `short_title`, `medium_summary`, `original_title`,
`original_url`, `source_name`, `published_at`, `processed_at`.

### Get a single processed article
```
GET /articles/{id}
```

### Get the original raw article
```
GET /articles/{id}/raw
```
Returns the full unmodified JSON as received from your microservice.
Use this when the reader wants to follow the original source link.

### Manually trigger a poll (without waiting for cron)
```
POST http://localhost:8000/poll/trigger
```

### Health checks
```
GET http://localhost:8000/health   → ingester
GET http://localhost:8002/health   → read API
```

Interactive docs (Swagger UI):
- Ingester: http://localhost:8000/docs
- Read API:  http://localhost:8002/docs

---

## MongoDB collections

### `raw_articles`
Stores the article exactly as received from your microservice, plus:

| Field | Description |
|---|---|
| `ingested_at` | UTC timestamp when the poller saved it |
| `summarized` | `false` initially, flipped to `true` after worker finishes |
| `summarized_at` | UTC timestamp set by the worker |

Unique index on `url` — duplicate articles are silently skipped.

### `processed_articles`
Created by the summarizer worker. Linked to `raw_articles` via `raw_article_id`.

| Field | Description |
|---|---|
| `raw_article_id` | String ObjectId → `raw_articles._id` |
| `short_title` | 2–6 word BART summary |
| `medium_summary` | 1–3 sentence BART summary |
| `original_title` | Copied from raw for convenience |
| `original_url` | Copied from raw for convenience |
| `source_name` | e.g. `"bbc"` |
| `published_at` | From original article |
| `processed_at` | UTC timestamp |

Unique index on `raw_article_id` — ensures each article is processed exactly once.

---

## Troubleshooting

**HF API returns 503**
The BART model is loading — the worker retries automatically (up to 5 times,
with the wait time provided by HuggingFace in the response). This is normal on
the first request after a period of inactivity.

**Article not appearing in processed_articles**
Check worker logs. Common causes:
- Too little text (title + snippet under 20 characters)
- HF token missing or invalid in `.env`
- Redis or MongoDB not running (`make services`)

**Duplicate articles not being skipped**
Make sure the ingester has run at least once so the unique index on `url` is
created in MongoDB. It is created automatically on the first `poll_and_ingest()` call.
