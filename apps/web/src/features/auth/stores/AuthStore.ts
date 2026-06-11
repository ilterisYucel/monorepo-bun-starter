// apps/web/src/features/auth/stores/AuthStore.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User } from "../types/user";

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isTeknik: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
}

const STATIC_USERS: User[] = [
  { id: 1, username: "teknik", password: "teknik123", role: "teknik", name: "Teknik Kullanıcı" },
  { id: 2, username: "admin", password: "admin123", role: "admin", name: "Admin Kullanıcı" },
];

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isAdmin: false,
      isTeknik: false,

      login: async (username: string, password: string) => {
        const foundUser = STATIC_USERS.find(
          (u) => u.username === username && u.password === password
        );
        if (foundUser) {
          const { password: _, ...userWithoutPassword } = foundUser;
          set({
            user: userWithoutPassword as User,
            isAuthenticated: true,
            isAdmin: userWithoutPassword.role === "admin",
            isTeknik: userWithoutPassword.role === "teknik",
          });
          return true;
        }
        return false;
      },

      logout: () => {
        set({ user: null, isAuthenticated: false, isAdmin: false, isTeknik: false });
      },
    }),
    { name: "auth-storage" }
  )
);