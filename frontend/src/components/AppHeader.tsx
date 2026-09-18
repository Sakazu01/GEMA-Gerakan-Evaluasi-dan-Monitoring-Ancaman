"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { Menu } from "lucide-react";

// Header hijau melayang (bukan bar penuh) + logo + tombol drawer -- satu-satunya
// versi, dipakai di semua halaman (beranda, hotline, evakuasi, track) supaya
// tidak ada lagi header dengan warna/logo berbeda per halaman (lihat PRD §17).
// `center` opsional: default-nya tagline teks, tapi beranda Warga mengganti slot
// ini dengan search bar (lihat WargaDashboard.tsx) -- halaman lain tak perlu tahu.
export function AppHeader({
  open, onMenuClick, center,
}: { open: boolean; onMenuClick: () => void; center?: ReactNode }) {
  return (
    <div className="px-3 pt-3">
      <header className="flex min-h-11 items-center gap-3 rounded-2xl bg-gradient-to-r from-[#0D5D3A] to-[#0D5D3A]/85 px-4 py-3 shadow-lg backdrop-blur-sm">
        <Link href="/" aria-label="GEMA — kembali ke beranda" className="flex min-h-11 shrink-0 items-center">
          <Image src="/gema.svg" alt="GEMA" width={72} height={33} priority />
        </Link>
        <span aria-hidden="true" className="h-6 w-px shrink-0 bg-white/25" />
        <div className="min-w-0 flex-1">
          {center ?? <p className="truncate text-xs text-white/85">Bergerak, Melihat, Bergema</p>}
        </div>
        <button
          type="button"
          onClick={onMenuClick}
          aria-label="Buka menu"
          aria-haspopup="true"
          aria-expanded={open}
          className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg border border-white/25 text-white hover:bg-white/10"
        >
          <Menu aria-hidden="true" size={22} />
        </button>
      </header>
    </div>
  );
}
