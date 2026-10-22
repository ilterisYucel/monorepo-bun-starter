import type { User } from "@gd-monorepo/shared-types";
import type { ITokenSigner } from "@gd-monorepo/ws-tunnel";
import { sessionCookieValue } from "@gd-monorepo/ws-tunnel";
import { toWebUser } from "./session-user-map";

/**
 * Container tier oturum doğrulayıcı arayüzü — rbac ve telemetry WS kullanır.
 *
 * Sözleşme:
 * - `authenticate(cookieHeader)`: cookie'den `container_session` token'ını çözer.
 * - `authenticateToken(token)`: WS query token'ı gibi cookie'siz yollar için.
 * - Geçersiz/süresi geçmiş/yanlış etiketli token → `undefined` (fail-closed).
 */
export interface ISessionAuthenticator {
  authenticate(cookieHeader: string | undefined): Promise<User | undefined>;
  authenticateToken(token: string): Promise<User | undefined>;
}

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
