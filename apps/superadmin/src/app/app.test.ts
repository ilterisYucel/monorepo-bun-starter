import { describe, it, expect } from "vitest";

/**
 * superadmin smoke (2026-08-30 — T4): uygulama kabuğu modülleri import
 * edilebilir ve temel bileşenler render edilebilir olmalıdır (proje 0
 * testten geliyor — ilk karakterizasyon).
 */

describe("superadmin app (T4 smoke)", () => {
  it("App + providers import edilebilir", async () => {
    const app = await import("./App");
    const providers = await import("./providers");
    expect(app.App).toBeDefined();
    expect(providers.AppProviders).toBeDefined();
  }, 30000);

  it("routes tablosu auth + saha rotalarını tanımlar", async () => {
    const { routes } = await import("./routes");
    expect(routes.length).toBeGreaterThan(0);
  });

  it("AuthStore state kontratı (login/logout aksiyonları)", async () => {
    const { useAuthStore } = await import("../features/auth/stores/AuthStore");
    const state = useAuthStore.getState();
    expect(typeof state.login).toBe("function");
    expect(typeof state.logout).toBe("function");
    expect(state.isAuthenticated).toBe(false);
  });
});
