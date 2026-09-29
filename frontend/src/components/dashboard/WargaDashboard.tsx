"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Layers, LocateFixed, MessageCircleQuestion, Plus, Search, SquareMinus, SquarePlus, X } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { Card } from "@/components/ui/Card";
import { NavDrawer } from "@/components/NavDrawer";
import { ReportList } from "@/components/ReportList";
import { ReportMap } from "@/components/ReportMap";
import { ZoneCards } from "@/components/ZoneCards";
import { severityMap, severityOrder, type MapLocation } from "@/lib/demo-reports";
import { useDemoReports } from "@/lib/demo-report-context";
import { apiFetch } from "@/lib/api-client";
import { requestDeviceLocation } from "@/lib/geolocation";
import type { Report } from "@/types/report";
import type { DensityPoint, MapMode, ReportMapHandle } from "@/components/ReportMapCanvas";

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
  const [mapMode, setMapMode] = useState<MapMode>("ai");
  const [densityPoints, setDensityPoints] = useState<DensityPoint[] | null>(null);
  const [densityError, setDensityError] = useState("");
  const [densityLegendOpen, setDensityLegendOpen] = useState(true);
  const [legendOpen, setLegendOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchMessage, setSearchMessage] = useState("");
  const mapRef = useRef<ReportMapHandle>(null);

  useEffect(() => {
    if (mapMode !== "density" || loading) return;
    let cancelled = false;
    apiFetch<DensityPoint[]>("/api/reports/density")
      .then((points) => { if (!cancelled) setDensityPoints(points); })
      .catch((cause: Error) => { if (!cancelled) setDensityError(cause.message); });
    return () => { cancelled = true; };
  }, [mapMode, loading, reports]);

  useEffect(() => {
    if (!legendOpen) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setLegendOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [legendOpen]);

  function locateMe() {
    requestDeviceLocation(
      (next) => {
        onLocationChange(next);
        mapRef.current?.flyTo(next.lat, next.lng);
      },
      (message) => setSearchMessage(message),
    );
  }

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
          <AppHeader
            open={drawerOpen}
            onMenuClick={() => setDrawerOpen(true)}
            center={
              <form
                role="search"
                onSubmit={(event) => {
                  event.preventDefault();
                  runSearch();
                }}
                className="flex h-11 items-center gap-2 rounded-full bg-white pl-4 pr-1"
              >
                <label htmlFor="cari-area" className="sr-only">Cari area berdasarkan nama laporan</label>
                <Search aria-hidden="true" size={18} className="shrink-0 text-slate-500" />
                <input
                  id="cari-area"
                  type="search"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Cari area, alamat, atau kata kunci..."
                  className="min-w-0 flex-1 bg-transparent text-sm text-slate-800 placeholder:text-slate-500 focus:outline-none"
                />
                <span aria-hidden="true" className="h-5 w-px shrink-0 bg-slate-300" />
                <button type="button" onClick={locateMe} aria-label="Gunakan lokasi perangkat saya"
                  className="flex h-11 w-11 shrink-0 items-center justify-center text-slate-500 hover:text-slate-700">
                  <LocateFixed aria-hidden="true" size={18} />
                </button>
              </form>
            }
          />
        </div>

        {/* z-0 (bukan z-auto) SENGAJA dipasang di sini -- ini "mengurung" z-index internal
            Leaflet (panes/kontrolnya bisa sampai 1000+) dalam stacking context-nya sendiri,
            supaya gak bocor nutupin overlay lain (search bar dll) yang z-index-nya lebih kecil.
            top-0 (bukan reserved offset) -- header sekarang melayang (z-20) DI ATAS peta,
            bukan mendorong peta ke bawah, supaya peta kelihatan penuh di balik sudut header. */}
        <div className="absolute inset-0 z-0">
          <ReportMap ref={mapRef} reports={activeReports} location={location} onPickLocation={onLocationChange} fullBleed mode={mapMode} densityPoints={densityPoints} />
        </div>

        {searchMessage && (
          <p role="status" className="absolute left-4 right-[76px] top-[111px] z-10 rounded-lg bg-white/90 px-3 py-2 text-sm text-slate-800">
            {searchMessage}
          </p>
        )}

        {/* stackOffset: searchMessage duduk di top-111 juga (di atas), jadi semua yang
            di bawahnya digeser turun kalau searchMessage sedang tampil -- kalau tidak,
            Lat/Lon dan locationMessage numpuk tepat di belakang kotak pesan pencarian. */}
        <p className={`absolute left-4 z-10 text-xs leading-tight text-white drop-shadow tabular-nums ${searchMessage ? "top-[203px]" : "top-[111px]"}`}>
          Lat: {location ? location.lat.toFixed(4) : "–"}
          <br />
          Lon: {location ? location.lng.toFixed(4) : "–"}
        </p>
        {locationMessage && (
          <p role="status" className={`absolute left-4 right-16 z-10 rounded-lg bg-white/90 px-3 py-2 text-sm text-slate-800 ${
            mapMode === "density"
              ? (searchMessage ? "top-[425px]" : "top-[335px]")
              : (searchMessage ? "top-[249px]" : "top-[157px]")
          }`}>
            {locationMessage}
          </p>
        )}

        {mapMode === "density" && densityLegendOpen && (
          <div className={`absolute left-4 right-[76px] z-10 rounded-xl bg-white/95 px-3 py-2 text-xs text-slate-900 shadow ${searchMessage ? "top-[249px]" : "top-[157px]"}`}>
            <div className="flex items-start justify-between gap-2">
              <p className="font-semibold">Jumlah pelapor dalam radius 50 m · 24 jam terakhir</p>
              <button
                type="button"
                onClick={() => setDensityLegendOpen(false)}
                aria-label="Tutup info kepadatan laporan"
                className="-mr-1 -mt-1 flex min-h-6 min-w-6 shrink-0 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100"
              >
                <X aria-hidden="true" size={14} />
              </button>
            </div>
            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
              {[
                { count: "0", label: "Hijau", color: severityMap.rendah.color },
                { count: "1–2", label: "Kuning", color: severityMap.sedang.color },
                { count: "3–9", label: "Merah", color: severityMap.tinggi.color },
                { count: "10+", label: "Hitam", color: severityMap.kritis.color },
              ].map((item) => (
                <span key={item.count} className="inline-flex items-center gap-1">
                  <span aria-hidden="true" className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                  {item.count} {item.label}
                </span>
              ))}
            </div>
            <p className="mt-1">Laporan warga belum diverifikasi. Ukuran lingkaran mengikuti jumlah pelapor, bukan luas bahaya.</p>
            {densityPoints === null && !densityError && <p role="status" className="mt-1">Memuat kepadatan…</p>}
            {densityError && <p role="alert" className="mt-1 text-red-800">Gagal memuat kepadatan: {densityError}</p>}
          </div>
        )}

        <div className="absolute right-4 top-[111px] z-10 flex flex-col gap-2">
          <div className="overflow-hidden rounded-2xl bg-white shadow-md">
            <button type="button" aria-label="Perbesar peta" onClick={() => mapRef.current?.zoomIn()}
              className="flex min-h-11 min-w-11 items-center justify-center text-slate-800 hover:bg-slate-100">
              <SquarePlus aria-hidden="true" size={20} />
            </button>
            <div className="h-px bg-slate-200" />
            <button type="button" aria-label="Perkecil peta" onClick={() => mapRef.current?.zoomOut()}
              className="flex min-h-11 min-w-11 items-center justify-center text-slate-800 hover:bg-slate-100">
              <SquareMinus aria-hidden="true" size={20} />
            </button>
          </div>
          <button
            type="button"
            aria-pressed={mapMode === "density"}
            aria-label={mapMode === "ai" ? "Tampilkan mode kepadatan laporan" : "Tampilkan mode analisis AI"}
            onClick={() => {
              if (mapMode === "ai") {
                setMapMode("density");
                setDensityPoints(null);
                setDensityError("");
                setDensityLegendOpen(true);
              } else {
                setMapMode("ai");
              }
            }}
            className={`flex min-h-11 min-w-11 items-center justify-center rounded-2xl shadow-md ${
              mapMode === "density" ? "bg-[#0D5D3A] text-white" : "bg-white text-slate-800 hover:bg-slate-100"
            }`}
          >
            <Layers aria-hidden="true" size={20} />
          </button>
          <button
            type="button"
            onClick={() => setLegendOpen(true)}
            aria-label="Buka info dan legenda"
            aria-haspopup="true"
            aria-expanded={legendOpen}
            className="flex min-h-11 min-w-11 items-center justify-center rounded-2xl bg-white text-slate-800 shadow-md hover:bg-slate-100"
          >
            <MessageCircleQuestion aria-hidden="true" size={20} />
          </button>
        </div>

        <Link
          href="/report/new"
          className="absolute bottom-20 left-1/2 z-10 flex min-h-11 -translate-x-1/2 items-center gap-2 rounded-full bg-[#CF0003] px-6 font-semibold text-white shadow-lg hover:bg-red-800"
        >
          <AlertTriangle aria-hidden="true" size={18} />
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

          <section aria-label="Legenda kepadatan laporan" className={mapMode === "density" ? "" : "hidden"}>
            <Card className="border-slate-200">
              <h2 className="mb-2 font-bold text-slate-900">Kepadatan laporan dalam radius 50 m</h2>
              <p className="text-sm text-slate-700">Hijau: 0 pelapor; kuning: 1–2; merah: 3–9; hitam: 10 atau lebih. Perhitungan memakai laporan aktif 24 jam terakhir. Warna ini menunjukkan jumlah pelapor, bukan tingkat keparahan atau batas bahaya.</p>
            </Card>
          </section>
          <section aria-label="Legenda tingkat keparahan">
            <Card className="border-slate-200">
              <h2 className="mb-3 font-bold text-slate-900">Tingkat keparahan hasil AI</h2>
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
