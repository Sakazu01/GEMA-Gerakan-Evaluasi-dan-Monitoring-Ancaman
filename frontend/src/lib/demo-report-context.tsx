"use client";
import { createContext,useCallback,useContext,useEffect,useRef,useState,type ReactNode } from "react";
import { apiFetch } from "@/lib/api-client";
import type { Report } from "@/types/report";

const ReportContext=createContext<{reports:Report[];loading:boolean;error:string|null;updatedAt:string|null;hasMore:boolean;loadMore:()=>Promise<void>;refresh:()=>Promise<void>}|null>(null);

export function DemoReportProvider({children}:{children:ReactNode}) {
  const [reports,setReports]=useState<Report[]>([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState<string|null>(null);
  const [updatedAt,setUpdatedAt]=useState<string|null>(null);
  const [hasMore,setHasMore]=useState(false);
  const pages=useRef(1);
  const current=useRef<Report[]>([]);
  const morePending=useRef(false);
  const version=useRef(0);
  const failures=useRef(0);
  const refresh=useCallback(async()=>{
    const sequence=++version.current;
    setLoading(true);
    try {
      const next:Report[]=[];let batch:Report[]=[];
      for(let page=0;page<pages.current;page++){
        const last=next.at(-1);
        const suffix=last?`?cursor=${encodeURIComponent(last.published_at!)}&cursor_id=${last.id}`:"";
        batch=await apiFetch<Report[]>(`/api/reports${suffix}`);next.push(...batch);
        if(batch.length<50)break;
      }
      if(sequence!==version.current)return;
      current.current=next;setHasMore(batch.length===50);
      setReports(next);
      setUpdatedAt(new Date().toISOString());
      setError(null);
      failures.current=0;
    } catch(cause) {
      if(sequence===version.current){setError(cause instanceof Error?cause.message:"Data belum dapat dimuat");failures.current++;}
    } finally {if(sequence===version.current)setLoading(false);}
  },[]);
  const loadMore=useCallback(async()=>{
    if(morePending.current||!current.current.length)return;
    morePending.current=true;const sequence=++version.current;setLoading(true);
    try{
      const last=current.current.at(-1)!;
      const next=await apiFetch<Report[]>(`/api/reports?cursor=${encodeURIComponent(last.published_at!)}&cursor_id=${last.id}`);
      if(sequence!==version.current)return;
      const seen=new Set(current.current.map(report=>report.id));
      const combined=[...current.current,...next.filter(report=>!seen.has(report.id))];
      current.current=combined;pages.current++;setReports(combined);setHasMore(next.length===50);setError(null);setUpdatedAt(new Date().toISOString());
    }catch(cause){if(sequence===version.current)setError(cause instanceof Error?cause.message:"Halaman berikutnya belum tersedia");}
    finally{morePending.current=false;if(sequence===version.current)setLoading(false);}
  },[]);
  useEffect(()=>{
    let stopped=false;
    let timer:ReturnType<typeof setTimeout>;
    async function poll(){
      if(stopped)return;
      if(document.visibilityState==="visible")await refresh();
      if(!stopped)timer=setTimeout(poll,Math.min(120000,30000*2**failures.current));
    }
    function changed(){if(document.visibilityState==="visible")void refresh();}
    void poll();
    window.addEventListener("gema:reports-changed",changed);
    document.addEventListener("visibilitychange",changed);
    const requestVersion=version;
    return()=>{stopped=true;requestVersion.current++;clearTimeout(timer);window.removeEventListener("gema:reports-changed",changed);document.removeEventListener("visibilitychange",changed);};
  },[refresh]);
  return <ReportContext.Provider value={{reports,loading,error,updatedAt,hasMore,loadMore,refresh}}>{children}</ReportContext.Provider>;
}
export function useDemoReports(){
  const value=useContext(ReportContext);
  if(!value)throw new Error("Report provider belum tersedia");
  return value;
}
export function reportsChanged(){window.dispatchEvent(new Event("gema:reports-changed"));}
