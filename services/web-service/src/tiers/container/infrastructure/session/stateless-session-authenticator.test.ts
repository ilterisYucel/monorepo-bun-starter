import { describe, it, expect, vi } from "vitest";
import type { ITokenSigner, SessionTokenPayload } from "@gd-monorepo/ws-tunnel";
import { StatelessSessionAuthenticator } from "./stateless-session-authenticator";

/**
 * StatelessSessionAuthenticator sözleşmesi (SPEC KONTEYNER-AGENT-KAYIT K2/K3):
 * - Cookie'den `container_session` değeri çözülür; token signer ile doğrulanır.
 * - Yerel oturum kaydı ARANMAZ (agent oturumu uygulamada yaşamaz) — aynı token
 *   tekrar tekrar doğrulanabilir.
 * - Geçerli payload → web `User` eşlemesi (id=sub, name=username, role).
 * - Geçersiz/expired/etiket uyuşmazlığı → undefined (fail-closed).
 */

const PAYLOAD: SessionTokenPayload = {
  sessionId: "s-1",
  sub: "u-1",
  username: "operator",
  role: "teknik",
};

function makeSigner(
  impl: (token: string) => Promise<SessionTokenPayload | undefined> = async (
    token,
  ) => (token === "valid-token" ? PAYLOAD : undefined),
): ITokenSigner {
  return {
    sign: vi.fn(async () => "signed"),
    verify: vi.fn(impl),
  };
}

describe("StatelessSessionAuthenticator (container tier)", () => {
  it("cookie'den token'ı çözer ve payload'ı User'a eşler", async () => {
    const signer = makeSigner();
    const auth = new StatelessSessionAuthenticator(signer);

    const user = await auth.authenticate(
      "a=1; container_session=valid-token; b=2",
    );

    expect(signer.verify).toHaveBeenCalledWith("valid-token");
    expect(user).toMatchObject({
      id: "u-1",
      username: "operator",
      name: "operator",
      role: "teknik",
      fieldIds: [],
      mustChangePassword: false,
    });
  });

  it("stateful değildir — aynı token yerel kayıt olmadan tekrar doğrulanır", async () => {
    const signer = makeSigner();
    const auth = new StatelessSessionAuthenticator(signer);

    const first = await auth.authenticateToken("valid-token");
    const second = await auth.authenticateToken("valid-token");

    expect(first).toBeDefined();
    expect(second).toEqual(first);
    expect(signer.verify).toHaveBeenCalledTimes(2);
  });

  it("cookie yok → undefined (verify çağrılmaz)", async () => {
    const signer = makeSigner();
    const auth = new StatelessSessionAuthenticator(signer);

    await expect(auth.authenticate(undefined)).resolves.toBeUndefined();
    await expect(auth.authenticate("a=1")).resolves.toBeUndefined();
    expect(signer.verify).not.toHaveBeenCalled();
  });

  it("geçersiz token → undefined (fail-closed)", async () => {
    const auth = new StatelessSessionAuthenticator(makeSigner());
    await expect(auth.authenticateToken("bozuk")).resolves.toBeUndefined();
    await expect(
      auth.authenticate("container_session=bozuk"),
    ).resolves.toBeUndefined();
  });
});
