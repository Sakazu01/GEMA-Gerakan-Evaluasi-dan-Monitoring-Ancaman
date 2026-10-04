"""Pure trust/freshness policy. Visual severity is never a verification verdict."""

from datetime import datetime, timedelta, timezone
from typing import Any

from app.core.config import settings
from app.services.rules import haversine_distance_m


def moment(value: str | datetime | None) -> datetime | None:
    if value is None:
        return None
    try:
        result = value if isinstance(value, datetime) else datetime.fromisoformat(value.replace("Z", "+00:00"))
        return result.astimezone(timezone.utc) if result.tzinfo else None
    except ValueError:
        return None


def active_public(row: dict[str, Any], now: datetime) -> bool:
    expires = moment(row.get("expires_at"))
    return row.get("status") == "active" and not row.get("is_demo", False) and expires is not None and expires > now


def visible_on_public_map(row: dict[str, Any], now: datetime) -> bool:
    """Active reports become public map markers; responder acceptance only raises their status."""
    return active_public(row, now)


def observation_counts(row: dict[str, Any], now: datetime) -> dict[str, int]:
    counts = {"direct_seen_nearby": 0, "direct_not_observed_nearby": 0, "secondhand": 0, "unsure": 0}
    for obs in row.get("observations") or []:
        if obs.get("user_id") == row.get("author_id") or obs.get("withdrawn_at") or obs.get("abuse_flag"):
            continue
        received = moment(obs.get("received_at"))
        observed = moment(obs.get("observed_at"))
        time = received if obs.get("value") == "unsure" else observed
        if not time or time < now - timedelta(minutes=settings.observation_freshness_min) or time > now + timedelta(minutes=5):
            continue
        if obs.get("value") == "unsure":
            counts["unsure"] += 1
        elif obs.get("source") == "secondhand":
            counts["secondhand"] += 1
        elif obs.get("proximity_eligible"):
            key = "direct_seen_nearby" if obs.get("value") == "seen" else "direct_not_observed_nearby"
            counts[key] += 1
    return counts


def proximity_eligible(report: dict[str, Any], location: dict[str, Any] | None, now: datetime) -> bool:
    if not location or location.get("accuracy_m", 100000) > 100:
        return False
    measured = moment(location.get("measured_at"))
    if not measured or measured < now-timedelta(minutes=settings.device_location_max_age_min) or measured > now+timedelta(minutes=5):
        return False
    return haversine_distance_m(report["lat"], report["lng"], location["lat"], location["lng"]) <= settings.confirmation_radius_m


def notice_radius(row: dict[str, Any]) -> int | None:
    status = row.get("verification_status", "unconfirmed")
    if status == "under_review":
        return None
    if status in ("unconfirmed", "confirmed"):
        return settings.confirmation_radius_m
    return None
