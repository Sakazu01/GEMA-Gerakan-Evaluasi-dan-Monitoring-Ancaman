"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Menu, MessageCircleQuestion, Plus, Search, SquareMinus, SquarePlus } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { LocationPicker } from "@/components/LocationPicker";
import { NavDrawer } from "@/components/NavDrawer";
import { ReportList } from "@/components/ReportList";
import { ReportMap } from "@/components/ReportMap";
import { ZoneCards } from "@/components/ZoneCards";
import { severityMap, type MapLocation } from "@/lib/demo-reports";
import { useDemoReports } from "@/lib/demo-report-context";
import { apiFetch } from "@/lib/api-client";
import { requestDeviceLocation } from "@/lib/geolocation";
import type { Report } from "@/types/report";
import type { ReportMapHandle } from "@/components/ReportMapCanvas";

interface NearbyResponse {
  in_red: boolean;
  nearest_report_id: string | null;
  distance_m: number | null;
}

export function WargaDashboard({
  location,
  onLocationChange,
}: {
  location: MapLocation | null;
  onLocationChange: (location: MapLocation) => void;
}) {
  const { reports, loading, error } = useDemoReports();
  const activeReports = reports.filter((report) => report.status === "active");

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchMessage, setSearchMessage] = useState("");
  const mapRef = useRef<ReportMapHandle>(null);

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
      body: JSON.stringify({ lat: location.lat, lng: location.lng }),
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
        <header className="relative z-20 flex h-[95px] items-center justify-between bg-[#0D5D3A] px-4">
          <Image src="/gema.svg" alt="GEMA" width={79} height={36} priority />
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label="Buka menu"
            aria-haspopup="true"
            aria-expanded={drawerOpen}
            className="flex min-h-11 min-w-11 items-center justify-center rounded-lg text-white hover:bg-white/10"
          >
            <Menu aria-hidden="true" size={24} />
          </button>
        </header>

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
          className="absolute left-4 right-4 top-[111px] z-10 flex min-h-11 items-center gap-2 rounded-xl border border-white/40 bg-white/60 px-4 backdrop-blur-sm"
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
          <p role="status" className="absolute left-4 right-4 top-[162px] z-10 rounded-lg bg-white/90 px-3 py-2 text-sm text-slate-800">
            {searchMessage}
          </p>
        )}

        <p className="absolute left-4 top-[170px] z-10 text-xs leading-tight text-white drop-shadow">
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
            aria-label="Gunakan lokasi saya"
            onClick={() => requestDeviceLocation(onLocationChange, setSearchMessage)}
            className="flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-[#CECECE] bg-white/50 text-slate-800 backdrop-blur-sm hover:bg-white/60"
          >
            <svg aria-hidden="true" width="20" height="20" viewBox="0 0 20 20" fill="none">
              <circle cx="10" cy="10" r="3" stroke="currentColor" strokeWidth="1.5" />
              <path d="M10 1v3M10 16v3M1 10h3M16 10h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
          <Link
            href="/hotline"
            aria-label="Bantuan dan hotline"
            className="flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-[#CECECE] bg-white/50 text-slate-800 backdrop-blur-sm hover:bg-white/60"
          >
            <MessageCircleQuestion aria-hidden="true" size={20} />
          </Link>
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

      {/* Konten aksesibel di bawah layar peta -- daftar teks, status, dan kartu area
          perhatian tetap harus bisa dipakai penuh tanpa peta (PRD §4/§9). */}
      <div className="mx-auto w-full max-w-6xl space-y-5 px-4 py-6 sm:px-6">
        <h1 className="text-2xl font-bold text-slate-950">GEMA — Beranda Warga</h1>
        <p className="text-slate-700">Laporan warga di sekitar Bandung. Informasi ini belum diverifikasi dan bukan peringatan resmi.</p>

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

        {loading && <p role="status" className="text-slate-700">Memuat laporan…</p>}
        {error && (
          <p role="alert" className="rounded-lg border border-red-300 bg-red-50 p-4 text-red-900">
            Gagal memuat laporan dari server: {error}
          </p>
        )}

        {location && !nearest && (
          <p role="status" className="rounded-lg border border-slate-300 bg-slate-50 p-4 text-slate-800">
            Tidak ada laporan aktif dalam radius perhatian yang dikonfigurasi dari titik pilihan saat ini.
            Kondisi di lapangan tetap perlu diperiksa dari sumber resmi.
          </p>
        )}
        <ZoneCards nearest={nearest} />

        <section aria-label="Legenda tingkat keparahan">
          <ul className="flex flex-wrap gap-3 text-sm text-slate-800">
            {(["rendah", "sedang", "tinggi", "kritis"] as const).map((severity) => (
              <li key={severity} className="flex items-center gap-2">
                <span aria-hidden="true" className="inline-block h-4 w-4 rounded-full border border-slate-400"
                  style={{ backgroundColor: severityMap[severity].color }} />
                <span>{severityMap[severity].label}</span>
                <span>({severityMap[severity].radiusLabel || "tanpa peringatan"})</span>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="list-heading">
          <h2 id="list-heading" className="mb-3 text-xl font-bold text-slate-900">
            Daftar laporan aktif ({activeReports.length})
          </h2>
          <ReportList reports={activeReports} />
        </section>
      </div>
    </div>
  );
}
