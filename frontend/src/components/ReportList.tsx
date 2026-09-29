import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { disasterBadge, disasterNames, severityMap } from "@/lib/demo-reports";
import type { Report } from "@/types/report";

export function ReportList({ reports }: { reports: Report[] }) {
  if (reports.length === 0) {
    return <p className="text-slate-600">Belum ada laporan aktif di area ini.</p>;
  }
  return (
    <ul className="space-y-2">
      {reports.map((report) => (
        <li key={report.id}>
          <Link
            href={`/report/${report.id}`}
            className="flex min-h-11 items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition-colors hover:border-slate-300 hover:bg-slate-50"
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- ikon PNG kecil, sama seperti badge di ReportForm. */}
            <img
              src={disasterBadge[report.type].icon}
              alt=""
              width={28}
              height={28}
              className="shrink-0 rounded-full p-1.5"
              style={{ background: disasterBadge[report.type].bg }}
            />
            <span className="min-w-0 flex-1">
              <span className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-slate-900">{disasterNames[report.type]}</span>
                <span
                  className="rounded-full px-2 py-0.5 text-xs font-bold"
                  style={{ background: severityMap[report.severity].color, color: severityMap[report.severity].textColor }}
                >
                  {severityMap[report.severity].label}
                </span>
              </span>
              <span className="mt-0.5 block truncate text-sm text-slate-600">{report.location_label}</span>
            </span>
            <ChevronRight aria-hidden="true" className="shrink-0 text-slate-400" size={20} />
          </Link>
        </li>
      ))}
    </ul>
  );
}
