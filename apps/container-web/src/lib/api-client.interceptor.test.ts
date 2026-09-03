import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import axios, { AxiosError } from "axios";
import type { AxiosRequestConfig, AxiosAdapter } from "axios";
import { apiClient } from "./api-client";
import { isTunnelMode } from "./api-base";
import type { User } from "../features/auth/types/user";

/**
 * api-client 401-refresh interceptor sözleşmesi (2026-08-30 — T2):
 * - 401 → refresh → YENİ token'la orijinal istek retry edilir.
 * - Eşzamanlı 401'ler TEK refresh üretir (kuyruk).
 * - _retry'li 401 reddedilir (döngü koruması).
 * - /auth/login 401'ine karışılmaz.
 * - Tünel modunda refresh akışı KAPALI (401 aynen reddedilir).
 * - must-change 403'ü /change-password'a yönlendirir.
 * - Refresh başarısız → guest fallback; o da başarısız → /login'e yönlendirme.
 */

function response(
  config: AxiosRequestConfig,
  status: number,
  data: unknown,
) {
  return {
    data,
    status,
    statusText: String(status),
    headers: {},
    config,
    request: {},
  };
}

function setAdapter(handler: (config: AxiosRequestConfig) => Promise<{ status: number; data: unknown }>) {
  const adapter: AxiosAdapter = async (config) => {
    const { status, data } = await handler(config);
    const res = response(config, status, data);
    // axios >=1.16: custom adapter donusunde dispatchRequest validateStatus
    // KONTROL ETMEZ — 4xx'i error'a cevirmek adapter'in sorumlulugudur
    // (xhr adapter settle kullanir). Ayni davranisi taklit ediyoruz.
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

const authUser = (): User => ({
  id: "u-1",
  username: "admin",
  role: "admin",
  name: "Admin",
  createdAt: "",
  updatedAt: "",
});

function refreshResponse() {
  return {
    data: {
      accessToken: "yeni-access",
      refreshToken: "yeni-refresh",
      user: authUser(),
    },
  };
}

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem("auth-token", "eski-access");
  localStorage.setItem("auth-refresh-token", "eski-refresh");
  history.pushState({}, "", "/dashboard");
  vi.restoreAllMocks();
});

afterEach(() => {
  apiClient.defaults.adapter = undefined;
  vi.unstubAllGlobals();
});

describe("api-client 401-refresh interceptor (T2)", () => {
  it("401 → refresh → yeni token'la retry 200 döner", async () => {
    let calls = 0;
    setAdapter(async (config) => {
      calls += 1;
      if (calls === 1) return { status: 401, data: { error: "x" } };
      return { status: 200, data: { ok: true, via: config.headers.Authorization } };
    });
    const post = vi.spyOn(axios, "post").mockResolvedValue(refreshResponse());

    const res = await apiClient.get("/api/data/x");

    expect(res.status).toBe(200);
    expect(post).toHaveBeenCalledTimes(1);
    expect(String(post.mock.calls[0]?.[0])).toContain("/auth/refresh");
    expect(localStorage.getItem("auth-token")).toBe("yeni-access");
    expect(localStorage.getItem("auth-refresh-token")).toBe("yeni-refresh");
  });

  it("eşzamanlı 401'ler TEK refresh üretir (kuyruk)", async () => {
    let calls = 0;
    setAdapter(async () => {
      calls += 1;
      if (calls <= 2) return { status: 401, data: {} };
      return { status: 200, data: { ok: true } };
    });
    const post = vi.spyOn(axios, "post").mockImplementation(async () => {
      await new Promise((r) => setTimeout(r, 10));
      return refreshResponse();
    });

    const [a, b] = await Promise.all([
      apiClient.get("/api/data/a"),
      apiClient.get("/api/data/b"),
    ]);

    expect(a.status).toBe(200);
    expect(b.status).toBe(200);
    expect(post).toHaveBeenCalledTimes(1);
  });

  it("_retry'li ikinci 401 reddedilir (döngü koruması)", async () => {
    setAdapter(async () => ({ status: 401, data: {} }));
    const post = vi.spyOn(axios, "post").mockResolvedValue(refreshResponse());

    await expect(apiClient.get("/api/data/x")).rejects.toMatchObject({
      response: { status: 401 },
    });
    expect(post).toHaveBeenCalledTimes(1);
  });

  it("/auth/login 401'ine karışılmaz (refresh ÇAĞRILMAZ)", async () => {
    setAdapter(async () => ({ status: 401, data: {} }));
    const post = vi.spyOn(axios, "post");

    await expect(
      apiClient.post("/auth/login", { username: "x", password: "y" }),
    ).rejects.toMatchObject({ response: { status: 401 } });
    expect(post).not.toHaveBeenCalled();
  });

  it("tünel modunda 401-refresh KAPALI (401 aynen reddedilir)", async () => {
    history.pushState({}, "", "/containers/c-1/ui/dashboard");
    expect(isTunnelMode()).toBe(true);

    setAdapter(async () => ({ status: 401, data: {} }));
    const post = vi.spyOn(axios, "post");

    await expect(apiClient.get("/api/data/x")).rejects.toMatchObject({
      response: { status: 401 },
    });
    expect(post).not.toHaveBeenCalled();
    // localStorage'a dokunulmaz (oturum alanı korunur)
    expect(localStorage.getItem("auth-token")).toBe("eski-access");
  });

  it("must-change 403'ü /change-password'a yönlendirir", async () => {
    setAdapter(async () => ({
      status: 403,
      data: { error: "Sifre degisimi gerekli" },
    }));
    const post = vi.spyOn(axios, "post");

    await expect(apiClient.get("/api/data/x")).rejects.toMatchObject({
      response: { status: 403 },
    });
    expect(post).not.toHaveBeenCalled();
    expect(window.location.hash).toBe("#/change-password");
  });

  it("refresh başarısız + guest fallback başarısız → /login'e yönlendirilir", async () => {
    setAdapter(async () => ({ status: 401, data: {} }));
    // refresh de guest login de başarısız (jsdom network yok → plainAxios hata)
    const post = vi.spyOn(axios, "post").mockRejectedValue(new Error("refresh reddedildi"));

    await expect(apiClient.get("/api/data/x")).rejects.toBeTruthy();
    expect(window.location.hash).toBe("#/login");
    expect(localStorage.getItem("auth-token")).toBeNull();
  });
});
