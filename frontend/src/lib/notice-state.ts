import type {Report} from "@/types/report";

// Counts and responder receipts do not constitute a new verification notice.
export function noticeFingerprint(report:Report){
  return [report.id,report.status,report.verification_status,report.closure_reason||"",report.observed_at||"",report.expires_at||"",report.awareness_radius_m||""].join(":");
}
export function readNoticeDismissals():Record<string,number>{
  try{
    const stored=JSON.parse(localStorage.getItem("gema:notice-dismissals")||"{}");
    return Object.fromEntries(Object.entries(stored).filter(([,until])=>typeof until==="number"&&until>Date.now())) as Record<string,number>;
  }catch{return {};}
}
export function dismissNotice(key:string){
  const values={...readNoticeDismissals(),[key]:Date.now()+30*60000};
  try{localStorage.setItem("gema:notice-dismissals",JSON.stringify(values));}catch{/* In-memory dismissal still works if browser storage is unavailable. */}
  return values;
}
