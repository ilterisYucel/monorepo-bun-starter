import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import axios, { AxiosError } from "axios";
import type { AxiosRequestConfig, AxiosAdapter } from "axios";
import { apiClient } from "./api-client";
import { isTunnelMode, apiBaseUrl } from "./api-base";
import { useAuthStore } from "../features/auth/stores/AuthStore";
import { setLoginNavigator } from "./auth-navigation";

vi.mock("./api-base", () => ({
  isTunnelMode: vi.fn(() => false),
  apiBaseUrl: vi.fn(() => "/api"),
  fieldRootPath: vi.fn((id: string) => `/field/${id}`),
}));

/**
 * field api-client interceptor sözleşmesi (AUTH-REFRESH 2026-09-23 — UC-1):
 * - Request: standalone'da `auth-token` Bearer eklenir; TÜNEL modunda
 *   localStorage'a DOKUNULMAZ (boss anahtarları korunur).
 * - 401 → tek-uçuş refresh (apiClient üzerinden — apiBaseUrl tabanlı;
 *   ham `axios.post` YASAK): eşzamanlı N istek TEK refresh bekler.
 * - Refresh başarısız / refresh'in kendisi 401 / refresh token yok →
 *   `clearAuthState()` (token'lar + persist store) + `navigateToLogin()`
 *   (SPA navigasyon — reload YOK).
 * - Tünel modunda 401 → interceptor tamamen İNERT (refresh yok, localStorage'a
 *   dokunulmaz, navigasyon yok).
 * - `_retry` bayrağı döngüyü keser.
 */

const TEST_USER = {
  id: "u-1",
  username: "admin",
  role: "admin" as const,
  name: "Admin",
  mustChangePassword: false,
  createdAt: "",
  updatedAt: "",
};

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

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem("auth-token", "eski");
  localStorage.setItem("auth-refresh-token", "rt-eski");
  vi.mocked(isTunnelMode).mockReturnValue(false);
  vi.mocked(apiBaseUrl).mockReturnValue("/api");
  setLoginNavigator(vi.fn());
  vi.restoreAllMocks();
});

afterEach(() => {
  apiClient.defaults.adapter = undefined;
});

