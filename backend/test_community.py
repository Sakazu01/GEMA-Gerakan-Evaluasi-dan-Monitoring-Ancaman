import unittest
import asyncio
from datetime import datetime,timedelta,timezone
from io import BytesIO
from types import SimpleNamespace
from unittest.mock import MagicMock,patch

from fastapi import FastAPI,HTTPException,Request,UploadFile
from fastapi.testclient import TestClient
from starlette.requests import Request as StarletteRequest
from supabase_auth.errors import AuthApiError
from PIL import Image

from app.main import app
from app.deps.auth import require_user,require_moderator
from app.core.config import settings
from app.middleware import BodyLimitMiddleware
from app.schemas.requests import ObservationRequest
from app.services import reports,trust
from app.services.media import read_photo
from app.services.quota import enforce_quota,enforce_read_quota

NOW=datetime(2026,10,3,7,tzinfo=timezone.utc)
USER="11111111-1111-4111-8111-111111111111"
REPORT="22222222-2222-4222-8222-222222222222"

def row(**changes):
    return {"id":REPORT,"author_id":USER,"status":"active","type":"fire","reported_type":"fire",
        "severity":"tinggi","ai_status":"relevant","ai_summary":"Terlihat asap.","location_label":"Area tes",
        "location_source":"device","lat":-6.9,"lng":107.6,"published_at":NOW.isoformat(),"created_at":NOW.isoformat(),
        "observed_at":NOW.isoformat(),"observation_time_known":True,"expires_at":(NOW+timedelta(hours=12)).isoformat(),
        "verification_status":"unconfirmed","is_demo":False,"observations":[],**changes}

