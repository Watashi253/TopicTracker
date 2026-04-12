"""
HuggingFace Inference API client for facebook/bart-large-cnn.

Two public helpers
------------------
  get_short_title(text)   → 2–6 word ultra-short summary
  get_medium_summary(text) → 1–3 sentence summary

The HF Inference API returns HTTP 503 while the model is loading.
We retry up to MAX_RETRIES times with a short back-off.
"""
import logging
import time

import httpx

from config.settings import settings

logger = logging.getLogger(__name__)

_HEADERS = {"Authorization": f"Bearer {settings.HF_API_TOKEN}"}
MAX_RETRIES = 5
RETRY_DELAY = 20  # seconds — HF usually loads within 20–40 s


def _call_bart(text: str, max_length: int, min_length: int) -> str:
    """
    POST to the HF Inference API and return the summary string.
    Retries on 503 (model loading).
    """
    payload = {
        "inputs": text,
        "parameters": {
            "max_length": max_length,
            "min_length": min_length,
            "do_sample": False,
        },
    }

    for attempt in range(1, MAX_RETRIES + 1):
        try:
            with httpx.Client(timeout=60) as client:
                resp = client.post(settings.HF_BART_URL, headers=_HEADERS, json=payload)

            if resp.status_code == 503:
                wait = resp.json().get("estimated_time", RETRY_DELAY)
                logger.warning(
                    "[HF] Model loading (attempt %d/%d). Retrying in %.0fs…",
                    attempt, MAX_RETRIES, wait,
                )
                time.sleep(float(wait))
                continue

            resp.raise_for_status()
            result = resp.json()

            # Expected: [{"summary_text": "..."}]
            if isinstance(result, list) and result:
                return result[0].get("summary_text", "").strip()

            raise ValueError(f"Unexpected HF response shape: {result}")

        except httpx.HTTPStatusError as exc:
            raise RuntimeError(f"HF API HTTP error {exc.response.status_code}") from exc

    raise RuntimeError("HF model did not become ready after retries.")


def get_short_title(text: str) -> str:
    """
    2–6 word ultra-short summary, used as the article short title.
    BART operates on sub-word tokens so we post-process to cap at 6 words.
    """
    raw = _call_bart(text, max_length=12, min_length=3)
    words = raw.split()
    return " ".join(words[:6])


def get_medium_summary(text: str) -> str:
    """1–3 sentence intermediate summary."""
    return _call_bart(text, max_length=90, min_length=30)
