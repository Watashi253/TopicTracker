import smtplib
import asyncio
from email.mime.text      import MIMEText
from email.mime.multipart import MIMEMultipart
from typing               import Optional

from app.config import SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, SMTP_FROM


# ── Email alert payload ───────────────────────────────────────────────────────
# A simple dataclass describing the article that triggered the alert.
# We build the email body from this.
class ArticleAlert:
    def __init__(
        self,
        title:             str,
        url:               str,
        source:            str,
        summary:           Optional[str],
        credibility_score: Optional[float],
        topic:             str,
    ):
        self.title             = title
        self.url               = url
        self.source            = source
        self.summary           = summary or "No summary available."
        self.credibility_score = credibility_score
        self.topic             = topic


def _build_email_body(alert: ArticleAlert) -> str:
    """Build a clean plain-text email body for the alert."""
    credibility = (
        f"{alert.credibility_score:.2f}" if alert.credibility_score else "N/A"
    )
    return (
        f"New alert for topic: {alert.topic}\n"
        f"{'─' * 50}\n\n"
        f"Title:       {alert.title}\n"
        f"Source:      {alert.source}  (credibility: {credibility})\n"
        f"Link:        {alert.url}\n\n"
        f"Summary:\n{alert.summary}\n\n"
        f"{'─' * 50}\n"
        f"You are receiving this because you subscribed to '{alert.topic}'.\n"
        f"Manage subscriptions at http://localhost:3000/subscriptions"
    )


def _send_smtp(to_email: str, subject: str, body: str) -> bool:
    """
    Blocking SMTP send.
    Uses TLS (STARTTLS on port 587) — works with Gmail, Outlook, etc.
    Returns True on success, False on any failure.
    """
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"]    = SMTP_FROM
        msg["To"]      = to_email
        msg.attach(MIMEText(body, "plain"))

        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.ehlo()
            server.starttls()
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.sendmail(SMTP_FROM, to_email, msg.as_string())

        return True

    except Exception as e:
        print(f"[email_alert] Failed to send to {to_email}: {e}")
        return False


async def send_email_alert(to_email: str, alert: ArticleAlert) -> bool:
    """
    Async wrapper around the blocking SMTP call.
    We run it in a thread executor so it doesn't block the event loop
    (smtplib is synchronous — FastAPI is async, so we can't call it directly).
    """
    subject = f"[Topic Alert] {alert.topic} — {alert.title[:60]}"
    body    = _build_email_body(alert)

    loop   = asyncio.get_event_loop()
    result = await loop.run_in_executor(None, _send_smtp, to_email, subject, body)
    return result