import React, { createContext, useContext, useMemo } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { DemoKpiStrip, DemoProjectStrip, NOVA_ICONS, type DemoTile } from "@gd-monorepo/ui";
import { useDemoProject, type DemoProjectData } from "../features/demo-data/useDemoProject";
import { useTargetSocWatcher } from "../features/demo-data/useTargetSocWatcher";
import { DEMO_TOPOLOGY } from "../features/demo-data/demo-topology";
import { siteFieldId } from "../lib/site-field";
import { isTunnelMode } from "../lib/api-base";

/**
 * DemoProjectLayout — proje sekmelerinin ortak üst bloğu (SPEC UC-2):
 * proje veri şeridi → KPI → aktif sekme. Ready/Rest kartı yalnız Operations'ta,
 * Trendler yalnız Site + Operations'ta, Event log yalnız Site'ta render edilir
 * (referans `app.js#render` görünürlük kuralları).
 */

export interface DemoProjectContextValue extends DemoProjectData {
  fieldId: string;
  base: string;
  openDevices: (n: number, tab?: string) => void;
}

const DemoProjectContext = createContext<DemoProjectContextValue | null>(null);

export function useDemoProjectContext(): DemoProjectContextValue {
  const ctx = useContext(DemoProjectContext);
  if (!ctx) throw new Error("useDemoProjectContext: DemoProjectLayout dışında kullanılamaz");
  return ctx;
}

const f = (v: number, d = 1): string => (Math.round(v * 10 ** d) / 10 ** d).toFixed(d);

export const DemoProjectLayout: React.FC = () => {
  const fieldId = siteFieldId();
  const base = isTunnelMode() ? `/fields/${fieldId}/ui` : `/field/${fieldId}`;
  const navigate = useNavigate();
  const project = useDemoProject(fieldId);
  const { state, kpis, rest, runs } = project;
  const L = DEMO_TOPOLOGY.limits;
  useTargetSocWatcher(state, runs);

  const openDevices = (n: number, tab = "battery"): void => {
    navigate(`${base}/devices?tab=${tab}&unit=${n}`);
  };

  const tiles = useMemo<DemoTile[]>(() => {
    const mode =
      kpis.mode === "rest"
        ? rest.complete
          ? "restok"
          : "restno"
        : kpis.mode === "chg"
          ? "chg"
          : kpis.mode === "dis"
            ? "dis"
            : null;
    return [
      {
        icon:
          kpis.mode === "chg" ? (
            <NOVA_ICONS.chg />
          ) : kpis.mode === "dis" ? (
            <NOVA_ICONS.dis />
          ) : kpis.mode === "rest" ? (
            <NOVA_ICONS.rest />
          ) : (
            <NOVA_ICONS.stby />
          ),
        label: "Operating mode",
        value:
          kpis.mode === "chg"
            ? "Charging"
            : kpis.mode === "dis"
              ? "Discharging"
              : kpis.mode === "rest"
                ? "Rest"
                : "Standby",
        sub: kpis.runPcs > 0 ? `${kpis.runPcs} / ${kpis.totalPcs} PCS running` : "No active program",
        sev: mode,
      },
      {
        icon: <NOVA_ICONS.bolt />,
        label: "Site power · POI",
        value: `${f(Math.abs(kpis.poiMW), 2)} MW`,
        sub: kpis.poiMW > 0.05 ? "Export → grid" : kpis.poiMW < -0.05 ? "Import ← grid" : "No flow",
        sev: kpis.poiMW > 0.05 ? "dis" : kpis.poiMW < -0.05 ? "chg" : null,
      },
      {
        icon: <NOVA_ICONS.battery level={kpis.avgSoc / 100} />,
        label: "Average SOC",
        value: `${f(kpis.avgSoc)} %`,
        sub: `${L.socMin}–${L.socMax} %`,
      },
      {
        icon: <NOVA_ICONS.health />,
        label: "SOH",
        value: `${f(kpis.avgSoh)} %`,
        sub: `Min ${f(kpis.sohMin)} %`,
      },
      {
        icon: <NOVA_ICONS.thermo />,
        label: "Cell temperature",
        value: `${f(kpis.tmax)} °C`,
        sub: `band ${L.tempMin}–${L.tempMax} °C`,
        sev: kpis.tmax > L.tempMax ? "alarm" : kpis.tmin < L.tempMin ? "cold" : null,
      },
      {
        icon: <NOVA_ICONS.units />,
        label: "Availability",
        value: `${kpis.availUnits} / ${kpis.totalUnits} groups`,
        sub: `${kpis.runPcs} / ${kpis.totalPcs} PCS running`,
      },
      {
        icon: <NOVA_ICONS.bell />,
        label: "Active faults",
        value: `${kpis.alarms + kpis.warns + kpis.colds + kpis.maints}`,
        sub:
          kpis.alarms > 0
            ? `${kpis.alarms} critical`
            : kpis.warns > 0
              ? `${kpis.warns} warnings`
              : "None",
        sev: kpis.alarms > 0 ? "alarm" : kpis.warns > 0 ? "warn" : null,
      },
    ];
  }, [kpis, rest.complete]);

  const stripItems = useMemo(() => {
    const U = DEMO_TOPOLOGY.unit;
    const n = state.units.length || DEMO_TOPOLOGY.feeders.A.units.length + DEMO_TOPOLOGY.feeders.B.units.length;
    const banks = state.units.filter((u) => u.rmu.H02 === "closed").flatMap((u) => u.banks);
    const disMWh = banks.reduce(
      (a, b) => a + Math.max(0, (b.soc - L.socMin) / 100) * (U.containerMWh / 2) * (b.soh / 100),
      0,
    );
    const dis = kpis.poiMW > 0 ? kpis.poiMW : 0;
    return [
      { label: "Rated power", value: `${DEMO_TOPOLOGY.powerMW} MWe`, sub: `POI ${DEMO_TOPOLOGY.station.nominalKV} kV` },
      { label: "Rated energy", value: `${f(DEMO_TOPOLOGY.energyMWh, 3)} MWh`, sub: `${n} × ${f(U.containerMWh, 3)} MWh` },
      { label: "Battery", value: `${n} × ${U.container}`, sub: `${U.banks.length * U.racksPerBank} racks × ${U.rackKWh} kWh` },
      { label: "PCS", value: `${n * 2} × ${f(U.pcsKVA / 1000, 3)} MVA`, sub: `Wattox · ${U.pcsAcV} V` },
      { label: "MV", value: `${n} × ${f(U.trKVA / 1000, 2)} MVA`, sub: U.trRatio },
      { label: "HVAC", value: `${n * (U.sections?.length ? U.sections.length * 2 : 8)} × MC90`, sub: "Envicool" },
      { label: "Available now", value: `${f(dis, 1)} MW`, sub: "discharge at POI" },
      { label: "Dischargeable", value: `${f(disMWh, 1)} MWh`, sub: `to SOC ${L.socMin} %` },
      { label: "AUX load", value: `${f(state.units[0]?.aux?.kW ?? 0, 1)} kW`, sub: `TR ${DEMO_TOPOLOGY.aux?.trKVA ?? 400} kVA` },
      {
        label: "Ambient",
        value: state.ambient !== undefined ? `${f(state.ambient)} °C` : "—",
        sub: "HVAC Outside Temp",
      },
    ];
  }, [state, kpis.poiMW, L.socMin]);

  const ctx: DemoProjectContextValue = { ...project, fieldId, base, openDevices };

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
        <DemoKpiStrip tiles={tiles} />
        <Outlet />
      </div>
    </DemoProjectContext.Provider>
  );
};
