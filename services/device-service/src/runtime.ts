// Cihaz çalışma zamanı kurulumu — `run.ts#main`'den ayrıldı (SPEC T-18/R-1).
//
// Sözleşme:
// - Yalnız config yükler ve `DeviceService` örneğini kurar; **hiçbir soket dinlemez**
//   (bağlanma `DeviceService.start()` içinde, cihaz istemcileri tarafından yapılır).
// - Testte `net.Server.prototype.listen` yasaklanarak bu iddia çalışma zamanında doğrulanır.
// - Yan etki yok: Redis/Postgres bağlantısı bu fonksiyonda AÇILMAZ (run.ts kurar/verir).

import type { IMessageQueue } from "@gd-monorepo/core";
import type { Logger } from "@gd-monorepo/logger";
import type { TamperLogger } from "tamper-logger";
import { DeviceConfigLoader } from "./config-loader";
import { DeviceService } from "./device-service";

export interface DeviceRuntime {
  readonly service: DeviceService;
  /** Yüklenen cihaz config sayısı (loglama/teşhis için). */
  readonly deviceCount: number;
}

export async function buildDeviceRuntime(
  configDir: string,
  mq: IMessageQueue,
  identity: { containerId?: string; fieldId?: string },
  logger?: TamperLogger,
  opsLogger?: Logger,
): Promise<DeviceRuntime> {
  const { devices } = new DeviceConfigLoader(configDir, opsLogger).load();
  const service = await DeviceService.fromConfigDir(configDir, mq, identity, logger, opsLogger);
  return { service, deviceCount: devices.length };
}
