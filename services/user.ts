import { apiGateway } from "@/lib/axios";
import type { User } from "@/contexts/auth/types";
import { AxiosResponse } from "axios";

export async function _getCurrentUser(): Promise<User> {
  const axiosResponse: AxiosResponse<User> = await apiGateway.get<User>(
    "/users/me"
  );
  return axiosResponse.data;
}

export async function _getAllUsers(): Promise<User[]> {
  const axiosResponse: AxiosResponse<User[]> = await apiGateway.get<User[]>(
    "/users"
  );
  return axiosResponse.data;
}
