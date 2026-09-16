// Cihaz config kaynağı sözleşmesi — komut çözümlemenin dosya sisteminden
// bağımsız olması için (testlerde in-memory, üretimde dosya tabanlı).

import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import type { DeviceConfigFile } from "@gd-monorepo/shared-types";

/**
 * IDeviceConfigSource — deviceId'ye göre cihaz config'i döndüren sorgu
 * sözleşmesi. Bulunamayan cihaz için `undefined` döner (null YASAK).
 * Implementasyonlar: `DeviceConfigFileSource` (disk), testlerde in-memory.
 */
export interface IDeviceConfigSource {
  load(deviceId: string): DeviceConfigFile | undefined;
}

/**
 * DeviceConfigFileSource — `configDir` altındaki `<deviceId>.json`
 * dosyalarından cihaz config'i okuyan dosya tabanlı kaynak.
 *
 * Arama sırası (web-service config-loader ile birebir — K9):
 * 1. lowercase deviceId dosyası (`bsc-1.json`)
 * 2. orijinal deviceId dosyası (`BSC-1.json`)
 *
 * Okuma hataları (bozuk JSON, yok dosya) sessizce `undefined`'a düşer —
 * kaynak, varlık değil sorgudur; hata üst katmanda `device_not_found`
 * olarak raporlanır.
 */
export class DeviceConfigFileSource implements IDeviceConfigSource {
  constructor(private readonly configDir: string) {}

  load(deviceId: string): DeviceConfigFile | undefined {
    const deviceIdLower = deviceId.toLowerCase();
    const patterns = [
      join(this.configDir, `${deviceIdLower}.json`),
      join(this.configDir, `${deviceId}.json`),
    ];

    for (const path of patterns) {
      if (existsSync(path)) {
        try {
          return JSON.parse(readFileSync(path, "utf-8")) as DeviceConfigFile;
        } catch {
          continue;
        }
      }
    }
    return undefined;
  }
}
