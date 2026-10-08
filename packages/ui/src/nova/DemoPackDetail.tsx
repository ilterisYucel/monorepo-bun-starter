import React, { useMemo } from "react";
import {
  CELLS_PER_PACK,
  PACKS_PER_RACK,
  packData,
  packFill,
  type PackInput,
} from "./demo-bess-data";

/**
 * DemoPackDetail — raf pack detayı (SPEC UC-4, D-1): seçili pack için 24 hücre
 * voltajı, 4 sıcaklık sensörü, PCB ve tüm pack tablosu. Pack verisi rack
 * telemetrisinden deterministik türetilir. Pack kolonu rack detayındadır
 * (referans `rackDetail`); burada yalnız pack ölçümleri + tablolar vardır.
 */

export interface DemoPackDetailProps {
  rackNo: number;
  input: PackInput;
  tempMin: number;
  tempMax: number;
  selected: number;
  onSelect: (packIndex: number) => void;
}

const f = (v: number, d = 1): string => (Math.round(v * 10 ** d) / 10 ** d).toFixed(d);

export const DemoPackDetail: React.FC<DemoPackDetailProps> = ({
  rackNo,
  input,
  tempMin,
  tempMax,
  selected,
  onSelect,
}) => {
  const packs = useMemo(
    () => Array.from({ length: PACKS_PER_RACK }, (_, k) => packData(input, k)),
    [input],
  );
  const pd = packs[selected];
  const vmin = Math.min(...pd.cells);
  const vmax = Math.max(...pd.cells);
  const span = Math.max(0.004, vmax - vmin);

  return (
    <div className="packdet">
      <div className="dh">
        <h4>
          Pack P{String(pd.no).padStart(2, "0")} · Rack#{rackNo}
        </h4>
        <span className="dsub">click a pack in the column or the table</span>
      </div>

      <div className="mgrid g6">
        <div>
          <small>Pack SOC</small>
          <b className="num">{f(pd.soc, 2)} %</b>
        </div>
        <div>
          <small>Pack SOH</small>
          <b className="num">{f(pd.soh, 2)} %</b>
        </div>
        <div>
          <small>Cell V avg</small>
          <b className="num">{f(pd.cavg, 4)} V</b>
          <em>ΔV {f((vmax - vmin) * 1000, 0)} mV</em>
        </div>
        <div>
          <small>Cell V max · min</small>
          <b className="num">
            {f(pd.cmax, 4)} · {f(pd.cmin, 4)}
          </b>
          <em>
            cell {pd.cmaxId} · cell {pd.cminId}
          </em>
        </div>
        <div>
          <small>Temperature avg</small>
          <b className="num">{f(pd.tavg)} °C</b>
          <em>
            max {f(pd.tmax)} · min {f(pd.tmin)}
          </em>
        </div>
        <div>
          <small>PCB temp 1 · 2</small>
          <b className="num">
            {f(pd.pcb[0])} · {f(pd.pcb[1])} °C
          </b>
        </div>
      </div>

      <div className="pkrow">
        <div>
          <h4>Cell voltages · {CELLS_PER_PACK} cells (red max, blue min, hatched = balancing)</h4>
          <svg
            className="cellbars"
            viewBox={`0 0 ${CELLS_PER_PACK * 22 + 20} 120`}
            role="img"
            aria-label="Cell voltages"
          >
            {pd.cells.map((v, c) => {
              const h = 20 + 70 * ((v - vmin) / span);
              const cls = c + 1 === pd.cmaxId ? "mx" : c + 1 === pd.cminId ? "mn" : "";
              return (
                <g key={c}>
                  <rect
                    className={`cb ${cls} ${pd.bal[c] ? "bal" : ""}`}
                    x={10 + c * 22}
                    y={100 - h}
                    width={16}
                    height={h}
                  />
                  <text x={18 + c * 22} y={114} textAnchor="middle">
                    {c + 1}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
        <div>
          <h4>Pack temperature sensors</h4>
          <div className="tsens">
            {pd.ts.map((t, c) => (
              <span key={c} style={{ background: packFill(t, tempMin, tempMax) }}>
                <small>T{c + 1}</small>
                {f(t)} °C
              </span>
            ))}
          </div>
        </div>
      </div>

      <h4>All packs · Rack#{rackNo}</h4>
      <div className="tblwrap">
        <table className="dt">
          <thead>
            <tr>
              <th>Pack</th>
              <th>SOC %</th>
              <th>SOH %</th>
              <th>Cell avg V</th>
              <th>Cell max V</th>
              <th>Cell min V</th>
              <th>ΔV mV</th>
              <th>T avg</th>
              <th>T max</th>
              <th>T min</th>
            </tr>
          </thead>
          <tbody>
            {packs.map((x, k) => (
              <tr key={x.no} className={k === selected ? "focus" : ""}>
                <td>
                  <button type="button" className="link" onClick={() => onSelect(k)}>
                    P{String(x.no).padStart(2, "0")}
                  </button>
                </td>
                <td>{f(x.soc, 2)}</td>
                <td>{f(x.soh, 2)}</td>
                <td>{f(x.cavg, 4)}</td>
                <td>{f(x.cmax, 4)}</td>
                <td>{f(x.cmin, 4)}</td>
                <td>{f((x.cmax - x.cmin) * 1000, 0)}</td>
                <td>{f(x.tavg)}</td>
                <td className={x.tmax > tempMax ? "sev-alarm" : x.tmax < tempMin ? "sev-cold" : ""}>{f(x.tmax)}</td>
                <td className={x.tmin > tempMax ? "sev-alarm" : x.tmin < tempMin ? "sev-cold" : ""}>{f(x.tmin)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h4>LGES diagnosis thresholds · JF1 1CP Turkey (v1.1.0)</h4>
      <div className="tblwrap">
        <table className="dt">
          <tbody>
            {DIAG.map((r) => (
              <tr key={r[0]}>
                <td className="txt">{r[0]}</td>
                <td>{r[1]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const DIAG: Array<[string, string]> = [
  ["Cell over-voltage", "W 3.70 V · F1 3.80 V · F2 4.00 V"],
  ["Cell under-voltage", "W 2.40 V · F1 2.30 V"],
  ["Cell ΔV in a pack (SOC > 98 %)", "W 290 mV · F1 319 mV"],
  ["Cell ΔV in a pack (SOC < 20 %)", "W 480 mV · F1 528 mV"],
  ["Pack avg cell ΔV in a rack", "W 332 mV"],
  ["Rack over-temperature", "W 49 °C · F1 58 °C"],
  ["Rack under-temperature", "W 0 °C · F1 −10 °C"],
  ["Rack temperature deviation", "W 10 °C"],
  ["Rack current (charge / discharge)", "W 210 A · F1 231 A"],
  ["Min pack SOH", "Alarm 56 % · F1 55 %"],
];
