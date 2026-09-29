import type { DisasterType, Severity } from "@/types/report";

export type MockScenario =
  | "flood_high"
  | "flood_critical"
  | "flood_low"
  | "landslide"
  | "fire"
  | "invalid"
  | "uncertain";

export type AnalyzeResponse =
  | {
      validity: "relevant";
      draft_id: string;
      type: DisasterType;
      severity: Severity;
      summary: string;
      reason: string;
    }
  | { validity: "invalid" | "uncertain"; reason: string };

// Simulasi deterministik untuk demo; isi foto tidak diperiksa sebelum integrasi C1.
export function mockAnalyze(scenario: MockScenario): AnalyzeResponse {
  if (scenario === "invalid") {
    return { validity: "invalid", reason: "Foto simulasi ini tidak menunjukkan indikasi banjir, longsor, atau kebakaran." };
  }
  if (scenario === "uncertain") {
    return { validity: "uncertain", reason: "Foto simulasi ini terlalu tidak jelas untuk dinilai. Coba foto lain." };
  }

  const result = {
    flood_high: {
      type: "flood",
      severity: "tinggi",
      summary: "Genangan diperkirakan lebih dari 1 meter dengan arus terlihat deras.",
      reason: "Simulasi banjir dalam dan arus deras yang memerlukan respons segera.",
    },
    flood_critical: {
      type: "flood",
      severity: "kritis",
      summary: "Banjir skala luas tampak menutup banyak rumah dan ruas jalan.",
      reason: "Simulasi dampak regional pada banyak rumah dan jalan sekaligus.",
    },
    flood_low: {
      type: "flood",
      severity: "rendah",
      summary: "Genangan dangkal terlihat; arus tidak tampak deras.",
      reason: "Simulasi genangan dangkal tanpa tanda arus deras.",
    },
    landslide: {
      type: "landslide",
      severity: "tinggi",
      summary: "Material longsor besar tampak bergerak dekat permukiman.",
      reason: "Simulasi material besar yang bergerak dan memerlukan respons segera.",
    },
    fire: {
      type: "fire",
      severity: "tinggi",
      summary: "Asap tebal tampak mengurangi jarak pandang secara signifikan.",
      reason: "Simulasi asap tebal dengan jarak pandang sangat rendah.",
    },
  } as const;
  return { validity: "relevant", draft_id: crypto.randomUUID(), ...result[scenario] };
}
