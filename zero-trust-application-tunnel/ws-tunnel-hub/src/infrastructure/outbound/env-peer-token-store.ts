import { createHash, timingSafeEqual } from "node:crypto";
import type { IPeerCredentialsStore } from "../../domain/ports/peer-credentials-store";

/**
 * EnvPeerTokenStore — token kaynağı env/dosya (P2 basit auth).
 *
 * Token düz metin saklanmaz; startup'ta hash'lenir ve sabit-zamanlı
 * karşılaştırılır. İP-2 bootstrap aynı portun sqlite adapter'ına eklenir.
 */
export class EnvPeerTokenStore implements IPeerCredentialsStore {
  private readonly expectedHash: Buffer;

  constructor(token: string) {
    if (token.trim().length === 0) {
      throw new Error("[EnvPeerTokenStore] peer token bos olamaz");
    }
    this.expectedHash = hash(token);
  }

  async authenticate(token: string): Promise<boolean> {
    if (token.length === 0) return false;
    const actual = hash(token);
    return actual.length === this.expectedHash.length &&
      timingSafeEqual(actual, this.expectedHash);
  }
}

function hash(value: string): Buffer {
  return createHash("sha256").update(value).digest();
}
