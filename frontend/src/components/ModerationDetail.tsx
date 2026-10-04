"use client";
import {useCallback,useEffect,useRef,useState} from "react";
import Link from "next/link";
import {apiFetch,ApiError} from "@/lib/api-client";
import {authClient} from "@/lib/auth";
import {EvidenceBadge} from "@/components/ui/EvidenceBadge";
import {DataStatePanel} from "@/components/ui/DataStatePanel";
import type {Report} from "@/types/report";
import {riskLabels} from "@/lib/report-labels";

interface InternalMatch {matched_report_id:string;match_method:"sha256"|"dhash";score:number;hamming_distance:number|null;type:string;status:string;responder_status:string;location_label:string|null;observed_at:string|null;published_at:string|null;photo_url:string|null;distance_m:number|null}
interface WebMatch {provider:string;source_page_url:string|null;source_image_url:string;title:string|null;published_at:string|null;match_type:string;score:number}
interface Detail {report:Report;photo_url:string|null;photo_unavailable?:boolean;description:string|null;risk_flags:string[];lat:number;lng:number;internal_matches:InternalMatch[];web_matches:WebMatch[];
  observations:{value:string;observed_at:string|null;note:string|null;withdrawn_at:string|null;proximity_eligible:boolean}[];
  abuse_reports:{category:string;reason:string;created_at:string}[];audit:{action:string;reason:string;created_at:string}[];
  outbox:{id:string;state:string;channel:string;attempts:number;last_error_code:string|null}[]}

