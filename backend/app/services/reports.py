"""Public projections, private drafts, and atomic publication."""
import hashlib
import json
from datetime import timedelta
from typing import Any
from uuid import uuid4

from app.core.config import settings
from app.schemas.report import ReportOut
from app.schemas.requests import PublishReportRequest
from app.services.clock import utcnow
from app.services.model import AnalyzeResult
from app.services.rules import haversine_distance_m, help_status_from_counts
from app.services.supabase_client import get_client
from app.services.trust import active_public, visible_on_public_map, observation_counts, notice_radius, moment

_SELECT = "*, false_votes(voter_id), help_votes(value), observations(*), abuse_reports(created_at)"
_PUBLIC_COORD_DECIMALS = 3
PHOTO_BUCKET = "report-photos"


def _to_public(row: dict[str, Any]) -> ReportOut:
    values = [vote["value"] for vote in row.get("help_votes") or []]
    seen, not_seen = values.count("seen"), values.count("not_seen")
    confirmed = row.get("verification_status") == "confirmed" and row.get("closure_reason")!="refuted"
    now = utcnow()
    expired = row["status"]=="active" and moment(row.get("expires_at")) is not None and moment(row["expires_at"])<=now
    status = "closed" if expired else row["status"]
    verified = moment(row.get("verified_at"))
    new_abuse = any(not verified or (moment(item.get("created_at")) and moment(item["created_at"])>verified) for item in row.get("abuse_reports") or [])
    conflict = any(item.get("value")=="not_observed" and not item.get("withdrawn_at") and not item.get("abuse_flag") and
        (not verified or (moment(item.get("received_at")) and moment(item["received_at"])>verified)) for item in row.get("observations") or [])
    return ReportOut(
        id=row["id"], status=status, responder_status=row.get("responder_status", "PENDING"),
        type=row.get("reported_type") or row["type"], severity=row.get("severity"),
        ai_summary=row.get("ai_summary") if row.get("ai_status", "relevant") == "relevant" else None,
        ai_confidence=row.get("ai_confidence"), ai_limitations=row.get("ai_limitations"),
        description=row.get("description") if confirmed else None,
        details=row.get("details_json") if confirmed else None,
        location_label=row.get("location_label") or "Area belum dipilih",
        location_source=row.get("location_source") or "map",
        public_lat=round(row.get("lat") or 0, _PUBLIC_COORD_DECIMALS),
        public_lng=round(row.get("lng") or 0, _PUBLIC_COORD_DECIMALS),
        published_at=row.get("published_at"), created_at=row["created_at"], is_demo=row.get("is_demo", False),
        help_status=help_status_from_counts(seen, not_seen), seen_count=seen, not_seen_count=not_seen,
        false_vote_count=len(row.get("false_votes") or []),
        verification_status=row.get("verification_status", "unconfirmed"),
        closure_reason="expired" if expired else row.get("closure_reason"), ai_status=row.get("ai_status", "not_requested"),
        reported_type=row.get("reported_type"), ai_disaster_type=row.get("ai_disaster_type"),
        observed_at=row.get("observed_at"), observation_time_known=row.get("observation_time_known", False),
        photo_source=row.get("photo_source", "none"), expires_at=row.get("expires_at"),
        verified_at=row.get("verified_at"), public_verification_note=row.get("public_verification_note"),
        version=row.get("version", 1), observation_counts=observation_counts(row, now),
        awareness_radius_m=notice_radius(row) if active_public(row,now) else None,
        review_requested=status!="closed" and (row["status"]=="held" or row.get("verification_status")=="under_review" or bool(new_abuse or conflict)),
        provenance_status=row.get("provenance_status", "not_requested"),
        internal_match_count=row.get("internal_match_count",0),
        web_match_count=row.get("web_match_count",0),
    )


def public_active_query(columns: str = _SELECT):
    query = get_client().table("reports").select(columns).eq("status", "active").gt("expires_at", utcnow().isoformat())
    if settings.demo_showcase:
        # Data simulasi berlabel "DEMO" ikut tampil hanya bila showcase dinyalakan eksplisit.
        return query.or_("and(is_demo.eq.false,responder_status.eq.ACCEPTED),is_demo.eq.true")
    return query.eq("responder_status", "ACCEPTED").eq("is_demo", False)


