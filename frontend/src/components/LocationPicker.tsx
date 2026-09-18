"use client";

import type { MapLocation } from "@/lib/demo-reports";

export function LocationPicker({
  location,
  onChange,
  forReport = false,
  message = "",
}: {
  location: MapLocation | null;
  onChange: (location: MapLocation) => void;
  forReport?: boolean;
  message?: string;
}) {
  return (
    <div>
      <p className="font-semibold text-slate-900">
        {forReport ? "Lokasi kejadian" : "Periksa area di sekitar Anda"}
      </p>
      <p className="mt-1 text-sm text-slate-700">
        {forReport
          ? "Lokasi perangkat terisi otomatis. Jika titik kejadian berbeda, pilih titik di peta."
          : "Lokasi perangkat diminta saat halaman dibuka. Klik peta untuk mengubah titik secara manual."}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {forReport ? (
          <button type="button" onClick={() => onChange({
            lat: -6.9215, lng: 107.6072, label: "Titik simulasi Bandung (DEMO)", source: "demo",
          })} className="min-h-11 rounded-lg border border-blue-700 px-4 font-semibold text-blue-800 hover:bg-blue-50">
            Gunakan titik DEMO Bandung
          </button>
        ) : (
          <>
            <button type="button" onClick={() => onChange({
              lat: -6.9215, lng: 107.6072, label: "Simulasi dekat laporan banjir (DEMO)", source: "demo",
            })} className="min-h-11 rounded-lg border border-blue-700 px-4 font-semibold text-blue-800 hover:bg-blue-50">
              Simulasi dekat laporan · DEMO
            </button>
            <button type="button" onClick={() => onChange({
              lat: -6.932, lng: 107.63, label: "Simulasi di luar area perhatian (DEMO)", source: "demo",
            })} className="min-h-11 rounded-lg border border-slate-400 px-4 font-semibold text-slate-800 hover:bg-slate-50">
              Simulasi di luar area · DEMO
            </button>
          </>
        )}
      </div>
      {message && <p role="status" className="mt-2 text-sm font-medium text-amber-900">{message}</p>}
      {location && (
        <p role="status" className="mt-2 text-sm text-slate-800">
          Titik dipilih: {location.label} ({location.lat.toFixed(4)}, {location.lng.toFixed(4)}).
          {location.accuracy_m != null && " Akurasi sekitar ±" + Math.round(location.accuracy_m) + " m."}
        </p>
      )}
    </div>
  );
}
