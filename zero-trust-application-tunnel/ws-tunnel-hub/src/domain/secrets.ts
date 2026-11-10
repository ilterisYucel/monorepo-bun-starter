import { createHash, randomBytes } from "node:crypto";

/**
 * Sır üretimi/özeti — domain yardımcısı (framework bağımsız).
 *
 * Düz metin token yalnız üretim/claim yanıtında görünür; kalıcı tarafta her
 * zaman hash saklanır.
 */

/** Kriptografik rastgele token (base64url, ~43 karakter). */
export function generateSecret(): string {
  return randomBytes(32).toString("base64url");
}

/** SHA-256 hex özeti. */
export function hashSecret(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}
