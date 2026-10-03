"use client";

import { useState } from "react";
import Link from "next/link";
import {
  BookOpen, ChevronDown, ChevronLeft, FileText, Map, MapPin, Phone,
  Quote, ShieldCheck, TrendingUp, Users,
} from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { NavDrawer } from "@/components/NavDrawer";
import { Card } from "@/components/ui/Card";

const whyGema = [
  { icon: Users, title: "Dari masyarakat, untuk masyarakat", desc: "GEMA memudahkan siapa saja untuk melaporkan situasi di sekitar mereka." },
  { icon: MapPin, title: "Informasi berbasis lokasi", desc: "Peta dan daftar diperbarui berkala saat aplikasi aktif, dengan waktu pengamatan dan status bukti." },
  { icon: ShieldCheck, title: "Didukung analisis AI", desc: "AI membantu mengidentifikasi jenis bencana, tingkat keparahan, dan ringkasan laporan." },
];

const features = [
  { icon: FileText, title: "Laporkan Bencana", desc: "Kirim laporan dengan foto, lokasi, dan deskripsi.", href: "/report/new" },
  { icon: Map, title: "Lihat Peta Sebaran", desc: "Pantau laporan di sekitar Anda.", href: "/" },
  { icon: TrendingUp, title: "Lacak Respons", desc: "Lihat status penanganan laporan oleh pihak terkait.", href: "/track" },
  { icon: BookOpen, title: "Panduan Evakuasi", desc: "Dapatkan panduan keselamatan sesuai jenis bencana.", href: "/evakuasi" },
];

const stats = [
  { value: "Warga", label: "Melaporkan dan memberi pengamatan" },
  { value: "Pengelola", label: "Meninjau bukti dan mencatat keputusan" },
  { value: "Responder", label: "Mencatat penerimaan laporan" },
];

const faqs = [
  { q: "Apa itu GEMA?", a: "GEMA (Gerakan Evaluasi dan Monitoring Ancaman) adalah platform untuk melaporkan dan melihat informasi ancaman bencana berdasarkan lokasi, yang dapat diakses oleh masyarakat secara terbuka." },
  { q: "Apakah semua laporan di GEMA sudah diverifikasi?", a: "Tidak. Laporan memiliki status belum dikonfirmasi, sedang ditinjau, atau dikonfirmasi pengelola komunitas. Jumlah pengamatan/pengaduan tidak otomatis menentukan kebenaran atau menghapus laporan." },
  { q: "Bagaimana cara melaporkan bencana?", a: "Buka Buat Laporan, isi waktu pengamatan, sumber informasi, jenis, dan lokasi kejadian. Foto opsional; laporan manual atau meragukan ditinjau dahulu." },
  { q: "Apa arti warna pada peta?", a: "Marker netral menunjukkan laporan belum terkonfirmasi. Warna severity adalah indikasi visual AI, bukan jaminan kondisi aman. Lingkaran hanya jangkauan informasi dari laporan terkonfirmasi, bukan batas bahaya." },
  { q: "Bagaimana AI GEMA menganalisis laporan?", a: "AI membaca foto untuk mengenali indikasi visual jenis bencana dan keparahan. AI tidak membuktikan waktu, lokasi, atau keaslian berita; deskripsi disimpan sebagai keterangan pelapor." },
  { q: "Bagaimana warga membantu peninjauan?", a: "Pilih melihat tanda kejadian, berada di lokasi tetapi tidak melihat tanda, atau belum tahu. Sebut sumber langsung atau informasi dari orang lain. Tidak perlu mendekati lokasi berbahaya." },
  { q: "Bagaimana cara melacak respons?", a: "Buka menu “Lacak Respons” untuk melihat status laporan yang pernah Anda kirim, termasuk apakah sudah diterima oleh petugas terkait." },
  { q: "Apa yang harus dilakukan ketika terjadi bencana?", a: "Lihat “Panduan Evakuasi” untuk langkah keselamatan sesuai jenis bencana, atau hubungi nomor darurat di halaman Hotline jika situasinya mendesak." },
];

