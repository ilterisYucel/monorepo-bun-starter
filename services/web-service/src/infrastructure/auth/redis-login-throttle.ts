import type { RedisConnection } from "@gd-monorepo/core";
import type {
  ILoginThrottle,
  LoginThrottleConfig,
} from "../../domain/services/ILoginThrottle";

const FAIL_KEY = (username: string) => `login:fail:${username}`;
const LOCK_KEY = (username: string) => `login:lock:${username}`;

/**
 * RedisLoginThrottle — Faz 6 T6.6: giriş denemesi sayacı + hesap kilidi.
 *
 * - Başarısız girişte sayaç INCR + pencere EXPIRE (ilk artışta).
 * - Sayaç `maxFailures`'a ulaşınca kilit anahtarı `lockSeconds` TTL ile
 *   kurulur (kilit süresi pencereyi yeniler).
 * - Başarılı girişte sayaç + kilit DEL.
 * - Redis hatası fırlatılır — fail-open YOK: çağıran (LoginUseCase) hatayı
 *   yakalayıp girişi reddeder (throttle çalışmıyorsa kimlik doğrulama durur).
 */
export class RedisLoginThrottle implements ILoginThrottle {
  constructor(
    private readonly connection: RedisConnection,
    private readonly config: LoginThrottleConfig,
  ) {}

  private client() {
    return this.connection.client();
  }

  async recordFailure(username: string): Promise<void> {
    const client = this.client();
    const count = await client.incr(FAIL_KEY(username));
    // İlk artışta sayaç penceresi kurulur; eşik aşılınca kilit anahtarı
    // (kendi TTL'iyle) kurulur — EXPIRE var olmayan anahtarı YARATMAZ,
    // kilit için SET + EX kullanılır.
    if (count === 1) {
      await client.expire(FAIL_KEY(username), this.config.windowSeconds);
    }
    if (count >= this.config.maxFailures) {
      await client.set(LOCK_KEY(username), "1", {
        EX: this.config.lockSeconds,
      });
    }
  }

  async recordSuccess(username: string): Promise<void> {
    await this.client().del([FAIL_KEY(username), LOCK_KEY(username)]);
  }

  async isLocked(username: string): Promise<boolean> {
    const lock = await this.client().get(LOCK_KEY(username));
    return lock !== null;
  }
}
