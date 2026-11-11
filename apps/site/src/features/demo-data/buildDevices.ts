import type {
  NovaAuxState,
  NovaDcState,
  NovaFssState,
  NovaHvacState,
} from "@gd-monorepo/ui";
import type { TelemetryData } from "@gd-monorepo/shared-types";
import { byName, num, truthy } from "./telemetry";

/**
 * Container cihaz telemetrisi → ünite alt-durumları (SPEC UC-9, FR-9.1/FR-9.3).
 *
 * Kaynak cihazlar (konteyner tier, tünelle field'a akar):
 *  · HVAC-1..8 (MC90) — durum, kompresör, sıcaklıklar, fan, alarmlar
 *  · PM5340-1 — AUX enerji analizörü
 *  · CONTROL-PANEL-IO-1 (+ FSS-1) — FSS kuru kontak/panel
 *  · IMD-1 — izolasyon direnci
 *  · DC-METER-1 — DC V/I/P
 *
 * Tüm fonksiyonlar saf; eksik veri → güvenli varsayılan (throw yok).
 */

const alarmName = (name: string): boolean =>
  /Alarm/i.test(name) && !/^High Temp Alarm 2$/.test(name);

function hvacMode(
  on: boolean,
  fault: boolean,
  comp: boolean,
  heater: boolean,
): NovaHvacState["mode"] {
  if (fault) return "fault";
  if (!on) return "off";
  if (comp) return "cool";
  if (heater) return "heat";
  return "fan";
}

export function buildHvac(rows: TelemetryData[] | undefined): NovaHvacState | undefined {
  if (!rows || rows.length === 0) return undefined;
  const status = num(byName(rows, "Equipment Status")?.value) ?? 0;
  const on = status !== 0;
  const fault = status === 3;
  const comp = truthy(byName(rows, "Compressor Status")?.value);
  const heater = truthy(byName(rows, "Electric Heating On")?.value);
  const alarms = rows
    .filter((r) => alarmName(r.name) && truthy(r.value))
    .map((r) => r.name);

  return {
    id: 0,
    on,
    mode: hvacMode(on, fault, comp, heater),
    comp,
    heater,
    supplyT: num(byName(rows, "Supply Temp")?.value) ?? 0,
    returnT: num(byName(rows, "Current Temp")?.value) ?? 0,
    ...(num(byName(rows, "Outside Temp")?.value) !== undefined
      ? { outsideT: num(byName(rows, "Outside Temp")?.value) }
      : {}),
    ...(num(byName(rows, "Condenser Temp")?.value) !== undefined
      ? { condenserT: num(byName(rows, "Condenser Temp")?.value) }
      : {}),
    ...(num(byName(rows, "Evaporator Temp")?.value) !== undefined
      ? { evaporatorT: num(byName(rows, "Evaporator Temp")?.value) }
      : {}),
    ...(num(byName(rows, "Internal Fan Speed")?.value) !== undefined
      ? { inFanRpm: num(byName(rows, "Internal Fan Speed")?.value) }
      : {}),
    ...(num(byName(rows, "External Fan Speed")?.value) !== undefined
      ? { outFanRpm: num(byName(rows, "External Fan Speed")?.value) }
      : {}),
    ...(num(byName(rows, "AC Input Voltage")?.value) !== undefined
      ? { acV: num(byName(rows, "AC Input Voltage")?.value) }
      : {}),
    ...(num(byName(rows, "Return Humidity")?.value) !== undefined
      ? { rh: num(byName(rows, "Return Humidity")?.value) }
      : {}),
    ...(num(byName(rows, "Equipment Runtime")?.value) !== undefined
      ? { runH: num(byName(rows, "Equipment Runtime")?.value) }
      : {}),
    ...(num(byName(rows, "Compressor Runtime")?.value) !== undefined
      ? { compH: num(byName(rows, "Compressor Runtime")?.value) }
      : {}),
    alarms,
  };
}

/** HVAC cihaz listesinden sıralı ünite dizisi (id = 1..N). */
export function buildHvacList(
  map: Map<string, TelemetryData[]>,
): NovaHvacState[] {
  const out: NovaHvacState[] = [];
  for (let i = 1; i <= 8; i++) {
    const rows = map.get(`HVAC-${i}`);
    if (!rows) continue;
    const h = buildHvac(rows);
    if (h) out.push({ ...h, id: i });
  }
  return out;
}

