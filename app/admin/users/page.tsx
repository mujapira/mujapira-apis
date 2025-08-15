'use client'
import { useState, useEffect, useMemo, useRef } from 'react';
import { apiGateway } from '@/lib/axios';
import { useAuth } from '@/contexts/auth/auth-context';
import { User } from '@/contexts/auth/types';
import { _getAllUsers, _promoteUserByEmail } from '@/services/user';


const WINDOW_MS = 2500;

export default function UsersViewer() {
    const { currentUser } = useAuth();

    const [users, setUsers] = useState<User[]>([]);
    const [loadingPage, setLoadingPage] = useState(false);
    const [errorPage, setErrorPage] = useState<string | null>(null);

    // clicks e timers por email
    const [clicks, setClicks] = useState<Record<string, number>>({});
    const timersRef = useRef<Record<string, ReturnType<typeof setTimeout> | undefined>>({});
    const [promoting, setPromoting] = useState<Record<string, boolean>>({});

    useEffect(() => {
        let active = true;
        async function load() {
            if (!currentUser) return;
            setLoadingPage(true);
            setErrorPage(null);
            try {
                const data = await _getAllUsers();
                if (active) setUsers(data);
            } catch (e: any) {
                if (active) setErrorPage(e?.message ?? 'Falha ao carregar usuários');
            } finally {
                if (active) setLoadingPage(false);
            }
        }
        load();
        return () => {
            active = false;
            // limpa timers ao desmontar
            Object.values(timersRef.current).forEach(t => t && clearTimeout(t));
        };
    }, [currentUser]);

    const isEmpty = useMemo(() => !loadingPage && users.length === 0, [loadingPage, users]);

    function resetClicks(email: string) {
        setClicks(prev => {
            const { [email]: _, ...rest } = prev;
            return rest;
        });
        const t = timersRef.current[email];
        if (t) clearTimeout(t);
        timersRef.current[email] = undefined;
    }

    async function handleEmailClick(emailRaw: string, alreadyAdmin: boolean) {
        const email = (emailRaw || '').toLowerCase();
        if (!email || alreadyAdmin || promoting[email]) return;

        // incrementa contagem
        setClicks(prev => {
            const count = (prev[email] ?? 0) + 1;
            return { ...prev, [email]: count };
        });

        // reinicia/agenda timer pra resetar a contagem
        const prevTimer = timersRef.current[email];
        if (prevTimer) clearTimeout(prevTimer);
        timersRef.current[email] = setTimeout(() => {
            resetClicks(email);
        }, WINDOW_MS);

        // após setState acima, checa o valor atualizado usando callback microtask
        queueMicrotask(async () => {
            const nextCount = (clicks[email] ?? 0) + 1;
            if (nextCount >= 5) {
                // atingiu 5: promove
                resetClicks(email);
                setPromoting(p => ({ ...p, [email]: true }));
                try {
                    await _promoteUserByEmail(email);
                    setUsers(prev =>
                        prev.map(u =>
                            (u.email ?? '').toLowerCase() === email ? ({ ...u, isAdmin: true } as User) : u
                        )
                    );
                } catch (e: any) {
                } finally {
                    setPromoting(p => ({ ...p, [email]: false }));
                }
            }
        });
    }

    return (
        <div className="p-4 space-y-4">
            <h1 className="text-xl font-semibold">Usuários</h1>

            {loadingPage && <div>Carregando...</div>}
            {errorPage && <div className="text-red-600">{errorPage}</div>}
            {isEmpty && <div>Nenhum usuário encontrado.</div>}

            {!loadingPage && users.length > 0 && (
                <div className="overflow-auto rounded border">
                    <table className="min-w-full text-sm">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-3 py-2 text-left font-medium">Nome</th>
                                <th className="px-3 py-2 text-left font-medium">E-mail</th>
                                <th className="px-3 py-2 text-left font-medium">Admin</th>
                                <th className="px-3 py-2"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map(u => {
                                const email = (u.email ?? '').toLowerCase();
                                const isAdm = !!u.isAdmin;
                                const isBusy = !!promoting[email];
                                const clickCount = clicks[email] ?? 0;

                                return (
                                    <tr key={u.id} className="border-t">
                                        <td className="px-3 py-2">{u.name}</td>
                                        <td
                                            className={`px-3 py-2 select-none ${isAdm ? 'text-gray-500' : ''}`}
                                            onClick={() => handleEmailClick(email, isAdm)}
                                        >
                                            <span>{u.email}</span>
                                            {isBusy && (
                                                <span className="ml-2 text-xs text-gray-500 align-middle">
                                                    promovendo…
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-3 py-2">{isAdm ? 'Sim' : 'Não'}</td>
                                        <td className="px-3 py-2 text-right"></td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}