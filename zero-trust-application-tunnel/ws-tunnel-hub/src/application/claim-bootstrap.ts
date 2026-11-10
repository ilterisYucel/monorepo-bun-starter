import { Result, ValidationError } from "@gd-monorepo/ws-tunnel";
import type { DomainError } from "@gd-monorepo/ws-tunnel";
import type { IPeerBootstrapRepository } from "../domain/ports/peer-bootstrap-repository";
import { generateSecret, hashSecret } from "../domain/secrets";

export interface ClaimBootstrapConfig {
  /** Zaman kaynağı — testlerde deterministik. */
  readonly now?: () => number;
}

export interface BootstrapClaimed {
  readonly peerId: string;
  readonly peerSecret: string;
}

/**
 * ClaimBootstrap — peer bootstrap token'ını kalıcı kimlikle takas eder.
 *
 * Bootstrap hash + TTL + tek kullanım ile doğrulanır (fail-closed); başarıda
 * kalıcı `peerSecret` üretilir (hash DB'de, düz metin yalnız yanıtta).
 */
export class ClaimBootstrap {
  private readonly now: () => number;

  constructor(
    private readonly repository: IPeerBootstrapRepository,
    config: ClaimBootstrapConfig = {},
  ) {
    this.now = config.now ?? (() => Date.now());
  }

  async execute(
    peerId: string,
    bootstrapToken: string,
  ): Promise<Result<BootstrapClaimed, DomainError>> {
    if (peerId.trim().length === 0 || bootstrapToken.trim().length === 0) {
      return Result.err(
        new ValidationError(
          "hub.bootstrap.invalid-input",
          "peerId ve bootstrapToken zorunlu",
        ),
      );
    }

    const peerSecret = generateSecret();
    const claimed = await this.repository.claim({
      peerId,
      bootstrapTokenHash: hashSecret(bootstrapToken),
      secretHash: hashSecret(peerSecret),
      now: this.now(),
    });
    if (!claimed) {
      return Result.err(
        new ValidationError(
          "hub.bootstrap.invalid",
          "Bootstrap token gecersiz veya suresi gecmis",
        ),
      );
    }
    return Result.ok({ peerId, peerSecret });
  }
}
