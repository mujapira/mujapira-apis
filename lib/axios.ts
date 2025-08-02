import { refreshRequest } from "@/services/auth";
import axios, { AxiosError } from "axios";

export const apiGateway = axios.create({
  baseURL: "https://mujapira.com/api",
  withCredentials: true, // envia o cookie HttpOnly de refresh
});

// estado em memória (não persiste em localStorage para evitar XSS)
let accessToken: string | null = null;
let isRefreshing = false;
let refreshPromise: Promise<string> | null = null;

// injetar access token nos requests
apiGateway.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers = config.headers ?? {};
    config.headers["Authorization"] = `Bearer ${accessToken}`;
  }
  return config;
});

// interceptor de resposta para tentar refresh em 401
apiGateway.interceptors.response.use(
  (res) => res,
  async (err: AxiosError) => {
    if (err.response?.status === 401 && !err.config?.headers?.["x-retried"]) {
      // evita loops
      if (!isRefreshing) {
        isRefreshing = true;
        refreshPromise = refreshRequest()
          .then((d) => {
            accessToken = d.accessToken;
            return accessToken;
          })
          .finally(() => {
            isRefreshing = false;
          });
      }
      try {
        await refreshPromise;
        // retry original request
        const originalConfig = err.config!;
        originalConfig.headers = originalConfig.headers ?? {};
        originalConfig.headers["Authorization"] = `Bearer ${accessToken}`;
        originalConfig.headers["x-retried"] = "1";
        return apiGateway(originalConfig);
      } catch {
        // refresh falhou: cai para o erro original
        return Promise.reject(err);
      }
    }
    return Promise.reject(err);
  }
);
