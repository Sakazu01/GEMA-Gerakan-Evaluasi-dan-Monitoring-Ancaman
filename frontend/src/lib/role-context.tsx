"use client";
import {createContext,useContext,useEffect,useState,type ReactNode} from "react";
import {authClient} from "@/lib/auth";
import {apiFetch} from "@/lib/api-client";
export type Role="warga"|"pemerintah";
const Context=createContext<{role:Role;canManage:boolean;setRole:(role:Role)=>void}|null>(null);
export function RoleProvider({children}:{children:ReactNode}){
  const [role,setRole]=useState<Role>("warga");
  const [canManage,setCanManage]=useState(false);
  useEffect(()=>{
    let alive=true;
    async function load(){
      try{
        const session=await authClient().auth.getSession();
        if(!session.data.session){if(alive){setCanManage(false);setRole("warga");}return;}
        const permissions=await apiFetch<{roles:string[]}>("/api/session");
        if(alive){setCanManage(permissions.roles.includes("moderator"));if(!permissions.roles.includes("moderator"))setRole("warga");}
      }catch{if(alive){setCanManage(false);setRole("warga");}}
    }
    let subscription:{unsubscribe:()=>void}|undefined;
    try{subscription=authClient().auth.onAuthStateChange(()=>{setTimeout(()=>void load(),0);}).data.subscription;}catch{}
    void load();
    return()=>{alive=false;subscription?.unsubscribe();};
  },[]);
  return <Context.Provider value={{role,canManage,setRole:(next)=>setRole(next==="pemerintah"&&canManage?"pemerintah":"warga")}}>{children}</Context.Provider>;
}
export function useRole(){const context=useContext(Context);if(!context)throw new Error("Role provider belum tersedia");return context;}
