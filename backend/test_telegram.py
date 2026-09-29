"""Test Telegram tanpa request jaringan atau database sungguhan.

Jalankan dari backend/: .venv/Scripts/python.exe test_telegram.py
"""

from io import BytesIO
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

from fastapi.testclient import TestClient

from app.api.reports import publish_report
from app.main import app
from app.schemas.requests import PublishReportRequest
from app.services import telegram
from app.core.config import settings

REPORT_ID = "b6e1f2a0-0000-4000-8000-000000000001"


def report_row():
    return {
        "id": REPORT_ID, "status": "active", "responder_status": "PENDING",
        "type": "fire", "severity": "tinggi",
        "location_label": "Sekitar Jl. Melati", "published_at": "2026-09-18T03:12:00Z",
        "ai_summary": "Api terlihat di bangunan.", "description": "Asap semakin tebal.",
        "telegram_chat_id": "-100123", "telegram_message_id": 42,
    }


def test_api_call_and_notification():
    response = BytesIO(b'{"ok":true,"result":{"chat":{"id":-100123},"message_id":42}}')
    with patch.object(settings, "tele_api", "fake-token"), patch("app.services.telegram.urlopen", return_value=response) as request:
        result = telegram._call("sendMessage", {"chat_id": "-100123", "text": "Tes"})
    assert result["message_id"] == 42
    assert request.call_args.args[0].get_method() == "POST"

    client = MagicMock()
    pending = {**report_row(), "telegram_message_id": None}
    client.table.return_value.select.return_value.eq.return_value.limit.return_value.execute.return_value.data = [pending]
    with patch.object(settings, "tele_chat_id", "-100123"), patch("app.services.telegram.get_client", return_value=client), patch("app.services.telegram._call", return_value=result) as send:
        telegram.notify_report(REPORT_ID)
    method, payload = send.call_args.args
    assert method == "sendMessage"
    assert "belum diverifikasi" in payload["text"]
    assert "Api terlihat di bangunan." in payload["text"]
    assert payload["reply_markup"]["inline_keyboard"][0][0]["callback_data"] == f"accept_report:{REPORT_ID}"
    client.table.return_value.update.assert_called_once_with({
        "telegram_chat_id": "-100123", "telegram_message_id": 42,
    })


def test_publish_stays_successful_when_telegram_fails():
    req = PublishReportRequest(
        draft_id=REPORT_ID, lat=-6.91, lng=107.61,
        location_source="demo", location_label="Jl. Melati",
    )
    with patch("app.api.reports.reports_service.publish_draft", return_value=(report_row(), False)), patch(
        "app.api.reports.telegram_service.notify_report", side_effect=telegram.TelegramError("offline")
    ) as notify:
        result = publish_report(req, user_id="owner")
    assert result["id"] == REPORT_ID
    assert result["status"] == "active"
    notify.assert_called_once_with(REPORT_ID)

    with patch("app.api.reports.reports_service.publish_draft", return_value=(report_row(), True)), patch(
        "app.api.reports.telegram_service.notify_report"
    ) as notify:
        assert publish_report(req, user_id="owner")["already_published"] is True
    notify.assert_not_called()


def test_acceptance_is_conditional_and_duplicate_is_read_only():
    row = {**report_row(), "responder_status": "ACCEPTED", "accepted_at": "2026-09-18T04:00:00Z"}
    table = MagicMock()
    table.update.return_value = table
    table.select.return_value = table
    table.eq.return_value = table
    table.limit.return_value = table
    table.execute.side_effect = [
        SimpleNamespace(data=[row]),
        SimpleNamespace(data=[]),
        SimpleNamespace(data=[row]),
    ]
    client = MagicMock()
    client.table.return_value = table
    with patch("app.services.telegram.get_client", return_value=client):
        first, changed = telegram.accept_report(REPORT_ID, "-100123", 42, "Petugas 1")
        duplicate, changed_again = telegram.accept_report(REPORT_ID, "-100123", 42, "Petugas 2")
    assert changed is True and first["responder_status"] == "ACCEPTED"
    assert changed_again is False and duplicate["accepted_at"] == first["accepted_at"]
    filters = [call.args for call in table.eq.call_args_list]
    for required in (("responder_status", "PENDING"), ("telegram_chat_id", "-100123"), ("telegram_message_id", 42)):
        assert required in filters
    patch_data = table.update.call_args_list[0].args[0]
    assert patch_data["accepted_by"] == "Petugas 1"
    assert patch_data["accepted_at"]


def test_webhook_secret_validation_and_callback():
    update = {"callback_query": {
        "id": "callback-1", "data": f"accept_report:{REPORT_ID}",
        "message": {"chat": {"id": -100123}, "message_id": 42},
        "from": {"id": 99, "first_name": "Ani"},
    }}
    row = {**report_row(), "responder_status": "ACCEPTED",
           "accepted_at": "2026-09-18T04:00:00Z", "accepted_by": "Ani (ID 99)"}
    client = TestClient(app)
    with patch.object(settings, "telegram_webhook_secret", "test-secret"), patch.object(
        settings, "tele_chat_id", "-100123"
    ), patch("app.api.telegram.telegram_service.accept_report", return_value=(row, True)) as accept, patch(
        "app.api.telegram.telegram_service.edit_accepted_message"
    ) as edit, patch("app.api.telegram.telegram_service.answer_callback") as answer:
        assert client.post("/api/telegram/webhook", json=update).status_code == 403
        assert client.post("/api/telegram/webhook", json=update, headers={
            "X-Telegram-Bot-Api-Secret-Token": "test-secret",
        }).status_code == 200
        accept.assert_called_once_with(REPORT_ID, "-100123", 42, "Ani (ID 99)")
        edit.assert_called_once_with(row)
        answer.assert_called_once_with("callback-1", "Laporan diterima")

        update["callback_query"]["message"]["chat"]["id"] = -100999
        assert client.post("/api/telegram/webhook", json=update, headers={
            "X-Telegram-Bot-Api-Secret-Token": "test-secret",
        }).status_code == 200
        assert accept.call_count == 1
        assert answer.call_args.args[1] == "Pesan bukan dari grup responder"


def test_accepted_message_has_no_button():
    row = {**report_row(), "responder_status": "ACCEPTED",
           "accepted_at": "2026-09-18T04:00:00Z", "accepted_by": "Ani (ID 99)"}
    with patch("app.services.telegram._call") as edit:
        telegram.edit_accepted_message(row)
    method, payload = edit.call_args.args
    assert method == "editMessageText"
    assert "LAPORAN DITERIMA" in payload["text"]
    assert "Ani (ID 99)" in payload["text"]
    assert payload["reply_markup"] == {"inline_keyboard": []}


def test_public_projection_exposes_status_only():
    from app.services.reports import _to_public

    row = {
        **report_row(), "responder_status": "ACCEPTED",
        "accepted_at": "2026-09-18T04:00:00Z", "accepted_by": "Ani (ID 99)",
        "created_at": "2026-09-18T03:10:00Z", "location_source": "demo",
        "lat": -6.91, "lng": 107.61, "is_demo": True,
    }
    public = _to_public(row).model_dump()
    assert public["responder_status"] == "ACCEPTED"
    for private in ("accepted_by", "accepted_at", "telegram_chat_id", "telegram_message_id"):
        assert private not in public


if __name__ == "__main__":
    test_api_call_and_notification()
    test_publish_stays_successful_when_telegram_fails()
    test_acceptance_is_conditional_and_duplicate_is_read_only()
    test_webhook_secret_validation_and_callback()
    test_accepted_message_has_no_button()
    test_public_projection_exposes_status_only()
    print("ok")
