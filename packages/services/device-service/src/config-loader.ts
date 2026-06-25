import { readFileSync, existsSync, readdirSync, statSync } from "fs";
import { join, extname } from "path";
import { parse as parseToml } from "smol-toml";
import { parse as parseYaml } from "yaml";
import type { DeviceConfigFile, ServiceConfigFile } from "@gd-monorepo/shared-types";
import { validateOrThrow, deviceConfigFileSchema, serviceConfigFileSchema } from "@gd-monorepo/shared-types";

interface LoadedConfig {
  service: ServiceConfigFile;
  devices: DeviceConfigFile[];
}

export class DeviceConfigLoader {
  private readonly configDir: string;

  constructor(configDir: string) {
    if (!configDir) throw new Error("[DeviceConfigLoader] configDir bos olamaz");
    this.configDir = configDir;
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
        console.log(`[DeviceConfigLoader] Global servis konfigurasyonu: ${entry}`);
      } else {
        const deviceConfig = validateOrThrow<DeviceConfigFile>(deviceConfigFileSchema, parsed, `Dosya: ${entry}`);
        devices.push(deviceConfig);
        console.log(`[DeviceConfigLoader] Cihaz konfigurasyonu: ${entry} -> ${deviceConfig.deviceId}`);
      }
    }

    if (!service) {
      throw new Error("[DeviceConfigLoader] service.{json,toml,yaml} bulunamadi");
    }

    console.log(`[DeviceConfigLoader] ${devices.length} cihaz, 1 servis konfigurasyonu yuklendi`);
    return { service, devices };
  }

  private parseFile(content: string, ext: string): object {
    if (ext === ".json") return JSON.parse(content);
    if (ext === ".toml") return parseToml(content);
    if (ext === ".yaml" || ext === ".yml") return parseYaml(content) as object;
    throw new Error(`[DeviceConfigLoader] Desteklenmeyen format: ${ext}`);
  }
}