class CommunityTests(unittest.TestCase):
    def setUp(self):
        self.worker_patch=patch.object(settings,"worker_enabled",False)
        self.worker_patch.start()

    def tearDown(self):
        self.worker_patch.stop()
        app.dependency_overrides.clear()

    def test_forged_uuid_is_not_authentication(self):
        with patch("app.deps.auth.get_client") as db:
            response=TestClient(app).get("/api/my-reports",headers={"Authorization":f"Bearer {USER}"})
        self.assertEqual(response.status_code,401)
        db.assert_not_called()

    def test_provider_rejection_is_401(self):
        database=MagicMock()
        database.auth.get_user.side_effect=AuthApiError("Invalid JWT",401,"bad_jwt")
        with patch("app.deps.auth.get_client",return_value=database):
            response=TestClient(app).get("/api/my-reports",headers={"Authorization":"Bearer bad.signature.token"})
        self.assertEqual(response.status_code,401)
        database.auth.get_user.assert_called_once_with("bad.signature.token")

    def test_moderator_requires_permanent_server_role(self):
        request=StarletteRequest({"type":"http","headers":[]})
        request.state.auth_user=SimpleNamespace(is_anonymous=True)
        with self.assertRaises(HTTPException) as err:require_moderator(request,USER)
        self.assertEqual(err.exception.status_code,403)
        request.state.auth_user=SimpleNamespace(is_anonymous=False)
        client=MagicMock()
        client.table.return_value.select.return_value.eq.return_value.eq.return_value.execute.return_value.data=[]
        with patch("app.deps.auth.get_client",return_value=client),self.assertRaises(HTTPException) as err:require_moderator(request,USER)
        self.assertEqual(err.exception.status_code,403)

    def test_freshness_and_demo_filter_shared_policy(self):
        self.assertTrue(trust.active_public(row(),NOW))
        for changes in ({"is_demo":True},{"status":"held"},{"expires_at":NOW.isoformat()},{"expires_at":None}):
            self.assertFalse(trust.active_public(row(**changes),NOW))
        self.assertEqual(trust.notice_radius(row()),500)
        self.assertIsNone(trust.notice_radius(row(verification_status="under_review")))
        self.assertEqual(trust.notice_radius(row(verification_status="confirmed",awareness_radius_override_m=1200)),1200)

    def test_observation_counts_respect_source_freshness_and_owner(self):
        base={"user_id":"other","source":"direct","value":"seen","observed_at":NOW.isoformat(),"received_at":NOW.isoformat(),"proximity_eligible":True}
        observations=[base,{**base,"user_id":"other2","value":"not_observed"},{**base,"source":"secondhand"},
            {**base,"value":"unsure","observed_at":None},{**base,"user_id":USER},{**base,"withdrawn_at":NOW.isoformat()},
            {**base,"observed_at":(NOW-timedelta(hours=1)).isoformat()},{**base,"proximity_eligible":False}]
        self.assertEqual(trust.observation_counts(row(observations=observations),NOW),{"direct_seen_nearby":1,"direct_not_observed_nearby":1,"secondhand":1,"unsure":1})

    def test_negative_observation_requires_context(self):
        with self.assertRaises(ValueError):ObservationRequest(value="not_observed",source="direct",observed_at=NOW)
        body=ObservationRequest(value="unsure",source="direct",observed_at=NOW)
        self.assertIsNone(body.source)
        self.assertIsNone(body.observed_at)

    def test_secondhand_never_stores_device_coordinates_or_claims_direct_absence(self):
        location={"lat":-6.9,"lng":107.6,"accuracy_m":25,"measured_at":NOW}
        body=ObservationRequest(value="seen",source="secondhand",observed_at=NOW,observer_location=location,at_report_location=True)
        self.assertIsNone(body.observer_location)
        self.assertIsNone(body.at_report_location)
        with self.assertRaises(ValueError):
            ObservationRequest(value="not_observed",source="secondhand",observed_at=NOW,at_report_location=True,note="Warga lain tidak melihat asap.")

    def test_nearby_independent_of_feed_and_error_not_empty(self):
        with patch("app.api.nearby.reports_service.active_high_risk_candidates",return_value=[row()]),patch("app.api.nearby.utcnow",return_value=NOW),patch("app.api.nearby.enforce_read_quota"):
            response=TestClient(app).post("/api/nearby",json={"lat":-6.9,"lng":107.6,"location_mode":"area"})
        self.assertEqual(response.status_code,200)
        item=response.json()["items"][0]
        self.assertEqual(item["report"]["id"],REPORT)
        self.assertNotIn("author_id",item["report"])
        self.assertNotIn("photo_path",item["report"])

    def test_location_cannot_be_stale_or_imprecise(self):
        location={"lat":-6.9,"lng":107.6,"accuracy_m":35,"measured_at":NOW.isoformat()}
        self.assertTrue(trust.proximity_eligible(row(),location,NOW))
        self.assertFalse(trust.proximity_eligible(row(),location,NOW+timedelta(minutes=11)))
        self.assertFalse(trust.proximity_eligible(row(),location|{"accuracy_m":200},NOW))

    def test_quota_failure_is_fail_closed_and_hides_network(self):
        request=StarletteRequest({"type":"http","headers":[],"client":("192.0.2.1",123)})
        client=MagicMock()
        client.rpc.return_value.execute.return_value.data={"allowed":False,"retry_after_seconds":10}
        with patch("app.services.quota.get_client",return_value=client),patch.object(settings,"rate_limit_salt","test-salt"),self.assertRaises(HTTPException) as err:
            enforce_quota(request,USER,"submit")
        self.assertEqual(err.exception.status_code,429)
        self.assertNotIn("192.0.2.1",str(client.rpc.call_args))

    def test_read_quota_failure_keeps_public_read_access(self):
        request=StarletteRequest({"type":"http","headers":[],"client":("192.0.2.1",123)})
        database=MagicMock();database.rpc.side_effect=RuntimeError("store unavailable")
        with patch("app.services.quota.get_client",return_value=database),patch.object(settings,"rate_limit_salt","test"):
            enforce_read_quota(request)

    def test_media_decode_strips_metadata_and_rejects_fake_mime(self):
        buffer=BytesIO();Image.new("RGB",(10,10),(255,0,0)).save(buffer,"PNG")
        upload=UploadFile(BytesIO(buffer.getvalue()),filename="photo.png",headers={"content-type":"image/png"})
        data,mime,sha,phash=read_photo(upload)
        self.assertEqual(mime,"image/jpeg")
        self.assertEqual(len(sha),64);self.assertEqual(len(phash),16)
        self.assertTrue(data.startswith(b"\xff\xd8"))
        fake=UploadFile(BytesIO(b"not a photo"),filename="x.jpg",headers={"content-type":"image/jpeg"})
        with self.assertRaises(HTTPException):read_photo(fake)

    def test_upload_is_bounded_before_decode(self):
        stream=BytesIO(b"x"*1025)
        with patch.object(settings,"max_photo_bytes",1024),self.assertRaises(HTTPException) as err:
            read_photo(UploadFile(stream,headers={"content-type":"image/jpeg"}))
        self.assertEqual(err.exception.status_code,413)

    def test_ai_failure_preserves_existing_draft(self):
        from app.api.analyze import analyze_draft
        database=MagicMock();database.rpc.return_value.execute.return_value.data=True
        with patch("app.api.analyze.reports_service.get_row",return_value=row(status="draft",ai_status="not_requested",photo_path="private.jpg")),patch("app.api.analyze.get_client",return_value=database),patch("app.api.analyze.enforce_model_budget"),patch("app.api.analyze.model_service.analyze_photo",side_effect=TimeoutError()),patch("app.api.analyze.reports_service.save_analysis",return_value={"draft_id":REPORT,"ai_status":"unavailable"}) as save:
            self.assertEqual(analyze_draft(REPORT,USER)["draft_id"],REPORT)
        save.assert_called_once_with(REPORT,USER,None)

    def test_public_projection_never_leaks_observer_location(self):
        private=row(observations=[{"user_id":"private","lat":-6.91234,"lng":107.62345,"value":"unsure","received_at":NOW.isoformat()}],photo_path="private.jpg",verification_note="private phone")
        public=reports._to_public(private).model_dump()
        for field in ("author_id","observations","photo_path","verification_note","lat","lng"):self.assertNotIn(field,public)

    def test_confirmed_complaint_requests_review_without_revoking_confirmation(self):
        private=row(verification_status="confirmed",verified_at=(NOW-timedelta(minutes=5)).isoformat(),abuse_reports=[{"created_at":NOW.isoformat()}])
        with patch.object(reports,"utcnow",return_value=NOW):public=reports._to_public(private)
        self.assertTrue(public.review_requested);self.assertEqual(public.verification_status,"confirmed")
        with patch.object(reports,"utcnow",return_value=NOW+timedelta(hours=13)):expired=reports._to_public(private)
        self.assertEqual(expired.status,"closed");self.assertEqual(expired.closure_reason,"expired");self.assertFalse(expired.review_requested)

    def test_request_body_limit(self):
        small=FastAPI();small.add_middleware(BodyLimitMiddleware,limit=100)
        @small.post("/read")
        async def read(request:Request):return {"size":len(await request.body())}
        self.assertEqual(TestClient(small).post("/read",content=b"x"*101).status_code,413)

    def test_chunked_limit_without_content_length(self):
        sent=[];called=[]
        messages=iter([{"type":"http.request","body":b"123","more_body":True},{"type":"http.request","body":b"45","more_body":False}])
        async def receive():return next(messages)
        async def send(message):sent.append(message)
        async def downstream(scope,receive,send):called.append(True)
        asyncio.run(BodyLimitMiddleware(downstream,4)({"type":"http","method":"POST","headers":[]},receive,send))
        self.assertEqual(sent[0]["status"],413);self.assertFalse(called)

    def test_push_endpoint_does_not_allow_local_or_malformed_urls(self):
        from app.api.push import valid_endpoint
        with patch.object(settings,"push_allowed_hosts","fcm.googleapis.com"):
            for endpoint in ("http://fcm.googleapis.com/test","https://127.0.0.1/test","https://fcm.googleapis.com:bad/test","https://fcm.googleapis.com@localhost/test","https://fcm.googleapis.com:443#fragment"):
                self.assertFalse(valid_endpoint(endpoint))
            self.assertTrue(valid_endpoint("https://fcm.googleapis.com/test"))

if __name__=="__main__":unittest.main()
