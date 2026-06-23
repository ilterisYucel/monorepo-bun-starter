// apps/web/src/lib/api-client.ts
import axios from "axios";

export const API_BASE_URL = import.meta.env.VITE_API_URL || "/api";

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 300000,
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

    if (error.response?.status !== 401 || originalRequest?._retry) {
      return Promise.reject(error);
    }

    // Don't try to refresh login or refresh calls themselves
    if (
      originalRequest?.url?.includes("/auth/refresh") ||
      originalRequest?.url?.includes("/auth/login")
    ) {
      clearAuthState();
      window.location.href = "/login";
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

        const { accessToken, refreshToken: newRefreshToken } = res.data;
        localStorage.setItem("auth-token", accessToken);
        localStorage.setItem("auth-refresh-token", newRefreshToken);

        processQueue(null, accessToken);

        originalRequest._retry = true;
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        clearAuthState();
        window.location.href = "/login";
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
