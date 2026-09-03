import { describe, it, expect } from "vitest";
import { sha256Hex } from "./service-token";

describe("sha256Hex (Faz 1)", () => {
  it("bilinen vektörü üretir (RFC 6234: abc)", () => {
    expect(sha256Hex("abc")).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
  });

  it("deterministik ve 64 hex karakterdir", () => {
    const a = sha256Hex("service-token-1");
    expect(a).toBe(sha256Hex("service-token-1"));
    expect(a).toMatch(/^[0-9a-f]{64}$/);
  });

  it("farklı girdiler farklı özet üretir", () => {
    expect(sha256Hex("a")).not.toBe(sha256Hex("b"));
  });
});
