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
            {/* opcional: um sidebar/admin nav aqui */}
            <aside className="w-60 border-r p-4">
                <h2 className="font-bold mb-4">{currentUser?.name}</h2>
                <ul className="space-y-2">
                    <li><a href="/admin">Dashboard</a></li>
                    <li><a href="/admin/users">Usuários</a></li>
                    <li><a href="/admin/logs">Logs</a></li>
                </ul>
            </aside>
            <main className="flex-1 p-6">{children}</main>
        </div>
    );
}
