import type { RedisConnection } from "@gd-monorepo/core";
import type {
  ITotpThrottle,
  TotpThrottleConfig,
} from "../../domain/services/ITotpThrottle";

const FAIL_KEY = (userId: string) => `totp:fail:${userId}`;
const LOCK_KEY = (userId: string) => `totp:lock:${userId}`;

/**
 * RedisTotpThrottle — 2026-08-30 (T1.6): TOTP kod denemesi sayacı + kilit
 * (ASVS L2 V3.5.2 brute-force koruması).
 *
 * - Başarısız denemede sayaç INCR + pencere EXPIRE (ilk artışta).
 * - Sayaç `maxFailures`'a ulaşınca kilit anahtarı `lockSeconds` TTL ile
 *   kurulur (SET + EX — EXPIRE var olmayan anahtarı YARATMAZ).
 * - Başarılı doğrulamada sayaç + kilit DEL.
 * - Redis hatası fırlatılır — fail-open YOK: çağıran (MfaLoginUseCase /
 *   MfaEnrollUseCase) hatayı yakalayıp doğrulamayı reddeder.
 */
export class RedisTotpThrottle implements ITotpThrottle {
  constructor(
    private readonly connection: RedisConnection,
    private readonly config: TotpThrottleConfig,
  ) {}

  private client() {
    return this.connection.client();
  }

  async recordFailure(userId: string): Promise<void> {
    const client = this.client();
    const count = await client.incr(FAIL_KEY(userId));
    if (count === 1) {
      await client.expire(FAIL_KEY(userId), this.config.windowSeconds);
    }
    if (count >= this.config.maxFailures) {
      await client.set(LOCK_KEY(userId), "1", {
        EX: this.config.lockSeconds,
      });
    }
  }

  async recordSuccess(userId: string): Promise<void> {
    await this.client().del([FAIL_KEY(userId), LOCK_KEY(userId)]);
  }

  async isLocked(userId: string): Promise<boolean> {
    const lock = await this.client().get(LOCK_KEY(userId));
    return lock !== null;
  }
}
