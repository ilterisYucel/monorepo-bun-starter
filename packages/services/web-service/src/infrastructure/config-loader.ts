import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import type { DeviceConfigFile } from "@gd-monorepo/shared-types";

export function loadDeviceConfig(configDir: string, deviceId: string): DeviceConfigFile | null {
  const deviceIdLower = deviceId.toLowerCase();
  const patterns = [
    join(configDir, `${deviceIdLower}.json`),
    join(configDir, `${deviceId}.json`),
  ];

  for (const p of patterns) {
    if (existsSync(p)) {
      try {
        return JSON.parse(readFileSync(p, "utf-8"));
      } catch {
        continue;
      }
    }
  }
  return null;
}
