"use client";

import { Landmark, Users } from "lucide-react";
import { useRole, type Role } from "@/lib/role-context";

const NEXT_ROLE: Record<Role, Role> = { warga: "pemerintah", pemerintah: "warga" };
const ROLE_ICON: Record<Role, typeof Users> = { warga: Users, pemerintah: Landmark };
const ROLE_LABEL: Record<Role, string> = { warga: "Warga", pemerintah: "Pemerintah" };

// Satu tombol bulat, bukan dua pilihan radio -- ketuk untuk gonta-ganti tampilan
// (biar tidak makan tempat di pojok layar mobile).
export function RoleSwitcher() {
  const { role, setRole } = useRole();
  const Icon = ROLE_ICON[role];
  const next = NEXT_ROLE[role];

  return (
    <button
      type="button"
      onClick={() => setRole(next)}
      aria-label={`Tampilan saat ini: ${ROLE_LABEL[role]}. Ketuk untuk beralih ke ${ROLE_LABEL[next]}.`}
      className="fixed bottom-4 left-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#0D5D3A] text-white shadow-lg hover:bg-[#094a2e]"
    >
      <Icon aria-hidden="true" size={22} />
    </button>
  );
}
