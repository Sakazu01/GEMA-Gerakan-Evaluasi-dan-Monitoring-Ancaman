"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Building2, ChevronLeft, Clock, Flame, MapPin, Mountain, Users, Waves } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { apiFetch } from "@/lib/api-client";
import { disasterBadge, disasterNames, escalationTarget, helpResponseLabel, severityMap } from "@/lib/demo-reports";
import type { Report } from "@/types/report";

// Warna kartu "Kabar bantuan" mengikuti tingkat kepastian help_status yang sudah dihitung backend.
const helpTone: Record<Report["help_status"], { box: string; text: string }> = {
  belum_ada_konfirmasi: { box: "border-slate-200 bg-slate-50", text: "text-slate-800" },
  belum_terlihat: { box: "border-amber-200 bg-amber-50", text: "text-amber-900" },
  terlihat: { box: "border-emerald-200 bg-emerald-50", text: "text-emerald-900" },
};

const helpHeadline: Record<Report["help_status"], string> = {
  belum_ada_konfirmasi: "Belum ada konfirmasi warga yang cukup",
  belum_terlihat: "Ada warga yang melaporkan bantuan belum terlihat",
  terlihat: "Bantuan dilaporkan terlihat oleh warga",
};

export function ReportDetail({ id }: { id: string }) {
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch-on-mount standar.
    setLoading(true);
    setNotFound(false);
    apiFetch<Report>(`/api/reports/${id}`)
      .then((data) => {
        if (!cancelled) setReport(data);
      })
      .catch(() => {
        if (!cancelled) setNotFound(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return (
      <main className="mx-auto max-w-3xl px-4 pb-28 pt-8 sm:px-6">
        <p role="status" className="text-slate-700">Memuat detail laporan…</p>
      </main>
    );
  }

  if (notFound || !report) {
    return (
      <main className="mx-auto max-w-3xl px-4 pb-28 pt-8 sm:px-6">
        <h1 className="text-2xl font-bold text-slate-950">Laporan tidak tersedia</h1>
        <p className="mt-2 text-slate-700">
          Laporan ini belum aktif, sudah disembunyikan karena sanggahan, atau tidak ditemukan.
        </p>
        <Link href="/" className="mt-3 inline-flex min-h-11 items-center gap-1 font-bold text-[#0D5D3A]">
          <ChevronLeft aria-hidden="true" size={22} /> Kembali ke beranda
        </Link>
      </main>
    );
  }

  const badge = disasterBadge[report.type];
  const severity = severityMap[report.severity];
  const tone = helpTone[report.help_status];

  return (
    <main className="mx-auto max-w-3xl px-4 pb-28 pt-6 sm:px-6">
      <Link href="/" className="inline-flex min-h-11 items-center gap-1 font-bold text-[#0D5D3A]">
        <ChevronLeft aria-hidden="true" size={22} /> Kembali ke beranda
      </Link>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-semibold text-white" style={{ background: badge.bg }}>
          {/* eslint-disable-next-line @next/next/no-img-element -- ikon PNG kecil, konsisten dengan badge di ReportForm. */}
          <img src={badge.icon} alt="" width={16} height={16} /> {badge.label}
        </span>
        <span className="rounded-full px-3 py-1 text-sm font-bold" style={{ background: severity.color, color: severity.textColor }}>
          {severity.label}
        </span>
      </div>

      <h1 className="mt-3 text-2xl font-bold text-slate-950">
        {disasterNames[report.type]} di {report.location_label}
      </h1>
      <p className="mt-1 text-sm text-slate-600">Laporan warga — belum diverifikasi</p>

      <Card className="mt-5 border-slate-200">
        <h2 className="font-bold text-slate-900">Ringkasan berdasarkan foto</h2>
        <p className="mt-1 text-slate-800">{report.ai_summary}</p>
        {report.description && <p className="mt-2 italic text-slate-700">&ldquo;{report.description}&rdquo;</p>}

        <div className="mt-4 space-y-3 border-t border-slate-100 pt-4 text-sm">
          <div className="flex items-start gap-2 text-slate-800">
            <MapPin aria-hidden="true" size={18} className="mt-0.5 shrink-0 text-slate-500" />
            <span>{report.location_label}</span>
          </div>
          <div className="flex items-start gap-2 text-slate-800">
            <Clock aria-hidden="true" size={18} className="mt-0.5 shrink-0 text-slate-500" />
            <span>{report.published_at && new Date(report.published_at).toLocaleString("id-ID", {
              timeZone: "Asia/Jakarta", dateStyle: "medium", timeStyle: "short",
            })} WIB</span>
          </div>
          {report.details?.type === "flood" && (
            <div className="flex items-start gap-2 text-slate-800">
              <Waves aria-hidden="true" size={18} className="mt-0.5 shrink-0 text-slate-500" />
              <span>Kedalaman: {report.details.water_depth ?? "Tidak tahu"} · Arus: {report.details.current ?? "Tidak tahu"}</span>
            </div>
          )}
          {report.details?.type === "landslide" && (
            <div className="flex items-start gap-2 text-slate-800">
              <Mountain aria-hidden="true" size={18} className="mt-0.5 shrink-0 text-slate-500" />
              <span>Perkiraan luas tertutup: {report.details.covered_area_m2 == null ? "Tidak tahu" : `${report.details.covered_area_m2} m²`}</span>
            </div>
          )}
          {report.details?.type === "fire" && (
            <div className="flex items-start gap-2 text-slate-800">
              <Flame aria-hidden="true" size={18} className="mt-0.5 shrink-0 text-slate-500" />
              <span>Jarak pandang akibat asap: {report.details.visibility === "sangat_rendah" ? "Sangat rendah" : report.details.visibility ?? "Tidak tahu"}</span>
            </div>
          )}
        </div>
      </Card>

      <div className={`mt-4 rounded-lg border p-4 ${tone.box}`}>
        <h2 className={`flex items-center gap-2 font-bold ${tone.text}`}>
          <Users aria-hidden="true" size={18} /> Kabar bantuan
        </h2>
        <p className={`mt-1 text-sm ${tone.text}`}>
          {helpHeadline[report.help_status]} ({helpResponseLabel[report.help_status]})
        </p>
      </div>

      <div className="mt-4 rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="flex items-center gap-2 font-bold text-slate-900">
          <Building2 aria-hidden="true" size={18} /> Target eskalasi
        </h2>
        <p className="mt-1 text-sm text-slate-800">
          {severity.radiusLabel ? `Radius peringatan ${severity.radiusLabel.replace("radius ", "")} — ` : "Tanpa radius peringatan — "}
          {escalationTarget[report.severity]}.
        </p>
        <p className="mt-2 text-xs text-slate-500">
          Referensi jalur eskalasi berdasarkan tingkat keparahan — bukan notifikasi yang benar-benar terkirim ke instansi manapun.
        </p>
      </div>
    </main>
  );
}
