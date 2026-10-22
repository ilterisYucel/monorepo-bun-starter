import React, { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  DemoAlertList,
  DemoCellDialog,
  DemoEventLog,
  DemoMimic,
  DemoPlantOverview,
  DemoSourceStationView,
  DemoUnitDetail,
  deriveSourceStations,
  type DemoCellAction,
  type OverlayMode,
} from "@gd-monorepo/ui";
import { useDemoProjectContext } from "../layouts/DemoProjectLayout";
import { DemoTrendsSection } from "../components/DemoTrendsSection";
import { demoApi } from "../features/demo-data/demoApi";
import { cellCommandName } from "../features/demo-data/demo-topology";
import { DEMO_COLLECTOR, DEMO_SOURCE, DEMO_STATIONS, demoPlantTotals } from "../features/demo-data/demo-stations";

const OVERLAYS: Array<{ id: OverlayMode; label: string }> = [
  { id: "status", label: "Status" },
  { id: "soc", label: "SOC" },
  { id: "soh", label: "SOH" },
  { id: "temp", label: "Temperature" },
];

const PLANT = demoPlantTotals();

/**
 * İstasyon başına 1 MV simülatörü; çizim aktif istasyonun 9 ünitesi + 2 fideri.
 * Plant overview (collector) bu projede gösterilmez.
 */
const SHOW_PLANT_OVERVIEW = false;

/** DemoFieldPage (Site layout) — UC-4/UC-11: collector → istasyon (context) → mimic + attention/detail. */
export const DemoFieldPage: React.FC = () => {
  const {
    state,
    logs,
    trendData,
    openDevices,
    activeStation,
    setActiveStation,
    stationState,
    stationTopology,
    stationAlerts,
  } = useDemoProjectContext();
  const [overlay, setOverlay] = useState<OverlayMode>("status");
  const [selected, setSelected] = useState<number | null>(null);
  const [cellId, setCellId] = useState<string | null>(null);
  const [cellMsg, setCellMsg] = useState("");
  const [cellBusy, setCellBusy] = useState(false);
  const [sourceStation, setSourceStation] = useState<string | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => setSelected(null), [activeStation]);

  const srcCfg = sourceStation ? DEMO_SOURCE.stations.find((s) => s.key === sourceStation) : undefined;
  const srcView = useMemo(() => (srcCfg ? deriveSourceStations([srcCfg])[0] : null), [srcCfg]);

  const selectedUnit = useMemo(
    () => stationState.units.find((u) => u.n === selected),
    [stationState, selected],
  );
  const openCell = useMemo(
    () => stationTopology.station.cells.find((c) => c.id === cellId),
    [stationTopology, cellId],
  );

  const station = DEMO_STATIONS[activeStation] ?? DEMO_STATIONS[0]!;

  const handleCellCommand = async (id: string, action: DemoCellAction): Promise<void> => {
    setCellBusy(true);
    setCellMsg("");
    try {
      const r = await demoApi.executeCommand(station.mvDeviceId, cellCommandName(id, action));
      setCellMsg(r.success === false ? `Interlocked: ${r.reason ?? "rejected"}` : "Command applied.");
      await queryClient.invalidateQueries({ queryKey: ["demo-field-containers"] });
    } catch (e) {
      setCellMsg(`Error: ${(e as Error).message}`);
    } finally {
      setCellBusy(false);
    }
  };

  return (
    <>
      {SHOW_PLANT_OVERVIEW ? (
      <DemoPlantOverview
        topology={stationTopology}
        state={state}
        stations={DEMO_STATIONS}
        sources={DEMO_SOURCE.stations}
        collector={{
          name: PLANT.collector,
          label: `${PLANT.collector} · 34.5 kV`,
          installedMW: PLANT.installedMW,
          limitMW: DEMO_COLLECTOR.limitMW,
        }}
        selectedStation={activeStation}
        onStationSelect={setActiveStation}
        onSourceSelect={setSourceStation}
        peakMW={DEMO_SOURCE.peakMW}
        powerPoints={trendData.power}
      />
      ) : null}
      {SHOW_PLANT_OVERVIEW && sourceStation ? (
        <>
          <div className="seg stnav" role="group" aria-label="MV station" style={{ margin: "10px 0 0" }}>
            {DEMO_STATIONS.map((s) => (
              <button key={s.key} type="button" onClick={() => setSourceStation(null)}>
                {s.name.replace("BESS MV STATION", "BESS MV St.")}
              </button>
            ))}
            {DEMO_SOURCE.stations.map((s) => (
              <button key={s.key} type="button" aria-pressed={sourceStation === s.key} onClick={() => setSourceStation(s.key)}>
                {s.name}
              </button>
            ))}
          </div>
          {srcView ? (
            <DemoSourceStationView
              station={srcView}
              prefix={DEMO_SOURCE.prefix}
              collectorName={PLANT.collector}
              collectorCell={`Q0${6 + (srcCfg?.index ?? 0)}`}
              unitCapMWp={DEMO_SOURCE.unitMVA}
              irr={DEMO_SOURCE.irr}
              tMod={DEMO_SOURCE.tMod}
            />
          ) : null}
        </>
      ) : (
        <>
          <DemoTrendsSection />
          <div className="main">
        <section className="card">
          <header>
            <h2>
              Site layout<small>physical layout × single line · click an MV cell or a group</small>
            </h2>
            <div className="seg" role="group" aria-label="Battery colouring">
              {OVERLAYS.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  aria-pressed={overlay === o.id}
                  onClick={() => setOverlay(o.id)}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </header>
          <div className="mimic-wrap">
            <DemoMimic
              topology={stationTopology}
              state={stationState}
              overlay={overlay}
              selected={selected}
              onSelect={setSelected}
              onCellSelect={(id) => {
                setCellId(id);
                setCellMsg("");
              }}
              onAuxSelect={() => openDevices(1, "aux")}
            />
          </div>
          <DemoLegend />
        </section>

        <aside className="side">
          <section className="card">
            <header>
              <h2>
                Attention<small>{stationAlerts.length} items</small>
              </h2>
            </header>
            <DemoAlertList
              alerts={stationAlerts}
              onSelect={(a) => {
                if (a.unitNo !== undefined) setSelected(a.unitNo);
                if (a.cell) {
                  setCellId(a.cell);
                  setCellMsg("");
                }
              }}
            />
          </section>
          <section className="card">
            <DemoUnitDetail
              unit={selectedUnit}
              topology={stationTopology}
              onOpenDevices={(section) => {
                if (selectedUnit) openDevices(selectedUnit.n, section);
              }}
            />
          </section>
        </aside>

        {openCell ? (
          <DemoCellDialog
            cell={openCell}
            station={stationState.station}
            busy={cellBusy}
            message={cellMsg}
            onCommand={handleCellCommand}
            onClose={() => setCellId(null)}
          />
        ) : null}
      </div>
        </>
      )}

      <DemoEventLog events={logs} />
    </>
  );
};

