import React, { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
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
import { DEMO_TOPOLOGY } from "../features/demo-data/demo-topology";

const f = (v: number, d = 1): string => (Math.round(v * 10 ** d) / 10 ** d).toFixed(d);
const signedP = (p: { state: string; pMW: number }): number =>
  p.state === "chg" ? -p.pMW : p.state === "dis" ? p.pMW : 0;

type Sel = { kind: "cell" | "aux" | "unit"; id?: string; n?: number; tab: DemoDeviceSection };

/** DemoDevicesPage — UC-4: cihaz ağacı + hücre/AUX/batarya/PCS/HVAC/FSS/RMU&TR. */
export const DemoDevicesPage: React.FC = () => {
  const { state } = useDemoProjectContext();
  const [params, setParams] = useSearchParams();

  const sel = useMemo<Sel>(() => {
    const tab = (params.get("tab") as DemoDeviceSection) ?? "battery";
    const unit = params.get("unit");
    const cell = params.get("cell");
    if (cell) return { kind: "cell", id: cell, tab };
    if (params.get("aux") === "1") return { kind: "aux", tab };
    return { kind: "unit", n: unit ? Number(unit) : state.units[0]?.n ?? 1, tab };
  }, [params, state.units]);

  const unit = sel.kind === "unit" ? state.units.find((u) => u.n === sel.n) : undefined;

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
          <h4>{DEMO_TOPOLOGY.station.name}</h4>
          {DEMO_TOPOLOGY.station.cells.map((c) => {
            const pos = state.station[c.id as "H01" | "H02" | "H04" | "H05"];
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
        <div className="tg">
          <h4>Battery groups</h4>
          {state.units.map((u) => {
            const on = sel.kind === "unit" && sel.n === u.n;
            return (
              <div key={u.n}>
                <button type="button" className={`ti ${on ? "on" : ""}`} onClick={() => select({ kind: "unit", n: u.n, tab: "battery" })}>
                  BESS#{u.n}
                  <small>Feeder {u.rmu.H02 === "closed" ? "in service" : "isolated"}</small>
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
      </nav>

      <div className="dmain">
        <section className="card">
          <div className="dbody">
            {sel.kind === "cell" ? (
              <StationCellView id={sel.id ?? "H01"} />
            ) : sel.kind === "aux" ? (
              <DemoAuxPanel unit={state.units[0]} topology={DEMO_TOPOLOGY} stationKv={state.station.kV} />
            ) : unit ? (
              <UnitBody unit={unit} tab={sel.tab} stationKv={state.station.kV} />
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
  const { state } = useDemoProjectContext();
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
    const perPhase = iA / 3;
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
            <b className="num">128.4 MWh</b>
          </div>
          <div>
            <small>Energy imported</small>
            <b className="num">121.7 MWh</b>
          </div>
          <div>
            <small>POI closed-loop trim</small>
            <b className="num">0 kW</b>
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
  const feederUnits = feeder && DEMO_TOPOLOGY.feeders[feeder] ? DEMO_TOPOLOGY.feeders[feeder].units : [];
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

const UnitBody: React.FC<{ unit: NovaUnitState; tab: DemoDeviceSection; stationKv?: number }> = ({ unit, tab, stationKv }) => {
  if (tab === "mv") return <DemoMvPanel unit={unit} topology={DEMO_TOPOLOGY} stationKv={stationKv} />;
  if (tab === "pcs") return <DemoPcsPanel unit={unit} topology={DEMO_TOPOLOGY} stationKv={stationKv} />;
  if (tab === "hvac") return <DemoHvacPanel unit={unit} topology={DEMO_TOPOLOGY} stationKv={stationKv} />;
  if (tab === "fss") return <DemoFssPanel unit={unit} topology={DEMO_TOPOLOGY} stationKv={stationKv} />;
  if (tab === "rmutr") return <DemoRmuTrPanel unit={unit} topology={DEMO_TOPOLOGY} stationKv={stationKv} />;
  if (tab === "aux") return <DemoAuxPanel unit={unit} topology={DEMO_TOPOLOGY} stationKv={stationKv} />;
  return <BatteryBody unit={unit} />;
};

const BatteryBody: React.FC<{ unit: NovaUnitState }> = ({ unit }) => {
  const L = DEMO_TOPOLOGY.limits;
  const U = DEMO_TOPOLOGY.unit;
  const [sel, setSel] = useState<{ bank: number; r: number } | null>({ bank: 0, r: 0 });
  const [packSel, setPackSel] = useState(0);
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
                <dt>BSC state</dt>
                <dd>{p ? `${p.state === "chg" ? "2" : p.state === "dis" ? "3" : "1"} · ${p.state === "chg" ? "Charging" : p.state === "dis" ? "Discharging" : "Standby"}` : "—"}</dd>
                <dt>Racks online</dt>
                <dd>{b.dcb === "closed" ? `${U.racksPerBank} / ${U.racksPerBank}` : `0 / ${U.racksPerBank}`}</dd>
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
                <dt>Battery · room</dt>
                <dd>{f(b.tmax - 1.2)} · {f((unit.ambient ?? 22) + 1.5)} °C</dd>
                <dt>Heat gen · HVAC cooling</dt>
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
      <ContainerThermal />

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
              />
              <h4>Hottest pack · JF1 TC map (18 sensors)</h4>
              <Tcmap values={tcMap18(input)} tempMin={L.tempMin} tempMax={L.tempMax} />
            </div>
            <div>
              <RackRegisterTable rows={rackRegisters(input, bscRack, bank)} />
            </div>
          </div>
          <DemoPackDetail
            rackNo={rackNo}
            input={input}
            tempMin={L.tempMin}
            tempMax={L.tempMax}
            selected={packSel}
            onSelect={setPackSel}
          />
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
}> = ({ packs, markers, selected, onSelect, tempMin, tempMax }) => {
  const ph = 15;
  const top = 34;
  const H = top + packs.length * ph + 20;
  return (
    <svg className="pkcol" viewBox={`0 0 230 ${H}`} role="img" aria-label="Rack packs">
      <rect className="bx-bpu" x={58} y={6} width={80} height={20} rx={2} />
      <text className="bx-t8" x={98} y={20} textAnchor="middle">
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
          const tags = [mx && "▲Tmax", mn && "▼Tmin", vx && "Vmax", vn && "Vmin"].filter(Boolean).join(" ");
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
                style={{ fill: packFill(t, tempMin, tempMax) }}
              />
              <text className="bx-t8" x={50} y={y + 10} textAnchor="end">
                P{String(no).padStart(2, "0")}
              </text>
              <text className="bx-tv" x={98} y={y + 10} textAnchor="middle" style={{ fontSize: 9 }}>
                {f(t)} °C
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
        {packs.length} × {DEMO_TOPOLOGY.unit.rackKWh} kWh · 24S3P
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

const ContainerThermal: React.FC = () => {
  const { trendData, restPhases } = useDemoProjectContext();
  const L = DEMO_TOPOLOGY.limits;
  return (
    <>
      <h4>Container thermal</h4>
      <div className="charts one">
        <DemoTrendChart
          title="Cell temperature"
          unit="°C"
          series={[{ label: "Highest", points: trendData.temp, color: "var(--nm-c-hot)" }]}
          limits={[
            { value: L.tempMax, label: `Upper ${L.tempMax} °C`, cls: "hot" },
            { value: L.tempMin, label: `Lower ${L.tempMin} °C`, cls: "cold" },
          ]}
          phases={restPhases}
          shade={["rest"]}
          shadeLabel={{ rest: "Rest" }}
        />
      </div>
    </>
  );
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
                const v = b.rackV?.[r] ?? b.vdc;
                const avgV = v / U.cellsSeries;
                const dv = Math.max(0.004, (100 - b.soh) * 0.0006);
                const markers = packMarkers({ no: r + 1, soc: b.rackSoc?.[r] ?? b.soc, soh: b.soh, v, temp: t, tmin: b.tmin, cellsSeries: U.cellsSeries });
                const tavg = t - 0.6;
                const tmin = b.tmin ?? t - 1.4;
                return (
                  <tr
                    key={`${b.id}${r}`}
                    className={sel && sel.bank === i && sel.r === r ? "focus" : ""}
                    style={onSelect ? { cursor: "pointer" } : undefined}
                    onClick={() => onSelect?.({ bank: i, r })}
                  >
                    <td>Rack#{i * U.racksPerBank + r + 1}</td>
                    <td>#{i + 1}</td>
                    <td className="txt">Running</td>
                    <td>{f(b.rackSoc?.[r] ?? b.soc)}</td>
                    <td>{f(b.soh)}</td>
                    <td>{f(v, 0)}</td>
                    <td>{f(b.rackI?.[r] ?? 0)}</td>
                    <td>{f(avgV + dv / 2, 3)}</td>
                    <td>{f(avgV - dv / 2, 3)}</td>
                    <td className={t > L.tempMax ? "sev-alarm" : t < L.tempMin ? "sev-cold" : ""}>{f(t)}</td>
                    <td>{f(tavg)}</td>
                    <td className={tmin < L.tempMin ? "sev-cold" : ""}>{f(tmin)}</td>
                    <td>P{markers.tMaxPack}</td>
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
