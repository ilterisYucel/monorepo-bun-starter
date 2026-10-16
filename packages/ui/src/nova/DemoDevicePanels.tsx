import React from "react";
import type { NovaHvacState, NovaPcsState, NovaTopology, NovaUnitState } from "./mimic-types";
import { PCS_TEXT, POS_TEXT, rackSeverity } from "./nova-mimic";

/**
 * Demo cihaz panelleri (SPEC UC-4): MV · Battery · PCS · HVAC · FSS · RMU&TR ·
 * AUX. Referans konsol düzeni; veri props'tan gelir (canlı telemetri + türetim).
 */

export type DemoDeviceSection = "mv" | "battery" | "pcs" | "hvac" | "fss" | "rmutr" | "aux";

export const DEMO_DEVICE_TABS: Array<{ id: DemoDeviceSection; label: string }> = [
  { id: "battery", label: "Battery" },
  { id: "pcs", label: "PCS" },
  { id: "hvac", label: "HVAC" },
  { id: "fss", label: "FSS" },
  { id: "rmutr", label: "RMU & TR" },
  { id: "mv", label: "MV cells" },
  { id: "aux", label: "AUX" },
];

const f = (v: number, d = 1): string => (Math.round(v * 10 ** d) / 10 ** d).toFixed(d);
const tsev = (t: number, min: number, max: number): string =>
  t > max ? "sev-alarm" : t < min ? "sev-cold" : "";
const isRun = (p: NovaPcsState): boolean => p.state === "chg" || p.state === "dis";
const signed = (p: NovaPcsState): number => (p.state === "chg" ? -p.pMW : p.state === "dis" ? p.pMW : 0);
const unitP = (u: NovaUnitState | undefined): number => (u ? u.pcs.reduce((a, p) => a + signed(p), 0) : 0);

export interface DemoDevicePanelProps {
  unit: NovaUnitState | undefined;
  topology: NovaTopology;
  /** Site kV (trafo akım hesabı için) — yoksa nominal. */
  stationKv?: number;
}

/** MV cells — station breaker/metering table. */
export const DemoMvPanel: React.FC<DemoDevicePanelProps> = ({ topology }) => (
  <DataTable
    head={["Cell", "Label", "Type", "Motorised", "Earth switch"]}
    rows={topology.station.cells.map((c) => [
      c.id,
      c.label,
      c.kind.toUpperCase(),
      c.motor ? "Yes" : "—",
      c.es ? (c.esMotor ? "Motorised" : "Manual") : "—",
    ])}
  />
);

/** Battery — rack SOC/V/I/temperature map per bus. */
export const DemoBatteryPanel: React.FC<DemoDevicePanelProps> = ({ unit, topology }) => {
  if (!unit) return <Empty />;
  const L = topology.limits;
  return (
    <div style={{ display: "grid", gap: 12 }}>
      {unit.banks.map((b) => (
        <div key={b.id}>
          <h4>
            DC BUS {b.id} · SOC {f(b.soc)} % · SOH {f(b.soh)} % · {f(b.vdc, 0)} V
          </h4>
          <DataTable
            head={["Rack", "SOC %", "V", "A", "°C"]}
            rows={Array.from({ length: topology.unit.racksPerBank }).map((_, r) => {
              const t = b.racks[r];
              return [
                `Rack#${r + 1}`,
                b.rackSoc?.[r] !== undefined ? f(b.rackSoc[r]!) : "—",
                b.rackV?.[r] !== undefined ? f(b.rackV[r]!, 0) : "—",
                b.rackI?.[r] !== undefined ? f(b.rackI[r]!, 0) : "—",
                t !== undefined ? f(t) : "—",
              ];
            })}
            rowStyle={(ri) => {
              const t = b.racks[ri];
              const sev = t !== undefined ? rackSeverity(t, L) : null;
              return sev === "alarm"
                ? { color: "var(--nm-alarm)" }
                : sev === "cold"
                  ? { color: "var(--nm-cold)" }
                  : undefined;
            }}
          />
        </div>
      ))}
    </div>
  );
};

