import React, { useMemo, useState } from "react";
import type { LogEntry, OperationRunRecord } from "@gd-monorepo/shared-types";
import type { NovaMimicState, NovaTopology } from "./mimic-types";
import {
  ALL_DEMO_REGISTERS,
  DEMO_BSC,
  DEMO_DEVICES,
  DEMO_HVAC,
  DEMO_MAPPING,
  DEMO_PCS,
  DEMO_THERMAL,
  addrText,
  demoCatalog,
  type DemoCatalogKey,
  type DemoDevicePlan,
  type DemoRegister,
  typeText,
} from "./demo-registers";
import { adminLiveValue, commandTraceRows, commandWriteTraceRows, thermalRow } from "./demo-admin-live";
import type { DemoCommandWrite } from "./demo-admin-live";

/**
 * DemoAdminView — Master admin (SPEC UC-8), referans konsol düzeni:
 * Data mapping (dropdown + live value) · Site parameters (termal model + live) ·
 * Devices (IP planı) · Register catalogue (arama + poll planları) · Modbus trace.
 * Sunumsal bileşen; durum app'teki `DemoAdminStore`'dan gelir.
 */

export interface DemoAdminParams {
  restH: number;
  ambMode: "fixed" | "profile";
  ambC: number;
  ambSwing: number;
  solar: boolean;
  qGenMaxKW: number;
  coolKW: number;
  genExp: 1 | 2;
}

export interface DemoAdminStateShape {
  mapping: Record<string, string>;
  devices: DemoDevicePlan[];
  params: DemoAdminParams;
  mapDev: DemoCatalogKey;
  prevUnit: number;
  prevBank: "A" | "B";
}

export interface DemoAdminActions {
  setMapping: (key: string, register: string) => void;
  resetMapping: () => void;
  setDevice: (index: number, patch: Partial<DemoDevicePlan>) => void;
  setParams: (patch: Partial<DemoAdminParams>) => void;
  setMapDev: (key: DemoCatalogKey) => void;
  setPrev: (unit: number, bank: "A" | "B") => void;
  copyMapping: () => void;
}

export interface DemoAdminViewProps {
  topology: NovaTopology;
  state: NovaMimicState;
  runs: OperationRunRecord[];
  logs: LogEntry[];
  /** Gerçek Modbus yazma izi (varsa trace'in birincil kaynağı). */
  writes?: DemoCommandWrite[];
  admin: DemoAdminStateShape;
  actions: DemoAdminActions;
  copyLabel?: string;
}

const f = (v: number, d = 1): string => (Math.round(v * 10 ** d) / 10 ** d).toFixed(d);

const DEV_GROUPS: Array<[DemoCatalogKey, string]> = [
  ["bsc", "Battery · LGES Flex BSC"],
  ["pcs", "PCS · Wattox MPCS"],
  ["hvac", "HVAC · MC90"],
  ["cmd-bsc", "Battery commands"],
  ["cmd-pcs", "PCS commands"],
  ["cmd-hvac", "HVAC commands"],
];

const prioTag = (prio: string): string =>
  prio === "essential" ? "c-warn" : prio === "command" ? "c-info" : prio === "alarm" ? "c-alarm" : "c-muted";

const groupByPrio = (regs: DemoRegister[]): Array<[string, DemoRegister[]]> => {
  const groups = new Map<string, DemoRegister[]>();
  for (const r of regs) {
    const list = groups.get(r.prio) ?? [];
    list.push(r);
    groups.set(r.prio, list);
  }
  return [...groups.entries()];
};

