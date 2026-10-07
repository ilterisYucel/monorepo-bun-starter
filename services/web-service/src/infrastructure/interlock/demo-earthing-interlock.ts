import type { ITimeseriesDatabase } from "@gd-monorepo/core";
import type { TelemetryData } from "@gd-monorepo/shared-types";
import type {
  OperationPrecondition,
  OperationPreconditionVerdict,
} from "@gd-monorepo/platform-commands";

/**
 * I-1 toprak interlock (SPEC UC-10/T-27, FR-10.2..FR-10.3).
 *
 * Şarj/deşarj yürütmesinden önce DEMO-MV cihazının toprak ayırıcı durumunu
 * okur; toprak KAPALI ise reddeder (`interlock_earthed`). Telemetri yok/
 * okunamazsa nötr (izin) — kademeli (edge case). Yalnızca şarj/deşarj
 * adlarında devreye girer; diğer adımlar birebir (Open-Closed).
 */

const CHARGE_DISCHARGE = /charge|discharge/i;

export interface DemoEarthingInterlockConfig {
  mvDeviceId: string;
  earthingTelemetry: string[];
  latestLimit?: number;
}

const truthy = (v: unknown): boolean =>
  v === true || v === 1 || v === "1" || v === "true";

export class DemoEarthingInterlock {
  constructor(
    private readonly timescale: ITimeseriesDatabase,
    private readonly config: DemoEarthingInterlockConfig,
  ) {}

  /** Sorgu — ön koşul kararı (interlock). */
  async verdict(name: string): Promise<OperationPreconditionVerdict> {
    if (!CHARGE_DISCHARGE.test(name)) return { allowed: true };
    let rows: TelemetryData[];
    try {
      rows = await this.timescale.getLatestN(
        this.config.mvDeviceId,
        this.config.latestLimit ?? 50,
      );
    } catch {
      return { allowed: true };
    }
    const wanted = new Set(this.config.earthingTelemetry);
    const earthed = rows.some((r) => wanted.has(r.name) && truthy(r.value));
    return earthed ? { allowed: false, reason: "interlock_earthed" } : { allowed: true };
  }

  /** OperationExecutor preconditions hook'u (bağlı). */
  hook(): OperationPrecondition {
    return (_kind, name) => this.verdict(name);
  }
}
