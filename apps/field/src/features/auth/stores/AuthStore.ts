import { create } from "zustand";
import { persist } from "zustand/middleware";
import { apiClient } from "../../../lib/api-client";
import type { User } from "@gd-monorepo/shared-types";

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isTeknik: boolean;
  isBoss: boolean;
  fieldIds: string[];
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

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
    isBoss: user.role === "boss",
    fieldIds: user.fieldIds ?? [],
  });
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isAdmin: false,
      isTeknik: false,
      isBoss: false,
      fieldIds: [],

      login: async (username: string, password: string) => {
        await doLogin(username, password, set);
      },

      logout: async () => {
        try {
          await apiClient.post("/auth/logout");
        } catch {
          // sunucu hatasi olsa bile temizle
        }
        localStorage.removeItem("auth-token");
        localStorage.removeItem("auth-refresh-token");
        set({
          user: null,
          isAuthenticated: false,
          isAdmin: false,
          isTeknik: false,
          isBoss: false,
          fieldIds: [],
        });
      },
    }),
    { name: "field-auth-storage" },
  ),
);
