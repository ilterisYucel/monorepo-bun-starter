// Manevra/Operasyon kayıt sözleşmeleri — SUNUCU tarafı (KOMUT-MANEVRA-
// OPERASYON-MIMARISI.md §5-§7, REV.02/REV.03).
//
// Kayıt DAVRANIŞ taşımaz: mode/onFailure/rollbackSteps yürütücünün (Faz B
// OperationExecutor) girdisidir; kayıt yalnızca veridir. Kayıtlar tier config
// dosyalarından (`maneuvers.json`/`operations.json`) fail-fast yüklenir:
// bozuk kayıt servis açılışını REDDEDER (rules.json deseni — §5).
//
// Komut adımı (REV.02 §5.1): hedef seçici `deviceId | deviceIds |
// deviceTypes` — TAM BİRİ zorunlu (çözümleme yürütme anında; `deviceTypes`
// çözümü yalnızca online+müsait cihazları içerir). Komut içeriği:
// `command` (config isimli) VEYA `telemetries` (ham yazımlar) — en az biri.
//
// Timer (REV.03 §10): `timer: { durationMs, stopCommand? }` — ana komut
// başarılı olduktan sonra stopCommand (varsayılan "stop") durationMs
// gecikmeyle planlanır (BullMQ delay; Faz B4).
//
// Rollback sözleşmesi (§7.1): `onFailure: "rollback"` istenmişse
// kompanzasyon adımları ZORUNLUDUR (manevrada `rollbackSteps`, operasyonda
// üst seviye `rollback`) — yoksa kayıt YÜKLEME anında reddedilir (fail-fast).

import { z } from "zod";
import type { CommandStep } from "./command";

// ============================================================================
// TİPLER
// ============================================================================

/** Adım içi komut zamanlayıcı (§10) — ana komut başarısından sonra durdurma. */
export interface CommandTimer {
  /** Gecikme süresi (ms, pozitif). */
  durationMs: number;
  /** Zamanlayıcı bitiminde çalışacak komut (config isimli, parametresiz). */
  stopCommand?: string;
}

/** Manevra kaydı UI meta verisi (§5) — yalnızca sunum; yürütücü KULLANMAZ. */
export interface ManeuverUi {
  inputs?: Array<Record<string, unknown>>;
  timer?: boolean;
  /** Adlandırılmış sunucu transform'u — şimdilik yalnızca "divideTotal" (§5.1). */
  transform?: "divideTotal";
  hidden?: boolean;
}

/** Manevra kaydı (§5) — tek sistem, 1+ cihaz. */
export interface ManeuverRecord {
  name: string;
  label: string;
  description?: string;
  mode: "parallel" | "sequential";
  onFailure?: "stop" | "continue" | "rollback";
  steps: CommandStep[];
  rollbackSteps?: CommandStep[];
  ui?: ManeuverUi;
}

/** Operasyon adımı (§6) — discriminant union. */
export type OperationStep =
  | { system: string; maneuver: string; params?: Record<string, unknown> }
  | { maneuver: string; params?: Record<string, unknown> }
  | {
      commands: CommandStep[];
      mode?: "parallel" | "sequential";
      onFailure?: "stop" | "continue";
      params?: Record<string, unknown>;
    };

/** Operasyon kaydı (§6) — 1+ sistem; uzak adım + yerel adım karışımı. */
export interface OperationRecord {
  name: string;
  label: string;
  description?: string;
  mode: "parallel" | "sequential";
  onFailure?: "stop" | "continue" | "rollback";
  steps: OperationStep[];
  /** Kompanzasyon adımları — onFailure "rollback" seçildiğinde zorunlu (§7.1). */
  rollback?: OperationStep[];
  /** Sunum meta verisi (manevra ui ile aynı sözleşme — Faz D2 UI kartları). */
  ui?: ManeuverUi;
}

/** maneuvers.json kökü (§5). */
export interface ManeuversFile {
  maneuvers: ManeuverRecord[];
}

/** operations.json kökü (§6). */
export interface OperationsFile {
  operations: OperationRecord[];
}

// ============================================================================
// ZOD ŞEMALARI (STRICT — bilinmeyen anahtar REDDEDİLİR; fail-fast)
// ============================================================================

const commandTimerSchema = z
  .object({
    durationMs: z.number().positive(),
    stopCommand: z.string().min(1).optional(),
  })
  .strict();

/**
 * Komut adımı şeması — REV.02 §5.1 seçici kuralı:
 * `deviceId | deviceIds | deviceTypes` TAM BİRİ; `command | telemetries`
 * en az biri. Bilinmeyen anahtar RED.
 */
