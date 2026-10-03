import type {Report} from "@/types/report";
import {ReportCard} from "@/components/ui/ReportCard";
export function ReportList({reports}:{reports:Report[]}){return <section aria-label="Daftar laporan" className="grid gap-4 md:grid-cols-2">{reports.map(report=><ReportCard key={report.id} report={report}/>)}</section>;}
