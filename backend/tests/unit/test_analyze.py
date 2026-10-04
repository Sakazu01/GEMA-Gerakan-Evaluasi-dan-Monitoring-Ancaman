"""Cek kecil untuk kegagalan penyimpanan draft. Jalankan dari folder backend: python -m tests.unit.test_analyze"""

import sys
from pathlib import Path
from unittest.mock import MagicMock, patch

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from app.services.model import AnalyzeResult  # noqa: E402
from app.services.reports import create_draft  # noqa: E402


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

    with patch("app.services.reports.get_client", return_value=client), patch("app.services.reports.get_row", return_value=None):
        try:
            create_draft("11111111-1111-4111-8111-111111111111", result, b"photo", "image/jpeg")
            assert False, "Insert seharusnya gagal"
        except RuntimeError as error:
            assert str(error) == "db failed"

    uploaded_path = client.storage.from_.return_value.upload.call_args.args[0]
    removed_paths = client.storage.from_.return_value.remove.call_args.args[0]
    assert removed_paths == [uploaded_path]


def test_petunjuk_keaslian_masuk_risk_flags():
    from app.services.reports import save_analysis

    client = MagicMock()
    result = AnalyzeResult(validity="invalid", reason_id="Tangkapan layar.", authenticity_flags=["screenshot", "stock_or_news"])
    with patch("app.services.reports.get_client", return_value=client):
        save_analysis("11111111-1111-4111-8111-111111111111", "22222222-2222-4222-8222-222222222222", result)
    patch_sent = client.table.return_value.update.call_args.args[0]
    assert patch_sent["risk_flags"] == ["ai_suspect_screenshot", "ai_suspect_stock_or_news"]


if __name__ == "__main__":
    test_insert_gagal_menghapus_foto()
    test_petunjuk_keaslian_masuk_risk_flags()
    print("ok")
