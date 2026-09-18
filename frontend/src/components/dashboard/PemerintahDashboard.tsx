"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ClipboardList, Flame, Mountain, TriangleAlert, Waves, type LucideIcon } from "lucide-react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card } from "@/components/ui/Card";
import { apiFetch } from "@/lib/api-client";
import { demoNow, disasterBadge, disasterNames, escalationTarget, severityMap, severityOrder } from "@/lib/demo-reports";
import type { DisasterType, Report, ReportStatus } from "@/types/report";

const statusNames: Record<ReportStatus, string> = {
  draft: "Draf",
  active: "Aktif",
  disputed_hidden: "Disembunyikan setelah sanggahan",
};

const statusColor: Record<ReportStatus, string> = {
  draft: "#64748B",
  active: "#0D5D3A",
  disputed_hidden: "#CF0003",
};

const typeIcon: Record<DisasterType, LucideIcon> = {
  flood: Waves,
  landslide: Mountain,
  fire: Flame,
};

function ProportionRow({
  label, count, max, color, icon: Icon,
}: {
  label: string; count: number; max: number; color: string; icon?: LucideIcon;
}) {
  const pct = max > 0 ? Math.round((count / max) * 100) : 0;
  return (
    <div>
      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="flex items-center gap-2 text-slate-800">
          {Icon && <Icon aria-hidden="true" size={15} className="shrink-0" style={{ color }} />}
          {label}
        </span>
        <span className="font-bold tabular-nums text-slate-950">{count}</span>
      </div>
      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

export function PemerintahDashboard() {
  // Pemerintah HARUS lihat semua laporan yang pernah terbit (termasuk disputed_hidden),
  // bukan cuma feed publik "active" yang dipakai beranda Warga -- lihat PRD §3.
  const [reports, setReports] = useState<Report[]>([]);
  useEffect(() => {
    let cancelled = false;
    apiFetch<Report[]>("/api/reports/all")
      .then((data) => {
        if (!cancelled) setReports(data);
      })
      .catch(() => {
        if (!cancelled) setReports([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const referenceTime = Math.max(demoNow, ...reports.map((report) => new Date(report.created_at).getTime()));
  const recentCount = reports.filter((report) => {
    const age = referenceTime - new Date(report.created_at).getTime();
    return age >= 0 && age <= 24 * 60 * 60 * 1000;
  }).length;

  const byType = (["flood", "landslide", "fire"] as const).map((type) => ({
    type, count: reports.filter((report) => report.type === type).length,
  }));
  const maxType = Math.max(1, ...byType.map((entry) => entry.count));

  const bySeverity = severityOrder.map((severity) => ({
    severity, count: reports.filter((report) => report.severity === severity).length,
  }));
  const maxSeverity = Math.max(1, ...bySeverity.map((entry) => entry.count));

  // "Perlu perhatian" -- fokus monitoring nyata: laporan aktif berkeparahan tinggi/kritis,
  // atau yang sedang disanggah warga. Bukan daftar baru, cuma sorotan dari data yang sama.
  const needsAttention: Report[] = reports.filter((report) =>
    (report.status === "active" && (report.severity === "tinggi" || report.severity === "kritis")) ||
    report.status === "disputed_hidden"
  );

  return (
    <DashboardLayout
      title="Dashboard Pemerintah"
      description="Ringkasan laporan warga untuk pemantauan. Informasi ini belum diverifikasi."
    >
      {/* ponytail: role switcher ini kosmetik (localStorage), belum ada proteksi akses nyata di backend.
          Upgrade path: gate endpoint yang dipakai dashboard ini dengan role asli setelah login dibangun. */}
      <p className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
        Tampilan pemantauan, hanya untuk dibaca. Pilihan peran ini bukan login atau akses resmi pemerintah.
      </p>

      <section aria-label="Statistik laporan" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="border-l-4 border-l-[#0D5D3A]">
          <h2 className="flex items-center gap-2 font-bold text-slate-900">
            <ClipboardList aria-hidden="true" size={18} className="text-[#0D5D3A]" /> Total laporan
          </h2>
          <p className="mt-3 text-4xl font-bold tabular-nums text-slate-950">{reports.length}</p>
          <p className="mt-3 text-sm text-slate-700">
            Dibuat dalam 24 jam terakhir: <strong className="tabular-nums">{recentCount}</strong>
          </p>
        </Card>
        <Card>
          <h2 className="font-bold text-slate-900">Per jenis</h2>
          <div className="mt-3 space-y-3">
            {byType.map(({ type, count }) => (
              <ProportionRow key={type} label={disasterNames[type]} count={count} max={maxType}
                color={disasterBadge[type].bg} icon={typeIcon[type]} />
            ))}
          </div>
        </Card>
        <Card>
          <h2 className="font-bold text-slate-900">Per status</h2>
          <dl className="mt-3 space-y-2">
            {(["draft", "active", "disputed_hidden"] as const).map((status) => (
              <div key={status} className="flex items-center justify-between gap-3">
                <dt className="flex items-center gap-2 text-slate-800">
                  <span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: statusColor[status] }} />
                  {statusNames[status]}
                </dt>
                <dd className="font-bold tabular-nums">{reports.filter((report) => report.status === status).length}</dd>
              </div>
            ))}
          </dl>
        </Card>
        <Card>
          <h2 className="font-bold text-slate-900">Per keparahan</h2>
          <div className="mt-3 space-y-3">
            {bySeverity.map(({ severity, count }) => (
              <ProportionRow key={severity} label={severityMap[severity].label} count={count} max={maxSeverity}
                color={severityMap[severity].color} />
            ))}
          </div>
        </Card>
      </section>

      <section aria-labelledby="attention-heading">
        <h2 id="attention-heading" className="flex items-center gap-2 text-xl font-bold text-slate-950">
          <TriangleAlert aria-hidden="true" size={20} className="text-[#CF0003]" /> Perlu perhatian
        </h2>
        {needsAttention.length === 0 ? (
          <p className="mt-3 rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-700">
            Tidak ada laporan yang butuh perhatian segera saat ini.
          </p>
        ) : (
          <ul className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {needsAttention.map((report) => {
              const disputed = report.status === "disputed_hidden";
              const accent = disputed ? "#CF0003" : severityMap[report.severity].color;
              const tint = disputed ? "#FFD1D1" : severityMap[report.severity].badgeBg;
              const critical = !disputed && report.severity === "kritis";
              return (
                <li key={report.id}>
                  <Link
                    href={`/report/${report.id}`}
                    className="block rounded-lg border-l-4 p-4 shadow-sm transition-shadow hover:shadow-md"
                    style={{ borderLeftColor: accent, background: tint }}
                  >
                    <p className="text-xs font-bold uppercase tracking-wide" style={{ color: critical ? severityMap.kritis.textColor : accent }}>
                      {disputed ? "Disanggah warga" : severityMap[report.severity].label}
                    </p>
                    <p className={critical ? "mt-1 font-semibold text-white" : "mt-1 font-semibold text-slate-900"}>
                      {disasterNames[report.type]} — {report.location_label}
                    </p>
                    <p className={critical ? "mt-1 line-clamp-2 text-sm text-white" : "mt-1 line-clamp-2 text-sm text-slate-700"}>{report.ai_summary}</p>
                    <p className={critical ? "mt-2 border-t border-white/30 pt-2 text-xs font-medium text-white" : "mt-2 border-t border-black/10 pt-2 text-xs font-medium text-slate-600"}>
                      Target eskalasi: {escalationTarget[report.severity]}
                    </p>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section aria-labelledby="all-reports-heading">
        <Card>
          <h2 id="all-reports-heading" className="text-xl font-bold text-slate-950">
            Semua laporan ({reports.length})
          </h2>
          <p className="mt-1 text-sm text-slate-700">
            Termasuk laporan yang disembunyikan setelah sanggahan. Tabel ini hanya untuk dibaca — klik nama laporan untuk lihat detail lengkap.
          </p>
          <ul className="mt-4 grid gap-3 lg:grid-cols-2">
            {reports.map((report) => {
              const TypeIcon = typeIcon[report.type];
              return (
                <li key={report.id}>
                  <Link
                    href={`/report/${report.id}`}
                    className="block rounded-lg border-l-4 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
                    style={{ borderLeftColor: severityMap[report.severity].color }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span className="flex items-center gap-2 font-semibold text-slate-900">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full" style={{ background: disasterBadge[report.type].bg }}>
                          <TypeIcon aria-hidden="true" size={16} className="text-white" />
                        </span>
                        {disasterNames[report.type]}
                      </span>
                      <span
                        className="shrink-0 rounded-full px-2 py-0.5 text-xs font-bold tabular-nums"
                        style={{ background: severityMap[report.severity].color, color: severityMap[report.severity].textColor }}
                      >
                        {severityMap[report.severity].label}
                      </span>
                    </div>
                    <p className="mt-2 line-clamp-2 text-sm text-slate-700">{report.ai_summary}</p>
                    <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 border-t border-slate-100 pt-3 text-xs text-slate-600">
                      <div className="col-span-2 flex justify-between gap-2">
                        <dt>Lokasi</dt>
                        <dd className="truncate text-right text-slate-900">{report.location_label}</dd>
                      </div>
                      <div className="flex justify-between gap-2">
                        <dt>Status</dt>
                        <dd className="font-semibold" style={{ color: statusColor[report.status] }}>{statusNames[report.status]}</dd>
                      </div>
                      <div className="flex justify-between gap-2">
                        <dt>Sanggahan</dt>
                        <dd className="font-semibold tabular-nums text-slate-900">{report.false_vote_count}</dd>
                      </div>
                      <div className="col-span-2 flex justify-between gap-2">
                        <dt>Dibuat</dt>
                        <dd className="tabular-nums text-slate-900">
                          {new Date(report.created_at).toLocaleString("id-ID", {
                            timeZone: "Asia/Jakarta", dateStyle: "medium", timeStyle: "short",
                          })} WIB
                        </dd>
                      </div>
                    </dl>
                  </Link>
                </li>
              );
            })}
          </ul>
        </Card>
      </section>
    </DashboardLayout>
  );
}
