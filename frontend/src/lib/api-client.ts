const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

// ponytail: belum ada retry/auth-header — ditambahkan saat Checkpoint 6 menyambungkan Supabase JWT.
export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, init);
  if (!res.ok) {
    throw new Error(`API ${path} gagal: ${res.status}`);
  }
  return res.json() as Promise<T>;
}
