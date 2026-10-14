import React, { useMemo } from "react";
import {
  PACKS_PER_RACK,
  packData,
  packMarkers,
  type PackInput,
} from "./demo-bess-data";

/**
 * Pack şeması — referans `devices.js#packSvg` + `packDetail` portu (SPEC UC-13).
 * LGES JF1 1CP pack'in üstten görünümü: FRONT (fan, PBMS + comm port, fuse,
 * (+)/(−) terminaller) + 4 × CMA 3P6S (S1–S24 seri grupları, her biri 3 hücre),
 * inter busbar'lar, negative busbar, TH1–TH4 film NTC. Yalnızca register
 * verisiyle işaretlenir (V max/min hücre konumu, T max/min pack). Pack seviyesi
 * Modbus'ta yoktur → `packData` deterministik türevinden gelir.
 */

export interface DemoPackSpec {
  model: string;
  name: string;
  config: string;
  cells: number;
  cma: { count: number; config: string; cells: number };
  capAh: number;
  vNom: number;
  kWh: number;
  vChgEnd: number;
  vDisEnd: number;
  iStd: number;
  iEnd: number;
  pMaxKW: number;
  iPeak: number;
  restAfterChgH: number;
  restAfterDisH: number;
  dielectricKV: number;
  ip: string;
  opAmbC: readonly [number, number];
  recC: string;
  dimMM: { depth: number; width: number; widthMtg: number; height: number };
  kg: number;
  bms: string;
  cooling: string;
  cell: {
    name: string;
    capAh: readonly [number, number];
    vNom: number;
    vRange: readonly [number, number];
    wh: number;
    dcirMOhm: readonly [number, number];
    g: number;
  };
}

export interface DemoPackSchematicProps {
  rackNo: number;
  input: PackInput;
  packIndex: number;
  spec: DemoPackSpec;
}

const f = (v: number, d = 1): string => (Math.round(v * 10 ** d) / 10 ** d).toFixed(d);
const pn = (k: number): string => `P${String(k + 1).padStart(2, "0")}`;

