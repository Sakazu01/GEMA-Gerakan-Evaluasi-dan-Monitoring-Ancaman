"use client";

import Image from "next/image";
import Link from "next/link";
import { Menu } from "lucide-react";

// Header hijau + logo + tombol drawer -- satu-satunya versi, dipakai di semua
// halaman (beranda, hotline, evakuasi, track) supaya tidak ada lagi header
// dengan warna/logo/ikon berbeda-beda per halaman (lihat PRD §17).
export function AppHeader({ open, onMenuClick }: { open: boolean; onMenuClick: () => void }) {
  return (
    <header className="flex h-[95px] items-center justify-between bg-[#0D5D3A] px-4">
      <Link href="/" aria-label="GEMA — kembali ke beranda" className="flex min-h-11 items-center">
        <Image src="/gema.svg" alt="GEMA" width={79} height={36} priority />
      </Link>
      <button
        type="button"
        onClick={onMenuClick}
        aria-label="Buka menu"
        aria-haspopup="true"
        aria-expanded={open}
        className="flex min-h-11 min-w-11 items-center justify-center rounded-lg text-white hover:bg-white/10"
      >
        <Menu aria-hidden="true" size={24} />
      </button>
    </header>
  );
}
