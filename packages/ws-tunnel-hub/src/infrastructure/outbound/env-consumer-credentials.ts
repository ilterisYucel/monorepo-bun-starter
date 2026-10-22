import { createHash, timingSafeEqual } from "node:crypto";
import type { IConsumerCredentials } from "../../domain/ports/consumer-credentials";

/** EnvConsumerCredentials — consumer token'ı (peer token'ından AYRI). */
export class EnvConsumerCredentials implements IConsumerCredentials {
  private readonly expectedHash: Buffer;

  constructor(token: string) {
    if (token.trim().length === 0) {
      throw new Error("[EnvConsumerCredentials] consumer token bos olamaz");
    }
    this.expectedHash = createHash("sha256").update(token).digest();
  }

  verify(token: string): boolean {
    if (token.length === 0) return false;
    const actual = createHash("sha256").update(token).digest();
    return actual.length === this.expectedHash.length &&
      timingSafeEqual(actual, this.expectedHash);
  }
}
