"use client";
import {useEffect,useState,type FormEvent} from "react";
import {apiFetch} from "@/lib/api-client";
import {reportsChanged} from "@/lib/demo-report-context";
import {requestDeviceLocation} from "@/lib/geolocation";
import type {MapLocation} from "@/lib/demo-reports";

type Choice="seen"|"not_observed";

export function ObservationForm({reportId,onSaved}:{reportId:string;onSaved:()=>void}) {
  const [value,setValue]=useState<Choice>("seen");
  const [note,setNote]=useState("");
  const [location,setLocation]=useState<MapLocation|null>(null);
  const [error,setError]=useState("");
  const [message,setMessage]=useState("");
  const [busy,setBusy]=useState(false);
  const [loading,setLoading]=useState(true);
  const [exists,setExists]=useState(false);
  useEffect(()=>{
    let alive=true;
    apiFetch<{value:Choice;note:string|null}|null>(`/api/reports/${reportId}/observation`).then(old=>{if(!alive||!old)return;setValue(old.value);setNote(old.note||"");setExists(true);}).catch(cause=>{if(alive)setError(cause instanceof Error?cause.message:"Pilihan sebelumnya belum dapat dimuat");}).finally(()=>{if(alive)setLoading(false);});
    return()=>{alive=false;};
  },[reportId]);
  function locate(){requestDeviceLocation(next=>{setLocation(next);setMessage(next.accuracy_m&&next.accuracy_m>100?"Akurasi belum memenuhi syarat 100 meter. Pindah ke area terbuka lalu perbarui.":"Lokasi memenuhi pemeriksaan awal. Anda dapat mengirim tanggapan.");},setMessage);}
  async function save(event:FormEvent){
    event.preventDefault();setError("");setMessage("");
    if(!location||location.source!=="device"||location.accuracy_m==null||!location.measured_at){setError("Perbarui lokasi perangkat sebelum memberikan tanggapan.");return;}
    setBusy(true);
    try{
      const result=await apiFetch<{confirm_count:number;false_count:number;community_disputed:boolean}>(`/api/reports/${reportId}/observation`,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({
        value,source:"direct",observed_at:new Date().toISOString(),note:note.trim()||null,at_report_location:true,
        observer_location:{lat:location.lat,lng:location.lng,accuracy_m:location.accuracy_m,measured_at:location.measured_at},
      })});
      setExists(true);setMessage(result.community_disputed?"Tanggapan tersimpan. Laporan kini ditandai diragukan dan petugas menerima pembaruan.":`Tanggapan tersimpan. ${result.confirm_count} Konfirmasi dan ${result.false_count} Palsu memenuhi syarat lokasi.`);reportsChanged();onSaved();
    }catch(cause){setError(cause instanceof Error?cause.message:"Tanggapan belum dapat disimpan");}finally{setBusy(false);}
  }
  async function withdraw(){setBusy(true);setError("");try{await apiFetch(`/api/reports/${reportId}/observation`,{method:"DELETE"});setExists(false);setMessage("Tanggapan dicabut.");reportsChanged();onSaved();}catch(cause){setError(cause instanceof Error?cause.message:"Gagal mencabut tanggapan");}finally{setBusy(false);}}
  return <form onSubmit={save} className="gema-card space-y-4">
    <fieldset disabled={loading||busy} className="space-y-4"><legend className="text-lg font-bold">Verifikasi keadaan di sekitar laporan</legend>
      <p className="text-sm text-slate-700">Berikan tanggapan berdasarkan pemeriksaan langsung. Jangan mendekati lokasi berbahaya.</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className={`cursor-pointer rounded-lg border p-4 ${value==="seen"?"border-emerald-600 bg-emerald-50":"border-slate-300"}`}><input className="mr-2" type="radio" name="observation" checked={value==="seen"} onChange={()=>setValue("seen")}/><strong>Konfirmasi</strong><span className="mt-1 block text-sm">Kejadian benar terlihat atau terkonfirmasi langsung.</span></label>
        <label className={`cursor-pointer rounded-lg border p-4 ${value==="not_observed"?"border-red-600 bg-red-50":"border-slate-300"}`}><input className="mr-2" type="radio" name="observation" checked={value==="not_observed"} onChange={()=>setValue("not_observed")}/><strong>Palsu</strong><span className="mt-1 block text-sm">Setelah diperiksa, kejadian tidak sesuai keadaan di lapangan.</span></label>
      </div>
      <label className="block">Keterangan {value==="not_observed"?"(wajib)":"(opsional)"}<textarea className="gema-input mt-1" required={value==="not_observed"} maxLength={500} value={note} onChange={event=>setNote(event.target.value)}/></label>
      <button type="button" className="gema-button-secondary" onClick={locate}>Perbarui lokasi untuk verifikasi</button>
      {location&&<p className="text-sm">Lokasi perangkat diperiksa oleh server dan tidak ditampilkan kepada publik. Akurasi: sekitar {Math.round(location.accuracy_m||0)} meter.</p>}
      {error&&<p role="alert" className="text-red-800">{error}</p>}{message&&<p role="status">{message}</p>}
      <div className="flex flex-wrap gap-3"><button className="gema-button" disabled={busy||loading}>{busy?"Menyimpan…":exists?"Perbarui tanggapan":"Kirim tanggapan"}</button>{exists&&<button type="button" className="gema-button-secondary" disabled={busy} onClick={withdraw}>Cabut tanggapan</button>}</div>
    </fieldset>
  </form>;
}
