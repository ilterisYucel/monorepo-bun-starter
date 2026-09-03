// apps/web/src/features/auth/stores/AuthStore.ts
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { apiClient } from "../../../lib/api-client";
import { isTunnelMode } from "../../../lib/api-base";
import type { User } from "../types/user";

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isTeknik: boolean;
  isGuest: boolean;
  /** 2026-08-30 — developer: guest benzeri salt-okunur (monitoring fazına hazır). */
  isDeveloper: boolean;
  login: (username: string, password: string) => Promise<void>;
  loginAsGuest: () => Promise<void>;
  logout: () => Promise<void>;
  /** Faz 1 T1.6 — zorunlu şifre değişimi (yeni token'larla oturumu tazeler). */
  changePassword: (oldPassword: string, newPassword: string) => Promise<void>;
  /** Faz 4 T4.4 — tünel oturumu: cookie'den hydrate edilen kullanıcıyı uygular. */
  applySession: (user: User) => void;
}

const GUEST_USERNAME = "guest";
const GUEST_PASSWORD = "guest123";

async function doLogin(
  username: string,
  password: string,
  set: (state: Partial<AuthState>) => void,
) {
  const res = await apiClient.post("/auth/login", { username, password });
  const { accessToken, refreshToken, user } = res.data;

  localStorage.setItem("auth-token", accessToken);
  localStorage.setItem("auth-refresh-token", refreshToken);

  set({
    user,
    isAuthenticated: true,
    isAdmin: user.role === "admin",
    isTeknik: user.role === "teknik",
    isGuest: user.role === "guest",
    isDeveloper: user.role === "developer",
  });
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isAdmin: false,
      isTeknik: false,
      isGuest: false,
      isDeveloper: false,

      login: async (username: string, password: string) => {
        await doLogin(username, password, set);
      },

      loginAsGuest: async () => {
        try {
          await doLogin(GUEST_USERNAME, GUEST_PASSWORD, set);
        } catch {
          // backend not ready — remain unauthenticated
        }
      },

      logout: async () => {
        try {
          await apiClient.post("/auth/logout");
        } catch {
          // sunucu hatasinda bile temizle
        }
        localStorage.removeItem("auth-token");
        localStorage.removeItem("auth-refresh-token");
        set({
          user: null,
          isAuthenticated: false,
          isAdmin: false,
          isTeknik: false,
          isGuest: false,
          isDeveloper: false,
        });

        // re-login as guest so API calls keep working
        try {
          await doLogin(GUEST_USERNAME, GUEST_PASSWORD, set);
        } catch {
          // backend not ready
        }
      },

      changePassword: async (oldPassword: string, newPassword: string) => {
        const res = await apiClient.post("/auth/change-password", {
          oldPassword,
          newPassword,
        });
        const { accessToken, refreshToken, user } = res.data;

        localStorage.setItem("auth-token", accessToken);
        localStorage.setItem("auth-refresh-token", refreshToken);

        set({
          user,
          isAuthenticated: true,
          isAdmin: user.role === "admin",
          isTeknik: user.role === "teknik",
          isGuest: user.role === "guest",
        });
      },

      // Faz 4 T4.4 — tünel modunda cookie tek doğruluk kaynağıdır:
      // localStorage'a YAZILMAZ (kırılganlık #1 — field'ın auth-storage'ı
      // aynı origin'de; çakışma yasak).
      applySession: (user: User) => {
        set({
          user,
          isAuthenticated: true,
          isAdmin: user.role === "admin",
          isTeknik: user.role === "teknik",
          isGuest: user.role === "guest",
          isDeveloper: user.role === "developer",
        });
      },
    }),
    {
      name: "auth-storage",
      // Tünel modunda persist no-op — localStorage izolasyonu (§5.4)
      storage: createJSONStorage(() =>
        isTunnelMode()
          ? { getItem: () => null, setItem: () => {}, removeItem: () => {} }
          : localStorage,
      ),
    },
  ),
);
