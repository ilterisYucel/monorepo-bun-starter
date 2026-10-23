import type { TelemetryData } from "@gd-monorepo/shared-types";

/**
 * Konteyner telemetri portu (domain) — SPEC WEB-SERVICE-KATMANLAMA UC-2/K10.
 *
 * Framework/infra bilmez: hub istemcisi, cache, presence ayrıntıları adaptörde
 * (`HubContainerView`, field tier) yaşar. Tüketiciler (use-case'ler) yalnız bu
 * yüzeyi görür.
 */

/** Peer bağlantı durumu — hub modunda "stale" dahil. */
export type ContainerConnectionState = "idle" | "connected" | "stale" | "error";

/** Tarihsel sorgu penceresi (DownsampleOptions'ın domain görünümü). */
export interface ContainerTelemetryWindow {
  from: Date;
  to: Date;
  points?: number;
  names?: string[];
  tag?: string;
}

export interface IContaTelemetryPort {
  /** Bağlı/izlenen konteyner kimlikleri. */
  containerIds(): string[];
  /** Son bilinen telemetri (cache peek; hiç çekilmediyse boş). */
  latestTelemetry(containerId: string): TelemetryData[];
  /** Talep-üzeri taze snapshot (adaptörde kısa TTL cache). */
  latestQuery(
    containerId: string,
    options?: { names?: string[]; windowMs?: number },
  ): Promise<TelemetryData[]>;
  /** Tek konteyner tarihsel (downsampled). */
  historical(
    containerId: string,
    params: ContainerTelemetryWindow,
  ): Promise<TelemetryData[]>;
  /** Toplu tarihsel — hata alan konteyner sonuçtan düşer (kademeli). */
  allHistorical(
    containerIds: string[],
    params: ContainerTelemetryWindow,
  ): Promise<Record<string, TelemetryData[]>>;
  connectionStatus(): Map<string, ContainerConnectionState>;
  lastSeenAt(containerId: string): number | undefined;
}
