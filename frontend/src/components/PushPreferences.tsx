"use client";
import {useState} from "react";
import {apiFetch} from "@/lib/api-client";
import type {MapLocation} from "@/lib/demo-reports";

function publicKeyBytes(key:string){const raw=atob(key.replace(/-/g,"+").replace(/_/g,"/"));return Uint8Array.from(raw,c=>c.charCodeAt(0));}
export function PushPreferences({location}:{location:MapLocation|null}){
  const [message,setMessage]=useState("");const [busy,setBusy]=useState(false);
  async function enable(){setBusy(true);try{
    if(!location)throw new Error("Pilih area pemantauan dahulu.");
    if(!("serviceWorker" in navigator)||!("PushManager" in window))throw new Error("Browser ini belum mendukung push. Pemberitahuan dalam aplikasi tetap tersedia.");
    const config=await apiFetch<{enabled:boolean;public_key:string}>("/api/push/config");
    if(!config.enabled)throw new Error("Push belum tersedia. Gunakan pemberitahuan dalam aplikasi.");
    if(await Notification.requestPermission()!=="granted")throw new Error("Izin notifikasi tidak diberikan.");
    const registration=await navigator.serviceWorker.register("/sw.js");
    await navigator.serviceWorker.ready;
    const subscription=await registration.pushManager.getSubscription()||await registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:publicKeyBytes(config.public_key)});
    await apiFetch("/api/push/subscriptions",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...subscription.toJSON(),expirationTime:undefined,lat:location.lat,lng:location.lng,location_mode:location.source==="device"?"device":"area",location_updated_at:location.measured_at||new Date().toISOString(),accuracy_m:location.accuracy_m??null})});
    setMessage("Notifikasi aktif untuk area pilihan. Lokasi perangkat harus diperbarui setelah 5 menit; area manual berlaku paling lama 30 hari.");
  }catch(cause){setMessage(cause instanceof Error?cause.message:"Push belum dapat diaktifkan");}finally{setBusy(false);}}
  async function disable(){setBusy(true);try{const registration=await navigator.serviceWorker.getRegistration();const sub=await registration?.pushManager.getSubscription();if(sub){await apiFetch("/api/push/subscriptions",{method:"DELETE",headers:{"Content-Type":"application/json"},body:JSON.stringify({endpoint:sub.endpoint})});await sub.unsubscribe();}setMessage("Notifikasi dinonaktifkan.");}catch(cause){setMessage(cause instanceof Error?cause.message:"Belum dapat menonaktifkan push");}finally{setBusy(false);}}
  return <details className="gema-card"><summary className="min-h-11 cursor-pointer font-semibold">Preferensi notifikasi</summary><p className="mb-3 text-sm">Push memakai area yang disetujui, bukan pelacakan GPS terus-menerus.</p><div className="flex flex-wrap gap-3"><button className="gema-button" disabled={busy} onClick={enable}>Aktifkan / perbarui area</button><button className="gema-button-secondary" disabled={busy} onClick={disable}>Nonaktifkan</button></div>{message&&<p role="status" className="mt-3">{message}</p>}</details>;
}
