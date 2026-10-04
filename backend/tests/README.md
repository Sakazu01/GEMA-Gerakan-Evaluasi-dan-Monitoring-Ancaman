# Pengujian backend

Semua perintah dijalankan dari folder `backend` dengan lingkungan virtual aktif.

| Folder | Isi | Cara menjalankan |
| --- | --- | --- |
| `unit/` | Test Python dengan layanan luar yang ditiru (mock) | `python -m unittest discover -s tests/unit -t .` |
| `sql/` | Uji database PostgreSQL lokal: migrasi, transaksi, dan konkurensi | `powershell -File tests/sql/run-postgres.ps1` |
| `fixtures/` | Bahan uji: foto (tidak ikut repository) dan kunci jawaban `labels.csv` | dipakai oleh evaluasi AI |
| `output/` | Hasil evaluasi AI: `hasil_evaluasi.md` dan `hasil_evaluasi.json` | `python -m scripts.evaluasi_ai` |

Dua test berikut berbentuk fungsi biasa dan dijalankan terpisah:

```bash
python -m tests.unit.test_rules
python -m tests.unit.test_analyze
```

Test otomatis tidak menghubungi layanan nyata. Hanya `scripts/evaluasi_ai.py` yang memanggil model AI sungguhan.
