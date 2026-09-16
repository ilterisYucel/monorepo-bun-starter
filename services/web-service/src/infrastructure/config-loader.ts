import type { DeviceConfigFile } from "@gd-monorepo/shared-types";
import { DeviceConfigFileSource } from "@gd-monorepo/platform-commands";

/**
 * Diskten cihaz config okuma — `DeviceConfigFileSource` ince sarmalayıcısı.
 * (2026-09-15: kaynak mantığı `@gd-monorepo/platform-commands`'a taşındı;
 * web-service route'ları artık aynı sözleşmeyi kullanır.)
 */
export function loadDeviceConfig(configDir: string, deviceId: string): DeviceConfigFile | null {
  const source = new DeviceConfigFileSource(configDir);
  return source.load(deviceId) ?? null;
}