def list_active(limit: int, cursor: str | None = None, cursor_id: str | None = None) -> list[ReportOut]:
    query = public_active_query().order("published_at", desc=True).order("id", desc=True)
    if cursor:
        # Cursor is an ISO timestamp supplied by the last item, validated in the route.
        query = query.or_(f"published_at.lt.{cursor},and(published_at.eq.{cursor},id.lt.{cursor_id})") if cursor_id else query.lt("published_at",cursor)
    return [_to_public(row) for row in query.limit(limit).execute().data]


def cluster_density_rows(rows: list[dict[str, Any]]) -> list[dict[str, float | int]]:
    groups: list[dict[str, Any]] = []
    for row in sorted(rows, key=lambda item: (item["published_at"], item["id"])):
        group = next((g for g in groups if haversine_distance_m(g["lat"],g["lng"],row["lat"],row["lng"]) <= 50), None)
        if group is None:
            group = {"lat": row["lat"], "lng": row["lng"], "authors": set()}
            groups.append(group)
        group["authors"].add(row["author_id"])
    return [{"lat": round(g["lat"],3),"lng": round(g["lng"],3),"count":len(g["authors"])} for g in groups]


def active_rows(columns: str = _SELECT) -> list[dict[str, Any]]:
    # Supabase caps each page; explicitly paginate for density, nearby and chat.
    rows = []
    start = 0
    while True:
        page = public_active_query(columns).order("id").range(start,start+499).execute().data
        rows.extend(page)
        if len(page) < 500:
            return rows
        start += 500


def notice_candidate_rows(columns: str = _SELECT) -> list[dict[str, Any]]:
    """Active reports can invite nearby verification before responder acceptance."""
    rows: list[dict[str, Any]] = []
    start = 0
    while True:
        page = (get_client().table("reports").select(columns).eq("status", "active")
            .eq("is_demo", False).gt("expires_at", utcnow().isoformat())
            .order("id").range(start, start + 499).execute().data)
        rows.extend(page)
        if len(page) < 500:
            return rows
        start += 500


def list_density_points():
    return cluster_density_rows(active_rows("id,author_id,lat,lng,published_at"))


def list_all_for_monitoring(limit: int = 50, offset: int = 0) -> list[ReportOut]:
    rows = get_client().table("reports").select(_SELECT).in_("status", ["active","held","closed"]).eq("is_demo",False).order("created_at",desc=True).range(offset,offset+limit-1).execute().data
    return [_to_public(row) for row in rows]


def get_row(report_id: str, author_id: str | None = None) -> dict[str, Any] | None:
    query = get_client().table("reports").select(_SELECT).eq("id",report_id)
    if author_id:
        query = query.eq("author_id",author_id)
    rows = query.limit(1).execute().data
    return rows[0] if rows else None


def get_active(report_id: str) -> ReportOut | None:
    row = get_row(report_id)
    # Closed reports expose a safe correction/closure, but never their original raw photo.
    if not row or (row.get("is_demo") and not settings.demo_showcase) or row["status"] not in ("active","closed"):
        return None
    if row["status"] == "active" and not active_public({**row,"is_demo":False},utcnow()):
        row = {**row,"status":"closed","closure_reason":"expired"}
    return _to_public(row)


def list_by_author(author_id: str) -> list[ReportOut]:
    rows = get_client().table("reports").select(_SELECT).eq("author_id",author_id).in_("status",["active","held","closed"]).order("created_at",desc=True).limit(100).execute().data
    return [_to_public(row) for row in rows]


