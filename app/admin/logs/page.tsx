'use client'
import { useState, useEffect } from 'react';
import { apiGateway } from '@/lib/axios';
import { useAuth } from '@/contexts/auth/auth-context';
import { User } from '@/contexts/auth/types';

export interface LogEntry {
    source: string;
    level: string;
    message: string;
    timestamp: string;
    metadata?: Record<string, any>;
}

export interface LogQueryParams {
    sources?: string[];
    levels?: string[];
    from?: string;
    to?: string;
    messageContains?: string;
    metadataKey?: string;
    metadataValue?: string;
    skip?: number;
    limit?: number;
}

async function fetchLogs(params: LogQueryParams): Promise<LogEntry[]> {
    const query = new URLSearchParams();
    if (params.sources) params.sources.forEach(s => query.append('sources', s));
    if (params.levels) params.levels.forEach(l => query.append('level', l));
    if (params.from) query.append('from', params.from);
    if (params.to) query.append('to', params.to);
    if (params.messageContains) query.append('messageContains', params.messageContains);
    if (params.metadataKey) query.append('metadataKey', params.metadataKey);
    if (params.metadataValue) query.append('metadataValue', params.metadataValue);
    query.append('skip', (params.skip ?? 0).toString());
    query.append('limit', (params.limit ?? 100).toString());

    const { data } = await apiGateway.get<LogEntry[]>('/logs?' + query.toString());
    return data;
}

export default function LogViewer() {
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [params, setParams] = useState<LogQueryParams>({ limit: 50, skip: 0 });

    const { currentUser } = useAuth()

    useEffect(() => {
        setLoading(true);
        if (!currentUser) return;
        fetchLogs(params)
            .then(setLogs)
            .catch(err => setError(err.message || 'Erro ao buscar logs'))
            .finally(() => setLoading(false));

    }, [params, currentUser]);

    const fetchUsers = async () => {
        const { data } = await apiGateway.get<User[]>("/users");
        return data;
    }

    return (
        <div className="p-4">
            <h2 className="text-xl font-semibold mb-4">Logs</h2>
            {error && <div className="text-red-600 mb-2">{error}</div>}
            {loading ? (
                <div>Carregando...</div>
            ) : (
                <table className="min-w-full border-collapse">
                    <thead>
                        <tr className="bg-gray-100">
                            <th className="border px-2 py-1 text-left">Timestamp</th>
                            <th className="border px-2 py-1 text-left">Source</th>
                            <th className="border px-2 py-1 text-left">Level</th>
                            <th className="border px-2 py-1 text-left">Message</th>
                        </tr>
                    </thead>
                    <tbody>
                        {logs.map((log, idx) => (
                            <tr key={idx} className="hover:bg-gray-50">
                                <td className="border px-2 py-1">{new Date(log.timestamp).toLocaleString()}</td>
                                <td className="border px-2 py-1">{log.source}</td>
                                <td className="border px-2 py-1">{log.level}</td>
                                <td className="border px-2 py-1">{log.message}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
            <div className="mt-4 space-x-2">
                <button
                    onClick={() => setParams(p => ({ ...p, skip: Math.max((p.skip ?? 0) - (p.limit ?? 50), 0) }))}
                    className="px-3 py-1 bg-gray-200 rounded"
                    disabled={(params.skip ?? 0) <= 0}
                >Anterior</button>
                <button
                    onClick={() => setParams(p => ({ ...p, skip: (p.skip ?? 0) + (p.limit ?? 50) }))}
                    className="px-3 py-1 bg-gray-200 rounded"
                >Próxima</button>
            </div>
        </div>
    );
}
