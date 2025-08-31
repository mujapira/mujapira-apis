'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { apiGateway } from '@/lib/axios';
import { useAuth } from '@/contexts/auth/auth-context';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { ChevronDown, ChevronLeft, ChevronRight, Download, Filter, LinkIcon, MoreHorizontal, RefreshCw, SlidersHorizontal, Trash2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { clampedInterval, formatDatePtBR, getCookie, parseBool, pretty, setCookie, toISOOrEmpty } from '@/utils';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Toggle } from '@/components/ui/toggle';
import { AnimatePresence, motion } from "framer-motion";

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
const KNOWN_SOURCES = ['AuthService', 'UserService', 'MailService'];
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
function useDebounced<T>(value: T, delay = 400) {
    const [v, setV] = useState(value);
    useEffect(() => { const t = setTimeout(() => setV(value), delay); return () => clearTimeout(t); }, [value, delay]);
    return v;
}

function Pill({
    pressed, onPressedChange, children,
}: { pressed: boolean; onPressedChange: (v: boolean) => void; children: React.ReactNode }) {
    return (
        <Toggle
            pressed={pressed}
            onPressedChange={onPressedChange}
            variant="outline"
            className={cn(
                "rounded-full px-3",
                pressed && "bg-primary text-primary-foreground hover:bg-primary/90"
            )}
            size="sm"
        >
            {children}
        </Toggle>
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
    const [filtersOpen, setFiltersOpen] = useState(true)

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

    const copyShareLink = () => {
        const url = new URL(window.location.href);
        const qp = url.searchParams;
        qp.set("sources", sources.join(","));
        qp.set("levels", levels.join(","));
        qp.set("q", messageContains);
        qp.set("mk", metadataKey);
        qp.set("mv", metadataValue);
        qp.set("from", from);
        qp.set("to", to);
        qp.set("limit", String(limit));
        qp.set("skip", String(skip));
        navigator.clipboard.writeText(url.toString());
    };
    const exportCsv = () => {
        // plugue seu export real
        console.log("export csv");



    }
    return (
        <div className="p-4 space-y-4">
            {/* row 1: título */}
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-semibold tracking-tight">Logs</h2>
            </div>

            {/* row 2: toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        className="gap-2"
                        onClick={() => setFiltersOpen((s) => !s)}
                    >
                        <Filter className="h-4 w-4" />
                        Filtros
                    </Button>

                    {/* Auto-refresh inline */}
                    <div className="flex items-center rounded-md border px-2 pr-0">
                        <div className="flex items-center gap-2">
                            <Switch
                                id="auto-refresh"
                                checked={autoRefresh}
                                onCheckedChange={setAutoRefresh}
                            />
                            <Label htmlFor="auto-refresh" className="text-sm">Auto-refresh</Label>
                        </div>
                        <Separator orientation="vertical" className="mx-2 h-6" />
                        <Label htmlFor="interval" className="text-xs text-muted-foreground">Intervalo (s)</Label>
                        <Input
                            id="interval"
                            type="number"
                            min={1}
                            value={intervalSec}
                            onChange={(e) => setIntervalSec(clampedInterval(Number(e.target.value)))}
                            className="w-16 border-0 shadow-none"
                        />
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        className="gap-2"
                        onClick={manualRefresh}
                        disabled={loading}
                    >
                        <RefreshCw className="h-4 w-4" />
                        Atualizar
                    </Button>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="gap-2">
                                <MoreHorizontal className="h-4 w-4" />
                                Ações
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem onClick={exportCsv} className="gap-2">
                                <Download className="h-4 w-4" /> Exportar CSV
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={copyShareLink} className="gap-2">
                                <LinkIcon className="h-4 w-4" /> Copiar link da consulta
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={clearFilters} className="gap-2">
                                <Trash2 className="h-4 w-4" /> Limpar filtros
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            {/* filtros (card animado) */}
            <AnimatePresence initial={false}>
                {filtersOpen && (
                    <motion.div
                        key="filters"
                        initial={{ height: 0, opacity: 0, y: -8 }}
                        animate={{ height: "auto", opacity: 1, y: 0 }}
                        exit={{ height: 0, opacity: 0, y: -8 }}
                        transition={{ type: "spring", stiffness: 240, damping: 26 }}
                    >
                        <Card className="mt-1">
                            <CardContent className="p-4 space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                    {/* Serviços */}
                                    <div>
                                        <div className="text-xs font-medium text-muted-foreground mb-1">Serviços</div>
                                        <div className="flex flex-wrap gap-2">
                                            {sourceOptions.map((s) => (
                                                <Pill
                                                    key={s}
                                                    pressed={sources.includes(s)}
                                                    onPressedChange={() => toggleSource(s)}
                                                >
                                                    {s}
                                                </Pill>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Níveis */}
                                    <div>
                                        <div className="text-xs font-medium text-muted-foreground mb-1">Níveis</div>
                                        <div className="flex flex-wrap gap-2">
                                            {LEVEL_OPTIONS.map((l) => (
                                                <Pill
                                                    key={l}
                                                    pressed={levels.includes(l)}
                                                    onPressedChange={() => toggleLevel(l)}
                                                >
                                                    {l}
                                                </Pill>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Contém na mensagem */}
                                    <div>
                                        <div className="text-xs font-medium text-muted-foreground mb-1">Contém na mensagem</div>
                                        <Input
                                            placeholder="ex.: usuário, e-mail, timeout…"
                                            value={messageContains}
                                            onChange={(e) => { setMessageContains(e.target.value); setSkip(0); }}
                                        />
                                    </div>

                                    {/* Metadata */}
                                    <div className="md:col-span-2">
                                        <div className="text-xs font-medium text-muted-foreground mb-1">Metadata (chave / valor)</div>
                                        <div className="flex gap-2">
                                            <Input
                                                placeholder="ex.: UserId, Found, To"
                                                value={metadataKey}
                                                onChange={(e) => { setMetadataKey(e.target.value); setSkip(0); }}
                                            />
                                            <Input
                                                placeholder="ex.: true, 123, mujapira@gmail.com"
                                                value={metadataValue}
                                                onChange={(e) => { setMetadataValue(e.target.value); setSkip(0); }}
                                            />
                                        </div>
                                    </div>

                                    {/* Datas */}
                                    <div className="flex gap-2">
                                        <div className="flex-1">
                                            <div className="text-xs font-medium text-muted-foreground mb-1">De</div>
                                            <Input
                                                type="datetime-local"
                                                value={from}
                                                onChange={(e) => { setFrom(e.target.value); setSkip(0); }}
                                            />
                                        </div>
                                        <div className="flex-1">
                                            <div className="text-xs font-medium text-muted-foreground mb-1">Até</div>
                                            <Input
                                                type="datetime-local"
                                                value={to}
                                                onChange={(e) => { setTo(e.target.value); setSkip(0); }}
                                            />
                                        </div>
                                    </div>

                                    {/* Itens por página */}
                                    <div>
                                        <div className="text-xs font-medium text-muted-foreground mb-1">Itens por página</div>
                                        <Select
                                            value={String(limit)}
                                            onValueChange={(v) => { setLimit(Number(v)); setSkip(0); }}
                                        >
                                            <SelectTrigger className="w-[160px]">
                                                <SelectValue placeholder="Selecionar" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {[25, 50, 100, 200, 500].map((n) => (
                                                    <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <Separator />
                                <div className="flex gap-2">
                                    <Button variant="outline" size="sm" onClick={clearFilters}>
                                        Limpar filtros
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* row 3: tabela */}
            <Card className="overflow-hidden">
                <div className="max-h-[70vh] overflow-auto">
                    <Table>
                        <TableHeader className="sticky top-0 z-10 bg-muted">
                            <TableRow>
                                <TableHead className="w-[180px]">Timestamp</TableHead>
                                <TableHead className="w-[140px]">Source</TableHead>
                                <TableHead className="w-[100px]">Level</TableHead>
                                <TableHead>Message</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {error && (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-destructive">
                                        {error}
                                    </TableCell>
                                </TableRow>
                            )}
                            {loading && !logs.length && (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-muted-foreground">
                                        Carregando…
                                    </TableCell>
                                </TableRow>
                            )}
                            {!loading && logs.length === 0 && !error && (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center text-muted-foreground py-6">
                                        Nenhum log encontrado.
                                    </TableCell>
                                </TableRow>
                            )}
                            {logs.map((log) => (
                                <LogRow key={log.id || `${log.timestamp}-${log.source}-${log.message}`} log={log} />
                            ))}
                        </TableBody>
                    </Table>
                </div>

                <div className="p-2 flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                        Exibindo {logs.length} registros • skip {skip}
                    </div>
                    <div className="flex gap-2">
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => setSkip((s) => Math.max(s - limit, 0))}
                            disabled={skip <= 0 || loading}
                            className="gap-1"
                        >
                            <ChevronLeft className="h-4 w-4" />
                            Anterior
                        </Button>
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => setSkip((s) => s + limit)}
                            disabled={loading || logs.length < limit}
                            className="gap-1"
                        >
                            Próxima
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </Card>
        </div>
    );
}
