import { Result, ValidationError } from "@gd-monorepo/ws-tunnel";
import type { DomainError } from "@gd-monorepo/ws-tunnel";
import type { IPeerBootstrapRepository } from "../domain/ports/peer-bootstrap-repository";
import type { IPeerDisconnector } from "../domain/ports/peer-disconnector";

/**
 * RevokePeer — kimliği iptal eder ve aktif bağlantıyı düşürür.
 *
 * Sıra: önce kimlik iptali (eski secret anında geçersiz), sonra soket kapatma.
 */
export class RevokePeer {
  constructor(
    private readonly repository: IPeerBootstrapRepository,
    private readonly disconnector: IPeerDisconnector,
  ) {}

  async execute(peerId: string): Promise<Result<void, DomainError>> {
    if (peerId.trim().length === 0) {
      return Result.err(
        new ValidationError("hub.revoke.no-peer-id", "peerId bos olamaz"),
      );
    }
    await this.repository.revoke(peerId);
    this.disconnector.disconnect(peerId);
    return Result.okVoid<void, DomainError>();
  }
}
