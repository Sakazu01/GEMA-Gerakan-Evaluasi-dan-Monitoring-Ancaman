"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, ChevronLeft, ClipboardCheck, Flame, HeartHandshake, MapPin, Mountain, Navigation, Phone, Waves, XCircle, type LucideIcon } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { NavDrawer } from "@/components/NavDrawer";
import { disasterGuides, disasterNames, haversineM, titikKumpul, type MapLocation } from "@/lib/demo-reports";
import { requestDeviceLocation } from "@/lib/geolocation";
import type { DisasterType } from "@/types/report";

const TitikKumpulMap = dynamic(() => import("@/components/TitikKumpulMap"), {
  ssr: false,
  loading: () => <div aria-hidden="true" className="h-72 w-full animate-pulse rounded-xl bg-slate-100" />,
});

const NEARBY_KM = 30;
const types: DisasterType[] = ["flood", "landslide", "fire"];

const typeStyle: Record<DisasterType, { icon: LucideIcon; tint: string }> = {
  flood: { icon: Waves, tint: "bg-blue-100 text-blue-900" },
  landslide: { icon: Mountain, tint: "bg-amber-100 text-amber-900" },
  fire: { icon: Flame, tint: "bg-orange-100 text-orange-900" },
};

const phases = [
  { key: "before", title: "Sebelum kejadian", icon: ClipboardCheck, tint: "bg-slate-100 text-slate-900" },
  { key: "during", title: "Saat kejadian", icon: AlertTriangle, tint: "bg-amber-100 text-amber-900" },
  { key: "after", title: "Sesudah kejadian", icon: HeartHandshake, tint: "bg-emerald-100 text-emerald-900" },
] as const;

