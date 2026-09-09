import { describe, it, expect, vi } from "vitest";
import type { ISqlDatabase } from "@gd-monorepo/core";
import { WgHostStore } from "./wg-host-store";

/**
 * WgHostStore sözleşmesi (Faz 4):
 * - PSK yazılır ama list/create/update çıktılarına GİRMEZ (write-only secret).
 */

function makeSql(rows: unknown[] = []): ISqlDatabase {
  return {
    execute: vi.fn().mockResolvedValue(undefined),
    query: vi.fn().mockResolvedValue(rows),
    queryOne: vi.fn().mockResolvedValue(undefined),
    health: vi.fn().mockResolvedValue(true),
    disconnect: vi.fn().mockResolvedValue(undefined),
  } as unknown as ISqlDatabase;
}

const row = {
  id: "w-1",
  name: "wg-ist-1",
  endpoint: "5.5.5.5:51820",
  public_key: "pub-key",
  psk: "super-secret-psk",
  created_at: "2026-09-07T00:00:00Z",
  updated_at: "2026-09-07T00:00:00Z",
};

describe("WgHostStore (Faz 4)", () => {
  it("list çıktısında psk alanı YOKTUR", async () => {
    const sql = makeSql([row]);
    const store = new WgHostStore(sql);
    const hosts = await store.list();
    expect(hosts[0]?.name).toBe("wg-ist-1");
    expect("psk" in (hosts[0] ?? {})).toBe(false);
  });

  it("create PSK'yı SQL'e yazar ama çıktıya düşürür", async () => {
    const sql = makeSql();
    (sql.queryOne as ReturnType<typeof vi.fn>).mockResolvedValue(row);
    const store = new WgHostStore(sql);
    const host = await store.create({
      name: "wg-ist-1",
      endpoint: "5.5.5.5:51820",
      publicKey: "pub-key",
      psk: "super-secret-psk",
    });
    const insertCall = (sql.queryOne as ReturnType<typeof vi.fn>).mock.calls[0] as [string, unknown[]];
    expect(insertCall[1][3]).toBe("super-secret-psk");
    expect("psk" in host).toBe(false);
  });

  it("byIdWithPsk iç kullanım için PSK döner (yalnızca bağlantı kurarken)", async () => {
    const sql = makeSql();
    (sql.queryOne as ReturnType<typeof vi.fn>).mockResolvedValue(row);
    const store = new WgHostStore(sql);
    const full = await store.byIdWithPsk("w-1");
    expect(full?.psk).toBe("super-secret-psk");
  });

  it("remove DELETE çalıştırır", async () => {
    const sql = makeSql();
    const store = new WgHostStore(sql);
    await store.remove("w-1");
    expect(sql.execute).toHaveBeenCalledWith(
      "DELETE FROM wg_hosts WHERE id = $1",
      ["w-1"],
    );
  });
});
