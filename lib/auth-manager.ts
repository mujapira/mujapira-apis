"use client";
import { apiGateway, authHttp } from "@/lib/axios";

export type User = {
  id: string;
  email: string;
  name: string;
  isAdmin: boolean;
};

class AuthManager {
  private currentUser: User | null = null;
  private initializing = true;
  private listeners = new Set<() => void>();

  private isRefreshing = false;
  private refreshPromise: Promise<void> | null = null;

  public hydrationPromise: Promise<void>;

  constructor() {
    this.setupInterceptors();
    this.hydrationPromise = this.initialize();
  }

  private setupInterceptors() {
    const isAuthRoute = (url?: string) => {
      if (!url) return false;
      return (
        url.includes("/auth/refresh") ||
        url.includes("/auth/login") ||
        url.includes("/auth/logout")
      );
    };

    apiGateway.interceptors.response.use(
      (res) => res,
      async (err) => {
        const orig = err?.config as any;
        const status = err?.response?.status;
        const url = orig?.url as string | undefined;

        // Sem config, não é 401, já foi retry, ou é rota de auth → não tenta refresh
        if (!orig || status !== 401 || orig._retry || isAuthRoute(url)) {
          return Promise.reject(err);
        }

        orig._retry = true;

        try {
          await this.refreshSingleFlight();
          // tenta novamente a chamada original
          return apiGateway.request(orig);
        } catch {
          // refresh falhou → encerra sessão localmente
          await this.signOut();
          return Promise.reject(err);
        }
      }
    );
  }

  private async refreshSingleFlight(): Promise<void> {
    if (this.isRefreshing && this.refreshPromise) {
      return this.refreshPromise;
    }
    this.isRefreshing = true;

    this.refreshPromise = this.refresh()
      .catch((e) => {
        throw e;
      })
      .finally(() => {
        this.isRefreshing = false;
        this.refreshPromise = null;
      });

    return this.refreshPromise;
  }

  private async initialize() {
    try {
      // Tenta obter sessão via refresh e em seguida pegar o usuário
      await this.refresh();
      this.currentUser = await this.fetchMe();
    } catch {
      this.currentUser = null;
    } finally {
      this.initializing = false;
      this.emit();
    }
  }

  // ======= chamadas de auth usando o cliente "cru" (sem interceptors) =======
  private async login(email: string, password: string): Promise<void> {
    await authHttp.post("/auth/login", { email, password });
  }

  private async refresh(): Promise<void> {
    await authHttp.post("/auth/refresh", {});
  }

  private async logout(): Promise<void> {
    await authHttp.post("/auth/logout", {});
  }
  // ==========================================================================

  private async fetchMe(): Promise<User> {
    const { data } = await apiGateway.get<User>("/users/me");
    return data;
  }

  private emit() {
    this.listeners.forEach((l) => l());
  }

  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  // Mantido para compatibilidade; se não usa token, pode remover do contexto
  getToken(): null {
    return null;
  }

  getUser() {
    return this.currentUser;
  }

  isInitializing() {
    return this.initializing;
  }

  async signIn(email: string, password: string) {
    await this.login(email, password);
    this.currentUser = await this.fetchMe();
    this.emit();
  }

  async signOut() {
    try {
      await this.logout();
    } finally {
      this.currentUser = null;
      this.emit();
    }
  }

  async registerUser(email: string, password: string, name: string) {
    await authHttp.post("/users/register", { email, password, name });
  }
}

export const authManager = new AuthManager();
