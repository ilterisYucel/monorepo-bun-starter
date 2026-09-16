// ContainerProxy bağlantı durumunu synthetic MANAGEMENT telemetrisine
// çeviren observer (FIELD-MANEVRA-KATALOGU-REV01-MIMARISI.md §5 seçenek-a).

import type { IMessageQueue } from "@gd-monorepo/core";
import type { TelemetryData } from "@gd-monorepo/shared-types";
import type { PeerConnectionState } from "@gd-monorepo/ws-tunnel";
import type { ContainerObserver } from "@gd-monorepo/platform-container-access";

/** Durum → sayısal değer eşlemesi (kural girdisi — 0/1/2). */
const STATE_VALUES: Record<PeerConnectionState, number> = {
  idle: 0,
  connected: 1,
  stale: 2,
  error: 0,
};

/**
 * ContainerConnectionTelemetryPublisher — field tier PPC sinyal kaynağı.
 *
 * ContainerProxy `onConnectionChange` olayını synthetic MANAGEMENT job'ına
 * çevirir: `deviceId="field"`, telemetri `Container <id> Connection`,
 * value 0/1/2 (idle→0, connected→1, stale→2, error→0). Bu akış R-07/FL-07
 * kurallarının girdisidir; mevcut kuyruk kontratını bozmaz (yeni job tipi YOK).
 *
 * Yan etki sözleşmesi:
 * - Yayın best-effort'tur — addJob reddi loglanır ve yutulur; observer
 *   zinciri (SessionGateway/TunnelProxy) hiçbir koşulda kesilmez.
 * - onData/onControlMessage/onBinaryFrame no-op — bu sınıf yalnızca durum
 *   kaynağıdır (tünel çoğullaması başka observer'lardadır).
 */
export class ContainerConnectionTelemetryPublisher implements ContainerObserver {
  constructor(private readonly mq: IMessageQueue) {}

  onConnectionChange(containerId: string, state: PeerConnectionState): void {
    const telemetry: TelemetryData = {
      name: `Container ${containerId} Connection`,
      value: STATE_VALUES[state],
      unit: "",
      timestamp: new Date().toISOString(),
      deviceId: "field",
      description: `PPC baglanti durumu: ${state}`,
    };

    void this.mq
      .addJob({
        jobId: `field-ppc-${containerId}-${Date.now()}`,
        type: "MANAGEMENT",
        deviceId: "field",
        timestamp: telemetry.timestamp,
        telemetries: [telemetry],
      })
      .catch((error: unknown) => {
        console.warn(
          `[ContainerConnectionTelemetryPublisher] ${containerId} durumu kuyruga yazilamadi`,
          error,
        );
      });
  }

  onData(_containerId: string, _telemetries: TelemetryData[]): void {
    // yalnızca durum kaynağı — veri akışı başka observer'larda
  }
}
