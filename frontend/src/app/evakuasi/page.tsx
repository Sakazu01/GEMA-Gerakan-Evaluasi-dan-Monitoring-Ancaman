"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, ChevronLeft, XCircle } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { NavDrawer } from "@/components/NavDrawer";
import { disasterGuides, disasterNames } from "@/lib/demo-reports";
import type { DisasterType } from "@/types/report";

const types: DisasterType[] = ["flood", "landslide", "fire"];

export default function EvakuasiPage() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selected, setSelected] = useState<DisasterType>("fire");

  return (
    <div className="min-h-dvh">
      <AppHeader open={drawerOpen} onMenuClick={() => setDrawerOpen(true)} />

      <main className="mx-auto max-w-3xl px-4 pb-28 pt-6">
        <Link href="/" className="inline-flex min-h-11 items-center gap-1 font-bold text-[#0D5D3A]">
          <ChevronLeft aria-hidden="true" size={22} /> Panduan Evakuasi
        </Link>

        <div className="mt-3 flex min-h-[140px] flex-col items-center justify-center rounded-lg border border-slate-200 bg-white px-5 text-center">
          <p className="font-semibold text-slate-900">Titik kumpul dan rute belum tersedia di GEMA</p>
          <p className="mt-1 text-sm text-slate-600">Ikuti petunjuk petugas setempat untuk menemukan tempat yang aman.</p>
        </div>

        <section aria-labelledby="jenis-panduan" className="mt-4">
          <h2 id="jenis-panduan" className="text-sm font-semibold text-slate-900">Pilih jenis bencana</h2>
          <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="Jenis panduan evakuasi">
            {types.map((type) => (
              <button
                key={type}
                type="button"
                aria-pressed={selected === type}
                onClick={() => setSelected(type)}
                className={`min-h-11 rounded-lg border px-3 text-sm font-semibold ${
                  selected === type
                    ? "border-[#0D5D3A] bg-[#0D5D3A] text-white"
                    : "border-slate-300 bg-white text-slate-800"
                }`}
              >
                {disasterNames[type]}
              </button>
            ))}
          </div>
          <p className="mt-3 text-sm text-slate-700">
            Panduan umum untuk {disasterNames[selected].toLowerCase()}. Laporan warga yang tampil di GEMA belum diverifikasi.
          </p>
        </section>

        <section aria-labelledby="langkah-evakuasi" className="mt-5">
          <h2 id="langkah-evakuasi" className="font-bold text-slate-900">{disasterGuides[selected].headline}</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
              <h3 className="flex items-center gap-2 font-semibold text-emerald-900">
                <CheckCircle2 aria-hidden="true" size={18} /> Lakukan
              </h3>
              <ul className="mt-2 space-y-2 text-sm text-emerald-950">
                {disasterGuides[selected].do.map((item) => <li key={item}>{item}</li>)}
              </ul>
            </div>
            <div className="rounded-lg border border-red-200 bg-red-50 p-4">
              <h3 className="flex items-center gap-2 font-semibold text-red-900">
                <XCircle aria-hidden="true" size={18} /> Jangan
              </h3>
              <ul className="mt-2 space-y-2 text-sm text-red-950">
                {disasterGuides[selected].dont.map((item) => <li key={item}>{item}</li>)}
              </ul>
            </div>
          </div>
        </section>

        <div className="mt-5 grid grid-cols-2 gap-2">
          <Link href="/hotline" className="flex min-h-11 items-center justify-center rounded-lg bg-[#CF0003] px-3 text-center font-semibold text-white hover:bg-red-800">
            Jika Terjebak
          </Link>
          <a href="#di-titik-kumpul" className="flex min-h-11 items-center justify-center rounded-lg bg-[#0D5D3A] px-3 text-center font-semibold text-white hover:bg-[#094a2e]">
            Di Titik Kumpul
          </a>
        </div>
        <section id="di-titik-kumpul" aria-labelledby="judul-titik-kumpul" className="mt-5 rounded-lg border border-slate-200 bg-white p-4">
          <h2 id="judul-titik-kumpul" className="font-semibold text-slate-900">Saat tiba di titik kumpul</h2>
          <p className="mt-1 text-sm text-slate-700">Laporkan kehadiran Anda kepada petugas posko dan ikuti informasi resmi. GEMA tidak mencatat kehadiran atau mengirim permintaan bantuan.</p>
        </section>
        <p className="mt-4 text-xs text-slate-600">
          Panduan umum mengacu pada{" "}
          <a
            href="https://bnpb.go.id/storage/app/media/Buku%20BNPB/Buku%20Saku%20Bencana%20BNPB.pdf"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold underline"
          >
            Buku Saku Bencana BNPB
          </a>
          .
        </p>
      </main>
      <NavDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </div>
  );
}
