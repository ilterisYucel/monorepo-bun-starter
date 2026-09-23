import { describe, it, expect, vi, beforeEach } from "vitest";
import { useAuthStore } from "./AuthStore";
import { apiClient } from "../../../lib/api-client";

vi.mock("../../../lib/api-client", () => ({
  apiClient: { post: vi.fn() },
}));

/**
 * AuthStore sözleşmesi (AUTH-REFRESH 2026-09-23 — UC-2):
 * - login başarılı → oturum + rol bayrakları (isAdmin/isTeknik/isBoss/
 *   isGuest/isDeveloper).
 * - login mfaRequired → pendingMfaToken saklanır, oturum AÇILMAZ.
 * - Auto-guest YOKTUR (K1): `loginAsGuest` kaldırıldı, logout sonrası guest
 *   girişi denenmez — logout → login ekranı.
 * - `clearSession`: backend çağrısı ve auto-guest YAPMAZ; persist dahil tam
 *   temizler (user null + tüm bayraklar false).
 */

const ADMIN_USER = {
  id: "u-1",
  username: "admin",
  role: "admin" as const,
  name: "Admin",
  mustChangePassword: false,
  createdAt: "",
  updatedAt: "",
};

function authResponse(
  user = ADMIN_USER,
  overrides: Record<string, unknown> = {},
) {
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

describe("AuthStore (AUTH-REFRESH — 2026-09-23)", () => {
  it("login başarılı → oturum + rol bayrakları", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({
      data: authResponse(),
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
      data: { mfaRequired: true, mfaToken: "mt", user: ADMIN_USER },
    });
    const result = await useAuthStore.getState().login("admin", "x");
    expect(result).toBe(true);
    const s = useAuthStore.getState();
    expect(s.isAuthenticated).toBe(false);
    expect(s.pendingMfaToken).toBe("mt");
  });

  it("logout backend'i çağırır ve temizler — auto-guest YOKTUR (AK-2.1)", async () => {
    vi.mocked(apiClient.post)
      .mockResolvedValueOnce({ data: authResponse() })
      .mockResolvedValueOnce({ data: { success: true } });
    await useAuthStore.getState().login("admin", "x");
    expect(useAuthStore.getState().isAdmin).toBe(true);

    await useAuthStore.getState().logout();

    const s = useAuthStore.getState();
    expect(s.isAuthenticated).toBe(false);
    expect(s.isGuest).toBe(false);
    expect(s.user).toBeNull();
    expect(localStorage.getItem("auth-token")).toBeNull();
    expect(localStorage.getItem("auth-refresh-token")).toBeNull();
    // yalnızca login + logout çağrısı — guest girişi denemesi YOK
    expect(apiClient.post).toHaveBeenCalledTimes(2);
    expect(apiClient.post).toHaveBeenLastCalledWith("/auth/logout");
  });

  it("logout sunucu hatasında bile yerel state'i temizler", async () => {
    vi.mocked(apiClient.post)
      .mockResolvedValueOnce({ data: authResponse() })
      .mockRejectedValueOnce(new Error("down"));
    await useAuthStore.getState().login("admin", "x");
    await useAuthStore.getState().logout();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(localStorage.getItem("auth-token")).toBeNull();
  });

  it("clearSession persist dahil tam temizler; backend çağrısı YAPMAZ (AK-2.2)", () => {
    useAuthStore.setState({
      user: ADMIN_USER,
      isAuthenticated: true,
      isAdmin: true,
      isTeknik: false,
      isBoss: false,
      isGuest: false,
      isDeveloper: false,
      fieldIds: ["f-1"],
      mfaRequiredRoles: ["admin"],
      pendingMfaToken: "mt",
    });

    useAuthStore.getState().clearSession();

    const s = useAuthStore.getState();
    expect(s.user).toBeNull();
    expect(s.isAuthenticated).toBe(false);
    expect(s.isAdmin).toBe(false);
    expect(s.isTeknik).toBe(false);
    expect(s.isBoss).toBe(false);
    expect(s.isGuest).toBe(false);
    expect(s.isDeveloper).toBe(false);
    expect(s.fieldIds).toEqual([]);
    expect(s.mfaRequiredRoles).toEqual([]);
    expect(s.pendingMfaToken).toBeNull();
    expect(apiClient.post).not.toHaveBeenCalled();

    const persisted = JSON.parse(
      localStorage.getItem("field-auth-storage") ?? "{}",
    ) as { state?: { user?: unknown; isAuthenticated?: boolean } };
    expect(persisted.state?.user).toBeNull();
    expect(persisted.state?.isAuthenticated).toBe(false);
  });

  it("developer rolü isDeveloper bayrağını set eder", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({
      data: authResponse({ ...ADMIN_USER, role: "developer" }),
    });
    await useAuthStore.getState().login("dev", "x");
    const s = useAuthStore.getState();
    expect(s.isDeveloper).toBe(true);
    expect(s.isGuest).toBe(false);
  });
});
