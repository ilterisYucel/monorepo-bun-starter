import type { LogEntry, OperationRunRecord } from "@gd-monorepo/shared-types";
import type { NovaMimicState, NovaTopology } from "./mimic-types";
import { ALL_DEMO_REGISTERS, DEMO_BSC, DEMO_THERMAL, DEMO_PCS } from "./demo-registers";

/**
 * Admin saf yardımcıları (SPEC UC-8):
 * - `adminLiveValue` — mapping tablosunun "Live value" sütunu (referans `liveValue`).
 * - `commandTraceRows` — Modbus trace satırları (komut tanımları + log'lardan türetim;
 *   ham register trace backend'de yok — B-2).
 * IO yok.
 */

const f = (v: number, d = 1): string => (Math.round(v * 10 ** d) / 10 ** d).toFixed(d);

const PCS_CODE: Record<string, number> = { off: 0, stby: 1, rest: 1, chg: 2, dis: 3, fault: 6 };

/** PCS durum metni (İngilizce — konsol diliyle hizalı). */
const PCS_EN: Record<string, string> = {
  off: "Off",
  stby: "Standby",
  rest: "Rest",
  chg: "Charging",
  dis: "Discharging",
  fault: "Fault",
};

/** Register id → canlı değer (referans `liveValue` uyarlaması). */
export function adminLiveValue(
  state: NovaMimicState,
  topo: NovaTopology,
  unitNo: number,
  bankId: string,
  regId: string | undefined,
): string {
  if (!regId) return "—";
  const u = state.units.find((x) => x.n === unitNo);
  if (!u) return "—";
  const bi = Math.max(0, topo.unit.banks.indexOf(bankId));
  const b = u.banks[bi];
  const p = u.pcs[bi];
  if (!b || !p) return "—";

  const cells = topo.unit.cellsSeries;
  const limitChg = p.chgLimitKw;
  const limitDis = p.disLimitKw;
  const vAvg = b.vdc / cells;
  const dvV = b.dvmV / 2000;

  const map: Record<string, string> = {
    "bsc.soc": `${f(b.soc, 2)} %`,
    "bsc.soh": `${f(b.soh, 2)} %`,
    "bsc.vdc": `${f(b.vdc, 1)} V`,
    "bsc.idc": `${f(p.idc ?? 0, 1)} A`,
    "bsc.chgLimit": limitChg !== undefined ? `${f(limitChg, 1)} kW` : "—",
    "bsc.disLimit": limitDis !== undefined ? `${f(limitDis, 1)} kW` : "—",
    "bsc.state": `${PCS_CODE[p.state] ?? 1} · ${p.state === "chg" ? "Charging" : p.state === "dis" ? "Discharging" : "Standby"}`,
    "bsc.onlineRacks": `${b.dcb === "closed" ? topo.unit.racksPerBank : 0}`,
    "bsc.tMax": `${f(b.tmax)} °C`,
    "bsc.tMin": `${f(b.tmin ?? b.tmax)} °C`,
    "bsc.tAvg": `${f(((b.tmin ?? b.tmax) + b.tmax) / 2)} °C`,
    "bsc.cellVmax": `${f(vAvg + dvV, 3)} V`,
    "bsc.cellVmin": `${f(vAvg - dvV, 3)} V`,
    "bsc.cellVavg": `${f(vAvg, 3)} V`,
    "bsc.recalRacks": "0",
    "bsc.heartbeat": `${Math.floor(Date.now() / 1000) % 65536}`,
    "bsc.info": `0x${(((p.state === "chg" ? 1 : p.state === "dis" ? 2 : 0) << 4) | (p.limited ? 1 << 13 : 0)).toString(16).padStart(4, "0")}`,
    "bsc.socAvg": `${f(b.soc, 2)} %`,
    "bsc.socMax": `${f(Math.min(100, b.soc + 0.2), 2)} %`,
    "bsc.socMin": `${f(Math.max(0, b.soc - 0.2), 2)} %`,
    "bsc.sohAvg": `${f(b.soh, 2)} %`,
    "bsc.sohMin": `${f(Math.max(0, b.soh - 0.3), 2)} %`,
    "bsc.sohMax": `${f(Math.min(100, b.soh + 0.3), 2)} %`,
    "rack.tMax": `rack 1: ${f(b.racks[0] ?? b.tmax)} °C`,
    "rack.soc": `rack 1: ${f(b.rackSoc?.[0] ?? b.soc, 2)} %`,
    "rack.soh": `rack 1: ${f(b.soh, 2)} %`,
    "pcs.opStatus": `${PCS_CODE[p.state] ?? 1} · ${PCS_EN[p.state] ?? p.state}`,
    "pcs.p": `${f((p.state === "chg" ? -1 : p.state === "dis" ? 1 : 0) * p.pMW * 1000, 0)} kW`,
    "pcs.q": `${f(p.reactiveKvar ?? 0, 0)} kVar`,
    "pcs.vab": p.vac !== undefined ? `${f(p.vac, 1)} V` : "—",
    "pcs.freq": p.freq !== undefined ? `${f(p.freq, 2)} Hz` : `${f(state.station.hz || 50, 2)} Hz`,
    "pcs.vdc": `${f(p.dcVoltage ?? b.vdc, 1)} V`,
    "pcs.idc": `${f(p.idc ?? 0, 0)} A`,
    "pcs.igbtA1": `${f(p.igbtC)} °C`,
    "pcs.fault": p.state === "fault" ? "1 · Fault" : "0 · Normal",
    "pcs.acCB": p.acCb ? (p.acCb === "closed" ? "0 · Closed" : "1 · Open") : "—",
    "pcs.dcCB1": p.dcCb ? (p.dcCb === "closed" ? "0 · Closed" : "1 · Open") : "—",
    "pcs.estop": `0x${(p.estop ? 1 : 0).toString(16).padStart(4, "0")}`,
    "pcs.allowChgP": `${f(Math.min(topo.unit.pcsMaxMW * 1000, limitChg ?? topo.unit.pcsMaxMW * 1000), 0)} kW`,
    "pcs.allowDisP": `${f(Math.min(topo.unit.pcsMaxMW * 1000, limitDis ?? topo.unit.pcsMaxMW * 1000), 0)} kW`,
  };

  // PCS fault word(s) — faultBits ile bit isimleri.
  const fwMatch = /^pcs\.faultWord(\d*)$/.exec(regId);
  if (fwMatch) {
    const idx = fwMatch[1] ? Number.parseInt(fwMatch[1], 10) - 1 : 0;
    const word = p.faultWords?.[idx];
    if (word === undefined) return "—";
    if (word === 0) return "0x0000";
    const bits = DEMO_PCS.faultBits[String(idx + 1)] ?? {};
    const names = Object.entries(bits)
      .filter(([bit]) => (word & (1 << Number.parseInt(bit, 10))) !== 0)
      .map(([, name]) => name);
    return `0x${word.toString(16).toUpperCase().padStart(4, "0")}${names.length ? ` · ${names[0]}` : ""}`;
  }

  // HVAC — bankanın öncü ünitesi (referans bi*4).
  if (regId.startsWith("hvac.")) {
    const h = (u.hvac ?? []).find((x) => x.id === bi * 4 + 1) ?? u.hvac?.[0];
    if (!h) return "—";
    const hv: Record<string, string> = {
      "hvac.status": `${h.mode === "fault" ? 3 : h.on ? 1 : 0} · ${h.mode}`,
      "hvac.comp": h.comp ? "2 · Running" : "1 · Standby",
      "hvac.heater": h.heater ? "1 · On" : "0 · Off",
      "hvac.supplyT": `${f(h.supplyT)} °C`,
      "hvac.returnT": `${f(h.returnT)} °C`,
      "hvac.outsideT": h.outsideT !== undefined ? `${f(h.outsideT)} °C` : "—",
      "hvac.acV": h.acV !== undefined ? `${f(h.acV, 1)} V` : "—",
      "hvac.srvTmax": `${f(b.tmax)} °C`,
      "hvac.srvTmin": `${f(b.tmin ?? b.tmax)} °C`,
      "hvac.cmdOnOff": h.on ? "0x0001 · on" : "0x0002 · off",
    };
    if (hv[regId] !== undefined) return `HVAC-${u.n}.${h.id}: ${hv[regId]}`;
  }

  if (map[regId] !== undefined) return map[regId];
  // Katalogda ama canlı eşlemesi olmayan kayıtlar (nameplate/summary) — register meta ile.
  const reg = ALL_DEMO_REGISTERS[regId];
  return reg ? "—" : "—";
}

