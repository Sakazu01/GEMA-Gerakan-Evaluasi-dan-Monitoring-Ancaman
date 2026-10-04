import type {DisasterType,DraftAnalysis,ReportDetails} from "@/types/report";
import type {MapLocation} from "@/lib/demo-reports";
import {apiFetch,ApiError} from "@/lib/api-client";
import {reportsChanged} from "@/lib/demo-report-context";

export interface LocalDraft {
  id:string;photo:File|null;photoSource:"camera"|"none";photoCapturedAt?:string;type:DisasterType;
  observedAt:string|null;timeKnown:boolean;location:MapLocation|null;locationLabel:string;
  description:string;details:ReportDetails|null;createdAt:string;updatedAt:string;queued:boolean;
  serverId?:string;analysis?:DraftAnalysis;lastError?:string;
}
const DB_NAME="gema-private-drafts";
function database():Promise<IDBDatabase>{return new Promise((resolve,reject)=>{
  const request=indexedDB.open(DB_NAME,1);
  request.onupgradeneeded=()=>request.result.createObjectStore("drafts",{keyPath:"id"});
  request.onsuccess=()=>resolve(request.result);
  request.onerror=()=>reject(new Error("Draft belum dapat disimpan di perangkat. Ruang penyimpanan mungkin penuh."));
});}
async function operation<T>(mode:IDBTransactionMode,run:(store:IDBObjectStore)=>IDBRequest<T>):Promise<T>{
  const db=await database();
  return new Promise((resolve,reject)=>{
    const transaction=db.transaction("drafts",mode),request=run(transaction.objectStore("drafts"));
    transaction.oncomplete=()=>{db.close();resolve(request.result);};
    transaction.onerror=transaction.onabort=()=>{db.close();reject(new Error("Penyimpanan draft gagal. Data belum tersimpan."));};
  });
}
export async function saveLocalDraft(draft:LocalDraft){await operation("readwrite",store=>store.put(draft));}
export async function deleteLocalDraft(id:string){await operation("readwrite",store=>store.delete(id));}
export async function listLocalDrafts():Promise<LocalDraft[]>{
  const all=await operation<LocalDraft[]>("readonly",store=>store.getAll());
  const cutoff=Date.now()-7*86400000;
  const expired=all.filter(d=>new Date(d.updatedAt).getTime()<cutoff);
  for(const draft of expired)await deleteLocalDraft(draft.id);
  return all.filter(d=>new Date(d.updatedAt).getTime()>=cutoff);
}
export async function submitLocalDraft(draft:LocalDraft,allowRenewal=true,onProgress?:(message:string)=>void):Promise<{id:string;status:string}>{
  if(!draft.location||!draft.locationLabel.trim())throw new Error("Lengkapi lokasi kejadian sebelum mengirim.");
  if(!draft.photo||draft.photoSource!=="camera")throw new Error("Ambil foto langsung dari kamera sebelum mengirim.");
  let current={...draft};
  if(!current.serverId){
    onProgress?.("Menyimpan foto dan laporan secara aman…");
    const body=new FormData();body.append("client_id",current.id);
    if(current.photo)body.append("photo",current.photo,current.photo.name||"laporan.jpg");
    const created=await apiFetch<{draft_id:string}>("/api/reports/drafts",{method:"POST",body});
    current={...current,serverId:created.draft_id};
    await saveLocalDraft(current);
  }
  if(current.photo&&!current.analysis){
    onProgress?.("AI sedang memeriksa kondisi dan kemiripan foto…");
    try{current.analysis=await apiFetch<DraftAnalysis>(`/api/reports/drafts/${current.serverId}/analyze`,{method:"POST"});}
    catch{current.analysis={draft_id:current.serverId!,ai_status:"unavailable"};}
    await saveLocalDraft(current);
  }
  let result;
  try{onProgress?.("Mengirim paket informasi kepada petugas…");result=await apiFetch<{id:string;status:string}>("/api/reports",{method:"POST",headers:{"Content-Type":"application/json","Idempotency-Key":current.id},body:JSON.stringify({
    draft_id:current.serverId,lat:current.location!.lat,lng:current.location!.lng,
    location_source:current.location!.source==="device"?"device":"map",location_label:current.locationLabel.trim(),
    description:current.description.trim()||null,details:current.details,reported_type:current.type,
    observed_at:current.timeKnown?current.observedAt:null,observation_time_known:current.timeKnown,
    photo_source:"camera",photo_captured_at:current.photoCapturedAt||current.createdAt,
  })});}catch(cause){
    // Renew only after the server positively identifies an unpublished expired
    // draft. Network/ambiguous failures retain the same draft and idempotency key.
    if(!allowRenewal||!(cause instanceof ApiError)||cause.code!=="draft_expired")throw cause;
    const body=new FormData();body.append("client_id",crypto.randomUUID());
    if(current.photo)body.append("photo",current.photo,current.photo.name||"laporan.jpg");
    const created=await apiFetch<{draft_id:string}>("/api/reports/drafts",{method:"POST",body});
    current={...current,serverId:created.draft_id,analysis:undefined};
    await saveLocalDraft(current);
    // Observation time and source are retained; stale observations still require review.
    return submitLocalDraft(current,false,onProgress);
  }
  await deleteLocalDraft(current.id);reportsChanged();return result;
}
