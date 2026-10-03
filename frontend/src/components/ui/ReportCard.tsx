import Link from "next/link";
import type {Report} from "@/types/report";
import {disasterNames} from "@/lib/demo-reports";
import {EvidenceBadge} from "@/components/ui/EvidenceBadge";
export function ReportCard({report,manage=false}:{report:Report;manage?:boolean}) {
  return <article className="gema-card space-y-3">
    <EvidenceBadge report={report}/>
    {report.review_requested&&report.verification_status==="confirmed"&&<p className="text-sm text-amber-900">Ada pengamatan atau pengaduan baru yang perlu ditinjau pengelola.</p>}
    {report.is_demo&&<p className="font-bold text-amber-900">Data simulasi</p>}
    <h2 className="text-lg font-bold">{disasterNames[report.type]} — {report.location_label}</h2>
    <p className="text-sm text-slate-700">{report.observed_at?`Diamati ${new Date(report.observed_at).toLocaleString("id-ID",{timeZone:"Asia/Jakarta",dateStyle:"short",timeStyle:"short"})} WIB`:"Waktu pengamatan belum diketahui"}</p>
    <p>{report.ai_summary?`Indikasi dari foto: ${report.ai_summary}`:"Laporan warga; analisis visual belum tersedia."}</p>
    <Link className="gema-button" href={manage?`/pengelola/${report.id}`:`/report/${report.id}`}>Lihat laporan</Link>
  </article>;
}
