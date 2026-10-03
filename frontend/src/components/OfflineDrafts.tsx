"use client";
import {useCallback,useEffect,useRef,useState} from "react";
import {deleteLocalDraft,listLocalDrafts,saveLocalDraft,submitLocalDraft,type LocalDraft} from "@/lib/offline-drafts";
import Link from "next/link";

export function OfflineDrafts(){
  const [drafts,setDrafts]=useState<LocalDraft[]>([]);const [message,setMessage]=useState("");const [busy,setBusy]=useState(false);
  const running=useRef(false);
  const load=useCallback(async()=>{try{setDrafts(await listLocalDrafts());}catch(cause){setMessage(cause instanceof Error?cause.message:"Draft lokal belum tersedia");}},[]);
  const sync=useCallback(async()=>{
    if(running.current||!navigator.onLine)return;running.current=true;setBusy(true);
    try{for(const draft of await listLocalDrafts()){
      if(!draft.queued)continue;
      try{const result=await submitLocalDraft(draft);setMessage(`Draft terkirim. Status: ${result.status==="held"?"sedang ditinjau":"belum dikonfirmasi"}.`);}
      catch(cause){const error=cause instanceof Error?cause.message:"Pengiriman belum berhasil";const latest=(await listLocalDrafts()).find(item=>item.id===draft.id);if(latest)await saveLocalDraft({...latest,lastError:error});setMessage(error);}
    }}finally{running.current=false;setBusy(false);await load();}
  },[load]);
  useEffect(()=>{const timer=setTimeout(()=>{void load();void sync();},0);window.addEventListener("online",sync);return()=>{clearTimeout(timer);window.removeEventListener("online",sync);};},[load,sync]);
  if(!drafts.length&&!message)return null;
  return <section className="gema-card space-y-3" aria-label="Draft perangkat"><h2 className="font-bold">Draft tersimpan di perangkat</h2><p className="text-sm">Belum terkirim sampai server menerima. Draft lokal disimpan maksimal 7 hari.</p>{message&&<p role="status">{message}</p>}
    {drafts.map(draft=><div key={draft.id} className="rounded-lg border border-slate-300 p-3"><p>{draft.locationLabel||"Lokasi belum diisi"} — {draft.queued?"menunggu pengiriman ulang":"belum diajukan"}</p>{draft.lastError&&<p className="text-red-800">{draft.lastError}</p>}<div className="flex flex-wrap gap-3"><Link className="gema-link" href={`/report/new?draft=${draft.id}`}>Buka draft</Link><button className="gema-button-secondary" disabled={busy} onClick={async()=>{await deleteLocalDraft(draft.id);await load();}}>Hapus dari perangkat</button></div></div>)}
    {drafts.some(d=>d.queued)&&<button className="gema-button" disabled={busy} onClick={()=>void sync()}>{busy?"Mencoba mengirim…":"Coba kirim ulang"}</button>}
  </section>;
}
