import type { DcMeterSimulator } from "../../dc-meter";
import type { WattoxPcs } from "../models/pcs-wattox";
import type { PipeSet } from "../link/pipe";

/**
 * Aux sinyal kanalları (birleştirme SPEC §6.5 / T-10, K4).
 *
 * Plant'teki imperatif "yama"lar (DC metre ölçümü, IMD→PCS izolasyonu) artık
 * **pipe sinyali** üzerinden akar: yayıncı Plant, tüketici port. Böylece:
 * - kanal gözlemlenebilir/ezilebilir (test, enjeksiyon, harici besleme),
 * - aux cihaz için ikinci model doğmaz (K4) — yalnız sinyal bağlanır.
 */
export const AUX_SIGNAL = {
  /** Konteyner IMD alarmı (boolean) — PCS izolasyon empedanısını düşürür. */
  imdAlarm: (container: string): string => `imd.${container}.alarm`,
  /** Dizinin DC tarafı (DC metre ölçümü) — V / A / kW. */
  dcVoltage: (stringKey: string): string => `dc.string.${stringKey}.voltage`,
  dcCurrent: (stringKey: string): string => `dc.string.${stringKey}.current`,
  dcPower: (stringKey: string): string => `dc.string.${stringKey}.power`,
} as const;

const num = (v: unknown): number | undefined =>
  typeof v === "number" && Number.isFinite(v) ? v : undefined;

/**
 * IMD → PCS izolasyon portu.
 *
 * Alarm varsa PCS izolasyon empedanısı 60 kΩ'a düşer (fault), alarm yoksa
 * 3200 kΩ'a döner — **fault enjeksiyonu** aktifken (override) yükseltme yapılmaz.
 */
export class InsulationPort {
  constructor(private readonly pipes: PipeSet) {}

  /** Komut — sinyali okur ve PCS'e uygular (idempotent). */
  apply(pcs: WattoxPcs, container: string, tick: number, faultOverride: boolean): void {
    const alarm = this.pipes.read(AUX_SIGNAL.imdAlarm(container), tick)?.value === true;
    if (alarm && pcs.insulationKohm > 100) pcs.insulationKohm = 60;
    if (!alarm && !faultOverride && pcs.insulationKohm < 3200) pcs.insulationKohm = 3200;
  }
}

/**
 * DC metre portu (DJSF1352) — dizinin DC tarafını ölçer.
 *
 * Sinyal yoksa (bağımsız ünite) metreye dokunulmaz; cihaz kendi mock
 * varsayılanlarıyla (750 V / 100 A / 75 kW) çalışır (pipe SPEC K2).
 */
export class DcMeterPort {
  constructor(private readonly pipes: PipeSet) {}

  /** Komut — sinyalleri okur ve ölçüm olarak yazar (idempotent). */
  apply(meter: DcMeterSimulator, stringKey: string, tick: number): void {
    const v = num(this.pipes.read(AUX_SIGNAL.dcVoltage(stringKey), tick)?.value);
    const i = num(this.pipes.read(AUX_SIGNAL.dcCurrent(stringKey), tick)?.value);
    const p = num(this.pipes.read(AUX_SIGNAL.dcPower(stringKey), tick)?.value);
    if (v === undefined || i === undefined || p === undefined) return;
    meter.setMeasurements({ voltage: v, current: i, power: p });
  }
}
