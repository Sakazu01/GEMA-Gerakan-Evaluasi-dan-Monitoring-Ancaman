"use client";

import { useRole } from "@/lib/role-context";
import { WargaDashboard } from "@/components/dashboard/WargaDashboard";
import { PemerintahDashboard } from "@/components/dashboard/PemerintahDashboard";

export default function Home() {
  const { role } = useRole();
  return role === "warga" ? <WargaDashboard /> : <PemerintahDashboard />;
}
