import Link from "next/link";
import { ReportForm } from "@/components/ReportForm";

export default function NewReportPage() {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 pb-28 pt-8 sm:px-6">
      <Link href="/" className="inline-flex min-h-11 items-center font-semibold text-blue-800 underline">Kembali ke beranda</Link>
      <h1 className="mt-3 text-3xl font-bold text-slate-950">Buat laporan warga</h1>
      <p className="mt-2 mb-6 text-slate-700">
        Laporkan indikasi banjir, tanah longsor, atau kebakaran. Alur ini memakai AI mock untuk DEMO dan belum memverifikasi kejadian.
      </p>
      <ReportForm />
    </main>
  );
}
