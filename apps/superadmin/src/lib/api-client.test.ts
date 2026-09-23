import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { AxiosError } from "axios";
import type { AxiosRequestConfig, AxiosAdapter } from "axios";
import { apiClient } from "./api-client";
import { useAuthStore } from "../features/auth/stores/AuthStore";
import { setLoginNavigator } from "./auth-navigation";

/**
 * superadmin api-client interceptor sözleşmesi (AUTH-REFRESH 2026-09-23 — UC-3):
 * - Request: `auth-token` Bearer eklenir.
 * - 401 → tek-uçuş refresh: eşzamanlı N istek TEK `/auth/refresh`'i bekler
 *   (failedQueue); retry yeni token'la yapılır (AK-3.1).
 * - Refresh başarısız / refresh'in kendisi 401 / refresh token yok →
 *   `clearAuthState()` (token'lar + persist store) + `navigateToLogin()`
 *   (SPA navigasyon — reload YOK) (AK-3.2).
 * - `_retry` bayrağı döngüyü keser.
 * - Tünel guard'ı YOKTUR (superadmin tünellenmez).
 */

function response(config: AxiosRequestConfig, status: number, data: unknown) {
  return {
    data,
    status,
    statusText: String(status),
    headers: {},
    config,
    request: {},
  };
}

function setAdapter(
  handler: (config: AxiosRequestConfig) => Promise<{ status: number; data: unknown }>,
) {
  const adapter: AxiosAdapter = async (config) => {
    const { status, data } = await handler(config);
    const res = response(config, status, data);
    if (status >= 400) {
      throw new AxiosError(
        `Request failed with status code ${status}`,
        status === 401 ? AxiosError.ERR_BAD_REQUEST : AxiosError.ERR_BAD_RESPONSE,
        config,
        null,
        res,
      );
    }
    return res;
  };
  apiClient.defaults.adapter = adapter;
}

const TEST_USER = {
  id: "u-1",
  username: "admin",
  role: "admin" as const,
  name: "Admin",
  mustChangePassword: false,
  createdAt: "",
  updatedAt: "",
};

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem("auth-token", "eski");
  localStorage.setItem("auth-refresh-token", "rt-eski");
  useAuthStore.setState({ user: null, isAuthenticated: false });
  setLoginNavigator(vi.fn());
  vi.restoreAllMocks();
});

afterEach(() => {
  apiClient.defaults.adapter = undefined;
});

describe("superadmin api-client interceptor (AUTH-REFRESH — UC-3)", () => {
  it("request'e Bearer token eklenir", async () => {
    let seenAuth = "";
    setAdapter(async (config) => {
      seenAuth = String(config.headers.Authorization ?? "");
      return { status: 200, data: { ok: true } };
    });
    await apiClient.get("/fields");
    expect(seenAuth).toBe("Bearer eski");
  });

  it("eşzamanlı N 401 → TEK /auth/refresh + hepsi yeni token'la retry (AK-3.1)", async () => {
    let refreshCalls = 0;
    let getCalls = 0;
    setAdapter(async (config) => {
      if (config.url?.includes("/auth/refresh")) {
        refreshCalls += 1;
        return {
          status: 200,
          data: { accessToken: "yeni", refreshToken: "rt-yeni" },
        };
      }
      getCalls += 1;
      if (getCalls <= 2) return { status: 401, data: {} };
      return { status: 200, data: { via: String(config.headers.Authorization ?? "") } };
    });

    const [a, b] = await Promise.all([
      apiClient.get("/fields"),
      apiClient.get("/notifications"),
    ]);

    expect(refreshCalls).toBe(1);
    expect(String(a.data.via)).toBe("Bearer yeni");
    expect(String(b.data.via)).toBe("Bearer yeni");
    expect(localStorage.getItem("auth-token")).toBe("yeni");
    expect(localStorage.getItem("auth-refresh-token")).toBe("rt-yeni");
  });

  it("refresh başarısız → token'lar + persist store temizlenir + /login SPA navigasyonu (AK-3.2)", async () => {
    const nav = vi.fn();
    setLoginNavigator(nav);
    useAuthStore.setState({ user: TEST_USER, isAuthenticated: true });

    let refreshCalls = 0;
    setAdapter(async (config) => {
      if (config.url?.includes("/auth/refresh")) {
        refreshCalls += 1;
        return { status: 401, data: { error: "Gecersiz refresh token" } };
      }
      return { status: 401, data: {} };
    });

    await expect(apiClient.get("/fields")).rejects.toBeTruthy();

    expect(refreshCalls).toBe(1);
    expect(localStorage.getItem("auth-token")).toBeNull();
    expect(localStorage.getItem("auth-refresh-token")).toBeNull();
    const s = useAuthStore.getState();
    expect(s.user).toBeNull();
    expect(s.isAuthenticated).toBe(false);
    const persisted = JSON.parse(
      localStorage.getItem("supadmin-auth-storage") ?? "{}",
    ) as { state?: { user?: unknown; isAuthenticated?: boolean } };
    expect(persisted.state?.user).toBeNull();
    expect(persisted.state?.isAuthenticated).toBe(false);
    expect(nav).toHaveBeenCalledWith("/login");
  });

  it("refresh token yoksa retry YAPILMAZ — temizlik + navigasyon", async () => {
    const nav = vi.fn();
    setLoginNavigator(nav);
    localStorage.removeItem("auth-refresh-token");
    let calls = 0;
    setAdapter(async () => {
      calls += 1;
      return { status: 401, data: {} };
    });

    await expect(apiClient.get("/fields")).rejects.toMatchObject({
      response: { status: 401 },
    });

    expect(calls).toBe(1);
    expect(localStorage.getItem("auth-token")).toBeNull();
    expect(nav).toHaveBeenCalledWith("/login");
  });

  it("retry sonrası ikinci 401 refresh ÇAĞRILMAZ — döngü koruması (_retry)", async () => {
    let refreshCalls = 0;
    setAdapter(async (config) => {
      if (config.url?.includes("/auth/refresh")) {
        refreshCalls += 1;
        return {
          status: 200,
          data: { accessToken: "yeni", refreshToken: "rt-yeni" },
        };
      }
      return { status: 401, data: {} };
    });

    await expect(apiClient.get("/fields")).rejects.toMatchObject({
      response: { status: 401 },
    });
    expect(refreshCalls).toBe(1);
  });
});
