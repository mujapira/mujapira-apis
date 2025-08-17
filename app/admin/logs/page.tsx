'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { apiGateway } from '@/lib/axios';
import { useAuth } from '@/contexts/auth/auth-context';

// ===== Types =====
export interface LogEntry {
    id: string;
    timestamp: string;
    level: string;
    message: string;
    source: string;
    metadata?: Record<string, any>;
}

export interface LogQueryParams {
    sources?: string[];
    levels?: string[];
    from?: string; // ISO
    to?: string;   // ISO
    messageContains?: string;
    metadataKey?: string;
    metadataValue?: string;
    skip?: number;
    limit?: number;
}

// ===== Config =====
const COOKIE_KEY = 'log_filters_v2'; // inclui autoRefresh e intervalSec
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30;
const KNOWN_SOURCES = ['AuthService', 'UserService', 'MailService', 'LogService'];
const LEVEL_OPTIONS = ['Trace', 'Debug', 'Info', 'Warn', 'Error', 'Fatal'] as const;

const levelClass: Record<string, string> = {
    Trace: 'bg-slate-100 text-slate-700 border-slate-200',
    Debug: 'bg-purple-100 text-purple-700 border-purple-200',
    Info: 'bg-blue-100 text-blue-700 border-blue-200',
    Warn: 'bg-amber-100 text-amber-800 border-amber-200',
    Error: 'bg-red-100 text-red-700 border-red-200',
    Fatal: 'bg-red-200 text-red-900 border-red-300',
};

// ===== Utils =====
function setCookie(name: string, value: string, maxAgeSec: number) {
    document.cookie = `${name}=${encodeURIComponent(value)}; Max-Age=${maxAgeSec}; Path=/; SameSite=Lax`;
}
function getCookie(name: string): string | null {
    const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    return match ? decodeURIComponent(match[2]) : null;
}
function toISOOrEmpty(d?: string) {
    if (!d) return '';
    const dd = new Date(d);
    return isNaN(dd.getTime()) ? '' : dd.toISOString();
}
function formatDatePtBR(iso: string) {
    try {
        return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'medium' });
    } catch {
        return iso;
    }
}
function pretty(obj: any) {
    try { return JSON.stringify(obj, null, 2); } catch { return String(obj); }
}
function useDebounced<T>(value: T, delay = 400) {
    const [v, setV] = useState(value);
    useEffect(() => { const t = setTimeout(() => setV(value), delay); return () => clearTimeout(t); }, [value, delay]);
    return v;
}
function parseBool(s: string | null | undefined): boolean | undefined {
    if (s == null) return undefined;
    const v = s.trim().toLowerCase();
    if (['1', 'true', 'yes', 'y', 'on'].includes(v)) return true;
    if (['0', 'false', 'no', 'n', 'off'].includes(v)) return false;
    return undefined;
}
function clampedInterval(n?: number) {
    if (!Number.isFinite(n as number)) return 60;
    const x = Math.max(1, Math.round(n as number));
    return x;
}

// ===== Small UI =====
function Pill({ active, children, onClick }: { active: boolean; children: React.ReactNode; onClick: () => void; }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={
                'px-3 py-1 rounded-full border text-sm transition ' +
                (active ? 'bg-black text-white border-black' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50')
            }
        >
            {children}
        </button>
    );
}
function LogRow({ log }: { log: LogEntry }) {
    const [open, setOpen] = useState(false);
    return (
        <>
            <tr className="hover:bg-gray-50">
                <td className="border px-2 py-1 whitespace-nowrap align-top">{formatDatePtBR(log.timestamp)}</td>
                <td className="border px-2 py-1 whitespace-nowrap align-top">{log.source}</td>
                <td className="border px-2 py-1 whitespace-nowrap align-top">
                    <span className={`inline-block px-2 py-0.5 rounded-md border text-xs ${levelClass[log.level] || 'bg-gray-100'}`}>
                        {log.level}
                    </span>
                </td>
                <td className="border px-2 py-1 align-top">
                    <div className="flex items-start justify-between gap-2">
                        <div className="whitespace-pre-wrap break-words">{log.message}</div>
                        {log.metadata && (
                            <button
                                onClick={() => setOpen(o => !o)}
                                className="text-xs px-2 py-1 rounded border bg-gray-100 hover:bg-gray-200"
                                title="Ver metadata"
                            >
                                {open ? 'Ocultar' : 'Ver metadata'}
                            </button>
                        )}
                    </div>
                </td>
            </tr>
            {open && log.metadata && (
                <tr className="bg-gray-50">
                    <td className="border px-2 py-2 text-xs text-gray-500" colSpan={4}>
                        <div className="flex justify-between items-center mb-2">
                            <span className="font-medium text-gray-700">Metadata</span>
                            <button
                                onClick={() => navigator.clipboard.writeText(pretty(log.metadata))}
                                className="text-xs px-2 py-1 rounded border bg-white hover:bg-gray-100"
                            >
                                Copiar JSON
                            </button>
                        </div>
                        <pre className="overflow-auto max-h-64 text-xs leading-relaxed">{pretty(log.metadata)}</pre>
                    </td>
                </tr>
            )}
        </>
    );
}

