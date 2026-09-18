"use client";

import { useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, ChevronRight, Info, Map, Phone, TrendingUp, X, type LucideIcon } from "lucide-react";

const items: { href: string; label: string; description?: string; icon: LucideIcon }[] = [
  { href: "/", label: "Peta Sebaran Bencana", icon: Map },
  { href: "/evakuasi", label: "Panduan Evakuasi", icon: BookOpen },
  { href: "/track", label: "Lacak Respons", icon: TrendingUp },
  { href: "/hotline", label: "Hotline Darurat", icon: Phone },
  { href: "/about", label: "Tentang GEMA", description: "Mengenal lebih dekat GEMA", icon: Info },
];

export function NavDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <>
      {open && (
        <button
          type="button"
          aria-label="Tutup menu"
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/40"
        />
      )}
      <nav
        aria-label="Menu utama"
        aria-hidden={!open}
        className={`fixed inset-y-0 right-0 z-50 flex w-72 flex-col bg-[#F7F6E4] p-5 shadow-xl transition-transform duration-200 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-start justify-between">
          <div>
            <Image src="/gema_green.svg" alt="GEMA" width={72} height={22} />
            <p className="mt-1 text-xs text-slate-600">Bergerak, Melihat, Bergema</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup menu"
            tabIndex={open ? 0 : -1}
            className="flex min-h-11 min-w-11 items-center justify-center rounded-lg text-slate-700 hover:bg-black/5"
          >
            <X aria-hidden="true" size={22} />
          </button>
        </div>

        <ul className="mt-6 flex flex-col gap-2">
          {items.map((item) => {
            const active = pathname === item.href;
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  tabIndex={open ? 0 : -1}
                  onClick={onClose}
                  className={`flex min-h-11 items-center gap-2 rounded-xl px-3 py-3 text-sm font-semibold shadow-sm transition-colors ${
                    active ? "bg-emerald-50 text-[#0D5D3A]" : "bg-white text-slate-800 hover:bg-slate-50"
                  }`}
                >
                  <Icon aria-hidden="true" size={17} className="shrink-0 text-[#0D5D3A]" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{item.label}</span>
                    {item.description && (
                      <span className="block truncate text-xs font-normal text-slate-500">{item.description}</span>
                    )}
                  </span>
                  <ChevronRight aria-hidden="true" size={17} className={active ? "shrink-0 text-[#0D5D3A]" : "shrink-0 text-slate-400"} />
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="mt-auto pt-6 text-center">
          {/* Ilustrasi siluet dekoratif -- dibuat manual (tidak ada aset sumbernya),
              cuma aksen visual di footer drawer, bukan elemen fungsional. */}
          <svg viewBox="0 0 300 110" className="mx-auto h-24 w-full max-w-[260px] text-[#0D5D3A]" fill="currentColor" aria-hidden="true">
            <path d="M0 92 Q40 62 80 86 T160 82 T240 90 T300 84 V110 H0 Z" opacity="0.15" />
            <path d="M30 92 L40 66 L50 92 Z" opacity="0.35" />
            <path d="M42 92 L52 60 L62 92 Z" opacity="0.35" />
            <path d="M108 96 h34 v-16 a17 17 0 0 1 -34 0 Z" opacity="0.45" />
            <rect x="121" y="62" width="8" height="18" opacity="0.45" />
            <rect x="166" y="35" width="6" height="60" opacity="0.6" />
            <path d="M165 35 h8 l-4 -13 Z" opacity="0.6" />
            <rect x="159" y="93" width="20" height="6" opacity="0.6" />
            <path d="M222 96 L234 66 L246 96 Z" opacity="0.35" />
            <path d="M236 96 L248 63 L260 96 Z" opacity="0.35" />
            <path d="M0 100 Q60 90 150 99 T300 97 V110 H0 Z" opacity="0.25" />
          </svg>
          <p className="text-sm italic text-slate-600">&ldquo;Bergerak, Melihat, Bergema&rdquo;</p>
          <p className="mt-1 text-xs text-slate-500">Untuk Indonesia yang lebih aman.</p>
        </div>
      </nav>
    </>
  );
}
