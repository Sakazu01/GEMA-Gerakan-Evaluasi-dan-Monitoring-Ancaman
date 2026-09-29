"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useRole } from "@/lib/role-context";
import type { MapLocation } from "@/lib/demo-reports";
import { PemerintahDashboard } from "@/components/dashboard/PemerintahDashboard";

const WargaDashboard = dynamic(
  () => import("@/components/dashboard/WargaDashboard").then((module) => module.WargaDashboard),
  { ssr: false, loading: () => <p className="p-6 text-slate-700">Memuat beranda warga…</p> },
);

export default function Home() {
  const { role } = useRole();
  const [location, setLocation] = useState<MapLocation | null>(null);
  return role === "warga"
    ? <WargaDashboard location={location} onLocationChange={setLocation} />
    : <PemerintahDashboard />;
}
