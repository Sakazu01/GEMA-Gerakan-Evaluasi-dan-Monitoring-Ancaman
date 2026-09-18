"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { NavDrawer } from "@/components/NavDrawer";
import { disasterNames } from "@/lib/demo-reports";
import type { DisasterType } from "@/types/report";

const asset = "/assets/figma/";
const guides: Record<DisasterType, { title: string; description: string }> = {
  flood: {
    title: "Jauhi Arus dan Genangan Dalam",
    description: "Jangan menyeberangi arus banjir. Bergerak ke tempat lebih tinggi jika aman, dan ikuti arahan petugas.",
  },
  landslide: {
    title: "Jauhi Jalur Longsor",
    description: "Menjauh dari lereng dan material yang bergerak. Cari tempat lapang jika aman, lalu waspadai longsor susulan.",
  },
  fire: {
    title: "Jauhi Api dan Asap",
    description: "Segera menjauh dari sumber api dan asap. Ikuti jalur keluar yang aman; jangan kembali untuk mengambil barang.",
  },
};
const sharedSteps = [
  {
    title: "Bawa Seperlunya",
    description: "Utamakan keselamatan. Bawa obat, dokumen penting, dan telepon jika mudah dijangkau; tinggalkan barang berat.",
  },
  {
    title: "Periksa Listrik dan Gas Jika Aman",
    description: "Matikan hanya jika dapat dilakukan tanpa mendekati bahaya. Jangan menyentuh peralatan listrik saat berada di air.",
  },
  {
    title: "Ikuti Arahan Petugas",
    description: "Gunakan jalur yang ditunjukkan petugas setempat. Bantu anak-anak, lansia, dan orang yang kesulitan bergerak tanpa membahayakan diri.",
  },
];
const types: DisasterType[] = ["flood", "landslide", "fire"];

export default function EvakuasiPage() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selected, setSelected] = useState<DisasterType>("fire");

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
          <h1 className="text-2xl font-semibold text-[#0d5d3a]">Panduan Evakuasi</h1>
        </div>

        <div className="mt-2 flex min-h-[170px] flex-col items-center justify-center rounded-lg bg-[#e2e2e2] px-5 text-center">
          <p className="text-sm font-semibold">Titik kumpul dan rute belum tersedia di GEMA</p>
          <p className="mt-1 text-xs">Ikuti petunjuk petugas setempat untuk menemukan tempat yang aman.</p>
        </div>

        <section aria-labelledby="jenis-panduan" className="mt-4">
          <h2 id="jenis-panduan" className="text-sm font-medium">Pilih jenis bencana</h2>
          <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="Jenis panduan evakuasi">
            {types.map((type) => (
              <button key={type} type="button" aria-pressed={selected === type} onClick={() => setSelected(type)}
                className={`min-h-11 rounded-lg border px-3 text-sm font-medium ${selected === type
                  ? "border-[#0d5d3a] bg-[#0d5d3a] text-white"
                  : "border-[#cecece] bg-white text-[#373737]"}`}>
                {disasterNames[type]}
              </button>
            ))}
          </div>
          <p className="mt-3 text-xs">Panduan umum untuk {disasterNames[selected].toLowerCase()}. Laporan warga yang tampil di GEMA belum diverifikasi.</p>
        </section>

        <section aria-labelledby="langkah-evakuasi" className="mt-5">
          <h2 id="langkah-evakuasi" className="text-base font-semibold">Lakukan Ini Sekarang:</h2>
          <ol className="mt-3 space-y-3">
            {[guides[selected], ...sharedSteps].map((step) => (
              <li key={step.title}>
                <h3 className="text-sm font-semibold">{step.title}</h3>
                <p className="mt-1 text-sm leading-relaxed">{step.description}</p>
              </li>
            ))}
          </ol>
        </section>

        <div className="mt-5 grid grid-cols-2 gap-2">
          <Link href="/hotline" className="flex min-h-11 items-center justify-center rounded-lg bg-[#dd4040] px-3 text-center text-sm font-medium text-white hover:bg-[#c53333]">
            Jika Terjebak
          </Link>
          <a href="#di-titik-kumpul" className="flex min-h-11 items-center justify-center rounded-lg bg-[#0d5d3a] px-3 text-center text-sm font-medium text-white hover:bg-[#094a2e]">
            Di Titik Kumpul
          </a>
        </div>
        <section id="di-titik-kumpul" aria-labelledby="judul-titik-kumpul" className="mt-5 rounded-lg border border-[#cecece] bg-white p-3">
          <h2 id="judul-titik-kumpul" className="text-sm font-semibold">Saat tiba di titik kumpul</h2>
          <p className="mt-1 text-sm">Laporkan kehadiran Anda kepada petugas posko dan ikuti informasi resmi. GEMA tidak mencatat kehadiran atau mengirim permintaan bantuan.</p>
        </section>
        <p className="mt-4 text-xs">
          Panduan umum mengacu pada{" "}
          <a href="https://bnpb.go.id/storage/app/media/Buku%20BNPB/Buku%20Saku%20Bencana%20BNPB.pdf"
            target="_blank" rel="noopener noreferrer" className="font-medium underline">Buku Saku Bencana BNPB</a>.
        </p>
      </main>
      <NavDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </div>
  );
}
