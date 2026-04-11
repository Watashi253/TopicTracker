import httpx
import hmac
import hashlib
import json
import asyncio
from typing   import Optional

from app.config import WEBHOOK_SECRET


# ── Webhook alert ─────────────────────────────────────────────────────────────
# Sends an HTTP POST to the user's configured webhook URL with a JSON payload.
#
# Why HMAC signature?
#   The receiving server can verify the request genuinely came from us by
#   checking the X-Signature header — same pattern used by GitHub, Stripe, etc.
#   Secret is stored in config.py / .env.
async def send_webhook_alert(
    webhook_url:       str,
    article_id:        str,
    title:             str,
    url:               str,
    source:            str,
    summary:           Optional[str],
    credibility_score: Optional[float],
    topic:             str,
) -> bool:
    payload = {
        "event":             "new_article_alert",
        "topic":             topic,
        "article": {
            "id":               article_id,
            "title":            title,
            "url":              url,
            "source":           source,
            "summary":          summary or "",
            "credibility_score": credibility_score,
        }
    }

    body      = json.dumps(payload)
    signature = _sign_payload(body)

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(
                webhook_url,
                content  = body,
                headers  = {
                    "Content-Type": "application/json",
                    "X-Signature":  signature,       # receiver verifies this
                    "X-Source":     "TopicTracker",
                }
            )
            if response.status_code in (200, 201, 202, 204):
                return True
            else:
                print(f"[webhook_alert] Unexpected status {response.status_code} for {webhook_url}")
                return False

    except Exception as e:
        print(f"[webhook_alert] Failed to POST to {webhook_url}: {e}")
        return False


def _sign_payload(body: str) -> str:
    """
    HMAC-SHA256 signature of the raw JSON body.
    The receiver should compute the same and compare — if they match,
    the payload has not been tampered with.
    """
    return hmac.new(
        WEBHOOK_SECRET.encode(),
        body.encode(),
        hashlib.sha256
    ).hexdigest()