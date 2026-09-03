import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

/**
 * RedisConnection sözleşmesi (2026-08-30 — T3 karakterizasyonu):
 * - URL: şifre varsa `redis://:pass@host:port`, database parametresi ile.
 * - connect: yalnızca bağlı DEĞİLKEN client.connect çağrılır (tekrar çağrı
 *   no-op); disconnect: yalnızca bağlıyken quit.
 * - ping: PONG → true; hata → false (throw DEĞİL — kademeli bozulma).
 * - isReady: bağlantı + client.isReady ikisi birden.
 */

const clientMock = vi.hoisted(() => ({
  on: vi.fn(),
  connect: vi.fn().mockResolvedValue(undefined),
  quit: vi.fn().mockResolvedValue(undefined),
  ping: vi.fn().mockResolvedValue("PONG"),
  isReady: false,
}));

const createClient = vi.hoisted(() => vi.fn());

vi.mock("redis", () => ({
  createClient: (...args: unknown[]) => {
    createClient(...args);
    return clientMock;
  },
}));

import { RedisConnection } from "./redis";

beforeEach(() => {
  vi.clearAllMocks();
  clientMock.isReady = false;
  clientMock.ping.mockResolvedValue("PONG");
  createClient.mockClear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("RedisConnection (T3)", () => {
  it("şifresiz config: URL redis://host:port + database opsiyonu", () => {
    new RedisConnection({ host: "redis.local", port: 6379, db: 2 });
    expect(createClient).toHaveBeenCalledWith({
      url: "redis://redis.local:6379",
      database: 2,
    });
  });

  it("şifreli config: URL şifre taşır", () => {
    new RedisConnection({ host: "h", port: 6379, password: "s3cret" });
    expect(createClient).toHaveBeenCalledWith(
      expect.objectContaining({ url: "redis://:s3cret@h:6379" }),
    );
  });

  it("connect yalnızca bir kez client.connect çağırır (idempotent)", async () => {
    const conn = new RedisConnection({ host: "h", port: 6379 });
    await conn.connect();
    await conn.connect();
    expect(clientMock.connect).toHaveBeenCalledTimes(1);
    expect(conn.isReady()).toBe(false); // client.isReady false — bağlı değil
    clientMock.isReady = true;
    expect(conn.isReady()).toBe(true);
  });

  it("disconnect yalnızca bağlıyken quit çağırır", async () => {
    const conn = new RedisConnection({ host: "h", port: 6379 });
    await conn.disconnect();
    expect(clientMock.quit).not.toHaveBeenCalled();

    await conn.connect();
    await conn.disconnect();
    expect(clientMock.quit).toHaveBeenCalledTimes(1);
  });

  it("ping PONG → true", async () => {
    const conn = new RedisConnection({ host: "h", port: 6379 });
    expect(await conn.ping()).toBe(true);
  });

  it("ping hatası → false (throw DEĞİL — kademeli bozulma)", async () => {
    clientMock.ping.mockRejectedValue(new Error("down"));
    const conn = new RedisConnection({ host: "h", port: 6379 });
    expect(await conn.ping()).toBe(false);
  });

  it("connectionConfig yapılandırmayı döner", () => {
    const conn = new RedisConnection({ host: "h", port: 6379, db: 1 });
    expect(conn.connectionConfig()).toEqual({ host: "h", port: 6379, db: 1 });
  });

  it("client ham redis client'ı döner", () => {
    const conn = new RedisConnection({ host: "h", port: 6379 });
    expect(conn.client()).toBe(clientMock);
  });
});
