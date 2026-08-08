/**
 * Birim parser'lari.
 * ConfigDefinition'lardaki unit alanina gore ham string degerleri
 * normalize eder ve dogrular.
 *
 * Desteklenen birimler:
 *   - "duration-pg": PostgreSQL uyumlu interval ("6 hours", "90 days")
 *   - "duration-ms": milisaniye ("30s", "5m", "2h")
 *   - "bytes": byte ("256MB", "1GB", "512KB")
 */

/**
 * PostgreSQL uyumlu duration formatini dogrular.
 * Kabul edilen format: "<sayi> <birim>"
 * Gecerli birimler: microsecond(s), millisecond(s), second(s),
 *                    minute(s), hour(s), day(s), week(s), month(s), year(s)
 *
 * @throws gecersiz formatta
 */
function assertPgDuration(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error(`Gecersiz duration: bos deger`);
  }
  const lowered = trimmed.toLowerCase();
  const pattern = /^(\d+(?:\.\d+)?)\s+(microseconds?|milliseconds?|seconds?|minutes?|hours?|days?|weeks?|months?|years?)$/;
  const match = pattern.exec(lowered);
  if (!match) {
    throw new Error(
      `Gecersiz duration: "${value}". Beklenen format: "<sayi> <birim>" (ornegin: "6 hours", "90 days", "30 seconds")`,
    );
  }
  return trimmed;
}

/**
 * Kisa duration formatini milisaniyeye cevirir.
 * Kabul edilen format: "<sayi><birim>"
 * Birimler: ms, s, m, h, d
 *
 * @throws gecersiz formatta
 */
function parseDurationToMs(value: string): number {
  const trimmed = value.trim().toLowerCase();
  const match = /^(\d+(?:\.\d+)?)\s*(ms|s|m|h|d)$/.exec(trimmed);
  if (!match) {
    throw new Error(
      `Gecersiz duration: "${value}". Beklenen format: "<sayi><birim>" (ornegin: "30s", "5m", "2h", "30000ms")`,
    );
  }
  const num = parseFloat(match[1]);
  const unit = match[2];

  switch (unit) {
    case "ms":
      return num;
    case "s":
      return num * 1000;
    case "m":
      return num * 60 * 1000;
    case "h":
      return num * 3600 * 1000;
    case "d":
      return num * 86400 * 1000;
    default:
      throw new Error(`Bilinmeyen duration birimi: "${unit}"`);
  }
}

/**
 * Byte birimini sayiya cevirir.
 * Kabul edilen format: "<sayi><birim>"
 * Birimler: B, KB, MB, GB, TB (case-insensitive)
 *
 * @throws gecersiz formatta
 */
function parseBytes(value: string): number {
  const trimmed = value.trim().toLowerCase();
  const match = /^(\d+(?:\.\d+)?)\s*(b|kb|mb|gb|tb)$/.exec(trimmed);
  if (!match) {
    throw new Error(
      `Gecersiz byte: "${value}". Beklenen format: "<sayi><birim>" (ornegin: "256MB", "1GB")`,
    );
  }
  const num = parseFloat(match[1]);
  const unit = match[2];

  const multipliers: Record<string, number> = {
    b: 1,
    kb: 1024,
    mb: 1024 * 1024,
    gb: 1024 * 1024 * 1024,
    tb: 1024 * 1024 * 1024 * 1024,
  };

  return num * (multipliers[unit] ?? 1);
}

/**
 * ConfigLoader tarafindan kullanilan ana birim uygulama fonksiyonu.
 * unit tipine gore uygun parser'i cagirir.
 *
 * @param unit — ConfigUnit tipi
 * @param raw — ham string degeri
 * @returns normalize edilmis deger (string veya number)
 * @throws gecersiz formatta
 */
export function applyUnit(unit: ConfigUnit, raw: unknown): unknown {
  if (typeof raw === "number") return raw;

  const value = String(raw);

  switch (unit) {
    case "duration-pg":
      return assertPgDuration(value);

    case "duration-ms":
      return parseDurationToMs(value);

    case "bytes":
      return parseBytes(value);

    default: {
      const _exhaustive: never = unit;
      throw new Error(`Bilinmeyen ConfigUnit: ${String(_exhaustive)}`);
    }
  }
}

import type { ConfigUnit } from "./types";
