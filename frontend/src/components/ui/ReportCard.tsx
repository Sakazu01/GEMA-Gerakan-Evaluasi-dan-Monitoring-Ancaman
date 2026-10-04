import Link from "next/link";
import type {Report} from "@/types/report";
import {disasterNames} from "@/lib/demo-reports";
import {EvidenceBadge} from "@/components/ui/EvidenceBadge";
export function ReportCard({report,manage=false,onLocate}:{report:Report;manage?:boolean;onLocate?:(report:Report)=>void}) {
  return <article className={`gema-card space-y-3${onLocate?" cursor-pointer transition-shadow hover:shadow-md":""}`}
    onClick={onLocate?event=>{if(!(event.target as HTMLElement).closest("a,button"))onLocate(report);}:undefined}>
    <EvidenceBadge report={report}/>
    {report.review_requested&&report.verification_status==="confirmed"&&<p className="text-sm text-amber-900">Ada pengamatan atau pengaduan baru yang perlu ditinjau pengelola.</p>}
    <h2 className="text-lg font-bold">{disasterNames[report.type]} — {report.location_label}</h2>
    <p className="text-sm text-slate-700">{report.observed_at?`Diamati ${new Date(report.observed_at).toLocaleString("id-ID",{timeZone:"Asia/Jakarta",dateStyle:"short",timeStyle:"short"})} WIB`:"Waktu pengamatan belum diketahui"}</p>
    <p>{report.ai_summary?`Indikasi dari foto: ${report.ai_summary}`:"Laporan warga; analisis visual belum tersedia."}</p>
    <div className="flex flex-wrap gap-3">
      {onLocate&&<button type="button" className="gema-button" onClick={()=>onLocate(report)}>Lihat di peta</button>}
      <Link className={onLocate?"gema-button-secondary":"gema-button"} href={manage?`/pengelola/${report.id}`:`/report/${report.id}`}>Lihat laporan</Link>
    </div>
  </article>;
}
