import React from "react";
import type { NovaHvacState, NovaTopology, NovaUnitState } from "./mimic-types";
import { PCS_TEXT, POS_TEXT } from "./nova-mimic";

/**
 * DemoBessScada — konteyner iç tek-hat SCADA çizimi (SPEC UC-4, FR-4.3).
 * Referans `bess-scada.js` portu: 3-sargılı TR → PCS#1/#2 → DC CB → DC BUS#1/#2
 * (IMD) → raf (sigorta · CB · MC+ · raf kutusu) → 4 HVAC bölümü → BSC/control/FSS.
 * React SVG; eksik veri "—" ile gösterilir.
 */

export interface DemoBessScadaProps {
  unit: NovaUnitState;
  topology: NovaTopology;
}

const W = 1400;
const H = 790;
const SLOT = 76;
const X0 = [70, 730];
const BUSY = 268;
const RACK_T = 384;
const RACK_B = 560;

const f = (v: number, d = 1): string => (Math.round(v * 10 ** d) / 10 ** d).toFixed(d);
const cx = (i: number, k: number): number => X0[i] + 38 + k * SLOT;
const pcsX = (i: number): number => X0[i] + 304;

const isRun = (s: NovaUnitState["pcs"][number]["state"]): boolean => s === "chg" || s === "dis";

const hvacMode = (h: NovaHvacState | undefined): string => {
  if (!h) return "off";
  return h.mode;
};

const hvacLabel = (h: NovaHvacState | undefined): string => {
  if (!h) return "—";
  switch (h.mode) {
    case "cool":
      return "COOLING";
    case "heat":
      return "HEATING";
    case "fault":
      return "FAULT";
    case "fan":
      return "FAN";
    default:
      return "OFF";
  }
};

