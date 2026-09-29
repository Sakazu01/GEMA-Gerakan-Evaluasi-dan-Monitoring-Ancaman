"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { NavDrawer } from "@/components/NavDrawer";
import { Card } from "@/components/ui/Card";

const asset = "/assets/figma/";
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
    <div className="min-h-dvh bg-[#f9ffec] text-[#373737]">
      <header className="flex h-[95px] items-end justify-between bg-[#edffc2] px-4 pb-3">
        <Link href="/" aria-label="GEMA — kembali ke beranda" className="flex min-h-11 items-center">
          <Image src={`${asset}tracker-logo.png`} alt="GEMA" width={77} height={35} className="h-[35px] w-[77px] object-contain" priority />
        </Link>
        <button type="button" aria-label="Buka menu" aria-haspopup="true" aria-expanded={drawerOpen}
          onClick={() => setDrawerOpen(true)} className="flex min-h-11 min-w-11 items-center justify-center rounded-lg">
          <Image src={`${asset}menu.svg`} alt="" width={24} height={24} />
        </button>
      </header>

      <main className="mx-auto max-w-3xl px-4 pb-28 pt-3">
        <div className="flex items-center gap-1">
          <Link href="/" aria-label="Kembali ke beranda" className="flex min-h-11 min-w-11 items-center justify-center rounded-lg">
            <Image src={`${asset}arrow-left.svg`} alt="" width={24} height={24} />
          </Link>
          <h1 className="text-2xl font-semibold text-[#0d5d3a]">Hotline</h1>
        </div>
        <p className="mt-1 text-xs leading-relaxed">
          Nomor darurat resmi untuk meminta bantuan sesuai kebutuhan. Ketersediaan layanan 112 bergantung pada daerah.
        </p>

        <ul className="mt-3 space-y-2.5">
          {services.map((service) => (
            <li key={service.number}>
              <Card className="!border-[#cecece] !p-3 !shadow-none">
                <h2 className="text-xl font-semibold">{service.number}</h2>
                <p className="mt-1 text-base font-medium">{service.name}</p>
                <p className="mt-2 text-xs leading-relaxed">{service.description}</p>
                <a href={`tel:${service.number}`}
                  className="mt-3 flex min-h-11 w-full items-center justify-center rounded-lg bg-[#0d5d3a] px-3 text-sm font-medium text-white hover:bg-[#094a2e]">
                  Hubungi {service.number}
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
