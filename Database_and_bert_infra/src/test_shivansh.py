# pip install psycopg2-binary

from database import engine
from sqlalchemy import text

with engine.connect() as conn:
    result = conn.execute(text("SELECT 1"))
    print("✅ Connected to NeonDB:", result.fetchone())