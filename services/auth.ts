// services/auth.ts
import { apiGateway } from "@/lib/axios";
import type { User } from "@/contexts/auth/types";

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
}

export interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
}

// login: obtém access + refresh tokens
export async function loginRequest(email: string, pass: string) {
  const { data } = await apiGateway.post("/auth/login", { email, password: pass });
  return data as { accessToken: string };
}

export async function refreshRequest() {
  const { data } = await apiGateway.post("/auth/refresh", null);
  return data as { accessToken: string };
}

export async function fetchCurrentUser(): Promise<User> {
  const { data } = await apiGateway.get<User>("/users/me");
  return data;
}

export async function logoutRequest(): Promise<void> {
  await apiGateway.post("/auth/logout");
}
