import { describe, it, expect, vi, beforeEach } from "vitest";
import { useAuthStore } from "./AuthStore";
import { apiClient } from "../../../lib/api-client";

vi.mock("../../../lib/api-client", () => ({
  apiClient: { post: vi.fn() },
}));

/**
 * AuthStore sözleşmesi (AUTH-REFRESH 2026-09-23 — UC-3):
 * - login başarılı → oturum + token'lar localStorage'a.
 * - logout DEĞİŞMEZ: backend + yerel temizlik.
 * - `clearSession`: backend çağrısı YAPMAZ; persist (`supadmin-auth-storage`)
 *   dahil tam temizler — interceptor'ın refresh-başarısızlık yolu.
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

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  useAuthStore.setState({ user: null, isAuthenticated: false });
});

describe("superadmin AuthStore (AUTH-REFRESH — UC-3)", () => {
  it("login başarılı → oturum + token'lar", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({
      data: {
        accessToken: "at",
        refreshToken: "rt",
        user: ADMIN_USER,
      },
    });
    await useAuthStore.getState().login("admin", "x");
    const s = useAuthStore.getState();
    expect(s.isAuthenticated).toBe(true);
    expect(s.user?.id).toBe("u-1");
    expect(localStorage.getItem("auth-token")).toBe("at");
    expect(localStorage.getItem("auth-refresh-token")).toBe("rt");
  });

  it("logout backend'i çağırır ve yerel temizlik yapar (davranış değişmez)", async () => {
    vi.mocked(apiClient.post)
      .mockResolvedValueOnce({
        data: { accessToken: "at", refreshToken: "rt", user: ADMIN_USER },
      })
      .mockResolvedValueOnce({ data: { success: true } });
    await useAuthStore.getState().login("admin", "x");
    await useAuthStore.getState().logout();

    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(localStorage.getItem("auth-token")).toBeNull();
    expect(localStorage.getItem("auth-refresh-token")).toBeNull();
    expect(apiClient.post).toHaveBeenLastCalledWith("/auth/logout");
  });

  it("clearSession persist dahil tam temizler; backend çağrısı YAPMAZ", () => {
    useAuthStore.setState({ user: ADMIN_USER, isAuthenticated: true });

    useAuthStore.getState().clearSession();

    const s = useAuthStore.getState();
    expect(s.user).toBeNull();
    expect(s.isAuthenticated).toBe(false);
    expect(apiClient.post).not.toHaveBeenCalled();

    const persisted = JSON.parse(
      localStorage.getItem("supadmin-auth-storage") ?? "{}",
    ) as { state?: { user?: unknown; isAuthenticated?: boolean } };
    expect(persisted.state?.user).toBeNull();
    expect(persisted.state?.isAuthenticated).toBe(false);
  });
});
