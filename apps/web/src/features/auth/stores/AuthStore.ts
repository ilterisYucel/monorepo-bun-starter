// apps/web/src/features/auth/stores/AuthStore.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { apiClient } from "../../../lib/api-client";
import type { User } from "../types/user";

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isTeknik: boolean;
  isGuest: boolean;
  login: (username: string, password: string) => Promise<void>;
  loginAsGuest: () => Promise<void>;
  logout: () => Promise<void>;
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
        });

        // re-login as guest so API calls keep working
        try {
          await doLogin(GUEST_USERNAME, GUEST_PASSWORD, set);
        } catch {
          // backend not ready
        }
      },
    }),
    { name: "auth-storage" },
  ),
);
