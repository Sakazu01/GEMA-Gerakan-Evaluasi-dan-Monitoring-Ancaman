"use client";
import {useCallback,useEffect,useMemo,useRef,useState} from "react";
import Link from "next/link";
import {AlertTriangle,Layers,List,LocateFixed,MessageCircleQuestion,Plus,Search,SquareMinus,SquarePlus,X} from "lucide-react";
import {AppHeader} from "@/components/AppHeader";
import {NavDrawer} from "@/components/NavDrawer";
import {NearbyNotice} from "@/components/NearbyNotice";
import {ReportList} from "@/components/ReportList";
import {ReportMap} from "@/components/ReportMap";
import {useDialog} from "@/components/ui/use-dialog";
import {apiFetch} from "@/lib/api-client";
import {useDemoReports} from "@/lib/demo-report-context";
import {disasterNames,haversineM,severityMap,severityOrder,type MapLocation} from "@/lib/demo-reports";
import {requestDeviceLocation} from "@/lib/geolocation";
import type {DensityPoint,MapMode,ReportMapHandle} from "@/components/ReportMapCanvas";
import type {Report} from "@/types/report";

const NEARBY_KM=30,PAGE_SIZE=20;
const floatingButton="flex min-h-11 min-w-11 items-center justify-center rounded-2xl bg-white text-slate-800 shadow-md hover:bg-slate-100";

