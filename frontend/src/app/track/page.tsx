"use client";
import {useCallback,useEffect,useRef,useState} from "react";
import Link from "next/link";
import {apiFetch} from "@/lib/api-client";
import {hasNewAcceptance} from "@/lib/tracker-acceptance";
import {EvidenceBadge} from "@/components/ui/EvidenceBadge";
import {DataStatePanel} from "@/components/ui/DataStatePanel";
import {OwnReportActions} from "@/components/OwnReportActions";
import {OfflineDrafts} from "@/components/OfflineDrafts";
import {AppHeader} from "@/components/AppHeader";
import {NavDrawer} from "@/components/NavDrawer";
import {disasterNames} from "@/lib/demo-reports";
import type {Report} from "@/types/report";

export default function TrackPage(){
  const [reports,setReports]=useState<Report[]>([]),[loading,setLoading]=useState(true);
  const [error,setError]=useState<string|null>(null),[updatedAt,setUpdatedAt]=useState<string|null>(null);
  const [message,setMessage]=useState(""),[drawer,setDrawer]=useState(false);
  const previous=useRef<Map<string,Report["responder_status"]>|null>(null);
  const load=useCallback(async()=>{
    setLoading(true);try{const data=await apiFetch<Report[]>("/api/my-reports");if(hasNewAcceptance(previous.current,data))setMessage("Laporan Anda diterima responder. Penerimaan belum berarti keberangkatan.");previous.current=new Map(data.map(r=>[r.id,r.responder_status]));setReports(data);setError(null);setUpdatedAt(new Date().toISOString());}catch(cause){setError(cause instanceof Error?cause.message:"Data belum tersedia");}finally{setLoading(false);}
  },[]);
  useEffect(()=>{const first=setTimeout(()=>void load(),0),timer=setInterval(()=>{if(document.visibilityState==="visible")void load();},10000);return()=>{clearTimeout(first);clearInterval(timer);};},[load]);
  return <><AppHeader open={drawer} onMenuClick={()=>setDrawer(true)}/><NavDrawer open={drawer} onClose={()=>setDrawer(false)}/><main className="mx-auto max-w-4xl space-y-5 p-4 pb-24"><Link className="gema-link" href="/">Beranda</Link><h1 className="text-2xl font-bold">Laporan saya</h1><p>Laporan terkait sesi Anda. Menghapus data browser dapat menghilangkan akses sesi anonim.</p><OfflineDrafts/><DataStatePanel loading={loading} error={error} updatedAt={updatedAt} empty={reports.length===0} retry={()=>void load()}/>{message&&<p role="status">{message}</p>}
    {reports.map(report=><article className="gema-card space-y-3" key={report.id}><EvidenceBadge report={report}/><h2 className="text-lg font-bold">{disasterNames[report.type]} — {report.location_label}</h2><p>{report.status==="held"?"Sedang ditinjau; belum ditampilkan kepada warga sekitar.":report.status==="closed"?"Laporan ditutup.":"Laporan tercatat."}</p><p>Respons: {report.responder_status==="ACCEPTED"?"Laporan diterima responder":"Menunggu penerimaan responder"}</p><p className="text-sm">Belum ada informasi keberangkatan/tiba pada prototipe ini.</p><Link className="gema-button-secondary" href={`/report/${report.id}?mine=1`}>Buka detail milik saya</Link><OwnReportActions report={report} onChanged={()=>void load()}/></article>)}
  </main></>;
}
