"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { demoReports } from "@/lib/demo-reports";
import type { Report } from "@/types/report";

const ReportContext = createContext<{
  reports: Report[];
  addReport: (report: Report) => void;
} | null>(null);

export function DemoReportProvider({ children }: { children: ReactNode }) {
  const [reports, setReports] = useState<Report[]>(demoReports);

  function addReport(report: Report) {
    setReports((current) =>
      current.some((item) => item.id === report.id) ? current : [report, ...current],
    );
  }

  return (
    <ReportContext.Provider value={{ reports, addReport }}>
      {children}
    </ReportContext.Provider>
  );
}

export function useDemoReports() {
  const context = useContext(ReportContext);
  if (!context) throw new Error("useDemoReports harus dipakai di dalam DemoReportProvider");
  return context;
}
