import type { LogLevel } from "./types";
import { readFile } from "node:fs/promises";
import type { ILogSink } from "./interfaces";

/** Varsayılan redaction anahtarları — eşleşme büyük/küçük harf duyarsız + kısmi. */
export const DEFAULT_REDACTION_KEYS = [
  "password",
  "token",
  "authorization",
  "secret",
  "api_key",
  "apikey",
] as const;

/** Seviye şiddet sıralaması — filtre karşılaştırması için. */
export const LEVEL_RANK: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  fatal: 4,
};

/**
 * TamperLogger yapılandırması — tek obje (DI kuralı 3).
 *
 * - `signingKey` ve `service` zorunludur (boş olamaz).
 * - `sinks` en az bir sink içermelidir.
 * - `level` yalnızca `app` kategorisini filtreler (varsayılan debug).
 * - `correlationIdFactory` test/determinizm için enjekte edilir.
 * - `eventCodeValidator` opsiyonel: proje kendi olay sözlüğünü enjekte
 *   eder; reddedilen kod için `log()` throw eder (fail-closed). Verilmezse
 *   her string kabul edilir (paket proje-bağımsızdır — sözlük BİLMEZ).
 */
export interface TamperLoggerConfig {
  readonly level?: LogLevel;
  readonly sinks: ILogSink[];
  readonly redactionKeys?: string[];
  readonly batchSize?: number;
  readonly batchIntervalMs?: number;
  readonly ringBufferSize?: number;
  readonly signingKey: string;
  readonly service: string;
  readonly host?: string;
  readonly correlationIdFactory?: () => string;
  /** Proje olay sözlüğü doğrulayıcısı — bkz. yukarıdaki açıklama. */
  readonly eventCodeValidator?: (code: string) => boolean;
  /**
   * Alert kuralları: listelenen eventCode'lar cooldown'lu notifier
   * sink'lerine (mail/sms) en iyi çaba ile iletilir — alert hatası
   * audit/security fail-closed zincirini ETKİLEMEZ.
   */
  readonly alertRules?: {
    readonly sinks: ILogSink[];
    readonly eventCodes: string[];
    readonly cooldownMs?: number;
  };
}

/** İmza anahtarı materyalini dosyadan yükler (trim'li). */
export async function loadSigningKey(path: string): Promise<string> {
  const content = await readFile(path, "utf8");
  const key = content.trim();
  if (key.length === 0) {
    throw new Error(`[LoggerConfig] imza anahtarı boş: ${path}`);
  }
  return key;
}

/**
 * İmza anahtarı materyalini çözer:
 * 1. env override (LOG_SIGNING_KEY) varsa kazanır,
 * 2. yoksa `signingKeyPath` dosyası okunur,
 * 3. dosya da yoksa geliştirme anahtarına düşülür + uyarı yazılır —
 *    açılış bloke edilmez (production'da dosya deployment ile gelir).
 */
export async function resolveSigningKey(
  signingKeyPath: string,
  envOverride?: string,
): Promise<string> {
  if (envOverride !== undefined && envOverride.trim().length > 0) {
    return envOverride.trim();
  }
  try {
    return await loadSigningKey(signingKeyPath);
  } catch (err) {
    console.warn(
      `[SigningKey] ${signingKeyPath} okunamadi (${String(err)}) — gelistirme anahtari kullaniliyor`,
    );
    return "dev-only-signing-key";
  }
}
