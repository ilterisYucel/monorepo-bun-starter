import type { ITunnelChannel } from "@gd-monorepo/ws-tunnel";
import type { ISnapshotSource, TelemetryMessage } from "./messages";

/** Telemetri snapshot push yapılandırması. */
export interface TelemetrySnapshotPusherConfig {
  /** Push aralığı (ms) — açılışta env/sabit ile belirlenir. */
  intervalMs: number;
  /** Tünel bağlı mı — yoksa push atlanır (sorgu). */
  isConnected: () => boolean;
}

const DEFAULT_CONNECT_POLL_MS = 500;

/**
 * TelemetrySnapshotPusher — domain telemetri push'u (paket DIŞINDA).
 *
 * Paket yalnız transport taşır; bu sınıf bağlantı kurulunca kaynaktan snapshot
 * alıp `{ type:"telemetry", data }` kontrol mesajını jenerik kanaldan gönderir.
 * Wire şekli eskisiyle birebirdir.
 */
export class TelemetrySnapshotPusher {
  private timer?: ReturnType<typeof setInterval>;
  private connectPoll?: ReturnType<typeof setTimeout>;
  private stopped = false;

  constructor(
    private readonly channel: ITunnelChannel,
    private readonly source: ISnapshotSource,
    private readonly config: TelemetrySnapshotPusherConfig,
  ) {}

  /** Bağlantıyı bekler; kurulunca ilk push + periyodik push (komut). */
  start(): void {
    this.stopped = false;
    this.arm();
  }

  /** Zamanlayıcıları durdurur (komut). */
  stop(): void {
    this.stopped = true;
    if (this.timer) clearInterval(this.timer);
    if (this.connectPoll) clearTimeout(this.connectPoll);
    this.timer = undefined;
    this.connectPoll = undefined;
  }

  private arm(): void {
    if (this.stopped) return;
    if (!this.config.isConnected()) {
      this.connectPoll = setTimeout(() => this.arm(), DEFAULT_CONNECT_POLL_MS);
      return;
    }
    void this.push();
    this.timer = setInterval(() => void this.push(), this.config.intervalMs);
  }

  private async push(): Promise<void> {
    if (this.stopped || !this.config.isConnected()) return;
    try {
      const data = await this.source.snapshot();
      if (data.length === 0) return;
      const frame: TelemetryMessage = { type: "telemetry", data };
      this.channel.sendControl(frame);
    } catch {
      // Kademeli bozulma: snapshot hatası bağlantıyı etkilemez.
    }
  }
}
