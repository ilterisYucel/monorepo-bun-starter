import { describe, it, expect, vi, afterEach } from "vitest";
import {
  apiBaseUrl,
  wsUrl,
  appDirPath,
  hasContainerSessionCookie,
  hashRoute,
  isTunnelMode,
  postLoginRoute,
} from "./api-base";

/**
 * T4.3 — URL türetimi sözleşmesi:
 * - Normal mod: "/" altında → api "/api", ws "ws://host/ws/telemetry".
 * - Tünel modu: "/containers/c-1/ui/" altında → api "/containers/c-1/ui/api",
 *   ws "ws://host/containers/c-1/ui/ws/telemetry" (cookie Path kapsamıyla).
 * - https → wss; trailing slash'ler normalize edilir.
 * - `hasContainerSessionCookie` yalnızca container_session'i tanır.
 */

describe("apiBaseUrl (T4.3)", () => {
  it("kök dizinde /api döner", () => {
    expect(apiBaseUrl({ protocol: "http:", host: "localhost:5173", pathname: "/" })).toBe("/api");
  });

  it("tünel subpath'inde /containers/:cid/ui/api döner", () => {
    expect(
      apiBaseUrl({ protocol: "http:", host: "field.local", pathname: "/containers/c-1/ui/" }),
    ).toBe("/containers/c-1/ui/api");
  });

  it("trailing slash normalize edilir", () => {
    expect(
      apiBaseUrl({ protocol: "http:", host: "x", pathname: "/containers/c-1/ui///" }),
    ).toBe("/containers/c-1/ui/api");
  });

  it("Faz 5.1 regresyon: normal SPA route'larinda sert yenileme /api dondurur", () => {
    // Kök neden (canlı 2026-08-26): isTunnelMode her alt yolu tünel sayiyordu —
    // /change-password'ta reload sonrasi API tabani "/change-password/api" olup
    // tum istekler 404'e dusuyordu ("Giris basarisiz" dongusu).
    expect(apiBaseUrl({ protocol: "http:", host: "localhost:5173", pathname: "/change-password" })).toBe("/api");
    expect(apiBaseUrl({ protocol: "http:", host: "localhost:5173", pathname: "/dashboard" })).toBe("/api");
    expect(apiBaseUrl({ protocol: "http:", host: "localhost:5173", pathname: "/login" })).toBe("/api");
  });

  it("tünel icindeki alt route'lar prefix'i korur", () => {
    expect(
      apiBaseUrl({ protocol: "http:", host: "field.local", pathname: "/containers/c-1/ui/dashboard" }),
    ).toBe("/containers/c-1/ui/api");
  });
});

describe("wsUrl (T4.3)", () => {
  it("http → ws, https → wss", () => {
    expect(wsUrl({ protocol: "http:", host: "h:5001", pathname: "/" })).toBe("ws://h:5001/ws/telemetry");
    expect(wsUrl({ protocol: "https:", host: "h", pathname: "/" })).toBe("wss://h/ws/telemetry");
  });

  it("tünel subpath'inde cookie kapsamıyla eşleşir", () => {
    expect(
      wsUrl({ protocol: "https:", host: "field.local", pathname: "/containers/c-1/ui" }),
    ).toBe("wss://field.local/containers/c-1/ui/ws/telemetry");
  });

  it("Faz 5.1 regresyon: normal route'ta sert yenileme kök WS adresini korur", () => {
    expect(wsUrl({ protocol: "http:", host: "h:5173", pathname: "/change-password" })).toBe("ws://h:5173/ws/telemetry");
    expect(wsUrl({ protocol: "http:", host: "h:5173", pathname: "/dashboard" })).toBe("ws://h:5173/ws/telemetry");
  });
});

describe("appDirPath (T4.3)", () => {
  it("kök için boş dize", () => {
    expect(appDirPath({ protocol: "http:", host: "x", pathname: "/" })).toBe("");
  });
});

describe("isTunnelMode (T4.3 + Faz 5.1 düzeltmesi)", () => {
  it("yalnız /containers/:cid/ui öneki tüneldir", () => {
    expect(isTunnelMode({ protocol: "http:", host: "f", pathname: "/containers/c-1/ui/" })).toBe(true);
    expect(isTunnelMode({ protocol: "http:", host: "f", pathname: "/containers/c-1/ui" })).toBe(true);
    expect(isTunnelMode({ protocol: "http:", host: "f", pathname: "/containers/c-1/ui/dashboard" })).toBe(true);
  });

  it("Faz 5.1 regresyon: normal SPA route'lari tünel DEGILDIR", () => {
    expect(isTunnelMode({ protocol: "http:", host: "f", pathname: "/" })).toBe(false);
    expect(isTunnelMode({ protocol: "http:", host: "f", pathname: "/dashboard" })).toBe(false);
    expect(isTunnelMode({ protocol: "http:", host: "f", pathname: "/login" })).toBe(false);
    expect(isTunnelMode({ protocol: "http:", host: "f", pathname: "/change-password" })).toBe(false);
    expect(isTunnelMode({ protocol: "http:", host: "f", pathname: "/containers" })).toBe(false);
    expect(isTunnelMode({ protocol: "http:", host: "f", pathname: "/containers/c-1" })).toBe(false);
  });
});

describe("hasContainerSessionCookie (T4.3)", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("container_session varsa true", () => {
    vi.spyOn(document, "cookie", "get").mockReturnValue("a=1; container_session=xyz");
    expect(hasContainerSessionCookie()).toBe(true);
  });

  it("yoksa false", () => {
    vi.spyOn(document, "cookie", "get").mockReturnValue("auth-token=abc");
    expect(hasContainerSessionCookie()).toBe(false);
  });
});

describe("file:// (Electron LCD — K4.3)", () => {
  it("host yoksa ws://localhost:5001 fallback", () => {
    expect(wsUrl({ protocol: "file:", host: "", pathname: "/app/index.html" })).toBe("ws://localhost:5001/ws/telemetry");
  });

  it("host yoksa api /api (eski davranış)", () => {
    expect(apiBaseUrl({ protocol: "file:", host: "", pathname: "/app/index.html" })).toBe("/api");
  });

  it("file:// tünel sayılmaz", () => {
    expect(isTunnelMode({ protocol: "file:", host: "", pathname: "/app/index.html" })).toBe(false);
  });
});

describe("hashRoute (Faz 5.1 — hash router uyumu)", () => {
  it("yol hash formuna çevrilir", () => {
    expect(hashRoute("/change-password")).toBe("#/change-password");
    expect(hashRoute("/login")).toBe("#/login");
    expect(hashRoute("/")).toBe("#/");
  });

  it("başına / eklenir", () => {
    expect(hashRoute("dashboard")).toBe("#/dashboard");
  });

  it("zaten hash'liyse olduğu gibi", () => {
    expect(hashRoute("#/dashboard")).toBe("#/dashboard");
  });
});

describe("postLoginRoute (Faz 5.1 — giriş sonrası rota)", () => {
  it("must-change kullanıcı → /change-password", () => {
    expect(postLoginRoute({ mustChangePassword: true })).toBe("/change-password");
  });

  it("normal kullanıcı → /dashboard", () => {
    expect(postLoginRoute({ mustChangePassword: false })).toBe("/dashboard");
    expect(postLoginRoute(null)).toBe("/dashboard");
    expect(postLoginRoute(undefined)).toBe("/dashboard");
  });
});
