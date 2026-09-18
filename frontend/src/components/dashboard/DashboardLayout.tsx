import type { ReactNode } from "react";

// Bungkus judul+deskripsi+konten yang sama untuk WargaDashboard dan PemerintahDashboard,
// supaya page.tsx tinggal manggil <WargaDashboard/> / <PemerintahDashboard/> tanpa duplikasi layout.
export function DashboardLayout({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">{title}</h1>
      <p className="mt-2 text-gray-600">{description}</p>
      <div className="mt-6 space-y-4">{children}</div>
    </div>
  );
}
