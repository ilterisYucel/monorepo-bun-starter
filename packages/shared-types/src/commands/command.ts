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

/** Tek bir cihaza gönderilecek komut adımı */
export interface CommandStep {
  deviceId: string;
  command?: string;
  telemetries?: Array<{ name: string; value: unknown; unit?: string }>;
  params?: Record<string, unknown>;
}
