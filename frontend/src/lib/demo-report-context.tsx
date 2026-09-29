"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { apiFetch } from "@/lib/api-client";
import type { Report } from "@/types/report";

// Nama "demo-report" dipertahankan dari B1/B2 (hook dipakai di banyak komponen);
// sejak C1 isinya laporan ASLI dari backend, bukan array statis lagi. Laporan yang
// is_demo=true tetap ada di antaranya -- itu ditandai per-baris oleh backend, bukan
// oleh context ini.
const ReportContext = createContext<{
  reports: Report[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
} | null>(null);

export function DemoReportProvider({ children }: { children: ReactNode }) {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    setLoading(true);
    setError(null);
    apiFetch<Report[]>("/api/reports")
      .then(setReports)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch-on-mount standar.
    refresh();
  }, [refresh]);

  return (
    <ReportContext.Provider value={{ reports, loading, error, refresh }}>
      {children}
    </ReportContext.Provider>
  );
}

export function useDemoReports() {
  const context = useContext(ReportContext);
  if (!context) throw new Error("useDemoReports harus dipakai di dalam DemoReportProvider");
  return context;
}
