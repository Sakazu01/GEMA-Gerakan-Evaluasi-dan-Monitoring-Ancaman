"use client";
import { useState } from "react";
import { apiFetch } from "@/lib/api-client";
import { disasterNames } from "@/lib/demo-reports";
import type { DisasterType, Report } from "@/types/report";

// Edit dan hapus hanya muncul selama responder belum menerima laporan.
export function OwnReportActions({ report, onChanged }: { report: Report; onChanged: () => void }) {
  const [mode, setMode] = useState<"idle" | "edit" | "delete">("idle");
  const [description, setDescription] = useState(report.description ?? "");
  const [label, setLabel] = useState(report.location_label);
  const [type, setType] = useState<DisasterType>(report.reported_type ?? report.type);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (report.responder_status !== "PENDING" || report.is_demo || !["active", "held"].includes(report.status)) return null;

  async function run(call: () => Promise<unknown>) {
    setBusy(true); setError("");
    try { await call(); setMode("idle"); onChanged(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Gagal menyimpan. Coba lagi."); }
    finally { setBusy(false); }
  }

  const save = () => run(() => apiFetch(`/api/my-reports/${report.id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ description: description.trim() || null, location_label: label.trim(), reported_type: type }),
  }));
  const remove = () => run(() => apiFetch(`/api/my-reports/${report.id}`, { method: "DELETE" }));

  return (
    <div className="space-y-3 border-t border-slate-200 pt-3">
      {mode === "idle" && (
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className="gema-button-secondary" onClick={() => setMode("edit")}>Ubah laporan</button>
          <button type="button" className="gema-button-secondary text-red-800" onClick={() => setMode("delete")}>Hapus laporan</button>
          <p className="gema-muted w-full">Masih bisa diubah atau dihapus sampai responder menerima laporan.</p>
        </div>
      )}
      {mode === "edit" && (
        <form className="space-y-3" onSubmit={(event) => { event.preventDefault(); void save(); }}>
          <label className="block text-sm font-semibold">Jenis bencana
            <select className="gema-input mt-1" value={type} onChange={(event) => setType(event.target.value as DisasterType)}>
              {(["flood", "landslide", "fire"] as DisasterType[]).map((item) => <option key={item} value={item}>{disasterNames[item]}</option>)}
            </select>
          </label>
          <label className="block text-sm font-semibold">Nama lokasi
            <input className="gema-input mt-1" value={label} maxLength={100} required onChange={(event) => setLabel(event.target.value)} />
          </label>
          <label className="block text-sm font-semibold">Keterangan
            <textarea className="gema-input mt-1" rows={3} value={description} maxLength={500} onChange={(event) => setDescription(event.target.value)} />
          </label>
          <div className="flex gap-2">
            <button type="submit" className="gema-button" disabled={busy || !label.trim()}>{busy ? "Menyimpan…" : "Simpan perubahan"}</button>
            <button type="button" className="gema-button-secondary" disabled={busy} onClick={() => setMode("idle")}>Batal</button>
          </div>
        </form>
      )}
      {mode === "delete" && (
        <div className="space-y-3 rounded-xl border border-red-200 bg-red-50 p-3" role="alertdialog" aria-label="Konfirmasi hapus laporan">
          <p className="font-semibold text-red-950">Hapus laporan ini? Foto dan datanya dihapus dan tidak bisa dikembalikan.</p>
          <div className="flex gap-2">
            <button type="button" className="inline-flex min-h-11 items-center rounded-lg bg-[#CF0003] px-4 font-semibold text-white" disabled={busy} onClick={() => void remove()}>{busy ? "Menghapus…" : "Ya, hapus"}</button>
            <button type="button" className="gema-button-secondary" disabled={busy} onClick={() => setMode("idle")}>Batal</button>
          </div>
        </div>
      )}
      {error && <p role="alert" className="text-sm font-semibold text-red-800">{error}</p>}
    </div>
  );
}
