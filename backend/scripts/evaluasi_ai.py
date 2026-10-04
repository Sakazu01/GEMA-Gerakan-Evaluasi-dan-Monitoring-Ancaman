"""Evaluasi kecil model AI pada foto uji. Dari folder backend: python -m scripts.evaluasi_ai

Membaca tests/fixtures/foto/ dan kunci jawaban tests/fixtures/labels.csv, menjalankan model,
lalu menulis hasil_evaluasi.json dan hasil_evaluasi.md ke tests/output/.
"""

import csv
import json
import mimetypes
import sys
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app.services.model import MODEL_NAME, analyze_photo  # noqa: E402

TESTS = Path(__file__).resolve().parents[1] / "tests"
JENIS = ("flood", "landslide", "fire")
NAMA = {"flood": "Banjir", "landslide": "Tanah longsor", "fire": "Kebakaran"}


def main() -> None:
    with open(TESTS / "fixtures" / "labels.csv", newline="", encoding="utf-8") as handle:
        labels = {row["berkas"]: row["jenis"] for row in csv.DictReader(handle)}
    rows = []
    for name, truth in labels.items():
        path = TESTS / "fixtures" / "foto" / name
        if not path.exists():
            print(f"dilewati, foto tidak ada: {name}")
            continue
        result = analyze_photo(path.read_bytes(), mimetypes.guess_type(name)[0] or "image/jpeg")
        predicted = result.disaster_type if result.validity.value == "relevant" else result.validity.value
        rows.append({
            "berkas": name, "jenis_sebenarnya": truth, "prediksi": predicted,
            "keparahan": result.severity, "confidence": result.confidence,
            "petunjuk_keaslian": list(result.authenticity_flags), "cocok": predicted == truth,
        })
    if not rows:
        raise SystemExit("Tidak ada foto uji. Letakkan foto di tests/fixtures/foto/ sesuai labels.csv.")

    f1 = {}
    for kelas in JENIS:
        tp = sum(r["prediksi"] == kelas and r["jenis_sebenarnya"] == kelas for r in rows)
        fp = sum(r["prediksi"] == kelas and r["jenis_sebenarnya"] != kelas for r in rows)
        fn = sum(r["prediksi"] != kelas and r["jenis_sebenarnya"] == kelas for r in rows)
        if tp + fp + fn:
            f1[kelas] = round(2 * tp / (2 * tp + fp + fn), 3)
    ringkasan = {
        "model": MODEL_NAME, "waktu": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "jumlah_foto": len(rows), "akurasi": round(sum(r["cocok"] for r in rows) / len(rows), 3),
        "f1_per_kelas": f1, "f1_makro": round(sum(f1.values()) / len(f1), 3) if f1 else None, "hasil": rows,
    }
    out = TESTS / "output"
    out.mkdir(exist_ok=True)
    (out / "hasil_evaluasi.json").write_text(json.dumps(ringkasan, ensure_ascii=False, indent=2), encoding="utf-8")

    baris = "\n".join(
        f"| {r['berkas']} | {NAMA.get(r['jenis_sebenarnya'], r['jenis_sebenarnya'])} | "
        f"{NAMA.get(r['prediksi'], r['prediksi'])} | {r['keparahan'] or 'tidak ada'} | {r['confidence']} | "
        f"{'Ya' if r['cocok'] else 'Tidak'} |" for r in rows)
    (out / "hasil_evaluasi.md").write_text(
        f"# Hasil evaluasi AI\n\nModel: `{MODEL_NAME}`. Dijalankan {ringkasan['waktu']} UTC pada {len(rows)} foto.\n\n"
        f"Akurasi jenis bencana: {ringkasan['akurasi']:.0%}. F1 makro: {ringkasan['f1_makro']}.\n\n"
        f"| Foto | Jenis sebenarnya | Prediksi | Keparahan | Confidence | Cocok |\n| --- | --- | --- | --- | --- | --- |\n{baris}\n\n"
        "Kunci jawaban ditentukan lewat tinjauan manual sebelum foto dikirim ke model. Jumlah foto sangat kecil, "
        "jadi hasil ini hanya gambaran awal dan bukan benchmark statistik.\n", encoding="utf-8")
    print(f"akurasi {ringkasan['akurasi']:.0%} dari {len(rows)} foto; hasil ditulis ke tests/output/")


if __name__ == "__main__":
    main()
