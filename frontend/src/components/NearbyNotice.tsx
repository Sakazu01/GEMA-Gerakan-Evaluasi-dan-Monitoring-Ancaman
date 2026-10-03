"use client";
import {useCallback,useEffect,useRef,useState} from "react";
import Link from "next/link";
import {apiFetch} from "@/lib/api-client";
import type {MapLocation} from "@/lib/demo-reports";
import {disasterNames} from "@/lib/demo-reports";
import type {NearbyResult,Report} from "@/types/report";
import {noticeFingerprint,readNoticeDismissals,dismissNotice} from "@/lib/notice-state";
import {EvidenceBadge} from "@/components/ui/EvidenceBadge";
import {DataStatePanel} from "@/components/ui/DataStatePanel";
import {ObservationForm} from "@/components/ObservationForm";

export function NearbyNotice({location}:{location:MapLocation|null}) {
  const [data,setData]=useState<NearbyResult|null>(null);
  const [error,setError]=useState<string|null>(null);
  const [loading,setLoading]=useState(false);
  const [form,setForm]=useState<string|null>(null);
  const [hidden,setHidden]=useState<Record<string,number>>({});
  const [corrections,setCorrections]=useState<{id:string;report:Report|null}[]>([]);
  const previous=useRef<NearbyResult|null>(null);
  const running=useRef(false);
  const refresh=useCallback(async()=>{
    if(!location||running.current)return;
    running.current=true;
    setLoading(true);
    try{
      const result=await apiFetch<NearbyResult>("/api/nearby",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({lat:location.lat,lng:location.lng,accuracy_m:location.accuracy_m??null,measured_at:location.measured_at??null,location_mode:location.source==="device"?"device":"area"})});
      if(result.location_valid){
        const removed=previous.current?.items.filter(old=>!result.items.some(item=>item.report_id===old.report_id))||[];
        for(const item of removed){
          try{
            const report=await apiFetch<Report>(`/api/reports/${item.report_id}`);
            if(report.status==="closed"||report.verification_status==="under_review")setCorrections(old=>[{id:item.report_id,report},...old.filter(c=>c.id!==item.report_id)].slice(0,3));
          }catch(cause){
            if(cause instanceof Error&&"status" in cause&&cause.status===404)setCorrections(old=>[{id:item.report_id,report:null},...old.filter(c=>c.id!==item.report_id)].slice(0,3));
          }
        }
        previous.current=result;
      }
      setHidden(readNoticeDismissals());setData(result);setError(null);
    }catch(cause){setError(cause instanceof Error?cause.message:"Data sekitar belum tersedia");}
    finally{running.current=false;setLoading(false);}
  },[location]);
  useEffect(()=>{
    let stopped=false;
    function poll(){if(!stopped&&document.visibilityState==="visible")void refresh();}
    const first=setTimeout(poll,0),timer=setInterval(poll,30000);
    window.addEventListener("gema:reports-changed",poll);
    return()=>{stopped=true;clearTimeout(first);clearInterval(timer);window.removeEventListener("gema:reports-changed",poll);};
  },[refresh]);
  const items=data?.items.filter(item=>!hidden[noticeFingerprint(item.report)])||[];
  if(!location)return <p className="text-sm text-slate-700">Pilih area pemantauan untuk melihat laporan sekitar.</p>;
  return <section aria-label="Laporan sekitar" className="space-y-3">
    <DataStatePanel loading={loading} error={error} updatedAt={data?.data_as_of} retry={()=>void refresh()}/>
    {corrections.filter(c=>!hidden[c.report?noticeFingerprint(c.report):`unavailable:${c.id}`]).map(c=><article key={c.id} className="gema-card space-y-2" role="status"><h2 className="font-bold">Pembaruan laporan sebelumnya</h2>{c.report?<><EvidenceBadge report={c.report}/><p>{c.report.public_verification_note||"Status laporan berubah. Baca informasi terbaru sebelum menyimpulkan kondisi."}</p><Link className="gema-link" href={`/report/${c.id}`}>Baca pembaruan</Link></>:<p>Laporan sebelumnya tidak lagi tersedia untuk publik. Informasi tersebut perlu ditinjau kembali.</p>}<button className="gema-button-secondary" onClick={()=>setHidden(dismissNotice(c.report?noticeFingerprint(c.report):`unavailable:${c.id}`))}>Tutup pembaruan</button></article>)}
    {data&&!data.location_valid&&!error&&<p className="rounded-lg bg-amber-50 p-3">Lokasi perangkat perlu diperbarui atau akurasinya belum cukup. Pilih area manual bila diperlukan.</p>}
    {!loading&&!error&&data?.location_valid&&data.items.length===0&&<p className="text-sm text-slate-700">Belum ada laporan aktif yang sesuai area ini. Ini bukan jaminan kondisi aman.</p>}
    {items.map(item=><article key={item.report_id} className="gema-card space-y-3">
      <EvidenceBadge report={item.report}/>
      <h2 className="text-lg font-bold">Ada laporan {disasterNames[item.reported_type].toLowerCase()} {data?.location_mode==="device"?"di sekitar lokasi Anda":"di area yang Anda pantau"}</h2>
      <p>Sekitar {item.distance_m} m dari {data?.location_mode==="device"?"perkiraan posisi perangkat":"titik area pilihan"}. Diamati {new Date(item.observed_at).toLocaleString("id-ID",{timeZone:"Asia/Jakarta",timeStyle:"short",dateStyle:"short"})} WIB.</p>
      {error&&<p>Informasi ini adalah data terakhir; belum dapat diperbarui.</p>}
      <div className="flex flex-wrap gap-3"><Link className="gema-button-secondary" href={`/report/${item.report_id}`}>Lihat laporan</Link>{!error&&<button className="gema-button" onClick={()=>setForm(form===item.report_id?null:item.report_id)}>Beri pengamatan</button>}<button className="gema-button-secondary" onClick={()=>setHidden(dismissNotice(noticeFingerprint(item.report)))}>Sembunyikan 30 menit</button></div>
      {form===item.report_id&&!error&&<ObservationForm reportId={item.report_id} onSaved={()=>void refresh()}/>}
    </article>)}
  </section>;
}
