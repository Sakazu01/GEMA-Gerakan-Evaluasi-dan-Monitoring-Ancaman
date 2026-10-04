# Foto uji

Letakkan foto uji di folder ini. Isinya tidak ikut repository karena foto banjir, longsor, dan kebakaran
yang dipakai berasal dari sumber lain dan memiliki hak cipta pemiliknya.

Nama berkas harus sama dengan kolom `berkas` di `../labels.csv`, dan jenis sebenarnya ditulis di kolom `jenis`
(`flood`, `landslide`, atau `fire`). Tentukan jenis sebenarnya lewat tinjauan manual sebelum foto dikirim ke model,
supaya hasil tidak dipengaruhi jawaban AI.

Jalankan evaluasi dari folder `backend`:

```bash
python -m scripts.evaluasi_ai
```
