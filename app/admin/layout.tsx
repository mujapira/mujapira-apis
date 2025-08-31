"use client";
import { ReactNode, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth/auth-context";

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { currentUser } = useAuth();
  const router = useRouter();

  const ready = useMemo(() => currentUser !== undefined, [currentUser]); // ajuste conforme seu contexto

  useEffect(() => {
    if (!currentUser) return;
    if (!currentUser.isAdmin) router.replace("/");
  }, [currentUser, router]);

  if (!ready) {
    return <div className="p-6 text-sm text-muted-foreground">Carregando…</div>;
  }

  return <main className="flex-1 p-6">{children}</main>;
}