/** PCS — Wattox register table (referans 14 satır) + fault words. */
export const DemoPcsPanel: React.FC<DemoDevicePanelProps> = ({ unit }) => {
  if (!unit) return <Empty />;
  const rows: Array<[string, string, (p: NovaPcsState) => string, (p: NovaPcsState) => string | undefined]> = [
    ["Operation status", "0x2F7D", (p) => PCS_TEXT[p.state], (p) => (p.state === "fault" ? "alarm" : undefined)],
    ["Active power setpoint (S06)", "0x0E19", (p) => (p.setpointKw !== undefined ? `${f(p.setpointKw, 0)} kW` : "—")],
    ["Active power", "0x2F7E", (p) => `${f(signed(p) * 1000, 0)} kW`],
    ["Grid line voltage AB", "0x2F4F", (p) => (p.vac !== undefined ? `${f(p.vac, 0)} V` : "—")],
    ["Grid frequency", "0x2F4E", (p) => (p.freq !== undefined ? `${f(p.freq, 2)} Hz` : "—")],
    ["DC voltage", "0x2F48", (p) => (p.dcVoltage !== undefined ? `${f(p.dcVoltage, 0)} V` : "—")],
    ["DC current", "0x2F49", (p) => (p.idc !== undefined ? `${f(p.idc, 0)} A` : "—")],
    ["IGBT temperature", "0x2F54", (p) => `${f(p.igbtC, 0)} °C`, (p) => (p.igbtC >= 80 ? "alarm" : undefined)],
    ["AC breaker", "0x2F5B", (p) => (p.acCb ? POS_TEXT[p.acCb] : "—")],
    ["DC breaker", "0x2F5C", (p) => (p.dcCb ? POS_TEXT[p.dcCb] : "—")],
    ["Emergency stop", "0x2F60", (p) => (p.estop === undefined ? "—" : p.estop ? "Active" : "Normal"), (p) => (p.estop ? "alarm" : undefined)],
    ["Allowable charge power", "BSC 30063 ∩ PCS", (p) => (p.chgLimitKw !== undefined ? `${f(p.chgLimitKw, 0)} kW` : "—")],
    ["Allowable discharge power", "BSC 30065 ∩ PCS", (p) => (p.disLimitKw !== undefined ? `${f(p.disLimitKw, 0)} kW` : "—")],
    ["Temperature derate (EMS 50 %)", "PMS", (p) => (p.limited ? "Active" : "—"), (p) => (p.limited ? "warn" : undefined)],
  ];
  return (
    <>
      <div className="tblwrap">
        <table className="dt">
          <thead>
            <tr>
              <th>Wattox MPCS-1725-S · Modbus TCP</th>
              <th className="txt">Address</th>
              {unit.pcs.map((p) => (
                <th key={p.id}>PCS-{unit.n}{p.id}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(([label, addr, fn, sev]) => (
              <tr key={label}>
                <td className="txt">{label}</td>
                <td className="txt">
                  <code>{addr}</code>
                </td>
                {unit.pcs.map((p) => {
                  const s = sev?.(p);
                  return (
                    <td key={p.id} className={s ? `sev-${s}` : undefined}>
                      {fn(p)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <h4>Fault words 0x2FB5–0x2FBE</h4>
      <ul className="mon">
        {unit.pcs.map((p) => {
          const words = (p.faultWords ?? []).filter((w) => w !== 0);
          return (
            <li key={p.id}>
              <b>PCS-{unit.n}{p.id}</b>:{" "}
              {words.length
                ? words.map((w, i) => `0x${w.toString(16).toUpperCase().padStart(4, "0")} (word ${i + 1})`).join(" · ")
                : "no active fault bits"}
            </li>
          );
        })}
      </ul>
    </>
  );
};

const HVAC_MODE: Record<NovaHvacState["mode"], string> = {
  cool: "COOLING",
  heat: "HEATING",
  fault: "FAULT",
  fan: "FAN ONLY",
  off: "OFF",
  standby: "STANDBY",
};

const HVAC_RATED_KW = 4.1;
const HVAC_HEATER_KW = 4;
const HVAC_COOL_KW = 10.2;

/** HVAC — control summary + 4 sections × 2 × MC90 + counters. */
export const DemoHvacPanel: React.FC<DemoDevicePanelProps> = ({ unit, topology }) => {
  const L = topology.limits;
  const hv = unit?.hvac ?? [];
  const coolCount = hv.filter((h) => h.mode === "cool").length;
  const heatCount = hv.filter((h) => h.mode === "heat").length;
  const roomMax = hv.length ? Math.max(...hv.map((h) => h.returnT)) : 0;
  const roomMin = hv.length ? Math.min(...hv.map((h) => h.returnT)) : 0;
  const cellsMax = unit ? Math.max(...unit.banks.map((b) => b.tmax)) : 0;
  const cellsMin = unit ? Math.min(...unit.banks.map((b) => b.tmin ?? b.tmax)) : 0;
  const pMaxMW = topology.unit.pcsMaxMW;
  const qGen = pMaxMW > 0 ? 60 * (Math.abs(unitP(unit)) / (pMaxMW * 2)) ** 2 : 0;
  const hvacEl = coolCount * HVAC_RATED_KW + heatCount * HVAC_HEATER_KW;
  const cooling = coolCount * HVAC_COOL_KW;

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div className="mgrid">
        <div>
          <small>Control</small>
          <b>
            {coolCount > 0 ? `Cooling ${coolCount}/8` : heatCount > 0 ? "Heating" : "Idle (fans)"}
          </b>
          <em>All 8 units synchronised · same command</em>
        </div>
        <div>
          <small>Room max · min</small>
          <b className="num">
            {f(roomMax)} · {f(roomMin)} °C
          </b>
          <em>
            Target band {L.tempMin}–{L.tempMax} °C
          </em>
        </div>
        <div>
          <small>Cells max · min → 0x2000 / 0x2001</small>
          <b className="num">
            {f(cellsMax)} · {f(cellsMin)} °C
          </b>
          <em>Control mode 4 (monitoring temperature)</em>
        </div>
        <div>
          <small>Heat gen · cooling · HVAC el.</small>
          <b className="num">
            {f(qGen)} · {f(cooling)} · {f(hvacEl)} kW
          </b>
          <em>Capacity 80 kW · max heat 60 kW</em>
        </div>
      </div>

      <div className="hvsecs">
        {(topology.unit.sections ?? []).map((s) => (
          <section key={s.id} className="hvsec" data-testid="hvac-section">
            <header>
              <b>Section {s.id}</b>
              <span>
                Rack#{s.racks[0]}–{s.racks[s.racks.length - 1]} · DC BUS#
                {topology.unit.banks.indexOf(s.bank) + 1}
              </span>
            </header>
            <div className="hvpair">
              {s.hvac.map((hid) => {
                const h = unit?.hvac?.find((x) => x.id === hid);
                const mode = h?.mode ?? "off";
                return (
                  <div key={hid} className={`hvc ${mode}`}>
                    <div className="hvc-h">
                      <b>HVAC-{hid}</b>
                      <span className="hvc-m">{HVAC_MODE[mode]}</span>
                    </div>
                    <div className="hvc-g">
                      <div>
                        <small>Status</small>
                        <b>{h?.mode === "fault" ? "Fault" : h?.on ? "Running" : "Standby"}</b>
                      </div>
                      <div>
                        <small>Compressor</small>
                        <b>{h?.comp ? "Run" : "Stop"}</b>
                      </div>
                      <div>
                        <small>Heater</small>
                        <b>{h?.heater ? "On" : "Off"}</b>
                      </div>
                      <div>
                        <small>Supply air</small>
                        <b className="num">{h ? `${f(h.supplyT)} °C` : "—"}</b>
                      </div>
                      <div>
                        <small>Return/room</small>
                        <b className={`num ${h ? tsev(h.returnT, L.tempMin, L.tempMax) : ""}`}>
                          {h ? `${f(h.returnT)} °C` : "—"}
                        </b>
                      </div>
                      <div>
                        <small>Outside</small>
                        <b className="num">{h?.outsideT !== undefined ? `${f(h.outsideT)} °C` : "—"}</b>
                      </div>
                      <div>
                        <small>In/out fan</small>
                        <b className="num">
                          {h?.inFanRpm ?? 0}/{h?.outFanRpm ?? 0} rpm
                        </b>
                      </div>
                      <div>
                        <small>Humidity</small>
                        <b className="num">{h?.rh !== undefined ? `${f(h.rh, 0)} %` : "—"}</b>
                      </div>
                      <div>
                        <small>Condenser</small>
                        <b className="num">{h?.condenserT !== undefined ? `${f(h.condenserT)} °C` : "—"}</b>
                      </div>
                      <div>
                        <small>Evaporator</small>
                        <b className="num">{h?.evaporatorT !== undefined ? `${f(h.evaporatorT)} °C` : "—"}</b>
                      </div>
                      <div>
                        <small>AC input</small>
                        <b className="num">{h?.acV !== undefined ? `${f(h.acV, 0)} V` : "—"}</b>
                      </div>
                      <div>
                        <small>Electric (est.)</small>
                        <b className="num">{h ? `${f(h.mode === "heat" ? HVAC_HEATER_KW : h.comp ? HVAC_RATED_KW : 0.3)} kW` : "—"}</b>
                      </div>
                    </div>
                    <div className="hvc-f">
                      <span>{h?.alarms.length ? <b className="c-alarm">{h.alarms.join(", ")}</b> : "No alarms"}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      <h4>Counters and settings</h4>
      <div className="tblwrap">
        <table className="dt">
          <thead>
            <tr>
              <th>MC90 register</th>
              <th className="txt">Addr</th>
              {hv.map((h) => (
                <th key={h.id}>{unit?.n}.{h.id}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="txt">Compressor starts</td>
              <td className="txt">
                <code>0x1028</code>
              </td>
              {hv.map((h) => (
                <td key={h.id}>{50 + h.id * 7}</td>
              ))}
            </tr>
            <tr>
              <td className="txt">Internal fan run time</td>
              <td className="txt">
                <code>0x1024</code>
              </td>
              {hv.map((h) => (
                <td key={h.id}>{h.runH !== undefined ? f(h.runH, 0) : "—"}</td>
              ))}
            </tr>
            <tr>
              <td className="txt">Compressor run time</td>
              <td className="txt">
                <code>0x1020</code>
              </td>
              {hv.map((h) => (
                <td key={h.id}>{h.compH !== undefined ? f(h.compH, 0) : "—"}</td>
              ))}
            </tr>
            <tr>
              <td className="txt">Temperature control mode</td>
              <td className="txt">
                <code>0x0009</code>
              </td>
              {hv.map((h) => (
                <td key={h.id}>4 · Monitoring</td>
              ))}
            </tr>
            <tr>
              <td className="txt">Cooling / heating set</td>
              <td className="txt">
                <code>0x000A / 0x001C</code>
              </td>
              {hv.map((h) => (
                <td key={h.id}>23 / 18 °C</td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

/** FSS — Sigma XT panel + disablements + gas detectors. */
export const DemoFssPanel: React.FC<DemoDevicePanelProps> = ({ unit, topology }) => {
  const F = unit?.fss;
  const FS = topology.unit.fss;
  const status = F?.status ?? "normal";
  const disp = F?.released ? "EEE" : F?.imminent ? String(F.countdown ?? 0).padStart(2, "0") : "--";
  const led = (on: boolean, label: string, cls: string): React.ReactNode => (
    <span className={`led ${on ? `on ${cls}` : ""}`}>
      <i />
      {label}
    </span>
  );
  const disTxt: Record<string, string> = {
    dE: "Extinguishant control",
    dt: "Manual release",
    dc: "Extract fan",
    dP: "1st stage relay output",
    dA: "2nd stage relay output",
    db: "1st stage sounders",
  };
  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div className={`fsshead ${status}`}>
        <div className="seg7">{disp}</div>
        <div>
          <h3>
            {F?.released
              ? "EXTINGUISHANT RELEASED"
              : F?.imminent
                ? `RELEASE IMMINENT · ${F.countdown ?? 0} s`
                : status === "fire"
                  ? "FIRE ALARM"
                  : status.toUpperCase()}
          </h3>
          <p className="dsub">
            {FS?.panel ?? "Sigma XT"} · {F?.mode === "manual" ? "Manual only mode – extinguishant will NOT be released by automatic detection" : "Automatic and manual mode"} · power normal
          </p>
        </div>
      </div>
      <div className="leds">
        {led(status === "fire", "Fire", "alarm")}
        {led(status === "fault", "Fault", "warn")}
        {led(status === "disabled", "Disabled", "warn")}
        {led(status === "test", "Test", "warn")}
        {led(F?.mode === "manual", "Manual only", "warn")}
        {led(F?.mode === "auto", "Automatic & manual", "ok")}
        {led(F?.imminent ?? false, "Release imminent", "alarm")}
        {led(F?.released ?? false, "Released", "alarm")}
        {led(true, "Ventilation fans", "info")}
      </div>
      <div className="fssgrid">
        <div>
          <h4>Detection zones</h4>
          <DataTable
            head={["Zone", "Detection", "State"]}
            rows={(F?.zones ?? []).map((z) => [String(z.id), z.name, z.state.toUpperCase()])}
          />
          <h4>Disablements (mode menu)</h4>
          <DataTable
            head={["Code", "Function", "State"]}
            rows={Object.entries(disTxt).map(([k, label]) => [
              k,
              label,
              F?.disablements?.[k as "dE"] ? "DISABLED" : "Enabled",
            ])}
          />
        </div>
        <div>
          <h4>Gas detectors · {FS?.detector ?? "Vigilex VIGI-DT1"} (Modbus RTU)</h4>
          <DataTable
            head={["#", "H₂ %LEL", "VOC", "RH %", "T °C", "State"]}
            rows={(F?.detectors ?? []).map((d) => [
              String(d.id),
              f(d.lel, 2),
              f(d.voc, 0),
              f(d.rh, 0),
              f(d.t),
              d.alarm ? "ALARM" : d.fault ? "FAULT" : "Normal",
            ])}
          />
          <h4>Explosion vents</h4>
          <p>{FS?.vents ?? "Vigilex explosion vent panels"}: <b>{F?.ventsOpen ? "OPEN" : "closed"}</b></p>
          <h4>PMS actions</h4>
          <ul className="mon">
            <li>Fire (2 zones / 1st stage): FL-05 emergency stop of the group – PCS stop, BSC Emergency, RMU H02 open, earthing switch; HVAC forced standby</li>
            <li>Gas alarm: group stop and isolation, ventilation fans on</li>
            <li>Panel fault / disabled / manual only: warning; charge/discharge allowed</li>
            <li>Reset on the panel → mark the fault resolved → FL-06 recovery</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

/** RMU & TR — positions + transformer nameplate with current/loading calc. */
export const DemoRmuTrPanel: React.FC<DemoDevicePanelProps> = ({ unit, topology, stationKv }) => {
  const U = topology.unit;
  const pMW = unitP(unit);
  const kv = stationKv && stationKv > 0 ? stationKv : topology.station.nominalKV;
  const iHV = (Math.abs(pMW) * 1e3) / (Math.sqrt(3) * kv);
  const iLV = ((Math.abs(pMW) / 2) * 1e6) / (Math.sqrt(3) * U.pcsAcV);
  const loading = (Math.abs(pMW) * 1000) / U.trKVA * 100;
  const pos = (k: string, l: string, v: string | null | undefined, motor?: boolean): React.ReactNode => (
    <div>
      <small>
        {k} · {l}
        {motor ? " · M" : ""}
      </small>
      <b className={v && v !== "closed" ? "c-warn" : ""}>{v ? POS_TEXT[v as "closed"] : "—"}</b>
    </div>
  );
  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div className="mgrid">
        {pos("H01", "LBS in", unit?.rmu.H01)}
        {pos("H02", "Transformer CB", unit?.rmu.H02, true)}
        {pos("H03", "LBS out", unit?.rmu.H03)}
        <div>
          <small>Earthing switch</small>
          <b className={unit?.rmu.es ? "c-maint" : ""}>{unit?.rmu.es ? "Closed" : "Open"}</b>
        </div>
      </div>
      <h4>Transformer</h4>
      <div className="mgrid">
        <div>
          <small>Rating</small>
          <b>{U.trKVA} kVA</b>
          <em>
            {U.trRatio} · {U.trVector}
          </em>
        </div>
        <div>
          <small>State</small>
          <b>{unit?.rmu.H02 === "closed" && stationKv && stationKv > 0 ? "Energised" : "De-energised"}</b>
        </div>
        <div>
          <small>HV current (calc.)</small>
          <b className="num">{f(iHV, 1)} A</b>
          <em>{f(pMW, 2)} MW</em>
        </div>
        <div>
          <small>LV current per PCS (calc.)</small>
          <b className="num">{f(iLV, 0)} A</b>
          <em>{U.lvLabel}</em>
        </div>
        <div>
          <small>Loading</small>
          <b className="num">{f(loading, 0)} %</b>
        </div>
      </div>
    </div>
  );
};

/** AUX — live PM5340 measurements + transformer loading + feeders + load list. */
export const DemoAuxPanel: React.FC<DemoDevicePanelProps> = ({ unit, topology }) => {
  const a = unit?.aux;
  const AUX = topology.aux;
  const kva = a ? Math.hypot(a.kW, a.kvar) : 0;
  const trKVA = AUX?.trKVA ?? 400;
  const loading = (kva / trKVA) * 100;
  const loads = topology.unit.auxLoads ?? [];
  const maxLoad = Math.max(1, ...loads.map((l) => l.kVA));

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div className="mgrid">
        <div>
          <small>Active power</small>
          <b className="num">{a ? `${f(a.kW)} kW` : "—"}</b>
          <em>{a?.kwhDelivered !== undefined ? `${f(a.kwhDelivered, 0)} kWh today` : ""}</em>
        </div>
        <div>
          <small>Reactive power</small>
          <b className="num">{a ? `${f(a.kvar)} kvar` : "—"}</b>
          <em>PF {a ? f(a.pf, 3) : "—"}</em>
        </div>
        <div>
          <small>Voltage · current</small>
          <b className="num">{a ? `${f(a.v, 0)} V` : "—"}</b>
          <em>{a ? `${f(a.iA, 0)} A · ${f(a.hz, 2)} Hz` : ""}</em>
        </div>
        <div>
          <small>Transformer loading</small>
          <b className="num">{a ? `${f(loading, 0)} %` : "—"}</b>
          <em>
            {f(kva, 1)} / {trKVA} kVA
          </em>
        </div>
      </div>
      <p className="dsub">
        The POI closed loop includes this load: the PCS setpoint is corrected so the H03 meter reads exactly the
        requested power (discharge: PCS = (P + AUX) / η, charge: PCS = (P − AUX) · η).
      </p>
      <h4>Container load list · nominal</h4>
      <div className="tblwrap">
        <table className="dt aux">
          <thead>
            <tr>
              <th>Load</th>
              <th>kVA nominal</th>
              <th>kVA peak</th>
              <th>UPS</th>
              <th className="txt">Share</th>
            </tr>
          </thead>
          <tbody>
            {loads.map((x) => (
              <tr key={x.key}>
                <td className="txt">{x.label}</td>
                <td>{f(x.kVA, 3)}</td>
                <td>{x.peakKVA !== undefined ? f(x.peakKVA, 2) : "—"}</td>
                <td>{x.ups ? "Yes" : "No"}</td>
                <td className="txt">
                  <i style={{ display: "block", height: 8, borderRadius: 2, background: "rgba(var(--nm-seq-rgb),.6)", width: `${(x.kVA / maxLoad) * 100}%` }} />
                </td>
              </tr>
            ))}
            <tr className="sum">
              <td className="txt">Per container</td>
              <td>{f(loads.reduce((s, x) => s + x.kVA, 0), 2)}</td>
              <td />
              <td />
              <td />
            </tr>
          </tbody>
        </table>
      </div>
      {AUX ? (
        <p className="dsub">
          AUX transformer · {f(AUX.trKVA, 0)} kVA · {AUX.trRatio} · {AUX.trVector} · {AUX.lvV} V
        </p>
      ) : null}
    </div>
  );
};

const Empty: React.FC = () => <p className="empty">No unit data.</p>;

const DataTable: React.FC<{
  head: string[];
  rows: string[][];
  rowStyle?: (ri: number) => React.CSSProperties | undefined;
}> = ({ head, rows, rowStyle }) => (
  <table className="dt">
    <thead>
      <tr>
        {head.map((h, i) => (
          <th key={i}>{h}</th>
        ))}
      </tr>
    </thead>
    <tbody>
      {rows.map((row, ri) => (
        <tr key={ri} style={rowStyle?.(ri)}>
          {row.map((c, ci) => (
            <td key={ci} className={ci === 0 || ci === 1 ? "txt" : undefined}>
              {c}
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  </table>
);
