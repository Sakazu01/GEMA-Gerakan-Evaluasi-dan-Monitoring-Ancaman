import type { ReactNode } from "react";

// Satu komponen kartu generik dipakai ulang di kedua dashboard (dan nanti ReportList/ZoneCards)
// supaya style kartu konsisten tanpa duplikasi className di banyak tempat.
export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-lg border border-gray-200 bg-white p-4 shadow-sm ${className}`}>
      {children}
    </div>
  );
}
