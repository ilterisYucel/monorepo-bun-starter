import { describe, it, expect } from "vitest";
import { JoseTokenSigner } from "./jose-token-signer";

/**
 * JoseTokenSigner sözleşmesi — ws-tunnel ITokenSigner implementasyonu:
 * - sign → verify round-trip (payload korunur)
 * - farklı secret ile doğrulama → undefined (tahrif tespiti)
 * - bozuk token → undefined (throw yok — sorgu)
 * - `type:"container-session"` etiketi JWT içindedir (access token'la karışmaz)
 */
describe("JoseTokenSigner", () => {
  const payload = {
    sessionId: "s-1",
    sub: "u-1",
    username: "operator",
    role: "guest" as const,
  };

  it("sign → verify round-trip: payload korunur", async () => {
    const signer = new JoseTokenSigner("secret-0123456789abcdef");
    const token = await signer.sign(payload, 3600);
    expect(await signer.verify(token)).toEqual(payload);
  });

  it("farklı secret ile doğrulanan token reddedilir", async () => {
    const signer = new JoseTokenSigner("secret-0123456789abcdef");
    const forged = await new JoseTokenSigner("baska-secret-0123456789ab").sign(
      payload,
      3600,
    );
    expect(await signer.verify(forged)).toBeUndefined();
  });

  it("bozuk token undefined döner (throw yok)", async () => {
    const signer = new JoseTokenSigner("secret-0123456789abcdef");
    expect(await signer.verify("garbage")).toBeUndefined();
  });

  it("süresi dolmuş token reddedilir", async () => {
    const signer = new JoseTokenSigner("secret-0123456789abcdef");
    const expired = await new JoseTokenSigner("secret-0123456789abcdef").sign(
      payload,
      -1,
    );
    expect(await signer.verify(expired)).toBeUndefined();
  });
});
