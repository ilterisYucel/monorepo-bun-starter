import { describe, it, expect, vi, afterEach } from "vitest";
import { BunPasswordHasher } from "./bun-password-hasher";

/**
 * BunPasswordHasher sözleşmesi (2026-08-30 — T1.5):
 *
 * Vitest node ortamında `Bun` global'i yoktur; Bun.password stub'lanarak
 * DELEGASYON kontratı sabitlenir (gerçek kripto Bun runtime'ında aynıdır):
 * - hash → Bun.password.hash(password) sonucunu aynen döner.
 * - verify → Bun.password.verify sonucunu döner.
 * - verify THROW ederse hasher FALSE döner (kontrat Promise<boolean> —
 *   login akışı 500'e düşmez; bayat hash formatlı kullanıcı 401 alır).
 */

function stubBun(overrides: {
  hash?: (p: string) => Promise<string>;
  verify?: (p: string, h: string) => Promise<boolean>;
} = {}) {
  const hash = vi.fn(overrides.hash ?? (() => Promise.resolve("mock-hash")));
  const verify = vi.fn(overrides.verify ?? (() => Promise.resolve(true)));
  vi.stubGlobal("Bun", { password: { hash, verify } });
  return { hash, verify };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("BunPasswordHasher @nis2-security", () => {
  it("hash Bun.password.hash'e delege eder", async () => {
    const { hash } = stubBun();
    const hasher = new BunPasswordHasher();
    expect(await hasher.hash("parola")).toBe("mock-hash");
    expect(hash).toHaveBeenCalledWith("parola");
  });

  it("verify Bun.password.verify'e delege eder — true sonucu aynen döner", async () => {
    const { verify } = stubBun();
    const hasher = new BunPasswordHasher();
    expect(await hasher.verify("p", "h")).toBe(true);
    expect(verify).toHaveBeenCalledWith("p", "h");
  });

  it("verify false sonucu false döner", async () => {
    stubBun({ verify: () => Promise.resolve(false) });
    const hasher = new BunPasswordHasher();
    expect(await hasher.verify("yanlis", "h")).toBe(false);
  });

  it("verify THROW ederse false döner (kontrat — login 500 koruması)", async () => {
    stubBun({
      verify: () => Promise.reject(new Error("UnsupportedAlgorithm")),
    });
    const hasher = new BunPasswordHasher();
    expect(await hasher.verify("p", "bayat-hash")).toBe(false);
  });
});
