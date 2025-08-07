export interface User {
  id: string;
  email: string;
  name: string;
  isAdmin: boolean;
}

export interface LoginResponse {
  accessToken: string;
}

export interface RefreshResponse {
  accessToken: string;
}

