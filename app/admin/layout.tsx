// app/admin/layout.tsx
"use client";

import { ReactNode, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth/auth-context";

export default function AdminLayout({ children }: { children: ReactNode }) {
    const { isAuthenticated, currentUser } = useAuth();
    const router = useRouter();

    // Se não for admin, “empurra” pra home
    useEffect(() => {
        if (!currentUser) return;

        if (!currentUser?.isAdmin) {
            router.push("/");
        }

    }, [currentUser]);

    // if (!isInitializing) {
    //     return <div>Carregando autenticação…</div>;
    // }
    // if (!user?.isAdmin) {
    //     return <div>Você não tem permissão para acessar o admin.</div>;
    // }

    return (
        <div className="flex">
            <main className="flex-1 p-6">{children}</main>
        </div>
    );
}
