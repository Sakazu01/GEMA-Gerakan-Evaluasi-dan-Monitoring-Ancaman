"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, Phone } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { NavDrawer } from "@/components/NavDrawer";
import { Card } from "@/components/ui/Card";

const services = [
  {
    number: "112",
    name: "Panggilan Darurat Terpadu",
    description: "Untuk keadaan darurat umum. Pusat layanan daerah dapat menghubungkan Anda ke petugas terkait.",
  },
  {
    number: "115",
    name: "Pencarian & Pertolongan (BASARNAS)",
    description: "Untuk kecelakaan, bencana, atau kondisi yang membahayakan jiwa dan memerlukan pencarian atau evakuasi.",
  },
  {
    number: "117",
    name: "Pusdalops BNPB",
    description: "Untuk melaporkan kejadian bencana dan meminta informasi penanganan bencana.",
  },
  {
    number: "119",
    name: "Darurat Kesehatan (PSC 119)",
    description: "Untuk bantuan penanganan medis darurat dan kondisi kesehatan kritis.",
  },
  {
    number: "113",
    name: "Pemadam Kebakaran",
    description: "Untuk melaporkan kebakaran dan meminta bantuan pemadam kebakaran.",
  },
  {
    number: "110",
    name: "Kepolisian RI",
    description: "Untuk laporan kejadian darurat, gangguan keamanan, atau permintaan bantuan kepolisian.",
  },
];

export default function HotlinePage() {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="min-h-dvh">
      <AppHeader open={drawerOpen} onMenuClick={() => setDrawerOpen(true)} />

      <main className="mx-auto max-w-3xl px-4 pb-28 pt-6">
        <Link href="/" className="inline-flex min-h-11 items-center gap-1 font-bold text-[#0D5D3A]">
          <ChevronLeft aria-hidden="true" size={22} /> Hotline
        </Link>
        <p className="mt-2 text-sm text-slate-700">
          Nomor darurat resmi untuk meminta bantuan sesuai kebutuhan. Ketersediaan layanan 112 bergantung pada daerah.
        </p>

        <ul className="mt-4 space-y-3">
          {services.map((service) => (
            <li key={service.number}>
              <Card className="border-slate-200">
                <h2 className="text-xl font-bold text-slate-950">{service.number}</h2>
                <p className="mt-1 font-semibold text-slate-900">{service.name}</p>
                <p className="mt-2 text-sm text-slate-700">{service.description}</p>
                <a
                  href={`tel:${service.number}`}
                  className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#0D5D3A] px-3 font-semibold text-white hover:bg-[#094a2e]"
                >
                  <Phone aria-hidden="true" size={18} /> Hubungi {service.number}
                </a>
              </Card>
            </li>
          ))}
        </ul>
      </main>
      <NavDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </div>
  );
}
