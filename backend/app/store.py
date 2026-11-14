"""In-memory store for A1. Replaced by Supabase/SQLite persistence in A2."""

from typing import Any

SESSIONS: dict[str, dict[str, Any]] = {}
