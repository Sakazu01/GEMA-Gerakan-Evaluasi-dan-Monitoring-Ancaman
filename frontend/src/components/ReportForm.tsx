"use client";
import {useEffect,useRef,useState,type FormEvent} from "react";
import Link from "next/link";
import {AppHeader} from "@/components/AppHeader";
import {NavDrawer} from "@/components/NavDrawer";
import {ReportMap} from "@/components/ReportMap";
import {apiFetch,ApiError} from "@/lib/api-client";
import {requestDeviceLocation} from "@/lib/geolocation";
import {preparePhoto} from "@/lib/photo";
import {deleteLocalDraft,listLocalDrafts,saveLocalDraft,submitLocalDraft,type LocalDraft} from "@/lib/offline-drafts";
import {disasterNames,type MapLocation} from "@/lib/demo-reports";
import type {DisasterType,DraftAnalysis,ReportDetails} from "@/types/report";

function localTime(iso?:string){const now=iso?new Date(iso):new Date();return new Date(now.getTime()-now.getTimezoneOffset()*60000).toISOString().slice(0,16);}

export function ReportForm(){
  const [id,setId]=useState(()=>crypto.randomUUID());
  const [createdAt,setCreatedAt]=useState(()=>new Date().toISOString());
  const [photo,setPhoto]=useState<File|null>(null);
  const [preview,setPreview]=useState<string|null>(null);
  const [source,setSource]=useState<LocalDraft["photoSource"]>("none");
  const [type,setType]=useState<DisasterType>("flood");
  const [time,setTime]=useState(localTime);
  const [known,setKnown]=useState(true);
  const [location,setLocation]=useState<MapLocation|null>(null);
  const [locationLabel,setLocationLabel]=useState("");
  const [description,setDescription]=useState("");
  const [details,setDetails]=useState<ReportDetails|null>(null);
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
  useEffect(()=>{if(!photo)return;const url=URL.createObjectURL(photo);const timer=setTimeout(()=>setPreview(url),0);return()=>{clearTimeout(timer);URL.revokeObjectURL(url);};},[photo]);
  useEffect(()=>()=>stream.current?.getTracks().forEach(track=>track.stop()),[]);
  useEffect(()=>{
    const draftId=new URLSearchParams(window.location.search).get("draft");
    if(!draftId)return;
    let alive=true;
    listLocalDrafts().then(all=>{
      const draft=all.find(d=>d.id===draftId);if(!alive||!draft)return;
      setId(draft.id);setCreatedAt(draft.createdAt);setPhoto(draft.photo);setSource(draft.photoSource);setType(draft.type);
      setTime(draft.observedAt?localTime(draft.observedAt):localTime());setKnown(draft.timeKnown);setLocation(draft.location);
      setLocationLabel(draft.locationLabel);setDescription(draft.description);setDetails(draft.details);setServerId(draft.serverId);setAnalysis(draft.analysis||null);
      setMessage("Draft perangkat dibuka. Periksa kembali waktu dan lokasi sebelum mengirim.");
    }).catch(cause=>{if(alive)setError(cause instanceof Error?cause.message:"Draft belum dapat dibuka");});
    return()=>{alive=false;};
  },[]);
  function draft(queued=false):LocalDraft{return {id,photo,photoSource:source,type,observedAt:known?new Date(time).toISOString():null,timeKnown:known,location,locationLabel,description,details,createdAt,updatedAt:new Date().toISOString(),queued,serverId,analysis:analysis||undefined};}
  function chooseLocation(next:MapLocation){setLocation(next);setLocationLabel(next.label);}
  async function resetEvidence(){
    // A failed submission may already have persisted a remote draft, even if React
    // has not received its ID. Every evidence change therefore gets a fresh ID.
    await deleteLocalDraft(id);setId(crypto.randomUUID());setCreatedAt(new Date().toISOString());
    setServerId(undefined);setAnalysis(null);setCanRecreate(false);
  }
  async function removePhoto(){
    setBusy(true);setError("");
    try{await resetEvidence();setPhoto(null);setPreview(null);setSource("none");}
    catch(cause){setError(cause instanceof Error?cause.message:"Draft belum dapat diperbarui");}
    finally{setBusy(false);}
  }
  async function choosePhoto(file:File,origin:"camera"|"gallery"){
    setBusy(true);setError("");
    try{const prepared=await preparePhoto(file);await resetEvidence();setPhoto(prepared);setSource(origin);}
    catch(cause){setError(cause instanceof Error?cause.message:"Foto belum dapat dibaca");}finally{setBusy(false);}
  }
  async function startCamera(){
    setError("");
    try{stream.current?.getTracks().forEach(track=>track.stop());stream.current=await navigator.mediaDevices.getUserMedia({video:{facingMode:"environment"},audio:false});if(video.current)video.current.srcObject=stream.current;setCameraOn(true);}
    catch{setError("Kamera belum dapat diakses. Berikan izin atau pilih foto yang tersedia.");}
  }
  function capture(){
    if(!video.current?.videoWidth)return;
    const canvas=document.createElement("canvas");canvas.width=video.current.videoWidth;canvas.height=video.current.videoHeight;
    canvas.getContext("2d")?.drawImage(video.current,0,0);
    canvas.toBlob(blob=>{if(blob)void choosePhoto(new File([blob],"kamera.jpg",{type:"image/jpeg"}),"camera");},"image/jpeg",.9);
    stream.current?.getTracks().forEach(track=>track.stop());setCameraOn(false);
  }
  async function save(){setError("");try{await saveLocalDraft(draft());setMessage("Draft tersimpan di perangkat. Belum terkirim.");}catch(cause){setError(cause instanceof Error?cause.message:"Draft gagal disimpan");}}
  async function recreate(){
    setBusy(true);setError("");
    try{
      const nextId=crypto.randomUUID(),now=new Date().toISOString();
      await saveLocalDraft({...draft(),id:nextId,createdAt:now,updatedAt:now,serverId:undefined,analysis:undefined});
      setId(nextId);setCreatedAt(now);setServerId(undefined);setAnalysis(null);setCanRecreate(false);
      await deleteLocalDraft(id);
      setMessage("Draft baru tersimpan di perangkat. Waktu pengamatan asli tetap dipakai. Periksa kembali sebelum mengirim.");
    }catch(cause){setError(cause instanceof Error?cause.message:"Draft baru belum dapat dibuat. Data tetap tersedia.");}
    finally{setBusy(false);}
  }
  async function analyze(){
    setBusy(true);setError("");setMessage("");
    try{
      let current=draft();await saveLocalDraft(current);
      if(!current.serverId){const body=new FormData();body.append("client_id",current.id);if(current.photo)body.append("photo",current.photo,current.photo.name);
        const created=await apiFetch<{draft_id:string}>("/api/reports/drafts",{method:"POST",body});current={...current,serverId:created.draft_id};setServerId(created.draft_id);await saveLocalDraft(current);}
      const output=await apiFetch<DraftAnalysis>(`/api/reports/drafts/${current.serverId}/analyze`,{method:"POST"});setAnalysis(output);
      await saveLocalDraft({...current,analysis:output});setMessage(output.ai_status==="relevant"?"Analisis visual tersedia. Waktu, sumber, dan lokasi tetap perlu diperiksa.":"Analisis tidak memastikan kejadian. Draft tersimpan dan dapat diajukan untuk tinjauan.");
    }catch(cause){setError(cause instanceof Error?cause.message:"Analisis belum tersedia; Anda tetap dapat menyimpan atau mengajukan draft.");}finally{setBusy(false);}
  }
  async function send(event:FormEvent){
    event.preventDefault();if(sending.current)return;
    if(!location||!locationLabel.trim()){setError("Lengkapi lokasi kejadian.");return;}
    sending.current=true;setBusy(true);setError("");setMessage("");setCanRecreate(false);
    try{
      const current=draft(true);await saveLocalDraft(current);
      if(!navigator.onLine){setMessage("Draft tersimpan di perangkat dan menunggu koneksi. Belum terkirim.");return;}
      setResult(await submitLocalDraft(current));
    }catch(cause){
      setError(cause instanceof Error?cause.message:"Laporan belum terkirim. Draft perangkat tetap tersedia untuk dicoba kembali.");
      setCanRecreate(cause instanceof ApiError&&["report_not_found","draft_expired"].includes(cause.code||""));
      // Submission/expiry recovery may have persisted a newer server ID before
      // the final request failed. Keep it for an identical retry in this form.
      try{const retained=(await listLocalDrafts()).find(item=>item.id===id);if(retained){setServerId(retained.serverId);setAnalysis(retained.analysis||null);}}
      catch{/* Preserve the original submission error if local storage is unavailable. */}
    }
    finally{sending.current=false;setBusy(false);}
  }
  if(result)return <main className="mx-auto max-w-2xl space-y-4 p-6"><h1 className="text-2xl font-bold">Laporan tercatat</h1><p>{result.status==="held"?"Laporan tersimpan dan sedang ditinjau. Belum ditampilkan kepada warga sekitar.":"Status: belum dikonfirmasi."}</p><Link className="gema-button" href="/track">Buka laporan saya</Link><Link className="gema-button-secondary" href="/">Beranda</Link></main>;
  return <div className="min-h-dvh"><AppHeader open={drawer} onMenuClick={()=>setDrawer(true)}/>
    <main className="mx-auto max-w-3xl p-4 pb-24"><Link className="gema-link" href="/">Kembali ke beranda</Link><h1 className="my-4 text-2xl font-bold">Buat laporan indikasi bencana</h1>
      <form onSubmit={send} className="space-y-5">
        <section className="gema-card space-y-3"><h2 className="text-lg font-bold">Bukti yang Anda miliki</h2><p className="text-sm text-slate-700">Foto opsional. AI membantu membaca isi foto, bukan membuktikan waktu, lokasi, atau keaslian berita.</p>
          <video ref={video} autoPlay playsInline muted className={cameraOn?"max-h-80 w-full rounded-lg":"hidden"}/>
          {preview&&photo&&!cameraOn&&(
            // eslint-disable-next-line @next/next/no-img-element -- preview of a private local file.
            <img src={preview} alt="Pratinjau foto laporan" className="max-h-80 w-full rounded-lg object-contain"/>
          )}
          <div className="flex flex-wrap gap-3"><button type="button" className="gema-button-secondary" disabled={busy} onClick={cameraOn?capture:startCamera}>{cameraOn?"Ambil foto":"Nyalakan kamera"}</button><label className="gema-button-secondary">Pilih foto<input className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={e=>{if(e.target.files?.[0])void choosePhoto(e.target.files[0],"gallery");}}/></label>{photo&&<button type="button" className="gema-button-secondary" disabled={busy} onClick={()=>void removePhoto()}>Lanjut tanpa foto</button>}</div>
          <p className="text-sm">JPEG, PNG, atau WebP, maksimal 10 MB. Foto akan dikompresi.</p>
          {photo&&<><label className="block">Sumber foto<select className="gema-input mt-1" value={source} onChange={e=>setSource(e.target.value as LocalDraft["photoSource"])}><option value="camera">Kamera saya</option><option value="gallery">Galeri saya</option><option value="forwarded">Diteruskan / dari berita atau orang lain</option></select></label><button type="button" className="gema-button-secondary" disabled={busy} onClick={analyze}>Analisis foto (opsional)</button></>}
          {analysis&&<div className="rounded-lg bg-slate-100 p-3"><p>Hasil visual: {analysis.ai_status==="relevant"?"relevan dengan indikasi bencana":"belum cukup untuk klasifikasi"}</p>{analysis.type&&<p>Jenis menurut AI: {disasterNames[analysis.type]}</p>}{analysis.severity&&<p>Indikasi visual: {analysis.severity}</p>}{analysis.summary&&<p>{analysis.summary}</p>}<p className="text-sm">Hasil ini tidak mengonfirmasi kejadian saat ini.</p></div>}
        </section>
        <section className="gema-card space-y-4"><h2 className="text-lg font-bold">Konteks kejadian</h2>
          <label className="block">Jenis menurut pelapor<select className="gema-input mt-1" value={type} onChange={e=>{setType(e.target.value as DisasterType);setDetails(null);}}><option value="flood">Banjir</option><option value="landslide">Longsor</option><option value="fire">Kebakaran</option></select></label>
          <label className="flex min-h-11 items-center gap-3"><input type="checkbox" checked={known} onChange={e=>setKnown(e.target.checked)}/>Saya mengetahui waktu pengamatan</label>
          {known?<label className="block">Diamati kapan? (waktu lokal perangkat)<input className="gema-input mt-1" type="datetime-local" required value={time} onChange={e=>setTime(e.target.value)}/></label>:<p className="text-sm">Waktu tidak diketahui: laporan akan ditinjau dahulu.</p>}
          <p className="text-sm text-slate-700">Waktu pengamatan berbeda dari waktu unggah. Kamera baru juga dapat memotret berita lama.</p>
          <label className="block">Keterangan (opsional)<textarea className="gema-input mt-1" maxLength={500} value={description} onChange={e=>setDescription(e.target.value)}/></label>
          {type==="flood"&&<label className="block">Perkiraan tinggi air<select className="gema-input mt-1" value={details?.type==="flood"?details.water_depth||"":""
          } onChange={e=>setDetails({type:"flood",water_depth:(e.target.value||null) as "<30cm"|"30-100cm"|">100cm"|null,current:details?.type==="flood"?details.current:null})}><option value="">Tidak tahu</option><option value="<30cm">Di bawah 30 cm</option><option value="30-100cm">30–100 cm</option><option value=">100cm">Di atas 100 cm</option></select></label>}
          {type==="flood"&&<label className="block">Arus air<select className="gema-input mt-1" value={details?.type==="flood"?details.current||"":""} onChange={e=>setDetails({type:"flood",current:(e.target.value||null) as "tenang"|"deras"|null,water_depth:details?.type==="flood"?details.water_depth:null})}><option value="">Tidak tahu</option><option value="tenang">Tenang</option><option value="deras">Deras</option></select></label>}
          {type==="landslide"&&<label className="block">Perkiraan luas tertutup m² (opsional)<input className="gema-input mt-1" type="number" min={1} max={100000} value={details?.type==="landslide"?details.covered_area_m2||"":""
          } onChange={e=>setDetails({type:"landslide",covered_area_m2:e.target.value?Number(e.target.value):null})}/></label>}
          {type==="fire"&&<label className="block">Jarak pandang akibat asap<select className="gema-input mt-1" value={details?.type==="fire"?details.visibility||"":""
          } onChange={e=>setDetails({type:"fire",visibility:(e.target.value||null) as "jelas"|"terbatas"|"sangat_rendah"|null})}><option value="">Tidak tahu</option><option value="jelas">Jelas</option><option value="terbatas">Terbatas</option><option value="sangat_rendah">Sangat rendah</option></select></label>}
        </section>
        <section className="gema-card space-y-3"><h2 className="text-lg font-bold">Lokasi kejadian</h2><p>Lokasi kejadian bisa berbeda dari lokasi perangkat Anda. Periksa titik sebelum mengirim.</p><button type="button" className="gema-button-secondary" onClick={()=>requestDeviceLocation(chooseLocation,setMessage)}>Gunakan lokasi perangkat</button><ReportMap reports={[]} location={location} onPickLocation={chooseLocation} pickerOnly/>
          <label className="block">Nama area<input className="gema-input mt-1" required maxLength={100} value={locationLabel} onChange={e=>setLocationLabel(e.target.value)}/></label>
        </section>
        <section className="gema-card space-y-3"><h2 className="font-bold">Periksa sebelum mengirim</h2><p>{disasterNames[type]} di {locationLabel||"area belum dipilih"}. {known?`Diamati ${time.replace("T"," ")} (waktu perangkat).`:"Waktu belum diketahui."} Sumber: {photo?source:"laporan manual"}.</p><p className="text-sm">Laporan dapat masuk tinjauan sebelum ditampilkan. Jumlah pengamatan tidak otomatis menentukan kebenaran.</p></section>
        {error&&<p role="alert" className="rounded-lg bg-red-50 p-3 text-red-800">{error}</p>}{message&&<p role="status" className="rounded-lg bg-slate-100 p-3">{message}</p>}
        {canRecreate&&<section className="gema-card space-y-3"><p>Data perangkat masih tersedia. Periksa <Link className="gema-link" href="/track">Laporan Saya</Link> terlebih dahulu agar laporan yang sudah diterima tidak diajukan lagi. Jika belum tercatat, buat draft baru lalu periksa waktu dan lokasinya.</p><button type="button" className="gema-button-secondary" disabled={busy} onClick={()=>void recreate()}>Buat draft baru dari data ini</button></section>}
        <div className="flex flex-wrap gap-3"><button type="button" className="gema-button-secondary" disabled={busy} onClick={save}>Simpan draft di perangkat</button><button type="submit" className="gema-button" disabled={busy}>{busy?"Memproses…":"Kirim laporan"}</button></div>
      </form>
    </main><NavDrawer open={drawer} onClose={()=>setDrawer(false)}/></div>;
}
