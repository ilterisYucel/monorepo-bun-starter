import { POS_TEXT, type NovaMimicState, type NovaTopology, type NovaUnitState } from "@gd-monorepo/ui";
import { deriveAlerts } from "./deriveAlerts";

/**
 * Manevra permissives türevi (SPEC UC-5) — referans `sim.permissives` birebir.
 * `.ok` / `.hard` / `.bad` sınıfları: yalnız earthing kontrolü hard (referans);
 * diğerleri bad. `deriveStartupChecks` FL-01 site availability listesidir.
 */

export interface Permission {
  ok: boolean;
  hard: boolean;
  label: string;
  detail: string;
}

export interface PermissiveOptions {
  dir: "chg" | "dis";
  powerKw: number;
  scope: number[];
  /** Son kalibrasyon bitiş zamanı (ms) — FL-04 gecikme kontrolü. */
  lastCalibrationAt?: number;
  /** Canlı AUX yükü (kW) — POI available hesabı. */
  auxKw?: number;
}

const f = (v: number, d = 1): string => (Math.round(v * 10 ** d) / 10 ** d).toFixed(d);

/** POI verim (TR + kablo) — referans `TOPO.poiEfficiency`. */
const ETA = 0.985;

const DAY_MS = 86_400_000;

const selectedUnits = (state: NovaMimicState, scope: number[]): NovaUnitState[] =>
  scope.length ? state.units.filter((u) => scope.includes(u.n)) : state.units;

/** Grup blokajı var mı (referans `groupCheck` alt kümesi). */
function isBlocked(u: NovaUnitState, topo: NovaTopology): boolean {
  const L = topo.limits;
  if (u.rmu.H02 !== "closed" || u.rmu.es) return true;
  if (u.banks.some((b) => b.dcb !== "closed")) return true;
  if (u.pcs.every((p) => p.state === "fault" || p.state === "off")) return true;
  if (u.banks.some((b) => b.tmax > L.tempMax || (b.tmin ?? b.tmax) < L.tempMin)) return true;
  return false;
}

/** POI'de teslim edilebilir güç (MW) — PCS max ∩ BSC limit, kayıp + AUX. */
function availablePoiMW(state: NovaMimicState, topo: NovaTopology, scope: number[], dir: "chg" | "dis", auxKw: number): number {
  const U = topo.unit;
  let a = 0;
  for (const u of selectedUnits(state, scope)) {
    if (isBlocked(u, topo)) continue;
    u.pcs.forEach((p, i) => {
      if (p.state === "fault" || p.state === "off") return;
      if ((u.banks[i]?.dcb ?? "open") !== "closed") return;
      const limitKw = dir === "chg" ? p.chgLimitKw : p.disLimitKw;
      const limitMW = limitKw !== undefined ? limitKw / 1000 : U.pcsMaxMW;
      a += Math.min(U.pcsMaxMW * (p.limited ? 0.5 : 1), limitMW);
    });
  }
  const aux = auxKw / 1000;
  return Math.max(0, dir === "chg" ? a / ETA + aux : a * ETA - aux);
}

