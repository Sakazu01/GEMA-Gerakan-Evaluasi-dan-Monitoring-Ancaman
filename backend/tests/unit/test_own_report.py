import unittest
from unittest.mock import MagicMock, patch

from app.services import reports


def client_returning(rows):
    client = MagicMock()
    chain = client.table.return_value
    for name in ("update", "delete", "eq", "in_"):
        getattr(chain, name).return_value = chain
    chain.execute.return_value.data = rows
    return client, chain


class OwnReportTest(unittest.TestCase):
    def test_edit_only_pending_own_and_resets_details_on_type_change(self):
        client, chain = client_returning([{"id": "r"}])
        with patch.object(reports, "get_client", return_value=client), patch.object(reports, "get_row", return_value={"id": "r"}):
            self.assertEqual(reports.edit_own("r", "u", {"reported_type": "fire", "location_label": None}), {"id": "r"})
        chain.update.assert_called_once_with({"reported_type": "fire", "type": "fire", "details_json": None})
        for column, value in (("author_id", "u"), ("responder_status", "PENDING"), ("is_demo", False)):
            chain.eq.assert_any_call(column, value)

    def test_edit_after_accept_is_rejected(self):
        client, _ = client_returning([])
        with patch.object(reports, "get_client", return_value=client):
            self.assertIsNone(reports.edit_own("r", "u", {"description": "x"}))

    def test_delete_removes_photo_only_when_row_deleted(self):
        client, _ = client_returning([{"id": "r"}])
        with patch.object(reports, "get_client", return_value=client), patch.object(reports, "get_row", return_value={"photo_path": "u/r.jpg"}):
            self.assertTrue(reports.delete_own("r", "u"))
        client.storage.from_.return_value.remove.assert_called_once_with(["u/r.jpg"])
        client, _ = client_returning([])
        with patch.object(reports, "get_client", return_value=client), patch.object(reports, "get_row", return_value={"photo_path": "u/r.jpg"}):
            self.assertFalse(reports.delete_own("r", "u"))
        client.storage.from_.assert_not_called()


if __name__ == "__main__":
    unittest.main()
