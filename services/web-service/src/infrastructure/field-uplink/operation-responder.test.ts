import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ITunnelChannel } from "@gd-monorepo/ws-tunnel";
import type { OperationExecutor } from "@gd-monorepo/platform-commands";
import { OperationResponder } from "./operation-responder";

/**
 * OperationResponder sözleşmesi (WS-TUNNEL-KAPASITE §5.2, K1):
 * - operation-execute → zod doğrulama → yürütücü (trigger boss:<id>,
 *   createdBy boss, traceId aktarımı) → operation-result (her durumda).
 * - Geçersiz frame → rejected (invalid_request) — yürütücü ÇALIŞMAZ.
 * - Yürütme throw → failed sonucu — kanal KAPANMAZ (kademeli).
 * - Audit: operation_boss_request + operation_result_sent.
 */

interface ResponderHarness {
  responder: OperationResponder;
  messages: Array<(message: unknown) => void>;
  sent: unknown[];
  executor: { execute: ReturnType<typeof vi.fn> };
  log: ReturnType<typeof vi.fn>;
}

function harness(): ResponderHarness {
  const messages: Array<(message: unknown) => void> = [];
  const sent: unknown[] = [];
  const executor = {
    execute: vi.fn(async () => ({
      runId: "run-1",
      kind: "operation" as const,
      name: "field_charge",
      status: "completed" as const,
      outcomes: [
        { stepIndex: 0, system: "container-1", maneuver: "bsc_prepare", success: true },
        { stepIndex: 2, maneuver: "pcs_charge", success: true },
      ],
    })),
  };
  const log = vi.fn(async () => undefined);
  const channel = {
    onMessage: (subscriber: (message: unknown) => void) => {
      messages.push(subscriber);
      return () => {
        const i = messages.indexOf(subscriber);
        if (i >= 0) messages.splice(i, 1);
      };
    },
    sendControl: (message: unknown) => {
      sent.push(message);
    },
  } as unknown as ITunnelChannel;
  const responder = new OperationResponder(
    channel,
    executor as unknown as OperationExecutor,
    { log } as never,
  );
  responder.start();
  return { responder, messages, sent, executor, log };
}

function emit(harness: ResponderHarness, message: unknown): void {
  for (const subscriber of harness.messages) {
    subscriber(message);
  }
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("OperationResponder (C2b)", () => {
  it("geçerli operation-execute → yürütücü + operation-result (completed)", async () => {
    const h = harness();
    emit(h, {
      type: "operation-execute",
      operationId: "op-1",
      name: "field_charge",
      params: { powerKw: 200 },
      traceId: "auto:boss:1",
    });
    await vi.waitFor(() => expect(h.sent.length).toBe(1));
    expect(h.executor.execute).toHaveBeenCalledWith("operation", "field_charge", { powerKw: 200 }, {
      trigger: "boss:op-1",
      createdBy: "boss",
      traceId: "auto:boss:1",
    });
    expect(h.sent[0]).toEqual({
      type: "operation-result",
      operationId: "op-1",
      status: "completed",
      results: [
        { step: 0, system: "container-1", maneuver: "bsc_prepare", ok: true },
        { step: 2, maneuver: "pcs_charge", ok: true },
      ],
    });
  });

  it("geçersiz frame → rejected(invalid_request) — yürütücü ÇALIŞMAZ", async () => {
    const h = harness();
    emit(h, { type: "operation-execute", name: "field_charge" });
    await vi.waitFor(() => expect(h.sent.length).toBe(1));
    expect(h.executor.execute).not.toHaveBeenCalled();
    expect(h.sent[0]).toEqual({
      type: "operation-result",
      operationId: "unknown",
      status: "rejected",
      reason: "invalid_request",
    });
  });

  it("rejected sonuç reason ile taşınır", async () => {
    const h = harness();
    h.executor.execute.mockResolvedValue({
      runId: "",
      kind: "operation",
      name: "field_charge",
      status: "rejected",
      outcomes: [],
      reason: "not_found",
    });
    emit(h, {
      type: "operation-execute",
      operationId: "op-1",
      name: "field_charge",
    });
    await vi.waitFor(() => expect(h.sent.length).toBe(1));
    expect(h.sent[0]).toMatchObject({ status: "rejected", reason: "not_found" });
  });

  it("yürütme throw → failed sonucu; abonelik KALIR (kanal kapanmaz)", async () => {
    const h = harness();
    h.executor.execute.mockRejectedValue(new Error("patladi"));
    emit(h, {
      type: "operation-execute",
      operationId: "op-1",
      name: "field_charge",
    });
    await vi.waitFor(() => expect(h.sent.length).toBe(1));
    expect(h.sent[0]).toEqual({
      type: "operation-result",
      operationId: "op-1",
      status: "failed",
      reason: "patladi",
    });
    expect(h.messages).toHaveLength(1);
  });

  it("audit: operation_boss_request + operation_result_sent", async () => {
    const h = harness();
    emit(h, {
      type: "operation-execute",
      operationId: "op-1",
      name: "field_charge",
    });
    await vi.waitFor(() => expect(h.sent.length).toBe(1));
    expect(h.log).toHaveBeenCalledWith(
      expect.objectContaining({ eventCode: "operation_boss_request" }),
    );
    expect(h.log).toHaveBeenCalledWith(
      expect.objectContaining({ eventCode: "operation_result_sent" }),
    );
  });
});
