import { describe, it, expect, vi } from "vitest";
import { ContainerSessionServer } from "./container-session-server";
import { ContainerSessionStore } from "./session-store";
import { JoseSignerForTests } from "./__test-helpers__/jose-signer";
import type { ITunnelChannel } from "../channel";

/**
 * T3.3 container tarafı — ContainerSessionServer sözleşmesi (tasarım §5.7):
 * - `open-session` → konteyner JWT üret → `open-session-ack {sessionId, token,
 *   expiresInSec}` (kendi JWT_SECRET'i — field içeriği görülmez §5.4).
 * - `session-end` → kayıt düşer.
 * - Başka mesaj tipleri yok sayılır.
 */

function makeConnector() {
  const subscribers = new Set<(message: unknown) => void>();
  const sent: unknown[] = [];
  return {
    connector: {
      onMessage: (cb: (message: unknown) => void) => {
        subscribers.add(cb);
        return () => subscribers.delete(cb);
      },
      sendControl: (message: unknown) => {
        sent.push(message);
      },
    } as unknown as ITunnelChannel,
    sent,
    emit: (message: unknown) => subscribers.forEach((cb) => cb(message)),
  };
}

describe("ContainerSessionServer (T3.3)", () => {
  it("open-session → open-session-ack (token + expiresInSec)", async () => {
    const fake = makeConnector();
    const store = new ContainerSessionStore(
      new JoseSignerForTests("container-secret-0123456789abcdef"),
    );
    const server = new ContainerSessionServer(fake.connector, store, undefined);
    server.start();

    fake.emit({
      type: "open-session",
      sessionId: "s-1",
      user: { id: "u-1", username: "operator", role: "guest" },
    });
    await new Promise((r) => setTimeout(r, 100));
    const ack = fake.sent[0] as {
      type: string;
      sessionId: string;
      token: string;
      expiresInSec: number;
    };
    expect(ack.type).toBe("open-session-ack");
    expect(ack.sessionId).toBe("s-1");
    expect(ack.expiresInSec).toBe(4 * 60 * 60);
    expect(await store.authenticate(ack.token)).toEqual({
      id: "u-1",
      username: "operator",
      role: "guest",
    });
    server.stop();
  });

  it("session-end → kayıt düşer", async () => {
    const fake = makeConnector();
    const store = new ContainerSessionStore(
      new JoseSignerForTests("container-secret-0123456789abcdef"),
    );
    const server = new ContainerSessionServer(fake.connector, store, undefined);
    server.start();
    fake.emit({
      type: "open-session",
      sessionId: "s-2",
      user: { id: "u-1", username: "op", role: "boss" },
    });
    await new Promise((r) => setTimeout(r, 100));
    expect(store.activeCount()).toBe(1);
    fake.emit({ type: "session-end", sessionId: "s-2", reason: "operator-end" });
    expect(store.activeCount()).toBe(0);
    server.stop();
  });

  it("bilinmeyen mesaj tipleri yok sayılır", () => {
    const fake = makeConnector();
    const store = new ContainerSessionStore(
      new JoseSignerForTests("container-secret-0123456789abcdef"),
    );
    const server = new ContainerSessionServer(fake.connector, store, undefined);
    server.start();
    fake.emit({ type: "stream-window", streamId: 1, credit: 10 });
    expect(fake.sent).toHaveLength(0);
    server.stop();
  });
});
