import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import axios, { AxiosError } from "axios";
import type { AxiosRequestConfig, AxiosAdapter } from "axios";
import { apiClient } from "./api-client";

/**
 * field api-client interceptor sözleşmesi (2026-08-30 — T2):
 * - Request: localStorage'daki access token Bearer olarak eklenir.
 * - 401 → refresh token ile /api/auth/refresh → yeni token'larla ORİJİNAL
 *   istek retry edilir (bir kez — _retry bayrağı).
 * - Refresh başarısız → token'lar temizlenir + /login'e tam sayfa
 *   yönlendirme (saha UI'ı oturumu sonlandırır).
 * - Refresh token yoksa retry yapılmaz, hata çağırana fırlar.
 */

function response(
  config: AxiosRequestConfig,
  status: number,
  data: unknown,
) {
  return { data, status, statusText: String(status), headers: {}, config, request: {} };
}

function setAdapter(handler: (config: AxiosRequestConfig) => Promise<{ status: number; data: unknown }>) {
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
  vi.restoreAllMocks();
});

afterEach(() => {
  apiClient.defaults.adapter = undefined;
  vi.unstubAllGlobals();
});

describe("field api-client interceptor (T2)", () => {
  it("request'e Bearer token eklenir", async () => {
    let seenAuth = "";
    setAdapter(async (config) => {
      seenAuth = String(config.headers.Authorization ?? "");
      return { status: 200, data: { ok: true } };
    });
    await apiClient.get("/fields/f-1/containers");
    expect(seenAuth).toBe("Bearer eski");
  });

  it("401 → refresh → yeni token'larla retry", async () => {
    let calls = 0;
    setAdapter(async (config) => {
      calls += 1;
      if (calls === 1) return { status: 401, data: {} };
      return { status: 200, data: { via: config.headers.Authorization } };
    });
    const post = vi.spyOn(axios, "post").mockResolvedValue({
      data: { accessToken: "yeni", refreshToken: "rt-yeni" },
    });

    const res = await apiClient.get("/fields/f-1/containers");

    expect(res.status).toBe(200);
    expect(post).toHaveBeenCalledTimes(1);
    expect(String(post.mock.calls[0]?.[0])).toContain("/api/auth/refresh");
    expect(localStorage.getItem("auth-token")).toBe("yeni");
    expect(localStorage.getItem("auth-refresh-token")).toBe("rt-yeni");
  });

  it("refresh başarısız → token'lar silinir (tam sayfa /login yönlendirmesi jsdom'da navsiz)", async () => {
    setAdapter(async () => ({ status: 401, data: {} }));
    const post = vi.spyOn(axios, "post").mockRejectedValue(new Error("refresh yok"));

    await expect(apiClient.get("/fields/f-1/containers")).rejects.toBeTruthy();

    expect(localStorage.getItem("auth-token")).toBeNull();
    expect(localStorage.getItem("auth-refresh-token")).toBeNull();
  });

  it("refresh token yoksa retry YAPILMAZ — hata fırlar", async () => {
    localStorage.removeItem("auth-refresh-token");
    setAdapter(async () => ({ status: 401, data: {} }));
    const post = vi.spyOn(axios, "post");

    await expect(apiClient.get("/fields/f-1/containers")).rejects.toMatchObject({
      response: { status: 401 },
    });
    expect(post).not.toHaveBeenCalled();
  });

  it("ikinci 401 (retry sonrası) refresh ÇAĞRILMAZ — döngü koruması", async () => {
    setAdapter(async () => ({ status: 401, data: {} }));
    const post = vi.spyOn(axios, "post").mockResolvedValue({
      data: { accessToken: "yeni", refreshToken: "rt-yeni" },
    });

    await expect(apiClient.get("/fields/f-1/containers")).rejects.toMatchObject({
      response: { status: 401 },
    });
    expect(post).toHaveBeenCalledTimes(1);
  });
});
