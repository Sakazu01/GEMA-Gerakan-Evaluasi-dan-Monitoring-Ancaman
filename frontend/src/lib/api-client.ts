import { getAnonId } from "@/lib/anon-id";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: { ...init?.headers, Authorization: `Bearer ${getAnonId()}` },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(typeof body?.detail === "string" ? body.detail : `Layanan sedang bermasalah (${res.status}).`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}
