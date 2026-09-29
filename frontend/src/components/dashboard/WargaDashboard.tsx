"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { MessageCircleQuestion, Plus, Search, SquareMinus, SquarePlus, X } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { Card } from "@/components/ui/Card";
import { NavDrawer } from "@/components/NavDrawer";
import { ReportList } from "@/components/ReportList";
import { ReportMap } from "@/components/ReportMap";
import { ZoneCards } from "@/components/ZoneCards";
import { severityMap, severityOrder, type MapLocation } from "@/lib/demo-reports";
import { useDemoReports } from "@/lib/demo-report-context";
import { apiFetch } from "@/lib/api-client";
import type { Report } from "@/types/report";
import type { ReportMapHandle } from "@/components/ReportMapCanvas";

interface NearbyResponse {
  in_red: boolean;
  nearest_report_id: string | null;
  distance_m: number | null;
}

export function WargaDashboard({
  location,
  locationMessage,
  onLocationChange,
}: {
  location: MapLocation | null;
  locationMessage: string;
  onLocationChange: (location: MapLocation) => void;
}) {
  const { reports, loading, error } = useDemoReports();
  const activeReports = reports.filter((report) => report.status === "active");

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [legendOpen, setLegendOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchMessage, setSearchMessage] = useState("");
  const mapRef = useRef<ReportMapHandle>(null);

  useEffect(() => {
    if (!legendOpen) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setLegendOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [legendOpen]);

  function runSearch() {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return;
    const match = activeReports.find((report) => report.location_label.toLowerCase().includes(query));
    if (match) {
      setSearchMessage("");
      mapRef.current?.flyTo(match.public_lat, match.public_lng);
    } else {
      setSearchMessage(`Tidak ada laporan aktif yang cocok dengan "${searchQuery.trim()}".`);
    }
  }

  // /api/nearby menghitung jarak di server dari koordinat ASLI laporan (bukan yang
  // dibulatkan seperti public_lat/lng), jadi hasilnya dipakai apa adanya, bukan
  // dihitung ulang di klien (PRD §9.2).
  const [nearest, setNearest] = useState<{ report: Report; distance_m: number } | null>(null);
  useEffect(() => {
    if (!location) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reset saat lokasi dihapus.
      setNearest(null);
      return;
    }
    let cancelled = false;
    apiFetch<NearbyResponse>("/api/nearby", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lat: location.lat, lng: location.lng, accuracy_m: location.accuracy_m ?? null }),
    })
      .then((res) => {
        if (cancelled) return;
        const report = res.nearest_report_id
          ? reports.find((item) => item.id === res.nearest_report_id)
          : undefined;
        setNearest(res.in_red && report ? { report, distance_m: res.distance_m ?? 0 } : null);
      })
      .catch(() => {
        if (!cancelled) setNearest(null);
      });
    return () => {
      cancelled = true;
    };
  }, [location, reports]);

  return (
    <div>
      {/* Layar peta penuh, meniru wireframe Figma (node 223-8874). */}
      <div className="relative h-dvh w-full overflow-hidden bg-[#71AAF9]">
        <div className="relative z-20">
          <AppHeader open={drawerOpen} onMenuClick={() => setDrawerOpen(true)} />
        </div>

        {/* z-0 (bukan z-auto) SENGAJA dipasang di sini -- ini "mengurung" z-index internal
            Leaflet (panes/kontrolnya bisa sampai 1000+) dalam stacking context-nya sendiri,
            supaya gak bocor nutupin overlay lain (search bar dll) yang z-index-nya lebih kecil. */}
        <div className="absolute inset-0 top-[95px] z-0">
          <ReportMap ref={mapRef} reports={activeReports} location={location} onPickLocation={onLocationChange} fullBleed />
        </div>

        <form
          role="search"
          onSubmit={(event) => {
            event.preventDefault();
            runSearch();
          }}
          className="absolute left-4 right-[76px] top-[111px] z-10 flex min-h-11 items-center gap-2 rounded-xl border border-white/40 bg-white/60 px-4 backdrop-blur-sm"
        >
          <label htmlFor="cari-area" className="sr-only">Cari area berdasarkan nama laporan</label>
          <input
            id="cari-area"
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Cari area"
            className="min-w-0 flex-1 bg-transparent text-slate-800 placeholder:text-slate-600 focus:outline-none"
          />
          <button type="submit" aria-label="Cari" className="flex min-h-11 min-w-11 items-center justify-center text-slate-700">
            <Search aria-hidden="true" size={20} />
          </button>
        </form>
        {searchMessage && (
          <p role="status" className="absolute left-4 right-[76px] top-[162px] z-10 rounded-lg bg-white/90 px-3 py-2 text-sm text-slate-800">
            {searchMessage}
          </p>
        )}

        {locationMessage && (
          <p role="status" className="absolute left-4 right-16 top-[210px] z-10 rounded-lg bg-white/90 px-3 py-2 text-sm text-slate-800">
            {locationMessage}
          </p>
        )}
        <p className="absolute left-4 top-[170px] z-10 text-xs leading-tight text-white drop-shadow tabular-nums">
          Lat: {location ? location.lat.toFixed(4) : "–"}
          <br />
          Lon: {location ? location.lng.toFixed(4) : "–"}
        </p>

        <div className="absolute right-4 top-[111px] z-10 flex flex-col gap-3">
          <div className="overflow-hidden rounded-lg border border-[#CECECE] bg-white/50 backdrop-blur-sm">
            <button type="button" aria-label="Perbesar peta" onClick={() => mapRef.current?.zoomIn()}
              className="flex min-h-11 min-w-11 items-center justify-center text-slate-800 hover:bg-white/60">
              <SquarePlus aria-hidden="true" size={20} />
            </button>
            <div className="h-px bg-[#B2B2B2]" />
            <button type="button" aria-label="Perkecil peta" onClick={() => mapRef.current?.zoomOut()}
              className="flex min-h-11 min-w-11 items-center justify-center text-slate-800 hover:bg-white/60">
              <SquareMinus aria-hidden="true" size={20} />
            </button>
          </div>
          <button
            type="button"
            onClick={() => setLegendOpen(true)}
            aria-label="Buka info dan legenda"
            aria-haspopup="true"
            aria-expanded={legendOpen}
            className="flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-[#CECECE] bg-white/50 text-slate-800 backdrop-blur-sm hover:bg-white/60"
          >
            <MessageCircleQuestion aria-hidden="true" size={20} />
          </button>
        </div>

        <Link
          href="/report/new"
          className="absolute bottom-20 left-1/2 z-10 flex min-h-11 -translate-x-1/2 items-center gap-2 rounded-lg bg-[#CF0003] px-6 font-semibold text-white shadow-lg hover:bg-red-800"
        >
          Laporkan Bencana
          <Plus aria-hidden="true" size={20} />
        </Link>
      </div>

      <NavDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />

      {/* Info & legenda -- disembunyikan sampai ikon "?" di peta ditekan, supaya
          tampilan awal murni full-map (permintaan tim). Tetap dialog aksesibel
          penuh (bukan cuma disembunyikan pakai CSS) sebagai alternatif teks dari
          peta saat dibuka (PRD §4/§9/§12). */}
      {legendOpen && (
        <button
          type="button"
          aria-label="Tutup info dan legenda"
          onClick={() => setLegendOpen(false)}
          className="fixed inset-0 z-40 bg-black/40"
        />
      )}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Info dan legenda"
        aria-hidden={!legendOpen}
        className={`fixed inset-x-0 bottom-0 z-50 max-h-[85dvh] overflow-y-auto rounded-t-2xl bg-[#F7F6E4] shadow-xl transition-transform duration-200 ${
          legendOpen ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className="sticky top-0 flex justify-end bg-[#F7F6E4] p-2">
          <button
            type="button"
            onClick={() => setLegendOpen(false)}
            aria-label="Tutup"
            tabIndex={legendOpen ? 0 : -1}
            className="flex min-h-11 min-w-11 items-center justify-center rounded-lg text-slate-700 hover:bg-black/5"
          >
            <X aria-hidden="true" size={22} />
          </button>
        </div>

        <div className="space-y-5 px-4 pb-8">
          <h1 className="text-2xl font-bold text-slate-950">GEMA — Beranda Warga</h1>
          <p className="text-slate-700">Laporan warga di sekitar Bandung. Informasi ini belum diverifikasi dan bukan peringatan resmi.</p>

          <nav aria-label="Aksi utama" className="flex flex-wrap gap-3">
            <Link href="/report/new" tabIndex={legendOpen ? 0 : -1} className="inline-flex min-h-11 items-center rounded-lg bg-blue-700 px-4 font-semibold text-white hover:bg-blue-800">
              Buat laporan
            </Link>
            <Link href="/track" tabIndex={legendOpen ? 0 : -1} className="inline-flex min-h-11 items-center rounded-lg border border-slate-400 px-4 font-semibold text-slate-900 hover:bg-slate-100">
              Lacak tanggapan
            </Link>
            <Link href="/hotline" tabIndex={legendOpen ? 0 : -1} className="inline-flex min-h-11 items-center rounded-lg border border-slate-400 px-4 font-semibold text-slate-900 hover:bg-slate-100">
              Hotline
            </Link>
          </nav>

          {loading && <p role="status" className="text-slate-700">Memuat laporan…</p>}
          {error && (
            <p role="alert" className="rounded-lg border border-red-300 bg-red-50 p-4 text-red-900">
              Gagal memuat laporan dari server: {error}
            </p>
          )}

          {location && !nearest && (location.accuracy_m == null || location.accuracy_m <= 100) && (
            <p role="status" className="rounded-lg border border-slate-300 bg-slate-50 p-4 text-slate-800">
              Tidak ada laporan aktif dalam radius perhatian yang dikonfigurasi dari titik pilihan saat ini.
              Kondisi di lapangan tetap perlu diperiksa dari sumber resmi.
            </p>
          )}
          <ZoneCards nearest={nearest} />

          <section aria-label="Legenda tingkat keparahan">
            <Card className="border-slate-200">
              <h2 className="mb-3 font-bold text-slate-900">Tingkat keparahan</h2>
              <ul className="flex flex-wrap gap-2">
                {severityOrder.map((severity) => (
                  <li key={severity} className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm">
                    <span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: severityMap[severity].color }} />
                    <span className="font-semibold text-slate-900">{severityMap[severity].label}</span>
                    <span className="text-slate-600">{severityMap[severity].radiusLabel || "tanpa peringatan"}</span>
                  </li>
                ))}
              </ul>
            </Card>
          </section>

          <section aria-labelledby="list-heading">
            <h2 id="list-heading" className="mb-3 text-xl font-bold text-slate-900">
              Daftar laporan aktif ({activeReports.length})
            </h2>
            <ReportList reports={activeReports} />
          </section>
        </div>
      </div>
    </div>
  );
}
