"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { apiFetch } from "@/lib/api-client";
import { disasterNames, severityStatusLabel } from "@/lib/demo-reports";
import type { Report, ReportStatus } from "@/types/report";

const statusText: Record<ReportStatus, string> = {
  draft: "Draf",
  active: "Aktif — tampil di beranda",
  disputed_hidden: "Disembunyikan sementara karena sanggahan warga",
};

export default function TrackPage() {
  const [reports, setReports] = useState<Report[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<Report[]>("/api/my-reports")
      .then(setReports)
      .catch((e: Error) => setError(e.message));
  }, []);

  return (
    <main className="mx-auto max-w-3xl px-4 pb-28 pt-8 sm:px-6">
      <Link href="/" className="inline-flex min-h-11 items-center font-semibold text-blue-800 underline">Kembali ke beranda</Link>
      <h1 className="mt-3 text-3xl font-bold text-slate-950">Lacak Tanggapan</h1>
      <p className="mt-2 text-slate-700">Laporan yang dibuat dari perangkat ini, termasuk yang disembunyikan sementara.</p>

      {error && (
        <p role="alert" className="mt-4 rounded-lg border border-red-300 bg-red-50 p-4 text-red-900">
          Gagal memuat laporan: {error}
        </p>
      )}
      {!reports && !error && <p role="status" className="mt-4 text-slate-700">Memuat…</p>}
      {reports && reports.length === 0 && (
        <p className="mt-4 text-slate-600">Belum ada laporan dari perangkat ini.</p>
      )}
      {reports && reports.length > 0 && (
        <ul className="mt-4 space-y-3">
          {reports.map((report) => (
            <li key={report.id}>
              <Card>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-slate-900">{disasterNames[report.type]}</span>
                  <span className="text-sm text-slate-700">{severityStatusLabel(report.severity)}</span>
                </div>
                <p className="mt-2 text-slate-900">{report.ai_summary}</p>
                <p className="mt-2 text-sm font-medium text-slate-800">{statusText[report.status]}</p>
                {report.status === "active" && (
                  <Link href={`/report/${report.id}`} className="mt-2 inline-flex min-h-11 items-center font-semibold text-blue-800 underline">
                    Lihat detail
                  </Link>
                )}
              </Card>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
