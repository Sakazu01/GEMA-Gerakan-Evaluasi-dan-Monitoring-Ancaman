"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import L from "leaflet";
import {
  disasterBadge,
  disasterNames,
  helpResponseLabel,
  isWarningZoneReport,
  severityMap,
  severityStatusLabel,
  timeAgoLabel,
  type MapLocation,
} from "@/lib/demo-reports";
import type { Report } from "@/types/report";

const initials = { flood: "B", landslide: "L", fire: "K" };

export type MapMode = "ai" | "density";
export type DensityPoint = { lat: number; lng: number; count: number };

export interface ReportMapHandle {
  zoomIn: () => void;
  zoomOut: () => void;
  flyTo: (lat: number, lng: number) => void;
}

// Perkiraan kasar buat teks "Jarak" di popup saja (bukan penentu in_red -- itu tetap
// dari POST /api/nearby dengan koordinat asli di server, PRD §9.2).
function approxDistanceLabel(from: MapLocation, toLat: number, toLng: number): string {
  const radians = Math.PI / 180;
  const dLat = (toLat - from.lat) * radians;
  const dLng = (toLng - from.lng) * radians;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(from.lat * radians) * Math.cos(toLat * radians) * Math.sin(dLng / 2) ** 2;
  const meters = 2 * 6371000 * Math.asin(Math.sqrt(a));
  return meters < 1000 ? `${Math.round(meters)} m dari Anda` : `${(meters / 1000).toFixed(1)} km dari Anda`;
}

