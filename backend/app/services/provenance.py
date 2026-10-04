"""Photo provenance signals for responders; never an automatic hoax verdict."""

import base64
import json
from typing import Any, Protocol
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from app.core.config import settings
from app.services.clock import utcnow
from app.services.supabase_client import get_client


class WebImageProvider(Protocol):
    name: str

    def search(self, photo: bytes) -> list[dict[str, Any]]: ...


class GoogleVisionWebDetection:
    name = "google_vision_web_detection"

    def search(self, photo: bytes) -> list[dict[str, Any]]:
        if not settings.google_vision_api_key:
            raise RuntimeError("provider_unconfigured")
        payload = {"requests": [{"image": {"content": base64.b64encode(photo).decode("ascii")},
            "features": [{"type": "WEB_DETECTION", "maxResults": settings.provenance_result_limit}]}]}
        request = Request(
            "https://vision.googleapis.com/v1/images:annotate?key=" + settings.google_vision_api_key,
            data=json.dumps(payload).encode("utf-8"), headers={"Content-Type": "application/json"}, method="POST",
        )
        try:
            with urlopen(request, timeout=settings.web_image_timeout_seconds) as response:
                body = json.load(response)
        except (HTTPError, URLError, TimeoutError, ValueError) as error:
            raise RuntimeError("provider_unavailable") from error
        annotation = ((body.get("responses") or [{}])[0].get("webDetection") or {})
        page_by_image: dict[str, tuple[str | None, str | None]] = {}
        for page in annotation.get("pagesWithMatchingImages") or []:
            for match in (page.get("fullMatchingImages") or []) + (page.get("partialMatchingImages") or []):
                if match.get("url"):
                    page_by_image[match["url"]] = (page.get("url"), page.get("pageTitle"))
        candidates: list[tuple[str, float, dict[str, Any]]] = []
        for key, kind, score in (
            ("fullMatchingImages", "full", 1.0),
            ("partialMatchingImages", "partial", 0.8),
            ("visuallySimilarImages", "visual", 0.6),
        ):
            for item in annotation.get(key) or []:
                url = item.get("url")
                if not url:
                    continue
                page_url, title = page_by_image.get(url, (None, None))
                candidates.append((url, score, {"provider": self.name, "source_page_url": page_url,
                    "source_image_url": url, "title": title, "published_at": None,
                    "match_type": kind, "score": score}))
        seen: set[str] = set()
        results = []
        for key, _, item in sorted(candidates, key=lambda value: value[1], reverse=True):
            if key in seen:
                continue
            seen.add(key); results.append(item)
            if len(results) >= settings.provenance_result_limit:
                break
        return results


def provider() -> WebImageProvider | None:
    if settings.web_image_provider == "google_vision":
        return GoogleVisionWebDetection()
    return None


def _photo_bytes(path: str) -> bytes:
    value = get_client().storage.from_("report-photos").download(path)
    if isinstance(value, bytes):
        return value
    content = getattr(value, "content", None)
    if isinstance(content, bytes):
        return content
    raise RuntimeError("photo_unavailable")


def inspect_draft(report_id: str, author_id: str) -> dict[str, Any]:
    """Persist internal/web evidence. Failures are recorded and never block publish."""
    client = get_client()
    rows = client.table("reports").select("id,author_id,status,photo_path,provenance_status").eq("id",report_id).eq("author_id",author_id).limit(1).execute().data
    if not rows or rows[0]["status"] != "draft":
        return {"status": "skipped"}
    row = rows[0]
    if row.get("provenance_status") == "complete":
        return {"status": "complete"}
    client.table("reports").update({"provenance_status":"checking"}).eq("id",report_id).eq("author_id",author_id).eq("status","draft").execute()
    try:
        matches = client.rpc("find_photo_matches", {"p_report":report_id,"p_limit":settings.provenance_result_limit,
            "p_hamming":settings.image_similarity_hamming_max}).execute().data or []
        for match in matches:
            client.table("report_matches").upsert({"report_id":report_id,"matched_report_id":match["matched_report_id"],
                "match_method":match["match_method"],"score":match["score"],
                "hamming_distance":match.get("hamming_distance")}, on_conflict="report_id,matched_report_id,match_method").execute()
        web = provider()
        web_matches = 0
        web_status = "disabled"
        if web and row.get("photo_path"):
            web_status = "complete"
            for match in web.search(_photo_bytes(row["photo_path"])):
                client.table("web_image_matches").upsert({"report_id":report_id,**match},
                    on_conflict="report_id,provider,source_image_url").execute()
                web_matches += 1
        client.table("reports").update({"provenance_status":"complete","provenance_web_status":web_status,
            "provenance_checked_at":utcnow().isoformat(),"internal_match_count":len(matches),
            "web_match_count":web_matches}).eq("id",report_id).eq("author_id",author_id).execute()
        return {"status":"complete","internal_matches":len(matches),"web_status":web_status}
    except Exception:
        client.table("reports").update({"provenance_status":"unavailable","provenance_web_status":"unavailable"}).eq("id",report_id).eq("author_id",author_id).execute()
        return {"status":"unavailable"}
