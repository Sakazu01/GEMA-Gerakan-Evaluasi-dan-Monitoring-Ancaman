import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card } from "@/components/ui/Card";

export function PemerintahDashboard() {
  return (
    <DashboardLayout
      title="GEMA — Dashboard Pemerintah"
      description="Statistik laporan dan tabel monitoring (termasuk laporan yang disembunyikan) akan tampil di sini."
    >
      {/* TODO Checkpoint 4: kartu statistik per jenis/status/severity + tabel read-only semua laporan */}
      {/* ponytail: role switcher ini kosmetik (localStorage), belum ada proteksi akses nyata di backend.
          Upgrade path: gate endpoint yang dipakai dashboard ini dengan role asli setelah login dibangun. */}
      <Card>Belum ada konten.</Card>
    </DashboardLayout>
  );
}
