// ManeuverRegistry — maneuvers.json/operations.json + DB kayıtlarının
// HİBRİT kayıt defteri (§11.1: DB kaydı > dosya kaydı).
// Kaynak tasarım: KOMUT-MANEVRA-OPERASYON-MIMARISI.md §4, §5, §6, §11.1.

import { Result } from "@gd-monorepo/result";
import type {
  ManeuverRecord,
  OperationRecord,
} from "@gd-monorepo/shared-types";
import type { IOperationDefSource } from "./operation-executor-contracts";

/** Registry çözümleme hatası — kademeli bozulma için ayrıştırılabilir. */
export type ManeuverRegistryError =
  | { kind: "not_found"; recordType: "maneuver" | "operation"; name: string }
  | { kind: "disabled"; recordType: "maneuver" | "operation"; name: string };

/** ManevraRegistry yapılandırması — tek obje (DI kuralı 3). */
export interface ManeuverRegistryConfig {
  /** maneuvers.json kayıtları — loadManeuversFile çıktısı (fail-fast doğrulandı). */
  maneuvers?: ManeuverRecord[];
  /** operations.json kayıtları — loadOperationsFile çıktısı (fail-fast doğrulandı). */
  operations?: OperationRecord[];
  /** DB kaynak (§11.1) — verilirse çözümleme DB > dosya sırasıyla yapılır. */
  source?: IOperationDefSource;
}

/**
 * ManeuverRegistry — DAVRANIŞSIZ HİBRİT kayıt defteri (§4, §11.1).
 *
 * Sözleşme (test: maneuver-registry.test.ts):
 * - `resolve(kind, name)` SORGUSU: DB kaydı (enabled → ok; disabled →
 *   err({kind:"disabled"})); DB yoksa dosya kaydı; o da yoksa
 *   err({kind:"not_found"}) — throw YOK (beklenen durum).
 * - `list(kind)` SORGUSU: enabled DB kayıtları + DB'de GÖLGELENMEYEN dosya
 *   kayıtları (DB > dosya önceliği).
 * - Manevra ve operasyon AYRI ad uzaylarıdır; aynı türde mükerrer DOSYA
 *   ismi kurulumda THROW (DB'de (kind, name) PK).
 * - Kayıtlar DAVRANIŞ taşımaz: yürütme yürütücünün işidir.
 * - Yan etki YOK (kaynak sorguları dışında).
 */
export class ManeuverRegistry {
  private readonly maneuvers = new Map<string, ManeuverRecord>();
  private readonly operations = new Map<string, OperationRecord>();
  private readonly source: IOperationDefSource | undefined;

  constructor(config: ManeuverRegistryConfig) {
    for (const record of config.maneuvers ?? []) {
      this.register(this.maneuvers, record, "maneuver");
    }
    for (const record of config.operations ?? []) {
      this.register(this.operations, record, "operation");
    }
    this.source = config.source;
  }

  private register<T extends { name: string }>(
    index: Map<string, T>,
    record: T,
    recordType: "maneuver" | "operation",
  ): void {
    if (index.has(record.name)) {
      throw new Error(
        `[ManeuverRegistry] ${recordType} kaydi mukerrer isim: ${record.name}`,
      );
    }
    index.set(record.name, record);
  }

  /**
   * Sorgu — kaydı isimle çözer (DB > dosya). Bilinmeyen isim → not_found;
   * devre dışı DB kaydı → disabled; bilinen kayıt → ok(kayıt).
   */
  async resolve(
    kind: "maneuver" | "operation",
    name: string,
  ): Promise<Result<ManeuverRecord | OperationRecord, ManeuverRegistryError>> {
    if (this.source) {
      const dbRecord = await this.source.findByKindAndName(kind, name);
      if (dbRecord) {
        return dbRecord.enabled
          ? Result.ok(dbRecord.definition)
          : Result.err({ kind: "disabled", recordType: kind, name });
      }
    }
    const index = kind === "maneuver" ? this.maneuvers : this.operations;
    const record = index.get(name);
    if (!record) {
      return Result.err({ kind: "not_found", recordType: kind, name });
    }
    return Result.ok(record);
  }

  /**
   * Sorgu — türdeki görünür kayıtlar: enabled DB kayıtları + DB'de
   * GÖLGELENMEYEN dosya kayıtları (UI liste ucu — §4). Devre dışı DB kaydı
   * dosya kaydını da GÖLGELER (resolve ile tutarlı — disable dosyaya
   * düşürmez, §11.2 UC-5).
   */
  async list(
    kind: "maneuver" | "operation",
  ): Promise<Array<ManeuverRecord | OperationRecord>> {
    const dbAll = this.source
      ? await this.source.listByKind(kind)
      : [];
    const dbNames = new Set(dbAll.map((d) => d.name));
    const dbRecords = dbAll
      .filter((d) => d.enabled)
      .map((d) => d.definition);
    const index = kind === "maneuver" ? this.maneuvers : this.operations;
    const fileOnly = [...index.values()].filter((r) => !dbNames.has(r.name));
    return [...dbRecords, ...fileOnly];
  }
}
