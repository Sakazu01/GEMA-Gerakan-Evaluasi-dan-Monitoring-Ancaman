"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";

export type Titik = { name: string; city: string; lat: number; lng: number };

const PIN = '<svg width="34" height="34" viewBox="0 0 24 24" aria-hidden="true"><path fill="#0D5D3A" stroke="#fff" stroke-width="1.5" d="M12 2a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7z"/><circle cx="12" cy="9" r="2.6" fill="#fff"/></svg>';

export default function TitikKumpulMap({ points, user }: { points: Titik[]; user: { lat: number; lng: number } | null }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const map = L.map(ref.current, { scrollWheelZoom: false }).setView([-2.5, 118], 5);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);
    const bounds = L.latLngBounds([]);
    for (const point of points) {
      const popup = document.createElement("div");
      const name = document.createElement("strong");
      name.textContent = point.name;
      popup.append(name, document.createElement("br"), document.createTextNode(point.city));
      L.marker([point.lat, point.lng], {
        icon: L.divIcon({ className: "", html: PIN, iconSize: [34, 34], iconAnchor: [17, 34], popupAnchor: [0, -30] }),
        title: point.name,
        alt: point.name,
      }).bindPopup(popup).addTo(map);
      bounds.extend([point.lat, point.lng]);
    }
    if (user) {
      L.circleMarker([user.lat, user.lng], { radius: 8, color: "#fff", weight: 3, fillColor: "#1D4ED8", fillOpacity: 1 })
        .bindTooltip("Lokasi Anda").addTo(map);
      bounds.extend([user.lat, user.lng]);
    }
    if (bounds.isValid()) map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
    return () => { map.remove(); };
  }, [points, user]);

  return <div ref={ref} role="img" aria-label="Peta titik kumpul terdekat. Daftar titik tersedia di bawah peta." className="h-72 w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-100" />;
}
