import React, { createContext, useContext, useMemo, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import {
  DemoKpiStrip,
  DemoProjectStrip,
  DemoStationBar,
  NOVA_ICONS,
  RegisterValue,
  DEFAULT_MIMIC_DEVICES,
  bscSource,
  calcSource,
  hvacSource,
  modelSource,
  nomapSource,
  pcsSource,
  type DemoTile,
  type NovaMimicState,
  type NovaTopology,
  type RegisterSource,
} from "@gd-monorepo/ui";
import { useDemoProject, type DemoProjectData } from "../features/demo-data/useDemoProject";
import { useTargetSocWatcher } from "../features/demo-data/useTargetSocWatcher";
import { availablePoiMW } from "../features/demo-data/demo-permissives";
import { DEMO_TOPOLOGY } from "../features/demo-data/demo-topology";
import { DEMO_STATIONS, stateForStation, stationTopo, type DemoStation } from "../features/demo-data/demo-stations";
import { deriveKpis } from "../features/demo-data/deriveKpis";
import { deriveAlerts } from "../features/demo-data/deriveAlerts";
import { siteFieldId } from "../lib/site-field";
import { isTunnelMode } from "../lib/api-base";

/**
 * DemoProjectLayout — proje sekmelerinin ortak üst bloğu (SPEC UC-2/UC-11):
 * pinfo → **stBar (istasyon seçici)** → KPI (seçili istasyona göre) → aktif sekme.
 * `activeStation` context'te tutulur; plant kartı + stBar + site layout tek
 * kaynaktan senkron (gdems `A.k`).
 */

export interface DemoProjectContextValue extends DemoProjectData {
  fieldId: string;
  base: string;
  openDevices: (n: number, tab?: string) => void;
  /** Aktif BESS MV istasyonu (0-tabanlı). */
  activeStation: number;
  setActiveStation: (index: number) => void;
  /** Seçili istasyonun süzülmüş state'i + topo'su. */
  stationState: NovaMimicState;
  stationTopology: NovaTopology;
  /** Seçili istasyonun uyarıları (attention). */
  stationAlerts: DemoProjectData["alerts"];
  /** İstasyon key → konteyner id (uzak manevra hedefi). */
  stationSystems: Record<string, string>;
  /** Aktif saha istasyonları (EMS topolojisi; yoksa statik fallback). */
  stations: DemoStation[];
}

const DemoProjectContext = createContext<DemoProjectContextValue | null>(null);

export function useDemoProjectContext(): DemoProjectContextValue {
  const ctx = useContext(DemoProjectContext);
  if (!ctx) throw new Error("useDemoProjectContext: DemoProjectLayout dışında kullanılamaz");
  return ctx;
}

const f = (v: number, d = 1): string => (Math.round(v * 10 ** d) / 10 ** d).toFixed(d);

const DEV = DEFAULT_MIMIC_DEVICES;
const rv = (source: RegisterSource, value: React.ReactNode): React.ReactNode => (
  <RegisterValue source={source}>{value}</RegisterValue>
);

export const DemoProjectLayout: React.FC = () => {
  const fieldId = siteFieldId();
  const base = isTunnelMode() ? `/fields/${fieldId}/ui` : `/field/${fieldId}`;
  const navigate = useNavigate();
  const project = useDemoProject(fieldId);
  const { state, rest, runs } = project;
  const [activeStation, setActiveStation] = useState(0);
  const L = DEMO_TOPOLOGY.limits;

  // gdems `activate(pi, k)`: aktif istasyon tüm görünümleri belirler — çizim
  // her zaman 9 ünite + 2 fiderdir; istasyon geçişi tüm sekmeleri değiştirir.
  const stations = (project.stations?.length ?? 0) > 0 ? project.stations : [...DEMO_STATIONS];
  const station = stations[activeStation] ?? stations[0]!;
  const stationState = useMemo(() => stateForStation(state, station), [state, station]);
  const stationTopology = useMemo(() => stationTopo(station), [station]);
  const stationKpis = useMemo(() => deriveKpis(stationState, stationTopology), [stationState, stationTopology]);
  const stationAlerts = useMemo(
    () => deriveAlerts(stationState, stationTopology),
    [stationState, stationTopology],
  );

  // İstasyon → konteyner eşlemesi (field register `station` etiketi; ön yüz girdisi).
  const stationSystems = useMemo(() => {
    const map: Record<string, string> = {};
    for (const s of stations) {
      const id = s.containerIds[0];
      if (id !== undefined) map[s.key] = id;
    }
    return map;
  }, [stations]);

  // UC-13: hedef SOC gözlemcisi — stop'u hedefin istasyonunun konteynerine yönlendirir.
  useTargetSocWatcher(state, runs, stationSystems);


  const openDevices = (n: number, tab = "battery"): void => {
    navigate(`${base}/devices?tab=${tab}&unit=${n}`);
  };

  const tiles = useMemo<DemoTile[]>(() => {
    const k = stationKpis;
    const mode =
      k.mode === "rest"
        ? rest.complete
          ? "restok"
          : "restno"
        : k.mode === "chg"
          ? "chg"
          : k.mode === "dis"
            ? "dis"
            : null;
    return [
      {
        icon:
          k.mode === "chg" ? (
            <NOVA_ICONS.chg />
          ) : k.mode === "dis" ? (
            <NOVA_ICONS.dis />
          ) : k.mode === "rest" ? (
            <NOVA_ICONS.rest />
          ) : (
            <NOVA_ICONS.stby />
          ),
        label: "Operating mode",
        value: rv(
          calcSource("PMS program state (FL-01 / FL-02 / rest timer)", [pcsSource(DEV.pcs("A"), "pcs.state")]),
          k.mode === "chg" ? "Charging" : k.mode === "dis" ? "Discharging" : k.mode === "rest" ? "Rest" : "Standby",
        ),
        sub: k.runPcs > 0 ? `${k.runPcs} / ${k.totalPcs} PCS running` : "No active program",
        sev: mode,
      },
      {
        icon: <NOVA_ICONS.bolt />,
        label: "Station power · H03",
        value: rv(
          calcSource("Σ PCS active power − group AUX load (H03 meter not mapped yet, M2)", [
            pcsSource(DEV.pcs("A"), "pcs.p"),
          ]),
          `${f(Math.abs(k.poiMW), 2)} MW`,
        ),
        sub: k.poiMW > 0.05 ? "Export → grid" : k.poiMW < -0.05 ? "Import ← grid" : "No flow",
        sev: k.poiMW > 0.05 ? "dis" : k.poiMW < -0.05 ? "chg" : null,
      },
      {
        icon: <NOVA_ICONS.battery level={k.avgSoc / 100} />,
        label: "Average SOC",
        value: rv(calcSource("average of BSC SOC", [bscSource(DEV.bsc("A"), "bank.soc")]), `${f(k.avgSoc)} %`),
        sub: `${L.socMin}–${L.socMax} %`,
      },
      {
        icon: <NOVA_ICONS.health />,
        label: "SOH",
        value: rv(calcSource("average of BSC SOH", [bscSource(DEV.bsc("A"), "bank.soh")]), `${f(k.avgSoh)} %`),
        sub: `Min ${f(k.sohMin)} %`,
      },
      {
        icon: <NOVA_ICONS.thermo />,
        label: "Cell temperature",
        value: rv(
          calcSource("max of BSC max pack temperature", [bscSource(DEV.bsc("A"), "bank.tmax")]),
          `${f(k.tmax)} °C`,
        ),
        sub: `band ${L.tempMin}–${L.tempMax} °C`,
        sev: k.tmax > L.tempMax ? "alarm" : k.tmin < L.tempMin ? "cold" : null,
      },
      {
        icon: <NOVA_ICONS.units />,
        label: "Availability",
        value: rv(
          calcSource("PMS permissives per group (BSC state, PCS state, MV path, faults, temperature)", [
            bscSource(DEV.bsc("A"), "bank.state"),
            pcsSource(DEV.pcs("A"), "pcs.state"),
          ]),
          `${k.availUnits} / ${k.totalUnits} groups`,
        ),
        sub: `${k.runPcs} / ${k.totalPcs} PCS running`,
      },
      {
        icon: <NOVA_ICONS.bell />,
        label: "Active faults",
        value: rv(
          calcSource("PMS fault list from BSC diagnosis, PCS fault words, FSS / gas inputs", [
            bscSource(DEV.bsc("A"), "bank.info"),
            pcsSource(DEV.pcs("A"), "pcs.fault"),
          ]),
          `${k.alarms + k.warns + k.colds + k.maints}`,
        ),
        sub: k.alarms > 0 ? `${k.alarms} critical` : k.warns > 0 ? `${k.warns} warnings` : "None",
        sev: k.alarms > 0 ? "alarm" : k.warns > 0 ? "warn" : null,
      },
    ];
  }, [stationKpis, rest.complete, L.socMin, L.socMax, L.tempMin, L.tempMax]);

  const stripItems = useMemo(() => {
    const U = DEMO_TOPOLOGY.unit;
    const n = stationState.units.length || DEMO_TOPOLOGY.feeders.A!.units.length + DEMO_TOPOLOGY.feeders.B!.units.length;
    const banks = stationState.units.filter((u) => u.rmu.H02 === "closed").flatMap((u) => u.banks);
    const disMWh = banks.reduce(
      (a, b) => a + Math.max(0, (b.soc - L.socMin) / 100) * (U.containerMWh / 2) * (b.soh / 100),
      0,
    );
    // Anlık akış DEĞİL: kullanılabilir gruplardan Σ min(PCS max, BSC limit), kayıp + AUX sonrası (iki yön).
    const auxKwTotal = stationState.units.reduce((a, u) => a + (u.aux?.kW ?? 0), 0);
    const dis = availablePoiMW(stationState, stationTopology, [], "dis", auxKwTotal);
    const chg = availablePoiMW(stationState, stationTopology, [], "chg", auxKwTotal);
    return [
      { label: "Rated power", value: rv(modelSource("project configuration (connection point)"), `${stationTopology.powerMW} MWe`), sub: `POI ${stationTopology.station.nominalKV} kV` },
      { label: "Rated energy", value: rv(modelSource("project configuration (BESS containerMWh)"), `${f(stationTopology.energyMWh, 3)} MWh`), sub: `${n} × ${f(U.containerMWh, 3)} MWh` },
      { label: "Battery", value: rv(modelSource("unit nameplate"), `${n} × ${U.container}`), sub: `${U.banks.length * U.racksPerBank} racks × ${U.rackKWh} kWh` },
      { label: "PCS", value: rv(modelSource("unit nameplate"), `${n * 2} × ${f(U.pcsKVA / 1000, 3)} MVA`), sub: `Wattox · ${U.pcsAcV} V` },
      { label: "MV", value: rv(modelSource("unit nameplate"), `${n} × ${f(U.trKVA / 1000, 2)} MVA`), sub: U.trRatio },
      { label: "HVAC", value: rv(modelSource("unit nameplate"), `${n * (U.sections?.length ? U.sections.length * 2 : 8)} × MC90`), sub: "Envicool" },
      {
        label: "Available now",
        value: rv(
          calcSource("Σ min(PCS max, BSC limit) of available groups, minus losses and AUX", [
            bscSource(DEV.bsc("A"), "bank.disLimit"),
            pcsSource(DEV.pcs("A"), "pcs.allowDisP"),
          ]),
          `${f(dis, 1)} MW`,
        ),
        sub: `discharge · ${f(chg, 1)} MW charge at POI`,
      },
      {
        label: "Dischargeable",
        value: rv(
          calcSource("Σ (SOC − 3.5 %) × bank energy × SOH", [
            bscSource(DEV.bsc("A"), "bank.soc"),
            bscSource(DEV.bsc("A"), "bank.soh"),
          ]),
          `${f(disMWh, 1)} MWh`,
        ),
        sub: `to SOC ${L.socMin} %`,
      },
      { label: "AUX load", value: rv(nomapSource("PM5340-1", "total active power"), `${f(stationState.units[0]?.aux?.kW ?? 0, 1)} kW`), sub: `TR ${DEMO_TOPOLOGY.aux?.trKVA ?? 400} kVA` },
      {
        label: "Ambient",
        value: rv(hvacSource("HVAC-1", "hvac.outsideT"), stationState.ambient !== undefined ? `${f(stationState.ambient)} °C` : "—"),
        sub: "HVAC Outside Temp",
      },
    ];
  }, [stationState, stationTopology, stationKpis.poiMW, L.socMin]);

  const ctx: DemoProjectContextValue = {
    ...project,
    fieldId,
    base,
    openDevices,
    activeStation,
    setActiveStation,
    stationState,
    stationTopology,
    stationAlerts,
    stationSystems,
    stations,
  };

  return (
    <DemoProjectContext.Provider value={ctx}>
      <div className="nova-console" style={{ padding: 10 }}>
        {project.error ? <p className="empty">Project data error: {project.error}</p> : null}
        <DemoProjectStrip
          name={DEMO_TOPOLOGY.name}
          id={DEMO_TOPOLOGY.id}
          location={DEMO_TOPOLOGY.location}
          items={stripItems}
        />
        <DemoStationBar
          stations={stations.map((s) => {
            const st = stateForStation(state, s);
            const topo = stationTopo(s);
            return {
              index: s.index,
              name: s.name,
              first: s.units[0] ?? 0,
              last: s.units.at(-1) ?? 0,
              faults: deriveAlerts(st, topo).length,
            };
          })}
          active={activeStation}
          onSelect={setActiveStation}
        />
        <DemoKpiStrip tiles={tiles} />
        <Outlet />
      </div>
    </DemoProjectContext.Provider>
  );
};
