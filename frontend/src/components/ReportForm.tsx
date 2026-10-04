"use client";
import {useEffect,useMemo,useRef,useState,type FormEvent} from "react";
import Link from "next/link";
import {AppHeader} from "@/components/AppHeader";
import {NavDrawer} from "@/components/NavDrawer";
import {ReportMap} from "@/components/ReportMap";
import {ApiError} from "@/lib/api-client";
import {requestDeviceLocation} from "@/lib/geolocation";
import {preparePhoto} from "@/lib/photo";
import {deleteLocalDraft,listLocalDrafts,saveLocalDraft,submitLocalDraft,type LocalDraft} from "@/lib/offline-drafts";
import {disasterNames,type MapLocation} from "@/lib/demo-reports";
import type {DisasterType,DraftAnalysis} from "@/types/report";

function observedNow(){return new Date().toISOString();}

export function ReportForm(){
  const [id,setId]=useState(()=>crypto.randomUUID());
  const [createdAt,setCreatedAt]=useState(observedNow);
  const [photo,setPhoto]=useState<File|null>(null);
  const [photoCapturedAt,setPhotoCapturedAt]=useState<string|undefined>();
  const [type,setType]=useState<DisasterType>("fire");
  const [location,setLocation]=useState<MapLocation|null>(null);
  const [locationLabel,setLocationLabel]=useState("");
  const [description,setDescription]=useState("");
  const [analysis,setAnalysis]=useState<DraftAnalysis|null>(null);
  const [serverId,setServerId]=useState<string|undefined>();
  const [drawer,setDrawer]=useState(false);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const [canRecreate,setCanRecreate]=useState(false);
  const [message,setMessage]=useState("");
  const [result,setResult]=useState<{id:string;status:string}|null>(null);
  const [cameraOn,setCameraOn]=useState(false);
  const stream=useRef<MediaStream|null>(null);
  const video=useRef<HTMLVideoElement>(null);
  const sending=useRef(false);
  const preview=useMemo(()=>photo?URL.createObjectURL(photo):null,[photo]);

  useEffect(()=>()=>{if(preview)URL.revokeObjectURL(preview);},[preview]);
  useEffect(()=>()=>stream.current?.getTracks().forEach(track=>track.stop()),[]);
  useEffect(()=>{requestDeviceLocation(chooseLocation,setMessage);},[]);
  useEffect(()=>{
    const draftId=new URLSearchParams(window.location.search).get("draft");
    if(!draftId)return;
    let alive=true;
    listLocalDrafts().then(all=>{
      const saved=all.find(item=>item.id===draftId);if(!alive||!saved)return;
      setId(saved.id);setCreatedAt(saved.createdAt);setType(saved.type);setLocation(saved.location);
      setLocationLabel(saved.locationLabel);setDescription(saved.description);setServerId(saved.serverId);setAnalysis(saved.analysis||null);
      if(saved.photo&&saved.photoSource==="camera"){setPhoto(saved.photo);setPhotoCapturedAt(saved.photoCapturedAt);setMessage("Draft kamera dibuka. Periksa lokasi sebelum mengirim.");}
      else setMessage("Draft lama tidak memakai foto kamera langsung. Ambil foto baru untuk melanjutkan.");
    }).catch(cause=>{if(alive)setError(cause instanceof Error?cause.message:"Draft belum dapat dibuka");});
    return()=>{alive=false;};
  },[]);

  function draft(queued=false):LocalDraft{return {id,photo,photoSource:photo?"camera":"none",photoCapturedAt,type,
    observedAt:photoCapturedAt||createdAt,timeKnown:true,location,locationLabel,description,details:null,
    createdAt,updatedAt:observedNow(),queued,serverId,analysis:analysis||undefined};}
  function chooseLocation(next:MapLocation){setLocation(next);setLocationLabel(next.label);}
  async function resetEvidence(){await deleteLocalDraft(id);setId(crypto.randomUUID());setCreatedAt(observedNow());setServerId(undefined);setAnalysis(null);setCanRecreate(false);}
  async function acceptCapturedPhoto(file:File){
    setBusy(true);setError("");
    try{const prepared=await preparePhoto(file);await resetEvidence();setPhoto(prepared);setPhotoCapturedAt(observedNow());setMessage("Foto kamera tersimpan sebagai draft. Tambahkan keterangan jika diperlukan.");}
    catch(cause){setError(cause instanceof Error?cause.message:"Foto kamera belum dapat dibaca");}finally{setBusy(false);}
  }
  async function startCamera(){
    setError("");setMessage("");
    try{stream.current?.getTracks().forEach(track=>track.stop());stream.current=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:"environment"}},audio:false});setCameraOn(true);setTimeout(()=>{if(video.current)video.current.srcObject=stream.current;},0);}
    catch{setError("Kamera belum dapat diakses. Berikan izin kamera lalu coba lagi. GEMA tidak menerima foto dari galeri.");}
  }
  function capture(){
    if(!video.current?.videoWidth){setError("Kamera belum siap. Tunggu sebentar lalu coba lagi.");return;}
    const canvas=document.createElement("canvas");canvas.width=video.current.videoWidth;canvas.height=video.current.videoHeight;
    canvas.getContext("2d")?.drawImage(video.current,0,0);
    canvas.toBlob(blob=>{if(blob)void acceptCapturedPhoto(new File([blob],"kamera-gema.jpg",{type:"image/jpeg",lastModified:Date.now()}));},"image/jpeg",.9);
    stream.current?.getTracks().forEach(track=>track.stop());setCameraOn(false);
  }
  async function retake(){setPhoto(null);setPhotoCapturedAt(undefined);await resetEvidence();await startCamera();}
  async function recreate(){
    setBusy(true);setError("");
    try{const nextId=crypto.randomUUID(),now=observedNow();await saveLocalDraft({...draft(),id:nextId,createdAt:now,updatedAt:now,serverId:undefined,analysis:undefined});setId(nextId);setCreatedAt(now);setServerId(undefined);setAnalysis(null);setCanRecreate(false);await deleteLocalDraft(id);setMessage("Draft baru siap dikirim ulang dengan bukti yang sama.");}
    catch(cause){setError(cause instanceof Error?cause.message:"Draft baru belum dapat dibuat.");}finally{setBusy(false);}
  }
  async function send(event:FormEvent){
    event.preventDefault();if(sending.current)return;
    if(!photo){setError("Ambil foto langsung dari kamera sebelum mengirim laporan.");return;}
    if(!location||!locationLabel.trim()){setError("Lengkapi lokasi kejadian.");return;}
    sending.current=true;setBusy(true);setError("");setMessage("Menyiapkan laporan…");setCanRecreate(false);
    try{const current=draft(true);await saveLocalDraft(current);if(!navigator.onLine){setMessage("Draft kamera tersimpan di perangkat. Buka kembali saat koneksi tersedia untuk mengirim.");return;}setResult(await submitLocalDraft(current,true,setMessage));}
    catch(cause){setError(cause instanceof Error?cause.message:"Laporan belum terkirim. Draft perangkat tetap tersedia.");setCanRecreate(cause instanceof ApiError&&["report_not_found","draft_expired"].includes(cause.code||""));try{const retained=(await listLocalDrafts()).find(item=>item.id===id);if(retained){setServerId(retained.serverId);setAnalysis(retained.analysis||null);}}catch{/* Keep original error. */}}
    finally{sending.current=false;setBusy(false);}
  }

  if(result)return <main className="mx-auto max-w-2xl space-y-4 p-6"><h1 className="text-2xl font-bold">Laporan tercatat</h1><p>ID laporan: <strong>{result.id}</strong></p><p>{result.status==="held"?"Laporan tersimpan dan memerlukan pemeriksaan petugas.":"Status: menunggu petugas menerima laporan."}</p><Link className="gema-button" href="/track">Buka laporan saya</Link><Link className="gema-button-secondary" href="/">Beranda</Link></main>;

  return <div className="min-h-dvh"><AppHeader open={drawer} onMenuClick={()=>setDrawer(true)}/><main className="mx-auto max-w-3xl p-4 pb-24">
    <Link className="gema-link" href="/">Kembali ke peta</Link><h1 className="my-4 text-2xl font-bold">Laporkan bencana</h1>
    <form onSubmit={send} className="space-y-5">
      <p className="rounded-lg border border-amber-300 bg-amber-50 p-4 font-semibold text-amber-950">Harap membuat laporan yang benar dan sesuai dengan keadaan di lapangan. Pelaku yang dengan sengaja membuat laporan palsu dapat dikenai konsekuensi sesuai hukum yang berlaku.</p>
      <section className="gema-card space-y-3"><h2 className="text-lg font-bold">1. Ambil foto kejadian</h2><p className="text-sm text-slate-700">Foto wajib diambil langsung dari kamera. Tidak tersedia pilihan galeri.</p>
        <video ref={video} autoPlay playsInline muted className={cameraOn?"max-h-96 w-full rounded-lg bg-black object-contain":"hidden"}/>
        {preview&&photo&&!cameraOn&&(
          // eslint-disable-next-line @next/next/no-img-element -- local camera preview.
          <img src={preview} alt="Pratinjau foto kamera" className="max-h-96 w-full rounded-lg object-contain"/>
        )}
        {!photo&&<button type="button" className="gema-button" disabled={busy} onClick={cameraOn?capture:startCamera}>{cameraOn?"Ambil foto":"Buka kamera"}</button>}
        {photo&&<button type="button" className="gema-button-secondary" disabled={busy} onClick={()=>void retake()}>Ambil ulang foto</button>}
      </section>
      <section className="gema-card space-y-4"><h2 className="text-lg font-bold">2. Tambahkan keterangan</h2>
        <label className="block">Jenis kejadian<select className="gema-input mt-1" value={type} onChange={e=>setType(e.target.value as DisasterType)}><option value="fire">Kebakaran</option><option value="flood">Banjir</option><option value="landslide">Tanah longsor</option></select></label>
        <label className="block">Keterangan tambahan (opsional)<textarea className="gema-input mt-1" maxLength={500} rows={4} placeholder="Contoh: api terlihat membesar di sisi timur area" value={description} onChange={e=>setDescription(e.target.value)}/></label>
      </section>
      <section className="gema-card space-y-3"><h2 className="text-lg font-bold">3. Periksa lokasi</h2><button type="button" className="gema-button-secondary" onClick={()=>requestDeviceLocation(chooseLocation,setMessage)}>Perbarui lokasi perangkat</button><ReportMap reports={[]} location={location} onPickLocation={chooseLocation} pickerOnly/><label className="block">Nama area<input className="gema-input mt-1" required maxLength={100} value={locationLabel} onChange={e=>setLocationLabel(e.target.value)}/></label></section>
      <section className="gema-card space-y-2"><h2 className="font-bold">Ringkasan</h2><p>{disasterNames[type]} di {locationLabel||"lokasi belum tersedia"}.</p><p className="text-sm">Setelah dikirim, AI akan membaca kondisi foto, membandingkan dengan laporan GEMA, dan mencari bukti kemiripan web jika layanan tersedia. Hasilnya membantu petugas dan bukan vonis otomatis.</p></section>
      {error&&<p role="alert" className="rounded-lg bg-red-50 p-3 text-red-800">{error}</p>}{message&&<p role="status" className="rounded-lg bg-slate-100 p-3">{message}</p>}
      {canRecreate&&<section className="gema-card space-y-3"><p>Periksa <Link className="gema-link" href="/track">Laporan Saya</Link>. Jika belum tercatat, buat draft baru.</p><button type="button" className="gema-button-secondary" disabled={busy} onClick={()=>void recreate()}>Buat draft baru</button></section>}
      <button type="submit" className="gema-button w-full" disabled={busy||!photo}>{busy?"Memproses laporan…":"Laporkan"}</button>
    </form>
  </main><NavDrawer open={drawer} onClose={()=>setDrawer(false)}/></div>;
}
