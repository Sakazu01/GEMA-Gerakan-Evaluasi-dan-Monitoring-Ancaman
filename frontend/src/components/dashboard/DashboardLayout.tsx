import type { ReactNode } from "react";

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
    <main className="mx-auto w-full max-w-6xl px-4 pb-28 pt-8 sm:px-6">
      <h1 className="text-3xl font-bold tracking-tight text-slate-950">{title}</h1>
      <p className="mt-2 max-w-3xl text-slate-700">{description}</p>
      <div className="mt-6 space-y-5">{children}</div>
    </main>
  );
}
