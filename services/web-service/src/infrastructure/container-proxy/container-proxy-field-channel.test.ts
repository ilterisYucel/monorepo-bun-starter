import { describe, it, expect, vi } from "vitest";
import { ContainerProxyFieldChannel } from "./container-proxy-field-channel";
import type { ContainerProxy } from "./container-proxy";

/**
 * ContainerProxyFieldChannel — ws-tunnel IFieldChannel adapter sözleşmesi:
 * sendControl/sendBinary ContainerProxy'ye delege; control/binary abonelikleri
 * observer üzerinden yayınlanır ve unsubscribe söker; isConnected yalnızca
 * "connected" için true.
 */
describe("ContainerProxyFieldChannel", () => {
  function makeProxy() {
    const observers: Array<Record<string, unknown>> = [];
    return {
      observers,
      proxy: {
        sendControl: vi.fn(),
        sendBinary: vi.fn(),
        connectionStatus: () => new Map([["c-1", "connected"], ["c-2", "stale"]]),
        addObserver: vi.fn((o: Record<string, unknown>) => observers.push(o)),
        removeObserver: vi.fn((o: Record<string, unknown>) => {
          const i = observers.indexOf(o);
          if (i >= 0) observers.splice(i, 1);
        }),
      } as unknown as ContainerProxy,
    };
  }

  it("sendControl/sendBinary ContainerProxy'ye delege edilir", () => {
    const { proxy } = makeProxy();
    const channel = new ContainerProxyFieldChannel(proxy);
    channel.sendControl("c-1", { type: "stream-open" });
    channel.sendBinary("c-1", Buffer.from([1, 2]));
    expect(proxy.sendControl).toHaveBeenCalledWith("c-1", { type: "stream-open" });
    expect(proxy.sendBinary).toHaveBeenCalledWith("c-1", Buffer.from([1, 2]));
  });

  it("onControlMessage aboneyi containerId ile besler; unsubscribe söker", () => {
    const { proxy, observers } = makeProxy();
    const channel = new ContainerProxyFieldChannel(proxy);
    const sub = vi.fn();
    const unsub = channel.onControlMessage(sub);
    expect(observers).toHaveLength(1);
    (observers[0]!.onControlMessage as (c: string, m: unknown) => void)(
      "c-1",
      { type: "stream-open-ack" },
    );
    expect(sub).toHaveBeenCalledWith("c-1", { type: "stream-open-ack" });
    unsub();
    expect(observers).toHaveLength(0);
  });

  it("onBinaryFrame aboneyi ham frame ile besler", () => {
    const { proxy, observers } = makeProxy();
    const channel = new ContainerProxyFieldChannel(proxy);
    const sub = vi.fn();
    channel.onBinaryFrame(sub);
    (observers[0]!.onBinaryFrame as (c: string, d: Buffer) => void)(
      "c-1",
      Buffer.from([9, 0]),
    );
    expect(sub).toHaveBeenCalledWith("c-1", Buffer.from([9, 0]));
  });

  it("isConnected yalnızca connected durumda true", () => {
    const { proxy } = makeProxy();
    const channel = new ContainerProxyFieldChannel(proxy);
    expect(channel.isConnected("c-1")).toBe(true);
    expect(channel.isConnected("c-2")).toBe(false);
    expect(channel.isConnected("yok")).toBe(false);
  });
});
