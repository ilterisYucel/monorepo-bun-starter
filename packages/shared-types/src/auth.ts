export type Role = "admin" | "teknik" | "guest";

export interface User {
  id: string;
  username: string;
  role: Role;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface CreateUserRequest {
  username: string;
  password: string;
  role: Role;
  name: string;
}

export interface UpdateUserRequest {
  username?: string;
  password?: string;
  role?: Role;
  name?: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface RefreshRequest {
  refreshToken: string;
}
