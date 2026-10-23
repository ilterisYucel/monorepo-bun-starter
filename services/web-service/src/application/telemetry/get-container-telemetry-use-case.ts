import type { TelemetryData } from "@gd-monorepo/shared-types";
import type {
  ContainerTelemetryWindow,
  IContaTelemetryPort,
} from "../../domain/ports/container-telemetry";

/**
 * GetContainerTelemetryUseCase — field'ın konteyner telemetri sorguları (UC-2).
 *
 * - `latestSnapshot`: cache'teki son değerler (senkron; dış çağrı yok).
 * - `downsampled`: toplu tarihsel (kısmi hata kademeli).
 * - `historical`: tek konteyner (dış sözleşme aynı).
 */
export class GetContainerTelemetryUseCase {
  constructor(private readonly containers: IContaTelemetryPort) {}

  /** İzlenen konteyner kimlikleri (downsampled varsayılanı). */
  knownContainerIds(): string[] {
    return this.containers.containerIds();
  }

  latestSnapshot(): Record<string, TelemetryData[]> {
    const out: Record<string, TelemetryData[]> = {};
    for (const containerId of this.containers.containerIds()) {
      out[containerId] = this.containers.latestTelemetry(containerId);
    }
    return out;
  }

  async downsampled(
    containerIds: string[],
    params: ContainerTelemetryWindow,
  ): Promise<Record<string, TelemetryData[]>> {
    return this.containers.allHistorical(containerIds, params);
  }

  async historical(
    containerId: string,
    params: ContainerTelemetryWindow,
  ): Promise<TelemetryData[]> {
    const results = await this.containers.allHistorical([containerId], params);
    return results[containerId] ?? [];
  }
}
