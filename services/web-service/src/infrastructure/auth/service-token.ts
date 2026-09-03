import { createHash } from "node:crypto";

/**
 * SHA-256 hex özeti — service token'lar yalnızca hash olarak saklanır (Faz 1).
 */
export function sha256Hex(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}
