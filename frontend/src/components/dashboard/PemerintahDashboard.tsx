"use client";

import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card } from "@/components/ui/Card";
import { demoNow, disasterNames, severityOrder } from "@/lib/demo-reports";
import { useDemoReports } from "@/lib/demo-report-context";
import type { ReportStatus } from "@/types/report";

const statusNames: Record<ReportStatus, string> = {
  draft: "Draf",
  active: "Aktif",
  disputed_hidden: "Disembunyikan setelah sanggahan",
};

export function PemerintahDashboard() {
  const { reports } = useDemoReports();
  const referenceTime = Math.max(demoNow, ...reports.map((report) => new Date(report.created_at).getTime()));
  const recentCount = reports.filter((report) => {
    const age = referenceTime - new Date(report.created_at).getTime();
    return age >= 0 && age <= 24 * 60 * 60 * 1000;
  }).length;

  return (
    <DashboardLayout
      title="GEMA — Dashboard Pemerintah"
      description="Ringkasan laporan warga untuk pemantauan. Informasi ini belum diverifikasi."
    >
      {/* ponytail: role switcher ini kosmetik (localStorage), belum ada proteksi akses nyata di backend.
          Upgrade path: gate endpoint yang dipakai dashboard ini dengan role asli setelah login dibangun. */}
      <p className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
        Tampilan DEMO, baca saja. Pilihan peran ini bukan login atau akses resmi pemerintah.
      </p>

      <section aria-label="Statistik laporan" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <h2 className="font-bold text-slate-900">Total laporan</h2>
          <p className="mt-3 text-4xl font-bold text-slate-950">{reports.length}</p>
          <p className="mt-3 text-sm text-slate-700">
            Dibuat dalam 24 jam terakhir: <strong>{recentCount}</strong>
          </p>
        </Card>
        <Card>
          <h2 className="font-bold text-slate-900">Per jenis</h2>
          <dl className="mt-3 space-y-2">
            {(["flood", "landslide", "fire"] as const).map((type) => (
              <div key={type} className="flex justify-between gap-3">
                <dt>{disasterNames[type]}</dt>
                <dd className="font-bold">{reports.filter((report) => report.type === type).length}</dd>
              </div>
            ))}
          </dl>
        </Card>
        <Card>
          <h2 className="font-bold text-slate-900">Per status</h2>
          <dl className="mt-3 space-y-2">
            {(["draft", "active", "disputed_hidden"] as const).map((status) => (
              <div key={status} className="flex justify-between gap-3">
                <dt>{statusNames[status]}</dt>
                <dd className="font-bold">{reports.filter((report) => report.status === status).length}</dd>
              </div>
            ))}
          </dl>
        </Card>
        <Card>
          <h2 className="font-bold text-slate-900">Per keparahan</h2>
          <dl className="mt-3 space-y-2">
            {severityOrder.map((severity) => (
              <div key={severity} className="flex justify-between gap-3">
                <dt className="capitalize">{severity}</dt>
                <dd className="font-bold">{reports.filter((report) => report.severity === severity).length}</dd>
              </div>
            ))}
          </dl>
        </Card>
      </section>

      <section aria-labelledby="all-reports-heading">
        <Card>
          <h2 id="all-reports-heading" className="text-xl font-bold text-slate-950">
            Semua laporan ({reports.length})
          </h2>
          <p className="mt-1 text-sm text-slate-700">
            Termasuk laporan yang disembunyikan setelah sanggahan dan laporan DEMO. Tabel ini hanya untuk dibaca.
          </p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[960px] border-collapse text-left text-sm text-slate-900">
              <caption className="sr-only">Semua laporan warga untuk pemantauan, termasuk laporan tersembunyi dan demo</caption>
              <thead className="bg-slate-100">
                <tr>
                  <th scope="col" className="px-3 py-3">Laporan</th>
                  <th scope="col" className="px-3 py-3">Status</th>
                  <th scope="col" className="px-3 py-3">Keparahan</th>
                  <th scope="col" className="px-3 py-3">Lokasi perkiraan</th>
                  <th scope="col" className="px-3 py-3">Dibuat</th>
                  <th scope="col" className="px-3 py-3">DEMO</th>
                  <th scope="col" className="px-3 py-3">Sanggahan</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((report) => (
                  <tr key={report.id} className="border-t border-slate-200 align-top">
                    <td className="max-w-64 px-3 py-3">
                      <span className="font-semibold">{disasterNames[report.type]}</span>
                      <p className="mt-1">{report.ai_summary}</p>
                      <code className="mt-1 block break-all text-xs text-slate-600">{report.id}</code>
                    </td>
                    <td className="px-3 py-3">{statusNames[report.status]}</td>
                    <td className="px-3 py-3 capitalize">{report.severity}</td>
                    <td className="px-3 py-3">{report.location_label}</td>
                    <td className="whitespace-nowrap px-3 py-3">
                      {new Date(report.created_at).toLocaleString("id-ID", {
                        timeZone: "Asia/Jakarta", dateStyle: "medium", timeStyle: "short",
                      })} WIB
                    </td>
                    <td className="px-3 py-3">{report.is_demo ? "Ya" : "Tidak"}</td>
                    <td className="px-3 py-3">{report.false_vote_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </section>
    </DashboardLayout>
  );
}
