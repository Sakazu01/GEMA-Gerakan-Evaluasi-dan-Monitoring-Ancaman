"use client";
import {useState} from "react";
import dynamic from "next/dynamic";
import type {MapLocation} from "@/lib/demo-reports";
const WargaDashboard=dynamic(()=>import("@/components/dashboard/WargaDashboard").then(m=>m.WargaDashboard),{ssr:false,loading:()=> <p className="p-6">Memuat beranda warga…</p>});
export default function Home(){
  const [location,setLocation]=useState<MapLocation|null>(null);
  return <WargaDashboard location={location} locationMessage="" onLocationChange={setLocation}/>;
}
