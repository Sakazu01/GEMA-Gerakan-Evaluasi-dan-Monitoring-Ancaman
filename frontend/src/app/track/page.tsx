"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Info, RefreshCw, Search, Share2 } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { NavDrawer } from "@/components/NavDrawer";
import { Card } from "@/components/ui/Card";
import { apiFetch } from "@/lib/api-client";
import { disasterBadge, disasterNames, severityMap } from "@/lib/demo-reports";
import type { Report, ReportStatus } from "@/types/report";

const statusText: Record<ReportStatus, string> = {
  draft: "Draf — belum diterbitkan",
  active: "Aktif — tampil di beranda",
  disputed_hidden: "Disembunyikan sementara karena sanggahan warga",
};

export default function TrackPage() {
  const [reports, setReports] = useState<Report[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [notice, setNotice] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);

  const loadReports = useCallback(async () => {
    try {
      const data = await apiFetch<Report[]>("/api/my-reports");
      setReports(data);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Tidak dapat memuat laporan.");
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    apiFetch<Report[]>("/api/my-reports")
      .then((data) => { if (!cancelled) setReports(data); })
      .catch((cause: Error) => { if (!cancelled) setError(cause.message); });
    return () => { cancelled = true; };
  }, []);

  async function shareReport(report: Report) {
    const url = `${window.location.origin}/report/${report.id}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: `Laporan ${disasterNames[report.type]}`, url });
      } else {
        await navigator.clipboard.writeText(url);
        setNotice("Tautan laporan disalin.");
      }
    } catch (cause) {
      if (cause instanceof DOMException && cause.name === "AbortError") return;
      setNotice("Tautan gagal dibagikan. Coba lagi.");
    }
  }

  const filtered = reports?.filter((report) =>
    `${report.location_label} ${disasterNames[report.type]}`.toLocaleLowerCase("id-ID")
      .includes(search.trim().toLocaleLowerCase("id-ID")),
  );

  return (
    <div className="min-h-dvh">
      <AppHeader open={drawerOpen} onMenuClick={() => setDrawerOpen(true)} />

      <main className="mx-auto max-w-3xl px-4 pb-28 pt-6">
        <h1 className="text-xl font-bold text-slate-950">Lacak Respons</h1>
        <p className="mt-1 text-sm text-slate-700">Laporan warga dari perangkat ini — belum diverifikasi.</p>
        <label htmlFor="cari-area-tracker" className="sr-only">Cari area atau jenis bencana</label>
        <div className="mt-4 flex min-h-11 items-center gap-2 rounded-xl border border-slate-300 bg-white px-3">
          <input id="cari-area-tracker" type="search" value={search} onChange={(event) => setSearch(event.target.value)}
            placeholder="Cari area" className="min-w-0 flex-1 bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-500" />
          <Search aria-hidden="true" size={20} className="shrink-0 text-slate-500" />
        </div>

        {notice && <p role="status" className="mt-3 text-sm text-slate-700">{notice}</p>}
        {error && <p role="alert" className="mt-4 rounded-lg border border-red-300 bg-red-50 p-3 text-red-900">Gagal memuat laporan: {error}</p>}
        {!reports && !error && <p role="status" className="mt-4 text-slate-700">Memuat laporan…</p>}
        {filtered?.length === 0 && (
          <p className="mt-4 text-sm text-slate-700">{search ? "Tidak ada laporan yang cocok dengan pencarian." : "Belum ada laporan dari perangkat ini."}</p>
        )}

        {filtered && filtered.length > 0 && (
          <ul className="mt-4 space-y-3">
            {filtered.map((report) => (
              <li key={report.id}>
                <Card className="border-slate-200">
                  <div className="flex flex-wrap items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <h2 className="font-semibold text-slate-900">{report.location_label}</h2>
                      <p className="text-xs text-slate-600">Laporan warga</p>
                    </div>
                    <span
                      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold text-white"
                      style={{ background: disasterBadge[report.type].bg }}
                    >
                      {disasterNames[report.type].toLocaleUpperCase("id-ID")}
                    </span>
                  </div>

                  <div className="mt-1 flex justify-end">
                    <button type="button" onClick={() => void loadReports()} aria-label={`Perbarui laporan ${report.location_label}`}
                      className="flex min-h-11 min-w-11 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100">
                      <RefreshCw aria-hidden="true" size={18} />
                    </button>
                    {report.status === "active" && (
                      <>
                        <button type="button" onClick={() => void shareReport(report)} aria-label={`Bagikan laporan ${report.location_label}`}
                          className="flex min-h-11 min-w-11 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100">
                          <Share2 aria-hidden="true" size={18} />
                        </button>
                        <Link href={`/report/${report.id}`} aria-label={`Lihat detail laporan ${report.location_label}`}
                          className="flex min-h-11 min-w-11 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100">
                          <Info aria-hidden="true" size={18} />
                        </Link>
                      </>
                    )}
                  </div>

                  <p className="mt-1 flex items-center gap-1 text-xs font-medium text-slate-800">
                    <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: severityMap[report.severity].color }} />
                    {severityMap[report.severity].label} · {statusText[report.status]}
                  </p>
                  <p className="mt-2 text-sm text-slate-800">{report.ai_summary}</p>
                  <dl className="mt-2 grid grid-cols-[100px_1fr] gap-x-2 gap-y-1 text-xs text-slate-700">
                    {report.details?.type === "flood" && (
                      <>
                        <dt>Kedalaman air</dt><dd>{report.details.water_depth ?? "Tidak diketahui"}</dd>
                        <dt>Arus</dt><dd>{report.details.current ?? "Tidak diketahui"}</dd>
                      </>
                    )}
                    {report.details?.type === "landslide" && (
                      <><dt>Luas tertutup</dt><dd>{report.details.covered_area_m2 == null ? "Tidak diketahui" : `${report.details.covered_area_m2} m²`}</dd></>
                    )}
                    {report.details?.type === "fire" && (
                      <><dt>Jarak pandang</dt><dd>{report.details.visibility?.replaceAll("_", " ") ?? "Tidak diketahui"}</dd></>
                    )}
                    <dt>Kabar bantuan</dt><dd>{report.help_status === "terlihat" ? "Dilaporkan terlihat oleh warga" : report.help_status === "belum_terlihat" ? "Ada warga yang melaporkan belum terlihat" : "Belum ada konfirmasi warga yang cukup"}</dd>
                  </dl>
                  <p className="mt-2 text-xs text-slate-500">
                    {report.published_at ? "Diterbitkan" : "Dibuat"} {new Date(report.published_at ?? report.created_at).toLocaleString("id-ID", {
                      timeZone: "Asia/Jakarta", dateStyle: "medium", timeStyle: "short",
                    })} WIB
                  </p>

                  <ol aria-label="Tahapan laporan" className="mt-3 grid grid-cols-3 gap-1 text-center text-[11px] text-slate-700">
                    <li>
                      <span className="mx-auto flex h-9 w-9 items-center justify-center rounded-full bg-[#0D5D3A] font-bold text-white">1</span>
                      <span className="mt-1 block">Laporan dibuat</span>
                    </li>
                    <li>
                      <span className={`mx-auto flex h-9 w-9 items-center justify-center rounded-full font-bold ${report.published_at ? "bg-[#0D5D3A] text-white" : "bg-slate-200 text-slate-600"}`}>2</span>
                      <span className="mt-1 block">{report.status === "disputed_hidden" ? "Disembunyikan" : "Diterbitkan"}</span>
                    </li>
                    <li>
                      <span className={`mx-auto flex h-9 w-9 items-center justify-center rounded-full font-bold ${report.help_status === "terlihat" ? "bg-[#0D5D3A] text-white" : "bg-slate-200 text-slate-600"}`}>3</span>
                      <span className="mt-1 block">{report.help_status === "terlihat" ? "Bantuan terlihat" : "Menunggu kabar"}</span>
                    </li>
                  </ol>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </main>
      <NavDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </div>
  );
}
