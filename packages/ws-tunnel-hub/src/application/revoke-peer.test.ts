import { describe, it, expect, vi } from "vitest";
import type { IPeerBootstrapRepository } from "../domain/ports/peer-bootstrap-repository";
import type { IPeerDisconnector } from "../domain/ports/peer-disconnector";
import { RevokePeer } from "./revoke-peer";

function setup() {
  const repository = {
    createBootstrap: vi.fn(),
    claim: vi.fn(),
    revoke: vi.fn().mockResolvedValue(undefined),
  } as unknown as IPeerBootstrapRepository & { revoke: ReturnType<typeof vi.fn> };
  const disconnector = {
    disconnect: vi.fn(),
  } as unknown as IPeerDisconnector & { disconnect: ReturnType<typeof vi.fn> };
  return { repository, disconnector, useCase: new RevokePeer(repository, disconnector) };
}

describe("RevokePeer", () => {
  it("AK-3.1/AK-3.2: kimliği iptal eder ve bağlantıyı düşürür", async () => {
    const { repository, disconnector, useCase } = setup();
    const result = await useCase.execute("revpi-1");
    expect(result.isOk()).toBe(true);
    expect(repository.revoke).toHaveBeenCalledWith("revpi-1");
    expect(disconnector.disconnect).toHaveBeenCalledWith("revpi-1");
  });

  it("boş peerId reddedilir", async () => {
    const { repository, disconnector, useCase } = setup();
    const result = await useCase.execute("  ");
    expect(result.isErr()).toBe(true);
    expect(repository.revoke).not.toHaveBeenCalled();
    expect(disconnector.disconnect).not.toHaveBeenCalled();
  });
});
