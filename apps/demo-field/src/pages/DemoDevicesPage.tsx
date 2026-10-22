import React, { useMemo, useState } from "react";
import { useRmuStore } from "../features/demo-data/stores/RmuStore";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { demoApi } from "../features/demo-data/demoApi";
import { stationForUnit } from "../features/demo-data/demo-stations";
import {
  DEMO_DEVICE_TABS,
  DemoAuxPanel,
  DemoBessScada,
  DemoFssPanel,
  DemoHvacPanel,
  DemoMvPanel,
  DemoPcsPanel,
  DemoRmuTrPanel,
  DemoPackDetail,
  DemoPackSchematic,
  DemoTrendChart,
  POS_TEXT,
  packFill,
  packMarkers,
  rackPacks,
  rackRegisters,
  tcMap18,
  type DemoDeviceSection,
  type NovaUnitState,
} from "@gd-monorepo/ui";
import { useDemoProjectContext } from "../layouts/DemoProjectLayout";
import { DEMO_PACK_SPEC, DEMO_TOPOLOGY } from "../features/demo-data/demo-topology";

const f = (v: number, d = 1): string => (Math.round(v * 10 ** d) / 10 ** d).toFixed(d);
const signedP = (p: { state: string; pMW: number }): number =>
  p.state === "chg" ? -p.pMW : p.state === "dis" ? p.pMW : 0;

type Sel = { kind: "cell" | "aux" | "unit"; id?: string; n?: number; tab: DemoDeviceSection };

