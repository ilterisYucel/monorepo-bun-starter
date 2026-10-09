import type { TelemetryConfigEntry } from "@gd-monorepo/shared-types";

/**
 * Çözülmüş yazma politikası — `"auto"` sayıya indirgenmiş, `maxStaleMs` zorunlu.
 * Config'te `deadband` tanımsız girdiler haritaya ALINMAZ (always-write).
 */
export interface WritePolicy {
  /** Mutlak değişim eşiği (`"auto"` → scale). */
  readonly deadband: number;
  /** Bayatlama sınırı (ms) — değer değişmese bile satır garantisi. */
  readonly maxStaleMs: number;
}

/**
 * Config telemetri girdilerinden `name → WritePolicy` haritası çözer.
 *
 * - `deadband` tanımsızsa girdi atlanır (bugünkü "her poll yaz" davranışı).
 * - `"auto"` → gridin `scale` değeri (şema `auto`'yu yalnız ham-tam-sayı girdilerde kabul eder).
 * - Şema `deadband` ⇒ `maxStaleMs` zorunluluğunu uygular; bu fonksiyon savunmacı olarak
 *   geçersizliği fail-fast yapar (config şeması atlanmış olsa bile sessiz kabul edilmez).
 *
 * Not (K8): yalnız `telemetry[]` (register) girdilerinden çağrılır — bitfield alanları
 * politika taşımaz.
 */
export function resolveWritePolicies(
  entries: readonly TelemetryConfigEntry[],
): Map<string, WritePolicy> {
  const policies = new Map<string, WritePolicy>();

  for (const entry of entries) {
    const rawDeadband = entry.deadband;
    if (rawDeadband === undefined) continue;

    const deadband =
      rawDeadband === "auto"
        ? Number((entry as { scale?: unknown }).scale ?? 0)
        : rawDeadband;
    const maxStaleMs = entry.maxStaleMs;

    const valid =
      Number.isFinite(deadband) && deadband > 0 && maxStaleMs !== undefined;
    if (!valid) {
      throw new Error(
        `[write-policy] ${entry.name}: gecersiz politika (deadband=${String(rawDeadband)}, maxStaleMs=${String(maxStaleMs)})`,
      );
    }

    policies.set(entry.name, { deadband, maxStaleMs });
  }

  return policies;
}
