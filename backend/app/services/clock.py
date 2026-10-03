from datetime import datetime, timezone


def utcnow() -> datetime:
    """One injectable clock for freshness and date-sensitive tests."""
    return datetime.now(timezone.utc)
