import React, { useMemo } from "react";
import type { NovaMimicState, NovaTopology } from "./mimic-types";
import {
  buildPeakSeries,
  dailyEnergy,
  deriveCollectorOverview,
  derivePlantOverview,
  deriveSourceStations,
  peakEnergySums,
  type PlantSourceConfig,
  type PlantSourceView,
  type PlantStationConfig,
  type PlantStationView,
  type PlantUnitView,
} from "./demo-plant";
import { DemoTrendChart } from "./DemoTrendChart";
import { RegisterValue } from "./DemoRegMode";
import { bscSource, calcSource, nomapSource } from "./register-sources";
import { DEFAULT_MIMIC_DEVICES } from "./mimic-source-map";

/**
 * Plant overview kartı (SPEC UC-11) — referans `plant-view.js#collectorSvg`
 * portu. grid ← collector (Metal Clad / MV station) ← BESS MV istasyonları +
 * illüstratif PV MV istasyonları; kartta güç/SOC barı/ünite kutucukları/durum +
 * "shown below / open ↓". BESS kartı tıklaması site layout'u o istasyona geçirir
 * (FR-11.5). Peak shaving disabled (gerçek controller yok).
 */

export interface DemoPlantOverviewProps {
  topology: NovaTopology;
  state: NovaMimicState;
  stations?: readonly PlantStationConfig[];
  /** İllüstratif ana-kaynak (PV) istasyonları. */
  sources?: readonly PlantSourceConfig[];
  collector?: { name?: string; label?: string; installedMW?: number; limitMW?: number };
  selectedStation?: number;
  onStationSelect?: (index: number) => void;
  /** PV kartı tıklaması → o kaynak istasyonunun çizimi. */
  onSourceSelect?: (key: string) => void;
  /** Peak shaving eşiği (MW) — illüstratif. */
  peakMW?: number;
  powerPoints?: Array<{ t: number; value: number }>;
}

const f = (v: number, d = 1): string => (Math.round(v * 10 ** d) / 10 ** d).toFixed(d);
const amps = (mw: number, kv: number): number => (kv > 0.1 ? (Math.abs(mw) * 1e3) / (Math.sqrt(3) * kv) : 0);
const dirCls = (p: number): string => (p > 0.05 ? "dis" : p < -0.05 ? "chg" : "");
const SEV_VAR: Record<string, string> = {
  alarm: "var(--nm-alarm)",
  warn: "var(--nm-warn)",
  cold: "var(--nm-cold)",
  maint: "var(--nm-maint)",
};

const GridSym: React.FC<{ x: number; y: number }> = ({ x, y }) => (
  <g className="po-grid">
    <circle cx={x} cy={y} r={15} />
    <path d={`M${x - 8} ${y}h16M${x} ${y - 8}v16M${x - 5} ${y - 6}l10 12M${x + 5} ${y - 6}l-10 12`} />
  </g>
);

const UnitTile: React.FC<{ u: PlantUnitView; x: number; y: number; w: number }> = ({ u, x, y, w }) => {
  const sev = u.sev ? ` ${u.sev === "warn" ? "warn" : u.sev}` : "";
  return (
    <g>
      <rect className={`po-u${sev}`} x={x} y={y} width={w} height={22} rx={2}>
        <title>{`BESS#${u.n}`}</title>
      </rect>
      <text className="po-un" x={x + w / 2} y={y + 15} textAnchor="middle">{u.n}</text>
    </g>
  );
};

interface CollectorSvgProps {
  ov: ReturnType<typeof deriveCollectorOverview>;
  sources: PlantSourceView[];
  collectorName: string;
  installedMW: number;
  limitMW: number;
  plantPoiMW: number;
  reactiveMvar: number;
  selected?: number;
  onSelect?: (index: number) => void;
  onSourceSelect?: (key: string) => void;
}

