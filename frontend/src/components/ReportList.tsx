import type { Report } from "@/types/report";

// TODO Checkpoint 3: kartu laporan (jenis, keparahan, waktu, status, tombol "Lihat detail").
// Ini jalur akses utama alternatif dari peta — harus tetap berfungsi penuh tanpa peta (PRD §9).
export function ReportList({ reports }: { reports: Report[] }) {
  if (reports.length === 0) {
    return <p className="text-gray-500">Belum ada laporan di area ini.</p>;
  }
  return (
    <ul className="space-y-2">
      {reports.map((r) => (
        <li key={r.id} className="rounded border border-gray-200 p-3">
          {r.ai_summary}
        </li>
      ))}
    </ul>
  );
}
