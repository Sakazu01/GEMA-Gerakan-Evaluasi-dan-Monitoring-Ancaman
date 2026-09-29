import type { CSSProperties, ReactNode } from "react";

// Satu komponen kartu generik dipakai ulang di kedua dashboard (dan nanti ReportList/ZoneCards)
// supaya style kartu konsisten tanpa duplikasi className di banyak tempat.
export function Card({ children, className = "", style }: { children: ReactNode; className?: string; style?: CSSProperties }) {
  return (
    <div style={style} className={`rounded-lg border border-gray-200 bg-white p-4 shadow-sm ${className}`}>
      {children}
    </div>
  );
}
