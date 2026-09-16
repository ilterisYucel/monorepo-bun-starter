// validate.expect ilişki sözleşmesi — komut doğrulama read-back'lerinin
// birebir eşitlik ötesi sayısal karşılaştırmaları (PCS-WATTOX-MIMARISI T-P3).
// Kullanım yeri: device-service executeCommand validate döngüsü.

/** Sayısal ilişki sözcükleri — `expect` alanında kullanılır (string). */
export const RELATION_EXPECTS = ["negative", "positive", "zero", "nonzero"] as const;

export type RelationExpect = (typeof RELATION_EXPECTS)[number];

/**
 * Sorgu — verilen değer ilişki sözcüğü mü? (Birebir eşitlik string'leri
 * dışarıda kalır: "open" gibi değerler ilişki DEĞİLDİR.)
 */
export function isRelationExpect(value: unknown): value is RelationExpect {
  return (
    typeof value === "string" &&
    (RELATION_EXPECTS as readonly string[]).includes(value)
  );
}

/**
 * Sorgu — read-back değeri beklenen koşulu sağlıyor mu?
 *
 * - `expect` ilişki sözcüğüyse sayısal ilişki: "negative" <0, "positive" >0,
 *   "zero" ===0, "nonzero" !==0. Sayısal ilişkiler YALNIZCA `number` değerlerde
 *   tutar — string/boolean'da FALSE.
 * - Değilse birebir eşitlik: `actual === expect` (kesin).
 *
 * Yan etki YOK.
 */
export function expectHolds(
  actual: unknown,
  expect: string | number | boolean,
): boolean {
  if (!isRelationExpect(expect)) {
    if (actual === expect) return true;
    // Modbus BOOLEAN register'ları (DISCRETE_INPUT/COIL) sayısal 0/1 olarak
    // çözülür; config'te "expect: true/false" yazılır (cb open, dc on,
    // control-panel-io ışıklar). Katman sınırında 0/1 ↔ boolean eşleşir —
    // canlı koşumda yakalanan sözleşme uyuşmazlığı (2026-09-16).
    if (
      typeof expect === "boolean" &&
      typeof actual === "number" &&
      (actual === 0 || actual === 1)
    ) {
      return actual === (expect ? 1 : 0);
    }
    return false;
  }
  if (typeof actual !== "number") return false;
  switch (expect) {
    case "negative":
      return actual < 0;
    case "positive":
      return actual > 0;
    case "zero":
      return actual === 0;
    case "nonzero":
      return actual !== 0;
  }
}
