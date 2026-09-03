import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  isMustChangeError,
  mustChangeRedirectNeeded,
  navigateToAppRoute,
  writeUserToAuthStorage,
} from "./api-client";
import type { User } from "../features/auth/types/user";

/**
 * Faz 5.1 ek — 403 "Sifre degisimi gerekli" döngüsü sözleşmesi:
 *
 * Kök neden (canlı, 2026-08-26): refresh token ölünce interceptor sessizce
 * `guest` olarak yeniden giriş yapıyordu (`reLoginAsGuest`) — guest'in
 * `must_change_password=t` olmasıyla HER API çağrısı 403 dönüyor, uygulama
 * dashboard'da kalıp "sessiz 403 yağmuru" üretiyordu (kullanıcı "veri yok"
 * görüyordu).
 *
 * Sözleşme:
 * - `isMustChangeError` yalnızca 403 + `{error: "Sifre degisimi gerekli"}`'yi tanır.
 * - `mustChangeRedirectNeeded` must-change 403'ünde `/change-password`'a
 *   yönlendirir; ama `/login` ve `/change-password` sayfalarında döngü YAPMAZ;
 *   tünel modunda da yönlendirme yapılmaz (iframe kapanır).
 * - `writeUserToAuthStorage` login/refresh/guest-fallback'tan gelen güncel
 *   `user`'ı kalıcı store'a yazar (bayat `user` → guard çalışmıyordu).
 */

const mustChangeError = (data?: unknown) => ({
  response: {
    status: 403,
    data: data ?? { error: "Sifre degisimi gerekli" },
  },
});

const user = (overrides?: Partial<User>): User => ({
  id: "u-1",
  username: "guest",
  role: "guest",
  name: "Guest",
  mustChangePassword: true,
  ...overrides,
});

describe("isMustChangeError (Faz 5.1 ek)", () => {
  it("403 + dogru hata mesajini tanir", () => {
    expect(isMustChangeError(mustChangeError())).toBe(true);
  });

  it("403 ama farkli hata → false", () => {
    expect(
      isMustChangeError(mustChangeError({ error: "Bu islem icin yetkiniz yok" })),
    ).toBe(false);
  });

  it("401 → false; response'suz hata → false", () => {
    expect(isMustChangeError({ response: { status: 401, data: {} } })).toBe(false);
    expect(isMustChangeError(new Error("ağ"))).toBe(false);
    expect(isMustChangeError(null)).toBe(false);
  });
});

describe("mustChangeRedirectNeeded (Faz 5.1 ek)", () => {
  it("dashboard gibi sayfalarda must-change 403 → yonlendirme gerekli", () => {
    expect(mustChangeRedirectNeeded("/dashboard", mustChangeError())).toBe(true);
  });

  it("/change-password ve /login sayfalarinda dongu yapmaz", () => {
    expect(mustChangeRedirectNeeded("/change-password", mustChangeError())).toBe(false);
    expect(mustChangeRedirectNeeded("/login", mustChangeError())).toBe(false);
  });

  it("tunel modunda yonlendirme yapilmaz", () => {
    expect(
      mustChangeRedirectNeeded("/containers/c-1/ui/dashboard", mustChangeError()),
    ).toBe(false);
  });

  it("must-change olmayan hatalarda yonlendirme yapilmaz", () => {
    expect(mustChangeRedirectNeeded("/dashboard", { response: { status: 401 } })).toBe(false);
    expect(mustChangeRedirectNeeded("/dashboard", mustChangeError({ error: "x" }))).toBe(false);
  });
});

describe("navigateToAppRoute (Faz 5.1 ek — hash router)", () => {
  it("yönlendirme pathname'e değil HASH'e yazılır", () => {
    // hash router (T4.2) sözleşmesi: tam sayfa yönlendirmeleri "#/x" olarak
    // hash'e gitmelidir; pathname'e yazılırsa sayfa boş hash'le "/" rotasına
    // düşer (canlı döngü: URL /change-password ama içerik dashboard).
    const fakeLocation = { hash: "" };
    Object.defineProperty(window, "location", {
      configurable: true,
      writable: true,
      value: fakeLocation,
    });
    try {
      navigateToAppRoute("/change-password");
      expect(fakeLocation.hash).toBe("#/change-password");
    } finally {
      delete (window as unknown as Record<string, unknown>).location;
    }
  });
});

describe("writeUserToAuthStorage (Faz 5.1 ek)", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("auth-storage state'ine kullaniciyi ve rol bayraklarini yazar", () => {
    localStorage.setItem(
      "auth-storage",
      JSON.stringify({ state: { user: null, isAuthenticated: false } }),
    );
    writeUserToAuthStorage(user({ role: "admin" }));
    const parsed = JSON.parse(localStorage.getItem("auth-storage")!);
    expect(parsed.state.user.username).toBe("guest");
    expect(parsed.state.user.mustChangePassword).toBe(true);
    expect(parsed.state.isAuthenticated).toBe(true);
    expect(parsed.state.isAdmin).toBe(true);
    expect(parsed.state.isGuest).toBe(false);
  });

  it("auth-storage yoksa no-op (sessiz)", () => {
    writeUserToAuthStorage(user());
    expect(localStorage.getItem("auth-storage")).toBeNull();
  });

  it("bozuk auth-storage temizlenir", () => {
    localStorage.setItem("auth-storage", "{bozuk");
    writeUserToAuthStorage(user());
    expect(localStorage.getItem("auth-storage")).toBeNull();
  });
});
