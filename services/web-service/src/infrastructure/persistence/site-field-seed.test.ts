import { describe, it, expect, vi } from "vitest";
import type { ISqlDatabase } from "@gd-monorepo/core";
import { ensureSiteField } from "./site-field-seed";

/**
 * site-field-seed sözleşmesi (2026-08-28):
 * - Field tier açılışında `fields` tablosuna FIELD_ID satırı UPSERT edilir
 *   (ON CONFLICT DO NOTHING — mevcut satır bozulmaz, elle saha oluşturma gerekmez).
 * - İsim FIELD_NAME'den gelir; lokasyon varsayılan {lat:0,lng:0}.
 */
function makeDb() {
  const db = {
    connect: vi.fn(async () => {}),
    disconnect: vi.fn(async () => {}),
    execute: vi.fn(async (_sql: string, _params?: unknown[]) => {}),
    query: vi.fn(async () => []),
    queryOne: vi.fn(async () => undefined),
  } as unknown as ISqlDatabase;
  return db;
}

describe("ensureSiteField", () => {
  it("FIELD_ID + isim ile UPSERT çalıştırır (ON CONFLICT DO NOTHING)", async () => {
    const db = makeDb();
    await ensureSiteField(db, {
      fieldId: "5d5e49dc-7757-4f3e-a026-0263c2966bc6",
      fieldName: "Gunes Santrali",
    });

    expect(db.execute).toHaveBeenCalledTimes(1);
    const [sql, params] = (db.execute as ReturnType<typeof vi.fn>).mock
      .calls[0] as [string, unknown[]];
    expect(sql).toContain("INSERT INTO fields");
    expect(sql).toContain("ON CONFLICT (id) DO NOTHING");
    expect(params).toEqual([
      "5d5e49dc-7757-4f3e-a026-0263c2966bc6",
      "Gunes Santrali",
    ]);
  });

  it("boş isim yerine varsayılan kullanılmaz — config'in sorumluluğu", async () => {
    const db = makeDb();
    await ensureSiteField(db, { fieldId: "a-1", fieldName: "Saha" });
    const [, params] = (db.execute as ReturnType<typeof vi.fn>).mock
      .calls[0] as [string, unknown[]];
    expect(params[1]).toBe("Saha");
  });
});