export const DemoPackSchematic: React.FC<DemoPackSchematicProps> = ({
  rackNo,
  input,
  packIndex,
  spec,
}) => {
  const packs = useMemo(
    () => Array.from({ length: PACKS_PER_RACK }, (_, k) => packData(input, k)),
    [input],
  );
  const markers = useMemo(() => packMarkers(input), [input]);
  const pd = packs[packIndex] ?? packs[0];
  const packNo = packIndex + 1;
  const vx = markers.vMaxPack === packNo ? pd.cmaxId : 0;
  const vn = markers.vMinPack === packNo ? pd.cminId : 0;
  const smax = ((pd.cmaxId - 1) % spec.cma.count) + 1;
  const smin = ((pd.cminId - 1) % spec.cma.count) + 1;

  const W = 1000;
  const H = 330;
  const X0 = 40;
  const X1 = 960;
  const Y0 = 26;
  const Y1 = 300;
  const FX = X0 + 92;
  const cmaW = (X1 - FX - 12 - 3 * 14) / spec.cma.count;
  const cmaCount = spec.cma.count;

  const live: Array<[string, string, string]> = [];
  if (markers.vMaxPack === packNo) live.push(["Max cell voltage in this pack (rack max)", `${f(pd.cmax, 4)} V · cell S${pd.cmaxId}`, "84 / 87"]);
  if (markers.vMinPack === packNo) live.push(["Min cell voltage in this pack (rack min)", `${f(pd.cmin, 4)} V · cell S${pd.cminId}`, "85 / 88"]);
  if (markers.tMaxPack === packNo) live.push(["Max pack temperature (rack max)", `${f(pd.tmax)} °C · sensor TH${smax}`, "89 / 92"]);
  if (markers.tMinPack === packNo) live.push(["Min pack temperature (rack min)", `${f(pd.tmin)} °C · sensor TH${smin}`, "90 / 93"]);

  const specRows: Array<[string, string]> = [
    ["Model", `${spec.name} · ${spec.model}`],
    ["Configuration", `${spec.config} = ${spec.cells} cells · ${spec.cma.count} × CMA ${spec.cma.config} (${spec.cma.cells} cells each)`],
    ["Cell", `${spec.cell.name} · ${spec.cell.capAh[0]}–${spec.cell.capAh[1]} Ah · ${spec.cell.vNom} V nom · ${spec.cell.vRange[0]}–${spec.cell.vRange[1]} V · ≥ ${spec.cell.wh} Wh · DCIR ${spec.cell.dcirMOhm[0]}–${spec.cell.dcirMOhm[1]} mΩ · ${spec.cell.g} g`],
    ["Capacity · voltage · energy", `${spec.capAh} Ah (min) · ${spec.vNom} V · ${spec.kWh} kWh`],
    ["Standard charge", `CC-CV 0.25C · ${spec.iStd} A to ${spec.vChgEnd} V · end current ${spec.iEnd} A`],
    ["Standard discharge", `CC 0.25C · ${spec.iStd} A to ${spec.vDisEnd} V`],
    ["Max charge / discharge", `${spec.pMaxKW} kW (1.0CP) · peak ${spec.iPeak} A · rest ≥ ${spec.restAfterChgH} h after charge, ≥ ${spec.restAfterDisH} h after discharge`],
    ["Insulation · class", `dielectric ${spec.dielectricKV} kV · pollution degree 3 · OVC 2 · ${spec.ip}`],
    ["Environment", `operating ${spec.opAmbC[0]}–${spec.opAmbC[1]} °C ambient · recommended ${spec.recC} °C · 5–85 % RH`],
    ["Mechanical", `${spec.dimMM.depth} × ${spec.dimMM.widthMtg} × ${spec.dimMM.height} mm (${spec.dimMM.width} mm without bracket) · ${spec.kg} kg · ${spec.cooling}`],
  ];

  return (
    <div className="packdet" data-testid="pack-schematic">
      <div className="dh">
        <h4>{`Pack ${pn(packIndex)} · Rack#${rackNo} · position ${packNo} of ${PACKS_PER_RACK} above the BPU`}</h4>
        <span className="dsub">click another pack in the rack column</span>
      </div>

      <div className="pk-wrap">
        <svg className="pk" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${spec.name} ${pn(packIndex)} schematic`}>
          <rect className="pk-case" x={X0} y={Y0} width={X1 - X0} height={Y1 - Y0} rx={6} />
          <text className="pk-t b" x={X0} y={16}>{`${pn(packIndex)} · ${spec.name} ${spec.model} · ${spec.config} · ${spec.cells} cells · ${spec.dimMM.depth} × ${spec.dimMM.width} × ${spec.dimMM.height} mm · ${spec.kg} kg`}</text>
          {/* front end */}
          <rect className="pk-front" x={X0 + 4} y={Y0 + 4} width={84} height={Y1 - Y0 - 8} rx={3} />
          <text className="pk-t" x={X0 + 46} y={Y0 + 18} textAnchor="middle">FRONT</text>
          <circle className="pk-fan" cx={X0 + 46} cy={Y0 + 54} r={24} />
          <path className="pk-fanb" d={`M${X0 + 46} ${Y0 + 54}m-16 0a16 16 0 0 1 32 0M${X0 + 46} ${Y0 + 54}m0 -16a16 16 0 0 1 0 32`} />
          <text className="pk-t" x={X0 + 46} y={Y0 + 92} textAnchor="middle">Fan</text>
          <rect className="pk-pbms" x={X0 + 14} y={Y0 + 104} width={64} height={60} rx={2} />
          <text className="pk-t b" x={X0 + 46} y={Y0 + 128} textAnchor="middle">PBMS</text>
          <text className="pk-t" x={X0 + 46} y={Y0 + 142} textAnchor="middle">{spec.bms}</text>
          <rect className="pk-port" x={X0 + 36} y={Y0 + 148} width={20} height={10} />
          <text className="pk-t" x={X0 + 46} y={Y0 + 176} textAnchor="middle">comm port</text>
          <rect className="pk-tp" x={X0 + 16} y={Y0 + 192} width={60} height={14} rx={2} />
          <text className="pk-t w" x={X0 + 46} y={Y0 + 203} textAnchor="middle">(+)</text>
          <rect className="pk-fuse" x={X0 + 26} y={Y0 + 214} width={40} height={14} rx={7} />
          <text className="pk-t" x={X0 + 46} y={Y0 + 225} textAnchor="middle">fuse</text>
          <rect className="pk-tn" x={X0 + 16} y={Y0 + 236} width={60} height={14} rx={2} />
          <text className="pk-t w" x={X0 + 46} y={Y0 + 247} textAnchor="middle">(−)</text>
          {/* CMAs */}
          {Array.from({ length: cmaCount }, (_, m) => {
            const x = FX + 6 + (cmaCount - 1 - m) * (cmaW + 14);
            const y = Y0 + 34;
            const h = Y1 - Y0 - 68;
            const gw = (cmaW - 14) / 6;
            const thx = x + 7 + 5 * gw + gw / 2;
            const thk = markers.tMaxPack === packNo && smax === m + 1 ? "mx" : markers.tMinPack === packNo && smin === m + 1 ? "mn" : "";
            return (
              <g key={m}>
                <rect className="pk-cma" x={x} y={y} width={cmaW} height={h} rx={3} />
                <text className="pk-t b" x={x + 6} y={y - 8}>{`CMA ${m + 1} · ${spec.cma.config} · S${m * 6 + 1}–S${m * 6 + 6}`}</text>
                <rect className="pk-bb" x={x} y={y + 2} width={cmaW} height={6} />
                <rect className="pk-bb" x={x} y={y + h - 8} width={cmaW} height={6} />
                {Array.from({ length: 6 }, (_, q) => {
                  const S = m * 6 + q + 1;
                  const gx = x + 7 + (5 - q) * gw;
                  const cls = S === vx ? "mx" : S === vn ? "mn" : "";
                  return (
                    <g key={S}>
                      {Array.from({ length: 3 }, (_, c) => (
                        <rect key={c} className={`pk-cell ${cls}`} x={(gx + 3 + (c * (gw - 6)) / 3).toFixed(1)} y={y + 14} width={((gw - 6) / 3 - 2).toFixed(1)} height={h - 44} rx={1}>
                          <title>{`S${S} · cell ${c + 1} of 3 (3P)`}</title>
                        </rect>
                      ))}
                      <text className={`pk-t${cls ? ` b ${cls}` : ""}`} x={(gx + gw / 2).toFixed(1)} y={y + h - 16} textAnchor="middle">{`S${S}`}</text>
                      {cls ? <text className={`pk-v ${cls}`} x={(gx + gw / 2).toFixed(1)} y={y + h / 2} textAnchor="middle">{cls === "mx" ? "V max" : "V min"}</text> : null}
                    </g>
                  );
                })}
                <g className={`pk-th${thk ? ` ${thk}` : ""}`}>
                  <circle cx={thx.toFixed(1)} cy={y + h / 2 + 30} r={9} />
                  <text className="pk-t b" x={thx.toFixed(1)} y={y + h / 2 + 34} textAnchor="middle">{`TH${m + 1}`}</text>
                </g>
                {thk ? <text className={`pk-v ${thk}`} x={(thx + 16).toFixed(1)} y={y + h / 2 + 30}>{`${thk === "mx" ? f(pd.tmax) : f(pd.tmin)} °C`}</text> : null}
                <path className="pk-sense" d={`M${x + 8} ${y + h + 8}V${Y1 - 10}H${X0 + 78}`} />
                {m < cmaCount - 1 ? <rect className="pk-ib" x={x + cmaW + 1} y={y + h / 2 - 22} width={12} height={44} rx={2}><title>{`Inter busbar ${m + 1}`}</title></rect> : null}
              </g>
            );
          })}
          <path className="pk-neg" d={`M${X1 - 10} ${Y0 + 40}V${Y0 + 16}H${X0 + 88}`} />
          <text className="pk-t" x={X1 - 14} y={Y0 + 12} textAnchor="end">negative busbar → (−)</text>
          <text className="pk-t" x={X1 - 4} y={H - 6} textAnchor="end">schematic, not to scale · cell 1 at the rear, cell 24 at the front (LGES pack EOL definition) · TH1–TH4 = one film NTC per CMA</text>
        </svg>
      </div>

      <div className="pkrow">
        <div>
          <h4>Live · BSC registers that point to this pack</h4>
          {live.length ? (
            <div className="tblwrap">
              <table className="dt">
                <thead>
                  <tr>
                    <th className="tl">Value</th>
                    <th>Reading</th>
                    <th>Rack offset</th>
                  </tr>
                </thead>
                <tbody>
                  {live.map((r) => (
                    <tr key={r[0]}>
                      <td className="txt">{r[0]}</td>
                      <td>{r[1]}</td>
                      <td><code>+{r[2]}</code></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="dsub">This pack is not the location of a rack extreme. The Modbus map (Rev AF) has no other pack-level data – nothing is shown rather than invented.</p>
          )}
          <h4>Not in the BSC Modbus map</h4>
          <p className="dsub">Not readable over Modbus Rev AF: pack SOC/SOH, the 24 cell voltages, the 4 thermistor and 2 PCB temperatures, per-cell balancing, BMIC errors (BSC HMI and 1 s pack log only); pack voltage is not available at all. Sensor counts per pack are read once from rack +24…+29.</p>
        </div>
        <div>
          <h4>Pack specification · LGES Rev AE</h4>
          <div className="tblwrap">
            <table className="dt">
              <tbody>
                {specRows.map((r) => (
                  <tr key={r[0]}>
                    <td className="txt">{r[0]}</td>
                    <td className="txt">{r[1]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
