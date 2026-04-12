.PHONY: ingester worker api poll

# Run the ingester (cron poller) — fires one poll immediately on start
ingester:
	python -m uvicorn ingester.main:app --host 0.0.0.0 --port 8001 --reload

# Run the summarizer worker (blocking Redis consumer)
worker:
	python -m summarizer.worker

# Run the read API
api:
	python -m uvicorn api.main:app --host 0.0.0.0 --port 8002 --reload

# Manually trigger one poll right now (while ingester is running)
poll:
	curl -s -X POST http://localhost:8001/poll/trigger | python -m json.tool
