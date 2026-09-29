import type { MapLocation } from "@/lib/demo-reports";

export function requestDeviceLocation(
  onLocation: (location: MapLocation) => void,
  onMessage: (message: string) => void,
) {
  if (!navigator.geolocation) {
    onMessage("Perangkat ini tidak mendukung lokasi. Pilih titik secara manual di peta.");
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (position) => {
      const accuracy = position.coords.accuracy;
      onLocation({
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        label: "Lokasi perangkat (perkiraan)",
        source: "device",
        accuracy_m: accuracy,
      });
      onMessage(accuracy > 100
        ? "Akurasi lokasi sekitar " + Math.round(accuracy) + " m. Periksa titik di peta sebelum menggunakannya."
        : "");
    },
    (error) => {
      onMessage(error.code === 1
        ? "Izin lokasi ditolak. Izinkan lokasi untuk localhost di browser, lalu muat ulang halaman."
        : "Lokasi perangkat belum tersedia. Periksa layanan lokasi, muat ulang halaman, atau pilih titik di peta.");
    },
    { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
  );
}
