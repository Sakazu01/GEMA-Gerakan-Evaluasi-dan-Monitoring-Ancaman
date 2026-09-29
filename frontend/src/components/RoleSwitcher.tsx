"use client";

import { Landmark, Users } from "lucide-react";
import { useRole, type Role } from "@/lib/role-context";

const OPTIONS: { value: Role; label: string; icon: typeof Users }[] = [
  { value: "warga", label: "Warga", icon: Users },
  { value: "pemerintah", label: "Pemerintah", icon: Landmark },
];

export function RoleSwitcher() {
  const { role, setRole } = useRole();

  return (
    <div role="radiogroup" aria-label="Pilih tampilan" className="fixed bottom-4 left-4 z-50 flex gap-2">
      {OPTIONS.map((option) => {
        const active = role === option.value;
        const Icon = option.icon;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => setRole(option.value)}
            className={`flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-semibold shadow-lg transition-colors ${
              active ? "bg-[#0D5D3A] text-white" : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            <Icon aria-hidden="true" size={16} />
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
