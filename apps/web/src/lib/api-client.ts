// apps/web/src/lib/api-client.ts
import axios from "axios";

export const API_BASE_URL = import.meta.env.VITE_API_URL || "/api";

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 30000,
});

// Request interceptor (örneğin token eklemek için)
apiClient.interceptors.request.use(
  (config) => {
    // Token varsa ekle
    const token = localStorage.getItem("auth-token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor (hata yönetimi)
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Unauthorized - login sayfasına yönlendir
      localStorage.removeItem("auth-token");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);