export default function EvakuasiPage() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selected, setSelected] = useState<DisasterType>("fire");
  const [location, setLocation] = useState<MapLocation | null>(null);
  const [locationMessage, setLocationMessage] = useState("");
  useEffect(() => { requestDeviceLocation(setLocation, setLocationMessage); }, []);

  const ranked = useMemo(
    () => titikKumpul
      .map((point) => ({ point, km: location ? haversineM(location.lat, location.lng, point.lat, point.lng) / 1000 : null }))
      .sort((a, b) => (a.km ?? 0) - (b.km ?? 0)),
    [location],
  );
  const nearby = useMemo(() => {
    if (!location) return ranked;
    const close = ranked.filter((item) => (item.km ?? 0) <= NEARBY_KM);
    return (close.length > 0 ? close : ranked.slice(0, 3)).slice(0, 8);
  }, [ranked, location]);
  const mapPoints = useMemo(() => nearby.map((item) => item.point), [nearby]);
  const userSpot = useMemo(() => (location ? { lat: location.lat, lng: location.lng } : null), [location]);
  const farAway = Boolean(location) && nearby.length > 0 && (nearby[0].km ?? 0) > NEARBY_KM;
  const guide = disasterGuides[selected];
  const SelectedIcon = typeStyle[selected].icon;

  return (
    <div className="min-h-dvh">
      <AppHeader open={drawerOpen} onMenuClick={() => setDrawerOpen(true)} />

      <main className="mx-auto max-w-3xl space-y-6 px-4 pb-28 pt-6">
        <div>
          <Link href="/" className="inline-flex min-h-11 items-center gap-1 font-bold text-[#0D5D3A]">
            <ChevronLeft aria-hidden="true" size={22} /> Beranda
          </Link>
          <h1 className="mt-1 text-2xl font-bold text-slate-950">Panduan evakuasi</h1>
          <p className="gema-muted mt-1">Langkah keselamatan umum sebelum, saat, dan sesudah bencana.</p>
        </div>

        <section aria-label="Bantuan darurat" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
          <div className="flex items-center gap-3">
            <span aria-hidden="true" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-900"><Phone size={20} /></span>
            <div>
              <p className="font-semibold text-red-950">Dalam bahaya sekarang?</p>
              <p className="text-sm text-red-900">Hubungi 112 atau buka daftar nomor darurat.</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <a href="tel:112" className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#CF0003] px-4 font-semibold text-white hover:bg-red-800">Hubungi 112</a>
            <Link href="/hotline" className="inline-flex min-h-11 items-center rounded-lg border border-red-300 bg-white px-4 font-semibold text-red-900 hover:bg-red-100">Semua nomor darurat</Link>
          </div>
        </section>

        <section aria-labelledby="jenis-panduan" className="space-y-3">
          <h2 id="jenis-panduan" className="text-sm font-semibold text-slate-900">Pilih jenis bencana</h2>
          <div className="grid grid-cols-3 gap-2" role="group" aria-label="Jenis panduan evakuasi">
            {types.map((type) => {
              const Icon = typeStyle[type].icon;
              const active = selected === type;
              return (
                <button
                  key={type}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setSelected(type)}
                  className={`flex min-h-16 flex-col items-center justify-center gap-1 rounded-xl border px-2 py-2 text-sm font-semibold transition-colors ${
                    active ? "border-[#0D5D3A] bg-[#0D5D3A] text-white shadow-md" : "border-slate-300 bg-white text-slate-800 hover:bg-slate-50"
                  }`}
                >
                  <Icon aria-hidden="true" size={22} />
                  {disasterNames[type]}
                </button>
              );
            })}
          </div>
        </section>

        <section aria-labelledby="langkah-evakuasi" className="space-y-3">
          <div className="flex items-center gap-3">
            <span aria-hidden="true" className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${typeStyle[selected].tint}`}><SelectedIcon size={26} /></span>
            <div>
              <h2 id="langkah-evakuasi" className="text-xl font-bold text-slate-950">{guide.headline}</h2>
              <p className="gema-muted">Panduan umum untuk {disasterNames[selected].toLowerCase()}. Laporan warga di GEMA belum diverifikasi.</p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <h3 className="flex items-center gap-2 font-semibold text-emerald-900"><CheckCircle2 aria-hidden="true" size={20} /> Lakukan</h3>
              <ul className="mt-2 space-y-2 text-sm text-emerald-950">{guide.do.map((item) => <li key={item}>{item}</li>)}</ul>
            </div>
            <div className="rounded-xl border border-red-200 bg-red-50 p-4">
              <h3 className="flex items-center gap-2 font-semibold text-red-900"><XCircle aria-hidden="true" size={20} /> Jangan</h3>
              <ul className="mt-2 space-y-2 text-sm text-red-950">{guide.dont.map((item) => <li key={item}>{item}</li>)}</ul>
            </div>
          </div>
        </section>

        <section aria-labelledby="tahapan" className="space-y-3">
          <h2 id="tahapan" className="text-xl font-bold text-slate-950">Tahapan keselamatan</h2>
          <div className="grid gap-3 md:grid-cols-3">
            {phases.map(({ key, title, icon: Icon, tint }, index) => (
              <article key={key} className="gema-card space-y-3">
                <div className="flex items-center gap-2">
                  <span aria-hidden="true" className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${tint}`}><Icon size={20} /></span>
                  <h3 className="font-semibold text-slate-950"><span className="text-slate-600">{index + 1}. </span>{title}</h3>
                </div>
                <ul className="space-y-2 text-sm text-slate-800">
                  {guide[key].map((item) => (
                    <li key={item} className="flex gap-2"><span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#0D5D3A]" />{item}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>

        <section id="di-titik-kumpul" aria-labelledby="judul-titik-kumpul" className="space-y-3">
          <div className="flex items-start gap-3">
            <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-900"><MapPin size={20} /></span>
            <div>
              <h2 id="judul-titik-kumpul" className="text-xl font-bold text-slate-950">Titik kumpul terdekat</h2>
              <p className="gema-muted">
                {location
                  ? (farAway ? `Belum ada titik dalam ${NEARBY_KM} km dari lokasi Anda. Berikut yang terdekat.` : `Titik dalam ${NEARBY_KM} km dari lokasi Anda, terdekat lebih dulu.`)
                  : (locationMessage || "Izinkan lokasi untuk melihat titik terdekat dari Anda.")}
              </p>
            </div>
          </div>
          <TitikKumpulMap points={mapPoints} user={userSpot} />
          <ul className="space-y-2">
            {nearby.slice(0, location ? 8 : 5).map(({ point, km }) => (
              <li key={`${point.name}-${point.city}`} className="gema-card flex items-center justify-between gap-3 p-3">
                <div className="min-w-0">
                  <p className="font-semibold text-slate-950">{point.name}</p>
                  <p className="gema-muted">{point.city}{km !== null ? `, sekitar ${km.toFixed(1)} km` : ""}</p>
                </div>
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${point.lat},${point.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Buka rute ke ${point.name}`}
                  className="gema-button-secondary shrink-0 gap-1"
                >
                  <Navigation aria-hidden="true" size={16} /> Rute
                </a>
              </li>
            ))}
          </ul>
          <p className="gema-muted">
            Titik kumpul di sini adalah contoh lapangan dan ruang terbuka umum, bukan daftar resmi. Pastikan posko resmi kepada BPBD atau petugas setempat. Saat tiba, laporkan kehadiran Anda kepada petugas posko. GEMA tidak mencatat kehadiran atau mengirim permintaan bantuan.
          </p>
        </section>

        <p className="text-sm text-slate-700">
          Panduan umum mengacu pada{" "}
          <a
            href="https://bnpb.go.id/storage/app/media/Buku%20BNPB/Buku%20Saku%20Bencana%20BNPB.pdf"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center font-semibold underline"
          >
            Buku Saku Bencana BNPB
          </a>
          . Selalu utamakan arahan petugas setempat.
        </p>
      </main>
      <NavDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </div>
  );
}
