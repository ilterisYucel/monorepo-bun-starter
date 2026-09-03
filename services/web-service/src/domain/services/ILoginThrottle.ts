/** Faz 6 T6.6 — giriş throttling kontratı (DI ile swappable). */
export interface ILoginThrottle {
  /**
   * Başarısız girişi kaydeder (komut) — eşik aşılınca kilit kurulur.
   * Redis/depo hatası fırlatılır (fail-open YOK — çağıran yakalar).
   */
  recordFailure(username: string): Promise<void>;

  /** Başarılı girişte sayaç ve kilidi temizler (komut). */
  recordSuccess(username: string): Promise<void>;

  /** Hesap kilitli mi? (sorgu) */
  isLocked(username: string): Promise<boolean>;
}

/** Faz 6 T6.6 — throttle yapılandırması (tek obje — DI kuralı 3). */
export interface LoginThrottleConfig {
  /** Kilit için gereken başarısız giriş sayısı. */
  readonly maxFailures: number;
  /** Sayaç penceresi (saniye). */
  readonly windowSeconds: number;
  /** Kilit süresi (saniye). */
  readonly lockSeconds: number;
}
