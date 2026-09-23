import { describe, it, expect, vi } from "vitest";
import type { IHubChannel } from "@gd-monorepo/ws-tunnel";
import { OperationRequester } from "./operation-requester";

/**
 * OperationRequester sözleşmesi (WS-TUNNEL-KAPASITE §5.2):
 * - send: operation-execute gönderilir (param/trace aktarımı).
 * - AYNI operationId'li operation-result çözülür; farklı id/peer YOK SAYILIR.
 * - Timeout → undefined; abonelik sökülür (sızıntı yok).
 */

interface ChannelHarness {
  channel: IHubChannel;
  subscribers: Array<(fieldId: string, message: unknown) => void>;
  sent: Array<{ fieldId: string; message: unknown }>;
  /** Abonelik sökme sayacı (referans — kapanış içinde artar). */
  unsubscribeCount: () => number;
}

function makeChannel(): ChannelHarness {
  const subscribers: Array<(fieldId: string, message: unknown) => void> = [];
  const sent: Array<{ fieldId: string; message: unknown }> = [];
  let unsubscribes = 0;
  const channel = {
    sendControl: (fieldId: string, message: unknown) => {
      sent.push({ fieldId, message });
    },
    onControlMessage: (
      subscriber: (fieldId: string, message: unknown) => void,
    ) => {
      subscribers.push(subscriber);
      return () => {
        unsubscribes++;
        const i = subscribers.indexOf(subscriber);
        if (i >= 0) subscribers.splice(i, 1);
      };
    },
  } as unknown as IHubChannel;
  return { channel, subscribers, sent, unsubscribeCount: () => unsubscribes };
}

describe("OperationRequester (C2b)", () => {
  it("operation-execute frame'i gönderilir + aynı id'li sonuç çözülür", async () => {
    const h = makeChannel();
    const requester = new OperationRequester({ channel: h.channel });

    const pending = requester.send("f-1", "op-1", "field_charge", { powerKw: 200 }, "t-1");
    expect(h.sent).toEqual([
      {
        fieldId: "f-1",
        message: {
          type: "operation-execute",
          operationId: "op-1",
          name: "field_charge",
          params: { powerKw: 200 },
          traceId: "t-1",
        },
      },
    ]);

    h.subscribers[0]!("f-1", {
      type: "operation-result",
      operationId: "op-1",
      status: "rolled_back",
    });
    await expect(pending).resolves.toEqual({
      type: "operation-result",
      operationId: "op-1",
      status: "rolled_back",
    });
    expect(h.unsubscribeCount()).toBe(1);
  });

  it("farklı operationId / peer yok sayılır", async () => {
    const h = makeChannel();
    const requester = new OperationRequester({ channel: h.channel, timeoutMs: 50 });
    const pending = requester.send("f-1", "op-1", "x");

    h.subscribers[0]!("f-1", { type: "operation-result", operationId: "op-2", status: "completed" });
    h.subscribers[0]!("f-2", { type: "operation-result", operationId: "op-1", status: "completed" });

    await expect(pending).resolves.toBeUndefined(); // timeout
    expect(h.unsubscribeCount()).toBe(1);
  });

  it("timeout → undefined + abonelik sökülür", async () => {
    vi.useFakeTimers();
    try {
      const h = makeChannel();
      const requester = new OperationRequester({ channel: h.channel, timeoutMs: 1000 });
      const pending = requester.send("f-1", "op-1", "x");
      vi.advanceTimersByTime(1000);
      await expect(pending).resolves.toBeUndefined();
      expect(h.unsubscribeCount()).toBe(1);
    } finally {
      vi.useRealTimers();
    }
  });
});
