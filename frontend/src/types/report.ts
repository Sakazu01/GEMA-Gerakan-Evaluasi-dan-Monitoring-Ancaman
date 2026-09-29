export type DisasterType = "flood" | "landslide" | "fire";
// PRD v2.3 menambah kritis; backend/app/schemas/report.py perlu disinkronkan sebelum C1.
export type Severity = "rendah" | "sedang" | "tinggi" | "kritis";
export type ReportStatus = "draft" | "active" | "disputed_hidden";
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
  id: string;
  status: ReportStatus;
  type: DisasterType;
  severity: Severity;
  ai_summary: string;
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
}
