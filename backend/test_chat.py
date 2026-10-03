"""Uji chatbot: jalankan dengan Python virtual environment backend."""

import unittest
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from unittest.mock import patch

from fastapi.testclient import TestClient

from app.main import app
from app.services import chat

NOW = datetime(2026, 9, 19, 12, tzinfo=timezone(timedelta(hours=7)))
REPORTS = [
    {
        "id": "11111111-1111-4111-8111-111111111111",
        "type": "flood", "severity": "tinggi",
        "ai_summary": "Genangan terlihat di jalan.",
        "location_label": "Bandung", "published_at": "2026-09-19T02:00:00Z",
    },
    {
        "id": "22222222-2222-4222-8222-222222222222",
        "type": "fire", "severity": "sedang",
        "ai_summary": "Asap terlihat di satu bangunan.",
        "location_label": "Cimahi", "published_at": "2026-09-18T03:00:00Z",
    },
]


class ReadOnlyTable:
    def __init__(self):
        self.calls = []

    def select(self, fields):
        self.calls.append(("select", fields))
        return self

    def eq(self, key, value):
        self.calls.append(("eq", key, value))
        return self

    def order(self, key, desc=False):
        self.calls.append(("order", key, desc))
        return self

    def range(self, start, end):
        self.calls.append(("range", start, end))
        self.start, self.end = start, end
        return self

    def execute(self):
        return SimpleNamespace(data=REPORTS[self.start:self.end + 1])


class ChatTests(unittest.TestCase):
    def test_count_today_is_computed_not_generated(self):
        result = chat._render(chat.ChatQuery(intent="count", today=True), REPORTS, NOW)
        self.assertIn("1 laporan", result["answer"])
        self.assertIn("belum diverifikasi", result["answer"])
        self.assertEqual(result["sources"], [])
        flood = chat._render(chat.ChatQuery(intent="count", disaster_type="flood"), REPORTS, NOW)
        self.assertIn("1 laporan", flood["answer"])

    def test_latest_uses_real_report_ids_and_summaries(self):
        result = chat._render(chat.ChatQuery(intent="latest"), REPORTS, NOW)
        self.assertEqual([source["id"] for source in result["sources"]], [row["id"] for row in REPORTS])
        self.assertIn(REPORTS[0]["ai_summary"], result["answer"])
        self.assertNotIn("author_id", str(result))

    def test_endpoint_reads_only_public_active_fields(self):
        table = ReadOnlyTable()
        client = SimpleNamespace(table=lambda name: table if name == "reports" else None)
        with patch.object(chat, "get_client", return_value=client), patch.object(
            chat, "_interpret", return_value=chat.ChatQuery(intent="count", today=True)
        ):
            with TestClient(app) as api:
                response = api.post("/api/chat", json={"message": "Berapa laporan hari ini?"})
        self.assertEqual(response.status_code, 200, response.text)
        self.assertIn("1 laporan", response.json()["answer"])
        self.assertEqual(table.calls[0], ("select", "id,type,severity,ai_summary,location_label,published_at"))
        self.assertIn(("eq", "status", "active"), table.calls)
        self.assertIn(("eq", "is_demo", False), table.calls)
        self.assertEqual(set(response.json()), {"answer", "sources"})


if __name__ == "__main__":
    unittest.main()