/** Collector tek hat + BESS/PV istasyon kartları (gdems `collectorSvg` birebir). */
const CollectorSvg: React.FC<CollectorSvgProps> = ({
  ov,
  sources,
  collectorName,
  installedMW,
  limitMW,
  plantPoiMW,
  reactiveMvar,
  selected,
  onSelect,
  onSourceSelect,
}) => {
  const W = 1000;
  const yBus = 150;
  const yBox = yBus + 92;
  const boxH = 168;
  const H = yBox + boxH + 12;
  const bx0 = 30;
  const bx1 = W - 30;
  const boxes: Array<{ kind: "bess"; st: PlantStationView } | { kind: "src"; s: PlantSourceView }> = [
    ...ov.stations.map((st) => ({ kind: "bess" as const, st })),
    ...sources.map((s) => ({ kind: "src" as const, s })),
  ];
  const nf = Math.max(1, boxes.length);
  const slot = (bx1 - bx0) / nf;
  const boxW = Math.min(230, slot - 14);
  const kv = ov.poiKv;
  const pf = Math.abs(plantPoiMW) > 0.3 ? Math.abs(plantPoiMW) / Math.hypot(plantPoiMW, reactiveMvar) : 1;
  return (
    <svg className="po" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Plant single-line overview">
      <GridSym x={W / 2} y={26} />
      <text className="po-t b" x={W / 2 + 24} y={22}>GRID · TEİAŞ · POI 34.5 kV</text>
      <text className="po-v" x={W / 2 + 24} y={37}>
        {`${plantPoiMW >= 0 ? "export →" : "import ←"} ${f(Math.abs(plantPoiMW), 2)} MW · Q ${f(reactiveMvar, 2)} Mvar`}
      </text>
      <line className="po-ln" x1={W / 2} y1={41} x2={W / 2} y2={yBus} />
      <rect className="po-cb" x={W / 2 - 8} y={70} width={16} height={16} />
      <text className="po-t" x={W / 2 - 14} y={82} textAnchor="end">Q01 · incomer</text>
      <circle className="po-vt" cx={W / 2 + 34} cy={112} r={8} />
      <circle className="po-vt" cx={W / 2 + 34} cy={122} r={8} />
      <line className="po-ln thin" x1={W / 2} y1={112} x2={W / 2 + 26} y2={112} />
      <text className="po-t b" x={W / 2 + 50} y={108}>Q02 · metering</text>
      <text className="po-v" x={W / 2 + 50} y={123}>{`${f(amps(plantPoiMW, kv), 0)} A · ${f(kv, 2)} kV`}</text>
      <text className="po-v" x={W / 2 + 50} y={137}>{`${f(plantPoiMW, 2)} MW · ${f(ov.poiHz, 2)} Hz · PF ${f(pf, 2)}`}</text>
      <line className="po-bus" x1={bx0} y1={yBus} x2={bx1} y2={yBus} />
      <text className="po-t b" x={bx0} y={yBus - 10}>{`${collectorName.toUpperCase()} · 34.5 kV`}</text>
      <text className="po-t" x={bx1} y={yBus - 10} textAnchor="end">
        {`installed ${f(installedMW, 1)} MW ${installedMW > limitMW ? ">" : "≤"} ${limitMW} MW → ${collectorName}`}
      </text>
      {boxes.map((b, i) => {
        const cx = bx0 + slot * (i + 0.5);
        const x = cx - boxW / 2;
        const mw = b.kind === "bess" ? b.st.mw : b.s.mw;
        const name = b.kind === "bess" ? b.st.name : b.s.name;
        const isSel = b.kind === "bess" && selected === b.st.index;
        const inner = b.kind === "bess" ? b.st.n : b.s.n;
        const cw = (boxW - 20 - (inner - 1) * 3) / Math.max(1, inner);
        return (
          <g
            key={name}
            className={`po-st ${b.kind === "bess" ? "po-bess" : "po-src"}${isSel ? " act" : ""}`}
            role="button"
            tabIndex={0}
            aria-label={`Show ${name}`}
            onClick={() => (b.kind === "bess" ? onSelect?.(b.st.index) : onSourceSelect?.(b.s.key))}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                if (b.kind === "bess") onSelect?.(b.st.index);
                else onSourceSelect?.(b.s.key);
              }
            }}
          >
            <line className={`po-ln ${dirCls(mw)}`} x1={cx} y1={yBus} x2={cx} y2={yBox} />
            <rect className="po-cb" x={cx - 8} y={yBus + 22} width={16} height={16} />
            <text className="po-t" x={cx + 13} y={yBus + 34}>{`Q0${i + 4}`}</text>
            <text className="po-v" x={cx + 13} y={yBus + 58}>{`${f(Math.abs(mw), 2)} MW`}</text>
            <text className="po-v" x={cx + 13} y={yBus + 72}>{`${f(amps(mw, kv), 0)} A`}</text>
            <rect className="po-box" x={x} y={yBox} width={boxW} height={boxH} rx={6} />
            <text className="po-t b" x={x + 10} y={yBox + 18}>{name}</text>
            {b.kind === "bess" ? (
              <>
                <text className="po-t" x={x + 10} y={yBox + 33}>
                  {`BESS#${b.st.first}–${b.st.last} · ${b.st.n} × 3.568 MWh`}
                </text>
                <text className={`po-big ${dirCls(mw)}`} x={x + 10} y={yBox + 60}>
                  {`${mw < 0 ? "−" : ""}${f(Math.abs(mw), 2)} MW`}
                </text>
                <text className="po-t" x={x + 10} y={yBox + 77}>{`SOC ${f(b.st.soc)} % · ${b.st.status.toLowerCase()}`}</text>
                <rect className="po-socb" x={x + 10} y={yBox + 86} width={boxW - 20} height={8} rx={2} />
                <rect className="po-soc" x={x + 10} y={yBox + 86} width={((boxW - 20) * Math.max(0, Math.min(100, b.st.soc))) / 100} height={8} rx={2} />
                {b.st.units.map((u, j) => (
                  <UnitTile key={u.n} u={u} x={x + 10 + j * (cw + 3)} y={yBox + 104} w={cw} />
                ))}
                <text className="po-t" x={x + 10} y={yBox + 145}>{`${b.st.available}/${b.st.n} available`}</text>
                <text className="po-link" x={x + boxW - 10} y={yBox + 160} textAnchor="end">
                  {isSel ? "shown below" : "open ↓"}
                </text>
              </>
            ) : (
              <>
                <text className="po-t" x={x + 10} y={yBox + 33}>{`${b.s.n} × central inverter ${f(b.s.unitMVA, 1)} MVA`}</text>
                <text className="po-big src" x={x + 10} y={yBox + 60}>{`${f(b.s.mw, 1)} MW`}</text>
                <text className="po-t" x={x + 10} y={yBox + 77}>running · illustrative (simulated)</text>
                {b.s.unitMW.map((um, j) => {
                  const h = 46 * Math.min(1, um / Math.max(0.01, b.s.unitMVA));
                  const ux = x + 10 + j * (cw + 3);
                  return (
                    <g key={j}>
                      <rect className="po-ib" x={ux} y={yBox + 88} width={cw} height={46} rx={2}>
                        <title>{`INV-${String(j + 1).padStart(2, "0")}`}</title>
                      </rect>
                      <rect className="po-if" x={ux} y={yBox + 134 - h} width={cw} height={h} rx={2} />
                      <text className="po-un" x={ux + cw / 2} y={yBox + 148} textAnchor="middle">
                        {String(j + 1).padStart(2, "0")}
                      </text>
                    </g>
                  );
                })}
                <text className="po-link" x={x + boxW - 10} y={yBox + 162} textAnchor="end">open ↓</text>
              </>
            )}
          </g>
        );
      })}
    </svg>
  );
};

