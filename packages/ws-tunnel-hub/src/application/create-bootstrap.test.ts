import { describe, it, expect, vi } from "vitest";
import { hashSecret } from "../domain/secrets";
import type { IPeerBootstrapRepository } from "../domain/ports/peer-bootstrap-repository";
import { CreateBootstrap } from "./create-bootstrap";

function makeRepo(): IPeerBootstrapRepository & {
  createBootstrap: ReturnType<typeof vi.fn>;
} {
  return {
    createBootstrap: vi.fn().mockResolvedValue(undefined),
    claim: vi.fn(),
    revoke: vi.fn(),
  } as unknown as IPeerBootstrapRepository & {
    createBootstrap: ReturnType<typeof vi.fn>;
  };
}

describe("CreateBootstrap", () => {
  it("AK-1.1: token üretir, yalnız hash'i saklar", async () => {
    const repo = makeRepo();
    const useCase = new CreateBootstrap(repo, { now: () => 1000, ttlMs: 5000 });
    const result = await useCase.execute("revpi-1");
    expect(result.isOk()).toBe(true);
    const issued = result.unwrap();
    expect(issued.bootstrapToken.length).toBeGreaterThan(20);
    expect(repo.createBootstrap).toHaveBeenCalledWith({
      peerId: "revpi-1",
      tokenHash: hashSecret(issued.bootstrapToken),
      expiresAt: 6000,
    });
    expect(repo.createBootstrap.mock.calls[0]?.[0].tokenHash).not.toBe(
      issued.bootstrapToken,
    );
  });

  it("AK-1.2: TTL 24 saat (varsayılan)", async () => {
    const repo = makeRepo();
    const useCase = new CreateBootstrap(repo, { now: () => 0 });
    const result = await useCase.execute("p-1");
    expect(result.unwrap().expiresAt).toBe(24 * 60 * 60 * 1000);
  });

  it("boş peerId reddedilir", async () => {
    const repo = makeRepo();
    const result = await new CreateBootstrap(repo).execute("  ");
    expect(result.isErr()).toBe(true);
    expect(result.error().kind).toBe("validation");
    expect(repo.createBootstrap).not.toHaveBeenCalled();
  });
});
