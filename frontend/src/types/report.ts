export type DisasterType = "flood" | "landslide" | "fire";
// PRD v2.3 menambah kritis; backend/app/schemas/report.py perlu disinkronkan sebelum C1.
export type Severity = "rendah" | "sedang" | "tinggi" | "kritis";
export type ReportStatus = "draft" | "active" | "disputed_hidden" | "held" | "closed";
export type ResponderStatus = "PENDING" | "ACCEPTED";
export type LocationSource = "device" | "map" | "demo";
export type HelpVoteValue = "seen" | "not_seen";
export type HelpStatus = "belum_ada_konfirmasi" | "belum_terlihat" | "terlihat";

export interface FloodDetails {
  water_depth: "<30cm" | "30-100cm" | ">100cm" | null;
  current: "tenang" | "deras" | null;
}

export interface LandslideDetails {
  covered_area_m2: number | null;
}

export interface FireDetails {
  visibility: "jelas" | "terbatas" | "sangat_rendah" | null;
}

export type ReportDetails =
  | ({ type: "flood" } & FloodDetails)
  | ({ type: "landslide" } & LandslideDetails)
  | ({ type: "fire" } & FireDetails);

// Proyeksi publik — sesuai kontrak GET /api/reports di PRD §19 (tanpa photo_path/author_id/koordinat asli).
export interface Report {
  review_requested?: boolean;
  awareness_radius_m?: number | null;
  id: string;
  status: ReportStatus;
  responder_status: ResponderStatus;
  type: DisasterType;
  severity: Severity | null;
  ai_summary: string | null;
  description: string | null;
  details: ReportDetails | null;
  location_label: string;
  location_source: LocationSource;
  public_lat: number;
  public_lng: number;
  published_at: string | null;
  created_at: string;
  is_demo: boolean;
  help_status: HelpStatus;
  seen_count: number;
  not_seen_count: number;
  false_vote_count: number;
  verification_status: "unconfirmed" | "under_review" | "confirmed";
  closure_reason: "resolved" | "expired" | "refuted" | null;
  ai_status: "pending" | "relevant" | "uncertain" | "invalid" | "unavailable" | "not_requested";
  reported_type: DisasterType | null;
  ai_disaster_type: DisasterType | null;
  observed_at: string | null;
  observation_time_known: boolean;
  photo_source: "camera" | "gallery" | "forwarded" | "none";
  expires_at: string | null;
  verified_at: string | null;
  public_verification_note: string | null;
  version: number;
  observation_counts: { direct_seen_nearby: number; direct_not_observed_nearby: number; secondhand: number; unsure: number };
}

// Kontrak POST /api/analyze.
export type AnalyzeResponse =
  | {
      validity: "relevant";
      draft_id: string;
      type: DisasterType;
      severity: Severity;
      summary: string;
      reason: string;
    }
  | { validity: "invalid" | "uncertain"; reason: string; draft_id?: string; ai_status?: string };

export interface DraftAnalysis {
  draft_id: string;
  ai_status: Report["ai_status"];
  type?: DisasterType | null;
  severity?: Severity | null;
  summary?: string | null;
  reason?: string;
}

export interface NearbyResult {
  data_as_of: string;
  location_mode: "device" | "area";
  location_valid: boolean;
  items: { report_id: string; reported_type: DisasterType; location_label: string; distance_m: number; observed_at: string;
    verification_status: Report["verification_status"]; notice_kind: "awareness" | "observation_invitation"; report: Report }[];
}
