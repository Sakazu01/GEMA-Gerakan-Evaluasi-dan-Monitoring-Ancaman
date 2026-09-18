"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Role = "warga" | "pemerintah";

const STORAGE_KEY = "gema:role";

interface RoleContextValue {
  role: Role;
  setRole: (role: Role) => void;
}

const RoleContext = createContext<RoleContextValue | null>(null);

export function RoleProvider({ children }: { children: ReactNode }) {
  const [role, setRoleState] = useState<Role>("warga");

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored === "warga" || stored === "pemerintah") {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- baca localStorage sekali saat mount.
        setRoleState(stored);
      }
    } catch {
      // localStorage bisa gagal (private mode dll) — abaikan, tetap default "warga".
    }
  }, []);

  const setRole = (next: Role) => {
    setRoleState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // gagal simpan bukan masalah kritis untuk toggle tampilan demo ini.
    }
  };

  return <RoleContext.Provider value={{ role, setRole }}>{children}</RoleContext.Provider>;
}

export function useRole() {
  const ctx = useContext(RoleContext);
  if (!ctx) {
    throw new Error("useRole must be used within RoleProvider");
  }
  return ctx;
}