export const DemoPlantOverview: React.FC<DemoPlantOverviewProps> = ({
  topology,
  state,
  stations,
  sources,
  collector,
  selectedStation,
  onStationSelect,
  onSourceSelect,
  peakMW = 20,
  powerPoints = [],
}) => {
  const multi = (stations?.length ?? 0) > 1;
  const collectorOv = useMemo(
    () => (multi ? deriveCollectorOverview(state, topology, stations!) : null),
    [multi, state, topology, stations],
  );
  const sourceViews = useMemo(() => (sources ? deriveSourceStations(sources) : []), [sources]);
  const standaloneOv = useMemo(
    () => (multi ? null : derivePlantOverview(state, topology)),
    [multi, state, topology],
  );

  const groups = state.units.length;
  const daily = useMemo(
    () => dailyEnergy(powerPoints, groups, topology.unit.containerMWh),
    [powerPoints, groups, topology.unit.containerMWh],
  );

  const dev = DEFAULT_MIMIC_DEVICES;
  const collectorName = collector?.name ?? "MV station";
  const limitMW = collector?.limitMW ?? 50;

  const stationsView: PlantStationView[] = collectorOv?.stations ?? [];
  const solarMW = sourceViews.reduce((a, s) => a + s.mw, 0);
  const solarMVA = sourceViews.reduce((a, s) => a + s.n * s.unitMVA, 0);
  const totalMW = stationsView.reduce((a, s) => a + s.mw, 0) + solarMW;
  const reactiveMvar =
    state.units.reduce((a, u) => a + u.pcs.reduce((b, p) => b + (p.reactiveKvar ?? 0), 0), 0) / 1000;
  const socAvg = stationsView.length
    ? stationsView.reduce((a, s) => a + s.soc * s.n, 0) / Math.max(1, stationsView.reduce((a, s) => a + s.n, 0))
    : 0;
  const availableMW = state.units.reduce((a) => a + 2 * topology.unit.pcsMaxMW, 0);
  const energyMWh =
    topology.unit.containerMWh *
    ((topology.feeders.A?.units.length ?? 0) + (topology.feeders.B?.units.length ?? 0));
  const plantPoiMW = (collectorOv?.poiMW ?? standaloneOv?.poiMW ?? 0) + solarMW;
  const installedMW =
    collector?.installedMW ?? stationsView.reduce((a, s) => a + s.n * 2 * topology.unit.pcsMaxMW, 0) + solarMW;

  const peak = useMemo(
    () => (sourceViews.length ? buildPeakSeries(Date.now(), topology.powerMW, peakMW, solarMW) : null),
    [sourceViews.length, topology.powerMW, peakMW, solarMW],
  );
  const peakSums = useMemo(() => (peak ? peakEnergySums(peak.samples) : null), [peak]);

  const kpi = (label: string, value: string, sub: string, source: React.ReactNode, cls = ""): React.ReactNode => (
    <div className={cls} key={label}>
      <small>{label}</small>
      <b>{source}</b>
      <em>{sub}</em>
    </div>
  );
  const simSrc = (): React.ReactNode => nomapSource("PV central inverter / PV MV station relay", "AC / DC power, voltage, current, state (map not given)");

  return (
    <section className="card plantcard" aria-label="Plant overview" data-testid="plant-overview">
      <header>
        <h2>
          Plant overview<small>grid ← collector ← BESS and main-source MV stations · click a BESS station to show it below</small>
        </h2>
      </header>
      <div className="po-wrap">
        <div className="po-svg">
          {collectorOv ? (
            <CollectorSvg
              ov={collectorOv}
              sources={sourceViews}
              collectorName={collectorName}
              installedMW={installedMW}
              limitMW={limitMW}
              plantPoiMW={plantPoiMW}
              reactiveMvar={reactiveMvar}
              selected={selectedStation}
              onSelect={onStationSelect}
              onSourceSelect={onSourceSelect}
            />
          ) : standaloneOv ? (
            <StandaloneSvg ov={standaloneOv} topology={topology} />
          ) : null}
        </div>
        <div className="po-side">
          <div className="po-src-h">
            <b>{`Main source · ${sourceViews.length ? "solar" : "none"}`}</b>
            <small>
              {`Connection ${topology.powerMW} MWe · BESS ${stationsView.length || 1} × ${f(topology.powerMW, 2)} MW / ${f(energyMWh, 1)} MWh · collector `}
              <b>{collectorName}</b>
            </small>
          </div>
          <div className="fld">
            <span>Plant mode</span>
            <div className="seg" role="group" aria-label="Plant mode">
              <button type="button" aria-pressed>Manual</button>
              <button type="button" disabled title="Needs a main source controller (Admin › Plant & source)">
                Peak shaving
              </button>
            </div>
            <small>BESS stations follow FL-02 (Operations); no main source controller assigned.</small>
          </div>
          <div className="mgrid g3 po-live">
            {sourceViews.length
              ? [
                  kpi(
                    "Solar available",
                    `${f(solarMVA, 1)} MVA`,
                    "illustrative (simulated)",
                    <RegisterValue source={simSrc()}>{`${f(solarMVA, 1)} MVA`}</RegisterValue>,
                  ),
                  kpi(
                    "Solar output",
                    `${f(solarMW, 1)} MW`,
                    "illustrative (simulated)",
                    <RegisterValue source={simSrc()}>{`${f(solarMW, 1)} MW`}</RegisterValue>,
                  ),
                ]
              : null}
            {kpi(
              "BESS",
              `${totalMW - solarMW < 0 ? "−" : ""}${f(Math.abs(totalMW - solarMW), 1)} MW`,
              "stations total",
              <RegisterValue source={calcSource("Σ BESS MV station H03 meters", [nomapSource(dev.mv, "active power at the POI")])}>
                {`${totalMW - solarMW < 0 ? "−" : ""}${f(Math.abs(totalMW - solarMW), 1)} MW`}
              </RegisterValue>,
              dirCls(totalMW - solarMW),
            )}
            {kpi(
              "POI · grid",
              `${f(plantPoiMW, 1)} MW`,
              `limit ${topology.powerMW} MWe`,
              <RegisterValue source={nomapSource(dev.mv, "active power at the POI meter")}>
                {`${f(plantPoiMW, 1)} MW`}
              </RegisterValue>,
            )}
            {kpi(
              "BESS SOC",
              `${f(socAvg, 1)} %`,
              `${f((socAvg / 100) * energyMWh, 1)} MWh stored`,
              <RegisterValue source={calcSource("average of BSC SOC", [bscSource(dev.bsc("A"), "bank.soc", { bank: "A" })])}>
                {`${f(socAvg, 1)} %`}
              </RegisterValue>,
            )}
            {kpi(
              "Available",
              `${f(availableMW, 1)} MW`,
              `${groups} groups · dis / chg`,
              <RegisterValue source={calcSource("Σ min(PCS max, BSC limit) of available groups", [bscSource(dev.bsc("A"), "bank.disLimit", { bank: "A" })])}>
                {`${f(availableMW, 1)} MW`}
              </RegisterValue>,
            )}
          </div>
          <div className="mgrid g3 po-day">
            {dayValue("Exported today", daily.hasData ? `${f(daily.exportedMWh, 1)} MWh` : "—", "POI meter daily delta")}
            {dayValue("Imported today", daily.hasData ? `${f(daily.importedMWh, 1)} MWh` : "—", "charge from grid")}
            {dayValue("BESS today", daily.hasData ? `${f(daily.bessInMWh, 1)} MWh in` : "—", daily.hasData ? `${f(daily.bessOutMWh, 1)} MWh out · ${f(daily.cycles, 2)} cycles` : "no data")}
          </div>
        </div>
      </div>
      {powerPoints.length > 1 ? (
        <div className="charts one">
          <DemoTrendChart
            title="Plant power · last window"
            unit="MW"
            yMin={Math.min(-1, Math.floor(Math.min(...powerPoints.map((p) => p.value)) - 1))}
            yMax={Math.max(1, Math.ceil(Math.max(...powerPoints.map((p) => p.value)) + 1))}
            height={180}
            series={[{ label: "POI (grid)", color: "var(--nm-c-pow)", points: powerPoints, area: true }]}
          />
        </div>
      ) : null}
      {peak && peakSums ? (
        <div className="pkwrap">
          <div className="charts one">
            <DemoTrendChart
              title="Solar production & peak shaving · today"
              unit="MW"
              yMin={0}
              yMax={Math.max(10, Math.ceil((solarMW + 5) / 10) * 10)}
              height={210}
              limits={[{ value: topology.powerMW, label: `Connection ${topology.powerMW} MWe`, cls: "hot" }]}
              series={[
                { label: "Solar production", color: "var(--nm-warn)", points: peak.samples.map((s) => ({ t: s.t, value: s.src })), area: true },
                {
                  label: "Shaved → stored in BESS",
                  color: "var(--nm-flow-chg)",
                  band: {
                    lower: peak.samples.map((s) => ({ t: s.t, value: s.shaveLower })),
                    upper: peak.samples.map((s) => ({ t: s.t, value: s.shaveUpper })),
                  },
                },
                {
                  label: "Released from BESS",
                  color: "var(--nm-flow-dis)",
                  band: {
                    lower: peak.samples.map((s) => ({ t: s.t, value: s.relLower })),
                    upper: peak.samples.map((s) => ({ t: s.t, value: s.relUpper })),
                  },
                },
                { label: "POI (grid)", color: "var(--nm-c-pow)", points: peak.samples.map((s) => ({ t: s.t, value: s.poi })) },
                { label: "Peak threshold", color: "var(--nm-c-sp)", points: peak.samples.map((s) => ({ t: s.t, value: s.threshold })), dash: true },
              ]}
            />
          </div>
          <p className="peaksum">
            <span><b>{f(peakSums.productionMWh, 1)} MWh</b> solar production</span>
            <span className="c-shave"><b>{f(peakSums.shavedMWh, 1)} MWh</b> shaved → stored</span>
            <span className="c-rel"><b>{f(peakSums.releasedMWh, 1)} MWh</b> released from the BESS</span>
            <span><b>{f(peakSums.curtailedMWh, 1)} MWh</b> curtailed</span>
            <span>{`threshold ${peakMW} MW · illustrative · plant in Manual – no peak shaving`}</span>
          </p>
        </div>
      ) : null}
    </section>
  );
};