export interface TraceRow {
  time: string;
  device: string;
  fc: string;
  addr: string;
  value: string;
  meaning: string;
}

/** Backend komut adı → { fc, addr, meaning } (PCS/BSC command registerları). */
const PCS_CMD: Record<string, { addr: string; value?: string; meaning: string }> = {
  start: { addr: "0x0E14", value: "1", meaning: "S16 Start" },
  stop: { addr: "0x0E15", value: "1", meaning: "S17 Stop" },
  fault_reset: { addr: "0x0E16", value: "1", meaning: "S18 Fault reset" },
  standby: { addr: "0x0E17", value: "1", meaning: "S19 Standby" },
  set_power_zero: { addr: "0x0E19", value: "0", meaning: "S06 Active power = 0" },
  charge: { addr: "0x0E19", meaning: "S06 Active power (− charge)" },
  discharge: { addr: "0x0E19", meaning: "S06 Active power (+ discharge)" },
  set_command_source: { addr: "0x0E00", value: "1", meaning: "S01 Command source = EMS" },
  // Operasyon/manevra adımları manevra adı taşır
  pcs_standby: { addr: "0x0E17", value: "1", meaning: "S19 Standby" },
  pcs_charge: { addr: "0x0E19", meaning: "S06 Active power (− charge)" },
  pcs_discharge: { addr: "0x0E19", meaning: "S06 Active power (+ discharge)" },
  pcs_stop: { addr: "0x0E15", value: "1", meaning: "S17 Stop" },
};

