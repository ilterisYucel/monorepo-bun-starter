import { describe, it, expect, vi, beforeEach } from "vitest";
import { useAuthStore } from "./AuthStore";
import { apiClient } from "../../../lib/api-client";

vi.mock("../../../lib/api-client", () => ({
  apiClient: { post: vi.fn() },
}));

/**
 * AuthStore sözleşmesi (2026-08-30 — otomatik guest):
 * - login başarılı → oturum + rol bayrakları (isAdmin/isTeknik/isBoss/
 *   isGuest/isDeveloper).
 * - login mfaRequired → pendingMfaToken saklanır, oturum AÇILMAZ.
 * - loginAsGuest: token yokken/çıkışta varsayılan guest hesabıyla giriş;
 *   başarısızlıkta unauthenticated kalır (backend yok — kademeli bozulma).
 * - logout: temizler + guest'e OTOMATİK yeniden giriş (manuel guest yok).
 */

const GUEST_USER = {
  id: "u-guest",
  username: "guest",
  role: "guest" as const,
  name: "Guest",
  mustChangePassword: false,
  createdAt: "",
  updatedAt: "",
};

function authResponse(user = GUEST_USER, overrides: Record<string, unknown> = {}) {
  return {
    accessToken: "at",
    refreshToken: "rt",
    user,
    mfaRequiredRoles: [],
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  useAuthStore.setState({
    user: null,
    isAuthenticated: false,
    isAdmin: false,
    isTeknik: false,
    isBoss: false,
    isGuest: false,
    isDeveloper: false,
    fieldIds: [],
    mfaRequiredRoles: [],
    pendingMfaToken: null,
  });
});

describe("AuthStore (otomatik guest — 2026-08-30)", () => {
  it("login başarılı → oturum + rol bayrakları", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({
      data: authResponse({ ...GUEST_USER, role: "admin" }),
    });
    const result = await useAuthStore.getState().login("admin", "x");
    expect(result).toBe(false);
    const s = useAuthStore.getState();
    expect(s.isAuthenticated).toBe(true);
    expect(s.isAdmin).toBe(true);
    expect(s.isTeknik).toBe(false);
    expect(localStorage.getItem("auth-token")).toBe("at");
  });

  it("login mfaRequired → pendingMfaToken, oturum yok", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({
      data: { mfaRequired: true, mfaToken: "mt", user: GUEST_USER },
    });
    const result = await useAuthStore.getState().login("guest", "x");
    expect(result).toBe(true);
    const s = useAuthStore.getState();
    expect(s.isAuthenticated).toBe(false);
    expect(s.pendingMfaToken).toBe("mt");
  });

  it("loginAsGuest başarılı → guest oturumu", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: authResponse() });
    await useAuthStore.getState().loginAsGuest();
    const s = useAuthStore.getState();
    expect(s.isAuthenticated).toBe(true);
    expect(s.isGuest).toBe(true);
    expect(s.isAdmin).toBe(false);
  });

  it("loginAsGuest başarısız → unauthenticated kalır", async () => {
    vi.mocked(apiClient.post).mockRejectedValue(new Error("down"));
    await useAuthStore.getState().loginAsGuest();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });

  it("logout temizler ve guest'e otomatik yeniden giriş yapar", async () => {
    vi.mocked(apiClient.post)
      .mockResolvedValueOnce({ data: authResponse({ ...GUEST_USER, role: "admin" }) })
      .mockResolvedValueOnce({ data: authResponse() })
      .mockResolvedValueOnce({ data: authResponse() });
    await useAuthStore.getState().login("admin", "x");
    expect(useAuthStore.getState().isAdmin).toBe(true);

    await useAuthStore.getState().logout();

    const s = useAuthStore.getState();
    expect(s.isAdmin).toBe(false);
    expect(s.isGuest).toBe(true);
    expect(s.isAuthenticated).toBe(true);
    expect(localStorage.getItem("auth-token")).toBe("at");
  });

  it("developer rolü isDeveloper bayrağını set eder", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({
      data: authResponse({ ...GUEST_USER, role: "developer" }),
    });
    await useAuthStore.getState().login("dev", "x");
    const s = useAuthStore.getState();
    expect(s.isDeveloper).toBe(true);
    expect(s.isGuest).toBe(false);
  });
});
