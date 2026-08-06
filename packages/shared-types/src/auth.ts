export type Role = "admin" | "teknik" | "guest" | "boss";

export interface User {
  id: string;
  username: string;
  role: Role;
  name: string;
  fieldIds?: string[];
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
  fieldIds?: string[];
}

export interface UpdateUserRequest {
  username?: string;
  password?: string;
  role?: Role;
  name?: string;
  fieldIds?: string[];
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface RefreshRequest {
  refreshToken: string;
}