// Popup marker meniru desain Figma "Tool tip detail bencana": header warna sesuai
// keparahan, badge status + jenis bencana, baris detail dari field yang BENAR-BENAR
// ada di skema (bukan field aspirasional Figma seperti "Angin"/"Cuaca" yang belum
// dikumpulkan sistem ini).
function buildReportPopup(report: Report, location: MapLocation | null): HTMLElement {
  const style = severityMap[report.severity];
  const type = disasterBadge[report.type];

  const root = document.createElement("div");
  root.className = "gema-popup";

  const header = document.createElement("div");
  header.className = "gema-popup__header";
  header.style.background = style.color;
  header.style.color = style.textColor;

  // location_label datang dari pengguna (server cuma membatasi panjangnya, bukan
  // isinya) -- pakai textContent, bukan innerHTML, supaya tidak bisa menyuntik HTML.
  const label = document.createElement("strong");
  label.textContent = report.location_label;
  header.appendChild(label);

  const actions = document.createElement("span");
  actions.className = "gema-popup__actions";
  actions.innerHTML = `
    <button type="button" class="gema-popup__action" aria-label="Bagikan laporan ini" data-action="share">
      <img src="/utility_icon/share.png" alt="" width="14" height="14" />
    </button>
    <a href="/report/${report.id}" class="gema-popup__action" aria-label="Lihat detail laporan" data-action="detail">
      <img src="/utility_icon/report.png" alt="" width="14" height="14" />
    </a>`;
  header.appendChild(actions);
  root.appendChild(header);

  // Aksi nyata (bukan dekorasi): bagikan tautan detail. "Lihat detail" pakai <a href>
  // biasa (bukan JS navigation) supaya tetap link asli yang bisa dibuka tab baru dll.
  // stopPropagation supaya klik tidak ikut ditangkap Leaflet (bisa menutup popup/geser peta).
  const detailUrl = `${window.location.origin}/report/${report.id}`;
  header.querySelector('[data-action="share"]')?.addEventListener("click", (event) => {
    event.stopPropagation();
    if (navigator.share) {
      navigator.share({ title: `Laporan ${disasterNames[report.type]}`, url: detailUrl }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(detailUrl).catch(() => {});
    }
  });
  header.querySelector('[data-action="detail"]')?.addEventListener("click", (event) => {
    event.stopPropagation();
  });

  const body = document.createElement("div");
  body.className = "gema-popup__body";

  const badges = document.createElement("div");
  badges.className = "gema-popup__badges";
  badges.innerHTML = `
    <span class="gema-popup__badge" style="background:${style.badgeBg};color:${style.color}">
      <span class="gema-popup__dot" style="background:${style.color}"></span>${severityStatusLabel(report.severity)}
    </span>
    <span class="gema-popup__badge" style="background:${type.bg};color:#FAFAFA">
      <img src="${type.icon}" alt="" width="14" height="14" />${type.label}
    </span>`;
  body.appendChild(badges);

  const rows: [string, string][] = [];
  if (location) {
    rows.push(["Jarak", approxDistanceLabel(location, report.public_lat, report.public_lng)]);
  }
  if (report.details?.type === "flood") {
    rows.push(["Arus air", report.details.current ?? "Tidak tahu"]);
    rows.push(["Kedalaman air", report.details.water_depth ?? "Tidak tahu"]);
  } else if (report.details?.type === "landslide") {
    rows.push(["Luas tertutup", report.details.covered_area_m2 ? `${report.details.covered_area_m2} m²` : "Tidak tahu"]);
  } else if (report.details?.type === "fire") {
    rows.push(["Jarak pandang", report.details.visibility ?? "Tidak tahu"]);
  }
  rows.push(["Respons", helpResponseLabel[report.help_status]]);

  const dl = document.createElement("dl");
  dl.className = "gema-popup__rows";
  for (const [term, desc] of rows) {
    const row = document.createElement("div");
    row.className = "gema-popup__row";
    const dt = document.createElement("dt");
    dt.textContent = term;
    const dd = document.createElement("dd");
    dd.textContent = desc;
    row.append(dt, dd);
    dl.appendChild(row);
  }
  body.appendChild(dl);

  const summary = document.createElement("p");
  summary.className = "gema-popup__summary";
  summary.textContent = report.ai_summary;
  body.appendChild(summary);

  const footer = document.createElement("p");
  footer.className = "gema-popup__footer";
  footer.textContent = report.published_at
    ? timeAgoLabel(report.published_at)
    : "Laporan warga — belum diverifikasi";
  body.appendChild(footer);

  root.appendChild(body);
  return root;
}

const ReportMapCanvas = forwardRef<ReportMapHandle, {
  reports: Report[];
  location: MapLocation | null;
  onPickLocation: (location: MapLocation) => void;
  fullBleed?: boolean;
  mode?: MapMode;
  densityPoints?: DensityPoint[] | null;
}>(function ReportMapCanvas({ reports, location, onPickLocation, fullBleed = false, mode = "ai", densityPoints = null }, ref) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const onPickRef = useRef(onPickLocation);

  useImperativeHandle(ref, () => ({
    zoomIn: () => mapRef.current?.zoomIn(),
    zoomOut: () => mapRef.current?.zoomOut(),
    flyTo: (lat, lng) => mapRef.current?.flyTo([lat, lng], 14),
  }), []);

  useEffect(() => {
    onPickRef.current = onPickLocation;
  }, [onPickLocation]);

  useEffect(() => {
    if (!containerRef.current) return;
    const map = L.map(containerRef.current, { zoomControl: false }).setView([-6.905, 107.61], 12);
    mapRef.current = map;
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);
    L.control.scale({ position: "bottomleft", metric: true, imperial: true }).addTo(map);
    map.on("click", (event: L.LeafletMouseEvent) => {
      onPickRef.current({
        lat: event.latlng.lat,
        lng: event.latlng.lng,
        label: "Titik pilihan di peta",
        source: "map",
      });
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (location?.source === "device") {
      mapRef.current?.flyTo([location.lat, location.lng], 14);
    }
  }, [location]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const layers = L.layerGroup().addTo(map);
    const active = reports.filter((report) => report.status === "active");
    if (mode === "density") {
      if (densityPoints) {
        // Hijau menandai area tanpa laporan dalam data 24 jam yang dimuat.
        L.rectangle([[-85, -180], [85, 180]], {
          stroke: false, fillColor: severityMap.rendah.color, fillOpacity: 0.08, interactive: false,
        }).addTo(layers);
        for (const point of densityPoints) {
          const color = point.count >= 10 ? severityMap.kritis.color
            : point.count >= 3 ? severityMap.tinggi.color : severityMap.sedang.color;
          const size = Math.min(100, 44 + Math.round(9 * Math.sqrt(point.count - 1)));
          const badge = document.createElement("span");
          badge.textContent = String(point.count);
          badge.setAttribute("aria-hidden", "true");
          badge.style.cssText = "display:flex;align-items:center;justify-content:center;border-radius:50%;font-weight:800;border:2px solid white;width:"
            + size + "px;height:" + size + "px;background:" + color + ";color:"
            + (point.count <= 2 ? "#111827" : "#FFFFFF") + ";box-shadow:0 0 "
            + Math.round(size / 2) + "px " + Math.round(size / 4) + "px " + color + "66";
          const label = point.count + " pelapor dalam radius 50 meter. Laporan warga belum diverifikasi.";
          const popup = document.createElement("p");
          popup.textContent = label;
          L.marker([point.lat, point.lng], {
            icon: L.divIcon({ className: "", html: badge, iconSize: [size, size], iconAnchor: [size / 2, size / 2] }),
            title: label,
            alt: label,
          }).bindPopup(popup).addTo(layers);
        }
      }
    } else {
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
            disasterNames[report.type] + ": " + severityStatusLabel(report.severity) + ". Bukan batas bahaya resmi."
          ).addTo(layers);
        }

        const icon = L.divIcon({
          className: "gema-report-marker",
          html: `<span class="gema-report-marker__inner" style="background:${style.color};color:${style.textColor}" aria-hidden="true">${initials[report.type]}</span>`,
          iconSize: [32, 32],
          iconAnchor: [16, 16],
        });
        L.marker([report.public_lat, report.public_lng], {
          icon,
          title: `${disasterNames[report.type]}, ${severityStatusLabel(report.severity)}, ${report.location_label}`,
        }).bindPopup(buildReportPopup(report, location), { minWidth: 260 }).addTo(layers);
      }
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
  }, [reports, location, mode, densityPoints]);

  return (
    <div
      ref={containerRef}
      className={fullBleed ? "h-full w-full" : "h-96 w-full rounded-lg border border-slate-300"}
      role="img"
      aria-label={mode === "density" ? "Peta kepadatan pelapor dalam radius 50 meter. Jumlah ditulis pada tiap lingkaran." : "Peta keparahan laporan warga berdasarkan analisis AI. Daftar laporan tersedia setelah peta."}
    />
  );
});

export default ReportMapCanvas;