def private_detail(row: dict[str, Any], moderator: bool = False) -> dict[str, Any]:
    # No original photo is ever included in public projections.
    signed = None
    photo_error = False
    if row.get("photo_path"):
        try:
            signed = get_client().storage.from_(PHOTO_BUCKET).create_signed_url(row["photo_path"],60).get("signedURL")
        except Exception:
            photo_error = True
    result = {
        "report": _to_public(row).model_dump(mode="json"), "description": row.get("description"),
        "risk_flags": row.get("risk_flags",[]), "photo_url": signed, "photo_unavailable": photo_error,
        "own_observation": None,
    }
    if moderator:
        internal=[]
        matches=get_client().table("report_matches").select("matched_report_id,match_method,score,hamming_distance,created_at").eq("report_id",row["id"]).order("score",desc=True).limit(settings.provenance_result_limit).execute().data
        for match in matches:
            compared=get_row(match["matched_report_id"])
            if not compared:continue
            compared_photo=None
            if compared.get("photo_path"):
                try:compared_photo=get_client().storage.from_(PHOTO_BUCKET).create_signed_url(compared["photo_path"],60).get("signedURL")
                except Exception:pass
            distance=None
            if all(value is not None for value in (row.get("lat"),row.get("lng"),compared.get("lat"),compared.get("lng"))):
                distance=round(haversine_distance_m(row["lat"],row["lng"],compared["lat"],compared["lng"]))
            internal.append({**match,"type":compared.get("reported_type") or compared.get("type"),"status":compared.get("status"),
                "responder_status":compared.get("responder_status"),"location_label":compared.get("location_label"),
                "observed_at":compared.get("observed_at"),"published_at":compared.get("published_at"),
                "photo_url":compared_photo,"distance_m":distance})
        result.update({
            "lat":row.get("lat"),"lng":row.get("lng"),"verification_note":row.get("verification_note"),
            "observations":[{k:v for k,v in o.items() if k not in ("lat","lng")} for o in row.get("observations") or []],
            "abuse_reports":get_client().table("abuse_reports").select("category,reason,created_at").eq("report_id",row["id"]).execute().data,
            "audit":get_client().table("moderation_events").select("*").eq("report_id",row["id"]).order("created_at").execute().data,
            "outbox":get_client().table("notification_outbox").select("id,state,channel,attempts,last_error_code,created_at").eq("report_id",row["id"]).execute().data,
            "internal_matches":internal,
            "web_matches":get_client().table("web_image_matches").select("provider,source_page_url,source_image_url,title,published_at,match_type,score,created_at").eq("report_id",row["id"]).order("score",desc=True).limit(settings.provenance_result_limit).execute().data,
            "incident":get_client().table("report_incidents").select("incident_id,match_basis,created_at").eq("report_id",row["id"]).limit(1).execute().data,
        })
    return result


def create_raw_draft(author_id: str, photo: bytes | None = None, mime: str = "image/jpeg", sha256: str | None = None, phash: str | None = None, client_id: str | None = None) -> str:
    # client_id enables safe retry after a lost upload response; ownership is always checked.
    report_id = client_id or str(uuid4())
    existing = get_row(report_id)
    if existing:
        if existing["author_id"] != author_id:
            raise ValueError("idempotency_conflict")
        return report_id
    path = f"{author_id}/{report_id}.jpg" if photo else None
    client = get_client()
    if photo:
        client.storage.from_(PHOTO_BUCKET).upload(path,photo,{"content-type":mime})
    row = {
        "id":report_id,"author_id":author_id,"status":"draft","ai_status":"not_requested",
        "photo_path":path,"photo_sha256":sha256,"photo_phash":phash,"is_demo":settings.demo_mode,
    }
    try:
        client.table("reports").insert(row).execute()
    except Exception:
        # A concurrent retry may have won the insert. Do not remove its referenced photo.
        winner = get_row(report_id,author_id)
        if winner:
            return report_id
        if path:
            try:
                client.storage.from_(PHOTO_BUCKET).remove([path])
            except Exception:
                pass
        raise
    return report_id


def create_draft(author_id: str, result: AnalyzeResult, photo: bytes, mime: str) -> str:
    # Legacy compatibility for callers outside the API.
    report_id = create_raw_draft(author_id,photo,mime)
    save_analysis(report_id,author_id,result)
    return report_id


def save_analysis(report_id: str, author_id: str, result: AnalyzeResult | None) -> dict[str, Any]:
    relevant = result is not None and result.validity == "relevant" and result.disaster_type in ("fire","flood","landslide") and result.severity in ("rendah","sedang","tinggi","kritis") and bool(result.summary_id)
    status = "relevant" if relevant else ("uncertain" if result and result.validity=="relevant" else result.validity if result else "unavailable")
    patch = {
        "ai_status":status,"ai_disaster_type":result.disaster_type if relevant else None,
        "type":result.disaster_type if relevant else None,"severity":result.severity if relevant else None,
        "ai_summary":result.summary_id[:240] if relevant else None,
        "ai_reason":result.reason_id[:120] if result else None,"analysis_lease_until":None,
        "ai_confidence":result.confidence if result else None,
        "ai_limitations":result.limitations[:160] if result and result.limitations else None,
    }
    if result:
        patch["risk_flags"] = [f"ai_suspect_{flag}" for flag in result.authenticity_flags]
    rows = get_client().table("reports").update(patch).eq("id",report_id).eq("author_id",author_id).eq("status","draft").execute().data
    if not rows:
        raise ValueError("report_not_draft")
    return {"draft_id":report_id,"ai_status":status,"validity":status if status in ("relevant","invalid","uncertain") else "uncertain",
            "type":patch["ai_disaster_type"],"severity":patch["severity"],"summary":patch["ai_summary"],
            "confidence":patch["ai_confidence"],"limitations":patch["ai_limitations"],
            "reason":patch["ai_reason"] or "Analisis belum tersedia; draft tersimpan."}


