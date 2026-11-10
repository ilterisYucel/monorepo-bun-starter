import { describe, it, expect } from "vitest";
import { generateSecret, signAgentToken, verifyAgentToken } from "./hmac-signer";

const PAYLOAD = {
  sessionId: "s-1",
  sub: "system",
  username: "system",
  role: "admin" as const,
};

describe("HMAC signer", () => {
  it("sign → verify roundtrip", async () => {
    const secret = generateSecret();
    const token = await signAgentToken(secret, PAYLOAD, 60);
    await expect(verifyAgentToken(secret, token)).resolves.toMatchObject({
      sessionId: "s-1",
      role: "admin",
    });
  });

  it("yanlış secret / tahrif edilmiş token reddedilir", async () => {
    const token = await signAgentToken(generateSecret(), PAYLOAD, 60);
    await expect(verifyAgentToken(generateSecret(), token)).resolves.toBeUndefined();
    await expect(
      verifyAgentToken(generateSecret(), `${token}x`),
    ).resolves.toBeUndefined();
  });

  it("süresi geçmiş token reddedilir", async () => {
    const secret = generateSecret();
    const token = await signAgentToken(secret, PAYLOAD, -1);
    await expect(verifyAgentToken(secret, token)).resolves.toBeUndefined();
  });

  it("generateSecret 32 byte hex üretir", () => {
    const secret = generateSecret();
    expect(secret).toMatch(/^[0-9a-f]{64}$/);
    expect(generateSecret()).not.toBe(secret);
  });
});
