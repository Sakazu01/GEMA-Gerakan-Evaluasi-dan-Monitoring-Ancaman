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
  { icon: MapPin, title: "Informasi berbasis lokasi", desc: "Laporan ditampilkan pada peta secara real-time untuk memberikan gambaran kondisi di lapangan." },
  { icon: ShieldCheck, title: "Didukung analisis AI", desc: "AI membantu mengidentifikasi jenis bencana, tingkat keparahan, dan ringkasan laporan." },
];

const features = [
  { icon: FileText, title: "Laporkan Bencana", desc: "Kirim laporan dengan foto, lokasi, dan deskripsi.", href: "/report/new" },
  { icon: Map, title: "Lihat Peta Sebaran", desc: "Pantau laporan di sekitar Anda.", href: "/" },
  { icon: TrendingUp, title: "Lacak Respons", desc: "Lihat status penanganan laporan oleh pihak terkait.", href: "/track" },
  { icon: BookOpen, title: "Panduan Evakuasi", desc: "Dapatkan panduan keselamatan sesuai jenis bencana.", href: "/evakuasi" },
];

const stats = [
  { value: "1.200+", label: "Laporan masyarakat" },
  { value: "120+", label: "Lokasi terdampak" },
  { value: "15+", label: "Instansi terhubung" },
];

const faqs = [
  { q: "Apa itu GEMA?", a: "GEMA (Gerakan Evaluasi dan Monitoring Ancaman) adalah platform untuk melaporkan dan melihat informasi ancaman bencana berdasarkan lokasi, yang dapat diakses oleh masyarakat secara terbuka." },
  { q: "Apakah semua laporan di GEMA sudah diverifikasi?", a: "Laporan tayang otomatis setelah dikirim. Jika 3 pengguna berbeda menyanggah laporan yang sama, laporan itu disembunyikan sementara dari peta publik sampai ditinjau ulang." },
  { q: "Bagaimana cara melaporkan bencana?", a: "Buka “Laporkan Bencana”, sertakan foto kejadian dan lokasi Anda, lalu kirim. AI akan membantu mengisi jenis bencana dan tingkat keparahan sebagai draf yang bisa Anda periksa sebelum diterbitkan." },
  { q: "Apa arti warna pada peta?", a: "Hijau (terkendali), kuning (waspada, radius ±1 km), merah (bahaya, radius 3–5 km), dan hitam (kritis, radius >10 km) — menunjukkan tingkat keparahan laporan yang aktif." },
  { q: "Bagaimana AI GEMA menganalisis laporan?", a: "AI membaca foto dan deskripsi yang Anda kirim untuk menyusun ringkasan, alasan, jenis bencana, dan perkiraan tingkat keparahan secara otomatis." },
  { q: "Apakah hasil AI selalu benar?", a: "Tidak selalu. Hasil AI adalah bantuan awal, bukan keputusan final — karena itu laporan tetap bisa disanggah warga lain jika dirasa tidak akurat." },
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
            <p className="mt-3 text-[11px] text-slate-500">*Data simulasi untuk keperluan demonstrasi.</p>
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
