"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { Camera, ChevronLeft, Loader2 } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { LocationPicker } from "@/components/LocationPicker";
import { NavDrawer } from "@/components/NavDrawer";
import { ReportMap } from "@/components/ReportMap";
import { disasterBadge, disasterGuides, severityMap, type MapLocation } from "@/lib/demo-reports";
import { apiFetch } from "@/lib/api-client";
import { requestDeviceLocation } from "@/lib/geolocation";
import type { AnalyzeResponse, FireDetails, FloodDetails, ReportDetails } from "@/types/report";

const MAX_PHOTO_BYTES = 10 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export function ReportForm() {
  const [step, setStep] = useState<"capture" | "review">("capture");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [fileError, setFileError] = useState("");
  const [error, setError] = useState("");
  const [location, setLocation] = useState<MapLocation | null>(null);
  const [locationLabel, setLocationLabel] = useState("");
  const [locationMessage, setLocationMessage] = useState("Mencari lokasi perangkat...");
  const [analysis, setAnalysis] = useState<AnalyzeResponse | null>(null);
  const [analyzedAt, setAnalyzedAt] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submittedId, setSubmittedId] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [waterDepth, setWaterDepth] = useState<FloodDetails["water_depth"]>(null);
  const [current, setCurrent] = useState<FloodDetails["current"]>(null);
  const [coveredArea, setCoveredArea] = useState<number | null>(null);
  const [visibility, setVisibility] = useState<FireDetails["visibility"]>(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const pickedManually = useRef(false);
  const requestedLocation = useRef(false);

  useEffect(() => () => {
    if (photoUrl) URL.revokeObjectURL(photoUrl);
  }, [photoUrl]);

  // Matikan kamera saat komponen dilepas, biar lampu kamera perangkat tidak nyala terus.
  useEffect(() => () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
  }, []);

  useEffect(() => {
    if (requestedLocation.current) return;
    requestedLocation.current = true;
    requestDeviceLocation(
      (next) => {
        if (pickedManually.current) return;
        setLocation(next);
        setLocationLabel(next.label);
      },
      (message) => { if (!pickedManually.current) setLocationMessage(message); },
    );
  }, []);

  function chooseLocation(next: MapLocation) {
    pickedManually.current = true;
    setLocation(next);
    setLocationLabel(next.label);
    setLocationMessage("");
  }

  function acceptPhoto(file: File) {
    setFileError("");
    setError("");
    setAnalysis(null);
    if (!ALLOWED_TYPES.has(file.type)) {
      setFileError("Pilih foto JPEG, PNG, atau WebP.");
      return;
    }
    if (file.size === 0 || file.size > MAX_PHOTO_BYTES) {
      setFileError("Ukuran foto maksimal 10 MB dan tidak boleh kosong.");
      return;
    }
    setPhoto(file);
    setPhotoUrl(URL.createObjectURL(file));
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCameraOn(false);
  }

  async function startCamera() {
    setCameraError("");
    setFileError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setCameraOn(true);
    } catch {
      setCameraError("Tidak dapat mengakses kamera. Pastikan izin kamera diberikan pada browser ini.");
    }
  }

  function capturePhoto() {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    canvas.toBlob((blob) => {
      if (blob) acceptPhoto(new File([blob], `laporan-${Date.now()}.jpg`, { type: "image/jpeg" }));
    }, "image/jpeg", 0.9);
    stopCamera();
  }

  function handleCameraButtonClick() {
    if (cameraOn) {
      capturePhoto();
      return;
    }
    if (photoUrl) {
      URL.revokeObjectURL(photoUrl);
      setPhoto(null);
      setPhotoUrl(null);
    }
    void startCamera();
  }

  async function analyzePhoto() {
    if (!photo) return;
    setError("");
    setAnalyzing(true);
    try {
      const formData = new FormData();
      formData.append("photo", photo);
      const result = await apiFetch<AnalyzeResponse>("/api/analyze", { method: "POST", body: formData });
      if (result.validity === "relevant") {
        setWaterDepth(null);
        setCurrent(null);
        setCoveredArea(null);
        setVisibility(null);
        setAnalyzedAt(new Date().toISOString());
        setStep("review");
      } else {
        setError(result.reason || "Foto belum cukup jelas untuk dianalisis. Coba foto lain.");
      }
      setAnalysis(result);
    } catch (cause) {
      setError(cause instanceof Error && cause.name !== "TypeError"
        ? cause.message
        : "Tidak dapat menghubungi server analisis. Pastikan backend berjalan di port 8000.");
    } finally {
      setAnalyzing(false);
    }
  }

  async function sendReport(event: FormEvent) {
    event.preventDefault();
    if (!location || !locationLabel.trim() || analysis?.validity !== "relevant") {
      setError("Lengkapi lokasi kejadian sebelum mengirim.");
      return;
    }
    const details: ReportDetails =
      analysis.type === "flood"
        ? { type: "flood", water_depth: waterDepth, current }
        : analysis.type === "landslide"
          ? { type: "landslide", covered_area_m2: coveredArea }
          : { type: "fire", visibility };

    setSubmitting(true);
    setError("");
    try {
      const result = await apiFetch<{ id: string }>("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          draft_id: analysis.draft_id, lat: location.lat, lng: location.lng,
          location_source: location.source ?? "demo", location_label: locationLabel.trim(),
          description: description.trim() || null, details,
        }),
      });
      setSubmittedId(result.id);
    } catch {
      setError("Laporan gagal dikirim. Data yang sudah diisi tetap ada, coba lagi.");
    } finally {
      setSubmitting(false);
    }
  }

  if (submittedId) {
    return (
      <div className="min-h-dvh bg-[#F7F6E4]">
        <AppHeader open={drawerOpen} onMenuClick={() => setDrawerOpen(true)} />
        <div className="mx-auto max-w-md space-y-4 p-6 text-center">
          <h1 className="text-xl font-bold text-slate-950">Laporan warga berhasil diterbitkan</h1>
          <p className="text-slate-700">Informasi belum diverifikasi petugas.</p>
          <div className="flex flex-col gap-3">
            <Link href="/" className="min-h-11 rounded-lg bg-[#0D5D3A] px-4 py-2 font-semibold text-white">Lihat di beranda</Link>
            <Link href={`/report/${submittedId}`} className="min-h-11 rounded-lg border border-[#0D5D3A] px-4 py-2 font-semibold text-[#0D5D3A]">Lihat detail laporan</Link>
          </div>
        </div>
        <NavDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
      </div>
    );
  }

  // Layar 1-2 wireframe: ambil/pilih foto, lalu pratinjau sebelum dianalisis.
  if (step === "capture") {
    return (
      <div className="flex min-h-dvh flex-col bg-[#0D5D3A]">
        <AppHeader open={drawerOpen} onMenuClick={() => setDrawerOpen(true)} />
        <div className="relative flex-1">
          <video ref={videoRef} autoPlay playsInline muted
            className={`absolute inset-0 h-full w-full object-cover ${cameraOn ? "" : "hidden"}`} />
          {!cameraOn && (
            photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- pratinjau file lokal, bukan aset statis.
              <img src={photoUrl} alt="Pratinjau foto laporan" className="absolute inset-0 h-full w-full object-cover" />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center bg-[#0D5D3A]">
                <p className="px-8 text-center text-white/80">Ketuk tombol di bawah untuk mengambil foto kejadian.</p>
              </div>
            )
          )}
          {cameraOn && (
            <p className="absolute left-0 right-0 top-3 bg-black/30 py-1 text-center text-sm text-white">
              Pastikan kamera anda stabil, lalu ketuk tombol kamera untuk mengambil foto
            </p>
          )}
          {analyzing && (
            <div role="status" className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/60 text-white">
              <Loader2 aria-hidden="true" size={40} className="animate-spin" />
              <p className="font-semibold">Menganalisis foto…</p>
              <p className="px-8 text-center text-sm text-white/80">Sistem sedang memeriksa jenis dan tingkat keparahan bencana dari foto.</p>
            </div>
          )}
        </div>
        {cameraError && <p role="alert" className="bg-red-100 p-2 text-center font-medium text-red-900">{cameraError}</p>}
        {fileError && <p role="alert" className="bg-red-100 p-2 text-center font-medium text-red-900">{fileError}</p>}
        {error && <p role="alert" className="bg-red-100 p-2 text-center font-medium text-red-900">{error}</p>}
        <div className="grid grid-cols-3 items-center gap-3 bg-[#0D5D3A] px-6 pt-6">
          <Link href="/" aria-label="Kembali ke beranda" className="flex min-h-11 min-w-11 items-center text-white">
            <ChevronLeft aria-hidden="true" size={28} />
          </Link>
          <button type="button" disabled={analyzing} aria-label={cameraOn ? "Ambil foto sekarang" : "Nyalakan kamera"}
            onClick={handleCameraButtonClick}
            className="flex h-16 w-16 items-center justify-center justify-self-center rounded-full border-4 border-white/60 bg-white disabled:bg-slate-300">
            <Camera aria-hidden="true" className="text-[#0D5D3A]" size={26} />
          </button>
          <div aria-hidden="true" />
        </div>
        <div className="bg-[#0D5D3A] px-6 pb-12 pt-4 text-center">
          <p className="text-sm text-white/80">JPEG, PNG, atau WebP. Maksimal 10 MB.</p>
          {photo && <button type="button" disabled={analyzing} onClick={analyzePhoto}
            className="mt-3 min-h-11 w-full rounded-lg bg-white px-4 py-2 font-semibold text-[#0D5D3A] disabled:opacity-60">
            {analyzing ? "Menganalisis foto..." : "Analisis foto"}
          </button>}
        </div>
        <NavDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
      </div>
    );
  }

  // Layar 3-5 wireframe: "Hasil Identifikasi", field beda per jenis bencana.
  const relevant = analysis?.validity === "relevant" ? analysis : null;
  const badge = relevant ? disasterBadge[relevant.type] : null;
  const severity = relevant ? severityMap[relevant.severity] : null;
  const guide = relevant ? disasterGuides[relevant.type] : null;
  return (
    <div className="min-h-dvh bg-[#F7F6E4]">
      <AppHeader open={drawerOpen} onMenuClick={() => setDrawerOpen(true)} />
      <form onSubmit={sendReport} className="mx-auto max-w-md space-y-4 p-4">
        <button type="button" onClick={() => setStep("capture")} className="flex min-h-11 items-center gap-1 font-bold text-[#0D5D3A]">
          <ChevronLeft aria-hidden="true" size={22} /> Hasil Identifikasi
        </button>

        {badge && relevant && severity && guide && (
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-semibold text-white" style={{ background: badge.bg }}>
                {/* eslint-disable-next-line @next/next/no-img-element -- ikon PNG kecil, next/image tidak perlu di sini. */}
                <img src={badge.icon} alt="" width={16} height={16} /> {badge.label}
              </span>
              <span className="rounded-full px-3 py-1 text-sm font-bold" style={{ background: severity.color, color: severity.textColor }}>
                {severity.label}
              </span>
            </div>
            <p className="mt-3 text-sm text-slate-700">
              {locationLabel || "Lokasi belum dipilih"}, {analyzedAt && new Date(analyzedAt).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}
            </p>
            <p className="mt-3 text-sm text-slate-700">{relevant.summary}</p>
            <p className="mt-3 font-semibold text-slate-900">{guide.headline} — yang perlu dilakukan:</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-800">
              {guide.do.map((tip) => <li key={tip}>{tip}</li>)}
            </ul>
          </div>
        )}

        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <LocationPicker location={location} message={locationMessage} />
          <div className="mt-3">
            <ReportMap reports={[]} location={location} onPickLocation={chooseLocation} pickerOnly />
          </div>
        </div>

        {relevant?.type === "flood" && (
          <fieldset className="rounded-lg border border-slate-200 bg-white p-4">
            <legend className="px-1 font-bold text-slate-900">Tinggi air saat ini</legend>
            {([["<30cm", "Semata kaki (<30 cm)"], ["30-100cm", "Selutut (30–100 cm)"], [">100cm", "Sepinggang atau lebih (>100 cm)"]] as const).map(([value, label]) => (
              <label key={value} className="mt-2 flex min-h-11 items-center gap-2 text-slate-900">
                <input type="radio" name="water_depth" checked={waterDepth === value} onChange={() => setWaterDepth(value)} /> {label}
              </label>
            ))}
            <legend className="mt-3 px-1 font-bold text-slate-900">Arus air</legend>
            {([["tenang", "Tenang"], ["deras", "Deras"]] as const).map(([value, label]) => (
              <label key={value} className="mt-2 flex min-h-11 items-center gap-2 text-slate-900">
                <input type="radio" name="current" checked={current === value} onChange={() => setCurrent(value)} /> {label}
              </label>
            ))}
          </fieldset>
        )}
        {relevant?.type === "fire" && (
          <fieldset className="rounded-lg border border-slate-200 bg-white p-4">
            <legend className="px-1 font-bold text-slate-900">Jarak pandang akibat asap</legend>
            {([["jelas", "Jelas"], ["terbatas", "Terbatas"], ["sangat_rendah", "Sangat rendah"]] as const).map(([value, label]) => (
              <label key={value} className="mt-2 flex min-h-11 items-center gap-2 text-slate-900">
                <input type="radio" name="visibility" checked={visibility === value} onChange={() => setVisibility(value)} /> {label}
              </label>
            ))}
          </fieldset>
        )}
        {relevant?.type === "landslide" && (
          <fieldset className="rounded-lg border border-slate-200 bg-white p-4">
            <legend className="px-1 font-bold text-slate-900">Perkiraan luas area tertutup</legend>
            {([[10, "Kecil (sekitar 10 m²)"], [50, "Sedang (sekitar 50 m²)"], [150, "Luas (lebih dari 100 m²)"]] as const).map(([value, label]) => (
              <label key={value} className="mt-2 flex min-h-11 items-center gap-2 text-slate-900">
                <input type="radio" name="covered_area" checked={coveredArea === value} onChange={() => setCoveredArea(value)} /> {label}
              </label>
            ))}
            <label className="mt-2 flex min-h-11 items-center gap-2 text-slate-900">
              <input type="radio" name="covered_area" checked={coveredArea === null} onChange={() => setCoveredArea(null)} /> Tidak tahu
            </label>
          </fieldset>
        )}

        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <label htmlFor="description" className="block font-bold text-slate-900">Deskripsikan kondisi bencana (opsional)</label>
          <textarea id="description" maxLength={500} rows={3} value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Deskripsi"
            className="mt-2 w-full rounded-lg border border-slate-300 p-2 text-slate-900" />
        </div>

        {error && <p role="alert" className="font-medium text-red-800">{error}</p>}
        <button type="submit" disabled={submitting}
          className="min-h-11 w-full rounded-lg bg-[#0D5D3A] font-semibold text-white disabled:opacity-60">
          {submitting ? "Laporan sedang dikirim…" : "Unggah"}
        </button>
      </form>
      <NavDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </div>
  );
}
