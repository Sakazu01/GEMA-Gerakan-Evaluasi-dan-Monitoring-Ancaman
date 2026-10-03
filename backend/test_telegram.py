"""No network messages: provider failures and identity gates are mocked."""
import unittest
from io import BytesIO
from unittest.mock import MagicMock,patch
from fastapi.testclient import TestClient
from app.main import app
from app.core.config import settings
from app.services import telegram
from app.services.worker import deliver_telegram

REPORT_ID="b6e1f2a0-0000-4000-8000-000000000001"
class TelegramTests(unittest.TestCase):
    def test_provider_request_and_safe_message(self):
        response=BytesIO(b'{"ok":true,"result":{"chat":{"id":-100123},"message_id":42}}')
        with patch.object(settings,"tele_api","fake-token"),patch("app.services.telegram.urlopen",return_value=response) as call:
            self.assertEqual(telegram._call("sendMessage",{"text":"test"})["message_id"],42)
        self.assertEqual(call.call_args.args[0].get_method(),"POST")
        text=telegram._message({"id":REPORT_ID,"type":"fire","severity":None,"location_label":"Test","ai_summary":None,"responder_status":"PENDING"})
        self.assertIn("belum tersedia",text)
        self.assertNotIn("menuju",text.casefold())

    def test_delivery_retry_vs_unknown(self):
        client=MagicMock()
        for ambiguous,state in [(False,"retry"),(True,"unknown")]:
            with patch("app.services.worker.get_client",return_value=client),patch("app.services.worker.telegram.notify_report",side_effect=telegram.TelegramError("offline",ambiguous)):
                deliver_telegram({"id":"job","report_id":REPORT_ID,"attempts":1})
            self.assertEqual(client.table.return_value.update.call_args.args[0]["state"],state)
        with patch("app.services.worker.get_client",return_value=client),patch("app.services.worker.telegram.notify_report",side_effect=RuntimeError("write failed after send")):
            deliver_telegram({"id":"job","report_id":REPORT_ID,"attempts":1})
        self.assertEqual(client.table.return_value.update.call_args.args[0]["state"],"unknown")

    def test_message_keeps_reporter_type_separate_from_ai_type(self):
        message=telegram._message({"id":REPORT_ID,"type":"flood","reported_type":"fire","location_label":"Area tes"})
        self.assertIn("Jenis menurut pelapor: Kebakaran",message)
        self.assertNotIn("Jenis menurut pelapor: Banjir",message)

    def test_unregistered_callback_cannot_accept(self):
        update={"callback_query":{"id":"c","data":f"accept_report:{REPORT_ID}","message":{"chat":{"id":-100123},"message_id":42},"from":{"id":99}}}
        database=MagicMock()
        database.table.return_value.select.return_value.eq.return_value.limit.return_value.execute.return_value.data=[]
        with patch.object(settings,"telegram_webhook_secret","secret"),patch.object(settings,"tele_chat_id","-100123"),patch.object(settings,"telegram_responder_ids",""),patch("app.api.telegram.get_client",return_value=database),patch("app.api.telegram.telegram_service.answer_callback") as answer:
            client=TestClient(app)
            self.assertEqual(client.post("/api/telegram/webhook",json=update).status_code,403)
            self.assertEqual(client.post("/api/telegram/webhook",json=update,headers={"X-Telegram-Bot-Api-Secret-Token":"secret"}).status_code,200)
            database.rpc.assert_not_called()
            self.assertIn("tidak terdaftar",answer.call_args.args[1])

    def test_authorized_callback_uses_atomic_audited_rpc(self):
        update={"callback_query":{"id":"c","data":f"accept_report:{REPORT_ID}","message":{"chat":{"id":-100123},"message_id":42},"from":{"id":99}}}
        database=MagicMock()
        database.table.return_value.select.return_value.eq.return_value.limit.return_value.execute.return_value.data=[{"user_id":"33333333-3333-4333-8333-333333333333","label":"Responder tim"}]
        database.rpc.return_value.execute.return_value.data={"report":{"id":REPORT_ID},"changed":True}
        with patch.object(settings,"telegram_webhook_secret","secret"),patch.object(settings,"tele_chat_id","-100123"),patch.object(settings,"telegram_responder_ids",""),patch("app.api.telegram.get_client",return_value=database),patch("app.api.telegram.telegram_service.answer_callback"),patch("app.api.telegram.telegram_service.edit_accepted_message"):
            response=TestClient(app).post("/api/telegram/webhook",json=update,headers={"X-Telegram-Bot-Api-Secret-Token":"secret"})
        self.assertEqual(response.status_code,200)
        self.assertEqual(database.rpc.call_args.args[0],"accept_responder_report")
        self.assertEqual(database.rpc.call_args.args[1]["p_actor"],"33333333-3333-4333-8333-333333333333")

if __name__=="__main__":
    unittest.main()
