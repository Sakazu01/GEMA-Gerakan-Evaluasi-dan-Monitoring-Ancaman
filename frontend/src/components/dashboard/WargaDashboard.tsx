"use client";
import {useCallback,useEffect,useState} from "react";
import Link from "next/link";
import {AppHeader} from "@/components/AppHeader";
import {NavDrawer} from "@/components/NavDrawer";
import {ReportMap} from "@/components/ReportMap";
import {NearbyNotice} from "@/components/NearbyNotice";
import {PushPreferences} from "@/components/PushPreferences";
import {OfflineDrafts} from "@/components/OfflineDrafts";
import {ReportCard} from "@/components/ui/ReportCard";
import {DataStatePanel} from "@/components/ui/DataStatePanel";
import {useDemoReports} from "@/lib/demo-report-context";
import {requestDeviceLocation} from "@/lib/geolocation";
import type {MapLocation} from "@/lib/demo-reports";
import {apiFetch} from "@/lib/api-client";
import type {DensityPoint,MapMode} from "@/components/ReportMapCanvas";

export function WargaDashboard({location,locationMessage,onLocationChange}:{location:MapLocation|null;locationMessage:string;onLocationChange:(next:MapLocation)=>void}) {
  const {reports,loading,error,updatedAt,hasMore,loadMore,refresh}=useDemoReports();
  const [drawer,setDrawer]=useState(false);
  const [mode,setMode]=useState<"list"|"map">("list");
  const [pick,setPick]=useState(false);
  const [message,setMessage]=useState(locationMessage);
  const [filter,setFilter]=useState("all");
  const [mapMode,setMapMode]=useState<MapMode>("ai");
  const [density,setDensity]=useState<DensityPoint[]|null>(null),[densityLoading,setDensityLoading]=useState(false),[densityError,setDensityError]=useState<string|null>(null),[densityUpdated,setDensityUpdated]=useState<string|null>(null);
  const loadDensity=useCallback(async()=>{setDensityLoading(true);try{setDensity(await apiFetch<DensityPoint[]>("/api/reports/density"));setDensityError(null);setDensityUpdated(new Date().toISOString());}catch(cause){setDensityError(cause instanceof Error?cause.message:"Kepadatan belum tersedia");}finally{setDensityLoading(false);}},[]);
  useEffect(()=>{
    if(mode!=="map"||mapMode!=="density")return;
    const first=setTimeout(()=>void loadDensity(),0),timer=setInterval(()=>{if(document.visibilityState==="visible")void loadDensity();},30000);
    return()=>{clearTimeout(first);clearInterval(timer);};
  },[mode,mapMode,loadDensity]);
  const visible=reports.filter(report=>filter==="all"||report.type===filter);
  return <div className="min-h-dvh bg-[var(--background)]">
    <AppHeader open={drawer} onMenuClick={()=>setDrawer(true)}/>
    <main className="mx-auto max-w-7xl space-y-6 p-4 pb-24 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-2xl font-bold">Informasi untuk kesiapsiagaan komunitas</h1><p className="mt-2 gema-muted">Laporan warga, pengamatan sekitar, dan keputusan pengelola ditampilkan terpisah.</p></div><Link href="/report/new" className="gema-button">Buat laporan</Link></div>
      <section aria-label="Area pemantauan" className="gema-card space-y-3">
        <h2 className="gema-card-title">Area dipantau: {location?.label||"belum dipilih"}</h2>
        {location?.source==="device"&&<p className="gema-muted">Lokasi perangkat bersifat perkiraan. Perbarui saat berpindah atau setelah 10 menit.</p>}
        {location&&location.source!=="device"&&<p className="gema-muted">Ini area pilihan, bukan pernyataan posisi fisik Anda.</p>}
        <div className="flex flex-wrap gap-3"><button className="gema-button-secondary" onClick={()=>requestDeviceLocation(onLocationChange,setMessage)}>Gunakan / perbarui lokasi saya</button><button className="gema-button-secondary" onClick={()=>setPick(!pick)}>Pilih area manual</button></div>
        {message&&<p role="status">{message}</p>}
        {pick&&<><p>Klik titik di peta untuk memilih area pemantauan.</p><ReportMap reports={[]} location={location} onPickLocation={onLocationChange} pickerOnly/></>}
      </section>
      <NearbyNotice key={location?`${location.lat}:${location.lng}:${location.source}`:"none"} location={location}/>
      <OfflineDrafts/>
      <section aria-label="Tampilan laporan" className="gema-card">
        <div className="gema-toolbar">
          <div role="group" aria-label="Mode tampilan" className="gema-segmented"><button aria-pressed={mode==="list"} onClick={()=>setMode("list")}>Daftar</button><button aria-pressed={mode==="map"} onClick={()=>setMode("map")}>Peta</button></div>
          <label className="gema-field">Jenis laporan<select className="gema-input" value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">Semua jenis</option><option value="flood">Banjir</option><option value="landslide">Longsor</option><option value="fire">Kebakaran</option></select></label>
          {mode==="map"&&<label className="gema-field">Tampilan peta<select className="gema-input" value={mapMode} onChange={e=>setMapMode(e.target.value as MapMode)}><option value="ai">Laporan dan status bukti</option><option value="density">Kepadatan pelapor</option></select></label>}
          <button className="gema-button-secondary" onClick={()=>void refresh()}>Refresh</button>
        </div>
      </section>
      <DataStatePanel loading={loading} error={error} updatedAt={updatedAt} empty={visible.length===0} retry={()=>void refresh()}/>
      {mode==="map"&&<section aria-label="Peta laporan" className="space-y-3"><p className="gema-muted">Marker adalah laporan, bukan kepastian kejadian. Lingkaran hanya jangkauan informasi dari laporan terkonfirmasi.</p>{mapMode==="density"&&<><p className="gema-muted">Kepadatan adalah pelapor unik pada laporan aktif dalam kelompok 50 m, bukan jumlah kejadian atau ukuran bahaya. Filter jenis di atas berlaku pada daftar laporan.</p><DataStatePanel loading={densityLoading} error={densityError} updatedAt={densityUpdated} retry={()=>void loadDensity()}/></>}<div className="gema-map-frame"><ReportMap reports={visible} location={location} onPickLocation={onLocationChange} mode={mapMode} densityPoints={density}/></div></section>}
      <section aria-label="Daftar laporan" className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{visible.map(report=><ReportCard key={report.id} report={report}/>)}</section>
      {hasMore&&<button className="gema-button-secondary" disabled={loading} onClick={()=>void loadMore()}>Muat laporan berikutnya</button>}
      <PushPreferences location={location}/>
      <nav aria-label="Bantuan dan pengelolaan" className="flex flex-wrap gap-4"><Link className="gema-link" href="/evakuasi">Panduan</Link><Link className="gema-link" href="/hotline">Kontak</Link><Link className="gema-link" href="/track">Laporan saya</Link><Link className="gema-link" href="/pengelola">Masuk pengelola</Link></nav>
    </main>
    <NavDrawer open={drawer} onClose={()=>setDrawer(false)}/>
  </div>;
}
