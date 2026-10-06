// services/device-service/src/ops-log.ts
//
// Operasyonel log kanalı (DEVICE-SERVICE-MIMARISI UC-6) — imzasız
// `@gd-monorepo/logger`. Logger yoksa (K4) eski console davranışı BİREBİR korunur.
// Audit/alarm/security geçişleri bu kanaldan GEÇMEZ (TamperLogger'da kalır).

import type { Logger } from "@gd-monorepo/logger";

/** Operasyonel log yüzeyi — logger varsa logger'a, yoksa console'a yazar. */
export interface OpsLog {
  info(message: string, context?: Record<string, unknown>): void;
  warn(message: string, context?: Record<string, unknown>): void;
  error(message: string, context?: Record<string, unknown>): void;
}

/**
 * Bir bileşen için operasyonel logger üretir. `logger` verilmezse `[component]`
 * prefix'li console fallback kullanılır (UC-6 FR-6.3 / AK-6.3).
 */
export function createOpsLog(logger: Logger | undefined, component: string): OpsLog {
  const child = logger?.child(component);
  const prefix = `[${component}]`;
  return {
    info: (message, context) => {
      if (child) child.info(message, context);
      else if (context === undefined) console.log(`${prefix} ${message}`);
      else console.log(`${prefix} ${message}`, context);
    },
    warn: (message, context) => {
      if (child) child.warn(message, context);
      else if (context === undefined) console.warn(`${prefix} ${message}`);
      else console.warn(`${prefix} ${message}`, context);
    },
    error: (message, context) => {
      if (child) child.error(message, context);
      else if (context === undefined) console.error(`${prefix} ${message}`);
      else console.error(`${prefix} ${message}`, context);
    },
  };
}
