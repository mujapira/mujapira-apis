import { apiGateway } from "@/lib/axios";
import type { User } from "@/contexts/auth/types";
import { _login, _logout, _refresh } from "@/services/auth";
import { _getCurrentUser } from "@/services/user";

class AuthManager {
  private accessToken: string | null = null;
  private currentUser: User | null = null;
  private initializing = true;
  private listeners = new Set<() => void>();
  public hydrationPromise: Promise<void>;

  constructor() {
    this.setupInterceptors();
    this.hydrationPromise = this.initialize();
  }

  private setupInterceptors() {
    apiGateway.interceptors.request.use((config) => {
      if (this.accessToken) {
        config.headers = config.headers ?? {};
        config.headers.Authorization = `Bearer ${this.accessToken}`;
      }
      return config;
    });

    apiGateway.interceptors.response.use(
      (res) => res,
      async (err) => {
        const orig = err.config;
        if (err.response?.status === 401 && orig && !orig._retry) {
          orig._retry = true;
          try {
            const { accessToken: refreshed } = await _refresh();
            this.accessToken = refreshed;
            orig.headers.Authorization = `Bearer ${refreshed}`;
            this.emit();
            return apiGateway.request(orig);
          } catch {
            await this.signOut();
          }
        }
        return Promise.reject(err);
      }
    );
  }

  private async initialize() {
    try {
      const { accessToken } = await _refresh();
      this.accessToken = accessToken;

      const data = await _getCurrentUser();
      this.currentUser = data;
    } catch {
      this.accessToken = null;
      this.currentUser = null;
    } finally {
      this.initializing = false;
      this.emit();
    }
  }

  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit() {
    this.listeners.forEach((listener) => listener());
  }

  getToken() {
    return this.accessToken;
  }

  getUser() {
    return this.currentUser;
  }

  isInitializing() {
    return this.initializing;
  }

  async signIn(email: string, password: string) {
    const { accessToken } = await _login(email, password);
    this.accessToken = accessToken;
    const response = await apiGateway.get<User>("/users/me");
    this.currentUser = response.data;
    this.emit();
  }

  async signOut() {
    await _logout();
    this.accessToken = null;
    this.currentUser = null;
    this.emit();
  }
}

export const authManager = new AuthManager();
