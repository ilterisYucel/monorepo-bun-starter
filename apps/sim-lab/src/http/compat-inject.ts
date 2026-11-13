// Eski DebugInjector senaryolarının Sim-Lab karşılığı (SPEC DEVICE-SERVICE-SADELESTIRME UC-4).
//
// Sözleşme:
// - `POST /compat/<c1|c2|field>/inject` gövde `{deviceId, scenario}`:
//   200 `{applied:true}` · 404 `{applied:false}` (bilinmeyen cihaz/senaryo) · 400 (geçersiz gövde).
// - Kapsam: c1 → `C1.`, c2 → `C2.`, field → ön ek yok (PCS-n, DEMO-MV-n).
// - Yeni test kodu bu ucu DEĞİL, god mode `/api/*` uçlarını kullanır; bu uç yalnız
//   mevcut demo entegrasyon/e2e testlerinin eski sözleşmesini korur.
//
// Senaryo → eylem eşlemesi `SIMULATOR-SERVISI-MIMARISI` §UC-4 tablosuyla uyumludur.

import type { FaultManager, Plant } from "@gd-monorepo/simulators/physical";

/** Compat ucunun ihtiyaç duyduğu dar Plant yüzeyi (test edilebilirlik). */
export interface CompatPlant {
  readonly devices: ReadonlyMap<string, { readonly type: string }>;
  applyBulk(
    selector: string,
    ref: string,
    value: number | null,
    mode: "clear" | "hold",
    source: string,
    durationS?: number,
  ): Promise<unknown>;
}

/** Compat ucunun ihtiyaç duyduğu dar FaultManager yüzeyi. */
export interface CompatFaults {
  readonly active: ReadonlyArray<{ readonly uid: number; readonly target: string }>;
  injectMany(
    defId: string,
    selector: string,
    params?: Record<string, unknown>,
  ): Array<{ ok: boolean; error?: string }>;
  clear(uid: number): void;
}

export const COMPAT_SCOPES: Readonly<Record<string, string>> = {
  c1: "C1.",
  c2: "C2.",
  field: "",
};

export interface CompatResult {
  readonly applied: boolean;
  readonly error?: string;
}

/** Cihazın üzerindeki tüm üstyazım ve arızaları geri alır (nominal/healthy/*_close). */
const clearDevice = async (p: CompatPlant, fm: CompatFaults, key: string): Promise<void> => {
  await p.applyBulk(key, "*", null, "clear", "compat");
  for (const fault of [...fm.active]) {
    if (fault.target === key || fault.target.startsWith(`${key}/`)) fm.clear(fault.uid);
  }
};

/** Cihaz tipine göre "arıza" karşılığı. */
const typeFault = (type: string): { id: string; params?: Record<string, unknown> } | undefined => {
  switch (type) {
    case "bsc":
      // "fault" senaryosu **arıza** üretmeli: `SOCPW` uyarı seviyesindedir
      // (30044 b1) ve config'teki `BSC Fault` alarmını (30037 b2) tetiklemez.
      // `SOCPF` = Bölüm aşırı şarj gücü F1 → fault1 biti → 30037 b2.
      return { id: "bsc.forceDiag", params: { code: "SOCPF" } };
    case "pcs":
    case "wattox-pcs":
      return { id: "pcs.faultBit" };
    case "imd":
      return { id: "imd.fault" };
    case "dc-meter":
      return { id: "dcmeter.alarm", params: { w: 1 } };
    case "hvac":
      return { id: "hvac.powerLoss" };
    case "control-panel-io":
      return { id: "io.fss", params: { state: "fault" } };
    case "fss":
      return { id: "fss.panelFault" };
    case "cb":
      return { id: "cb.trip" };
    default:
      return undefined;
  }
};

/** HVAC sıcak/soğuk/nem senaryoları — EMS'in okuduğu noktada süresiz `hold`. */
const HVAC_HOLD: Readonly<Record<string, { point: string; value: number }>> = {
  hot: { point: "Current Temp", value: 45 },
  cold: { point: "Current Temp", value: 5 },
  humid: { point: "Return Humidity", value: 90 },
};

/** PM5340 besleme kaybı — gerilim noktaları 0'a çekilir (kural `Voltage L-N Avg` okur). */
const AUX_LOSS_POINTS = ["Voltage L-N A", "Voltage L-N B", "Voltage L-N C", "Voltage L-N Avg"];

