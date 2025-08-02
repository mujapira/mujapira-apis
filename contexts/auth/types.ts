export interface User {
  id: string;
  email: string;
  isAdmin: boolean;
  name: string;
}

export interface LoginResponse {
  accessToken: string;
}

export interface RefreshResponse {
  accessToken: string;
}

export interface AuthContextData {
  accessToken: string | null;
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  secureFetch: <T = any>(url: string, config?: any) => Promise<T>;
}
