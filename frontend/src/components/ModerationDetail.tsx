"use client";
import {useCallback,useEffect,useRef,useState,type FormEvent} from "react";
import Link from "next/link";
import {apiFetch,ApiError} from "@/lib/api-client";
import {authClient} from "@/lib/auth";
import {reportsChanged} from "@/lib/demo-report-context";
import {EvidenceBadge} from "@/components/ui/EvidenceBadge";
import {DataStatePanel} from "@/components/ui/DataStatePanel";
import type {Report} from "@/types/report";
import {riskLabels} from "@/lib/report-labels";
interface Detail {report:Report;photo_url:string|null;photo_unavailable?:boolean;description:string|null;risk_flags:string[];lat:number;lng:number;
  observations:{value:string;source:string|null;observed_at:string|null;note:string|null;withdrawn_at:string|null;proximity_eligible:boolean}[];
  abuse_reports:{category:string;reason:string;created_at:string}[];audit:{action:string;reason:string;created_at:string}[];
  outbox:{id:string;state:string;channel:string;attempts:number;last_error_code:string|null}[];}
const actions=[{value:"confirm",label:"Konfirmasi dengan bukti"},{value:"release",label:"Lepas sebagai belum dikonfirmasi"},{value:"review",label:"Tinjau kembali"},{value:"hold",label:"Tahan dari publik"},{value:"resolve",label:"Tutup: kejadian selesai"},{value:"refute",label:"Tutup: informasi tidak sesuai"},{value:"expire",label:"Tutup: kedaluwarsa"},{value:"reopen",label:"Buka kembali dengan pengamatan baru"}];
export function ModerationDetail({id}:{id:string}){
  const [data,setData]=useState<Detail|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState<string|null>(null);
  const [updatedAt,setUpdatedAt]=useState<string|null>(null),[action,setAction]=useState("review"),[reason,setReason]=useState(""),[publicNote,setPublicNote]=useState("");
  const [time,setTime]=useState(""),[radius,setRadius]=useState(""),[busy,setBusy]=useState(false),[message,setMessage]=useState("");
  const requestVersion=useRef(0);
  const load=useCallback(async()=>{
    const version=++requestVersion.current;
    setLoading(true);
    setData(previous=>previous?.report.id===id?previous:null);
    try{
      const detail=await apiFetch<Detail>(`/api/moderation/reports/${id}`);
      if(version!==requestVersion.current)return;
      setData(detail);setError(null);setUpdatedAt(new Date().toISOString());
    }catch(cause){
      if(version!==requestVersion.current)return;
      if(cause instanceof ApiError&&[401,403,404].includes(cause.status)){setData(null);setUpdatedAt(null);}
      setError(cause instanceof Error?cause.message:"Detail belum tersedia");
    }finally{if(version===requestVersion.current)setLoading(false);}
  },[id]);
  useEffect(()=>{
    const requestState=requestVersion;
    const timer=setTimeout(()=>void load(),0);
    let unsubscribe: (()=>void)|undefined;
    try{
      const {data:{subscription}}=authClient().auth.onAuthStateChange(event=>{
        if(event==="SIGNED_OUT"){
          requestVersion.current++;setData(null);setUpdatedAt(null);setLoading(false);
          setError("Sesi pengelola berakhir. Masuk kembali untuk meninjau laporan.");
        }
      });
      unsubscribe=()=>subscription.unsubscribe();
    }catch{/* The request displays the missing-session error. */}
    return()=>{clearTimeout(timer);requestState.current++;unsubscribe?.();};
  },[load]);
  function mutationFailed(cause:unknown,fallback:string){
    if(cause instanceof ApiError&&[401,403,404].includes(cause.status)){
      requestVersion.current++;setData(null);setUpdatedAt(null);setLoading(false);setError(cause.message);
    }
    setMessage(cause instanceof Error?cause.message:fallback);
  }
  async function decide(event:FormEvent){event.preventDefault();if(!data)return;setBusy(true);setMessage("");try{await apiFetch(`/api/moderation/reports/${id}/decisions`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action,reason,public_note:publicNote.trim()||null,expected_version:data.report.version,observed_at:time?new Date(time).toISOString():null,awareness_radius_m:radius?Number(radius):null})});setMessage("Keputusan tersimpan dalam audit.");setReason("");reportsChanged();await load();}catch(cause){mutationFailed(cause,"Keputusan gagal disimpan");}finally{setBusy(false);}}
  async function retry(jobId:string){setBusy(true);try{await apiFetch(`/api/moderation/outbox/${jobId}/retry`,{method:"POST"});setMessage("Pengiriman diantrekan ulang. Pesan dapat terduplikasi bila pengiriman sebelumnya sebenarnya berhasil.");await load();}catch(cause){mutationFailed(cause,"Gagal mencoba ulang");}finally{setBusy(false);}}
  return <main className="mx-auto max-w-5xl space-y-5 p-4 pb-24"><Link className="gema-link" href="/pengelola">Antrean pengelola</Link><h1 className="text-2xl font-bold">Tinjauan laporan</h1><DataStatePanel loading={loading} error={error} updatedAt={updatedAt} retry={()=>void load()}/>
    {data?.report.id===id&&<><section className="gema-card space-y-3"><EvidenceBadge report={data.report}/><h2 className="text-lg font-bold">{data.report.location_label}</h2><p>Waktu pengamatan: {data.report.observed_at?new Date(data.report.observed_at).toLocaleString("id-ID",{timeZone:"Asia/Jakarta"})+" WIB":"belum diketahui"}</p><p>Indikasi visual: {data.report.severity||"belum tersedia"}</p><p>{data.report.ai_summary||"Tidak ada hasil visual AI."}</p><p>Keterangan pelapor: {data.description||"tidak diisi"}</p><p>Lokasi privat: {data.lat}, {data.lng}</p><p>Sinyal review: {data.risk_flags.map(flag=>riskLabels[flag]||flag).join(", ")||"tidak ada sinyal tambahan"}</p>
      {data.photo_url&&(
        // eslint-disable-next-line @next/next/no-img-element -- authorized signed private photo URL.
        <img src={data.photo_url} alt="Foto privat untuk peninjauan" className="max-h-96 w-full object-contain"/>
      )}
      {data.photo_unavailable&&<p role="alert">Foto belum dapat dimuat. Data laporan tetap tersedia; coba perbarui foto.</p>}
      <button className="gema-button-secondary" onClick={()=>void load()}>Perbarui data / foto</button>
    </section>
    <section className="gema-card space-y-3"><h2 className="font-bold">Pengamatan dan pengaduan</h2>{data.observations.map((o,i)=><p key={i}>{o.value==="seen"?"Melihat tanda kejadian":o.value==="not_observed"?"Tidak melihat tanda saat berada di lokasi":"Belum tahu"} • {o.source==="direct"?"Langsung":o.source==="secondhand"?"Dari orang lain":"Sumber tidak dinyatakan"} • {o.observed_at?new Date(o.observed_at).toLocaleString("id-ID",{timeZone:"Asia/Jakarta"})+" WIB":"waktu tidak diisi"} • {o.proximity_eligible?"Lokasi perangkat sesuai radius":"Lokasi perangkat belum memenuhi konteks radius"} • {o.note||"tanpa catatan"}{o.withdrawn_at?" (dicabut)":""}</p>)}{data.abuse_reports.map((a,i)=><p key={i}>Pengaduan {a.category}: {a.reason}</p>)}<p className="text-sm">Pertimbangkan sumber, waktu, lokasi, dan hubungan antar pengamatan. Jumlah jawaban bukan bukti tunggal.</p></section>
    <form className="gema-card space-y-4" onSubmit={decide}><h2 className="text-lg font-bold">Keputusan pengelola</h2><label className="block">Tindakan<select className="gema-input" value={action} onChange={e=>setAction(e.target.value)}>{actions.map(a=><option key={a.value} value={a.value}>{a.label}</option>)}</select></label><label className="block">Alasan berdasarkan bukti (privat)<textarea className="gema-input" required minLength={10} maxLength={1000} value={reason} onChange={e=>setReason(e.target.value)}/></label><label className="block">Catatan untuk publik (opsional; tanpa identitas privat)<textarea className="gema-input" maxLength={500} value={publicNote} onChange={e=>setPublicNote(e.target.value)}/></label><label className="block">Waktu pengamatan baru (waktu perangkat; wajib untuk membuka ulang/memperbarui yang kedaluwarsa)<input className="gema-input" type="datetime-local" value={time} onChange={e=>setTime(e.target.value)}/></label><label className="block">Jangkauan informasi override, meter (opsional; bukan batas bahaya)<input className="gema-input" type="number" min={100} max={10000} value={radius} onChange={e=>setRadius(e.target.value)}/></label><p>Keputusan: {actions.find(a=>a.value===action)?.label}. Versi yang ditinjau: {data.report.version}.</p><button className="gema-button" disabled={busy||!!error}>Simpan keputusan dan audit</button></form>
    <section className="gema-card space-y-3"><h2 className="font-bold">Pengiriman ke responder / notifikasi</h2>{data.outbox.map(job=><div key={job.id}><p>{job.channel}: {job.state} • percobaan {job.attempts}</p>{["unknown","failed"].includes(job.state)&&<details><summary className="min-h-11 cursor-pointer">Tinjau pengiriman gagal/tidak diketahui</summary><p>Periksa apakah pesan sudah diterima sebelum mencoba ulang. Pengiriman yang tidak diketahui dapat menghasilkan pesan ganda.</p><button className="gema-button-secondary" disabled={busy||!!error} onClick={()=>void retry(job.id)}>Coba ulang dengan risiko pesan ganda</button></details>}</div>)}</section>
    <section className="gema-card space-y-3"><h2 className="font-bold">Audit</h2>{data.audit.map((item,i)=><p key={i}>{item.created_at} • {item.action}: {item.reason}</p>)}</section>
    </>}{message&&<p role="status">{message}</p>}
  </main>;
}
