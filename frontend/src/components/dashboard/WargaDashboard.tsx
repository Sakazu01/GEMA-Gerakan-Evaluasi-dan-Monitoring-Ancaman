"use client";

import Link from "next/link";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card } from "@/components/ui/Card";
import { LocationPicker } from "@/components/LocationPicker";
import { ReportList } from "@/components/ReportList";
import { ReportMap } from "@/components/ReportMap";
import { ZoneCards } from "@/components/ZoneCards";
import { nearestWarningZone, severityMap, severityOrder, type MapLocation } from "@/lib/demo-reports";
import { useDemoReports } from "@/lib/demo-report-context";

export function WargaDashboard({
  location,
  onLocationChange,
}: {
  location: MapLocation | null;
  onLocationChange: (location: MapLocation) => void;
}) {
  const { reports } = useDemoReports();
  const activeReports = reports.filter((report) => report.status === "active");
  const nearest = location ? nearestWarningZone(activeReports, location) : null;

  return (
    <DashboardLayout
      title="GEMA — Beranda Warga"
      description="Laporan warga di sekitar Bandung. Informasi ini belum diverifikasi dan bukan peringatan resmi."
    >
      <nav aria-label="Aksi utama" className="flex flex-wrap gap-3">
        <Link href="/report/new" className="inline-flex min-h-11 items-center rounded-lg bg-blue-700 px-4 font-semibold text-white hover:bg-blue-800">
          Buat laporan
        </Link>
        <Link href="/track" className="inline-flex min-h-11 items-center rounded-lg border border-slate-400 px-4 font-semibold text-slate-900 hover:bg-slate-100">
          Lacak tanggapan
        </Link>
        <Link href="/hotline" className="inline-flex min-h-11 items-center rounded-lg border border-slate-400 px-4 font-semibold text-slate-900 hover:bg-slate-100">
          Hotline
        </Link>
      </nav>

      <Card>
        <LocationPicker location={location} onChange={onLocationChange} />
      </Card>

      {location && !nearest && (
        <p role="status" className="rounded-lg border border-slate-300 bg-slate-50 p-4 text-slate-800">
          Tidak ada laporan aktif dalam radius perhatian yang dikonfigurasi dari titik pilihan saat ini.
          Kondisi di lapangan tetap perlu diperiksa dari sumber resmi.
        </p>
      )}
      <ZoneCards nearest={nearest} />

      <section aria-labelledby="map-heading">
        <Card>
          <h2 id="map-heading" className="mb-1 text-xl font-bold text-slate-900">Peta sebaran laporan</h2>
          <p className="mb-3 text-sm text-slate-700">
            Laporan warga - belum diverifikasi. Warna marker dan lingkaran mengikuti keparahan laporan;
            heatmap menunjukkan kepadatan laporan dalam 24 jam, bukan tingkat bahaya.
            Saat ini severity berasal dari data DEMO; setelah C1 nilainya dari backend. Radius perhatian
            sementara bukan batas bahaya resmi atau siaran instansi.
          </p>
          <ul aria-label="Legenda tingkat keparahan" className="mb-4 flex flex-wrap gap-3 text-sm text-slate-800">
            {severityOrder.map((severity) => (
              <li key={severity} className="flex items-center gap-2">
                <span aria-hidden="true" className="inline-block h-4 w-4 rounded-full border border-slate-400"
                  style={{ backgroundColor: severityMap[severity].color }} />
                <span className="capitalize">{severity}</span>
                <span>({severityMap[severity].warningRadiusM
                  ? <>{severityMap[severity].warningRadiusM / 1000} km</>
                  : "tanpa peringatan"})</span>
              </li>
            ))}
          </ul>
          <ReportMap reports={activeReports} location={location} onPickLocation={onLocationChange} />
        </Card>
      </section>

      <section aria-labelledby="list-heading">
        <h2 id="list-heading" className="mb-3 text-xl font-bold text-slate-900">
          Daftar laporan aktif ({activeReports.length})
        </h2>
        <ReportList reports={activeReports} />
      </section>
    </DashboardLayout>
  );
}
