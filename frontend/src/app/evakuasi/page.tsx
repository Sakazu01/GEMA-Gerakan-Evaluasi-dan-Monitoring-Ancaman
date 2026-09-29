"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, ChevronLeft, MapPin, XCircle } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { NavDrawer } from "@/components/NavDrawer";
import { Card } from "@/components/ui/Card";
import { disasterGuides, disasterNames, nearestTitikKumpul } from "@/lib/demo-reports";
import { useDemoReports } from "@/lib/demo-report-context";
import type { DisasterType } from "@/types/report";

const types: DisasterType[] = ["flood", "landslide", "fire"];

export default function EvakuasiPage() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selected, setSelected] = useState<DisasterType>("fire");
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const { reports } = useDemoReports();

  // Beberapa laporan demo sengaja dibuat di titik yang nyaris sama untuk uji kepadatan peta
  // (lihat seed_demo.py _konfirmasi_tambahan) -- di-dedupe di sini biar tidak terlihat
  // dobel-dobel di daftar pilihan laporan.
  const candidates = reports
    .filter((report) => report.type === selected && report.status === "active")
    .filter((report, index, all) => all.findIndex((r) => r.location_label === report.location_label) === index);
  const selectedReport = candidates.find((report) => report.id === selectedReportId) ?? candidates[0] ?? null;
  const nearest = selectedReport ? nearestTitikKumpul(selectedReport.public_lat, selectedReport.public_lng) : null;

  return (
    <div className="min-h-dvh">
      <AppHeader open={drawerOpen} onMenuClick={() => setDrawerOpen(true)} />

      <main className="mx-auto max-w-3xl px-4 pb-28 pt-6">
        <Link href="/" className="inline-flex min-h-11 items-center gap-1 font-bold text-[#0D5D3A]">
          <ChevronLeft aria-hidden="true" size={22} /> Panduan Evakuasi
        </Link>

        <Card className="mt-3 border-slate-200">
          {!selectedReport || !nearest ? (
            <div className="flex min-h-[100px] flex-col items-center justify-center text-center">
              <p className="font-semibold text-slate-900">Titik kumpul dan rute belum tersedia di GEMA</p>
              <p className="mt-1 text-sm text-slate-600">Ikuti petunjuk petugas setempat untuk menemukan tempat yang aman.</p>
            </div>
          ) : (
            <div>
              <label htmlFor="pilih-laporan" className="text-sm font-semibold text-slate-900">
                Titik kumpul terdekat dari laporan {disasterNames[selected].toLowerCase()}
              </label>
              <select
                id="pilih-laporan"
                value={selectedReport.id}
                onChange={(event) => setSelectedReportId(event.target.value)}
                className="mt-2 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900"
              >
                {candidates.map((report) => (
                  <option key={report.id} value={report.id}>{report.location_label}</option>
                ))}
              </select>
              <div className="mt-3 flex items-start gap-2">
                <MapPin aria-hidden="true" size={18} className="mt-0.5 shrink-0 text-[#0D5D3A]" />
                <p className="text-sm text-slate-800">
                  <span className="font-semibold">{nearest.point.name}</span>, {nearest.point.city}
                  <br />
                  <span className="text-slate-600">sekitar {(nearest.distance_m / 1000).toFixed(1)} km dari lokasi laporan</span>
                </p>
              </div>
              <p className="mt-2 text-xs text-slate-500">*Titik kumpul contoh untuk demo, bukan data resmi BPBD/pemda setempat.</p>
            </div>
          )}
        </Card>

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
          <button
            type="button"
            onClick={() => document.getElementById("di-titik-kumpul")?.scrollIntoView({ behavior: "smooth", block: "start" })}
            className="flex min-h-11 items-center justify-center rounded-lg bg-[#0D5D3A] px-3 text-center font-semibold text-white hover:bg-[#094a2e]"
          >
            Di Titik Kumpul
          </button>
        </div>
        <section id="di-titik-kumpul" aria-labelledby="judul-titik-kumpul" className="mt-5">
          <Card className="border-slate-200">
            <h2 id="judul-titik-kumpul" className="font-semibold text-slate-900">Saat tiba di titik kumpul</h2>
            <p className="mt-1 text-sm text-slate-700">Laporkan kehadiran Anda kepada petugas posko dan ikuti informasi resmi. GEMA tidak mencatat kehadiran atau mengirim permintaan bantuan.</p>
          </Card>
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
        {/* Ganjal bawah -- tanpa ini, section titik-kumpul tidak bisa discroll sampai
            benar-benar ke atas layar karena kontennya sudah dekat akhir halaman. */}
        <div aria-hidden="true" className="h-[50vh]" />
      </main>
      <NavDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </div>
  );
}
