import { describe, it, expect } from "vitest";
import { EnvPeerTokenStore } from "./env-peer-token-store";

describe("EnvPeerTokenStore", () => {
  it("AK-5.1: geçerli token true, geçersiz false", async () => {
    const store = new EnvPeerTokenStore("secret-token");
    expect(await store.authenticate("secret-token")).toBe(true);
    expect(await store.authenticate("wrong")).toBe(false);
    expect(await store.authenticate("")).toBe(false);
  });

  it("boş token ile kurulum reddedilir (fail-fast)", () => {
    expect(() => new EnvPeerTokenStore("   ")).toThrow();
  });
});
