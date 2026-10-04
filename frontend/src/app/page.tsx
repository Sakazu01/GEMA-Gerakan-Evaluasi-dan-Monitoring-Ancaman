"use client";
import {useEffect,useState} from "react";
import dynamic from "next/dynamic";
import type {MapLocation} from "@/lib/demo-reports";
import {requestDeviceLocation} from "@/lib/geolocation";
const WargaDashboard=dynamic(()=>import("@/components/dashboard/WargaDashboard").then(m=>m.WargaDashboard),{ssr:false,loading:()=> <p className="p-6">Memuat beranda warga…</p>});
export default function Home(){
  const [location,setLocation]=useState<MapLocation|null>(null);
  const [locationMessage,setLocationMessage]=useState("");
  useEffect(()=>{requestDeviceLocation(setLocation,setLocationMessage);},[]);
  return <WargaDashboard location={location} locationMessage={locationMessage} onLocationChange={setLocation}/>;
}