export const commandStepSchema = z
  .object({
    deviceId: z.string().min(1).optional(),
    deviceIds: z.array(z.string().min(1)).min(1).optional(),
    deviceTypes: z.array(z.string().min(1)).min(1).optional(),
    command: z.string().min(1).optional(),
    telemetries: z
      .array(
        z
          .object({
            name: z.string().min(1),
            value: z.unknown(),
            unit: z.string().optional(),
          })
          .strict(),
      )
      .min(1)
      .optional(),
    params: z.record(z.unknown()).optional(),
    timer: commandTimerSchema.optional(),
  })
  .strict()
  .refine(
    (s) =>
      [s.deviceId, s.deviceIds, s.deviceTypes].filter((v) => v !== undefined)
        .length === 1,
    { message: "hedef secicilerden TAM BIRI zorunlu (deviceId|deviceIds|deviceTypes)" },
  )
  .refine((s) => s.command !== undefined || s.telemetries !== undefined, {
    message: "command veya telemetries en az biri zorunlu",
  });

const maneuverUiSchema = z
  .object({
    inputs: z.array(z.record(z.unknown())).optional(),
    timer: z.boolean().optional(),
    transform: z.enum(["divideTotal"]).optional(),
    hidden: z.boolean().optional(),
  })
  .strict();

export const maneuverRecordSchema = z
  .object({
    name: z.string().min(1),
    label: z.string().min(1),
    description: z.string().optional(),
    mode: z.enum(["parallel", "sequential"]),
    onFailure: z.enum(["stop", "continue", "rollback"]).optional(),
    steps: z.array(commandStepSchema).min(1),
    rollbackSteps: z.array(commandStepSchema).min(1).optional(),
    ui: maneuverUiSchema.optional(),
  })
  .strict()
  .refine(
    (m) => !(m.onFailure === "rollback" && m.rollbackSteps === undefined),
    {
      message:
        "onFailure 'rollback' secilmisse rollbackSteps ZORUNLU (§7.1 fail-fast)",
    },
  );

const operationStepBase = {
  params: z.record(z.unknown()).optional(),
};

const remoteOperationStepSchema = z
  .object({
    system: z.string().min(1),
    maneuver: z.string().min(1),
    ...operationStepBase,
  })
  .strict();

const localManeuverStepSchema = z
  .object({
    maneuver: z.string().min(1),
    ...operationStepBase,
  })
  .strict();

const localCommandsStepSchema = z
  .object({
    commands: z.array(commandStepSchema).min(1),
    mode: z.enum(["parallel", "sequential"]).optional(),
    onFailure: z.enum(["stop", "continue"]).optional(),
    ...operationStepBase,
  })
  .strict();

export const operationStepSchema = z.union([
  remoteOperationStepSchema,
  localManeuverStepSchema,
  localCommandsStepSchema,
]);

export const operationRecordSchema = z
  .object({
    name: z.string().min(1),
    label: z.string().min(1),
    description: z.string().optional(),
    mode: z.enum(["parallel", "sequential"]),
    onFailure: z.enum(["stop", "continue", "rollback"]).optional(),
    steps: z.array(operationStepSchema).min(1),
    rollback: z.array(operationStepSchema).min(1).optional(),
    ui: maneuverUiSchema.optional(),
  })
  .strict()
  .refine((o) => !(o.onFailure === "rollback" && o.rollback === undefined), {
    message:
      "onFailure 'rollback' secilmisse ust seviye rollback ZORUNLU (§7.1 fail-fast)",
  });

export const maneuversFileSchema = z
  .object({
    maneuvers: z.array(maneuverRecordSchema).min(1),
  })
  .strict();

export const operationsFileSchema = z
  .object({
    operations: z.array(operationRecordSchema).min(1),
  })
  .strict();

// ============================================================================
// FAIL-FAST YÜKLEYİCİLER
// ============================================================================

/**
 * Sorgu — maneuvers.json içeriğini STRICT doğrular; hata → Error THROW
 * (fail-fast açılış — §5; shared-types leaf pakettir, validateOrThrow
 * deseniyle düz Error fırlatır). Geçersiz JSON veya şema ihlali servis
 * açılışını durdurur.
 */
export function loadManeuversFile(raw: string): ManeuversFile {
  return parseOrThrow<ManeuversFile>(
    raw,
    maneuversFileSchema,
    "maneuvers.json",
  );
}

/**
 * Sorgu — operations.json içeriğini STRICT doğrular; hata → Error THROW
 * (fail-fast açılış — §6).
 */
export function loadOperationsFile(raw: string): OperationsFile {
  return parseOrThrow<OperationsFile>(
    raw,
    operationsFileSchema,
    "operations.json",
  );
}

function parseOrThrow<T>(
  raw: string,
  schema: z.ZodType<T>,
  fileName: string,
): T {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error(`[${fileName}] gecerli JSON degil`);
  }
  const parsed = schema.safeParse(data);
  if (!parsed.success) {
    const detail = parsed.error.issues
      .map((i) => `${i.path.join(".") || "(kok)"}: ${i.message}`)
      .join("; ");
    throw new Error(`[${fileName}] gecersiz: ${detail}`);
  }
  return parsed.data;
}
