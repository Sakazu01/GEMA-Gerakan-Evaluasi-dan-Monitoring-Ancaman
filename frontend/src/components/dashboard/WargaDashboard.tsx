import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card } from "@/components/ui/Card";

export function WargaDashboard() {
  return (
    <DashboardLayout
      title="GEMA — Beranda Warga"
      description="Peta sebaran, daftar laporan, dan area perhatian akan tampil di sini."
    >
      {/* TODO Checkpoint 3: <ReportMap/>, <ReportList/>, <ZoneCards/> */}
      <Card>Belum ada konten.</Card>
    </DashboardLayout>
  );
}
