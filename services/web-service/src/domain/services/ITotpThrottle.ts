/** Faz 6 T6.1 eki (2026-08-30 T1.6) — TOTP kod deneme throttling kontratı (DI ile swappable). */

/** TOTP throttling yapılandırması (tek obje — DI kuralı 3). */
export interface TotpThrottleConfig {
  /** Kilit için gereken başarısız kod denemesi sayısı. */
  readonly maxFailures: number;
  /** Sayaç penceresi (saniye). */
  readonly windowSeconds: number;
  /** Kilit süresi (saniye). */
  readonly lockSeconds: number;
}

/**
 * TOTP deneme sayacı — ASVS L2 V3.5.2: kısa sürede sınırsız kod denemesi
 * engellenir (brute-force koruması). Anahtar: kullanıcı ID'si (username
 * değil — MFA akışında username henüz doğrulanmamış olabilir).
 */
export interface ITotpThrottle {
  /** Başarısız kod denemesini kaydeder (komut) — eşik aşılınca kilit kurulur. */
  recordFailure(userId: string): Promise<void>;

  /** Başarılı doğrulamada sayaç ve kilidi temizler (komut). */
  recordSuccess(userId: string): Promise<void>;

  /** Kod denemeleri kilitli mi? (sorgu) */
  isLocked(userId: string): Promise<boolean>;
}
