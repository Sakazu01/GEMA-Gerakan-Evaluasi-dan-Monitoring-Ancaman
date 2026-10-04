"use client";
import {useCallback,useEffect,useRef,useState} from "react";
import Link from "next/link";
import {apiFetch,ApiError} from "@/lib/api-client";
import {authClient} from "@/lib/auth";
import {disasterNames} from "@/lib/demo-reports";
import {reportsChanged} from "@/lib/demo-report-context";
import {EvidenceBadge} from "@/components/ui/EvidenceBadge";
import {DataStatePanel} from "@/components/ui/DataStatePanel";
import {ObservationForm} from "@/components/ObservationForm";
import type {Report} from "@/types/report";
import {riskLabels} from "@/lib/report-labels";
import {requestDeviceLocation} from "@/lib/geolocation";

export function ReportDetail({id}:{id:string}) {
  const [report,setReport]=useState<Report|null>(null);
  const [loading,setLoading]=useState(true),[error,setError]=useState<string|null>(null);
  const [updatedAt,setUpdatedAt]=useState<string|null>(null);
  const [own,setOwn]=useState(false),[photo,setPhoto]=useState<string|null>(null);
  const [nearbyDescription,setNearbyDescription]=useState<string|null>(null);
  const [ownContext,setOwnContext]=useState<{description:string|null;risk_flags:string[];photo_unavailable?:boolean}|null>(null);
  const [observe,setObserve]=useState(false),[abuse,setAbuse]=useState(false);
  const [reason,setReason]=useState(""),[category,setCategory]=useState("old_photo");
  const [message,setMessage]=useState(""),[busy,setBusy]=useState(false);
  const requestVersion=useRef(0);
  const load=useCallback(async()=>{
    const version=++requestVersion.current;
    setLoading(true);
    try{
      const mine=new URLSearchParams(window.location.search).get("mine")==="1";setOwn(mine);
      if(mine){const data=await apiFetch<{report:Report;photo_url:string|null;description:string|null;risk_flags:string[];photo_unavailable?:boolean}>(`/api/my-reports/${id}`);if(version!==requestVersion.current)return;setReport(data.report);setPhoto(data.photo_url);setOwnContext(data);}
      else {const data=await apiFetch<Report>(`/api/reports/${id}`);if(version!==requestVersion.current)return;setReport(data);setPhoto(null);setOwnContext(null);}
      setError(null);setUpdatedAt(new Date().toISOString());
    }catch(cause){if(version!==requestVersion.current)return;if(cause instanceof ApiError&&[401,403,404].includes(cause.status)){setReport(null);setPhoto(null);setOwnContext(null);setUpdatedAt(null);}setError(cause instanceof ApiError&&cause.status===404?"Laporan tidak tersedia pada tampilan ini. Pemilik dapat membukanya melalui Laporan Saya.":cause instanceof Error?cause.message:"Data belum dapat dimuat");}finally{if(version===requestVersion.current)setLoading(false);}
  },[id]);
  useEffect(()=>{
    const requestState=requestVersion;
    const changed=()=>{if(document.visibilityState==="visible")void load();};
    const first=setTimeout(changed,0),timer=setInterval(changed,30000);
    window.addEventListener("gema:reports-changed",changed);
    let unsubscribe:(()=>void)|undefined;
    if(new URLSearchParams(window.location.search).get("mine")==="1"){
      try{
        const {data:{subscription}}=authClient().auth.onAuthStateChange(event=>{
          if(event==="SIGNED_OUT"){
            requestVersion.current++;setReport(null);setPhoto(null);setOwnContext(null);setUpdatedAt(null);setLoading(false);
            setError("Sesi berakhir. Masuk kembali untuk membuka laporan Anda.");
          }
        });
        unsubscribe=()=>subscription.unsubscribe();
      }catch{/* The request displays the missing-session error. */}
    }
    return()=>{requestState.current++;clearTimeout(first);clearInterval(timer);window.removeEventListener("gema:reports-changed",changed);unsubscribe?.();};
  },[load]);
  async function complain(){setBusy(true);setMessage("");try{await apiFetch(`/api/reports/${id}/abuse`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({category,reason})});setMessage("Pengaduan tersimpan untuk ditinjau. Laporan tidak dihapus otomatis.");setAbuse(false);reportsChanged();await load();}catch(cause){setMessage(cause instanceof Error?cause.message:"Pengaduan belum tersimpan");}finally{setBusy(false);}}
  function loadNearbyEvidence(){setBusy(true);setMessage("Memeriksa lokasi perangkat…");requestDeviceLocation(async next=>{try{const detail=await apiFetch<{description:string|null;photo_url:string|null;photo_unavailable:boolean}>(`/api/reports/${id}/nearby-evidence`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({lat:next.lat,lng:next.lng,accuracy_m:next.accuracy_m,measured_at:next.measured_at,location_mode:"device"})});setPhoto(detail.photo_url);setNearbyDescription(detail.description);setMessage(detail.photo_unavailable?"Foto belum dapat dimuat.":"Bukti dibuka karena lokasi perangkat berada dalam radius verifikasi.");}catch(cause){setMessage(cause instanceof Error?cause.message:"Bukti sekitar belum dapat dibuka");}finally{setBusy(false);}},value=>{setMessage(value);setBusy(false);});}
  return <main className="mx-auto max-w-3xl space-y-5 p-4 pb-24">
    <Link className="gema-link" href={own?"/track":"/"}>Kembali</Link>
    <DataStatePanel loading={loading} error={error} updatedAt={updatedAt} retry={()=>void load()}/>
    {report?.id===id&&<><section className="gema-card space-y-3"><EvidenceBadge report={report}/><h1 className="text-2xl font-bold">{disasterNames[report.type]} — {report.location_label}</h1>
      <p>{report.observed_at?`Diamati ${new Date(report.observed_at).toLocaleString("id-ID",{timeZone:"Asia/Jakarta",dateStyle:"medium",timeStyle:"short"})} WIB`:"Waktu pengamatan tidak diketahui"}</p>
      <p>{report.ai_summary||"Laporan warga; hasil analisis visual belum tersedia."}</p>
      {report.ai_confidence&&<p className="text-sm">Keyakinan visual: {report.ai_confidence}{report.ai_limitations?` · ${report.ai_limitations}`:""}</p>}
      <p className="text-sm">Pemeriksaan foto: {report.provenance_status==="complete"?`${report.internal_match_count||0} kecocokan GEMA dan ${report.web_match_count||0} kecocokan web tersimpan`:report.provenance_status==="unavailable"?"belum tersedia":"sedang diproses"}.</p>
      <p className="text-sm">Indikasi visual AI: {report.severity||"belum tersedia"}. Ini bukan penilaian risiko resmi atau pembuktian keaslian foto.</p>
      {report.public_verification_note&&<div className="rounded-lg bg-slate-100 p-3"><h2 className="font-bold">Catatan pengelola</h2><p>{report.public_verification_note}</p></div>}
      {report.verified_at&&<p className="text-sm">Konfirmasi pengelola: {new Date(report.verified_at).toLocaleString("id-ID",{timeZone:"Asia/Jakarta"})} WIB</p>}
      {own&&ownContext&&<><p>Keterangan Anda: {ownContext.description||"tidak diisi"}</p>{ownContext.risk_flags.length>0&&<p>Hal yang perlu ditinjau: {ownContext.risk_flags.map(flag=>riskLabels[flag]||flag).join(", ")}. Ini bukan kesimpulan bahwa laporan palsu.</p>}{ownContext.photo_unavailable&&<p>Foto belum dapat dimuat; coba perbarui data.</p>}</>}
      {own&&photo&&(
        // eslint-disable-next-line @next/next/no-img-element -- private expiring owner-only preview.
        <img src={photo} alt="Foto laporan Anda" className="max-h-80 w-full object-contain"/>
      )}
      {!own&&<button className="gema-button-secondary" disabled={busy} onClick={loadNearbyEvidence}>Buka foto dengan verifikasi lokasi 500 m</button>}
      {!own&&nearbyDescription&&<p>Keterangan warga: {nearbyDescription}</p>}
      {!own&&photo&&(
        // eslint-disable-next-line @next/next/no-img-element -- short-lived nearby evidence URL.
        <img src={photo} alt="Foto laporan di sekitar" className="max-h-80 w-full object-contain"/>
      )}
      <p>Status responder: <strong>{report.responder_status==="ACCEPTED"?"Laporan diterima responder":"Menunggu penerimaan responder"}</strong></p>
      <p className="text-sm">Penerimaan tidak berarti responder sudah berangkat atau kejadian sudah diverifikasi.</p>
    </section>
    <section className="gema-card space-y-3"><h2 className="text-lg font-bold">Konfirmasi warga sekitar</h2><p>{report.observation_counts.direct_seen_nearby} Konfirmasi.</p><p>{report.observation_counts.direct_not_observed_nearby} Palsu.</p>
      {report.observation_counts.direct_not_observed_nearby>0&&<p className="font-semibold">Ada pengamatan yang bertentangan. Perlu ditinjau dalam konteks waktu dan lokasi.</p>}
      <p>{report.observation_counts.secondhand} akun memberi informasi dari orang lain; {report.observation_counts.unsure} belum dapat memastikan.</p><p className="text-sm text-slate-700">Angka memakai pengamatan segar yang memenuhi kriteria. Akun bukan jaminan orang unik; jumlah tidak menentukan kebenaran. Pengamatan tanpa lokasi tetap dapat ditinjau pengelola.</p>
    </section>
    {report.status==="active"&&!own&&!error&&<><div className="flex flex-wrap gap-3"><button className="gema-button" onClick={()=>setObserve(!observe)}>Beri pengamatan</button><button className="gema-button-secondary" onClick={()=>setAbuse(!abuse)}>Laporkan masalah informasi</button></div>
      {observe&&<ObservationForm key={id} reportId={id} onSaved={()=>void load()}/>}
      {abuse&&<form className="gema-card space-y-3" onSubmit={e=>{e.preventDefault();void complain();}}><h2 className="font-bold">Pengaduan informasi</h2><label className="block">Masalah<select className="gema-input" value={category} onChange={e=>setCategory(e.target.value)}><option value="old_photo">Foto lama</option><option value="wrong_location">Lokasi tidak sesuai</option><option value="spam">Spam</option><option value="privacy">Privasi</option><option value="other">Lainnya</option></select></label><label className="block">Alasan<textarea className="gema-input" required maxLength={500} value={reason} onChange={e=>setReason(e.target.value)}/></label><button className="gema-button" disabled={busy}>Kirim pengaduan</button></form>}
    </>}
    </>}
    {message&&<p role="status">{message}</p>}<Link className="gema-link" href="/track">Laporan saya</Link>
  </main>;
}
