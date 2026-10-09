import type { TelemetryData } from "@gd-monorepo/shared-types";
import type { WritePolicy } from "./write-policy";

/** (deviceId, name) başına son kuyruklanan değer ve zaman. */
interface WrittenState {
  readonly value: number;
  readonly at: number;
}

/**
 * TelemetryWriteFilter — WRITE_TELEMETRY job'una girecek telemetriyi belirler.
 *
 * Sözleşme (CQS):
 * - `select` **query**: state okur, DEĞİŞTİRMEZ; yazılması gereken alt kümeyi (girdi sırasıyla) döner.
 * - `markWritten` **command**: yalnız başarılı **enqueue** sonrası çağrılır; state'i günceller (`void`).
 *
 * Politika (`name → {deadband, maxStaleMs}`) device başına verilir; politikasız isimler
 * her zaman yazılır (mevcut davranış). Kural:
 * - state yok → yaz (ilk/restart)
 * - |yeni − son| >= deadband → yaz
 * - değişmedi ve now − son.at >= maxStaleMs → yaz (TTL; son kuyruklanandan)
 * - aksi halde yazma
 *
 * Sayısal olmayan değerler politikalı isimde güvenli tarafta yazılır (değişim sayılır).
 * Mutable by design (state makinesi); `now` test için enjekte edilebilir.
 */
export class TelemetryWriteFilter {
  private readonly state: Map<string, Map<string, WrittenState>> = new Map();

  constructor(private readonly now: () => number = () => Date.now()) {}

  select(
    deviceId: string,
    telemetries: readonly TelemetryData[],
    policies: ReadonlyMap<string, WritePolicy>,
  ): TelemetryData[] {
    const deviceState = this.state.get(deviceId);
    const now = this.now();
    const out: TelemetryData[] = [];

    for (const t of telemetries) {
      const policy = policies.get(t.name);
      if (policy === undefined) {
        out.push(t);
        continue;
      }

      const value = numericValue(t.value);
      const last = deviceState?.get(t.name);

      if (last === undefined || value === undefined) {
        out.push(t);
        continue;
      }
      if (Math.abs(value - last.value) >= policy.deadband) {
        out.push(t);
        continue;
      }
      if (now - last.at >= policy.maxStaleMs) {
        out.push(t);
      }
    }

    return out;
  }

  markWritten(deviceId: string, telemetries: readonly TelemetryData[]): void {
    let deviceState = this.state.get(deviceId);
    if (deviceState === undefined) {
      deviceState = new Map();
      this.state.set(deviceId, deviceState);
    }
    const now = this.now();
    for (const t of telemetries) {
      const value = numericValue(t.value);
      if (value === undefined) continue;
      deviceState.set(t.name, { value, at: now });
    }
  }
}

function numericValue(value: TelemetryData["value"]): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}
