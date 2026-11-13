// PeriodicWriteScheduler — genel periyodik yazım (SPEC DEVICE-SERVICE-SADELESTIRME UC-2).
//
// Sözleşme:
// - `counter` modunda değer her yazımda artar ve 0–255 arasında döner (LGES BSC 40000).
// - `fixed` modunda sabit `value` yazılır (PCS keepalive sınıfı).
// - `point` + `extraPoints` aynı değerle yazılır (40000–40009 her 1 s kuralı).
// - Yazım hatası yutulmaz ama servisi düşürmez — `onError`'a raporlanır; sonraki
//   periyot doğal retry'dır (K4).
// - `start()` / `stop()` idempotent; timer süreç içindedir (kuyruk kopukluğunda da yazar).

import type { IDevice, PeriodicWriteConfig, TelemetryData } from "@gd-monorepo/shared-types";

/** Zamanlayıcı girdisi — config'teki tek `periodicWrites` kaydı. */
export type PeriodicWriteSchedulerConfig = PeriodicWriteConfig;

export class PeriodicWriteScheduler {
  private timer: ReturnType<typeof setInterval> | undefined;
  private counter = 0;

  constructor(
    private readonly device: IDevice,
    private readonly deviceId: string,
    private readonly config: PeriodicWriteSchedulerConfig,
    private readonly onError?: (error: unknown) => void,
  ) {
    if (!Number.isInteger(config.intervalMs) || config.intervalMs <= 0) {
      throw new Error(`[PeriodicWriteScheduler] geçersiz intervalMs: ${String(config.intervalMs)}`);
    }
    if (config.mode === "fixed" && config.value === undefined) {
      throw new Error(`[PeriodicWriteScheduler] mode "fixed" için value zorunlu (${deviceId}/${config.point})`);
    }
  }

  /** Komut — periyodik yazımı başlatır (idempotent). */
  start(): void {
    if (this.timer !== undefined) return;
    this.timer = setInterval(() => {
      void this.write();
    }, this.config.intervalMs);
  }

  /** Komut — zamanlayıcıyı durdurur (idempotent). */
  stop(): void {
    if (this.timer !== undefined) clearInterval(this.timer);
    this.timer = undefined;
  }

  /** Komut — tek yazım; sayaç ilerler, hata `onError`'a gider (test edilebilir). */
  async write(): Promise<void> {
    this.counter = (this.counter + 1) % 256;
    const value = this.config.mode === "counter" ? this.counter : (this.config.value as number);
    const names = [this.config.point, ...(this.config.extraPoints ?? [])];
    const timestamp = new Date().toISOString();
    const points: TelemetryData[] = names.map((name) => ({
      deviceId: this.deviceId,
      name,
      description: "Periodic write",
      value,
      unit: "-",
      timestamp,
    }));
    try {
      await this.device.write(points);
    } catch (error) {
      this.onError?.(error);
    }
  }
}
