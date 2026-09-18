"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";

const items = [
  { href: "/", label: "Peta Sebaran Bencana" },
  { href: "/track", label: "Lacak Respons" },
  { href: "/hotline", label: "Hotline" },
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
        className={`fixed inset-y-0 right-0 z-50 flex w-64 flex-col bg-[#0D5D3A] p-6 text-white shadow-xl transition-transform duration-200 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Tutup menu"
          tabIndex={open ? 0 : -1}
          className="mb-8 flex min-h-11 min-w-11 items-center justify-center self-end rounded-lg hover:bg-white/10"
        >
          <X aria-hidden="true" size={22} />
        </button>
        <ul className="flex flex-1 flex-col gap-2">
          {items.map((item) => {
            const active = pathname === item.href;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  tabIndex={open ? 0 : -1}
                  onClick={onClose}
                  className={`block min-h-11 rounded-lg px-4 py-2 font-semibold ${
                    active ? "bg-white/15 text-white" : "text-white/60 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
        <p className="text-xs text-white/50">
          Proudly made by
          <br />
          <span className="font-semibold text-white/70">Labtek V Wangy Lumut</span>
        </p>
      </nav>
    </>
  );
}
