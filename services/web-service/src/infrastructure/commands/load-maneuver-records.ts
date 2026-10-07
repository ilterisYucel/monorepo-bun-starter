// Tier manevra/operasyon kayıt yükleyicisi — maneuvers.json/operations.json
// (KOMUT-MANEVRA-OPERASYON §5: tier config dizini; fail-fast deseni) + demo
// katalog dosyaları (SPEC DEMO-FIELD K8: `demo-maneuvers.json` /
// `demo-operations.json`, EKLEMELİ — dosya yoksa davranış birebir korunur).

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type {
  ManeuverRecord,
  OperationRecord,
} from "@gd-monorepo/shared-types";
import { loadManeuversFile, loadOperationsFile } from "@gd-monorepo/shared-types";

/** Tier kayıt seti — dosya yoksa boş (tier'da o katman olmayabilir). */
export interface TierManeuverRecords {
  maneuvers: ManeuverRecord[];
  operations: OperationRecord[];
}

/** Birincil + demo katalog dosya adları (demo dosyaları opsiyoneldir). */
const MANEUVER_FILES = ["maneuvers.json", "demo-maneuvers.json"];
const OPERATION_FILES = ["operations.json", "demo-operations.json"];

/**
 * Sorgu — configDir içindeki katalog dosyalarını yükler. Dosya VARSA ve
 * bozuksa Error THROW (fail-fast — servis açılmaz, §5); dosya YOKSA atlanır
 * (kademeli — demo dosyaları opsiyoneldir). Kayıtlar sırayla birleştirilir.
 */
export function loadTierManeuverRecords(configDir: string): TierManeuverRecords {
  const maneuvers: ManeuverRecord[] = [];
  const operations: OperationRecord[] = [];

  for (const file of MANEUVER_FILES) {
    const path = join(configDir, file);
    if (existsSync(path)) {
      maneuvers.push(...loadManeuversFile(readFileSync(path, "utf-8")).maneuvers);
    }
  }
  for (const file of OPERATION_FILES) {
    const path = join(configDir, file);
    if (existsSync(path)) {
      operations.push(...loadOperationsFile(readFileSync(path, "utf-8")).operations);
    }
  }

  return { maneuvers, operations };
}