export function buildAux(rows: TelemetryData[] | undefined): NovaAuxState | undefined {
  if (!rows || rows.length === 0) return undefined;
  const pick = (name: string, fallback = 0): number =>
    num(byName(rows, name)?.value) ?? fallback;
  return {
    kW: pick("Active Power Total"),
    kvar: pick("Reactive Power Total"),
    v: pick("Voltage L-L Avg"),
    iA: pick("Current Avg"),
    hz: pick("Frequency", 50),
    pf: pick("Power Factor Total", 1),
    ...(num(byName(rows, "Active Energy Delivered")?.value) !== undefined
      ? { kwhDelivered: num(byName(rows, "Active Energy Delivered")?.value) }
      : {}),
    ...(num(byName(rows, "Active Energy Received")?.value) !== undefined
      ? { kwhReceived: num(byName(rows, "Active Energy Received")?.value) }
      : {}),
  };
}

/** FSS: kuru kontaklar (CONTROL-PANEL-IO) + varsa FSS-1 panel detayı. */
export function buildFss(
  ioRows: TelemetryData[] | undefined,
  panelRows: TelemetryData[] | undefined,
  config: { zones: string[]; detector: string; h2AlarmLEL: number } | undefined,
): NovaFssState | undefined {
  if (!ioRows || ioRows.length === 0) return undefined;
  const systemOk = truthy(byName(ioRows, "System OK")?.value);
  const fault = truthy(byName(ioRows, "Fault")?.value);
  const discharged = truthy(byName(ioRows, "Discharged")?.value);
  const secondStage = truthy(byName(ioRows, "2nd Stage")?.value);

  const panelStatus = num(byName(panelRows, "Panel Status")?.value);
  const status: NovaFssState["status"] =
    discharged || panelStatus === 1
      ? "fire"
      : secondStage
        ? "fire"
        : fault || panelStatus === 2
          ? "fault"
          : panelStatus === 3
            ? "disabled"
            : panelStatus === 4
              ? "test"
              : "normal";

  const zones = (config?.zones ?? ["Smoke detection", "Heat detection", "Gas detection (H₂)"]).map(
    (name, i) => ({ id: i + 1, name, state: "normal" }),
  );
  const detectorCount = 2;
  const detectorName = config?.detector ?? "Vigilex VIGI-DT1";
  const threshold = config?.h2AlarmLEL ?? 10;
  const detectors = Array.from({ length: detectorCount }, (_, i) => {
    const id = i + 1;
    const lel = num(byName(panelRows, `Detector ${id} H2`)?.value) ?? 0;
    return {
      id,
      lel,
      voc: num(byName(panelRows, `Detector ${id} VOC`)?.value) ?? 0,
      rh: num(byName(panelRows, `Detector ${id} RH`)?.value) ?? 0,
      t: num(byName(panelRows, `Detector ${id} Temp`)?.value) ?? 0,
      alarm: lel >= threshold,
      fault: truthy(byName(panelRows, `Detector ${id} Fault`)?.value),
    };
  });
  void detectorName;

  return {
    status,
    systemOk,
    fault,
    discharged,
    secondStage,
    mode: num(byName(panelRows, "Mode")?.value) === 1 ? "manual" : "auto",
    released: discharged,
    imminent: secondStage,
    ...(num(byName(panelRows, "Countdown")?.value) !== undefined
      ? { countdown: num(byName(panelRows, "Countdown")?.value) }
      : {}),
    ventsOpen: truthy(byName(panelRows, "Vents Open")?.value) || discharged,
    disablements: {
      dE: truthy(byName(panelRows, "Disable dE")?.value),
      dt: truthy(byName(panelRows, "Disable dt")?.value),
      dc: truthy(byName(panelRows, "Disable dc")?.value),
      dP: truthy(byName(panelRows, "Disable dP")?.value),
      dA: truthy(byName(panelRows, "Disable dA")?.value),
      db: truthy(byName(panelRows, "Disable db")?.value),
    },
    zones,
    detectors,
  };
}

export function buildDc(rows: TelemetryData[] | undefined): NovaDcState | undefined {
  if (!rows || rows.length === 0) return undefined;
  return {
    voltage: num(byName(rows, "DC Voltage")?.value) ?? 0,
    current: num(byName(rows, "DC Current")?.value) ?? 0,
    powerKw: num(byName(rows, "DC Power")?.value) ?? 0,
    alarm: truthy(byName(rows, "Alarm Word")?.value),
  };
}

export function buildImd(rows: TelemetryData[] | undefined): number | undefined {
  if (!rows || rows.length === 0) return undefined;
  return num(byName(rows, "Insulation Resistance")?.value);
}
