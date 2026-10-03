import type {Report} from "@/types/report";

export function EvidenceBadge({report}:{report:Report}) {
  const state=report.status==="closed"?"closed":report.verification_status;
  const labels={unconfirmed:"Belum dikonfirmasi",under_review:"Sedang ditinjau",confirmed:"Dikonfirmasi pengelola komunitas",closed:report.closure_reason==="refuted"?"Ditutup: informasi tidak sesuai":report.closure_reason==="resolved"?"Ditutup: kejadian selesai":"Ditutup: informasi kedaluwarsa"};
  return <span className={`evidence-badge evidence-${state}`}>{state==="confirmed"?"✓ ":state==="under_review"?"ⓘ ":""}{labels[state]}</span>;
}
