"use client";

import { useState } from "react";
import type { MapLocation } from "@/lib/demo-reports";

export function LocationPicker({
  location,
  onChange,
  forReport = false,
}: {
  location: MapLocation | null;
  onChange: (location: MapLocation) => void;
  forReport?: boolean;
}) {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  function useDeviceLocation() {
    if (!navigator.geolocation) {
      setMessage("Perangkat ini tidak mendukung lokasi. Pilih titik di peta atau gunakan simulasi DEMO.");
      return;
    }
    setLoading(true);
    setMessage("");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLoading(false);
        if (position.coords.accuracy > 100) {
          setMessage("Akurasi lokasi lebih dari 100 m. Pilih titik secara manual di peta.");
          return;
        }
        onChange({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          label: "Lokasi perangkat (perkiraan)",
          source: "device",
        });
      },
      () => {
        setLoading(false);
        setMessage("Lokasi tidak tersedia atau izin ditolak. Pilih titik di peta atau gunakan simulasi DEMO.");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  }

  return (
    <div>
      <p className="font-semibold text-slate-900">
        {forReport ? "Lokasi kejadian" : "Periksa area di sekitar Anda"}
      </p>
      <p className="mt-1 text-sm text-slate-700">
        {forReport ? "Pilih perkiraan titik kejadian di peta atau gunakan lokasi perangkat." :
          "Lokasi hanya dipakai sementara di halaman ini. Klik peta untuk memilih titik manual."}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={useDeviceLocation} disabled={loading}
          className="min-h-11 rounded-lg bg-blue-700 px-4 font-semibold text-white hover:bg-blue-800 disabled:opacity-60">
          {loading ? "Mencari lokasi…" : "Gunakan lokasi saya"}
        </button>
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
      {message && <p role="alert" className="mt-2 text-sm font-medium text-amber-900">{message}</p>}
      {location && (
        <p role="status" className="mt-2 text-sm text-slate-800">
          Titik dipilih: {location.label} ({location.lat.toFixed(4)}, {location.lng.toFixed(4)}).
        </p>
      )}
    </div>
  );
}
