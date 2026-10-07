// OperationExecutor sözleşmeleri — manevra/operasyon yürütücüsü bağımlılıkları.
// Kaynak tasarım: KOMUT-MANEVRA-OPERASYON-MIMARISI.md §3-§8.

import type { CommandStep, CommandTimer } from "@gd-monorepo/shared-types";

/** Çözümlenmiş komut adımı — seçiciler somut deviceId'lere inmiştir (§5.1). */
export interface ResolvedCommandStep {
  deviceId: string;
  command?: string;
  telemetries?: Array<{ name: string; value: unknown; unit?: string }>;
  params?: Record<string, unknown>;
  timer?: CommandTimer;
}

/** Tek komut adımının sonucu. */
export interface CommandStepResult {
  deviceId: string;
  command?: string;
  success: boolean;
  reason?: string;
}

/**
 * Yerel komut kanalı (ICommandChannel) — yürütücünün tek komut hattı
 * bağımlılığı. Production implementasyonu CommandJobBuilder + IMessageQueue
 * ile kurulur (command-routes deseni); yürütücü BullMQ/HTTP BİLMEZ.
 */
export interface ICommandChannel {
  /** Komut — tek cihaz adımını çalıştırır ve sonucunu döner. */
  execute(step: ResolvedCommandStep): Promise<CommandStepResult>;
  /** Komut — zamanlı stop adımını delay ile planlar (best-effort §10). */
  schedule(step: ResolvedCommandStep, delayMs: number): Promise<void>;
}

/**
 * Cihaz hedef çözümleyici (§5.1) — `deviceTypes` seçicisini online+müsait
 * cihaz listesine çevirir; açık `deviceIds` listesini aynı müsaitlik
 * filtresinden geçirir. Production implementasyonu web-service devices
 * tablosu üzerinden çalışır (RealtimeSnapshotSource deseni — status='online'
 * + unavailable/fault/bakım hariç); yürütücü kaynak BİLMEZ.
 */
export interface ICommandTargetResolver {
  /** Sorgu — tipteki online+müsait cihaz kimlikleri. */
  resolveAvailable(type: string): Promise<string[]>;
  /** Sorgu — listeden yalnızca online+müsait olanları döner (§5.1). */
  filterAvailable(ids: string[]): Promise<string[]>;
}

/** Operasyon koşusu taslağı — kalıcılık girdisi (§8). */
export interface OperationRunDraft {
  id: string;
  kind: "maneuver" | "operation";
  name: string;
  trigger: string;
  createdBy: string;
  traceId?: string;
  startedAt: string;
  steps: unknown;
}

/** Operasyon koşusu terminal durumları (§8). */
export type OperationRunStatus =
  | "completed"
  | "failed"
  | "rolled_back"
  | "rejected";

/** Kalıcı koşu kaydı — `operation_runs` satırı (§8 okuma uçları). */
export interface OperationRunRecord {
  id: string;
  kind: "maneuver" | "operation";
  name: string;
  trigger: string;
  status: "running" | "completed" | "failed" | "rolled_back";
  steps: unknown;
  startedAt: string;
  finishedAt: string | null;
  createdBy: string;
  traceId: string | null;
}

/**
 * Kalıcılık deposu (IOperationRunStore) — `operation_runs` tablosu (§8).
 * - `begin`: FAIL-CLOSED — running satırı yazılamazsa yürütme REDDEDİLİR
 *   (throw ile reddeder; yürütücü rejected'e düşer).
 * - `finish`: best-effort — terminal durum yazılamazsa yürütücü yine de
 *   sonucu döner ve `operation_state_update_failed` audit'i basar.
 * - Okuma uçları (§8): tek koşu + son N listesi (REST rotaları).
 */
export interface IOperationRunStore {
  /** Komut — koşuyu running olarak kalıcılaştırır; hata → throw (fail-closed). */
  begin(run: OperationRunDraft): Promise<void>;
  /** Komut — koşuyu terminal duruma taşır; hata → throw (çağıran best-effort). */
  finish(id: string, status: OperationRunStatus, finishedAt: string): Promise<void>;
  /** Sorgu — tek koşu; yoksa undefined. */
  findById(id: string): Promise<OperationRunRecord | undefined>;
  /** Sorgu — en yeni koşular (startedAt DESC). */
  listRecent(limit: number): Promise<OperationRunRecord[]>;
}

