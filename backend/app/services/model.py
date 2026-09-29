# TODO Checkpoint 7: panggilan model AI (belum final — Gemini/OpenAI/dst, lihat PRD §7/§17
# untuk rekomendasi default). Skema keluaran harus tetap ketat:
# validity/disaster_type/severity/summary_id/reason_id.
#
# PENTING soal `severity`: ini yang membedakan kejadian yang butuh respons/evakuasi SEGERA
# (mis. banjir dalam + arus deras) dari kejadian yang cuma genangan biasa (dangkal, tenang).
# `severity="tinggi"` artinya "perlu evakuasi/respons segera" — bukan sekadar "kelihatan besar
# di foto". Ini yang dipakai PRD §16.2 buat memicu kartu keselamatan/area perhatian merah, jadi
# prompt model harus dikalibrasi ke ambang itu, bukan cuma "ada air di foto".
async def analyze_photo(photo_bytes: bytes) -> dict:
    raise NotImplementedError("Analisis AI belum diimplementasikan (Checkpoint 7)")
