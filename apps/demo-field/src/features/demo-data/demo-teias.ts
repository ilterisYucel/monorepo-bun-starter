import { POS_TEXT, type NovaMimicState, type NovaTopology } from "@gd-monorepo/ui";
import { deriveAlerts } from "./deriveAlerts";

/**
 * TEİAŞ telemetri/komut tabloları (SPEC UC-6, FR-6.3; referans `market-view.js`).
 * İK Ek-1 Tablo 1 (telemetri, 20 satır) + Tablo 2 (komutlar, 8 satır) — canlı
 * state'ten türetilir. Saf; IO yok.
 */

export interface TeiasRow {
  label: string;
  value: string;
}

const f = (v: number, d = 1): string => (Math.round(v * 10 ** d) / 10 ** d).toFixed(d);

export function teiasTelemetryRows(state: NovaMimicState, topo: NovaTopology): TeiasRow[] {
  const U = topo.unit;
  const L = topo.limits;
  const banks = state.units.flatMap((u) => u.banks);
  const pcs = state.units.flatMap((u) => u.pcs);
  const perBankMWh = U.containerMWh / 2;

  const avgSoc = banks.length ? banks.reduce((a, b) => a + b.soc, 0) / banks.length : 0;
  const sohEnergy = banks.reduce((a, b) => a + (b.soh / 100) * perBankMWh, 0);
  const instAvail = banks.reduce((a, b) => a + (Math.max(0, b.soc - 5) / 100) * perBankMWh, 0);
  const availDis = pcs.reduce((a, p) => a + Math.min(U.pcsMaxMW, (p.disLimitKw ?? U.pcsMaxMW * 1000) / 1000), 0);
  const availChg = pcs.reduce((a, p) => a + Math.min(U.pcsMaxMW, (p.chgLimitKw ?? U.pcsMaxMW * 1000) / 1000), 0);
  const qMvar = pcs.reduce((a, p) => a + (p.reactiveKvar ?? 0), 0) / 1000;
  const kv = state.station.kV > 0 ? state.station.kV : topo.station.nominalKV;
  const hz = state.station.hz || 50;
  const poi = state.poiMW;
  const active = Math.abs(poi) > 0.2;
  const faults = deriveAlerts(state, topo).length;

  return [
    ["Remaining usable energy (SoH based)", `${f(sohEnergy, 2)} MWh`],
    ["Remaining usable energy ratio (SoH)", `${f((sohEnergy / topo.energyMWh) * 100, 1)} %`],
    ["SOC (instantaneous)", `${f(avgSoc, 1)} %`],
    ["Instantaneous available energy", `${f(instAvail, 2)} MWh`],
    ["Available power · discharge to grid", `${f(availDis, 1)} MW`],
    ["Available power · charge from grid", `${f(availChg, 1)} MW`],
    ["Active power", `${f(poi, 2)} MW`],
    ["Reactive power", `${f(qMvar, 2)} MVAr`],
    ["Voltage at connection point", `${f(kv, 2)} kV`],
    ["P / Q / U command feedback", `P = ${f(poi, 1)} MW · Q = ${f(qMvar, 1)} MVAr · U = ${f(kv, 1)} kV`],
    ["Q / voltage control mode", "Q control (Q = 0)"],
    ["Active power control mode", active ? "Setpoint (FL-02)" : "Standby"],
    ["Remote control enabled", "Yes · PMS"],
    ["System frequency", `${f(hz, 3)} Hz`],
    ["Frequency support active", "No (not contracted)"],
    ["Charging / discharging active", poi > 0.2 ? "Discharging" : poi < -0.2 ? "Charging" : "No"],
    ["Low-frequency mode triggered (LFSM-U)", hz < 49.8 ? "YES" : "No"],
    ["High-frequency mode triggered (LFSM-O)", hz > 50.2 ? "YES" : "No"],
    ["Breaker status and faults", `H01 ${POS_TEXT[state.station.H01]} · ${faults} active`],
    ["Islanding detection (RoCoF)", "Normal"],
  ].map(([label, value]) => ({ label, value }));
}

export function teiasCommandRows(state: NovaMimicState, topo: NovaTopology): TeiasRow[] {
  const kv = state.station.kV > 0 ? state.station.kV : topo.station.nominalKV;
  const poi = state.poiMW;
  return [
    ["Breaker open", "—"],
    ["Active power setpoint", Math.abs(poi) > 0.05 ? `${f(poi, 1)} MW (local)` : "—"],
    ["Reactive power setpoint", "0 MVAr"],
    ["Voltage setpoint", `${f(kv, 1)} kV`],
    ["Voltage / Q control mode", "Q"],
    ["Active power control on/off", "On"],
    ["Ramp rate", "— % Pn/min"],
    ["Frequency support on/off", "Off"],
  ].map(([label, value]) => ({ label, value }));
}

/** Frekans aralığı Tablo 1 satırları (BU) — referans `fr`. */
export const TEIAS_FREQ_RANGES: TeiasRow[] = [
  { label: "51.0 ≤ f < 51.5 Hz", value: "30 min" },
  { label: "49.0 ≤ f < 51.0 Hz", value: "Continuous" },
  { label: "48.5 ≤ f < 49.0 Hz", value: "1 h" },
  { label: "47.5 ≤ f < 48.5 Hz", value: "30 min" },
];
