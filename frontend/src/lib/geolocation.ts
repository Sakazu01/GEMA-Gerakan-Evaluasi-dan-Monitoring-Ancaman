// Dipakai LocationPicker (tombol "Gunakan lokasi saya") dan tombol locate di header peta,
// supaya aturan PRD §9.2 (akurasi >100m dianggap belum cukup) cuma ditulis sekali.
import type { MapLocation } from "@/lib/demo-reports";

export function requestDeviceLocation(
  onLocation: (location: MapLocation) => void,
  onMessage: (message: string) => void,
  onSettled?: () => void,
) {
  if (!navigator.geolocation) {
    onMessage("Perangkat ini tidak mendukung lokasi. Pilih titik di peta atau gunakan simulasi DEMO.");
    onSettled?.();
    return;
  }
  navigator.geolocation.getCurrentPosition(
    (position) => {
      onSettled?.();
      if (position.coords.accuracy > 100) {
        onMessage("Akurasi lokasi lebih dari 100 m. Pilih titik secara manual di peta.");
        return;
      }
      onLocation({
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        label: "Lokasi perangkat (perkiraan)",
        source: "device",
      });
    },
    () => {
      onSettled?.();
      onMessage("Lokasi tidak tersedia atau izin ditolak. Pilih titik di peta atau gunakan simulasi DEMO.");
    },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
  );
}
