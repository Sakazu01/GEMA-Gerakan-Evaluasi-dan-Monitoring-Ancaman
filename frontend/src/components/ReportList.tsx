import type {Report} from "@/types/report";
import {ReportCard} from "@/components/ui/ReportCard";
export function ReportList({reports,onLocate}:{reports:Report[];onLocate?:(report:Report)=>void}){return <section aria-label="Daftar laporan" className="grid gap-4 md:grid-cols-2">{reports.map(report=><ReportCard key={report.id} report={report} onLocate={onLocate}/>)}</section>;}
