import { accessToken } from "@/lib/auth";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const method = init?.method ?? "GET";
  const publicRead = (method === "GET" && !path.includes("/my-reports") && !path.includes("/moderation") && !path.includes("/session") && !path.includes("/drafts/") && !path.endsWith("/observation") && !path.includes("/reports/all")) || (method === "POST" && path === "/api/nearby");
  const headers = new Headers(init?.headers);
  if (!publicRead) headers.set("Authorization", `Bearer ${await accessToken()}`);
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers,
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const messages: Record<string,string> = {
      version_conflict:"Laporan berubah sejak Anda membukanya. Muat ulang sebelum membuat keputusan.",
      idempotency_conflict:"Data pengiriman berbeda dari percobaan sebelumnya. Buka laporan saya untuk memeriksa hasilnya.",
      fresh_observation_required:"Isi waktu pengamatan terbaru berdasarkan bukti sebelum mengaktifkan laporan.",
      cannot_observe_own_report:"Pengamatan warga lain harus berasal dari akun selain pelapor.",
      cannot_vote_own_report:"Konfirmasi bantuan harus berasal dari akun selain pelapor.",
      future_observation:"Waktu pengamatan berada di masa depan. Periksa kembali waktu dan zona perangkat.",
      draft_expired:"Draft server kedaluwarsa. Buat draft baru dari data perangkat.",
      report_not_found:"Laporan tidak tersedia. Muat ulang data untuk memeriksa status terbaru.",
      report_not_active:"Laporan sudah tidak aktif. Muat ulang sebelum memberi pengamatan.",
      report_not_draft:"Draft sudah diajukan. Periksa hasilnya melalui Laporan Saya.",
      forbidden:"Akun tidak memiliki izin untuk tindakan ini.",
      reason_required:"Tulis alasan berdasarkan bukti, minimal 10 karakter setelah mengabaikan spasi di tepi.",
      observation_time_required:"Isi waktu pengamatan atau pilih belum tahu.",
      invalid_transition:"Status laporan tidak mendukung tindakan ini. Muat ulang dan periksa status terbaru.",
      invalid_action:"Tindakan belum tersedia. Pilih tindakan yang sesuai status laporan.",
      subscription_conflict:"Notifikasi browser ini masih terhubung dengan sesi lain. Gunakan sesi sebelumnya atau buat langganan browser baru.",
      outbox_conflict:"Status pengiriman berubah atau percobaan ulang tidak tersedia. Muat ulang sebelum mencoba lagi.",
      already_voted:"Jawaban ini sudah tercatat. Muat ulang untuk melihat hasilnya.",
    };
    throw new ApiError(messages[body?.code] || (typeof body?.detail === "string" ? body.detail : `Layanan sedang bermasalah (${res.status}).`), res.status, body?.code, Number(res.headers.get("Retry-After")) || undefined);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export class ApiError extends Error {
  constructor(message: string, public status: number, public code?: string, public retryAfter?: number) { super(message); }
}
