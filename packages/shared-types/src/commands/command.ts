// Komut sözleşmeleri — cihazlara gönderilen komut tanımları ve adımları.

/** Komut parametresi (UI input → telemetry value mapping için template resolve) */
export interface CommandParam {
  type: "number" | "string" | "boolean";
  min?: number;
  max?: number;
  default?: unknown;
  required?: boolean;
  label?: string;
}

/** Konfigürasyondaki command tanımı */
export interface CommandConfig {
  label?: string;
  telemetries: Array<{ name: string; value: unknown; unit?: string }>;
  params?: Record<string, CommandParam>;
  atomic?: boolean;
  timeoutMs?: number;
  validate?: {
    minWaitMs?: number;
    reads: Array<{ name: string; expect: string | number | boolean }>;
  };
}

/** Adım içi komut zamanlayıcı — REV.03 §10 (bkz. maneuver.ts sözleşmesi). */
export interface CommandTimer {
  durationMs: number;
  stopCommand?: string;
}

/**
 * Komut adımı — REV.02 §5.1 hedef seçicisi:
 *
 * - `deviceId`: tek hedef (mevcut kullanım).
 * - `deviceIds`: açık liste (grup seçimi).
 * - `deviceTypes`: tip seçici — device config üst seviye `type` alanından;
 *   çözümleme yürütme anında, yalnızca online+müsait cihazlar (§5.1).
 *
 * Üçünden TAM BİRİ zorunludur (şema: commandStepSchema). `command` =
 * config isimli komut VEYA `telemetries` = ham yazımlar (en az biri).
 */
export interface CommandStep {
  deviceId?: string;
  deviceIds?: string[];
  deviceTypes?: string[];
  command?: string;
  telemetries?: Array<{ name: string; value: unknown; unit?: string }>;
  params?: Record<string, unknown>;
  timer?: CommandTimer;
}
