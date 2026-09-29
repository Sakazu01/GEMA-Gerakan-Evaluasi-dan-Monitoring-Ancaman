import type { ReactNode } from "react";
import { Activity } from "lucide-react";

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
    <div className="min-h-dvh">
      <header className="bg-[#0D5D3A] px-4 py-8 sm:px-6">
        <div className="mx-auto flex w-full max-w-6xl items-start gap-3">
          <span className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10">
            <Activity aria-hidden="true" size={20} className="text-white" />
          </span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">{title}</h1>
            <p className="mt-2 max-w-3xl text-white/80">{description}</p>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl px-4 pb-28 pt-6 sm:px-6">
        <div className="space-y-5">{children}</div>
      </main>
    </div>
  );
}
