import unittest
from datetime import datetime, timedelta
from unittest.mock import patch

from scripts import seed_demo
from app.services.trust import active_public


class DemoSeedTests(unittest.TestCase):
    def test_fixture_matches_current_schema_and_stays_out_of_public_data(self):
        now = datetime.fromisoformat(seed_demo.REPORTS[0]["published_at"]) + timedelta(hours=2, minutes=1)
        with patch.object(seed_demo.settings, "report_active_ttl_hours", 12):
            rows = seed_demo.build_demo_rows(now)
        self.assertEqual(len(rows), len(seed_demo.REPORTS))
        self.assertEqual({row["status"] for row in rows}, {"active", "held", "closed"})
        for row in rows:
            self.assertFalse(active_public(row, now))
            self.assertTrue(row["is_demo"])
            self.assertTrue(row["observation_time_known"])
            self.assertTrue(row["location_label"].startswith("DEMO"))
            self.assertEqual(row["ai_status"], "not_requested")
            self.assertIsNone(row["photo_path"])
            self.assertIsNone(row["ai_summary"])
            self.assertIsNone(row["severity"])
            self.assertNotEqual(row["verification_status"], "confirmed")
            self.assertEqual(row["closure_reason"], "expired" if row["status"] == "closed" else None)
            if row["status"] == "active":
                self.assertGreater(datetime.fromisoformat(row["expires_at"]), now)

    def test_showcase_rows_are_active_accepted_with_no_fake_ai_or_photo(self):
        now = datetime(2026, 10, 4, 12, 0).astimezone()
        with patch.object(seed_demo.settings, "report_active_ttl_hours", 12):
            rows = seed_demo.build_showcase_rows(now)
        self.assertGreaterEqual(len(rows), 150)
        self.assertEqual(len({row["id"] for row in rows}), len(rows))
        for row in rows:
            self.assertTrue(row["is_demo"])
            self.assertEqual((row["status"], row["responder_status"]), ("active", "ACCEPTED"))
            self.assertGreater(datetime.fromisoformat(row["expires_at"]), now)
            self.assertIsNone(row["photo_path"])
            self.assertIsNone(row["severity"])
            self.assertIsNone(row["ai_summary"])
            self.assertEqual(row["ai_status"], "not_requested")

    def test_seed_requires_explicit_demo_mode_before_any_database_action(self):
        with patch.object(seed_demo.settings, "demo_mode", False), patch.object(seed_demo, "get_client") as get_client:
            with self.assertRaises(SystemExit):
                seed_demo.main()
        get_client.assert_not_called()


if __name__ == "__main__":
    unittest.main()
