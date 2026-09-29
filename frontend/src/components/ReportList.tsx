import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { disasterNames } from "@/lib/demo-reports";
import type { Report } from "@/types/report";

export function ReportList({ reports }: { reports: Report[] }) {
  if (reports.length === 0) {
    return <p className="text-slate-600">Belum ada laporan aktif di area ini.</p>;
  }
  return (
    <ul className="grid gap-3 md:grid-cols-2">
      {reports.map((report) => (
        <li key={report.id}>
          <Card className="h-full border-slate-200">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="font-semibold text-slate-900">{disasterNames[report.type]}</span>
              <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-800">
                Keparahan {report.severity}
              </span>
              {report.is_demo && <span className="font-semibold text-amber-800">DEMO</span>}
            </div>
            <p className="mt-3 text-slate-900">{report.ai_summary}</p>
            <p className="mt-2 text-sm text-slate-700">{report.location_label}</p>
            <p className="mt-1 text-sm text-slate-600">
              Dilaporkan warga · Belum diverifikasi · {report.published_at && new Date(report.published_at).toLocaleString("id-ID", {
                timeZone: "Asia/Jakarta", dateStyle: "medium", timeStyle: "short",
              })} WIB
            </p>
            <Link
              href={`/report/${report.id}`}
              className="mt-3 inline-flex min-h-11 items-center font-semibold text-blue-800 underline underline-offset-2 hover:text-blue-950"
            >
              Lihat detail {disasterNames[report.type].toLowerCase()} di {report.location_label}
            </Link>
          </Card>
        </li>
      ))}
    </ul>
  );
}
