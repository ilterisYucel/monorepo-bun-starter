import { describe, it, expect, vi } from "vitest";
import type { ISqlDatabase } from "@gd-monorepo/core";
import { NotFoundError } from "@gd-monorepo/result";
import { WgHostStore } from "./wg-host-store";
import { WireGuardConnection } from "./wireguard-connection";
import type { IWireGuardDriver } from "./wireguard-driver";

/**
 * WireGuardConnection sözleşmesi (Faz 4):
 * - connect: driver.up (PSK'lı config) + opsiyonel prob; hata üste taşınır
 * - disconnect: driver.down (idempotent)
 * - status: driver.status
 * - removeHost: önce down sonra DELETE
 * - yoksa NotFoundError (kind not_found)
 */

const ROW = {
  id: "w-1",
  name: "wg-ist-1",
  endpoint: "5.5.5.5:51820",
  public_key: "pub-key",
  psk: "super-secret-psk",
  created_at: "",
  updated_at: "",
};

function makeSql() {
  return {
    execute: vi.fn().mockResolvedValue(undefined),
    query: vi.fn().mockResolvedValue([]),
    queryOne: vi.fn().mockResolvedValue(undefined),
    health: vi.fn().mockResolvedValue(true),
    disconnect: vi.fn().mockResolvedValue(undefined),
  } as unknown as ISqlDatabase;
}

function makeDriver(overrides: Partial<IWireGuardDriver> = {}): IWireGuardDriver {
  return {
    up: vi.fn().mockResolvedValue(undefined),
    down: vi.fn().mockResolvedValue(undefined),
    status: vi.fn().mockResolvedValue("up"),
    ...overrides,
  };
}

const CONFIG = {
  clientPrivateKey: "client-priv",
  clientAddress: "10.99.0.2/32",
  allowedIps: "10.0.0.0/8",
  configDir: "/tmp/wg-test",
};

function makeConnection(driver: IWireGuardDriver, sql: ISqlDatabase) {
  return new WireGuardConnection(new WgHostStore(sql), driver, CONFIG, undefined);
}

describe("WireGuardConnection (Faz 4)", () => {
  it("connect driver.up'ı PSK'lı peer config'iyle çağırır", async () => {
    const sql = makeSql();
    (sql.queryOne as ReturnType<typeof vi.fn>).mockResolvedValue(ROW);
    const driver = makeDriver();
    const connection = makeConnection(driver, sql);
    const state = await connection.connect("w-1");
    expect(state.state).toBe("up");
    expect(driver.up).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "wg-ist-1",
        endpoint: "5.5.5.5:51820",
        psk: "super-secret-psk",
        clientPrivateKey: "client-priv",
      }),
    );
  });

  it("disconnect idempotent down döner", async () => {
    const sql = makeSql();
    (sql.queryOne as ReturnType<typeof vi.fn>).mockResolvedValue(ROW);
    const driver = makeDriver();
    const connection = makeConnection(driver, sql);
    const state = await connection.disconnect("w-1");
    expect(state.state).toBe("down");
    expect(driver.down).toHaveBeenCalledWith("wg-ist-1");
  });

  it("removeHost önce down sonra siler", async () => {
    const sql = makeSql();
    (sql.queryOne as ReturnType<typeof vi.fn>).mockResolvedValue(ROW);
    const driver = makeDriver();
    const connection = makeConnection(driver, sql);
    await connection.removeHost("w-1");
    expect(driver.down).toHaveBeenCalledWith("wg-ist-1");
    expect(sql.execute).toHaveBeenCalledWith(
      "DELETE FROM wg_hosts WHERE id = $1",
      ["w-1"],
    );
  });

  it("yoksa NotFoundError (kind not_found)", async () => {
    const sql = makeSql();
    const connection = makeConnection(makeDriver(), sql);
    await expect(connection.connect("yok")).rejects.toMatchObject({
      kind: "not_found",
    });
  });

  it("driver.up hatası üste taşınır (kademeli bozulma — state düşmez)", async () => {
    const sql = makeSql();
    (sql.queryOne as ReturnType<typeof vi.fn>).mockResolvedValue(ROW);
    const driver = makeDriver({
      up: vi.fn().mockRejectedValue(new Error("wg-quick yok")),
    });
    const connection = makeConnection(driver, sql);
    await expect(connection.connect("w-1")).rejects.toThrow("wg-quick yok");
  });
});