const DemoLegend: React.FC = () => (
  <div className="legend" aria-label="Legend">
    <span className="k">
      <svg viewBox="0 0 30 14" width={30} height={14}>
        <line x1="2" y1="7" x2="28" y2="7" stroke="var(--nm-flow-dis)" strokeWidth="3" strokeDasharray="3 5" strokeLinecap="round" />
      </svg>
      Discharge → grid
    </span>
    <span className="k">
      <svg viewBox="0 0 30 14" width={30} height={14}>
        <line x1="2" y1="7" x2="28" y2="7" stroke="var(--nm-flow-chg)" strokeWidth="3" strokeDasharray="3 5" strokeLinecap="round" />
      </svg>
      Charge ← grid
    </span>
    <span className="k">
      <svg viewBox="0 0 30 14" width={30} height={14}>
        <line x1="2" y1="7" x2="28" y2="7" stroke="var(--nm-live)" strokeWidth="2.2" />
      </svg>
      Energised
    </span>
    <span className="k">
      <svg viewBox="0 0 30 14" width={30} height={14}>
        <line x1="2" y1="7" x2="28" y2="7" stroke="var(--nm-dead)" strokeWidth="1.8" strokeDasharray="4 3" />
      </svg>
      De-energised
    </span>
    <span className="k">
      <svg viewBox="0 0 30 14" width={30} height={14}>
        <line x1="2" y1="7" x2="28" y2="7" stroke="var(--nm-maint)" strokeWidth="2" strokeDasharray="2 3" />
      </svg>
      Earthed
    </span>
  </div>
);
