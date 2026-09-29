"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useRole } from "@/lib/role-context";
import { requestDeviceLocation } from "@/lib/geolocation";
import type { MapLocation } from "@/lib/demo-reports";
import { PemerintahDashboard } from "@/components/dashboard/PemerintahDashboard";

const WargaDashboard = dynamic(
  () => import("@/components/dashboard/WargaDashboard").then((module) => module.WargaDashboard),
  { ssr: false, loading: () => <p className="p-6 text-slate-700">Memuat beranda warga…</p> },
);

export default function Home() {
  const { role } = useRole();
  const [location, setLocation] = useState<MapLocation | null>(null);
  const [locationMessage, setLocationMessage] = useState("Mencari lokasi perangkat...");
  const requested = useRef(false);
  const pickedManually = useRef(false);

  useEffect(() => {
    if (requested.current) return;
    requested.current = true;
    requestDeviceLocation(
      (next) => { if (!pickedManually.current) setLocation(next); },
      (message) => { if (!pickedManually.current) setLocationMessage(message); },
    );
  }, []);

  function chooseLocation(next: MapLocation) {
    pickedManually.current = true;
    setLocation(next);
    setLocationMessage("");
  }

  return role === "warga"
    ? <WargaDashboard location={location} locationMessage={locationMessage} onLocationChange={chooseLocation} />
    : <PemerintahDashboard />;
}
