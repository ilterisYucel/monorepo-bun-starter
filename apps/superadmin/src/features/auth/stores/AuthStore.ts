import { create } from "zustand";
import { persist } from "zustand/middleware";
import { apiClient } from "../../../lib/api-client";
import type { User } from "@gd-monorepo/shared-types";

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  /** Faz 1 T1.6 — zorunlu şifre değişimi (yeni token'larla oturumu tazeler). */
  changePassword: (oldPassword: string, newPassword: string) => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,

      login: async (username: string, password: string) => {
        const res = await apiClient.post("/auth/login", { username, password });
        const { accessToken, refreshToken, user } = res.data;

        localStorage.setItem("auth-token", accessToken);
        localStorage.setItem("auth-refresh-token", refreshToken);

        set({ user, isAuthenticated: true });
      },

      logout: async () => {
        try {
          await apiClient.post("/auth/logout");
        } catch {
          // temizle
        }
        localStorage.removeItem("auth-token");
        localStorage.removeItem("auth-refresh-token");
        set({ user: null, isAuthenticated: false });
      },

      changePassword: async (oldPassword: string, newPassword: string) => {
        const res = await apiClient.post("/auth/change-password", {
          oldPassword,
          newPassword,
        });
        const { accessToken, refreshToken, user } = res.data;

        localStorage.setItem("auth-token", accessToken);
        localStorage.setItem("auth-refresh-token", refreshToken);

        set({ user, isAuthenticated: true });
      },
    }),
    { name: "supadmin-auth-storage" },
  ),
);