describe("field api-client interceptor (AUTH-REFRESH — UC-1)", () => {
  it("standalone: request'e Bearer token eklenir", async () => {
    let seenAuth = "";
    setAdapter(async (config) => {
      seenAuth = String(config.headers.Authorization ?? "");
      return { status: 200, data: { ok: true } };
    });
    await apiClient.get("/fields/f-1/containers");
    expect(seenAuth).toBe("Bearer eski");
  });

  it("tünel modunda request interceptor Bearer EKLEMEZ (boss localStorage korunur)", async () => {
    vi.mocked(isTunnelMode).mockReturnValue(true);
    let seenAuth = "";
    setAdapter(async (config) => {
      seenAuth = String(config.headers.Authorization ?? "");
      return { status: 200, data: { ok: true } };
    });
    await apiClient.get("/fields/f-1/containers");
    expect(seenAuth).toBe("");
  });

  it("eşzamanlı N 401 → TEK /auth/refresh + hepsi yeni token'la retry (AK-1.1)", async () => {
    let refreshCalls = 0;
    let getCalls = 0;
    const seenAuth: string[] = [];
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
      seenAuth.push(String(config.headers.Authorization ?? ""));
      return { status: 200, data: { via: String(config.headers.Authorization ?? "") } };
    });

    const [a, b] = await Promise.all([
      apiClient.get("/fields/f-1/containers"),
      apiClient.get("/fields/f-1/containers"),
    ]);

    expect(refreshCalls).toBe(1);
    expect(a.status).toBe(200);
    expect(b.status).toBe(200);
    expect(String(a.data.via)).toBe("Bearer yeni");
    expect(String(b.data.via)).toBe("Bearer yeni");
    expect(localStorage.getItem("auth-token")).toBe("yeni");
    expect(localStorage.getItem("auth-refresh-token")).toBe("rt-yeni");
  });

  it("refresh apiClient üzerinden (apiBaseUrl) yapılır — ham axios.post ÇAĞRILMAZ (AK-1.2)", async () => {
    let refreshUrl = "";
    let refreshBase = "";
    setAdapter(async (config) => {
      if (config.url?.includes("/auth/refresh")) {
        refreshUrl = config.url;
        refreshBase = String(config.baseURL ?? "");
        return {
          status: 200,
          data: { accessToken: "yeni", refreshToken: "rt-yeni" },
        };
      }
      if ((config as { _retry?: boolean })._retry) {
        return { status: 200, data: { ok: true } };
      }
      return { status: 401, data: {} };
    });
    const rawPost = vi.spyOn(axios, "post");

    await apiClient.get("/fields/f-1/containers");

    expect(refreshUrl).toBe("/auth/refresh");
    expect(refreshBase).toBe("/api");
    expect(rawPost).not.toHaveBeenCalled();
  });

  it("refresh başarısız → token'lar + persist store temizlenir + /login SPA navigasyonu (AK-1.3)", async () => {
    const nav = vi.fn();
    setLoginNavigator(nav);
    useAuthStore.setState({
      user: TEST_USER,
      isAuthenticated: true,
      isAdmin: true,
      fieldIds: ["f-1"],
      mfaRequiredRoles: ["admin"],
      pendingMfaToken: null,
    });

    let refreshCalls = 0;
    setAdapter(async (config) => {
      if (config.url?.includes("/auth/refresh")) {
        refreshCalls += 1;
        return { status: 401, data: { error: "Gecersiz refresh token" } };
      }
      return { status: 401, data: {} };
    });

    await expect(apiClient.get("/fields/f-1/containers")).rejects.toBeTruthy();

    expect(refreshCalls).toBe(1);
    expect(localStorage.getItem("auth-token")).toBeNull();
    expect(localStorage.getItem("auth-refresh-token")).toBeNull();
    const s = useAuthStore.getState();
    expect(s.user).toBeNull();
    expect(s.isAuthenticated).toBe(false);
    expect(s.isAdmin).toBe(false);
    const persisted = JSON.parse(
      localStorage.getItem("field-auth-storage") ?? "{}",
    ) as { state?: { user?: unknown; isAuthenticated?: boolean } };
    expect(persisted.state?.user).toBeNull();
    expect(persisted.state?.isAuthenticated).toBe(false);
    expect(nav).toHaveBeenCalledWith("/login");
  });

  it("refresh token yoksa retry YAPILMAZ — temizlik + navigasyon (401 fırlar)", async () => {
    const nav = vi.fn();
    setLoginNavigator(nav);
    localStorage.removeItem("auth-refresh-token");
    let calls = 0;
    setAdapter(async () => {
      calls += 1;
      return { status: 401, data: {} };
    });

    await expect(apiClient.get("/fields/f-1/containers")).rejects.toMatchObject({
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

    await expect(apiClient.get("/fields/f-1/containers")).rejects.toMatchObject({
      response: { status: 401 },
    });
    expect(refreshCalls).toBe(1);
  });

  it("tünel modunda 401 → tamamen İNERT: refresh yok, localStorage'a dokunulmaz, navigasyon yok (AK-1.4)", async () => {
    vi.mocked(isTunnelMode).mockReturnValue(true);
    const nav = vi.fn();
    setLoginNavigator(nav);
    const rawPost = vi.spyOn(axios, "post");
    let calls = 0;
    setAdapter(async () => {
      calls += 1;
      return { status: 401, data: {} };
    });

    await expect(apiClient.get("/fields/f-1/containers")).rejects.toMatchObject({
      response: { status: 401 },
    });

    expect(calls).toBe(1);
    expect(rawPost).not.toHaveBeenCalled();
    expect(localStorage.getItem("auth-token")).toBe("eski");
    expect(localStorage.getItem("auth-refresh-token")).toBe("rt-eski");
    expect(nav).not.toHaveBeenCalled();
  });
});
