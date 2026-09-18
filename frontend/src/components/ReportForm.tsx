"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { LocationPicker } from "@/components/LocationPicker";
import { ReportMap } from "@/components/ReportMap";
import { useDemoReports } from "@/lib/demo-report-context";
import { disasterNames, type MapLocation } from "@/lib/demo-reports";
import { mockAnalyze, type AnalyzeResponse, type MockScenario } from "@/lib/mock-analyze";
import type { FireDetails, FloodDetails, Report, ReportDetails } from "@/types/report";

const MAX_PHOTO_BYTES = 3 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const scenarios: { value: MockScenario; label: string }[] = [
  { value: "flood_high", label: "Banjir dalam dan arus deras" },
  { value: "flood_critical", label: "Banjir skala luas (kritis)" },
  { value: "flood_low", label: "Genangan dangkal" },
  { value: "landslide", label: "Longsor besar" },
  { value: "fire", label: "Kebakaran dengan asap tebal" },
  { value: "invalid", label: "Foto tidak relevan" },
  { value: "uncertain", label: "Foto tidak jelas" },
];

export function ReportForm() {
  const { addReport } = useDemoReports();
  const [photo, setPhoto] = useState<File | null>(null);
  const [fileError, setFileError] = useState("");
  const [error, setError] = useState("");
  const [location, setLocation] = useState<MapLocation | null>(null);
  const [locationLabel, setLocationLabel] = useState("");
  const [scenario, setScenario] = useState<MockScenario>("flood_high");
  const [analysis, setAnalysis] = useState<AnalyzeResponse | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [submittedId, setSubmittedId] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [waterDepth, setWaterDepth] = useState<FloodDetails["water_depth"]>(null);
  const [current, setCurrent] = useState<FloodDetails["current"]>(null);
  const [coveredArea, setCoveredArea] = useState("");
  const [visibility, setVisibility] = useState<FireDetails["visibility"]>(null);

  function choosePhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setPhoto(null);
    setAnalysis(null);
    setFileError("");
    setError("");
    if (!file) return;
    if (!ALLOWED_TYPES.has(file.type)) {
      setFileError("Pilih foto JPEG, PNG, atau WebP.");
      event.target.value = "";
      return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      setFileError("Ukuran foto maksimal 3 MB.");
      event.target.value = "";
      return;
    }
    setPhoto(file);
  }

  function chooseLocation(next: MapLocation) {
    setLocation(next);
    setLocationLabel(next.label);
    setError("");
  }

  async function analyzePhoto() {
    if (!photo || !ALLOWED_TYPES.has(photo.type) || photo.size > MAX_PHOTO_BYTES) {
      setError("Pilih foto JPEG, PNG, atau WebP berukuran maksimal 3 MB.");
      return;
    }
    if (!location || !locationLabel.trim()) {
      setError("Pilih titik lokasi dan isi keterangan lokasi terlebih dahulu.");
      return;
    }
    setError("");
    setAnalysis(null);
    setAnalyzing(true);
    await new Promise((resolve) => setTimeout(resolve, 450));
    const result = mockAnalyze(scenario);
    if (result.validity === "relevant") {
      setWaterDepth((scenario === "flood_high" || scenario === "flood_critical") ? ">100cm" : scenario === "flood_low" ? "<30cm" : null);
      setCurrent((scenario === "flood_high" || scenario === "flood_critical") ? "deras" : scenario === "flood_low" ? "tenang" : null);
      setCoveredArea(scenario === "landslide" ? "120" : "");
      setVisibility(scenario === "fire" ? "sangat_rendah" : null);
    }
    setAnalysis(result);
    setAnalyzing(false);
  }

  function sendReport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!photo || !location || !locationLabel.trim() || analysis?.validity !== "relevant") {
      setError("Lengkapi foto, lokasi, dan analisis sebelum mengirim.");
      return;
    }
    const details: ReportDetails =
      analysis.type === "flood"
        ? { type: "flood", water_depth: waterDepth, current }
        : analysis.type === "landslide"
          ? { type: "landslide", covered_area_m2: coveredArea ? Number(coveredArea) : null }
          : { type: "fire", visibility };
    const now = new Date().toISOString();
    const report: Report = {
      id: analysis.draft_id,
      status: "active",
      type: analysis.type,
      severity: analysis.severity,
      ai_summary: analysis.summary,
      description: description.trim() || null,
      details,
      location_label: locationLabel.trim(),
      location_source: location.source ?? "demo",
      public_lat: Number(location.lat.toFixed(3)),
      public_lng: Number(location.lng.toFixed(3)),
      published_at: now,
      created_at: now,
      is_demo: true,
      help_status: "belum_ada_konfirmasi",
      seen_count: 0,
      not_seen_count: 0,
      false_vote_count: 0,
    };
    addReport(report);
    setSubmittedId(report.id);
  }

  if (submittedId) {
    return (
      <Card>
        <div role="status">
          <h2 className="text-xl font-bold text-slate-950">Laporan DEMO berhasil dikirim</h2>
          <p className="mt-2 text-slate-700">
            Laporan tersimpan dalam sesi halaman ini. Foto tidak diunggah atau disimpan ke server.
            Data akan hilang setelah halaman dimuat ulang.
          </p>
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link href="/" className="inline-flex min-h-11 items-center rounded-lg bg-blue-700 px-4 font-semibold text-white hover:bg-blue-800">
            Lihat di beranda
          </Link>
          <Link href={`/report/${submittedId}`} className="inline-flex min-h-11 items-center rounded-lg border border-blue-700 px-4 font-semibold text-blue-800 hover:bg-blue-50">
            Lihat detail laporan
          </Link>
        </div>
      </Card>
    );
  }

  return (
    <form onSubmit={sendReport} className="space-y-5">
      <Card>
        <h2 className="text-xl font-bold text-slate-950">1. Unggah foto</h2>
        <p className="mt-1 text-sm text-slate-700">JPEG, PNG, atau WebP; maksimal 3 MB. Foto hanya dipakai untuk simulasi pada sesi ini.</p>
        <label htmlFor="report-photo" className="mt-4 block font-semibold text-slate-900">Foto indikasi bencana</label>
        <input id="report-photo" type="file" accept="image/jpeg,image/png,image/webp" required
          disabled={analyzing} onChange={choosePhoto} className="mt-2 block w-full rounded-lg border border-slate-400 bg-white p-3 text-slate-900" />
        {photo && <p className="mt-2 text-sm text-slate-700">Dipilih: {photo.name} ({(photo.size / 1024 / 1024).toFixed(2)} MB)</p>}
        {fileError && <p role="alert" className="mt-2 font-medium text-red-800">{fileError}</p>}
      </Card>

      <Card>
        <h2 className="text-xl font-bold text-slate-950">2. Pilih lokasi</h2>
        <LocationPicker location={location} onChange={chooseLocation} forReport />
        <label htmlFor="location-label" className="mt-4 block font-semibold text-slate-900">Keterangan lokasi perkiraan</label>
        <input id="location-label" type="text" required maxLength={120} value={locationLabel}
          onChange={(event) => setLocationLabel(event.target.value)}
          placeholder="Contoh: Sekitar Jl. Melati, RW 04"
          className="mt-2 min-h-11 w-full rounded-lg border border-slate-400 bg-white px-3 text-slate-900" />
        <div className="mt-4">
          <ReportMap reports={[]} location={location} onPickLocation={chooseLocation} pickerOnly />
        </div>
      </Card>

      <Card>
        <h2 className="text-xl font-bold text-slate-950">3. Analisis foto</h2>
        <p className="mt-1 text-sm text-slate-700">
          DEMO: hasil dipilih dari skenario di bawah; isi foto belum dianalisis AI sungguhan.
        </p>
        <label htmlFor="mock-scenario" className="mt-4 block font-semibold text-slate-900">Skenario simulasi</label>
        <select id="mock-scenario" value={scenario} disabled={analyzing} onChange={(event) => {
          setScenario(event.target.value as MockScenario);
          setAnalysis(null);
        }} className="mt-2 min-h-11 w-full rounded-lg border border-slate-400 bg-white px-3 text-slate-900">
          {scenarios.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
        </select>
        <button type="button" onClick={analyzePhoto} disabled={analyzing}
          className="mt-4 min-h-11 rounded-lg bg-blue-700 px-4 font-semibold text-white hover:bg-blue-800 disabled:opacity-60">
          {analyzing ? "Menganalisis…" : "Analisis foto"}
        </button>
        {analyzing && <p role="status" className="mt-2 text-slate-700">Menyiapkan hasil simulasi…</p>}
        {error && <p role="alert" className="mt-2 font-medium text-red-800">{error}</p>}
        {analysis && analysis.validity !== "relevant" && (
          <div role="alert" className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-950">
            <p className="font-bold">{analysis.validity === "invalid" ? "Foto tidak relevan" : "Hasil tidak pasti"}</p>
            <p className="mt-1">{analysis.reason}</p>
            <p className="mt-1">Laporan belum dibuat. Pilih foto atau skenario lain lalu analisis ulang.</p>
          </div>
        )}
      </Card>

      {analysis?.validity === "relevant" && (
        <Card>
          <h2 className="text-xl font-bold text-slate-950">4. Tinjau dan kirim</h2>
          <p className="mt-2 text-sm text-slate-700">Penilaian sementara berdasarkan simulasi, belum diverifikasi.</p>
          <dl className="mt-4 space-y-3 text-slate-900">
            <div><dt className="font-semibold">Jenis indikasi</dt><dd>{disasterNames[analysis.type]}</dd></div>
            <div><dt className="font-semibold">Keparahan sementara</dt><dd className="capitalize">{analysis.severity}</dd></div>
            <div><dt className="font-semibold">Ringkasan</dt><dd>{analysis.summary}</dd></div>
            <div><dt className="font-semibold">Alasan</dt><dd>{analysis.reason}</dd></div>
          </dl>

          {analysis.type === "flood" && (
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="water-depth" className="block font-semibold">Kedalaman air</label>
                <select id="water-depth" value={waterDepth ?? ""} onChange={(event) =>
                  setWaterDepth(event.target.value ? event.target.value as FloodDetails["water_depth"] : null)}
                  className="mt-2 min-h-11 w-full rounded-lg border border-slate-400 bg-white px-3">
                  <option value="">Tidak tahu</option>
                  <option value="<30cm">Kurang dari 30 cm</option>
                  <option value="30-100cm">30–100 cm</option>
                  <option value=">100cm">Lebih dari 100 cm</option>
                </select>
              </div>
              <div>
                <label htmlFor="water-current" className="block font-semibold">Arus air</label>
                <select id="water-current" value={current ?? ""} onChange={(event) =>
                  setCurrent(event.target.value ? event.target.value as FloodDetails["current"] : null)}
                  className="mt-2 min-h-11 w-full rounded-lg border border-slate-400 bg-white px-3">
                  <option value="">Tidak tahu</option>
                  <option value="tenang">Tenang</option>
                  <option value="deras">Deras</option>
                </select>
              </div>
            </div>
          )}
          {analysis.type === "landslide" && (
            <div className="mt-5">
              <label htmlFor="covered-area" className="block font-semibold">Perkiraan luas area tertutup (m²)</label>
              <input id="covered-area" type="number" min="1" step="1" value={coveredArea}
                onChange={(event) => setCoveredArea(event.target.value)}
                placeholder="Kosongkan jika tidak tahu"
                className="mt-2 min-h-11 w-full rounded-lg border border-slate-400 bg-white px-3 sm:max-w-xs" />
              <button type="button" onClick={() => setCoveredArea("")}
                className="mt-2 min-h-11 rounded-lg border border-slate-400 px-3 font-medium text-slate-800 hover:bg-slate-50">
                Tidak tahu
              </button>
            </div>
          )}
          {analysis.type === "fire" && (
            <div className="mt-5">
              <label htmlFor="visibility" className="block font-semibold">Jarak pandang akibat asap</label>
              <select id="visibility" value={visibility ?? ""} onChange={(event) =>
                setVisibility(event.target.value ? event.target.value as FireDetails["visibility"] : null)}
                className="mt-2 min-h-11 w-full rounded-lg border border-slate-400 bg-white px-3 sm:max-w-xs">
                <option value="">Tidak tahu</option>
                <option value="jelas">Jelas</option>
                <option value="terbatas">Terbatas</option>
                <option value="sangat_rendah">Sangat rendah</option>
              </select>
            </div>
          )}

          <label htmlFor="description" className="mt-5 block font-semibold">Keterangan tambahan (opsional)</label>
          <textarea id="description" maxLength={500} rows={3} value={description}
            onChange={(event) => setDescription(event.target.value)}
            className="mt-2 w-full rounded-lg border border-slate-400 bg-white p-3" />
          <button type="submit" className="mt-4 min-h-11 rounded-lg bg-green-700 px-5 font-semibold text-white hover:bg-green-800">
            Kirim laporan DEMO
          </button>
        </Card>
      )}
    </form>
  );
}
