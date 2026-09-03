import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { hydrateSessionAuth } from "./session-auth";
import { useAuthStore } from "./stores/AuthStore";

/**
 * T4.4 — session-auth sözleşmesi (tasarım §5.4):
 * - Tünel modu değilse no-op (false) — normal login akışı korunur.
 * - Tünel modunda `GET /api/auth/session` → kullanıcı hydrate edilir (true);
 *   login ekranı görünmez (K4.2). HttpOnly cookie isteği otomatik taşır —
 *   tünel tespiti pathname'den (document.cookie güvenilmez).
 * - `tunnel:false` veya 401 → hydrate YOK (false).
 * - localStorage'a YAZILMAZ (kırılganlık #1) — tünel modunda persist no-op.
 */

vi.mock("../../lib/api-base", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../lib/api-base")>();
  return {
    ...actual,
    isTunnelMode: vi.fn(() => false),
    apiBaseUrl: () => "/api",
  };
});

const mockedTunnel = vi.mocked(
  (await import("../../lib/api-base")).isTunnelMode,
);

const user = {
  id: "u-1",
  username: "operator",
  role: "admin" as const,
  name: "Operator",
  fieldIds: [],
  mustChangePassword: false,
  createdAt: "",
  updatedAt: "",
};

describe("hydrateSessionAuth (T4.4)", () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: null,
      isAuthenticated: false,
      isAdmin: false,
      isTeknik: false,
      isGuest: false,
    });
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("tünel değilse false — fetch yapılmaz", async () => {
    mockedTunnel.mockReturnValue(false);
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    expect(await hydrateSessionAuth()).toBe(false);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("tünel + geçerli oturum → kullanıcı hydrate edilir", async () => {
    mockedTunnel.mockReturnValue(true);
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({ user, tunnel: true }),
    } as Response);

    expect(await hydrateSessionAuth()).toBe(true);
    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.user?.username).toBe("operator");
  });

  it("401 → false, hydrate yok", async () => {
    mockedTunnel.mockReturnValue(true);
    vi.spyOn(globalThis, "fetch").mockResolvedValue({ ok: false } as Response);
    expect(await hydrateSessionAuth()).toBe(false);
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });

  it("tunnel:false → false (alan tarafı oturum değil)", async () => {
    mockedTunnel.mockReturnValue(true);
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({ user, tunnel: false }),
    } as Response);
    expect(await hydrateSessionAuth()).toBe(false);
  });

  it("fetch hatası → false (çökme yok)", async () => {
    mockedTunnel.mockReturnValue(true);
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("net"));
    expect(await hydrateSessionAuth()).toBe(false);
  });
});

describe("tünel modunda persist izolasyonu (T4.4 — kırılganlık #1)", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("tünel modunda oluşturulan AuthStore auth-storage YAZMAZ", async () => {
    // Mağaza modülü tünel modunda (pathname subpath'te) İMPORT edilir —
    // persist storage no-op olur; field'ın localStorage anahtarları ezilmez.
    vi.resetModules();
    mockedTunnel.mockReturnValue(true);
    const { useAuthStore: tunnelStore } = await import("./stores/AuthStore");
    tunnelStore.setState({
      user: null,
      isAuthenticated: false,
      isAdmin: false,
      isTeknik: false,
      isGuest: false,
    });
    localStorage.clear();
    tunnelStore.getState().applySession(user);
    expect(localStorage.getItem("auth-storage")).toBeNull();
    expect(localStorage.getItem("auth-token")).toBeNull();
  });

  it("normal modda persist çalışır (geriye uyumluluk)", async () => {
    vi.resetModules();
    mockedTunnel.mockReturnValue(false);
    const { useAuthStore: normalStore } = await import("./stores/AuthStore");
    normalStore.getState().applySession(user);
    expect(localStorage.getItem("auth-storage")).not.toBeNull();
  });
});