const BSC_CMD: Record<string, { addr: string; value: string; meaning: string }> = {
  start: { addr: "40010", value: "2", meaning: "Command Request = Start" },
  stop: { addr: "40010", value: "3", meaning: "Command Request = Stop" },
  charge: { addr: "40010", value: "2", meaning: "Command Request = Charge (Start)" },
  discharge: { addr: "40010", value: "11", meaning: "Command Request = Discharge" },
  set_charge_power: { addr: "40030", value: "kW", meaning: "Charge Power Setpoint" },
  set_discharge_power: { addr: "40031", value: "kW", meaning: "Discharge Power Setpoint" },
  emergency: { addr: "40010", value: "1", meaning: "Command Request = Emergency" },
  open_contactors: { addr: "40010", value: "4", meaning: "Command Request = Open All Contactors" },
  close_contactors: { addr: "40010", value: "5", meaning: "Command Request = Close Contactors" },
  // Operasyon/manevra adımları manevra adı taşır
  bsc_charge: { addr: "40010", value: "2", meaning: "Command Request = Charge (Start)" },
  bsc_discharge: { addr: "40010", value: "11", meaning: "Command Request = Discharge" },
  bsc_stop: { addr: "40010", value: "3", meaning: "Command Request = Stop" },
};

const hhmmss = (iso: string | undefined): string => {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? "—"
    : `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`;
};

/**
 * Modbus trace satırları — run adım tanımları (komut → register eşlemesi) +
 * log olayları. Yeni→eski; en çok `limit` satır. Ham register trace yok (B-2).
 */
export function commandTraceRows(runs: OperationRunRecord[], logs: LogEntry[], limit = 80): TraceRow[] {
  const rows: TraceRow[] = [];
  for (const run of runs) {
    const raw = run.steps as unknown;
    const def = (raw as { definition?: { steps?: Array<Record<string, unknown>> } } | null)?.definition;
    const steps = Array.isArray(def?.steps) ? def.steps : Array.isArray(raw) ? (raw as Array<Record<string, unknown>>) : [];
    const params = (raw as { params?: Record<string, unknown> } | null)?.params ?? {};
    for (const s of steps) {
      const cmd =
        (typeof s.command === "string" && s.command) ||
        (typeof s.maneuver === "string" && s.maneuver) ||
        "";
      const types = Array.isArray(s.deviceTypes) ? (s.deviceTypes as string[]) : [];
      const isBsc = /bsc/i.test(run.name) || /^bsc_/.test(cmd) || types.includes("bsc");
      const map = isBsc ? BSC_CMD[cmd] : PCS_CMD[cmd];
      const dev = isBsc ? "BSC" : "PCS";
      const value = map?.value === "kW" && params.powerKw !== undefined ? `${params.powerKw} kW` : (map?.value ?? "—");
      rows.push({
        time: hhmmss(run.startedAt),
        device: dev,
        fc: "6",
        addr: map?.addr ?? "—",
        value,
        meaning: map?.meaning ?? cmd,
      });
    }
  }
  for (const e of logs) {
    rows.push({
      time: hhmmss(e.timestamp),
      device: e.source ?? "system",
      fc: "—",
      addr: "—",
      value: "—",
      meaning: e.message,
    });
  }
  return rows.slice(0, limit);
}

/** Termal model türevleri (Site parameters › Live per container). */
export function thermalRow(
  pMW: number,
  coolCount: number,
  heatCount: number,
  tmax: number,
  ambient: number,
): { qGen: number; qCool: number; qHeat: number; tBatt: number; tRoom: number } {
  const pMax = DEMO_THERMAL.pcsMaxMW * 2;
  const qGen = pMax > 0 ? 60 * (Math.abs(pMW) / pMax) ** 2 : 0;
  return {
    qGen,
    qCool: coolCount * 10.2,
    qHeat: heatCount * 4,
    tBatt: tmax - 1.2,
    tRoom: ambient + 1.5,
  };
}

export const DEMO_BSC_ENUM = DEMO_BSC.commands;