export function PetaWarga({location,locationMessage,onLocationChange}:{location:MapLocation|null;locationMessage:string;onLocationChange:(next:MapLocation)=>void}) {
  const {reports,loading,error,hasMore,loadMore,refresh}=useDemoReports();
  useEffect(()=>{if(hasMore&&!loading&&reports.length<600)void loadMore();},[hasMore,loading,reports.length,loadMore]);
  const [drawer,setDrawer]=useState(false),[sheet,setSheet]=useState(false);
  const [mapMode,setMapMode]=useState<MapMode>("ai");
  const [density,setDensity]=useState<DensityPoint[]|null>(null),[densityError,setDensityError]=useState<string|null>(null),[densityOpen,setDensityOpen]=useState(true);
  const [query,setQuery]=useState(""),[searchMessage,setSearchMessage]=useState("");
  const mapRef=useRef<ReportMapHandle>(null),sheetRef=useRef<HTMLDivElement>(null);
  useDialog(sheet,sheetRef,()=>setSheet(false));
  const [listQuery,setListQuery]=useState(""),[listType,setListType]=useState("all"),[shown,setShown]=useState(PAGE_SIZE);
  const places=useMemo(()=>[...new Set(reports.map(report=>report.location_label.replace(/^Sekitar /,"")))].sort(),[reports]);
  const results=useMemo(()=>{
    const text=listQuery.trim().toLowerCase();
    const withDistance=reports.filter(report=>listType==="all"||report.type===listType).map(report=>({report,km:location?haversineM(location.lat,location.lng,report.public_lat,report.public_lng)/1000:null}));
    const matches=text
      ?withDistance.filter(({report})=>`${report.location_label} ${disasterNames[report.type]}`.toLowerCase().includes(text))
      :location?withDistance.filter(({km})=>km!==null&&km<=NEARBY_KM):withDistance;
    return location?[...matches].sort((a,b)=>(a.km??0)-(b.km??0)):matches;
  },[reports,location,listQuery,listType]);

  const loadDensity=useCallback(async()=>{
    try{setDensity(await apiFetch<DensityPoint[]>("/api/reports/density"));setDensityError(null);}
    catch(cause){setDensityError(cause instanceof Error?cause.message:"Kepadatan belum tersedia");}
  },[]);
  useEffect(()=>{
    if(mapMode!=="density")return;
    const first=setTimeout(()=>void loadDensity(),0),timer=setInterval(()=>{if(document.visibilityState==="visible")void loadDensity();},30000);
    return()=>{clearTimeout(first);clearInterval(timer);};
  },[mapMode,loadDensity]);

  function locateMe(){
    requestDeviceLocation(next=>{onLocationChange(next);mapRef.current?.flyTo(next.lat,next.lng);},setSearchMessage);
  }
  function runSearch(){
    const text=query.trim().toLowerCase();
    if(!text)return;
    const match=reports.find(report=>report.location_label.toLowerCase().includes(text));
    if(match){setSearchMessage("");mapRef.current?.flyTo(match.public_lat,match.public_lng);}
    else setSearchMessage(`Tidak ada laporan aktif yang cocok dengan "${query.trim()}".`);
  }
  function locateReport(report:Report){
    setSheet(false);
    setMapMode("ai");
    mapRef.current?.flyTo(report.public_lat,report.public_lng);
  }
  function toggleDensity(){
    if(mapMode==="ai"){setMapMode("density");setDensity(null);setDensityError(null);setDensityOpen(true);}
    else setMapMode("ai");
  }

  const pill="rounded-lg bg-white/95 px-3 py-2 text-sm text-slate-800 shadow";
  return <div>
    <div className="relative h-dvh w-full overflow-hidden bg-[#71AAF9]">
      <h1 className="sr-only">Peta laporan bencana GEMA</h1>
      <div className="relative z-20">
        <AppHeader open={drawer} onMenuClick={()=>setDrawer(true)} center={
          <form role="search" onSubmit={event=>{event.preventDefault();runSearch();}} className="flex h-11 items-center gap-2 rounded-full bg-white pl-4 pr-1">
            <label htmlFor="cari-area" className="sr-only">Cari area berdasarkan nama laporan</label>
            <Search aria-hidden="true" size={18} className="shrink-0 text-slate-500"/>
            <input id="cari-area" type="search" value={query} onChange={event=>setQuery(event.target.value)} placeholder="Cari area, alamat, atau kata kunci..." className="min-w-0 flex-1 bg-transparent text-sm text-slate-800 placeholder:text-slate-600 focus:outline-none"/>
            <span aria-hidden="true" className="h-5 w-px shrink-0 bg-slate-300"/>
            <button type="button" onClick={locateMe} aria-label="Gunakan lokasi perangkat saya" className="flex h-11 w-11 shrink-0 items-center justify-center text-slate-600 hover:text-slate-800"><LocateFixed aria-hidden="true" size={18}/></button>
          </form>
        }/>
      </div>

      <div className="absolute inset-0 z-0">
        <ReportMap ref={mapRef} reports={reports} location={location} onPickLocation={onLocationChange} fullBleed mode={mapMode} densityPoints={density}/>
      </div>

      <div className="absolute left-4 right-[76px] top-[111px] z-10 flex flex-col items-start gap-2">
        {searchMessage&&<p role="status" className={pill}>{searchMessage}</p>}
        {locationMessage&&<p role="status" className={pill}>{locationMessage}</p>}
        {loading&&<p role="status" className={pill}>Memuat laporan…</p>}
        {error&&<div role="alert" className={`${pill} border border-amber-700 bg-amber-50`}><p>Data belum dapat dimuat. {error}</p><button type="button" onClick={()=>void refresh()} className="gema-button mt-2">Coba lagi</button></div>}
        {!loading&&!error&&reports.length===0&&<p role="status" className={pill}>Belum ada laporan aktif di area ini. Ini bukan jaminan kondisi aman.</p>}
        {mapMode==="density"&&densityOpen&&<div className={`${pill} flex w-fit max-w-full items-center gap-3 py-1 pr-1`}>
          <div>
            <p className="font-semibold">Pelapor dalam radius 50 m</p>
            <ul className="flex flex-wrap gap-x-3 text-xs text-slate-700">{[["sedang","1 sampai 2"],["tinggi","3 sampai 9"],["kritis","10 atau lebih"]].map(([level,label])=><li key={level} className="flex items-center gap-1"><span aria-hidden="true" className="h-2.5 w-2.5 rounded-full" style={{backgroundColor:severityMap[level as "sedang"].color}}/>{label}</li>)}</ul>
            {density===null&&!densityError&&<p>Memuat kepadatan…</p>}
            {densityError&&<p role="alert" className="text-red-800">Gagal memuat kepadatan: {densityError}</p>}
          </div>
          <button type="button" onClick={()=>setDensityOpen(false)} aria-label="Tutup info kepadatan" className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-full text-slate-600 hover:bg-slate-100"><X aria-hidden="true" size={16}/></button>
        </div>}
      </div>

      <div className="absolute right-4 top-[111px] z-10 flex flex-col gap-2">
        <div className="overflow-hidden rounded-2xl bg-white shadow-md">
          <button type="button" aria-label="Perbesar peta" onClick={()=>mapRef.current?.zoomIn()} className="flex min-h-11 min-w-11 items-center justify-center text-slate-800 hover:bg-slate-100"><SquarePlus aria-hidden="true" size={20}/></button>
          <div className="h-px bg-slate-200"/>
          <button type="button" aria-label="Perkecil peta" onClick={()=>mapRef.current?.zoomOut()} className="flex min-h-11 min-w-11 items-center justify-center text-slate-800 hover:bg-slate-100"><SquareMinus aria-hidden="true" size={20}/></button>
        </div>
        <button type="button" aria-pressed={mapMode==="density"} aria-label={mapMode==="ai"?"Tampilkan mode kepadatan laporan":"Tampilkan mode status laporan"} onClick={toggleDensity} className={mapMode==="density"?"flex min-h-11 min-w-11 items-center justify-center rounded-2xl bg-[#0D5D3A] text-white shadow-md":floatingButton}><Layers aria-hidden="true" size={20}/></button>
        <button type="button" aria-label="Buka info, kejadian sekitar, dan daftar laporan" aria-haspopup="dialog" aria-expanded={sheet} onClick={()=>setSheet(true)} className={floatingButton}><MessageCircleQuestion aria-hidden="true" size={20}/></button>
        <Link href="/ringkasan" aria-label="Buka ringkasan dan daftar lengkap" className={floatingButton}><List aria-hidden="true" size={20}/></Link>
      </div>

      <Link href="/report/new" className="absolute bottom-20 left-1/2 z-10 flex min-h-11 -translate-x-1/2 items-center gap-2 rounded-full bg-[#CF0003] px-6 font-semibold text-white shadow-lg hover:bg-red-800">
        <AlertTriangle aria-hidden="true" size={18}/>Laporkan Bencana<Plus aria-hidden="true" size={20}/>
      </Link>
    </div>

    <NavDrawer open={drawer} onClose={()=>setDrawer(false)}/>

    {sheet&&<button type="button" aria-label="Tutup info" onClick={()=>setSheet(false)} className="fixed inset-0 z-40 bg-black/40"/>}
    <div ref={sheetRef} role="dialog" aria-modal={sheet||undefined} aria-label="Info dan kejadian sekitar" inert={!sheet} tabIndex={-1}
      className={`fixed inset-x-0 bottom-0 z-50 max-h-[85dvh] overflow-y-auto rounded-t-2xl bg-[#F7F6E4] shadow-xl transition-transform duration-200 ${sheet?"translate-y-0":"translate-y-full"}`}>
      <div className="sticky top-0 flex justify-end bg-[#F7F6E4] p-2"><button type="button" onClick={()=>setSheet(false)} aria-label="Tutup" className="flex min-h-11 min-w-11 items-center justify-center rounded-lg text-slate-700 hover:bg-black/5"><X aria-hidden="true" size={22}/></button></div>
      <div className="space-y-5 px-4 pb-8">
        <div><h2 className="text-2xl font-bold text-slate-950">Kejadian di sekitar Anda</h2><p className="mt-1 text-slate-700">Peta menampilkan laporan aktif; yang belum diterima petugas berlabel Belum dikonfirmasi. Informasi belum diverifikasi dan bukan peringatan resmi.</p></div>
        {sheet&&<NearbyNotice location={location}/>}
        <section aria-label="Legenda tingkat keparahan" className="gema-card">
          <h3 className="gema-card-title mb-3">Indikasi visual AI</h3>
          <ul className="flex flex-wrap gap-2">{severityOrder.map(level=><li key={level} className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm"><span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 rounded-full" style={{backgroundColor:severityMap[level].color}}/><span className="font-semibold text-slate-900">{severityMap[level].label}</span></li>)}</ul>
        </section>
        <section aria-labelledby="daftar-peta" className="space-y-3">
          <h3 id="daftar-peta" className="text-xl font-bold text-slate-900">{listQuery.trim()?"Hasil pencarian":location?"Laporan di sekitar Anda":"Laporan terbaru"}</h3>
          <div className="gema-toolbar">
            <label className="gema-field" style={{maxWidth:"none"}}>Cari kota atau jenis bencana
              <input type="search" list="kota-laporan" value={listQuery} onChange={event=>{setListQuery(event.target.value);setShown(PAGE_SIZE);}} placeholder="Contoh: Bandung, banjir" className="gema-input"/>
              <datalist id="kota-laporan">{places.map(place=><option key={place} value={place}/>)}</datalist>
            </label>
            <label className="gema-field">Jenis bencana
              <select value={listType} onChange={event=>{setListType(event.target.value);setShown(PAGE_SIZE);}} className="gema-input"><option value="all">Semua jenis</option><option value="flood">Banjir</option><option value="landslide">Tanah longsor</option><option value="fire">Kebakaran</option></select>
            </label>
          </div>
          <p role="status" className="gema-muted">{results.length===0
            ?(listQuery.trim()?"Tidak ada laporan yang cocok. Coba nama kota atau jenis bencana lain.":location?`Tidak ada laporan dalam ${NEARBY_KM} km dari lokasi Anda. Cari kota lain di kolom di atas.`:"Belum ada laporan yang diterima petugas.")
            :`Menampilkan ${Math.min(shown,results.length)} dari ${results.length} laporan${!listQuery.trim()&&location?`, dalam ${NEARBY_KM} km dari lokasi Anda, terdekat dulu`:""}.`}</p>
          <ReportList reports={results.slice(0,shown).map(item=>item.report)} onLocate={locateReport}/>
          {shown<results.length&&<button type="button" className="gema-button-secondary" onClick={()=>setShown(count=>count+PAGE_SIZE)}>Tampilkan lebih banyak</button>}
        </section>
        <Link href="/ringkasan" className="gema-button-secondary">Buka ringkasan lengkap</Link>
      </div>
    </div>
  </div>;
}