/** DemoDevicesPage — UC-4: cihaz ağacı + hücre/AUX/batarya/PCS/HVAC/FSS/RMU&TR. */
export const DemoDevicesPage: React.FC = () => {
  const { stationState, stationTopology } = useDemoProjectContext();
  const [params, setParams] = useSearchParams();

  const sel = useMemo<Sel>(() => {
    const tab = (params.get("tab") as DemoDeviceSection) ?? "battery";
    const unit = params.get("unit");
    const cell = params.get("cell");
    if (cell) return { kind: "cell", id: cell, tab };
    if (params.get("aux") === "1") return { kind: "aux", tab };
    const inStation = unit ? stationState.units.some((u) => u.n === Number(unit)) : false;
    return { kind: "unit", n: inStation ? Number(unit) : stationState.units[0]?.n ?? 1, tab };
  }, [params, stationState.units]);

  const unit = sel.kind === "unit" ? stationState.units.find((u) => u.n === sel.n) : undefined;

  const select = (next: { kind: Sel["kind"]; id?: string; n?: number; tab?: DemoDeviceSection }): void => {
    const p = new URLSearchParams();
    if (next.kind === "cell" && next.id) p.set("cell", next.id);
    else if (next.kind === "aux") p.set("aux", "1");
    else {
      p.set("unit", String(next.n ?? unit?.n ?? 1));
      p.set("tab", next.tab ?? sel.tab);
    }
    setParams(p, { replace: true });
  };

  return (
    <div className="devices">
      <nav className="card dtree" aria-label="Devices">
        <header>
          <h2>
            Devices<small>click a device in the site layout to jump here</small>
          </h2>
        </header>
        <div className="tg">
          <h4>{stationTopology.station.name}</h4>
          {DEMO_TOPOLOGY.station.cells.filter((c) => c.role !== "aux").map((c) => {
            const pos = stationState.station[c.id as "H01" | "H02" | "H04" | "H05"];
            const on = sel.kind === "cell" && sel.id === c.id;
            return (
              <button key={c.id} type="button" className={`ti ${on ? "on" : ""}`} onClick={() => select({ kind: "cell", id: c.id })}>
                {c.id} · {c.label}
                <small>{pos ? `CB ${POS_TEXT[pos].toLowerCase()}` : "metering"}</small>
              </button>
            );
          })}
          <button type="button" className={`ti ${sel.kind === "aux" ? "on" : ""}`} onClick={() => select({ kind: "aux" })}>
            H02 · AUX TR & panel
            <small>{DEMO_TOPOLOGY.aux?.trKVA ?? 400} kVA</small>
          </button>
        </div>
        {Object.entries(DEMO_TOPOLOGY.feeders).map(([fid, fd]) => (
        <div className="tg" key={fid}>
          <h4>
            Battery groups · {fd.cell} Feeder {fid} · BESS#{fd.units[0]}–{fd.units[fd.units.length - 1]}
          </h4>
          {stationState.units.filter((u) => fd.units.includes(u.n)).map((u) => {
            const on = sel.kind === "unit" && sel.n === u.n;
            return (
              <div key={u.n}>
                <button type="button" className={`ti ${on ? "on" : ""}`} onClick={() => select({ kind: "unit", n: u.n, tab: "battery" })}>
                  BESS#{u.n}
                  <small>
                    Feeder {fid} ({fd.cell}) · {u.rmu.H02 === "closed" ? "in service" : "isolated"}
                    {u.mirrored ? " · SIM copy" : ""}
                  </small>
                </button>
                {on ? (
                  <div className="tsub">
                    {DEMO_DEVICE_TABS.map((t) => (
                      <button key={t.id} type="button" className={`ts ${sel.tab === t.id ? "on" : ""}`} data-testid={`devtab-${t.id}`} onClick={() => select({ kind: "unit", n: u.n, tab: t.id })}>
                        {t.label}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
        ))}
      </nav>

      <div className="dmain">
        <section className="card">
          <div className="dbody">
            {sel.kind === "cell" ? (
              <StationCellView id={sel.id ?? "H01"} />
            ) : sel.kind === "aux" ? (
              <DemoAuxPanel unit={stationState.units[0]} topology={stationTopology} stationKv={stationState.station.kV} />
            ) : unit ? (
              <UnitBody unit={unit} tab={sel.tab} stationKv={stationState.station.kV} />
            ) : (
              <p className="empty">No group data.</p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

const StationCellView: React.FC<{ id: string }> = ({ id }) => {
  const { stationState: state, stationTopology } = useDemoProjectContext();
  const cell = DEMO_TOPOLOGY.station.cells.find((c) => c.id === id);
  if (!cell) return <p className="empty">Unknown cell.</p>;
  const pos = state.station[cell.id as "H01" | "H02" | "H04" | "H05"];
  const kv = state.station.kV > 0 ? state.station.kV : DEMO_TOPOLOGY.station.nominalKV;
  const hz = state.station.hz || 50;
  const poi = state.poiMW;
  const iA = state.station.iA[cell.id] ?? 0;

  if (cell.kind === "vt") {
    const qMvar = state.units.reduce((a, u) => a + u.pcs.reduce((b, p) => b + (p.reactiveKvar ?? 0), 0), 0) / 1000;
    const pf = poi !== 0 || qMvar !== 0 ? Math.abs(poi) / Math.sqrt(poi * poi + qMvar * qMvar) : 1;
    const auxKw = state.units[0]?.aux?.kW ?? 0;
    // iA, P/(√3·U) ile hesaplanan HAT akımıdır; dengeli 3 fazda her faz akımı = iA (iA/3 değil).
    const perPhase = iA;
    const ld = [1, 2, 3];
    return (
      <>
        <div className="dh">
          <h3>
            {cell.id} · {cell.label}
          </h3>
        </div>
        <div className="mgrid">
          <div>
            <small>Active power</small>
            <b className="num">{f(poi, 2)} MW</b>
            <em>{poi >= 0 ? "Export to grid" : "Import from grid"}</em>
          </div>
          <div>
            <small>Reactive power</small>
            <b className="num">{f(qMvar, 2)} Mvar</b>
          </div>
          <div>
            <small>Power factor</small>
            <b className="num">{f(pf, 3)}</b>
          </div>
          <div>
            <small>Frequency</small>
            <b className="num">{f(hz, 2)} Hz</b>
          </div>
          <div>
            <small>Energy exported</small>
            <b className="num" style={{ color: "var(--nm-warn, #b45309)" }} title="H03 metering has no register map yet (M2)">no map</b>
          </div>
          <div>
            <small>Energy imported</small>
            <b className="num" style={{ color: "var(--nm-warn, #b45309)" }} title="H03 metering has no register map yet (M2)">no map</b>
          </div>
          <div>
            <small>POI closed-loop trim</small>
            <b className="num" style={{ color: "var(--nm-warn, #b45309)" }} title="POI closed loop not implemented in the backend yet">not implemented</b>
          </div>
          <div>
            <small>AUX load (in POI)</small>
            <b className="num">{f(auxKw, 1)} kW</b>
          </div>
        </div>
        <h4>Meter · CT {cell.ct} · VT {cell.vt?.split(" · ")[0]}</h4>
        <div className="tblwrap">
          <table className="dt">
            <thead>
              <tr>
                <th>Metering</th>
                {ld.map((l) => (
                  <th key={l}>L{l}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="txt">Current</td>
                {ld.map((l) => (
                  <td key={l}>{f(perPhase, 1)} A</td>
                ))}
              </tr>
              <tr>
                <td className="txt">Voltage (line-line)</td>
                {ld.map((l) => (
                  <td key={l}>{f(kv, 2)} kV</td>
                ))}
              </tr>
              <tr>
                <td className="txt">CT secondary</td>
                {ld.map((l) => (
                  <td key={l}>{f((perPhase * 5) / (cell.ctPrimary ?? 750), 3)} A</td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </>
    );
  }

  const feeder = cell.feeder;
  const feederMW = feeder ? state.feederMW[feeder] ?? 0 : poi;
  const feederUnits = feeder && stationTopology.feeders[feeder] ? stationTopology.feeders[feeder].units : [];
  return (
    <>
      <div className="dh">
        <h3>
          {cell.id} · {cell.label}
        </h3>
      </div>
      <div className="mgrid">
        <div>
          <small>Breaker{cell.motor ? " · motorised" : ""}</small>
          <b className={pos === "closed" ? "" : "c-warn"}>{pos ? POS_TEXT[pos] : "—"}</b>
        </div>
        <div>
          <small>Earthing switch · manual</small>
          <b className={state.station.es[cell.id] ? "c-maint" : ""}>{state.station.es[cell.id] ? "Closed" : "Open"}</b>
        </div>
        <div>
          <small>Current (CT)</small>
          <b className="num">{f(iA, 1)} A</b>
          <em>
            {f((iA * 5) / (cell.ctPrimary ?? 750), 3)} A secondary · {cell.ct}
          </em>
        </div>
        <div>
          <small>{feeder ? `Feeder ${feeder} power` : "Site power"}</small>
          <b className="num">{f(feederMW, 2)} MW</b>
          <em>
            {f(kv, 2)} kV · {f(hz, 2)} Hz
          </em>
        </div>
      </div>
      {feeder && feederUnits.length > 0 ? (
        <>
          <h4>Groups on Feeder {feeder}</h4>
          <div className="tblwrap">
            <table className="dt">
              <thead>
                <tr>
                  <th>Group</th>
                  <th className="txt">Status</th>
                  <th>RMU H02</th>
                  <th>P MW</th>
                  <th>SOC</th>
                </tr>
              </thead>
              <tbody>
                {feederUnits.map((n) => {
                  const u = state.units.find((x) => x.n === n);
                  if (!u) return null;
                  return (
                    <tr key={n}>
                      <td className="txt">BESS#{n}</td>
                      <td className="txt">{u.rmu.H02 === "closed" ? "In service" : "Isolated"}</td>
                      <td>{POS_TEXT[u.rmu.H02]}</td>
                      <td>{f(u.pcs.reduce((a, p) => a + signedP(p), 0), 2)}</td>
                      <td>{f((u.banks[0].soc + (u.banks[1]?.soc ?? u.banks[0].soc)) / 2)} %</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </>
  );
};

/**
 * RMU operatör kontrolü (2026-10-15): saha RMU telemetrisi yok → H02 kesici ve
 * toprak ayırıcı elle açılır/kapanır. İzinler/uyarılar anında güncellenir.
 */
const RmuControl: React.FC<{ unit: NovaUnitState }> = ({ unit }) => {
  const setH02Open = useRmuStore((s) => s.setH02Open);
  const setEarthed = useRmuStore((s) => s.setEarthed);
  const h02Closed = unit.rmu.H02 === "closed";
  return (
    <div className="card" style={{ padding: 12, marginBottom: 12 }} data-testid="rmu-control">
      <div className="dh">
        <h3>RMU · BESS#{unit.n} · operator control</h3>
        <p className="dsub">No RMU signal from site yet — position is set here by the operator and used by permissives.</p>
      </div>
      <div className="row" style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <b>H02 breaker: {h02Closed ? "CLOSED" : "OPEN"}</b>
        <button type="button" className="btn btn-warn" disabled={!h02Closed} onClick={() => setH02Open(unit.n, true)}>
          Open H02
        </button>
        <button
          type="button"
          className="btn btn-primary"
          disabled={h02Closed || unit.rmu.es}
          title={unit.rmu.es ? "Open the earthing switch first" : undefined}
          onClick={() => setH02Open(unit.n, false)}
        >
          Close H02
        </button>
        <span style={{ width: 16 }} />
        <b>Earthing switch: {unit.rmu.es ? "CLOSED (earthed)" : "OPEN"}</b>
        <button
          type="button"
          className="btn btn-warn"
          disabled={unit.rmu.es || h02Closed}
          title={h02Closed ? "Open H02 first (interlock)" : undefined}
          onClick={() => setEarthed(unit.n, true)}
        >
          Close earth
        </button>
        <button type="button" className="btn" disabled={!unit.rmu.es} onClick={() => setEarthed(unit.n, false)}>
          Open earth
        </button>
      </div>
    </div>
  );
};

const UnitBody: React.FC<{ unit: NovaUnitState; tab: DemoDeviceSection; stationKv?: number }> = ({ unit, tab, stationKv }) => {
  if (tab === "mv") return <DemoMvPanel unit={unit} topology={DEMO_TOPOLOGY} stationKv={stationKv} />;
  if (tab === "pcs") return <DemoPcsPanel unit={unit} topology={DEMO_TOPOLOGY} stationKv={stationKv} />;
  if (tab === "hvac") return <DemoHvacPanel unit={unit} topology={DEMO_TOPOLOGY} stationKv={stationKv} />;
  if (tab === "fss") return <DemoFssPanel unit={unit} topology={DEMO_TOPOLOGY} stationKv={stationKv} />;
  if (tab === "rmutr")
    return (
      <>
        <RmuControl unit={unit} />
        <DemoRmuTrPanel unit={unit} topology={DEMO_TOPOLOGY} stationKv={stationKv} />
      </>
    );
  if (tab === "aux") return <DemoAuxPanel unit={unit} topology={DEMO_TOPOLOGY} stationKv={stationKv} />;
  return <BatteryBody unit={unit} />;
};

const BatteryBody: React.FC<{ unit: NovaUnitState }> = ({ unit }) => {
  const L = DEMO_TOPOLOGY.limits;
  const U = DEMO_TOPOLOGY.unit;
  const [sel, setSel] = useState<{ bank: number; r: number } | null>({ bank: 0, r: 0 });
  const [packSel, setPackSel] = useState(0);
  // Pack/hücre seviyesi veri LGES Modbus haritasında YOK — yalnız simülasyon
  // türetimi. Varsayılan KAPALI; açılırsa açıkça "SIM" etiketiyle gösterilir.
  const [showSim, setShowSim] = useState(false);
  const bank = sel ? unit.banks[sel.bank] : undefined;
  const pcs = sel ? unit.pcs[sel.bank] : undefined;
  const rackNo = sel ? sel.bank * U.racksPerBank + sel.r + 1 : 1;
  const bscRack = sel ? sel.r + 1 : 1;
  const temp = bank?.racks[sel?.r ?? 0] ?? 25;
  const input = bank && sel
    ? {
        no: sel.r + 1,
        soc: bank.rackSoc?.[sel.r] ?? bank.soc,
        soh: bank.soh,
        v: bank.rackV?.[sel.r] ?? bank.vdc,
        temp,
        tmin: bank.tmin,
        cellsSeries: U.cellsSeries,
      }
    : undefined;
  const packs = useMemo(() => (input ? rackPacks(input) : []), [input]);

  return (
    <>
      <div className="dh">
        <h3>BESS#{unit.n} · container</h3>
        {unit.mirrored ? (
          <p className="dsub" style={{ color: "var(--nm-warn, #b45309)" }}>
            SIM copy — this group has no own BSC/PCS device yet; values mirror the station's real container,
            with power, current and limits split by group count.
          </p>
        ) : null}
      </div>
      <div className="bsum">
        {unit.banks.map((b, i) => {
          const p = unit.pcs[i];
          return (
            <div key={b.id}>
              <h4>
                DC BUS#{i + 1} · BSC-{unit.n}{b.id} · PCS-{unit.n}{b.id}
              </h4>
              <dl className="kv2">
                <dt>BSC state (30036)</dt>
                <dd>{b.bscState !== undefined ? `${b.bscState} · ${BSC_STATE[b.bscState] ?? "?"}` : "—"}</dd>
                <dt>Racks online (30038)</dt>
                <dd>{b.online !== undefined ? `${b.online} / ${U.racksPerBank}` : "—"}</dd>
                <dt>SOC · SOH</dt>
                <dd>
                  {f(b.soc)} % · {f(b.soh)} %
                </dd>
                <dt>DC</dt>
                <dd>{f(b.vdc, 0)} V · {f(p?.idc ?? 0, 0)} A</dd>
                <dt>P · chg/dis limit</dt>
                <dd>
                  {f(p ? signedP(p) * 1000 : 0, 0)} kW · {f(p?.chgLimitKw ?? 0, 0)}/{f(p?.disLimitKw ?? 0, 0)} kW
                </dd>
                <dt>Cell T max · min</dt>
                <dd className={b.tmax > L.tempMax ? "c-alarm" : (b.tmin ?? b.tmax) < L.tempMin ? "c-cold" : ""}>
                  {f(b.tmax)} · {f(b.tmin ?? b.tmax)} °C
                </dd>
                <dt>Cell T avg · HVAC return air</dt>
                <dd>
                  {b.tavg !== undefined ? f(b.tavg) : "—"} · {unit.hvac?.length ? f(unit.hvac.reduce((a, h) => a + h.returnT, 0) / unit.hvac.length) : "—"} °C
                </dd>
                <dt>Heat gen (PMS est.) · HVAC cooling</dt>
                <dd>
                  {f(60 * ((p ? Math.abs(signedP(p)) : 0) / U.pcsMaxMW) ** 2)} · {(unit.hvac ?? []).filter((h) => h.mode === "cool").length * 10.2} kW
                </dd>
                <dt>Insulation (IMD)</dt>
                <dd>{unit.imdMOhm !== undefined ? `${f(unit.imdMOhm / 1e6, 2)} MΩ` : "—"}</dd>
              </dl>
            </div>
          );
        })}
      </div>

      <DemoBessScada unit={unit} topology={DEMO_TOPOLOGY} />

      {input && bank && sel ? (
        <div className="rackdet">
          <div className="dh">
            <div>
              <h3>
                Rack#{rackNo} · BSC-{unit.n}
                {bank.id} rack {bscRack}
              </h3>
              <p className="dsub">
                Input registers FC 0x04 · base {30170 + 150 * (bscRack - 1)} (= 30170 + 150·({bscRack}−1)) ·{" "}
                {U.rack?.packs ?? 17} packs + BPU · {U.rackKWh} kWh
              </p>
            </div>
            <label className="dsub" style={{ display: "flex", gap: 6, alignItems: "center", cursor: "pointer" }}>
              <input type="checkbox" checked={showSim} onChange={(e) => setShowSim(e.target.checked)} />
              Pack/hücre detayı (SIM — Modbus'ta yok)
            </label>
          </div>
          <div className="rackgrid">
            <div>
              <PackColumn
                packs={packs}
                markers={packMarkers(input)}
                selected={packSel}
                onSelect={setPackSel}
                tempMin={L.tempMin}
                tempMax={L.tempMax}
                simValues={showSim}
              />
              {showSim ? (
                <>
                  <h4>SIM · Hottest pack · JF1 TC map (18 sensors — Modbus'ta yok, türetilmiş)</h4>
                  <Tcmap values={tcMap18(input)} tempMin={L.tempMin} tempMax={L.tempMax} />
                </>
              ) : (
                <p className="dsub">
                  LGES Flex BSC Modbus haritası pack/hücre seviyesinde veri vermez; raf seviyesinde yalnız
                  max/min hücre gerilimi ve sıcaklığı okunur (sağdaki register tablosu).
                </p>
              )}
            </div>
            <div>
              <RackRegisterTable rows={rackRegisters(bscRack, bank.rackRaw?.[sel.r])} />
            </div>
          </div>
          {showSim ? (
            <>
              <DemoPackSchematic
                rackNo={rackNo}
                input={input}
                packIndex={packSel}
                spec={DEMO_PACK_SPEC}
              />
              <DemoPackDetail
                rackNo={rackNo}
                input={input}
                tempMin={L.tempMin}
                tempMax={L.tempMax}
                selected={packSel}
                onSelect={setPackSel}
              />
            </>
          ) : null}
        </div>
      ) : null}

      <RackTable
        unit={unit}
        sel={sel}
        onSelect={(s) => {
          setSel(s);
          setPackSel(0);
        }}
      />
      <ContainerThermal unit={unit} />
    </>
  );
};

/** Raf pack kolonu (referans `rackDetail` sol sütunu): BPU + 17 pack, ▲/▼ işaretçileri. */
const PackColumn: React.FC<{
  packs: Array<{ no: number; tmax: number }>;
  markers: { tMaxPack: number; tMinPack: number; vMaxPack: number; vMinPack: number };
  selected: number;
  onSelect: (k: number) => void;
  tempMin: number;
  tempMax: number;
  /** false → pack değerleri (türetilmiş) gösterilmez; yalnız fiziksel yerleşim. */
  simValues?: boolean;
}> = ({ packs, markers, selected, onSelect, tempMin, tempMax, simValues = false }) => {
  const ph = 15;
  const top = 6;
  // LGES JF1 raf yerleşimi: 17 pack üstte, BPU EN ALTTA.
  const bpuY = top + packs.length * ph + 2;
  const H = bpuY + 20 + 20;
  return (
    <svg className="pkcol" viewBox={`0 0 230 ${H}`} role="img" aria-label="Rack packs">
      <rect className="bx-bpu" x={58} y={bpuY} width={80} height={20} rx={2} />
      <text className="bx-t8" x={98} y={bpuY + 14} textAnchor="middle">
        BPU · fuse · MC± · PC
      </text>
      {packs
        .map((p, k) => ({ p, k }))
        .reverse()
        .map(({ p, k }) => {
          const y = top + (packs.length - 1 - k) * ph;
          const t = p.tmax;
          const no = p.no;
          const mx = markers.tMaxPack === no;
          const mn = markers.tMinPack === no;
          const vx = markers.vMaxPack === no;
          const vn = markers.vMinPack === no;
          const tags = simValues
            ? [mx && "▲Tmax", mn && "▼Tmin", vx && "Vmax", vn && "Vmin"].filter(Boolean).join(" ")
            : "";
          return (
            <g
              key={no}
              className={`pkclk${k === selected ? " sel" : ""}`}
              data-pack={k}
              onClick={() => onSelect(k)}
            >
              <rect
                className="bx-pk"
                x={58}
                y={y}
                width={80}
                height={ph - 3}
                style={simValues ? { fill: packFill(t, tempMin, tempMax) } : undefined}
              />
              <text className="bx-t8" x={50} y={y + 10} textAnchor="end">
                P{String(no).padStart(2, "0")}
              </text>
              <text className="bx-tv" x={98} y={y + 10} textAnchor="middle" style={{ fontSize: 9 }}>
                {simValues ? `${f(t)} °C` : ""}
              </text>
              {tags ? (
                <text className={`bx-t8${mx ? " hot" : mn ? " cold" : ""}`} x={144} y={y + 10}>
                  {tags}
                </text>
              ) : null}
            </g>
          );
        })}
      <text className="bx-t8" x={98} y={H - 4} textAnchor="middle">
        {packs.length} × {DEMO_TOPOLOGY.unit.rack?.packKWh ?? 13.122} kWh · {DEMO_TOPOLOGY.unit.rack?.config ?? "3P24S"}
      </text>
    </svg>
  );
};

const Tcmap: React.FC<{ values: number[]; tempMin: number; tempMax: number }> = ({ values, tempMin, tempMax }) => (
  <div className="tcmap">
    {values.map((t, i) => (
      <i key={i} style={{ background: packFill(t, tempMin, tempMax) }}>
        {f(t)}
      </i>
    ))}
  </div>
);

const RackRegisterTable: React.FC<{ rows: Array<{ name: string; address: string; value: string }> }> = ({ rows }) => (
  <>
    <h4>Rack registers · FC 0x04</h4>
    <div className="tblwrap">
      <table className="dt">
        <thead>
          <tr>
            <th>Register</th>
            <th className="txt">Address</th>
            <th className="txt">Value</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.name}>
              <td className="txt">{r.name}</td>
              <td className="txt">
                <code>{r.address}</code>
              </td>
              <td className="txt">{r.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </>
);

const ContainerThermal: React.FC<{ unit: NovaUnitState }> = ({ unit }) => {
  const L = DEMO_TOPOLOGY.limits;
  const U = DEMO_TOPOLOGY.unit;
  const [thBank, setThBank] = useState<string>(U.banks[0] ?? "A");
  const bi = Math.max(0, U.banks.indexOf(thBank));
  const bank = unit.banks[bi] ?? unit.banks[0];
  const hvacs = (U.sections ?? [])
    .filter((sc) => sc.bank === thBank)
    .flatMap((sc) => sc.hvac)
    .map((id) => unit.hvac?.find((h) => h.id === id))
    .filter((h): h is NonNullable<typeof h> => !!h);
  // Gerçek geçmiş (son 4 sa): konteynerin BSC (Max/Min/Avg Pack Temp) + HVAC
  // (Current/Supply Temp) downsampled telemetrisi. Eskiden sin+hash ile
  // sentezleniyordu (uydurma) — veri yoksa grafik "No data" gösterir.
  const { fieldId, stationSystems } = useDemoProjectContext();
  const st = stationForUnit(unit.n);
  const containerId = st ? stationSystems[st.key] : undefined;
  const bscId = `BSC-${bi + 1}`;
  const hvacIds = new Set(hvacs.map((h) => `HVAC-${h.id}`));
  const hist = useQuery({
    queryKey: ["demo-container-thermal", fieldId, containerId, bscId],
    queryFn: () =>
      demoApi.downsampled(fieldId, {
        containerIds: containerId ? [containerId] : [],
        from: new Date(Date.now() - 4 * 3600_000).toISOString(),
        to: new Date().toISOString(),
        points: 120,
        names: ["Max Pack Temp", "Min Pack Temp", "Avg Pack Temp", "Current Temp", "Supply Temp"],
      }),
    refetchInterval: 60_000,
    refetchOnWindowFocus: false,
    enabled: fieldId.length > 0 && containerId !== undefined,
  });
  const rows = useMemo(() => Object.values(hist.data ?? {}).flat(), [hist.data]);
  const series = (devOk: (id: string) => boolean, name: string) =>
    rows
      .filter((r) => devOk(r.deviceId) && r.name === name && typeof r.value === "number")
      .map((r) => ({ t: Date.parse(r.timestamp), value: r.value as number }))
      .sort((a, b) => a.t - b.t);
  const avgByTime = (name: string) => {
    const m = new Map<number, number[]>();
    for (const p of series((id) => hvacIds.has(id), name)) m.set(p.t, [...(m.get(p.t) ?? []), p.value]);
    return [...m.entries()].sort((a, b) => a[0] - b[0]).map(([t, v]) => ({ t, value: v.reduce((a, x) => a + x, 0) / v.length }));
  };
  const tmaxS = series((id) => id === bscId, "Max Pack Temp");
  const tminS = series((id) => id === bscId, "Min Pack Temp");
  const tavgS = series((id) => id === bscId, "Avg Pack Temp");
  const airS = avgByTime("Current Temp");
  const supS = avgByTime("Supply Temp");
  const pts = (k: "tmin" | "tmax" | "tavg" | "air" | "sup") =>
    ({ tmin: tminS, tmax: tmaxS, tavg: tavgS, air: airS, sup: supS })[k];
  const history = { phases: [] as never[] };
  return (
    <>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}>
        <h4 style={{ marginBottom: 0 }}>Container thermal</h4>
        <span className="seg sm" role="group" aria-label="Busbar zone" data-testid="busbar-seg">
          {U.banks.map((b) => (
            <button key={b} type="button" aria-pressed={thBank === b} onClick={() => setThBank(b)}>
              Busbar {b}
            </button>
          ))}
        </span>
      </div>
      <p className="dsub">last 4 h · BSC {bscId} pack temperatures vs HVAC air (recorded telemetry)</p>
      <div className="charts one">
        <DemoTrendChart
          title="Busbar zone · cell temperature vs HVAC"
          unit="°C"
          yMin={5}
          yMax={35}
          yTicks={[5, 10, 15, 20, 25, 30, 35]}
          height={190}
          series={[
            { label: "Cell min–max", color: "var(--nm-c-hot)", band: { lower: pts("tmin"), upper: pts("tmax") } },
            { label: "Cell max", color: "var(--nm-c-hot)", points: pts("tmax") },
            { label: "Cell avg", color: "var(--nm-c-soc)", points: pts("tavg") },
            { label: "Return air", color: "var(--nm-c-sp)", points: pts("air"), dash: true },
            { label: "Supply air", color: "var(--nm-c-cold)", points: pts("sup"), dash: true },
          ]}
          limits={[
            { value: L.tempMax, label: `Upper ${L.tempMax} °C`, cls: "hot" },
            { value: L.tempMin, label: `Lower ${L.tempMin} °C`, cls: "cold" },
          ]}
          phases={history.phases}
          shade={["cool", "heat"]}
          shadeLabel={{ cool: "HVAC cooling", heat: "HVAC heating" }}
        />
      </div>
    </>
  );
};

/** LGES Rev AF raf +50 Rack State enum'u (v14 katalog). */
const RACK_STATE: Record<number, string> = {
  0: "Initialization", 1: "ID Set", 2: "ID Set Complete", 3: "BMIC Init", 4: "Pack SOH Read Fail",
  5: "BMIC Wake Fail", 7: "No Configuration", 8: "Initial Diag", 9: "Normal", 10: "Normal Power Saving",
  11: "Protective Power Saving", 12: "Manual", 13: "Emergency",
};
/** LGES Rev AF 30036 BSC State enum'u. */
const BSC_STATE: Record<number, string> = {
  0: "None", 1: "Not Initialized", 2: "Initializing", 3: "Normal", 4: "Normal Power Saving", 5: "Manual", 6: "Emergency",
};

const RackTable: React.FC<{
  unit: NovaUnitState;
  sel?: { bank: number; r: number } | null;
  onSelect?: (s: { bank: number; r: number }) => void;
}> = ({ unit, sel, onSelect }) => {
  const L = DEMO_TOPOLOGY.limits;
  const U = DEMO_TOPOLOGY.unit;
  return (
    <>
      <h4>Racks · register base 30170 + 150·(rack−1) per BSC</h4>
      <div className="tblwrap">
        <table className="dt">
          <thead>
            <tr>
              <th>Rack</th>
              <th>Bus</th>
              <th className="txt">State</th>
              <th>SOC %</th>
              <th>SOH %</th>
              <th>V</th>
              <th>I A</th>
              <th>Cell max V</th>
              <th>Cell min V</th>
              <th>T max</th>
              <th>T avg</th>
              <th>T min</th>
              <th>Tmax pack</th>
            </tr>
          </thead>
          <tbody>
            {unit.banks.map((b, i) =>
              b.racks.map((t, r) => {
                // Yalnız canlı raf register'ları (+50 durum, +58/+59, +64/+66,
                // +84/+85, +89/+90/+91, +92 konum). Yoksa "—" — türetme YOK.
                const raw = b.rackRaw?.[r] ?? {};
                const val = (k: string, d = 1): string => (raw[k] !== undefined ? f(raw[k] as number, d) : "—");
                const st = raw["Rack State"];
                const tmin = raw["Rack Min Pack Temp"];
                const loc = raw["Rack Max Temp Location"];
                return (
                  <tr
                    key={`${b.id}${r}`}
                    className={sel && sel.bank === i && sel.r === r ? "focus" : ""}
                    style={onSelect ? { cursor: "pointer" } : undefined}
                    onClick={() => onSelect?.({ bank: i, r })}
                  >
                    <td>Rack#{i * U.racksPerBank + r + 1}</td>
                    <td>#{i + 1}</td>
                    <td className="txt">{st !== undefined ? `${st} · ${RACK_STATE[st] ?? "?"}` : "—"}</td>
                    <td>{val("Rack SOC")}</td>
                    <td>{val("Rack SOH")}</td>
                    <td>{val("Rack Cell Sum Voltage", 0)}</td>
                    <td>{val("Rack Current")}</td>
                    <td>{val("Rack Max Cell Voltage", 3)}</td>
                    <td>{val("Rack Min Cell Voltage", 3)}</td>
                    <td className={t > L.tempMax ? "sev-alarm" : t < L.tempMin ? "sev-cold" : ""}>{val("Rack Max Pack Temp")}</td>
                    <td>{val("Rack Avg Pack Temp")}</td>
                    <td className={tmin !== undefined && tmin < L.tempMin ? "sev-cold" : ""}>{val("Rack Min Pack Temp")}</td>
                    <td>{loc !== undefined ? String(loc) : "—"}</td>
                  </tr>
                );
              }),
            )}
          </tbody>
        </table>
      </div>
    </>
  );
};
