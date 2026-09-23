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
  /**
   * AUTH-REFRESH (2026-09-23) — oturum sonu temizliği. Backend çağrısı
   * YAPMAZ; state'i (persist dahil) tam sıfırlar. Refresh başarısızlığı
   * yolunda interceptor'dan çağrılır.
   */
  clearSession: () => void;
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

      // AUTH-REFRESH (2026-09-23): oturum sonu temizliği — backend çağrısı
      // YOK; persist middleware `set` ile bayatsız state'i yazar.
      clearSession: () => {
        set({ user: null, isAuthenticated: false });
      },
    }),
    { name: "supadmin-auth-storage" },
  ),
);
