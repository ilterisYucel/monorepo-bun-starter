import React from "react";
import type { PlantSourceView } from "./demo-plant";
import { RegisterValue } from "./DemoRegMode";
import { nomapSource } from "./register-sources";

/**
 * Ana-kaynak (PV) MV istasyonu tek-hat çizimi — referans `plant-view.js#srcStationSvg`
 * + `#renderSrc` portu (SPEC UC-11, FR-11.10). demo-field'te gerçek inverter
 * telemetrisi yok → değerler İLLÜSTRATİF/statik (tooltip nomap M7). BESS kartı
 * seçildiğinde site layout geri gelir.
 */

export interface DemoSourceStationViewProps {
  station: PlantSourceView;
  /** İnverter ön eki (ör. "INV"). */
  prefix?: string;
  collectorName?: string;
  collectorCell?: string;
  /** Modül DC kapasitesi (MWp/ünite). */
  unitCapMWp?: number;
  irr?: number;
  tMod?: number;
}

const f = (v: number, d = 1): string => (Math.round(v * 10 ** d) / 10 ** d).toFixed(d);
const amps = (mw: number, kv: number): number => (kv > 0.1 ? (Math.abs(mw) * 1e3) / (Math.sqrt(3) * kv) : 0);

export const DemoSourceStationView: React.FC<DemoSourceStationViewProps> = ({
  station,
  prefix = "INV",
  collectorName = "Metal Clad",
  collectorCell = "Q06",
  unitCapMWp,
  irr = 880,
  tMod = 35,
}) => {
  const n = Math.max(1, station.n);
  const unitCap = unitCapMWp ?? station.unitMVA;
  const per = station.unitMW.length ? station.unitMW : Array.from({ length: n }, () => station.mw / n);
  const P = per.reduce((a, v) => a + v, 0);
  const Pa = P; // illüstratigüneş: available = üretim
  const W = 1240;
  const colW = (W - 230) / n;
  const yBus = 150;
  const H = 640;
  const eDay = P * 6.5;
  const simSrc = (): ReturnType<typeof nomapSource> =>
    nomapSource("PV central inverter / PV MV station relay", "AC / DC power, voltage, current, state (map not given)");

  const kpi = (label: string, value: string, sub: string): React.ReactNode => (
    <div key={label}>
      <small>{label}</small>
      <b>
        <RegisterValue source={simSrc()}>{value}</RegisterValue>
      </b>
      <em>{sub}</em>
    </div>
  );

  return (
    <section className="card srcview" aria-label={`${station.name} single line`} data-testid="source-station-view">
      <header>
        <h2>
          {station.name}
          <small>single line · where the energy comes from · current, voltage, power</small>
        </h2>
      </header>
      <div className="mgrid g5 srckpi">
        {kpi("Output", `${f(P, 2)} MW`, `${f(amps(P, 34.5), 0)} A at 34.5 kV`)}
        {kpi("Available", `${f(Pa, 2)} MW`, "no curtailment (illustrative)")}
        {kpi("Irradiance", `${f(irr, 0)} W/m²`, `module ${f(tMod, 0)} °C`)}
        {kpi("Energy today", `${f(eDay, 1)} MWh`, `${n} units`)}
        {kpi("Units running", `${n} / ${n}`, "all available")}
      </div>
      <div className="po-svg">
        <svg className="po psv" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${station.name} single line`}>
          <text className="po-t b" x={40} y={24}>{`TO ${collectorName.toUpperCase()} ${collectorCell}`}</text>
          <text className="po-v" x={40} y={40}>{`${f(P, 2)} MW · ${f(amps(P, 34.5), 0)} A · 34.5 kV`}</text>
          <text className="po-v" x={40} y={54}>{`${f((P / (n * station.unitMVA)) * 100, 0)} % of ${f(n * station.unitMVA, 1)} MVA`}</text>
          <line className="po-ln" x1={90} y1={62} x2={90} y2={yBus} />
          <rect className="po-cb" x={82} y={84} width={16} height={16} />
          <text className="po-t" x={104} y={96}>Q1 · outgoing CB</text>
          <circle className="po-vt" cx={128} cy={122} r={7} />
          <circle className="po-vt" cx={128} cy={131} r={7} />
          <line className="po-ln thin" x1={90} y1={122} x2={121} y2={122} />
          <text className="po-t" x={142} y={126}>metering</text>
          <line className="po-bus" x1={60} y1={yBus} x2={W - 40} y2={yBus} />
          <text className="po-t b" x={W - 40} y={yBus - 10} textAnchor="end">{`${station.name} · 34.5 kV`}</text>
          {per.map((mw, j) => {
            const cx = 150 + colW * (j + 0.5);
            const vdc = 1180 - 2.6 * (tMod - 25);
            const dc = mw > 0.01 ? mw / 0.982 : 0;
            const dcA = mw > 0.01 ? (dc * 1e6) / vdc : 0;
            return (
              <g key={j}>
                <line className="po-ln" x1={cx} y1={yBus} x2={cx} y2={yBus + 300} />
                <rect className="po-cb" x={cx - 7} y={yBus + 16} width={14} height={14} />
                <text className="po-t" x={cx + 10} y={yBus + 27}>{`Q${j + 2}`}</text>
                <text className="po-v" x={cx + 10} y={yBus + 48}>{`${f(mw, 2)} MW · ${f(amps(mw, 34.5), 0)} A`}</text>
                <circle className="po-tr" cx={cx} cy={yBus + 74} r={12} />
                <circle className="po-tr" cx={cx} cy={yBus + 90} r={12} />
                <text className="po-t" x={cx + 16} y={yBus + 80}>{`${f(station.unitMVA, 1)} MVA`}</text>
                <text className="po-t" x={cx + 16} y={yBus + 93}>34.5/0.63 kV</text>
                <text className="po-v" x={cx + 10} y={yBus + 124}>{`${f(amps(mw, 0.63), 0)} A · 630 V`}</text>
                <rect className="po-inv on" x={cx - 26} y={yBus + 138} width={52} height={52} rx={3}>
                  <title>{`${prefix}-${String(j + 1).padStart(2, "0")} · illustrative (simulated)`}</title>
                </rect>
                <line className="po-invl" x1={cx - 26} y1={yBus + 190} x2={cx + 26} y2={yBus + 138} />
                <text className="po-t" x={cx - 20} y={yBus + 154}>=</text>
                <text className="po-t" x={cx + 12} y={yBus + 184}>~</text>
                <text className="po-t b" x={cx + 32} y={yBus + 158}>{`${prefix}-${String(j + 1).padStart(2, "0")}`}</text>
                <text className="po-t" x={cx + 32} y={yBus + 172}>running</text>
                <text className="po-v" x={cx + 10} y={yBus + 244}>{`${f(dc, 2)} MW DC`}</text>
                <text className="po-v" x={cx + 10} y={yBus + 258}>{`${f(vdc, 0)} V · ${f(dcA, 0)} A`}</text>
                {Array.from({ length: 12 }, (_, k) => {
                  const r = Math.floor(k / 4);
                  const c = k % 4;
                  return (
                    <rect
                      key={k}
                      className="po-pv"
                      x={(cx - 34 + c * 17).toFixed(1)}
                      y={yBus + 300 + r * 14}
                      width={15}
                      height={12}
                    />
                  );
                })}
                <text className="po-t" x={cx} y={yBus + 358} textAnchor="middle">{`${f(unitCap, 2)} MWp array`}</text>
                <rect className="po-ib" x={cx - 30} y={yBus + 372} width={60} height={8} rx={2} />
                <rect className="po-if" x={cx - 30} y={yBus + 372} width={60 * Math.min(1, mw / Math.max(0.01, station.unitMVA))} height={8} rx={2} />
              </g>
            );
          })}
          <text className="po-t" x={W - 40} y={H - 14} textAnchor="end">
            {`Central inverters ${prefix}-01…${String(n).padStart(2, "0")} · energy flows from the arrays up to the busbar and out to the collector · indicative values`}
          </text>
        </svg>
      </div>
    </section>
  );
};
