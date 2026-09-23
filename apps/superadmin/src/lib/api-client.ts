import axios from "axios";
import type { AxiosError, AxiosRequestConfig } from "axios";
import { useAuthStore } from "../features/auth/stores/AuthStore";
import { navigateToLogin } from "./auth-navigation";

/**
 * AUTH-REFRESH (2026-09-23) — tek-uçuş refresh interceptor sözleşmesi (UC-3):
 *
 * - Request: `auth-token` varsa Bearer eklenir (tünel YOK — superadmin
 *   tünellenmez).
 * - 401 → tek-uçuş refresh — eşzamanlı N istek TEK `/auth/refresh`'i bekler
 *   (failedQueue); refresh `apiClient` üzerinden yapılır.
 * - Refresh başarısız / refresh'in kendisi 401 / refresh token yok →
 *   `clearAuthState()` (token'lar + persist store) + `navigateToLogin()`
 *   (SPA navigasyon — reload YOK).
 * - `_retry` bayrağı döngüyü keser.
 */

export const apiClient = axios.create({
  baseURL: "/api",
  timeout: 15000,
  headers: { "Content-Type": "application/json" },
});

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}> = [];

function processQueue(error: unknown, token: string | null): void {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error || !token) {
      reject(error);
    } else {
      resolve(token);
    }
  });
  failedQueue = [];
}

/** Token'lar + persist store tam temizliği — refresh başarısızlığı yolu. */
function clearAuthState(): void {
  try {
    localStorage.removeItem("auth-token");
    localStorage.removeItem("auth-refresh-token");
  } catch {
    // gizli mod / engelli storage — uygulama çökmez
  }
  useAuthStore.getState().clearSession();
}

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("auth-token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as
      | (AxiosRequestConfig & { _retry?: boolean })
      | undefined;

    // Manuel giriş hatası — refresh akışına girilmez.
    if (originalRequest?.url?.includes("/auth/login")) {
      return Promise.reject(error);
    }

    if (error.response?.status !== 401 || originalRequest?._retry) {
      return Promise.reject(error);
    }

    if (originalRequest === undefined) {
      return Promise.reject(error);
    }

    // Refresh çağrısının kendisi 401 → oturum sonu (döngü koruması).
    if (originalRequest.url?.includes("/auth/refresh")) {
      clearAuthState();
      navigateToLogin();
      return Promise.reject(error);
    }

    if (!isRefreshing) {
      isRefreshing = true;

      try {
        const refreshToken = localStorage.getItem("auth-refresh-token");
        if (!refreshToken) {
          clearAuthState();
          navigateToLogin();
          return Promise.reject(error);
        }

        const { data } = await apiClient.post("/auth/refresh", { refreshToken });
        localStorage.setItem("auth-token", data.accessToken);
        localStorage.setItem("auth-refresh-token", data.refreshToken);

        processQueue(null, data.accessToken);

        // Retry'de Authorization elle YAZILMAZ — request interceptor yeni
        // token'ı localStorage'dan tazeler (tek doğruluk noktası).
        originalRequest._retry = true;
        return apiClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        clearAuthState();
        navigateToLogin();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // Refresh sürerken gelen istekler kuyrukta bekler (tek-uçuş).
    return new Promise((resolve, reject) => {
      failedQueue.push({
        resolve: () => {
          originalRequest._retry = true;
          resolve(apiClient(originalRequest));
        },
        reject,
      });
    });
  },
);