export function derivePermissives(state: NovaMimicState, topo: NovaTopology, opts: PermissiveOptions): Permission[] {
  const L = topo.limits;
  const out: Permission[] = [];
  const units = selectedUnits(state, opts.scope);
  const alerts = deriveAlerts(state, topo);
  const criticialFaults = alerts.filter((a) => a.sev === "alarm").length;

  // 1 · Site status Ready
  const ready = state.station.H01 === "closed" && criticialFaults === 0;
  out.push({ ok: ready, hard: false, label: "Site status Ready (FL-01)", detail: ready ? "Ready" : "Not Ready" });

  // 2 · Earthing switches (HARD — referans)
  const earthed = [
    ...topo.station.cells.filter((c) => c.es && state.station.es[c.id]).map((c) => c.id),
    ...units.filter((u) => u.rmu.es).map((u) => `BESS#${u.n}`),
  ];
  out.push({
    ok: earthed.length === 0,
    hard: true,
    label: "No earthing switch closed in the path",
    detail: earthed.length ? earthed.join(", ") : "all clear",
  });

  // 3 · MV path closed
  const mvOpen = units.filter((u) => u.rmu.H02 !== "closed").map((u) => `BESS#${u.n}`);
  out.push({
    ok: mvOpen.length === 0,
    hard: false,
    label: "MV path closed (H01 · feeder CB · RMU)",
    detail: mvOpen.length
      ? mvOpen.join(", ")
      : `H01 ${POS_TEXT[state.station.H01]}, H04 ${POS_TEXT[state.station.H04]}, H05 ${POS_TEXT[state.station.H05]}`,
  });

  // 4 · DC block available
  const dcbOff = units.filter((u) => u.banks.some((b) => b.dcb !== "closed")).map((u) => `BESS#${u.n}`);
  out.push({
    ok: dcbOff.length === 0,
    hard: false,
    label: "DC block available (BSC Normal, racks online)",
    detail: dcbOff.length ? dcbOff.join(", ") : "BSC 30036 = Normal",
  });

  // 5 · PCS ready
  const pcsBad = units.filter((u) => u.pcs.every((p) => p.state === "fault" || p.state === "off")).map((u) => `BESS#${u.n}`);
  const readyPcs = units.reduce((a, u) => a + u.pcs.filter((p) => p.state !== "fault" && p.state !== "off").length, 0);
  out.push({
    ok: pcsBad.length === 0,
    hard: false,
    label: "PCS ready (not faulted / stopped)",
    detail: pcsBad.length ? pcsBad.join(", ") : `${readyPcs} PCS ready`,
  });

  // 6 · No group in fault or maintenance
  const blocked = units
    .filter((u) => (u.rmu.H02 !== "closed" && u.rmu.es) || u.pcs.some((p) => p.state === "fault"))
    .map((u) => `BESS#${u.n}`);
  out.push({
    ok: blocked.length === 0,
    hard: false,
    label: "No group in fault or maintenance",
    detail: blocked.length ? blocked.join(", ") : "none",
  });

  // 7 · Calibration not overdue
  const interval = (L.calibrationIntervalDays ?? 30) * DAY_MS;
  const overdue = opts.lastCalibrationAt !== undefined && Date.now() - opts.lastCalibrationAt > interval;
  out.push({
    ok: !overdue,
    hard: false,
    label: "Calibration not overdue (FL-04)",
    detail: overdue ? "overdue" : "all within interval",
  });

  // 8 · Requested power at POI ≤ available
  const sp = opts.powerKw / 1000;
  const avail = availablePoiMW(state, topo, opts.scope, opts.dir, opts.auxKw ?? 0);
  out.push({
    ok: sp > 0 && sp <= avail + 1e-6,
    hard: false,
    label: "Requested power at POI ≤ available (PCS max ∩ BSC limit, after losses and AUX)",
    detail: `${f(sp, 2)} / ${f(avail, 2)} MW`,
  });

  return out;
}

/** FL-01 site availability kontrolleri (referans `suCheck`). */
export function deriveStartupChecks(state: NovaMimicState, topo: NovaTopology): Permission[] {
  const alerts = deriveAlerts(state, topo);
  const siteReady = state.station.H01 === "closed" && alerts.filter((a) => a.sev === "alarm").length === 0;
  const aux = state.units[0]?.aux;
  const kv = state.station.kV > 0 ? state.station.kV : topo.station.nominalKV;
  const hz = state.station.hz || 50;
  return [
    { ok: siteReady, hard: false, label: "Site status", detail: siteReady ? "Ready" : "Not Ready" },
    {
      ok: true,
      hard: false,
      label: "All devices online (heartbeats)",
      detail: `${state.units.length * 2} BSC · ${state.units.length * 2} PCS · MV relays`,
    },
    {
      ok: aux ? Math.abs(aux.v - 400) < 40 : true,
      hard: false,
      label: "AUX transformer analyzer",
      detail: aux ? `${f(aux.v, 0)} V · ${f(aux.hz, 2)} Hz` : "—",
    },
    {
      ok: kv > 31 && kv < 38 && Math.abs(hz - 50) < 0.2,
      hard: false,
      label: "MV grid (H03 metering)",
      detail: `${f(kv, 2)} kV · ${f(hz, 2)} Hz`,
    },
    { ok: state.station.H01 === "closed", hard: false, label: "Incomer H01 closed", detail: POS_TEXT[state.station.H01] },
  ];
}
