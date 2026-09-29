"use client";

import { useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { disasterNames, severityMap } from "@/lib/demo-reports";
import type { Report } from "@/types/report";

const tips = {
  flood: "Jauhi arus dan genangan dalam. Pindah ke tempat lebih tinggi jika aman dilakukan.",
  landslide: "Jauhi lereng dan material yang bergerak. Pindah ke tempat terbuka jika aman dilakukan.",
  fire: "Jauhi asap dan api. Bergerak ke tempat terbuka jika aman dilakukan.",
};

const helpText = {
  belum_ada_konfirmasi: "Belum ada konfirmasi warga yang cukup tentang bantuan.",
  belum_terlihat: "Ada warga yang melaporkan bantuan belum terlihat.",
  terlihat: "Bantuan dilaporkan terlihat oleh warga.",
};

export function ZoneCards({
  nearest,
}: {
  nearest: { report: Report; distance_m: number } | null;
}) {
  const [safetyOpen, setSafetyOpen] = useState(true);
  const [helpOpen, setHelpOpen] = useState(true);
  if (!nearest) return null;

  const { report, distance_m } = nearest;
  const radiusKm = severityMap[report.severity].warningRadiusM / 1000;
  return (
    <section aria-label="Informasi area perhatian" className="grid gap-3 md:grid-cols-2">
      <Card className="border-2 bg-white" style={{ borderColor: severityMap[report.severity].color }}>
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-bold text-slate-950">Area perhatian sementara</h3>
          <button type="button" aria-expanded={safetyOpen} onClick={() => setSafetyOpen(!safetyOpen)}
            className="min-h-11 shrink-0 rounded px-2 font-semibold text-slate-900 underline">
            {safetyOpen ? "Minimalkan" : "Tampilkan"}
          </button>
        </div>
        {safetyOpen && (
          <div className="text-sm text-slate-950">
            <p className="mt-1">Laporan {disasterNames[report.type].toLowerCase()} berkeparahan {report.severity} sekitar {Math.round(distance_m)} m dari titik pilihan.</p>
            <p className="mt-2">{tips[report.type]}</p>
            <p className="mt-2 font-medium">Radius perhatian sementara {radiusKm} km ini berdasarkan laporan warga yang belum diverifikasi. Bukan batas bahaya resmi atau rute evakuasi.</p>
            <Link href="/hotline" className="mt-2 inline-flex min-h-11 items-center font-semibold underline">Lihat hotline darurat</Link>
          </div>
        )}
      </Card>
      <Card className="border-blue-300 bg-blue-50">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-bold text-blue-950">Kabar bantuan dari warga</h3>
          <button type="button" aria-expanded={helpOpen} onClick={() => setHelpOpen(!helpOpen)}
            className="min-h-11 shrink-0 rounded px-2 font-semibold text-blue-900 underline">
            {helpOpen ? "Minimalkan" : "Tampilkan"}
          </button>
        </div>
        {helpOpen && (
          <div className="text-sm text-blue-950">
            <p className="mt-1">{helpText[report.help_status]}</p>
            <p className="mt-2">Konfirmasi terlihat: {report.seen_count} · Belum terlihat: {report.not_seen_count}.</p>
            <p className="mt-2">Ini laporan warga, bukan konfirmasi kedatangan bantuan resmi.</p>
            <Link href={`/report/${report.id}`} className="mt-2 inline-flex min-h-11 items-center font-semibold underline">Lihat detail laporan</Link>
          </div>
        )}
      </Card>
    </section>
  );
}
