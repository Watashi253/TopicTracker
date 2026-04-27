import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional
import logging
from sqlalchemy import text

from app.config import SMTP_SERVER, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, SMTP_SENDER

logger = logging.getLogger(__name__)


class ArticleAlert:
    """Data class for article alert information."""
    def __init__(
        self,
        title: str,
        url: str,
        source: str,
        summary: Optional[str],
        credibility_score: Optional[float],
        topic: str,
    ):
        self.title = title
        self.url = url
        self.source = source
        self.summary = summary or "No summary available."
        self.credibility_score = credibility_score
        self.topic = topic


def _build_email_body(alert: ArticleAlert) -> str:
    """Build a clean plain-text email body for the alert."""
    credibility = (
        f"{alert.credibility_score:.2f}" if alert.credibility_score else "N/A"
    )
    return (
        f"New alert for topic: {alert.topic}\n"
        f"{'─' * 60}\n\n"
        f"Title:       {alert.title}\n"
        f"Source:      {alert.source}  (credibility: {credibility})\n"
        f"Link:        {alert.url}\n\n"
        f"Summary:\n{alert.summary}\n\n"
        f"{'─' * 60}\n"
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
        msg["From"] = SMTP_SENDER
        msg["To"] = to_email
        msg.attach(MIMEText(body, "plain"))

        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
            server.ehlo()
            server.starttls()
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.sendmail(SMTP_SENDER, to_email, msg.as_string())

        logger.info(f"[email_alert] Email sent successfully to {to_email}")
        return True

    except Exception as e:
        logger.error(f"[email_alert] Failed to send to {to_email}: {e}")
        return False


def send_cluster_alerts(db_session, cluster_id: int, article: dict) -> int:
    """
    Send email alerts to all users subscribed to a cluster when a new article is added.
    
    Args:
        db_session: Database session
        cluster_id: ID of the cluster
        article: Dictionary containing article data {id, title, url, source, summary, credibility_score}
    
    Returns:
        Number of emails sent successfully
    """
    try:
        # Query for subscriptions to this cluster
        query = text("""
        SELECT DISTINCT s.user_email 
        FROM subscriptions s
        WHERE s.cluster_id = :cluster_id
        """)
        
        result = db_session.execute(query, {"cluster_id": cluster_id})
        subscribed_users = result.fetchall()
        
        sent_count = 0
        
        if not subscribed_users:
            logger.info(f"[email_alert] No subscriptions found for cluster {cluster_id}")
            return 0
        
        # Build the alert
        alert = ArticleAlert(
            title=article.get("title", ""),
            url=article.get("url", ""),
            source=article.get("source", ""),
            summary=article.get("summary"),
            credibility_score=article.get("credibility_score"),
            topic=f"Cluster {cluster_id}"
        )
        
        # Send email to each subscribed user
        for user_row in subscribed_users:
            user_email = user_row[0]
            
            subject = f"[Topic Alert] {alert.topic} — {article.get('title', 'New Article')[:60]}"
            body = _build_email_body(alert)
            
            if _send_smtp(user_email, subject, body):
                sent_count += 1
            else:
                logger.warning(f"[email_alert] Failed to send alert to {user_email}")
        
        logger.info(f"[email_alert] Sent {sent_count} email alerts for article {article.get('id')} in cluster {cluster_id}")
        return sent_count
        
    except Exception as e:
        logger.error(f"[email_alert] Error sending cluster alerts: {e}")
        return 0
