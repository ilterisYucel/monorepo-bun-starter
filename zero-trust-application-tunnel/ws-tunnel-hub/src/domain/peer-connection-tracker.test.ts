import { describe, it, expect, beforeEach } from "vitest";
import { PeerConnectionTracker } from "./peer-connection-tracker";

/** PeerConnectionTracker — saf domain policy (enjekte clock). */
describe("PeerConnectionTracker", () => {
  let now = 0;
  const clock = () => now;
  beforeEach(() => {
    now = 0;
  });
  const make = () =>
    new PeerConnectionTracker({ staleTimeoutMs: 1000 }, clock);

  it("markConnected → connected; bilinmeyen → idle", () => {
    const tracker = make();
    expect(tracker.statusOf("p")).toBe("idle");
    tracker.markConnected("p");
    expect(tracker.statusOf("p")).toBe("connected");
    expect(tracker.isConnected("p")).toBe(true);
  });

  it("sweep eşiği aşınca stale yapar", () => {
    const tracker = make();
    tracker.markConnected("p");
    now = 1000;
    tracker.sweep();
    expect(tracker.statusOf("p")).toBe("stale");
    expect(tracker.isConnected("p")).toBe(false);
  });

  it("heartbeat stale'i connected'a döndürür", () => {
    const tracker = make();
    tracker.markConnected("p");
    now = 1500;
    tracker.sweep();
    expect(tracker.statusOf("p")).toBe("stale");
    tracker.markHeartbeat("p");
    expect(tracker.statusOf("p")).toBe("connected");
  });

  it("markError durumu error yapar; markClosed kaydı düşürür", () => {
    const tracker = make();
    tracker.markConnected("p");
    tracker.markError("p");
    expect(tracker.statusOf("p")).toBe("error");
    tracker.markClosed("p");
    expect(tracker.statusOf("p")).toBe("idle");
  });

  it("snapshot tüm durumları döner", () => {
    const tracker = make();
    tracker.markConnected("a");
    tracker.markConnected("b");
    const snapshot = tracker.snapshot();
    expect(snapshot.get("a")).toBe("connected");
    expect(snapshot.size).toBe(2);
  });
});
