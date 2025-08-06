"use client";

import {
    createContext,
    useContext,
    useState,
    useEffect,
    useCallback,
    useMemo,
    ReactNode,
} from "react";
import type { AxiosInstance, AxiosError, AxiosRequestConfig } from "axios";
import {
    loginRequest,
    refreshRequest,
    logoutRequest,
} from "@/services/auth";
import { apiGateway } from "@/lib/axios";
import { User } from "./types";
import { fetchCurrentUser } from "@/services/user";

export interface AuthContextData {
  accessToken: string | null;
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  secureFetch: <T = any>(url: string, config?: any) => Promise<T>;
  isInitializing: boolean;
}


const DEBUG = process.env.NEXT_PUBLIC_AUTH_LOG ?? false;

const AuthContext = createContext<AuthContextData | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [accessToken, setAccessToken] = useState<string | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [isInitializing, setIsInitializing] = useState(true);

    // 1) Silent-refresh na montagem usando só o cookie (withCredentials envia o cookie)
    useEffect(() => {
        (async () => {
            if (DEBUG) console.log("[Auth] init: silent-refresh via cookie");
            try {
                const { accessToken: newAT } = await refreshRequest();
                setAccessToken(newAT);
                if (DEBUG) console.log("[Auth] silent-refresh succeeded");
            } catch (err) {
                if (DEBUG) console.warn("[Auth] silent-refresh failed, clearing state", err);
                setAccessToken(null);
            } finally {
                setIsInitializing(false);
            }
        })();
    }, []); // só no mount

    // 2) Axios instance com interceptors
    const client: AxiosInstance = useMemo(() => {
        const inst = apiGateway;

        inst.interceptors.request.use((config) => {
            if (DEBUG) console.log("[Auth] → request:", config.method, config.url);
            if (accessToken) {
                config.headers = config.headers ?? {};
                (config.headers as Record<string, string>)["Authorization"] =
                    `Bearer ${accessToken}`;
            }
            return config;
        });

        inst.interceptors.response.use(
            (res) => {
                if (DEBUG) console.log("[Auth] ← response:", res.status, res.config.url);
                return res;
            },
            async (error: AxiosError & { config?: any }) => {
                const cfg = error.config;
                if (DEBUG) console.warn("[Auth] ✖ error:", error.response?.status, cfg?.url);

                // 401 -> tenta refresh (cookie + expired token)
                if (
                    error.response?.status === 401 &&
                    cfg &&
                    !cfg.__isRetry &&
                    accessToken
                ) {
                    cfg.__isRetry = true;
                    try {
                        if (DEBUG) console.log("[Auth] 401 detected, refreshing…");
                        const { accessToken: newAT } = await refreshRequest();
                        setAccessToken(newAT);
                        if (DEBUG) console.log("[Auth] refresh successful");

                        cfg.headers = cfg.headers ?? {};
                        (cfg.headers as Record<string, string>)["Authorization"] = `Bearer ${newAT}`;
                        return inst.request(cfg);
                    } catch (refreshErr) {
                        if (DEBUG) console.error("[Auth] refresh failed:", refreshErr);
                        setAccessToken(null);
                        setUser(null);
                    }
                }
                return Promise.reject(error);
            }
        );

        return inst;
    }, [accessToken]);

    // 3) Quando o accessToken muda (e não estamos inicializando), busca o usuário
    useEffect(() => {
        if (isInitializing) return;
        if (!accessToken) {
            if (DEBUG) console.log("[Auth] no accessToken, clearing user state");
            setUser(null);
            return;
        }
        (async () => {
            if (DEBUG) console.log("[Auth] fetching current user…");
            try {
                const u = await fetchCurrentUser();
                setUser(u);
                if (DEBUG) console.log("[Auth] user fetched:", u);
            } catch (err) {
                if (DEBUG) console.error("[Auth] fetchCurrentUser failed:", err);
                setAccessToken(null);
                setUser(null);
            }
        })();
    }, [accessToken, isInitializing]);

    // 4) login: recebe access+refresh, guarda só access (cookie é setado no backend)
    const login = useCallback(
        async (email: string, password: string) => {
            if (DEBUG) console.log("[Auth] → login:", email);
            const { accessToken: at } = await loginRequest(email, password);
            setAccessToken(at);
            if (DEBUG) console.log("[Auth] login successful");
        },
        []
    );

    // 5) logout: chama back, limpa access (backend limpa cookie)
    const logout = useCallback(async () => {
        if (DEBUG) console.log("[Auth] → logout");
        await logoutRequest();
        setAccessToken(null);
        setUser(null);
        if (DEBUG) console.log("[Auth] logged out");
    }, []);

    // 6) secureFetch via client com interceptor
    const secureFetch = useCallback(
        async <T = unknown>(
            url: string,
            config?: AxiosRequestConfig
        ): Promise<T> => {
            if (DEBUG) console.log("[Auth] → secureFetch:", url);
            const { data } = await client.request<T>({ url, ...config });
            if (DEBUG) console.log("[Auth] secureFetch data:", data);
            return data;
        },
        [client]
    );

    const ctxValue: AuthContextData = useMemo(
        () => ({
            accessToken,
            user,
            isAuthenticated: Boolean(user),
            login,
            logout,
            secureFetch,
            isInitializing,
        }),
        [accessToken, user, login, logout, secureFetch, isInitializing]
    );

    return (
        <AuthContext.Provider value={ctxValue}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth(): AuthContextData {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth must be used dentro de AuthProvider");
    return ctx;
}
