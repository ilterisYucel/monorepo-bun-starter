// apps/web/src/features/auth/hooks/useAuth.ts
import { useAuthStore } from "../stores/AuthStore";

export const useAuth = () => {
  const { user, isAuthenticated, isAdmin, isTeknik, login, logout } = useAuthStore();
  return { user, isAuthenticated, isAdmin, isTeknik, login, logout };
};