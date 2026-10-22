import { describe, it, expect, vi } from "vitest";
import { hashSecret } from "../domain/secrets";
import type { IPeerBootstrapRepository } from "../domain/ports/peer-bootstrap-repository";
import { ClaimBootstrap } from "./claim-bootstrap";

function makeRepo(claimed: boolean): IPeerBootstrapRepository & {
  claim: ReturnType<typeof vi.fn>;
} {
  return {
    createBootstrap: vi.fn(),
    claim: vi.fn().mockResolvedValue(claimed),
    revoke: vi.fn(),
  } as unknown as IPeerBootstrapRepository & {
    claim: ReturnType<typeof vi.fn>;
  };
}

describe("ClaimBootstrap", () => {
  it("AK-2.1/AK-2.2: geçerli bootstrap → peerSecret, yalnız hash saklanır", async () => {
    const repo = makeRepo(true);
    const useCase = new ClaimBootstrap(repo, { now: () => 1234 });
    const result = await useCase.execute("revpi-1", "bootstrap-token");
    expect(result.isOk()).toBe(true);
    const claim = result.unwrap();
    expect(claim.peerSecret.length).toBeGreaterThan(20);
    expect(repo.claim).toHaveBeenCalledWith({
      peerId: "revpi-1",
      bootstrapTokenHash: hashSecret("bootstrap-token"),
      secretHash: hashSecret(claim.peerSecret),
      now: 1234,
    });
  });

  it("AK-2.3: kullanılmış/süresi geçmiş bootstrap reddedilir", async () => {
    const repo = makeRepo(false);
    const result = await new ClaimBootstrap(repo).execute("p-1", "used");
    expect(result.isErr()).toBe(true);
    expect(result.error().kind).toBe("validation");
  });

  it("eksik girdi reddedilir", async () => {
    const repo = makeRepo(true);
    const result = await new ClaimBootstrap(repo).execute("", "token");
    expect(result.isErr()).toBe(true);
    expect(repo.claim).not.toHaveBeenCalled();
  });
});
