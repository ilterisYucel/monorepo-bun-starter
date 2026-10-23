import { describe, it, expect, vi } from "vitest";
import type { OperationExecutor } from "@gd-monorepo/platform-commands";
import { ExecuteCommandUseCase, EXECUTE_TIMEOUT_MS } from "./execute-command-use-case";

const RESULT = {
  runId: "r-1",
  kind: "operation" as const,
  name: "field_charge",
  status: "completed" as const,
  outcomes: [],
};

function makeExecutor(impl?: () => Promise<typeof RESULT>): OperationExecutor {
  return { execute: vi.fn(impl ?? (async () => RESULT)) } as unknown as OperationExecutor;
}

describe("ExecuteCommandUseCase", () => {
  it("executor'a derlenmiş seçenekleri geçirir (systems → remoteSystem)", async () => {
    const executor = makeExecutor();
    await new ExecuteCommandUseCase(executor).execute({
      kind: "operation",
      name: "field_charge",
      params: { powerKw: 200 },
      deviceIds: ["PCS-1", "PCS-2"],
      systems: ["container-1"],
      timer: { durationSeconds: 30 },
      trigger: "boss:op-1",
      createdBy: "boss",
      traceId: "t-1",
    });
    expect(executor.execute).toHaveBeenCalledWith(
      "operation",
      "field_charge",
      { powerKw: 200 },
      {
        deviceIds: ["PCS-1", "PCS-2"],
        remoteSystem: "container-1",
        timer: { durationSeconds: 30 },
        trigger: "boss:op-1",
        createdBy: "boss",
        traceId: "t-1",
      },
    );
  });

  it("executor reddederse hata yutulmadan yayılır", async () => {
    const executor = makeExecutor(async () => {
      throw new Error("device offline");
    });
    await expect(
      new ExecuteCommandUseCase(executor).execute({
        kind: "operation",
        name: "x",
        params: {},
        trigger: "manual",
        createdBy: "admin",
      }),
    ).rejects.toThrow("device offline");
  });

  it("15 sn içinde terminal sonuç gelmezse 'timeout' döner", async () => {
    vi.useFakeTimers();
    try {
      const executor = makeExecutor(
        () => new Promise(() => undefined) as Promise<typeof RESULT>,
      );
      const pending = new ExecuteCommandUseCase(executor).execute({
        kind: "maneuver",
        name: "x",
        params: {},
        trigger: "manual",
        createdBy: "admin",
      });
      vi.advanceTimersByTime(EXECUTE_TIMEOUT_MS);
      await expect(pending).resolves.toBe("timeout");
    } finally {
      vi.useRealTimers();
    }
  });
});