def publish_draft(author_id: str, req: PublishReportRequest, key: str | None = None) -> tuple[dict[str, Any], bool]:
    if req.location_source.value == "demo" and not settings.demo_mode:
        raise ValueError("demo_location_forbidden")
    payload = req.model_dump(mode="json")
    digest = hashlib.sha256(json.dumps(payload,sort_keys=True,separators=(",",":")).encode()).hexdigest()
    result = rpc("submit_report",{
        "p_user":author_id,"p_draft":str(req.draft_id),"p_payload":payload,
        "p_key":key or str(req.draft_id),"p_hash":digest,"p_ttl":settings.report_active_ttl_hours,
        "p_triage":bool(settings.tele_api and settings.tele_chat_id),"p_push":settings.push_enabled,
    })
    try:
        get_client().rpc("assign_incident",{"p_report":result["report"]["id"]}).execute()
    except Exception:
        # Grouping enriches context but must not turn a persisted emergency report into a failed submission.
        pass
    return result["report"], result["already_published"]


def _own_pending_query(report_id: str, author_id: str, query):
    # Satu query atomik: hanya milik pelapor, bukan demo, dan belum diterima responder.
    return query.eq("id",report_id).eq("author_id",author_id).eq("responder_status","PENDING").eq("is_demo",False).in_("status",["active","held"])


def edit_own(report_id: str, author_id: str, changes: dict[str, Any]) -> dict[str, Any] | None:
    patch = {k:v for k,v in changes.items() if v is not None or k=="description"}
    if "reported_type" in patch:
        patch["type"] = patch["reported_type"]
        patch["details_json"] = None  # detail lama milik jenis sebelumnya
    if not patch:
        return get_row(report_id,author_id)
    rows = _own_pending_query(report_id,author_id,get_client().table("reports").update(patch)).execute().data
    return get_row(report_id,author_id) if rows else None  # ulang baca agar relasi (votes, dll.) ikut


def delete_own(report_id: str, author_id: str) -> bool:
    client = get_client()
    row = get_row(report_id,author_id)
    rows = _own_pending_query(report_id,author_id,client.table("reports").delete()).execute().data
    if rows and row and row.get("photo_path"):
        try:
            client.storage.from_(PHOTO_BUCKET).remove([row["photo_path"]])
        except Exception:
            pass  # file yatim dibersihkan job retensi; baris laporan sudah hilang
    return bool(rows)


def active_high_risk_candidates() -> list[dict[str, Any]]:
    return notice_candidate_rows()


class VoteError(Exception):
    def __init__(self,code: str):
        self.code=code
        super().__init__(code)


def rpc(function: str, params: dict[str, Any]):
    try:
        return get_client().rpc(function,params).execute().data
    except Exception as error:
        code = getattr(error,"message","unknown_error")
        raise VoteError(code) from error


def _call_vote_rpc(function_name: str, params: dict[str, Any]) -> dict[str, Any]:
    result=rpc(function_name,params)
    return result[0] if isinstance(result,list) else result


def cast_false_vote(report_id: str,voter_id: str,reason: str | None):
    row=_call_vote_rpc("cast_false_vote",{"p_report_id":report_id,"p_voter_id":voter_id,"p_reason":reason})
    return {"false_vote_count":row["false_vote_count"],"status":row["result_status"]}


def cast_help_vote(report_id: str,voter_id: str,value: str):
    row=_call_vote_rpc("cast_help_vote",{"p_report_id":report_id,"p_voter_id":voter_id,"p_value":value})
    return {"seen_count":row["seen_count"],"not_seen_count":row["not_seen_count"],"help_status":help_status_from_counts(row["seen_count"],row["not_seen_count"]).value}
