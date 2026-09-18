"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { apiFetch } from "@/lib/api-client";
import { disasterNames, helpResponseLabel, severityStatusLabel } from "@/lib/demo-reports";
import type { Report } from "@/types/report";

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
        <Link href="/" className="mt-3 inline-flex min-h-11 items-center font-semibold text-blue-800 underline">Kembali ke beranda</Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-4 pb-28 pt-8 sm:px-6">
      <Link href="/" className="inline-flex min-h-11 items-center font-semibold text-blue-800 underline">Kembali ke beranda</Link>
      <h1 className="mt-3 text-3xl font-bold text-slate-950">Detail laporan {disasterNames[report.type].toLowerCase()}</h1>
      <p className="mt-2 text-slate-700">Laporan warga — belum diverifikasi {report.is_demo && "· DEMO"}</p>
      <Card className="mt-6">
        <dl className="space-y-4 text-slate-900">
          <div><dt className="font-semibold">Keparahan</dt><dd>{severityStatusLabel(report.severity)}</dd></div>
          <div><dt className="font-semibold">Ringkasan berdasarkan foto</dt><dd>{report.ai_summary}</dd></div>
          {report.description && <div><dt className="font-semibold">Keterangan warga</dt><dd>{report.description}</dd></div>}
          <div><dt className="font-semibold">Lokasi perkiraan</dt><dd>{report.location_label}</dd></div>
          <div><dt className="font-semibold">Waktu laporan</dt><dd>{report.published_at && new Date(report.published_at).toLocaleString("id-ID", {
            timeZone: "Asia/Jakarta", dateStyle: "medium", timeStyle: "short",
          })} WIB</dd></div>
          {report.details?.type === "flood" && (
            <div><dt className="font-semibold">Kondisi air</dt><dd>
              Kedalaman: {report.details.water_depth ?? "Tidak tahu"} · Arus: {report.details.current ?? "Tidak tahu"}
            </dd></div>
          )}
          {report.details?.type === "landslide" && (
            <div><dt className="font-semibold">Perkiraan luas tertutup</dt><dd>
              {report.details.covered_area_m2 == null ? "Tidak tahu" : `${report.details.covered_area_m2} m²`}
            </dd></div>
          )}
          {report.details?.type === "fire" && (
            <div><dt className="font-semibold">Jarak pandang akibat asap</dt><dd>
              {report.details.visibility === "sangat_rendah" ? "Sangat rendah" :
                report.details.visibility ?? "Tidak tahu"}
            </dd></div>
          )}
          <div><dt className="font-semibold">Kabar bantuan</dt><dd>
            {report.help_status === "terlihat" ? "Bantuan dilaporkan terlihat oleh warga" :
              report.help_status === "belum_terlihat" ? "Ada warga yang melaporkan bantuan belum terlihat" :
              "Belum ada konfirmasi warga yang cukup"} ({helpResponseLabel[report.help_status]})
          </dd></div>
        </dl>
      </Card>
    </main>
  );
}
