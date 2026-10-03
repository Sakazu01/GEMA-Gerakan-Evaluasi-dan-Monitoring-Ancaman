import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;
let pending: Promise<string> | null = null;

export function authClient() {
  if (typeof window === "undefined") throw new Error("Sesi hanya tersedia di browser");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Sesi pelaporan belum tersedia. Coba lagi nanti.");
  client ??= createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
  return client;
}

export async function accessToken(): Promise<string> {
  if (pending) return pending;
  pending = (async () => {
    const auth = authClient().auth;
    const { data, error } = await auth.getSession();
    if (error) throw new Error("Sesi belum tersedia. Coba lagi.");
    if (data.session) return data.session.access_token;
    const signed = await auth.signInAnonymously();
    if (signed.error || !signed.data.session) throw new Error("Sesi pelaporan belum tersedia. Coba lagi.");
    return signed.data.session.access_token;
  })();
  try { return await pending; } finally { pending = null; }
}
