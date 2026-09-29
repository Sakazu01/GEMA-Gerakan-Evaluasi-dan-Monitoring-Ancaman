// Backend belum verifikasi JWT sungguhan (lihat backend/app/deps/auth.py) — token Bearer
// dipakai apa adanya sebagai user id. Supaya /track (my-reports) konsisten menunjukkan
// laporan dari browser yang sama, id ini dibuat sekali lalu disimpan di localStorage.
const STORAGE_KEY = "gema:anon-id";

export function getAnonId(): string {
  if (typeof window === "undefined") return "server";
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) return stored;
    const fresh = crypto.randomUUID();
    window.localStorage.setItem(STORAGE_KEY, fresh);
    return fresh;
  } catch {
    // localStorage bisa gagal (private mode dll) — id baru tiap request tetap lebih
    // baik daripada error, walau /track jadi tidak konsisten di sesi itu.
    return crypto.randomUUID();
  }
}
