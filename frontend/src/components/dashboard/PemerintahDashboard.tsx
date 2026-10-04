"use client";
import {useCallback,useEffect,useRef,useState,type FormEvent} from "react";
import Link from "next/link";
import {apiFetch,ApiError} from "@/lib/api-client";
import {authClient} from "@/lib/auth";
import {ReportCard} from "@/components/ui/ReportCard";
import {DataStatePanel} from "@/components/ui/DataStatePanel";
import type {Report} from "@/types/report";

export function PemerintahDashboard(){
  const [reports,setReports]=useState<Report[]>([]),[loading,setLoading]=useState(true);
  const [error,setError]=useState<string|null>(null),[updatedAt,setUpdatedAt]=useState<string|null>(null);
  const [email,setEmail]=useState(""),[password,setPassword]=useState(""),[busy,setBusy]=useState(false);
  const [page,setPage]=useState(0),[filter,setFilter]=useState("all"),[allowed,setAllowed]=useState(false);
  const requestVersion=useRef(0);
  const load=useCallback(async()=>{const version=++requestVersion.current;setLoading(true);try{const data=await apiFetch<Report[]>(`/api/moderation/reports?limit=50&offset=${page*50}`);if(version!==requestVersion.current)return;setReports(data);setAllowed(true);setError(null);setUpdatedAt(new Date().toISOString());}catch(cause){if(version!==requestVersion.current)return;if(cause instanceof ApiError&&[401,403].includes(cause.status)){setAllowed(false);setReports([]);setUpdatedAt(null);}setError(cause instanceof Error?cause.message:"Riwayat belum tersedia");}finally{if(version===requestVersion.current)setLoading(false);}},[page]);
  useEffect(()=>{const first=setTimeout(()=>void load(),0),timer=setInterval(()=>{if(document.visibilityState==="visible")void load();},30000);return()=>{clearTimeout(first);clearInterval(timer);};},[load]);
  async function login(event:FormEvent){event.preventDefault();setBusy(true);try{const result=await authClient().auth.signInWithPassword({email,password});if(result.error)throw new Error("Email atau kata sandi tidak sesuai.");setPassword("");await load();}catch(cause){setError(cause instanceof Error?cause.message:"Login gagal");}finally{setBusy(false);}}
  const visible=reports.filter(report=>filter==="all"||filter==="pending"&&report.responder_status==="PENDING"||filter==="accepted"&&report.responder_status==="ACCEPTED"||filter==="disputed"&&(report.status==="held"||report.verification_status==="under_review")||filter==="closed"&&report.status==="closed");
  return <main className="mx-auto max-w-6xl space-y-5 p-4 pb-24"><Link className="gema-link" href="/">Beranda warga</Link><h1 className="text-2xl font-bold">Riwayat laporan pemerintah</h1><p>Halaman ini menampilkan riwayat dan bukti. Penerimaan laporan dilakukan petugas melalui Telegram.</p>
    {!allowed&&<form onSubmit={login} className="gema-card max-w-lg space-y-3"><h2 className="font-bold">Masuk dengan akun petugas</h2><p className="text-sm">Akun harus memiliki role petugas atau responder dari server.</p><label className="block">Email<input className="gema-input" type="email" required autoComplete="username" value={email} onChange={event=>setEmail(event.target.value)}/></label><label className="block">Kata sandi<input className="gema-input" type="password" required autoComplete="current-password" value={password} onChange={event=>setPassword(event.target.value)}/></label><button className="gema-button" disabled={busy}>{busy?"Memeriksa…":"Masuk"}</button></form>}
    <DataStatePanel loading={loading} error={error} updatedAt={updatedAt} empty={allowed&&reports.length===0} retry={()=>void load()}/>
    {allowed&&<><div className="flex flex-wrap gap-3"><label>Filter<select className="gema-input" value={filter} onChange={event=>setFilter(event.target.value)}><option value="all">Semua</option><option value="pending">Menunggu petugas</option><option value="accepted">Diterima petugas</option><option value="disputed">Diragukan</option><option value="closed">Ditutup</option></select></label><button className="gema-button-secondary" onClick={async()=>{requestVersion.current++;await authClient().auth.signOut();setAllowed(false);setReports([]);setUpdatedAt(null);setLoading(false);}}>Keluar</button></div>
      <p className="text-sm">Halaman {page+1}: {visible.length} laporan sesuai filter. Buka kartu untuk melihat foto dan bukti provenance.</p>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{visible.map(report=><ReportCard key={report.id} report={report} manage/>)}</div>
      <div className="flex gap-3"><button className="gema-button-secondary" disabled={page===0||loading} onClick={()=>setPage(value=>value-1)}>Sebelumnya</button><button className="gema-button-secondary" disabled={reports.length<50||loading} onClick={()=>setPage(value=>value+1)}>Berikutnya</button></div>
    </>}
  </main>;
}
