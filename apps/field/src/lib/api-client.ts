import axios from "axios";

export const apiClient = axios.create({
  baseURL: "/api",
  timeout: 15000,
  headers: { "Content-Type": "application/json" },
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("auth-token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      const refreshToken = localStorage.getItem("auth-refresh-token");
      if (refreshToken && !(error.config._retry as boolean)) {
        error.config._retry = true;
        try {
          const { data } = await axios.post("/api/auth/refresh", { refreshToken });
          localStorage.setItem("auth-token", data.accessToken);
          localStorage.setItem("auth-refresh-token", data.refreshToken);
          error.config.headers.Authorization = `Bearer ${data.accessToken}`;
          return apiClient(error.config);
        } catch {
          localStorage.removeItem("auth-token");
          localStorage.removeItem("auth-refresh-token");
          window.location.href = "/login";
        }
      }
    }
    return Promise.reject(error);
  },
);