const injectOne = (
  fm: CompatFaults,
  defId: string,
  target: string,
  params: Record<string, unknown> = {},
): CompatResult => {
  const results = fm.injectMany(defId, target, params);
  return results.some((r) => r.ok)
    ? { applied: true }
    : { applied: false, error: results[0]?.error ?? "enjeksiyon uygulanamadı" };
};

export async function compatInject(
  p: CompatPlant,
  fm: CompatFaults,
  scope: string,
  deviceId: string,
  scenario: string,
): Promise<CompatResult> {
  const prefix = COMPAT_SCOPES[scope];
  if (prefix === undefined) return { applied: false, error: `bilinmeyen kapsam: ${scope}` };
  if (deviceId.length === 0 || scenario.length === 0) {
    return { applied: false, error: "deviceId ve scenario zorunlu" };
  }

  const key = `${prefix}${deviceId}`;
  const device = p.devices.get(key);
  if (device === undefined) return { applied: false, error: `cihaz yok: ${key}` };

  const type = device.type;
  const s = scenario.trim();

  // Temizleme senaryoları
  if (s === "nominal" || s === "healthy" || s === "close" || s.endsWith("_close")) {
    await clearDevice(p, fm, key);
    return { applied: true };
  }

  // BSC raf SOC
  if (s.startsWith("soc:")) {
    const soc = Number(s.slice(4));
    if (!Number.isFinite(soc)) return { applied: false, error: `geçersiz soc: ${s}` };
    return injectOne(fm, "rack.setSoc", key, { soc });
  }

  // HVAC sıcaklık/nem
  const hvac = HVAC_HOLD[s];
  if (hvac !== undefined) {
    if (type !== "hvac") return { applied: false, error: `${s} yalnız HVAC için` };
    await p.applyBulk(key, hvac.point, hvac.value, "hold", "compat");
    return { applied: true };
  }

  // PM5340 besleme kaybı
  if (s === "aux_loss") {
    if (type !== "energy-analyzer") return { applied: false, error: "aux_loss yalnız enerji analizörü için" };
    for (const point of AUX_LOSS_POINTS) await p.applyBulk(key, point, 0, "hold", "compat");
    return { applied: true };
  }

  // Kapı senaryoları (batarya/panel)
  if (s === "battery_door_open") return injectOne(fm, "io.door", key, { which: "battery" });
  if (s === "panel_door_open") return injectOne(fm, "io.door", key, { which: "panel" });

  // Yangın / kademe — kontrol paneli Fire DI'si `io.fire`, FSS paneli `io.fss`.
  if (s === "fire") {
    return type === "control-panel-io"
      ? injectOne(fm, "io.fire", key)
      : injectOne(fm, "io.fss", key, { state: "discharged" });
  }
  if (s === "first_stage") return injectOne(fm, "io.fss", key, { state: "secondStage" });

  // Cihaz tipine göre genel arıza/uyarı
  if (s === "fault" || s === "device_error") {
    const fault = typeFault(type);
    return fault === undefined ? { applied: false, error: `${type} için arıza eşlemesi yok` } : injectOne(fm, fault.id, key, fault.params);
  }
  if (s === "warning") {
    if (type === "pcs") return injectOne(fm, "pcs.alarmBit", key);
    if (type === "imd") return injectOne(fm, "imd.prewarning", key);
    const fault = typeFault(type);
    return fault === undefined ? { applied: false, error: `${type} için uyarı eşlemesi yok` } : injectOne(fm, fault.id, key, fault.params);
  }

  // Cihaz-özel senaryolar
  const specific: Readonly<Record<string, { id: string; params?: Record<string, unknown> }>> = {
    overheat: { id: "rack.hotspot" },
    diff_temp: { id: "rack.tempSensor" },
    overcurrent: type === "dc-meter" ? { id: "dcmeter.overcurrent" } : { id: "dcmeter.alarm", params: { w: 1 } },
    overvoltage: { id: "dcmeter.alarm", params: { w: 2 } },
    door_open: { id: "pcs.door" },
  };
  const action = specific[s];
  if (action !== undefined) return injectOne(fm, action.id, key, action.params);

  return { applied: false, error: `bilinmeyen senaryo: ${s}` };
}