/** Operasyon adımı sonucu — makine-okunur özet (WS-TUNNEL §6 uyumlu). */
export interface OperationStepOutcome {
  stepIndex: number;
  system?: string;
  maneuver?: string;
  deviceId?: string;
  command?: string;
  success: boolean;
  reason?: string;
}

/** Yürütme sonucu — isteyene dönüş (§8). */
export interface OperationRunResult {
  runId: string;
  kind: "maneuver" | "operation";
  name: string;
  status: OperationRunStatus;
  outcomes: OperationStepOutcome[];
  /** Red sebebi — yalnızca status === "rejected" iken taşınır. */
  reason?: string;
}

/**
 * Admin tanımlı kayıt (operation_defs satırı — §11.1).
 */
export interface OperationDefinition {
  name: string;
  kind: "maneuver" | "operation";
  /** Kayıt gövdesi — ManeuverRecord/OperationRecord şemasıyla birebir. */
  definition: unknown;
  enabled: boolean;
  updatedBy: string;
  updatedAt: string;
  createdAt: string;
}

/**
 * DB kaynak sözleşmesi (§11.1) — admin tanımlı kayıtların OKUMA deposu.
 * Hibrit registry'nin `source` bağımlılığıdır.
 */
export interface IOperationDefSource {
  /** Sorgu — (kind, name) kaydı; yoksa undefined. */
  findByKindAndName(
    kind: "maneuver" | "operation",
    name: string,
  ): Promise<OperationDefinition | undefined>;
  /** Sorgu — türdeki tüm kayıtlar (enabled bayrağıyla). */
  listByKind(kind: "maneuver" | "operation"): Promise<OperationDefinition[]>;
}

/**
 * Admin tanım deposu (IOperationDefinitionStore) — §11.2 tanım YÖNETİMİ.
 * `OperationDefStore` (PG) implemente eder; `IOperationDefSource`'un yazma
 * tarafı genişlemesidir.
 */
export interface IOperationDefinitionStore extends IOperationDefSource {
  /**
   * Komut — yeni kayıt oluşturur; (kind, name) zaten varsa THROW
   * (rota 409 üretir).
   */
  create(
    kind: "maneuver" | "operation",
    definition: unknown,
    updatedBy: string,
  ): Promise<void>;
  /**
   * Komut — kaydı günceller (upsert — PUT "ek kısıt getirmez" §11.2).
   */
  update(
    kind: "maneuver" | "operation",
    name: string,
    definition: unknown,
    updatedBy: string,
  ): Promise<void>;
  /**
   * Komut — yumuşak silme/devre dışı bırakma (enabled bayrağı, §11.2);
   * kayıt yoksa THROW.
   */
  setEnabled(
    kind: "maneuver" | "operation",
    name: string,
    enabled: boolean,
    updatedBy: string,
  ): Promise<void>;
}

/**
 * Uzak komut kanalı (IRemoteCommandChannel) — Faz C: başka sistemde manevra
 * ÇALIŞTIRMA sözleşmesi (§6 uzak adım). Field tier implementasyonu tünel
 * proxy'si üzerinden konteynerin kendi manevra yürütücüsüne gider
 * (field-container-commands deseni); yürütücü taşıma katmanını BİLMEZ.
 */
export interface IRemoteCommandChannel {
  /**
   * Komut — hedef sistemde manevrayı çalıştırır. `ok: false` durumları:
   * sistem erişilemez (system_unreachable), kayıt yok, yürütme hatası —
   * best-effort çağıran (rollback) aynı sözleşmeyi kullanır.
   */
  execute(
    system: string,
    maneuver: string,
    params?: Record<string, unknown>,
    timer?: { durationSeconds: number },
  ): Promise<{ ok: boolean; reason?: string }>;
}
