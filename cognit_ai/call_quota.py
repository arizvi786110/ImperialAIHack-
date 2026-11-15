"""Cross-request Claude call quota stored in SQLite on Railway's persistent volume.

Conservative call-count guard for a public hackathon demo. This is NOT a
GBP-denominated spending ceiling: set a real workspace limit in Anthropic.
"""
import os
import sqlite3
import time
from pathlib import Path

class ModelQuotaExceeded(RuntimeError):
    pass

def reserve_call() -> None:
    path = Path(os.getenv("COGNIT_AI_QUOTA_DB", "/data/cognit_ai_quota.db" if Path("/data").exists() else "/tmp/cognit_ai_quota.db"))
    per_day = max(0, int(os.getenv("COGNIT_AI_DAILY_CALL_CAP", "120")))
    per_minute = max(0, int(os.getenv("COGNIT_AI_MINUTE_CALL_CAP", "12")))
    total = max(0, int(os.getenv("COGNIT_AI_TOTAL_CALL_CAP", "180")))
    path.parent.mkdir(parents=True, exist_ok=True)
    with sqlite3.connect(str(path), timeout=5, isolation_level=None) as db:
        db.execute("PRAGMA busy_timeout=5000")
        db.execute("CREATE TABLE IF NOT EXISTS model_calls (id INTEGER PRIMARY KEY, created_at REAL NOT NULL)")
        db.execute("BEGIN IMMEDIATE")
        try:
            now = time.time()
            recent_day = db.execute("SELECT COUNT(*) FROM model_calls WHERE created_at >= ?", (now - 86400,)).fetchone()[0]
            recent_minute = db.execute("SELECT COUNT(*) FROM model_calls WHERE created_at >= ?", (now - 60,)).fetchone()[0]
            lifetime = db.execute("SELECT COUNT(*) FROM model_calls").fetchone()[0]
            if recent_day >= per_day or recent_minute >= per_minute or lifetime >= total:
                raise ModelQuotaExceeded("Cognit model-call quota reached")
            db.execute("INSERT INTO model_calls (created_at) VALUES (?)", (now,))
            db.commit()
        except Exception:
            db.rollback()
            raise
