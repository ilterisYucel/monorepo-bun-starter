// HeartbeatWriter — periyodik artan-sayaç yazımı (LGES BSC 40000 Controller Heartbeat).
//
// C2B (Controller Data): 40000~40009 her 1 saniyede güncellenmelidir; aksi halde
// BSC ~20 sn sonra S-C LOC teşhisiyle tüm rack kontaktörlerini açar. Bu yazıcı
// config-driven'dır: telemetri adı ve aralık cihaz config'inden gelir.
//
// Sözleşme:
// - `start()` idempotent; `stop()` idempotent.
// - Sayaç her yazımda önce artırılır, 0-255 aralığında döner (doküman önerisi).
// - Yazım hatası yutulmaz ama servisi düşürmez — `onError` ile raporlanır
//   (bir sonraki tick doğal retry'dır).

import type { IDevice, TelemetryData } from "@gd-monorepo/shared-types";

/** Heartbeat yapılandırması — config'ten çözülür. */
export interface HeartbeatConfig {
  /** Holding telemetri adı (config telemetry[]'de HOLDING_REGISTER olmalı). */
  telemetry: string;
  /** Yazım aralığı (ms). */
  intervalMs: number;
  /**
   * Ek heartbeat telemetrileri (40001–40009 — C2B: 40000~40009 her 1 s
   * güncellenmeli). Aynı sayaç değeriyle yazılır.
   */
  extraTelemetries?: string[];
}

export class HeartbeatWriter {
  private timer: ReturnType<typeof setInterval> | undefined;
  private counter = 0;

  constructor(
    private readonly device: IDevice,
    private readonly deviceId: string,
    private readonly config: HeartbeatConfig,
    private readonly onError?: (error: unknown) => void,
  ) {}

  /** Komut — periyodik yazımı başlatır (idempotent). */
  start(): void {
    if (this.timer) return;
    this.timer = setInterval(() => {
      void this.writeBeat();
    }, this.config.intervalMs);
  }

  /** Komut — yazımı durdurur (idempotent). */
  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = undefined;
  }

  /**
   * Tek heartbeat yazımı — sayaç 0-255 döngüsü (query değil, yan etkili komut).
   * Test edilebilirlik için dışa açıktır; hata yutulmaz, `onError`'a gider.
   */
  async writeBeat(): Promise<void> {
    this.counter = (this.counter + 1) % 256;
    const names = [this.config.telemetry, ...(this.config.extraTelemetries ?? [])];
    const timestamp = new Date().toISOString();
    const points: TelemetryData[] = names.map((name) => ({
      deviceId: this.deviceId,
      name,
      description: "Controller Heartbeat",
      value: this.counter,
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
