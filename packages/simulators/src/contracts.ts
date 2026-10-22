// packages/simulators/src/contracts.ts
//
// Simülatör sözleşmesi — SIMULATOR-MIMARISI REV.03 (K8/UC-5).
//
// Yeni simülatör üretim checklist'i (SPEC §4.4):
// 1. register-map.ts   2. tek config objesi   3. ISimulator (start/stop SimulatorServer'a delege)
// 4. inject yalnız senaryo destekliyorsa   5. host builders kaydı   6. config + sim türevi   7. testler.

/**
 * Host tarafından yönetilen simülatör yüzeyi.
 *
 * Sözleşme:
 * - `deviceId`: config'ten gelen cihaz kimliği; boş olamaz (constructor fail-fast).
 * - `start()`: self-host Modbus TCP sunucusunu + tick'i açar; idempotent
 *   (ikinci çağrı no-op). Hata kategorisi: port çakışması/bind hatası → throw
 *   (açılış hatası, host fail-fast).
 * - `stop()`: tick'i ve sunucuyu kapatır; idempotent (ikinci çağrı no-op).
 * - `inject(scenario)`: opsiyonel — yalnız senaryo enjeksiyonunu destekleyen
 *   simülatörler uygular. Bilinmeyen senaryoda `false` döner; hata fırlatmaz.
 *   Yalnız dev/debug akışlarında çağrılır, prod kullanımı yoktur.
 */
export interface ISimulator {
  readonly deviceId: string;
  start(): Promise<void>;
  stop(): Promise<void>;
  inject?(scenario: string): boolean;
}

/**
 * Zorunlu cihaz kimliğini doğrular — boş/whitespace `IllegalArgumentException`
 * eşdeğeri hata fırlatır (Elegant Object kural 2: geçersiz argüman sessizce
 * kabul edilmez).
 */
export function requireDeviceId(deviceId: string): string {
  if (typeof deviceId !== "string" || deviceId.trim().length === 0) {
    throw new Error("[Simulator] deviceId bos olamaz");
  }
  return deviceId;
}