export const DemoBessScada: React.FC<DemoBessScadaProps> = ({ unit, topology }) => {
  const U = topology.unit;
  const L = topology.limits;
  const n = unit.n;
  const packs = U.rack?.packs ?? 17;
  const banks = U.banks;

  return (
    <div className="bx-wrap">
      <svg
        className="bx"
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`BESS#${n} container single-line`}
      >
        <rect className="bx-ctr" x={30} y={188} width={W - 60} height={H - 198} rx={6} />
        <text className="bx-t8" x={W - 42} y={204} textAnchor="end">
          {U.container} · {(U.containerMWh * 1000).toFixed(0)} kWh · {U.banks.length * U.racksPerBank} × {U.rackKWh} kWh
        </text>
        <line className="bx-sep" x1={700} y1={212} x2={700} y2={H - 14} />
        <text className="bx-t8" transform={`translate(712 ${H - 120}) rotate(-90)`}>
          GALVANIC SEPARATION
        </text>

        {/* transformer */}
        <line className="bx-cond on" x1={704} y1={0} x2={704} y2={26} />
        <circle className="bx-trc on" cx={704} cy={40} r={15} />
        <circle className="bx-trc on" cx={690} cy={64} r={14} />
        <circle className="bx-trc on" cx={718} cy={64} r={14} />
        <text className="bx-t9" x={726} y={22}>
          TR {U.trKVA} kVA · {U.trRatio} · {U.trVector}
        </text>
        <text className="bx-t8" x={726} y={34}>
          from RMU H02 · 34.5 kV
        </text>

        {[0, 1].map((i) => {
          const b = unit.banks[i];
          const p = unit.pcs[i];
          const key = banks[i] ?? String.fromCharCode(65 + i);
          const px = pcsX(i);
          const lx = i ? 732 : 676;
          const run = p ? isRun(p.state) : false;
          const dir = p?.state === "dis" ? "dis" : p?.state === "chg" ? "chg" : "";
          const busOn = (b?.soc ?? 0) > 0;
          const cbc = b?.dcb === "closed";
          return (
            <g key={key}>
              <path className="bx-cond on" d={`M${lx} 64H${px}V110`} />
              <text className="bx-t8" x={px + 8} y={60}>
                {U.lvLabel}
              </text>
              {/* PCS */}
              <g className={`bx-pcs ${p?.state ?? "off"}${p?.limited && run ? " lim" : ""}`}>
                <rect className="bx-pbox" x={px - 86} y={110} width={172} height={60} rx={3} />
                <rect className="bx-isym" x={px - 78} y={118} width={40} height={40} />
                <line className="bx-isym" x1={px - 78} y1={158} x2={px - 38} y2={118} />
                <text className="bx-t8" x={px - 70} y={131}>
                  =
                </text>
                <text className="bx-t8" x={px - 50} y={153}>
                  ~
                </text>
                <text className="bx-t10b" x={px - 30} y={126}>
                  PCS-{n}
                  {key}
                </text>
                <text className={`bx-st ${p?.state === "fault" ? "alarm" : ""}`} x={px - 30} y={141}>
                  {p ? (p.limited && run ? "LIMITED 50 %" : PCS_TEXT[p.state]) : "—"}
                </text>
                <text className="bx-tv" x={px - 30} y={156}>
                  {p && run ? `${p.state === "chg" ? "−" : ""}${f(p.pMW, 2)} MW` : "0.00 MW"}
                </text>
                <text className="bx-tvm" x={px - 30} y={167}>
                  {U.pcsKVA} kVA
                </text>
              </g>
              {/* DC CB */}
              <line className={`bx-cond${cbc ? " on" : ""}`} x1={px} y1={170} x2={px} y2={198} />
              <g className={`bx-sw ${cbc ? "closed" : "open"}`}>
                <line className="bx-c" x1={px} y1={198} x2={px} y2={204} />
                <line className="bx-blade bx-cl" x1={px} y1={236} x2={px} y2={204} />
                <line className="bx-blade bx-op" x1={px} y1={236} x2={px + 16} y2={207} />
                <path className="bx-mark" d={`M${px - 4} 200l8 8M${px + 4} 200l-8 8`} />
                <circle className="bx-piv" cx={px} cy={236} r={1.8} />
              </g>
              <line className={`bx-cond${busOn ? " on" : ""}`} x1={px} y1={242} x2={px} y2={BUSY} />
              <text className="bx-t8" x={px - 14} y={214} textAnchor="end">
                DC CB · {U.bus?.dcCB ?? "—"}
              </text>
              <text className={`bx-st ${cbc ? "" : "warn"}`} x={px - 14} y={227} textAnchor="end">
                {cbc ? "CLOSED" : "OPEN"}
              </text>
              <text className="bx-tv" x={px + 14} y={222}>
                {f(b?.vdc ?? 0, 0)} V
              </text>
              <text className="bx-tvm" x={px + 14} y={235}>
                {f(b?.soc ?? 0)} %
              </text>
              {/* bus + IMD */}
              <line className={`bx-bus${busOn ? " on" : ""}`} x1={X0[i] + 6} y1={BUSY} x2={X0[i] + 602} y2={BUSY} />
              <text className="bx-t10b" x={X0[i] + 8} y={BUSY - 9}>
                DC BUS#{i + 1} · {U.bus?.ratingA ?? 2000} A · BSC-{n}
                {key}
              </text>
              <line className="bx-c" x1={X0[i] + 570} y1={BUSY} x2={X0[i] + 570} y2={BUSY - 22} />
              <rect className="bx-imd" x={X0[i] + 538} y={BUSY - 44} width={64} height={22} rx={11} />
              <text className="bx-t8" x={X0[i] + 570} y={BUSY - 35} textAnchor="middle">
                IMD
              </text>
              <text className="bx-tvm" x={X0[i] + 570} y={BUSY - 25} textAnchor="middle">
                {unit.imdMOhm !== undefined ? `${f(unit.imdMOhm / 1_000_000, 2)} MΩ` : "—"}
              </text>
              {/* flow */}
              <path
                className={`bx-fl${run && cbc ? ` on ${dir}` : ""}`}
                d={`M${X0[i] + 10} ${BUSY}H${px}V170`}
              />
              <path className={`bx-fl${run && cbc ? ` on ${dir}` : ""}`} d={`M${X0[i] + 598} ${BUSY}H${px}`} />
              {/* racks */}
              {Array.from({ length: U.racksPerBank }, (_, r) => {
                const x = cx(i, r);
                const no = i * U.racksPerBank + r + 1;
                const temp = b?.racks[r] ?? 25;
                const on = (b?.soc ?? 0) > 0;
                const sev = temp > L.tempMax ? " alarm" : temp < L.tempMin ? " cold" : "";
                const soc = b?.rackSoc?.[r] ?? b?.soc ?? 0;
                const v = b?.rackV?.[r] ?? b?.vdc ?? 0;
                const amp = b?.rackI?.[r] ?? 0;
                return (
                  <g key={no}>
                    <line className={`bx-cond${on ? " on" : ""}`} x1={x} y1={BUSY} x2={x} y2={284} />
                    <rect className="bx-fuse" x={x - 4} y={286} width={8} height={20} rx={1} />
                    <line className="bx-c" x1={x} y1={306} x2={x} y2={312} />
                    <g className={`bx-sw ${on ? "closed" : "open"}`}>
                      <line className="bx-blade bx-cl" x1={x} y1={338} x2={x} y2={318} />
                      <path className="bx-mark" d={`M${x - 4} 314l8 8M${x + 4} 314l-8 8`} />
                      <circle className="bx-piv" cx={x} cy={338} r={1.8} />
                    </g>
                    <g className={`bx-sw ${on ? "closed" : "open"}`}>
                      <line className="bx-blade bx-cl" x1={x} y1={370} x2={x} y2={352} />
                      <path className="bx-mark" d={`M${x - 4.5} 352a4.5 4.5 0 0 0 9 0`} />
                      <circle className="bx-piv" cx={x} cy={370} r={1.8} />
                    </g>
                    <line className="bx-c" x1={x} y1={376} x2={x} y2={RACK_T} />
                    {r === 0 ? (
                      <>
                        <text className="bx-t7" x={x + 8} y={300}>
                          {U.bus?.rackFuseA ?? 220} A
                        </text>
                        <text className="bx-t7" x={x + 13} y={331}>
                          CB
                        </text>
                        <text className="bx-t7" x={x + 13} y={364}>
                          MC+
                        </text>
                      </>
                    ) : null}
                    <rect className={`bx-rbox${sev}`} x={x - 31} y={RACK_T} width={62} height={RACK_B - RACK_T} rx={3} />
                    <text className="bx-t10b" x={x} y={RACK_T + 12} textAnchor="middle">
                      Rack#{no}
                    </text>
                    <rect className="bx-bpu" x={x - 22} y={RACK_T + 17} width={44} height={9} />
                    <text className="bx-t6" x={x} y={RACK_T + 24} textAnchor="middle">
                      BPU
                    </text>
                    {Array.from({ length: packs }, (_, pk) => {
                      const y = RACK_B - 10 - (pk + 1) * 7.6;
                      return (
                        <rect
                          key={pk}
                          className="bx-pk"
                          x={x - 22}
                          y={y.toFixed(1)}
                          width={44}
                          height={6.6}
                          style={{ fill: `color-mix(in srgb, ${temp > L.tempMax ? "var(--nm-alarm)" : temp < L.tempMin ? "var(--nm-cold)" : "var(--nm-seq-rgb)"} 35%, transparent)` }}
                        />
                      );
                    })}
                    <rect className="bx-socbg" x={x - 22} y={RACK_B - 8} width={44} height={4} />
                    <rect className="bx-socfg" x={x - 22} y={RACK_B - 8} width={(44 * Math.max(0, Math.min(100, soc))) / 100} height={4} />
                    <text className="bx-tv b" x={x} y={RACK_B + 13} textAnchor="middle">
                      {f(soc)} %
                    </text>
                    <text className="bx-tvm" x={x} y={RACK_B + 25} textAnchor="middle">
                      {f(v, 0)} V
                    </text>
                    <text className="bx-tvm" x={x} y={RACK_B + 37} textAnchor="middle">
                      {f(amp, 0)} A
                    </text>
                    <text className={`bx-tv${temp > L.tempMax ? " alarm" : temp < L.tempMin ? " cold" : ""}`} x={x} y={RACK_B + 49} textAnchor="middle">
                      {f(temp)} °C
                    </text>
                  </g>
                );
              })}
              {/* HVAC sections (2 per bus) */}
              {(U.sections ?? [])
                .filter((sc) => sc.bank === key)
                .map((sc, j) => {
                  const sx = X0[i] + j * 304;
                  return (
                    <g key={sc.id}>
                      <rect className="bx-sec" x={sx + 2} y={622} width={298} height={96} rx={4} />
                      <text className="bx-t9" x={sx + 10} y={637}>
                        SECTION {sc.id} · Rack#{sc.racks[0]}–{sc.racks[sc.racks.length - 1]}
                      </text>
                      {sc.hvac.map((hid, q) => {
                        const hv = unit.hvac?.find((h) => h.id === hid);
                        const mode = hvacMode(hv);
                        const tx = sx + 8 + q * 148;
                        return (
                          <g key={hid} className={`bx-hv ${mode}`}>
                            <rect className="bx-hbox" x={tx} y={644} width={140} height={68} rx={3} />
                            <text className="bx-t10b" x={tx + 8} y={659}>
                              HVAC-{hid}
                            </text>
                            <text
                              className={`bx-st${mode === "fault" ? " alarm" : mode === "heat" ? " warn" : mode === "cool" ? " ok" : ""}`}
                              x={tx + 132}
                              y={659}
                              textAnchor="end"
                            >
                              {hvacLabel(hv)}
                            </text>
                            <text className="bx-tvm" x={tx + 8} y={674}>
                              Sup {hv ? f(hv.supplyT) : "—"} · Ret {hv ? f(hv.returnT) : "—"} °C
                            </text>
                            <text className="bx-tvm" x={tx + 8} y={688}>
                              Comp {hv?.comp ? "on" : "off"} · {hv?.inFanRpm ?? 0}/{hv?.outFanRpm ?? 0} rpm
                            </text>
                            <text className="bx-tvm" x={tx + 8} y={702}>
                              {hv?.acV !== undefined ? `${f(hv.acV, 0)} V` : "—"}
                            </text>
                          </g>
                        );
                      })}
                    </g>
                  );
                })}
              {/* BSC box */}
              <rect className="bx-box" x={X0[i] + 6} y={730} width={290} height={46} rx={3} />
              <text className="bx-t10b" x={X0[i] + 16} y={746}>
                BSC-{n}
                {key} · LGES Flex BSC
              </text>
              <text className="bx-tvm" x={X0[i] + 16} y={761}>
                {b ? `SOC ${f(b.soc)} % · SOH ${f(b.soh)} % · ${f(b.vdc, 0)} V` : "—"}
              </text>
              <text className="bx-tvm" x={X0[i] + 16} y={772}>
                {b ? `T ${f(b.tmin ?? b.tmax)}–${f(b.tmax)} °C · DC CB ${POS_TEXT[b.dcb]}` : "—"}
              </text>
            </g>
          );
        })}

        <rect className="bx-box" x={X0[0] + 310} y={730} width={292} height={46} rx={3} />
        <text className="bx-t10b" x={X0[0] + 320} y={746}>
          Control panel · GD-EMS
        </text>
        <text className="bx-tvm" x={X0[0] + 320} y={761}>
          {unit.aux ? `AUX ${f(unit.aux.kW)} kW · ${f(unit.aux.v, 0)} V · ${f(unit.aux.hz, 2)} Hz` : "AUX —"}
        </text>
        <text className="bx-tvm" x={X0[0] + 320} y={772}>
          {unit.dc ? `DC ${f(unit.dc.voltage, 0)} V · ${f(unit.dc.current, 0)} A` : "DC —"}
        </text>

        <rect className={`bx-box${unit.fss?.status === "fire" ? " alarm" : ""}`} x={X0[1] + 310} y={730} width={292} height={46} rx={3} />
        <text className="bx-t10b" x={X0[1] + 320} y={746}>
          FSS · {U.fss?.panel ?? "Sigma XT"}
        </text>
        <text
          className={`bx-st${unit.fss?.status === "fire" ? " alarm" : unit.fss?.status === "normal" ? " ok" : " warn"}`}
          x={X0[1] + 320}
          y={761}
        >
          {unit.fss ? `${unit.fss.released ? "RELEASED" : unit.fss.status.toUpperCase()} · ${unit.fss.mode}` : "NO DATA"}
        </text>
        <text className="bx-tvm" x={X0[1] + 320} y={772}>
          {unit.fss ? `H₂ ${unit.fss.detectors.map((d) => f(d.lel, 1)).join(" / ")} %LEL` : "—"}
        </text>
      </svg>
    </div>
  );
};
