"use client";

import dynamic from "next/dynamic";
import { forwardRef } from "react";
import type { MapLocation } from "@/lib/demo-reports";
import type { Report } from "@/types/report";
import type { DensityPoint, MapMode, ReportMapHandle } from "./ReportMapCanvas";

const MapCanvas = dynamic(() => import("./ReportMapCanvas"), {
  ssr: false,
  loading: () => <div className="flex h-96 items-center justify-center rounded-lg bg-slate-100 text-slate-700">Memuat peta…</div>,
});

export const ReportMap = forwardRef<ReportMapHandle, {
  reports: Report[];
  location: MapLocation | null;
  onPickLocation: (location: MapLocation) => void;
  pickerOnly?: boolean;
  fullBleed?: boolean;
  mode?: MapMode;
  densityPoints?: DensityPoint[] | null;
}>(function ReportMap({ reports, location, onPickLocation, pickerOnly = false, fullBleed = false, mode = "ai", densityPoints = null }, ref) {
  if (fullBleed) {
    return <MapCanvas ref={ref} reports={reports} location={location} onPickLocation={onPickLocation} fullBleed mode={mode} densityPoints={densityPoints} />;
  }
  return (
    <div>
      <MapCanvas ref={ref} reports={reports} location={location} onPickLocation={onPickLocation} mode={mode} densityPoints={densityPoints} />
      <p className="mt-2 text-sm text-slate-600">
        Peta memerlukan koneksi internet untuk menampilkan ubin OpenStreetMap.
        {pickerOnly ? " Klik peta untuk memilih lokasi laporan secara manual." :
          " Semua laporan juga tersedia di daftar teks di bawah. Klik peta untuk memilih titik secara manual."}
      </p>
    </div>
  );
});
