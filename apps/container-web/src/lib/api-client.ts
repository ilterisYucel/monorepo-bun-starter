// apps/web/src/lib/api-client.ts
import axios from "axios";
import { apiBaseUrl, hashRoute, isTunnelMode } from "./api-base";
import type { User } from "../features/auth/types/user";

// Faz 4 T4.3/T4.4: build-time VITE_API_URL gomme kaldirildi — API taban yolu
// window.location'dan turetilir (tunel modunda Path-scoped cookie ile calisir).
export const API_BASE_URL = apiBaseUrl();

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 60000,
});

// --- Request interceptor: attach token ---
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("auth-token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// --- Plain axios instance for guest login (no interceptors, avoids loops) ---
const plainAxios = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

/**
 * Faz 5.1 ek — 403 "Sifre degisimi gerekli" tespiti.
 *
 * rbac must-change bloğu (T1.6) allowlist dışı HER yola bu yanıtı döner;
 * bu hata yutulursa uygulama dashboard'da kalıp sonsuz 403 yağdırır
 * ("veri yok" izlenimi). Yalnızca 403 + bu mesaj tanınır.
 */
export function isMustChangeError(error: unknown): boolean {
  if (error === null || typeof error !== "object") return false;
  const response = (error as { response?: unknown }).response as
    | { status?: unknown; data?: unknown }
    | undefined;
  if (!response || response.status !== 403) return false;
  const data = response.data as { error?: unknown } | undefined;
  return data?.error === "Sifre degisimi gerekli";
}

/**
 * Faz 5.1 ek — must-change 403'ünde `/change-password` yönlendirmesi kararı.
 *
 * - `/login` ve `/change-password` sayfalarında döngü YAPILMAZ.
 * - Tünel modunda (subpath SPA) yönlendirme yapılmaz — 401 akışı gibi (§5.4).
 */
export function mustChangeRedirectNeeded(
  pathname: string,
  error: unknown,
): boolean {
  if (!isMustChangeError(error)) return false;
  if (pathname.startsWith("/login") || pathname.startsWith("/change-password")) {
    return false;
  }
  if (pathname.startsWith("/containers/") && pathname.includes("/ui")) {
    return false;
  }
  return true;
}

/**
 * Faz 5.1 ek — login/refresh/guest-fallback'tan gelen güncel `user`'ı kalıcı
 * store'a (auth-storage) yazar. Store'daki bayat `user` mustChangePassword
 * bayrağını taşımadığında PrivateRoute guard'ı /change-password'a
 * yönlendiremiyordu; interceptor'ın bildiği kimlik ile UI'ın bildiği kimlik
 * kopuyordu.
 */
export function writeUserToAuthStorage(user: User): void {
  const raw = localStorage.getItem("auth-storage");
  if (!raw) return;
  try {
    const parsed = JSON.parse(raw);
    if (parsed.state) {
      parsed.state.user = user;
      parsed.state.isAuthenticated = true;
      parsed.state.isAdmin = user.role === "admin";
      parsed.state.isTeknik = user.role === "teknik";
      parsed.state.isGuest = user.role === "guest";
      localStorage.setItem("auth-storage", JSON.stringify(parsed));
    }
  } catch {
    localStorage.removeItem("auth-storage");
  }
}

/**
 * Faz 5.1 ek — hash router (T4.2) uyumlu tam sayfa yönlendirme.
 *
 * `window.location.href = "/x"` pathname'e yönlendirir; sayfa yüklenince boş
 * hash'le "/" rotası render edilir (canlı döngü: URL /change-password ama
 * içerik dashboard). Hash'e yazmak her durumda doğru rotayı açar.
 */
export function navigateToAppRoute(path: string): void {
  window.location.hash = hashRoute(path);
}

async function reLoginAsGuest(): Promise<string | null> {
  try {
    const res = await plainAxios.post("/auth/login", {
      username: "guest",
      password: "guest123",
    });
    const { accessToken, refreshToken, user } = res.data;

    localStorage.setItem("auth-token", accessToken);
    localStorage.setItem("auth-refresh-token", refreshToken);

    writeUserToAuthStorage(user);

    // Faz 5.1 ek: guest must-change durumundaysa sessizce guest'e düşmek
    // ölü döngüdür (her istek 403) — kullanıcı şifre değişimine yönlendirilir.
    if (user.mustChangePassword) {
      navigateToAppRoute("/change-password");
    }

    return accessToken;
  } catch {
    return null;
  }
}

// --- Refresh token queue ---
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}> = [];

