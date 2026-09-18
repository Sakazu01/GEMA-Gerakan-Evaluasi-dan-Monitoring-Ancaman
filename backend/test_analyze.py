"""Cek kecil untuk kegagalan penyimpanan draft. Jalankan: python test_analyze.py"""

from unittest.mock import MagicMock, patch

from app.services.model import AnalyzeResult
from app.services.reports import create_draft


def test_insert_gagal_menghapus_foto():
    client = MagicMock()
    client.table.return_value.insert.return_value.execute.side_effect = RuntimeError("db failed")
    result = AnalyzeResult(
        validity="relevant",
        disaster_type="fire",
        severity="kritis",
        summary_id="Api meluas.",
        reason_id="Api terlihat di banyak titik.",
    )

    with patch("app.services.reports.get_client", return_value=client):
        try:
            create_draft("11111111-1111-4111-8111-111111111111", result, b"photo", "image/jpeg")
            assert False, "Insert seharusnya gagal"
        except RuntimeError as error:
            assert str(error) == "db failed"

    uploaded_path = client.storage.from_.return_value.upload.call_args.args[0]
    removed_paths = client.storage.from_.return_value.remove.call_args.args[0]
    assert removed_paths == [uploaded_path]


if __name__ == "__main__":
    test_insert_gagal_menghapus_foto()
    print("ok")
