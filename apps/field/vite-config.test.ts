import { describe, it, expect, vi, afterEach } from "vitest";

/**
 * field vite.config — tünel base sözleşmesi (ws-tunnel paketleme kontratı):
 * - VITE_TUNNEL_BASE set → base = tünel kökü (mutlak asset yolları).
 *   Prod Dockerfile bunu /fields/${VITE_FIELD_ID}/ui/ olarak GÖMER; boss
 *   tünelinde base "/" kalırsa asset'ler boss origin'ine gider ve nginx
 *   index.html (text/html) döndürür → beyaz ekran + MIME hatası.
 * - set değil (boş) → base "/" (doğrudan erişim modu — asset'ler kökten).
 */
describe("field vite.config — tünel base", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("VITE_TUNNEL_BASE set → base tünel kökü", async () => {
    vi.stubEnv("VITE_TUNNEL_BASE", "/fields/f-1/ui/");
    const mod = await import("./vite.config");
    expect(mod.default.base).toBe("/fields/f-1/ui/");
  });

  it("VITE_TUNNEL_BASE boş → base '/'", async () => {
    vi.stubEnv("VITE_TUNNEL_BASE", "");
    const mod = await import("./vite.config");
    expect(mod.default.base).toBe("/");
  });
});