export default function AboutPage() {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="min-h-dvh bg-white">
      <AppHeader open={drawerOpen} onMenuClick={() => setDrawerOpen(true)} />

      <main className="mx-auto max-w-3xl px-4 pb-28 pt-6">
        <Link href="/" className="inline-flex min-h-11 items-center gap-1 font-bold text-[#0D5D3A]">
          <ChevronLeft aria-hidden="true" size={22} /> Tentang GEMA
        </Link>

        <section className="mt-4">
          <h1 className="text-2xl font-extrabold text-slate-950">Bergerak, Melihat, Bergema.</h1>
          <p className="mt-2 text-sm text-slate-700">
            GEMA adalah platform untuk membantu masyarakat melaporkan, melihat, dan memantau informasi ancaman bencana di sekitar mereka.
          </p>
          <div className="mt-4 rounded-2xl bg-gradient-to-br from-[#0D5D3A] to-[#0D5D3A]/70 p-5 text-white">
            <Quote aria-hidden="true" size={20} className="opacity-70" />
            <p className="mt-2 text-sm italic">&ldquo;Informasi yang tepat hari ini, keselamatan esok hari.&rdquo;</p>
          </div>
        </section>

        <section className="mt-8">
          <h2 className="text-lg font-bold text-slate-950">Mengapa GEMA?</h2>
          <p className="mt-2 text-sm text-slate-700">
            Bencana dapat terjadi kapan saja dan di mana saja. GEMA menjembatani laporan masyarakat, analisis AI, dan respons pihak terkait agar informasi dapat diakses lebih cepat oleh semua orang.
          </p>
          <div className="mt-4 space-y-3">
            {whyGema.map(({ icon: Icon, title, desc }) => (
              <Card key={title} className="border-slate-200">
                <Icon aria-hidden="true" size={20} className="text-[#0D5D3A]" />
                <p className="mt-2 font-semibold text-slate-900">{title}</p>
                <p className="mt-1 text-sm text-slate-700">{desc}</p>
              </Card>
            ))}
          </div>
        </section>

        <section className="mt-8">
          <h2 className="text-lg font-bold text-slate-950">Apa yang bisa dilakukan di GEMA?</h2>
          <p className="mt-2 text-sm text-slate-700">Fitur utama yang tersedia untuk mendukung kesiapsiagaan dan respons bencana.</p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {features.map(({ icon: Icon, title, desc, href }) => (
              <Link key={href} href={href}>
                <Card className="h-full border-slate-200">
                  <Icon aria-hidden="true" size={20} className="text-[#0D5D3A]" />
                  <p className="mt-2 text-sm font-semibold text-slate-900">{title}</p>
                  <p className="mt-1 text-xs text-slate-600">{desc}</p>
                </Card>
              </Link>
            ))}
          </div>

          <Card className="mt-4 border-emerald-100 bg-emerald-50">
            <p className="text-xs font-semibold text-[#0D5D3A]">Bersama, kita bisa lebih siap</p>
            <h3 className="mt-1 text-base font-bold text-slate-950">Membangun komunitas yang lebih aman</h3>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              {stats.map((stat) => (
                <div key={stat.label}>
                  <p className="text-lg font-extrabold text-[#0D5D3A]">{stat.value}</p>
                  <p className="text-[11px] text-slate-600">{stat.label}</p>
                </div>
              ))}
            </div>
            <p className="mt-3 text-sm text-slate-700">GEMA mendukung kesiapsiagaan komunitas. Dampak lapangan dan kemitraan resmi masih perlu diuji.</p>
          </Card>
        </section>

        <section className="mt-8">
          <h2 className="text-lg font-bold text-slate-950">Pertanyaan Umum (FAQ)</h2>
          <div className="mt-4 divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
            {faqs.map((faq) => (
              <details key={faq.q} className="group p-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-semibold text-slate-900 marker:content-none [&::-webkit-details-marker]:hidden">
                  {faq.q}
                  <ChevronDown aria-hidden="true" size={18} className="shrink-0 text-slate-400 transition-transform group-open:rotate-180" />
                </summary>
                <p className="mt-2 text-sm text-slate-700">{faq.a}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="mt-8">
          <Card className="border-emerald-100 bg-emerald-50 text-center">
            <p className="font-bold text-slate-950">Masih ada pertanyaan?</p>
            <p className="mt-1 text-sm text-slate-700">Jika pertanyaan Anda belum terjawab, silakan hubungi kami melalui kanal resmi.</p>
            <Link
              href="/hotline"
              className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#0D5D3A] px-4 font-semibold text-white hover:bg-[#094a2e]"
            >
              <Phone aria-hidden="true" size={18} /> Hubungi Kami
            </Link>
          </Card>
        </section>
      </main>
      <NavDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </div>
  );
}