/** Tek istasyon (kolektör yok) — referans `standaloneSvg`. */
const StandaloneSvg: React.FC<{ ov: ReturnType<typeof derivePlantOverview>; topology: NovaTopology }> = ({
  ov,
  topology,
}) => {
  const kV = ov.poiKv;
  // K-22: her istasyon 9 ünite → iki fider yan yana sığsın diye geniş tuval.
  const W = 1960;
  const yBus = 132;
  const rowY = 214;
  const tileW = 88;
  const gap = 10;
  const H = rowY + 72 + 40;
  const feederA = topology.feeders.A?.units ?? [];
  const feederB = topology.feeders.B?.units ?? [];
  const x0A = 50;
  const x0B = 1010;
  const posOf = new Map<number, { x: number; y: number }>();
  feederA.forEach((n, i) => posOf.set(n, { x: x0A + i * (tileW + gap), y: rowY }));
  feederB.forEach((n, i) => posOf.set(n, { x: x0B + i * (tileW + gap), y: rowY }));
  const feedXPx: Record<string, number> = { A: 480, B: 1440 };
  return (
    <svg className="po" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Standalone BESS overview">
      <GridSym x={160} y={28} />
      <text className="po-t b" x={184} y={24}>GRID · TEİAŞ · MV POI 34.5 kV</text>
      <text className="po-v" x={184} y={39}>{`${f(Math.abs(ov.poiMW), 2)} MW · ${f(ov.poiAmp, 0)} A`}</text>
      <line className="po-ln" x1={160} y1={43} x2={160} y2={yBus} />
      <rect className="po-cb" x={152} y={70} width={16} height={16} />
      <text className="po-t" x={146} y={82} textAnchor="end">H01 · incomer</text>
      <circle className="po-vt" cx={192} cy={102} r={8} />
      <circle className="po-vt" cx={192} cy={112} r={8} />
      <line className="po-ln thin" x1={160} y1={102} x2={184} y2={102} />
      <text className="po-t b" x={210} y={98}>H03 · metering</text>
      <text className="po-v" x={210} y={113}>{`${f(kV, 2)} kV · ${f(ov.poiHz, 2)} Hz`}</text>
      <line className="po-bus" x1={70} y1={yBus} x2={W - 70} y2={yBus} />
      <text className="po-t" x={W - 72} y={yBus - 8} textAnchor="end">{`${f(kV, 1)} kV`}</text>
      <line className="po-ln thin" x1={300} y1={yBus} x2={300} y2={yBus + 38} />
      <rect className="po-cb lbs" x={294} y={yBus + 10} width={12} height={12} />
      <text className="po-t" x={310} y={yBus + 20}>{`H02 · AUX TR ${topology.aux?.trKVA ?? 400} kVA`}</text>
      <text className="po-v" x={310} y={yBus + 34}>{`${f(ov.auxKW, 1)} kW`}</text>
      {ov.feeders.map((fd) => {
        const x0 = feedXPx[fd.id] ?? 500;
        const cell = topology.feeders[fd.id]?.cell ?? `H0${fd.id === "A" ? 4 : 5}`;
        const list = fd.id === "A" ? feederA : feederB;
        return (
          <g key={fd.id}>
            <line className={`po-ln ${dirCls(fd.mw)}`} x1={x0} y1={yBus} x2={x0} y2={rowY - 30} />
            <rect className="po-cb" x={x0 - 8} y={yBus + 10} width={16} height={16} />
            <text className="po-t b" x={x0 + 14} y={yBus + 22}>{`${cell} · feeder ${fd.id}`}</text>
            <text className="po-v" x={x0 + 14} y={yBus + 37}>{`${f(fd.mw, 2)} MW · ${f(fd.amp, 0)} A`}</text>
            {list.map((n) => {
              const p = posOf.get(n);
              return p ? (
                <line key={n} className="po-ln thin" x1={p.x + tileW / 2} y1={rowY - 30} x2={p.x + tileW / 2} y2={rowY} />
              ) : null;
            })}
          </g>
        );
      })}
      {ov.units.map((u) => {
        const p = posOf.get(u.n);
        return p ? <UnitTile key={u.n} u={u} x={p.x} y={p.y} w={tileW} /> : null;
      })}
      <text className="po-t" x={x0A} y={H - 12}>{`Feeder A · BESS#${feederA[0] ?? "—"}–${feederA[feederA.length - 1] ?? "—"}`}</text>
      <text className="po-t" x={x0B} y={H - 12}>{`Feeder B · BESS#${feederB[0] ?? "—"}–${feederB[feederB.length - 1] ?? "—"}`}</text>
    </svg>
  );
};

const dayValue = (label: string, value: string, sub: string): React.ReactNode => (
  <div key={label}>
    <small>{label}</small>
    <b>
      <RegisterValue source={calcSource("energy register of the POI meter (daily delta)", [nomapSource("DEMO-MV-1", "energy export / import")])}>
        {value}
      </RegisterValue>
    </b>
    <em>{sub}</em>
  </div>
);
