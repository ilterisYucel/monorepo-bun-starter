import type { ISqlDatabase } from "@gd-monorepo/core";

/** Site kimliği — env'den saha (field tier için tek saha modeli). */
export interface SiteFieldConfig {
  fieldId: string;
  fieldName: string;
}

/**
 * Field tier açılışında `fields` tablosuna env'deki FIELD_ID satırını UPSERT
 * eder (ON CONFLICT DO NOTHING). Böylece tek saha kurulumunda elle
 * `POST /api/fields` çağrısı GEREKMEZ — saha kaydı açılışta hazırdır.
 *
 * Şart: `ensureSchema` (field-routes.ts) bu fonksiyondan ÖNCE çalışmış olmalı —
 * `index.ts` çağrıyı `server.start()` sonrasına koyar.
 */
export async function ensureSiteField(
  db: ISqlDatabase,
  config: SiteFieldConfig,
): Promise<void> {
  await db.execute(
    `INSERT INTO fields (id, name, location)
     VALUES ($1, $2, '{"lat":0,"lng":0}'::jsonb)
     ON CONFLICT (id) DO NOTHING`,
    [config.fieldId, config.fieldName],
  );
}
