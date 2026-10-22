import { Result, ValidationError } from "@gd-monorepo/ws-tunnel";
import type { DomainError } from "@gd-monorepo/ws-tunnel";
import type { IPeerBootstrapRepository } from "../domain/ports/peer-bootstrap-repository";
import { generateSecret, hashSecret } from "../domain/secrets";

const DEFAULT_BOOTSTRAP_TTL_MS = 24 * 60 * 60 * 1000;

export interface CreateBootstrapConfig {
  /** Bootstrap geçerlilik süresi (ms). Varsayılan 24 saat. */
  readonly ttlMs?: number;
  /** Zaman kaynağı — testlerde deterministik. */
  readonly now?: () => number;
}

export interface BootstrapIssued {
  readonly peerId: string;
  readonly bootstrapToken: string;
  readonly expiresAt: number;
}

/**
 * CreateBootstrap — admin peer oluşturur ve tek kullanımlık bootstrap üretir.
 *
 * Düz metin token yalnız sonuçta döner; kalıcı tarafta hash saklanır.
 */
export class CreateBootstrap {
  private readonly ttlMs: number;
  private readonly now: () => number;

  constructor(
    private readonly repository: IPeerBootstrapRepository,
    config: CreateBootstrapConfig = {},
  ) {
    this.ttlMs = config.ttlMs ?? DEFAULT_BOOTSTRAP_TTL_MS;
    this.now = config.now ?? (() => Date.now());
  }

  async execute(
    peerId: string,
  ): Promise<Result<BootstrapIssued, DomainError>> {
    if (peerId.trim().length === 0) {
      return Result.err(
        new ValidationError("hub.bootstrap.no-peer-id", "peerId bos olamaz"),
      );
    }
    const bootstrapToken = generateSecret();
    const expiresAt = this.now() + this.ttlMs;
    await this.repository.createBootstrap({
      peerId,
      tokenHash: hashSecret(bootstrapToken),
      expiresAt,
    });
    return Result.ok({ peerId, bootstrapToken, expiresAt });
  }
}
