import { readFileSync, existsSync, readdirSync, statSync } from "fs";
import { join, extname } from "path";
import { parse as parseToml } from "smol-toml";
import { parse as parseYaml } from "yaml";
import type { DeviceConfigFile, ServiceConfigFile } from "@gd-monorepo/shared-types";
import { validateOrThrow, deviceConfigFileSchema, serviceConfigFileSchema } from "@gd-monorepo/shared-types";
import type { Logger } from "@gd-monorepo/logger";
import { createOpsLog } from "./ops-log";
import type { OpsLog } from "./ops-log";

/**
 * device-service'in gördüğü service.json — shared tip **yerelde** genişletilir.
 *
 * `tags`: her telemetriye basılan global tag'ler (anahtar kümesi serbest;
 * örn. `container_id`, `field_id`, `customer`). Paylaşılan `ServiceConfigFile`
 * generic kalır; alan yalnız bu servisin ihtiyacıdır.
 */
export interface DeviceServiceConfigFile extends ServiceConfigFile {
  tags?: Record<string, string>;
}

interface LoadedConfig {
  service: DeviceServiceConfigFile;
  devices: DeviceConfigFile[];
}

export class DeviceConfigLoader {
  private readonly configDir: string;
  private readonly ops: OpsLog;

  constructor(configDir: string, opsLogger?: Logger) {
    if (!configDir) throw new Error("[DeviceConfigLoader] configDir bos olamaz");
    this.configDir = configDir;
    this.ops = createOpsLog(opsLogger, "DeviceConfigLoader");
  }

  load(): LoadedConfig {
    if (!existsSync(this.configDir)) {
      throw new Error(`[DeviceConfigLoader] Konfigurasyon dizini bulunamadi: ${this.configDir}`);
    }

    const entries = readdirSync(this.configDir);
    let service: ServiceConfigFile | undefined;
    const devices: DeviceConfigFile[] = [];

    for (const entry of entries) {
      const fullPath = join(this.configDir, entry);

      if (!statSync(fullPath).isFile()) continue;

      const ext = extname(entry).toLowerCase();
      if (![".json", ".toml", ".yaml", ".yml"].includes(ext)) continue;

      const content = readFileSync(fullPath, "utf-8");
      const parsed = this.parseFile(content, ext);

      if (entry.startsWith("service.")) {
        const tags = this.readTags(parsed, entry);
        service = {
          ...validateOrThrow<ServiceConfigFile>(serviceConfigFileSchema, parsed, `Dosya: ${entry}`),
          ...(tags !== undefined ? { tags } : {}),
        };
        const tagKeys = Object.keys(service.tags ?? {});
        this.ops.info(
          `Global servis konfigurasyonu: ${entry}` +
            (tagKeys.length > 0 ? ` (tags: ${tagKeys.join(",")})` : ""),
        );
      } else {
        this.assertNoSimulatorSurface(parsed, entry);
        const deviceConfig = validateOrThrow<DeviceConfigFile>(deviceConfigFileSchema, parsed, `Dosya: ${entry}`);
        devices.push(deviceConfig);
        this.ops.info(`Cihaz konfigurasyonu: ${entry} -> ${deviceConfig.deviceId}`);
      }
    }

    if (!service) {
      throw new Error("[DeviceConfigLoader] service.{json,toml,yaml} bulunamadi");
    }

    this.ops.info(`${devices.length} cihaz, 1 servis konfigurasyonu yuklendi`);
    return { service, devices };
  }

  /**
   * Simülatör-only alanlar kalmış config'i fail-fast reddeder (K2).
   * Bayat config sessizce yok sayılmaz: dosya + deviceId ile hata verilir.
   */
  private assertNoSimulatorSurface(parsed: object, file: string): void {
    const raw = parsed as {
      deviceId?: unknown;
      transport?: { kind?: unknown };
      connector?: { sim?: unknown };
      heartbeat?: unknown;
    };
    const deviceId = typeof raw.deviceId === "string" ? raw.deviceId : "?";
    if (raw.transport?.kind === "simulator") {
      throw new Error(
        `[DeviceConfigLoader] transport.kind "simulator" artık desteklenmiyor (Dosya: ${file}, deviceId: ${deviceId}) — Sim-Lab ayrı servistir`,
      );
    }
    if (raw.connector?.sim !== undefined) {
      throw new Error(
        `[DeviceConfigLoader] connector.sim artık desteklenmiyor (Dosya: ${file}, deviceId: ${deviceId}) — BSC→PCS aktarımını Sim-Lab yapar`,
      );
    }
    if (raw.heartbeat !== undefined) {
      throw new Error(
        `[DeviceConfigLoader] heartbeat alanı kaldırıldı (Dosya: ${file}, deviceId: ${deviceId}) — periodicWrites kullanın`,
      );
    }
  }

  /**
   * `service.json#tags` — paylaşılan şema bu alanı bilmez (strip eder), bu yüzden
   * device-service yerelde okur ve doğrular: nesne + string değerler.
   */
  private readTags(parsed: object, file: string): Record<string, string> | undefined {
    const raw = (parsed as { tags?: unknown }).tags;
    if (raw === undefined) return undefined;
    if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
      throw new Error(`[DeviceConfigLoader] tags nesne olmalidir (Dosya: ${file})`);
    }
    const tags: Record<string, string> = {};
    for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
      if (typeof value !== "string") {
        throw new Error(`[DeviceConfigLoader] tags.${key} string olmalidir (Dosya: ${file})`);
      }
      tags[key] = value;
    }
    return tags;
  }

  private parseFile(content: string, ext: string): object {
    if (ext === ".json") return JSON.parse(content);
    if (ext === ".toml") return parseToml(content);
    if (ext === ".yaml" || ext === ".yml") return parseYaml(content) as object;
    throw new Error(`[DeviceConfigLoader] Desteklenmeyen format: ${ext}`);
  }
}
