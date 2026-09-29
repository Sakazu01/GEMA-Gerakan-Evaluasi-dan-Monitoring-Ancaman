"use client";

import type { MapLocation } from "@/lib/demo-reports";

export function LocationPicker({
  location,
  message = "",
}: {
  location: MapLocation | null;
  message?: string;
}) {
  return (
    <div>
      <p className="font-semibold text-slate-900">Lokasi kejadian</p>
      <p className="mt-1 text-sm text-slate-700">
        Lokasi perangkat terisi otomatis. Jika titik kejadian berbeda, pilih titik di peta.
      </p>
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
