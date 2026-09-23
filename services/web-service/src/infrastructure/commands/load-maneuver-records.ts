// Tier manevra/operasyon kayıt yükleyicisi — maneuvers.json/operations.json
// (KOMUT-MANEVRA-OPERASYON §5: tier config dizini; fail-fast deseni).

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

/**
 * Sorgu — configDir içindeki maneuvers.json/operations.json kayıtlarını
 * yükler. Dosya VARSA ve bozuksa Error THROW (fail-fast — servis açılmaz,
 * §5); dosya YOKSA boş liste (kademeli — tier'da o katman olmayabilir).
 */
export function loadTierManeuverRecords(configDir: string): TierManeuverRecords {
  const maneuversPath = join(configDir, "maneuvers.json");
  const operationsPath = join(configDir, "operations.json");

  const maneuvers = existsSync(maneuversPath)
    ? loadManeuversFile(readFileSync(maneuversPath, "utf-8")).maneuvers
    : [];
  const operations = existsSync(operationsPath)
    ? loadOperationsFile(readFileSync(operationsPath, "utf-8")).operations
    : [];

  return { maneuvers, operations };
}
