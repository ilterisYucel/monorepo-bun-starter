import type { ITokenSigner } from "@gd-monorepo/ws-tunnel";
import { sessionCookieValue } from "@gd-monorepo/ws-tunnel";
import { toWebUser } from "./session-user-map";
import type { ISessionAuthenticator } from "../../../../domain/ports/session";

/**
 * StatelessSessionAuthenticator — agent imzalı oturum JWT'sini doğrular.
 *
 * SPEC KONTEYNER-AGENT-KAYIT K2/K3: Üretimde konteyner peer'ı
 * `ws-tunnel-agent`'tır; oturum token'ını agent `HUB_SECRET` ile imzalar.
 * Uygulama bu token'ı **yerel oturum kaydı olmadan** doğrular (agent'ın
 * oturumu uygulamada yaşamaz). Bu yüzden `ClientSessionStore` KULLANILMAZ.
 *
 * - Paylaşılan secret: agent `HUB_SECRET` = uygulama `JWT_SECRET`.
 * - TTL: token `exp` (imza doğrulaması içinde).
 * - Revocation: hub tarafında — iptal edilen oturum hub'dan geçemez.
 * - Kullanıcı eşlemesi `toWebUser` ile yapılır (fieldIds boş, geçici oturum).
 */
export class StatelessSessionAuthenticator implements ISessionAuthenticator {
  constructor(
    private readonly tokens: ITokenSigner,
    private readonly cookieName: string = "container_session",
  ) {}

  async authenticate(cookieHeader: string | undefined): Promise<User | undefined> {
    const token = sessionCookieValue(cookieHeader, this.cookieName);
    if (token === undefined) return undefined;
    return this.authenticateToken(token);
  }

  async authenticateToken(token: string): Promise<User | undefined> {
    const payload = await this.tokens.verify(token);
    if (payload === undefined) return undefined;
    return toWebUser({
      id: payload.sub,
      username: payload.username,
      role: payload.role,
    });
  }
}