export const DemoAdminView: React.FC<DemoAdminViewProps> = ({
  topology,
  state,
  runs,
  logs,
  writes,
  admin,
  actions,
  copyLabel,
}) => {
  const [tab, setTab] = useState<"map" | "par" | "dev" | "cat" | "trace">("map");
  const [catQ, setCatQ] = useState("");
  const L = topology.limits;

  const tabs: Array<[typeof tab, string]> = [
    ["map", "Data mapping"],
    ["par", "Site parameters"],
    ["dev", "Devices"],
    ["cat", "Register catalogue"],
    ["trace", "Modbus trace"],
  ];

  const catalog = useMemo(() => demoCatalog(admin.mapDev), [admin.mapDev]);
  const mapRows = useMemo(
    () => DEMO_MAPPING.filter((m) => m.device === admin.mapDev),
    [admin.mapDev],
  );

  const allRegs = useMemo(
    () =>
      (["bsc", "pcs", "hvac", "cmd-bsc", "cmd-pcs", "cmd-hvac"] as DemoCatalogKey[])
        .flatMap((k) => demoCatalog(k)),
    [],
  );
  const catRows = useMemo(() => {
    const q = catQ.trim().toLowerCase();
    return allRegs.filter(
      (r) =>
        !q ||
        r.name.toLowerCase().includes(q) ||
        r.id.toLowerCase().includes(q) ||
        addrText(r).toLowerCase().includes(q),
    );
  }, [allRegs, catQ]);

  const traceRows = useMemo(
    () => (writes && writes.length ? commandWriteTraceRows(writes) : commandTraceRows(runs, logs)),
    [writes, runs, logs],
  );

  return (
    <div className="card" data-testid="demo-admin">
      <header>
        <h2>Master admin</h2>
        <div className="seg" role="group" aria-label="Admin section">
          {tabs.map(([id, label]) => (
            <button key={id} type="button" aria-pressed={tab === id} onClick={() => setTab(id)}>
              {label}
            </button>
          ))}
        </div>
      </header>

      {/* ── Data mapping ── */}
      {tab === "map" ? (
        <>
          <div className="atools">
            <div className="seg" role="group" aria-label="Device">
              {DEV_GROUPS.map(([k, label]) => (
                <button key={k} type="button" data-mapdev={k} aria-pressed={admin.mapDev === k} onClick={() => actions.setMapDev(k)}>
                  {label}
                </button>
              ))}
            </div>
            <span className="inl">
              <label className="dsub" htmlFor="pvU">
                Live preview
              </label>
              <select
                id="pvU"
                value={admin.prevUnit}
                onChange={(e) => actions.setPrev(Number(e.target.value), admin.prevBank)}
              >
                {state.units.map((u) => (
                  <option key={u.n} value={u.n}>
                    BESS#{u.n}
                  </option>
                ))}
              </select>
              <select
                aria-label="Bank"
                value={admin.prevBank}
                onChange={(e) => actions.setPrev(admin.prevUnit, e.target.value as "A" | "B")}
              >
                {topology.unit.banks.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </span>
            <span className="row">
              <button type="button" className="btn sm" onClick={actions.copyMapping}>
                Copy mapping JSON
              </button>
              <button type="button" className="btn sm" onClick={actions.resetMapping}>
                Reset to defaults
              </button>
              {copyLabel ? <span className="dsub">{copyLabel}</span> : null}
            </span>
          </div>
          <p className="dsub pad">
            Choose which register feeds each screen element. Changes are kept in this browser; copy the JSON into
            the backend configuration.
          </p>
          <div className="tblwrap">
            <table className="dt map">
              <thead>
                <tr>
                  <th>Screen element</th>
                  <th className="txt">Shown on</th>
                  <th className="txt">Register</th>
                  <th className="txt">Address</th>
                  <th className="txt">Type · scale · unit</th>
                  <th className="txt">Live value</th>
                </tr>
              </thead>
              <tbody>
                {mapRows.map((m) => {
                  const current = admin.mapping[m.key] ?? m.register;
                  const r = ALL_DEMO_REGISTERS[current];
                  return (
                    <tr key={m.key}>
                      <td className="txt">
                        <b>{m.label}</b>
                        <small>{m.key}</small>
                      </td>
                      <td className="txt">{m.shownOn}</td>
                      <td className="txt">
                        <select value={current} onChange={(e) => actions.setMapping(m.key, e.target.value)}>
                          <option value="">— not mapped —</option>
                          {groupByPrio(catalog).map(([prio, regs]) => (
                            <optgroup key={prio} label={prio.charAt(0).toUpperCase() + prio.slice(1)}>
                              {regs.map((reg) => (
                                <option key={reg.id} value={reg.id}>
                                  {reg.name} · {addrText(reg)}
                                </option>
                              ))}
                            </optgroup>
                          ))}
                        </select>
                        {current !== m.register ? <small className="c-warn">changed</small> : null}
                      </td>
                      <td className="txt">
                        {addrText(r)}
                        <small>{r?.fc ? `FC ${r.fc}` : ""}</small>
                      </td>
                      <td className="txt">{typeText(r)}</td>
                      <td className="txt" data-live={m.key}>
                        {adminLiveValue(state, topology, admin.prevUnit, admin.prevBank, current)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      ) : null}

      {/* ── Site parameters ── */}
      {tab === "par" ? (
        <>
          <div className="pargrid">
            <section>
              <h4>Rest time</h4>
              <label className="fld">
                <span>Rest after full charge / discharge (hours)</span>
                <span className="inl">
                  <select
                    value={admin.params.restH}
                    onChange={(e) => actions.setParams({ restH: Number(e.target.value) })}
                  >
                    {[0.5, 1, 1.5, 2, 3, 4, 6].map((v) => (
                      <option key={v} value={v}>
                        {v} h
                      </option>
                    ))}
                  </select>
                </span>
                <small>
                  Shown red “not complete” until elapsed. A group inside {L.tempMin}–{L.tempMax} °C may be released
                  earlier.
                </small>
              </label>
            </section>
            <section>
              <h4>Ambient temperature</h4>
              <div className="seg" role="group" aria-label="Ambient mode">
                <button type="button" aria-pressed={admin.params.ambMode === "fixed"} onClick={() => actions.setParams({ ambMode: "fixed" })}>
                  Fixed
                </button>
                <button type="button" aria-pressed={admin.params.ambMode === "profile"} onClick={() => actions.setParams({ ambMode: "profile" })}>
                  Daily profile
                </button>
              </div>
              <label className="fld">
                <span>{admin.params.ambMode === "fixed" ? "Ambient (°C)" : "Daily mean (°C)"}</span>
                <span className="inl">
                  <input type="number" step="0.5" min={-30} max={50} value={admin.params.ambC} onChange={(e) => actions.setParams({ ambC: Number(e.target.value) })} />
                </span>
              </label>
              <label className="fld">
                <span>Daily swing peak-to-peak (°C)</span>
                <span className="inl">
                  <input type="number" step="1" min={0} max={25} disabled={admin.params.ambMode === "fixed"} value={admin.params.ambSwing} onChange={(e) => actions.setParams({ ambSwing: Number(e.target.value) })} />
                </span>
                <small>Peak at 15:00</small>
              </label>
              <label className="cb">
                <input type="checkbox" checked={admin.params.solar} onChange={(e) => actions.setParams({ solar: e.target.checked })} /> Solar
                gain on the container ({DEMO_THERMAL.solarKW} kW peak)
              </label>
            </section>
            <section>
              <h4>Thermal model</h4>
              <label className="fld">
                <span>Max heat generation per container (kW)</span>
                <span className="inl">
                  <input type="number" step="1" min={10} max={150} value={admin.params.qGenMaxKW} onChange={(e) => actions.setParams({ qGenMaxKW: Number(e.target.value) })} />
                </span>
                <small>At rated power (2 × {f(DEMO_THERMAL.pcsMaxMW * 1000, 0)} kW)</small>
              </label>
              <label className="fld">
                <span>HVAC cooling capacity per container (kW)</span>
                <span className="inl">
                  <input type="number" step="1" min={10} max={150} value={admin.params.coolKW} onChange={(e) => actions.setParams({ coolKW: Number(e.target.value) })} />
                </span>
                <small>8 × MC90 · datasheet 10.2 kW each</small>
              </label>
              <div className="fld">
                <span>Heat vs power</span>
                <div className="seg" role="group" aria-label="Heat model">
                  <button type="button" aria-pressed={admin.params.genExp === 2} onClick={() => actions.setParams({ genExp: 2 })}>
                    I²R (P²)
                  </button>
                  <button type="button" aria-pressed={admin.params.genExp === 1} onClick={() => actions.setParams({ genExp: 1 })}>
                    Linear (P)
                  </button>
                </div>
              </div>
            </section>
          </div>
          <div className="pad">
            <h4>Linear thermal model (per DC bus, two nodes)</h4>
            <pre className="eq">{`Cb·dTb/dt = Qgen − UAba·(Tb − Ta)\nCa·dTa/dt = UAba·(Tb − Ta) + UAwall·(Tamb − Ta) + Qsolar + Qint − Qcool + Qheat\nQgen = Qmax · (|P| / Pmax)^n        Qcool = HVAC capacity · demand (30–100 %, all units synchronised)`}</pre>
            <table className="dt">
              <tbody>
                <tr>
                  <td className="txt">Battery thermal mass Cb (container)</td>
                  <td>{f(DEMO_THERMAL.cBattKJK / 3600, 2)} kWh/K</td>
                  <td className="txt">16 racks × 1954 kg × 1.0 kJ/kgK (S-001)</td>
                </tr>
                <tr>
                  <td className="txt">Air + interior Ca</td>
                  <td>{f(DEMO_THERMAL.cAirKJK / 3600, 2)} kWh/K</td>
                  <td className="txt">air 67 m³ + racks frames / structure (estimate)</td>
                </tr>
                <tr>
                  <td className="txt">Battery → air UAba</td>
                  <td>{DEMO_THERMAL.uaBattAirKWK} kW/K</td>
                  <td className="txt">3 K rise at the 60 kW maximum (rack fans, forced air)</td>
                </tr>
                <tr>
                  <td className="txt">Envelope UAwall</td>
                  <td>{DEMO_THERMAL.uaWallKWK} kW/K</td>
                  <td className="txt">heating need 23 kW at ΔT 50 K (Calculation_BESS › Thermal Management)</td>
                </tr>
                <tr>
                  <td className="txt">Without HVAC at max heat</td>
                  <td>{f(admin.params.qGenMaxKW / (DEMO_THERMAL.cBattKJK / 3600), 1)} K/h</td>
                  <td className="txt">initial battery heating rate</td>
                </tr>
                <tr>
                  <td className="txt">Cooling margin</td>
                  <td>{f(admin.params.coolKW - admin.params.qGenMaxKW, 0)} kW</td>
                  <td className="txt">
                    {admin.params.coolKW} kW capacity vs {admin.params.qGenMaxKW} kW max generation
                  </td>
                </tr>
              </tbody>
            </table>
            <h4>Live per container</h4>
            <div className="tblwrap">
              <table className="dt">
                <thead>
                  <tr>
                    <th>Group</th>
                    <th>P MW</th>
                    <th>Q gen kW</th>
                    <th>Q cool kW</th>
                    <th>Q heat kW</th>
                    <th>T battery</th>
                    <th>T room</th>
                    <th>Cells min–max</th>
                    <th className="txt">HVAC</th>
                    <th>HVAC el. kW</th>
                    <th>Ready</th>
                  </tr>
                </thead>
                <tbody>
                  {state.units.map((u) => {
                    const pMW = u.pcs.reduce((a, p) => a + (p.state === "chg" ? -p.pMW : p.state === "dis" ? p.pMW : 0), 0);
                    const cool = (u.hvac ?? []).filter((h) => h.mode === "cool").length;
                    const heat = (u.hvac ?? []).filter((h) => h.mode === "heat").length;
                    const tmax = Math.max(...u.banks.map((b) => b.tmax));
                    const tmin = Math.min(...u.banks.map((b) => b.tmin ?? b.tmax));
                    const th = thermalRow(pMW, cool, heat, tmax, state.ambient ?? admin.params.ambC);
                    const ready = tmin >= L.tempMin && tmax <= L.tempMax;
                    return (
                      <tr key={u.n}>
                        <td className="txt">BESS#{u.n}</td>
                        <td>{f(pMW, 2)}</td>
                        <td>{f(th.qGen, 1)}</td>
                        <td>{f(th.qCool, 1)}</td>
                        <td>{f(th.qHeat, 1)}</td>
                        <td>{f(th.tBatt, 2)}</td>
                        <td>{f(th.tRoom, 2)}</td>
                        <td>
                          {f(tmin)}–{f(tmax)}
                        </td>
                        <td className="txt">{cool ? `cool ${cool}/8` : heat ? "heat" : "idle"}</td>
                        <td>{f(cool * 4.1 + heat * 4, 1)}</td>
                        <td className={ready ? "" : "sev-alarm"}>{ready ? "Yes" : "No"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : null}

      {/* ── Devices ── */}
      {tab === "dev" ? (
        <>
          <p className="dsub pad">
            Modbus TCP endpoints. One Flex BSC per battery section, one Wattox PCS per section, 8 MC90 HVAC per
            container behind a Modbus TCP gateway (unit ID = RS485 slave). Edit to the site IP plan.
          </p>
          <div className="tblwrap">
            <table className="dt dev">
              <thead>
                <tr>
                  <th>Device</th>
                  <th className="txt">Type</th>
                  <th className="txt">IP address</th>
                  <th className="txt">Port</th>
                  <th className="txt">Unit ID</th>
                  <th className="txt">Poll plan</th>
                </tr>
              </thead>
              <tbody>
                {admin.devices.map((d, i) => (
                  <tr key={d.id}>
                    <td className="txt">
                      <b>{d.id}</b>
                    </td>
                    <td className="txt">
                      {d.kind === "bsc" ? "LGES Flex BSC" : d.kind === "hvac" ? "Envicool MC90 · RTU gw" : "Wattox MPCS-1725-S"}
                    </td>
                    <td className="txt">
                      <input value={d.ip} onChange={(e) => actions.setDevice(i, { ip: e.target.value })} aria-label={`${d.id} IP`} />
                    </td>
                    <td className="txt">
                      <input className="sm" value={d.port} onChange={(e) => actions.setDevice(i, { port: Number(e.target.value) })} aria-label={`${d.id} port`} />
                    </td>
                    <td className="txt">
                      <input className="sm" value={d.unitId} onChange={(e) => actions.setDevice(i, { unitId: Number(e.target.value) })} aria-label={`${d.id} unit ID`} />
                    </td>
                    <td className="txt">
                      {d.kind === "bsc" ? "1 s essential · 1 s summary · 5 s racks" : d.kind === "hvac" ? "2 s info · 2 s alarms · 60 s settings" : "1 s status/meas · 1 s faults · 5 s settings"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}

      {/* ── Register catalogue ── */}
      {tab === "cat" ? (
        <>
          <div className="atools">
            <label className="inl">
              <span className="dsub">Search</span>
              <input type="search" value={catQ} placeholder="name or address" onChange={(e) => setCatQ(e.target.value)} />
            </label>
          </div>
          <div className="plans">
            <div>
              <h4>Flex BSC poll plan</h4>
              <ul className="mon">
                {DEMO_BSC.pollPlan.map((p, i) => (
                  <li key={i}>
                    FC {p.fc} · {p.from} × {p.count} · {p.every} · {p.what}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4>Wattox PCS poll plan</h4>
              <ul className="mon">
                {DEMO_PCS.pollPlan.map((p, i) => (
                  <li key={i}>
                    FC {p.fc} · {p.from} × {p.count} · {p.every} · {p.what}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4>MC90 HVAC poll plan</h4>
              <ul className="mon">
                {DEMO_HVAC.pollPlan.map((p, i) => (
                  <li key={i}>
                    FC {p.fc} · {p.from} × {p.count} · {p.every} · {p.what}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="tblwrap">
            <table className="dt cat">
              <thead>
                <tr>
                  <th className="txt">Device</th>
                  <th className="txt">Name</th>
                  <th className="txt">Address</th>
                  <th className="txt">FC</th>
                  <th className="txt">Type</th>
                  <th className="txt">Priority</th>
                  <th className="txt">Note</th>
                </tr>
              </thead>
              <tbody>
                {catRows.slice(0, 300).map((r) => (
                  <tr key={r.id}>
                    <td className="txt">{r.src ?? "—"}</td>
                    <td className="txt">
                      <b>{r.name}</b>
                      <small>{r.id}{r.param ? ` · ${r.param}` : ""}</small>
                    </td>
                    <td className="txt">{addrText(r)}</td>
                    <td className="txt">{r.fc ?? ""}</td>
                    <td className="txt">{typeText(r)}</td>
                    <td className="txt">
                      <span className={`tag ${prioTag(r.prio)}`}>{r.prio}</span>
                    </td>
                    <td className="txt">{r.note ?? ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}

      {/* ── Modbus trace ── */}
      {tab === "trace" ? (
        <>
          <p className="dsub pad">
            Every write the PMS performs on command execution (newest first). Direct `POST /commands/execute`
            writes carry the real register address and value; maneuver step writes and container-tier writes are
            added in the next iteration.
          </p>
          <div className="tblwrap">
            <table className="dt trace">
              <thead>
                <tr>
                  <th className="txt">Time</th>
                  <th className="txt">Device</th>
                  <th className="txt">FC</th>
                  <th className="txt">Address</th>
                  <th className="txt">Value</th>
                  <th className="txt">Meaning</th>
                </tr>
              </thead>
              <tbody>
                {traceRows.length ? (
                  traceRows.map((t, i) => (
                    <tr key={i}>
                      <td className="txt">{t.time}</td>
                      <td className="txt">{t.device}</td>
                      <td className="txt">{t.fc}</td>
                      <td className="txt">{t.addr}</td>
                      <td className="txt">{t.value}</td>
                      <td className="txt">{t.meaning}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="txt" colSpan={6}>
                      No trace yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </div>
  );
};

export { DEMO_DEVICES };