function processQueue(error: unknown, token: string | null) {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error || !token) {
      reject(error);
    } else {
      resolve(token);
    }
  });
  failedQueue = [];
}

function clearAuthState() {
  localStorage.removeItem("auth-token");
  localStorage.removeItem("auth-refresh-token");
  const raw = localStorage.getItem("auth-storage");
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (parsed.state) {
        parsed.state.user = null;
        parsed.state.isAuthenticated = false;
        parsed.state.isAdmin = false;
        parsed.state.isTeknik = false;
        parsed.state.isGuest = false;
        localStorage.setItem("auth-storage", JSON.stringify(parsed));
      }
    } catch {
      // ponytail: stale storage, clear it
      localStorage.removeItem("auth-storage");
    }
  }
}

// --- Response interceptor: refresh on 401 ---
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Faz 4 T4.4: tunel modunda 401-refresh akisi KAPALI (§5.4) — 401 =
    // "oturum kapandi"; iframe kapanir. localStorage'a da dokunulmaz.
    if (isTunnelMode()) {
      return Promise.reject(error);
    }

    // Faz 5.1 ek: must-change 403'ü — kullaniciyi /change-password'a gotur
    // (401-refresh dongusune girmeden; store'a guncel user yazilamazsa bile
    // yonlendirme dogru sayfayi acar).
    if (mustChangeRedirectNeeded(window.location.pathname, error)) {
      navigateToAppRoute("/change-password");
      return Promise.reject(error);
    }

    if (error.response?.status !== 401 || originalRequest?._retry) {
      return Promise.reject(error);
    }

    // Manual login failure — don't interfere, just reject
    if (originalRequest?.url?.includes("/auth/login")) {
      return Promise.reject(error);
    }

    // Refresh token itself expired — re-login as guest silently
    if (originalRequest?.url?.includes("/auth/refresh")) {
      clearAuthState();
      const guestToken = await reLoginAsGuest();
      if (!guestToken) {
        navigateToAppRoute("/login");
      }
      return Promise.reject(error);
    }

    if (!isRefreshing) {
      isRefreshing = true;

      try {
        const refreshToken = localStorage.getItem("auth-refresh-token");
        if (!refreshToken) {
          throw new Error("Refresh token yok");
        }

        const res = await axios.post(`${API_BASE_URL}/auth/refresh`, {
          refreshToken,
        });

        const { accessToken, refreshToken: newRefreshToken, user } = res.data;
        localStorage.setItem("auth-token", accessToken);
        localStorage.setItem("auth-refresh-token", newRefreshToken);
        // Faz 5.1 ek: refresh yanitindaki guncel user'i store'a yaz (bayat
        // mustChangePassword bayragi guard'i kilitleyebiliyordu).
        if (user) writeUserToAuthStorage(user);

        processQueue(null, accessToken);

        originalRequest._retry = true;
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        clearAuthState();
        const guestToken = await reLoginAsGuest();
        if (guestToken) {
          processQueue(null, guestToken);
          originalRequest._retry = true;
          originalRequest.headers.Authorization = `Bearer ${guestToken}`;
          return apiClient(originalRequest);
        }
        processQueue(refreshError, null);
        navigateToAppRoute("/login");
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // Queue requests while refresh is in progress
    return new Promise((resolve, reject) => {
      failedQueue.push({
        resolve: (token: string) => {
          originalRequest._retry = true;
          originalRequest.headers.Authorization = `Bearer ${token}`;
          resolve(apiClient(originalRequest));
        },
        reject,
      });
    });
  },
);