// ===== Main =====
export default function LogViewer() {
    const { currentUser } = useAuth();

    // ---- State: filtros/params
    const [sources, setSources] = useState<string[]>([]);
    const [levels, setLevels] = useState<string[]>([]);
    const [messageContains, setMessageContains] = useState('');
    const [metadataKey, setMetadataKey] = useState('');
    const [metadataValue, setMetadataValue] = useState('');
    const [from, setFrom] = useState<string>(''); // datetime-local
    const [to, setTo] = useState<string>('');

    // paginação
    const [skip, setSkip] = useState(0);
    const [limit, setLimit] = useState(50);

    // auto-refresh (segregado/visível)
    const [autoRefresh, setAutoRefresh] = useState<boolean>(false);
    const [intervalSec, setIntervalSec] = useState<number>(60); // default 60s
    const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);

    // data & request control
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const abortRef = useRef<AbortController | null>(null);

    // ---- Load: URL params -> cookie -> defaults
    const bootstrapDoneRef = useRef(false);
    useEffect(() => {
        if (bootstrapDoneRef.current) return;
        bootstrapDoneRef.current = true;

        // 1) URL params
        let urlAutoRefresh: boolean | undefined;
        let urlInterval: number | undefined;
        if (typeof window !== 'undefined') {
            const sp = new URLSearchParams(window.location.search);
            urlAutoRefresh = parseBool(sp.get('autoRefresh'));
            const iRaw = sp.get('interval');
            urlInterval = iRaw ? clampedInterval(Number(iRaw)) : undefined;
        }

        // 2) Cookie (opcional)
        const raw = getCookie(COOKIE_KEY);
        let cookie: any = null;
        if (raw) { try { cookie = JSON.parse(raw); } catch { } }

        // 3) Aplicar precedence: URL > Cookie > Defaults
        setSources(urlAutoRefresh !== undefined ? (cookie?.sources ?? []) : (cookie?.sources ?? []));
        setLevels(urlAutoRefresh !== undefined ? (cookie?.levels ?? []) : (cookie?.levels ?? []));
        setMessageContains(cookie?.messageContains ?? '');
        setMetadataKey(cookie?.metadataKey ?? '');
        setMetadataValue(cookie?.metadataValue ?? '');
        setFrom(cookie?.from ?? '');
        setTo(cookie?.to ?? '');
        setLimit(cookie?.limit ?? 50);

        const initialInterval = urlInterval ?? cookie?.intervalSec ?? 60;
        const initialAuto = urlAutoRefresh ?? (cookie?.autoRefresh ?? false);

        setIntervalSec(clampedInterval(initialInterval));
        setAutoRefresh(!!initialAuto);
        // -> sem cookie e sem URL? então filtros vazios -> “busca geral” acontecerá no effect principal
    }, []);

    // ---- Persistir no cookie (inclusive autoRefresh/interval)
    const cookiePayload = useMemo(
        () => ({ sources, levels, messageContains, metadataKey, metadataValue, from, to, limit, autoRefresh, intervalSec }),
        [sources, levels, messageContains, metadataKey, metadataValue, from, to, limit, autoRefresh, intervalSec]
    );
    const debouncedCookiePayload = useDebounced(cookiePayload, 500);
    useEffect(() => {
        setCookie(COOKIE_KEY, JSON.stringify(debouncedCookiePayload), COOKIE_MAX_AGE);
    }, [debouncedCookiePayload]);

    // ---- Options dinâmicas de serviço
    const sourceOptions = useMemo(() => {
        const set = new Set<string>(KNOWN_SOURCES);
        logs.forEach(l => set.add(l.source));
        return Array.from(set).sort();
    }, [logs]);


    // ---- Params para API
    const params = useMemo(
        () => ({
            sources: sources.length ? sources : undefined,
            levels: levels.length ? levels : undefined,
            messageContains: messageContains || undefined,
            metadataKey: metadataKey || undefined,
            metadataValue: metadataValue || undefined,
            from: toISOOrEmpty(from) || undefined,
            to: toISOOrEmpty(to) || undefined,
            skip,
            limit,
        }),
        [sources, levels, messageContains, metadataKey, metadataValue, from, to, skip, limit]
    );

    const debouncedParams = useDebounced(params, 300);

    const paramsRef = useRef(params);

    useEffect(() => { paramsRef.current = params; }, [params])


    // ---- Fetch function (pode ser chamada manualmente ou pelos efeitos)
    async function fetchLogs(p: LogQueryParams) {
        const q = new URLSearchParams();
        if (p.sources) p.sources.forEach(s => q.append('sources', s));
        if (p.levels) p.levels.forEach(l => q.append('levels', l)); // plural
        if (p.from) q.append('from', p.from);
        if (p.to) q.append('to', p.to);
        if (p.messageContains) q.append('messageContains', p.messageContains);
        if (p.metadataKey) q.append('metadataKey', p.metadataKey);
        if (p.metadataValue) q.append('metadataValue', p.metadataValue);
        q.append('skip', String(p.skip ?? 0));
        q.append('limit', String(p.limit ?? 100));

        // abort da requisição anterior
        abortRef.current?.abort();
        const controller = new AbortController();
        abortRef.current = controller;

        const { data } = await apiGateway.get<LogEntry[]>('/logs?' + q.toString(), { signal: controller.signal });
        return data;
    }

    // ---- Efeito principal: busca quando filtros mudam
    useEffect(() => {
        if (!currentUser) return;
        setLoading(true);
        setError(null);
        fetchLogs(debouncedParams)
            .then((data) => { setLogs(data); setLastUpdatedAt(new Date()); })
            .catch((err: any) => {
                if (err?.name !== 'CanceledError' && err?.message !== 'canceled') {
                    setError(err?.message || 'Erro ao buscar logs');
                }
            })
            .finally(() => setLoading(false));
    }, [debouncedParams, currentUser]);

    // ---- Auto-refresh: NÃO altera estados de filtro/paginação (evita loop)
    useEffect(() => {
        if (!autoRefresh) return;

        const id = setInterval(() => {
            if (!currentUser) return;

            // usa os params atuais, sem alterar estados de filtro/paginação
            fetchLogs(paramsRef.current)
                .then((data) => { setLogs(data); setLastUpdatedAt(new Date()); })
                .catch(() => { /* ignora erros transitórios/cancel */ });
        }, clampedInterval(intervalSec) * 1000);

        return () => clearInterval(id);
        // dependências SOMENTE de toggles do auto-refresh:
    }, [autoRefresh, intervalSec, currentUser]);

    // ---- Ações UI
    function toggleSource(s: string) { setSkip(0); setSources(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]); }
    function toggleLevel(l: string) { setSkip(0); setLevels(prev => prev.includes(l) ? prev.filter(x => x !== l) : [...prev, l]); }
    function clearFilters() {
        setSources([]); setLevels([]); setMessageContains('');
        setMetadataKey(''); setMetadataValue(''); setFrom(''); setTo('');
        setSkip(0);
    }

    async function manualRefresh() {
        try {
            setLoading(true);
            setError(null);
            const data = await fetchLogs(paramsRef.current);
            setLogs(data);
            setLastUpdatedAt(new Date());
        } catch (err: any) {
            if (err?.name !== 'CanceledError' && err?.message !== 'canceled') {
                setError(err?.message || 'Erro ao buscar logs');
            }
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="p-4 space-y-4">
            {/* Barra de título + Auto-refresh destacado */}
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <h2 className="text-xl font-semibold">Logs</h2>

                <div className="rounded-lg border bg-white p-2 flex items-center gap-3">
                    <label className="flex items-center gap-2 text-sm">
                        <input
                            type="checkbox"
                            checked={autoRefresh}
                            onChange={(e) => setAutoRefresh(e.target.checked)}
                        />
                        Auto-refresh
                    </label>
                    <div className="flex items-center gap-2 text-sm">
                        <span>Intervalo (s):</span>
                        <input
                            type="number"
                            min={1}
                            value={intervalSec}
                            onChange={(e) => setIntervalSec(clampedInterval(Number(e.target.value)))}
                            className="w-20 border rounded px-2 py-1"
                        />
                    </div>
                    <button
                        onClick={manualRefresh}
                        className="px-3 py-1 text-sm rounded border bg-white hover:bg-gray-50"
                        title="Buscar agora"
                    >
                        Atualizar
                    </button>
                </div>
            </div>

            {/* Hint de última atualização */}
            {lastUpdatedAt && (
                <div className="text-xs text-gray-500">
                    Última atualização: {formatDatePtBR(lastUpdatedAt.toISOString())}
                </div>
            )}

            {/* Filtros */}
            <div className="rounded-lg border p-3 bg-white">
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                    {/* Serviços */}
                    <div>
                        <div className="text-xs font-medium text-gray-600 mb-1">Serviços</div>
                        <div className="flex flex-wrap gap-2">
                            {sourceOptions.map(s => (
                                <Pill key={s} active={sources.includes(s)} onClick={() => toggleSource(s)}>{s}</Pill>
                            ))}
                        </div>
                    </div>

                    {/* Níveis */}
                    <div>
                        <div className="text-xs font-medium text-gray-600 mb-1">Níveis</div>
                        <div className="flex flex-wrap gap-2">
                            {LEVEL_OPTIONS.map(l => (
                                <Pill key={l} active={levels.includes(l)} onClick={() => toggleLevel(l)}>{l}</Pill>
                            ))}
                        </div>
                    </div>

                    {/* Texto na mensagem */}
                    <div>
                        <div className="text-xs font-medium text-gray-600 mb-1">Contém na mensagem</div>
                        <input
                            value={messageContains}
                            onChange={(e) => { setMessageContains(e.target.value); setSkip(0); }}
                            placeholder="ex.: usuário, e-mail, timeout..."
                            className="w-full border rounded px-3 py-2"
                        />
                    </div>

                    {/* Metadata */}
                    <div className="md:col-span-2">
                        <div className="text-xs font-medium text-gray-600 mb-1">Metadata (chave / valor)</div>
                        <div className="flex gap-2">
                            <input
                                value={metadataKey}
                                onChange={(e) => { setMetadataKey(e.target.value); setSkip(0); }}
                                placeholder="ex.: UserId, Found, To"
                                className="w-1/2 border rounded px-3 py-2"
                            />
                            <input
                                value={metadataValue}
                                onChange={(e) => { setMetadataValue(e.target.value); setSkip(0); }}
                                placeholder="ex.: true, 123, mujapira@gmail.com"
                                className="w-1/2 border rounded px-3 py-2"
                            />
                        </div>
                    </div>

                    {/* Datas */}
                    <div className="flex gap-2">
                        <div className="flex-1">
                            <div className="text-xs font-medium text-gray-600 mb-1">De</div>
                            <input
                                type="datetime-local"
                                value={from}
                                onChange={(e) => { setFrom(e.target.value); setSkip(0); }}
                                className="w-full border rounded px-3 py-2"
                            />
                        </div>
                        <div className="flex-1">
                            <div className="text-xs font-medium text-gray-600 mb-1">Até</div>
                            <input
                                type="datetime-local"
                                value={to}
                                onChange={(e) => { setTo(e.target.value); setSkip(0); }}
                                className="w-full border rounded px-3 py-2"
                            />
                        </div>
                    </div>

                    {/* Itens por página */}
                    <div>
                        <div className="text-xs font-medium text-gray-600 mb-1">Itens por página</div>
                        <select
                            value={limit}
                            onChange={(e) => { setLimit(Number(e.target.value)); setSkip(0); }}
                            className="border rounded px-3 py-2"
                        >
                            {[25, 50, 100, 200, 500].map(n => <option key={n} value={n}>{n}</option>)}
                        </select>
                    </div>
                </div>

                <div className="mt-3 flex gap-2">
                    <button onClick={clearFilters} className="px-3 py-1 rounded border bg-white hover:bg-gray-50 text-sm">
                        Limpar filtros
                    </button>
                </div>
            </div>

            {/* Tabela */}
            <div className="rounded-lg border overflow-hidden">
                <div className="max-h-[70vh] overflow-auto">
                    <table className="min-w-full border-collapse">
                        <thead className="sticky top-0 z-10">
                            <tr className="bg-gray-100">
                                <th className="border px-2 py-1 text-left w-[180px]">Timestamp</th>
                                <th className="border px-2 py-1 text-left w-[140px]">Source</th>
                                <th className="border px-2 py-1 text-left w-[100px]">Level</th>
                                <th className="border px-2 py-1 text-left">Message</th>
                            </tr>
                        </thead>
                        <tbody>
                            {error && <tr><td colSpan={4} className="border px-3 py-4 text-red-600">{error}</td></tr>}
                            {loading && !logs.length && <tr><td colSpan={4} className="border px-3 py-4 text-gray-500">Carregando...</td></tr>}
                            {!loading && logs.length === 0 && !error && (
                                <tr><td colSpan={4} className="border px-3 py-6 text-gray-500 text-center">Nenhum log encontrado.</td></tr>
                            )}
                            {logs.map((log) => <LogRow key={log.id || `${log.timestamp}-${log.source}-${log.message}`} log={log} />)}
                        </tbody>
                    </table>
                </div>

                {/* Paginação */}
                <div className="p-2 flex items-center justify-between bg-white">
                    <div className="text-sm text-gray-600">Exibindo {logs.length} registros • skip {skip}</div>
                    <div className="space-x-2">
                        <button
                            onClick={() => setSkip(s => Math.max(s - limit, 0))}
                            className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded border text-sm"
                            disabled={skip <= 0 || loading}
                        >
                            Anterior
                        </button>
                        <button
                            onClick={() => setSkip(s => s + limit)}
                            className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded border text-sm"
                            disabled={loading || logs.length < limit}
                        >
                            Próxima
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
