// lib/auth-manager.ts
"use client";
import { apiGateway } from "@/lib/axios";

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
    apiGateway.interceptors.response.use(
      (res) => res,
      async (err) => {
        const orig = err.config as any;

        if (!err.response || err.response.status !== 401) {
          return Promise.reject(err);
        }

        if (!orig || orig._retry) {
          return Promise.reject(err);
        }
        orig._retry = true;

        try {
          await this.refreshSingleFlight();
          return apiGateway.request(orig);
        } catch {
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
      await this.refresh();
      this.currentUser = await this.fetchMe();
    } catch {
      this.currentUser = null;
    } finally {
      this.initializing = false;
      this.emit();
    }
  }

  private async login(email: string, password: string): Promise<void> {
    await apiGateway.post("/auth/login", { email, password }, { withCredentials: true });
  }

  private async refresh(): Promise<void> {
    await apiGateway.post("/auth/refresh", {}, { withCredentials: true });
  }

  private async logout(): Promise<void> {
    await apiGateway.post("/auth/logout", {}, { withCredentials: true });
  }

  private async fetchMe(): Promise<User> {
    const { data } = await apiGateway.get<User>("/users/me", { withCredentials: true });
    return data;
  }

  private emit() {
    this.listeners.forEach((l) => l());
  }

  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

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
    await apiGateway.post(
      "/users/register",
      { email, password, name },
      { withCredentials: true }
    );
  }
}

export const authManager = new AuthManager();
