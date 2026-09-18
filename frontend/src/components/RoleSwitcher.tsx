"use client";

import { useRole, type Role } from "@/lib/role-context";

const OPTIONS: { value: Role; label: string }[] = [
  { value: "warga", label: "Warga" },
  { value: "pemerintah", label: "Pemerintah" },
];

export function RoleSwitcher() {
  const { role, setRole } = useRole();

  return (
    <div
      role="radiogroup"
      aria-label="Pilih tampilan"
      className="fixed bottom-4 left-4 z-50 flex gap-1 rounded-full border border-gray-300 bg-white p-1 shadow-lg"
    >
      {OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={role === option.value}
          onClick={() => setRole(option.value)}
          className={`min-h-11 rounded-full px-4 text-sm font-medium transition-colors ${
            role === option.value ? "bg-blue-600 text-white" : "text-gray-700 hover:bg-gray-100"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
