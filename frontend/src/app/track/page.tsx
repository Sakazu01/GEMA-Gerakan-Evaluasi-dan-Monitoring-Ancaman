"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { NavDrawer } from "@/components/NavDrawer";
import { Card } from "@/components/ui/Card";
import { apiFetch } from "@/lib/api-client";
import { disasterNames, severityMap } from "@/lib/demo-reports";
import type { Report, ReportStatus } from "@/types/report";

const asset = "/assets/figma/";
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
    <div className="min-h-dvh bg-[#f9ffec] text-[#373737]">
      <header className="flex h-[95px] items-end justify-between bg-[#edffc2] px-4 pb-3">
        <Link href="/" aria-label="GEMA — kembali ke beranda" className="flex min-h-11 items-center">
          <Image src={`${asset}tracker-logo.png`} alt="GEMA" width={77} height={35} className="h-[35px] w-[77px] object-contain" priority />
        </Link>
        <button type="button" aria-label="Buka menu" aria-haspopup="true" aria-expanded={drawerOpen}
          onClick={() => setDrawerOpen(true)} className="flex min-h-11 min-w-11 items-center justify-center rounded-lg">
          <Image src={`${asset}menu.svg`} alt="" width={24} height={24} />
        </button>
      </header>

      <main className="mx-auto max-w-3xl px-4 pb-28 pt-4">
        <h1 className="text-xl font-semibold">Lacak Respons</h1>
        <p className="mt-1 text-sm">Laporan warga dari perangkat ini — belum diverifikasi.</p>
        <label htmlFor="cari-area-tracker" className="sr-only">Cari area atau jenis bencana</label>
        <div className="mt-4 flex min-h-11 items-center gap-2 rounded-xl border border-[#cecece] bg-white/60 px-3">
          <input id="cari-area-tracker" type="search" value={search} onChange={(event) => setSearch(event.target.value)}
            placeholder="Cari area" className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[#676767]" />
          <Image src={`${asset}search.svg`} alt="" width={24} height={24} />
        </div>

        {notice && <p role="status" className="mt-3 text-sm">{notice}</p>}
        {error && <p role="alert" className="mt-4 rounded-lg border border-red-300 bg-red-50 p-3 text-red-900">Gagal memuat laporan: {error}</p>}
        {!reports && !error && <p role="status" className="mt-4">Memuat laporan…</p>}
        {filtered?.length === 0 && (
          <p className="mt-4 text-sm">{search ? "Tidak ada laporan yang cocok dengan pencarian." : "Belum ada laporan dari perangkat ini."}</p>
        )}

        {filtered && filtered.length > 0 && (
          <ul className="mt-4 space-y-2">
            {filtered.map((report) => (
              <li key={report.id}>
                <Card className="!border-[#cecece] !p-3 !shadow-none">
                  <div className="flex flex-wrap items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <h2 className="text-sm font-medium">{report.location_label}</h2>
                      <p className="text-xs text-[#676767]">Laporan warga {report.is_demo && "· DEMO"}</p>
                    </div>
                    <span className="rounded-lg bg-[#ffa288] px-1 py-0.5 text-xs text-black">
                      {disasterNames[report.type].toLocaleUpperCase("id-ID")}
                    </span>
                  </div>

                  <div className="mt-1 flex justify-end">
                    <button type="button" onClick={() => void loadReports()} aria-label={`Perbarui laporan ${report.location_label}`}
                      className="flex min-h-11 min-w-11 items-center justify-center rounded-lg hover:bg-slate-100">
                      <Image src={`${asset}refresh.svg`} alt="" width={20} height={20} />
                    </button>
                    {report.status === "active" && (
                      <>
                        <button type="button" onClick={() => void shareReport(report)} aria-label={`Bagikan laporan ${report.location_label}`}
                          className="flex min-h-11 min-w-11 items-center justify-center rounded-lg hover:bg-slate-100">
                          <Image src={`${asset}share.svg`} alt="" width={20} height={20} className="rotate-90" />
                        </button>
                        <Link href={`/report/${report.id}`} aria-label={`Lihat detail laporan ${report.location_label}`}
                          className="flex min-h-11 min-w-11 items-center justify-center rounded-lg hover:bg-slate-100">
                          <Image src={`${asset}info-circle.svg`} alt="" width={20} height={20} />
                        </Link>
                      </>
                    )}
                  </div>

                  <p className="mt-1 flex items-center gap-1 text-xs font-medium">
                    <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: severityMap[report.severity].color }} />
                    {severityMap[report.severity].label} · {statusText[report.status]}
                  </p>
                  <p className="mt-2 text-xs">{report.ai_summary}</p>
                  <dl className="mt-2 grid grid-cols-[100px_1fr] gap-x-2 gap-y-1 text-xs">
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
                  <p className="mt-2 text-[11px] text-[#676767]">
                    {report.published_at ? "Diterbitkan" : "Dibuat"} {new Date(report.published_at ?? report.created_at).toLocaleString("id-ID", {
                      timeZone: "Asia/Jakarta", dateStyle: "medium", timeStyle: "short",
                    })} WIB
                  </p>

                  <ol aria-label="Tahapan laporan" className="mt-3 grid grid-cols-3 gap-1 text-center text-[11px]">
                    <li><span className="mx-auto flex h-9 w-9 items-center justify-center rounded-full bg-[#cef17b]">1</span><span className="mt-1 block">Laporan dibuat</span></li>
                    <li><span className={`mx-auto flex h-9 w-9 items-center justify-center rounded-full ${report.published_at ? "bg-[#cef17b]" : "bg-slate-200"}`}>2</span><span className="mt-1 block">{report.status === "disputed_hidden" ? "Disembunyikan" : "Diterbitkan"}</span></li>
                    <li><span className={`mx-auto flex h-9 w-9 items-center justify-center rounded-full ${report.help_status === "terlihat" ? "bg-[#cef17b]" : "bg-slate-200"}`}>3</span><span className="mt-1 block">{report.help_status === "terlihat" ? "Bantuan terlihat" : "Menunggu kabar"}</span></li>
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
