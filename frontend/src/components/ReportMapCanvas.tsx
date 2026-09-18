"use client";

import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import { disasterNames, heatmapBlurPx, heatmapRadiusPx, isWarningZoneReport, severityMap, type MapLocation } from "@/lib/demo-reports";
import type { Report } from "@/types/report";

const initials = { flood: "B", landslide: "L", fire: "K" };

export default function ReportMapCanvas({
  reports,
  location,
  onPickLocation,
}: {
  reports: Report[];
  location: MapLocation | null;
  onPickLocation: (location: MapLocation) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const onPickRef = useRef(onPickLocation);
  const [heatReady, setHeatReady] = useState(false);

  useEffect(() => {
    onPickRef.current = onPickLocation;
  }, [onPickLocation]);

  useEffect(() => {
    if (!containerRef.current) return;
    const map = L.map(containerRef.current).setView([-6.905, 107.61], 12);
    mapRef.current = map;
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);
    map.on("click", (event: L.LeafletMouseEvent) => {
      onPickRef.current({
        lat: event.latlng.lat,
        lng: event.latlng.lng,
        label: "Titik pilihan di peta (DEMO)",
        source: "map",
      });
    });

    // Leaflet.heat 0.2.0 adalah plugin global L; impor setelah L tersedia di browser.
    Object.assign(window, { L });
    let cancelled = false;
    void import("leaflet.heat").then(() => {
      if (!cancelled) setHeatReady(true);
    });
    return () => {
      cancelled = true;
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const layers = L.layerGroup().addTo(map);
    const active = reports.filter((report) => report.status === "active");
    const recent = active.filter((report) => {
      if (!report.published_at) return false;
      const age = Date.now() - new Date(report.published_at).getTime();
      return age >= 0 && age <= 24 * 60 * 60 * 1000;
    });

    if (heatReady && recent.length >= 3) {
      L.heatLayer(recent.map((report) => [report.public_lat, report.public_lng, 1]), {
        radius: heatmapRadiusPx,
        blur: heatmapBlurPx,
        max: 4,
      }).addTo(layers);
    }

    for (const report of active) {
      const style = severityMap[report.severity];
      if (isWarningZoneReport(report)) {
        L.circle([report.public_lat, report.public_lng], {
          radius: style.warningRadiusM,
          color: style.color,
          weight: 2,
          fillColor: style.color,
          fillOpacity: 0.09,
        }).bindTooltip(
          `${disasterNames[report.type]}: keparahan ${report.severity}, radius perhatian sementara ${style.warningRadiusM / 1000} km. Bukan batas bahaya resmi.`
        ).addTo(layers);
      }

      const icon = L.divIcon({
        className: "gema-report-marker",
        html: `<span class="gema-report-marker__inner" style="background:${style.color};color:${style.textColor}" aria-hidden="true">${initials[report.type]}</span>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });
      const popup = document.createElement("div");
      const title = document.createElement("strong");
      title.textContent = `${disasterNames[report.type]} · Keparahan ${report.severity}`;
      const summary = document.createElement("p");
      summary.textContent = report.ai_summary;
      const label = document.createElement("p");
      label.textContent = `${report.location_label} · Laporan warga, belum diverifikasi`;
      popup.append(title, summary, label);
      L.marker([report.public_lat, report.public_lng], {
        icon,
        title: `${disasterNames[report.type]}, keparahan ${report.severity}, ${report.location_label}`,
      }).bindPopup(popup).addTo(layers);
    }

    if (location) {
      L.circleMarker([location.lat, location.lng], {
        radius: 9,
        color: "#1d4ed8",
        weight: 3,
        fillColor: "#fff",
        fillOpacity: 1,
      }).bindTooltip("Lokasi pilihan Anda (perkiraan)").addTo(layers);
    }
    return () => {
      layers.remove();
    };
  }, [reports, location, heatReady]);

  return (
    <div
      ref={containerRef}
      className="h-96 w-full rounded-lg border border-slate-300"
      role="img"
      aria-label="Peta laporan warga di Bandung. Daftar laporan lengkap tersedia tepat setelah peta."
    />
  );
}
