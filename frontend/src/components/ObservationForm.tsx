"use client";
import {useEffect,useState,type FormEvent} from "react";
import {apiFetch} from "@/lib/api-client";
import {reportsChanged} from "@/lib/demo-report-context";
import {requestDeviceLocation} from "@/lib/geolocation";
import type {MapLocation} from "@/lib/demo-reports";

function localTime(){const now=new Date();return new Date(now.getTime()-now.getTimezoneOffset()*60000).toISOString().slice(0,16);}
const choices=[{value:"seen",label:"Saya melihat tanda kejadian"},{value:"not_observed",label:"Saya berada di lokasi kejadian dan tidak melihat tanda tersebut"},{value:"unsure",label:"Saya belum tahu / tidak bisa memastikan"}] as const;

export function ObservationForm({reportId,onSaved}:{reportId:string;onSaved:()=>void}) {
  const [value,setValue]=useState<"seen"|"not_observed"|"unsure">("unsure");
  const [source,setSource]=useState("direct");
  const [time,setTime]=useState(localTime);
  const [note,setNote]=useState("");
  const [atLocation,setAtLocation]=useState(false);
  const [location,setLocation]=useState<MapLocation|null>(null);
  const [error,setError]=useState("");
  const [message,setMessage]=useState("");
  const [busy,setBusy]=useState(false);
  const [loading,setLoading]=useState(true);
  const [exists,setExists]=useState(false);
  useEffect(()=>{
    let alive=true;
    apiFetch<{value:typeof value;source:string|null;observed_at:string|null;note:string|null;at_report_location:boolean|null}|null>(`/api/reports/${reportId}/observation`).then(old=>{
      if(!alive||!old)return;setValue(old.value);setSource(old.source||"direct");setNote(old.note||"");setAtLocation(!!old.at_report_location);setExists(true);
      if(old.observed_at){const t=new Date(old.observed_at);setTime(new Date(t.getTime()-t.getTimezoneOffset()*60000).toISOString().slice(0,16));}
    }).catch(cause=>{if(alive)setError(cause instanceof Error?cause.message:"Jawaban sebelumnya belum dapat dimuat");}).finally(()=>{if(alive)setLoading(false);});
    return()=>{alive=false;};
  },[reportId]);
  async function save(event:FormEvent){
    event.preventDefault();setBusy(true);setError("");setMessage("");
    try{
      await apiFetch(`/api/reports/${reportId}/observation`,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({
        value,source:value==="unsure"?null:value==="not_observed"?"direct":source,observed_at:value==="unsure"?null:new Date(time).toISOString(),note:note.trim()||null,
        at_report_location:value==="not_observed"?atLocation:null,
        observer_location:value!=="unsure"&&(value==="not_observed"||source==="direct")&&location?.source==="device"?{lat:location.lat,lng:location.lng,accuracy_m:location.accuracy_m,measured_at:location.measured_at}:null,
      })});
      setExists(true);setMessage("Pengamatan Anda tersimpan. Ini membantu peninjauan laporan.");reportsChanged();onSaved();
    }catch(cause){setError(cause instanceof Error?cause.message:"Pengamatan belum dapat disimpan");}finally{setBusy(false);}
  }
  async function withdraw(){setBusy(true);setError("");try{await apiFetch(`/api/reports/${reportId}/observation`,{method:"DELETE"});setExists(false);setMessage("Pengamatan dicabut.");reportsChanged();onSaved();}catch(cause){setError(cause instanceof Error?cause.message:"Gagal mencabut pengamatan");}finally{setBusy(false);}}
  return <form onSubmit={save} className="gema-card space-y-4">
    {loading&&<p role="status">Memuat pengamatan Anda sebelumnya…</p>}
    <fieldset disabled={loading||busy} className="space-y-4">
    <fieldset><legend className="text-lg font-bold">Apakah Anda mengetahui kondisi di lokasi tersebut?</legend>
      {choices.map(choice=><label key={choice.value} className="flex min-h-11 items-center gap-3 py-2"><input type="radio" name="observation" value={choice.value} checked={value===choice.value} onChange={()=>setValue(choice.value)}/>{choice.label}</label>)}
    </fieldset>
    <p className="text-sm text-slate-700">Tidak perlu mendekati lokasi berbahaya. Tidak melihat tanda bukan berarti laporan palsu.</p>
    {value!=="unsure"&&<>
      {value==="not_observed"?<p>Sumber: pengamatan langsung Anda saat berada di lokasi.</p>:<label className="block">Sumber informasi<select className="gema-input mt-1" value={source} onChange={e=>setSource(e.target.value)}><option value="direct">Melihat langsung</option><option value="secondhand">Informasi dari orang lain</option></select></label>}
      <label className="block">Waktu pengamatan<input className="gema-input mt-1" type="datetime-local" required value={time} onChange={e=>setTime(e.target.value)}/></label>
      {value==="not_observed"&&<label className="flex min-h-11 items-start gap-3"><input className="mt-1" type="checkbox" required checked={atLocation} onChange={e=>setAtLocation(e.target.checked)}/>Saya memang berada di lokasi yang dimaksud pada waktu pengamatan ini.</label>}
      {(value==="not_observed"||source==="direct")&&<><button type="button" className="gema-button-secondary" onClick={()=>requestDeviceLocation(setLocation,setMessage)}>Sertakan perkiraan lokasi perangkat (opsional)</button>
      {location&&<p className="text-sm">Lokasi digunakan untuk konteks pengamatan dan tidak dibuka ke publik.</p>}</>}
    </>}
    <label className="block">Catatan {value==="not_observed"?"(wajib menjelaskan konteks)":"(opsional)"}<textarea className="gema-input mt-1" required={value==="not_observed"} maxLength={500} value={note} onChange={e=>setNote(e.target.value)}/></label>
    {error&&<p role="alert" className="text-red-800">{error}</p>}{message&&<p role="status">{message}</p>}
    <div className="flex flex-wrap gap-3"><button className="gema-button" disabled={busy}>{busy?"Menyimpan…":exists?"Ubah pengamatan":"Simpan pengamatan"}</button>{exists&&<button type="button" className="gema-button-secondary" disabled={busy} onClick={withdraw}>Cabut pengamatan</button>}</div>
    </fieldset>
  </form>;
}
