// packages/platform/logging/src/logger-config.ts

import type { LogLevel } from "@gd-monorepo/tamper-logger";
import type { ServiceTier } from "@gd-monorepo/shared-types";

/** Sink türleri — operational config'te ad tabanlı seçilir. */
export type LoggerSinkKind =
  | "console"
  | "file"
  | "timescale"
  | "syslog"
  | "webhook"
  | "smtp"
  | "sms";

/**
 * LoggerConfig — operational config (ConfigLoader'dan okunur).
 *
 * - `signingKeyPath`: imza anahtarı materyalinin YOLU (materyal değil —
 *   bootstrap core'daki `loadSigningKey` ile yükler; config dosyasında
 *   materyal tutulmaz).
 * - `sinks`: ad tabanlı sink listesi; somut sink üretimi servis wiring'inde.
 * - `filePath`: "file" sink'i için dosya yolu.
 */
export interface LoggerConfig {
  readonly level?: LogLevel;
  readonly sinks: LoggerSinkKind[];
  readonly filePath?: string;
  readonly redactionKeys?: string[];
  readonly batchSize?: number;
  readonly batchIntervalMs?: number;
  readonly ringBufferSize?: number;
  readonly signingKeyPath: string;
}

/**
 * Tier bazlı varsayılan log yapılandırması (GD-PMS platformu).
 * container/field/boss tier'ları platform katmanının bilgisidir — core'a
 * konmaz (bkz. docs/roadmap/platform-paket-yapisi.md).
 */
export const TIER_LOGGER_DEFAULTS: Record<ServiceTier, LoggerConfig> = {
  container: {
    level: "info",
    sinks: ["console", "file"],
    filePath: "/var/log/gd-pms/app.log",
    batchSize: 50,
    batchIntervalMs: 1000,
    ringBufferSize: 1024,
    signingKeyPath: "/etc/gd-pms/log-signing.key",
  },
  field: {
    level: "info",
    sinks: ["console", "file", "timescale"],
    filePath: "/var/log/gd-pms/app.log",
    batchSize: 50,
    batchIntervalMs: 1000,
    ringBufferSize: 2048,
    signingKeyPath: "/etc/gd-pms/log-signing.key",
  },
  boss: {
    level: "info",
    sinks: ["console", "file", "timescale"],
    filePath: "/var/log/gd-pms/app.log",
    batchSize: 50,
    batchIntervalMs: 1000,
    ringBufferSize: 2048,
    signingKeyPath: "/etc/gd-pms/log-signing.key",
  },
};

/** Tier varsayılanını override'larla birleştirir — yeni obje döner. */
export function loggerConfigForTier(
  tier: ServiceTier,
  overrides?: Partial<LoggerConfig>,
): LoggerConfig {
  return { ...TIER_LOGGER_DEFAULTS[tier], ...overrides };
}
