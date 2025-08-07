import { apiGateway } from "@/lib/axios";
import { AxiosResponse } from "axios";

export interface LoginResponse {
  accessToken: string;
}

export interface RefreshResponse {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
}

export async function _login(email: string, pass: string) {
  const axiosFetch: AxiosResponse<LoginResponse> = await apiGateway.post(
    "/auth/login",
    {
      email,
      password: pass,
    }
  );
  return axiosFetch.data;
}

export async function _refresh() {
  const axiosFetch: AxiosResponse<RefreshResponse> = await apiGateway.post(
    "/auth/refresh",
    null
  );
  return axiosFetch.data;
}

export async function _logout(): Promise<void> {
  await apiGateway.post("/auth/logout");
}
