import { Store } from "@tanstack/store";
import type { User } from "../types";

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isTeknik: boolean;
}

// Statik kullanıcılar (MVP)
const STATIC_USERS = [
  {
    id: 1,
    username: "teknik",
    password: "teknik123",
    role: "teknik" as const,
    name: "Teknik Kullanıcı",
  },
  {
    id: 2,
    username: "admin",
    password: "admin123",
    role: "admin" as const,
    name: "Admin Kullanıcı",
  },
];

// Initial state
const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isAdmin: false,
  isTeknik: false,
};

// Store oluştur
export const authStore = new Store<AuthState>(initialState);

// Storage'dan yükle
const storedUser = localStorage.getItem("battery_user");
if (storedUser) {
  const user = JSON.parse(storedUser);
  authStore.setState(() => ({
    user,
    isAuthenticated: true,
    isAdmin: user.role === "admin",
    isTeknik: user.role === "teknik",
  }));
}

// Store'u localStorage ile senkronize et
authStore.subscribe(() => {
  const state = authStore.state;
  if (state.user) {
    localStorage.setItem("battery_user", JSON.stringify(state.user));
  } else {
    localStorage.removeItem("battery_user");
  }
});

// Auth actions
export const authActions = {
  login: async (username: string, password: string): Promise<boolean> => {
    const foundUser = STATIC_USERS.find(
      (u) => u.username === username && u.password === password,
    );

    if (foundUser) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password: _, ...userWithoutPassword } = foundUser;
      authStore.setState(() => ({
        user: userWithoutPassword,
        isAuthenticated: true,
        isAdmin: userWithoutPassword.role === "admin",
        isTeknik: userWithoutPassword.role === "teknik",
      }));
      return true;
    }
    return false;
  },

  logout: () => {
    authStore.setState(() => ({
      user: null,
      isAuthenticated: false,
      isAdmin: false,
      isTeknik: false,
    }));
  },
};

// Selectors
export const useAuthStore = () => {
  return authStore.state;
};

// Hook for reactivity
export const useAuth = () => {
  const state = authStore.state;

  return {
    user: state.user,
    isAuthenticated: state.isAuthenticated,
    isAdmin: state.isAdmin,
    isTeknik: state.isTeknik,
    login: authActions.login,
    logout: authActions.logout,
  };
};