export function ModerationDetail({id}:{id:string}){
  const [data,setData]=useState<Detail|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState<string|null>(null),[updatedAt,setUpdatedAt]=useState<string|null>(null);
  const requestVersion=useRef(0);
  const load=useCallback(async()=>{const version=++requestVersion.current;setLoading(true);try{const detail=await apiFetch<Detail>(`/api/moderation/reports/${id}`);if(version!==requestVersion.current)return;setData(detail);setError(null);setUpdatedAt(new Date().toISOString());}catch(cause){if(version!==requestVersion.current)return;if(cause instanceof ApiError&&[401,403,404].includes(cause.status)){setData(null);setUpdatedAt(null);}setError(cause instanceof Error?cause.message:"Detail belum tersedia");}finally{if(version===requestVersion.current)setLoading(false);}},[id]);
  useEffect(()=>{const requestState=requestVersion;const timer=setTimeout(()=>void load(),0);let unsubscribe:(()=>void)|undefined;try{const {data:{subscription}}=authClient().auth.onAuthStateChange(event=>{if(event==="SIGNED_OUT"){requestState.current++;setData(null);setLoading(false);setError("Sesi petugas berakhir.");}});unsubscribe=()=>subscription.unsubscribe();}catch{/* Request reports auth error. */}return()=>{clearTimeout(timer);requestState.current++;unsubscribe?.();};},[load]);
  return <main className="mx-auto max-w-5xl space-y-5 p-4 pb-24"><Link className="gema-link" href="/pengelola">Kembali ke riwayat</Link><h1 className="text-2xl font-bold">Bukti dan riwayat laporan</h1><p>Halaman ini bersifat baca saja. Petugas menerima laporan melalui Telegram.</p><DataStatePanel loading={loading} error={error} updatedAt={updatedAt} retry={()=>void load()}/>
    {data?.report.id===id&&<><section className="gema-card space-y-3"><EvidenceBadge report={data.report}/><h2 className="text-lg font-bold">{data.report.location_label}</h2><p>Status responder: <strong>{data.report.responder_status==="ACCEPTED"?"Diterima petugas":"Menunggu petugas"}</strong></p><p>Waktu pengamatan: {data.report.observed_at?new Date(data.report.observed_at).toLocaleString("id-ID",{timeZone:"Asia/Jakarta"})+" WIB":"belum tersedia"}</p><p>Lokasi privat petugas: {data.lat}, {data.lng}</p><p>Indikasi AI: {data.report.severity||"belum tersedia"} · keyakinan {data.report.ai_confidence||"belum tersedia"}</p><p>{data.report.ai_summary||"Analisis AI belum tersedia."}</p>{data.report.ai_limitations&&<p className="text-sm">Batas analisis: {data.report.ai_limitations}</p>}<p>Keterangan warga: {data.description||"tidak diisi"}</p><p>Sinyal review: {data.risk_flags.map(flag=>riskLabels[flag]||flag).join(", ")||"tidak ada"}</p>
      {data.photo_url&&(
        // eslint-disable-next-line @next/next/no-img-element -- authorized short-lived private URL.
        <img src={data.photo_url} alt="Foto asli laporan" className="max-h-96 w-full rounded-lg object-contain"/>
      )}{data.photo_unavailable&&<p role="alert">Foto belum dapat dimuat.</p>}
    </section>
    <section className="gema-card space-y-4"><h2 className="text-lg font-bold">Kemiripan dengan laporan GEMA</h2>{data.internal_matches.length===0?<p>Tidak ada kecocokan internal yang tersimpan.</p>:data.internal_matches.map(match=><article key={`${match.matched_report_id}:${match.match_method}`} className="rounded-lg border p-3"><h3 className="font-bold">Laporan {match.matched_report_id}</h3><p>{Math.round(match.score*100)}% · {match.match_method==="sha256"?"foto sama persis":"mirip secara visual"}</p><p>{match.location_label||"Lokasi tidak tersedia"}{match.distance_m!=null?` · ${match.distance_m} meter dari laporan baru`:""}</p><p>{match.observed_at?new Date(match.observed_at).toLocaleString("id-ID",{timeZone:"Asia/Jakarta"}):"Waktu tidak tersedia"} · status {match.status}/{match.responder_status}</p>{match.photo_url&&(
        // eslint-disable-next-line @next/next/no-img-element -- authorized evidence comparison.
        <img src={match.photo_url} alt={`Foto pembanding ${match.matched_report_id}`} className="mt-2 max-h-64 w-full object-contain"/>
      )}</article>)}</section>
    <section className="gema-card space-y-4"><h2 className="text-lg font-bold">Kemiripan dari internet</h2>{data.web_matches.length===0?<p>Tidak ada sumber web tersimpan atau pemeriksaan web belum tersedia. Ini tidak membuktikan foto asli.</p>:data.web_matches.map(match=><article key={`${match.provider}:${match.source_image_url}`} className="rounded-lg border p-3"><h3 className="font-bold">{match.title||"Sumber web"}</h3><p>{Math.round(match.score*100)}% · kecocokan {match.match_type}</p><a className="gema-link break-all" href={match.source_page_url||match.source_image_url} target="_blank" rel="noreferrer">Buka sumber</a></article>)}</section>
    <section className="gema-card space-y-3"><h2 className="font-bold">Konfirmasi warga radius 500 meter</h2><p>{data.report.observation_counts.direct_seen_nearby} Konfirmasi · {data.report.observation_counts.direct_not_observed_nearby} Palsu</p>{data.observations.map((item,index)=><p key={index}>{item.value==="seen"?"Konfirmasi":"Palsu"} · {item.observed_at?new Date(item.observed_at).toLocaleString("id-ID",{timeZone:"Asia/Jakarta"}):"waktu tidak tersedia"} · {item.proximity_eligible?"lokasi memenuhi syarat":"lokasi tidak memenuhi syarat"} · {item.note||"tanpa catatan"}{item.withdrawn_at?" (dicabut)":""}</p>)}</section>
    <section className="gema-card space-y-3"><h2 className="font-bold">Riwayat audit</h2>{data.audit.map((item,index)=><p key={index}>{item.created_at} · {item.action}: {item.reason}</p>)}</section>
    <section className="gema-card space-y-3"><h2 className="font-bold">Status pengiriman</h2>{data.outbox.map(job=><p key={job.id}>{job.channel}: {job.state} · percobaan {job.attempts}{job.last_error_code?` · ${job.last_error_code}`:""}</p>)}</section></>}
  </main>;
}
