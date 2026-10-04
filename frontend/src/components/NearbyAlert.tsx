"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell, X } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { authClient } from "@/lib/auth";
import { disasterNames } from "@/lib/demo-reports";
import type { NearbyResult, Report } from "@/types/report";

type Alert = { id: string; title: string; detail: string };

const SEEN_KEY = "gema:alerted";
const POLL_MS = 20000;

function readSeen(): string[] {
  try { return JSON.parse(sessionStorage.getItem(SEEN_KEY) || "[]"); } catch { return []; }
}
function writeSeen(ids: string[]) {
  try { sessionStorage.setItem(SEEN_KEY, JSON.stringify(ids.slice(-50))); } catch { /* tanpa storage, peringatan bisa muncul lagi */ }
}

// "Ting" dua nada lewat WebAudio, tanpa file suara. Browser baru mengizinkan setelah pengguna menyentuh halaman.
function ting(ctx: AudioContext) {
  const now = ctx.currentTime;
  [880, 1320].forEach((freq, i) => {
    const osc = ctx.createOscillator(), gain = ctx.createGain();
    osc.type = "sine"; osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, now + i * 0.16);
    gain.gain.exponentialRampToValueAtTime(0.25, now + i * 0.16 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.16 + 0.5);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now + i * 0.16); osc.stop(now + i * 0.16 + 0.55);
  });
}

// Peringatan laporan baru dalam 500 m dari posisi perangkat. Tidak meminta izin lokasi sendiri:
// hanya aktif bila izin sudah diberikan (misalnya lewat "Gunakan lokasi saya" di dashboard).
export function NearbyAlert() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const audio = useRef<AudioContext | null>(null);
  const running = useRef(false);

  useEffect(() => {
    const unlock = () => {
      try { audio.current ??= new AudioContext(); void audio.current.resume(); } catch { /* tanpa suara */ }
    };
    window.addEventListener("pointerdown", unlock, { once: true });
    return () => window.removeEventListener("pointerdown", unlock);
  }, []);

  const check = useCallback(async () => {
    if (running.current || document.visibilityState !== "visible" || !navigator.geolocation) return;
    running.current = true;
    try {
      const permission = await navigator.permissions?.query({ name: "geolocation" }).catch(() => null);
      if (permission?.state !== "granted") return;
      const position = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }));
      const result = await apiFetch<NearbyResult>("/api/nearby", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lat: position.coords.latitude, lng: position.coords.longitude, accuracy_m: position.coords.accuracy, location_mode: "device", measured_at: new Date(position.timestamp).toISOString() }),
      });
      if (!result.location_valid) return;
      // Laporan milik sendiri tidak perlu diperingatkan; hanya dicek bila sesi sudah ada (tidak membuat sesi baru).
      let own = new Set<string>();
      if ((await authClient().auth.getSession()).data.session) {
        own = new Set((await apiFetch<Report[]>("/api/my-reports").catch(() => [])).map((r) => r.id));
      }
      const seen = readSeen();
      const fresh = result.items.filter((item) => !seen.includes(item.report_id) && !own.has(item.report_id));
      writeSeen([...seen, ...result.items.map((item) => item.report_id)]);
      if (fresh.length === 0) return;
      setAlerts((old) => [...fresh.map((item) => ({
        id: item.report_id,
        title: `Ada laporan ${disasterNames[item.reported_type].toLowerCase()} di dekat Anda`,
        detail: `${item.location_label}, sekitar ${item.distance_m} m dari lokasi Anda`,
      })), ...old].slice(0, 3));
      try { if (audio.current) ting(audio.current); } catch { /* tanpa suara */ }
      navigator.vibrate?.(200);
    } catch { /* lokasi atau jaringan belum siap; dicoba lagi pada putaran berikutnya */ } finally { running.current = false; }
  }, []);

  useEffect(() => {
    const first = setTimeout(() => void check(), 2000), timer = setInterval(() => void check(), POLL_MS);
    window.addEventListener("gema:reports-changed", check);
    return () => { clearTimeout(first); clearInterval(timer); window.removeEventListener("gema:reports-changed", check); };
  }, [check]);

  if (alerts.length === 0) return null;
  return (
    <div className="pointer-events-none fixed left-3 top-24 z-40 flex w-[calc(100vw-1.5rem)] max-w-sm flex-col gap-2" role="status" aria-live="assertive">
      {alerts.map((alert) => (
        <div key={alert.id} className="gema-pop pointer-events-auto flex items-start gap-3 rounded-xl border border-red-200 bg-white p-3 shadow-xl">
          <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-900"><Bell size={20} /></span>
          <div className="min-w-0 flex-1">
            <p className="font-bold text-slate-950">{alert.title}</p>
            <p className="text-sm text-slate-700">{alert.detail}</p>
            <Link href={`/report/${alert.id}`} onClick={() => setAlerts((old) => old.filter((a) => a.id !== alert.id))} className="mt-1 inline-flex min-h-11 items-center font-semibold text-[#0D5D3A] underline">Lihat dan bantu periksa</Link>
          </div>
          <button type="button" aria-label="Tutup peringatan" onClick={() => setAlerts((old) => old.filter((a) => a.id !== alert.id))} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-slate-700 hover:bg-slate-100"><X size={18} /></button>
        </div>
      ))}
    </div>
  );
}
