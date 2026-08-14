import type { PostgresConfig } from "./postgres";

/**
 * Servis seviyesinde global konfigürasyon dosyasının yapısı.
 * Konfigürasyon dizininde service.{json,toml,yaml} ismiyle bulunur.
 */
export interface ServiceConfigFile {
  redis: { host: string; port: number; password?: string; db?: number };
  postgresql?: PostgresConfig;
  servicePollIntervalMs?: number;
  workerConcurrency?: number;
  managementIntervalMs?: number;
}
