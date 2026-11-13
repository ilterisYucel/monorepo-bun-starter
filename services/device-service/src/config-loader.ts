import { readFileSync, existsSync, readdirSync, statSync } from "fs";
import { join, extname } from "path";
import { parse as parseToml } from "smol-toml";
import { parse as parseYaml } from "yaml";
import type { DeviceConfigFile, ServiceConfigFile } from "@gd-monorepo/shared-types";
import { validateOrThrow, deviceConfigFileSchema, serviceConfigFileSchema } from "@gd-monorepo/shared-types";
import type { Logger } from "@gd-monorepo/logger";
import { createOpsLog } from "./ops-log";
import type { OpsLog } from "./ops-log";

interface LoadedConfig {
  service: ServiceConfigFile;
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
        service = validateOrThrow<ServiceConfigFile>(serviceConfigFileSchema, parsed, `Dosya: ${entry}`);
        this.ops.info(`Global servis konfigurasyonu: ${entry}`);
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

  private parseFile(content: string, ext: string): object {
    if (ext === ".json") return JSON.parse(content);
    if (ext === ".toml") return parseToml(content);
    if (ext === ".yaml" || ext === ".yml") return parseYaml(content) as object;
    throw new Error(`[DeviceConfigLoader] Desteklenmeyen format: ${ext}`);
  }
}
