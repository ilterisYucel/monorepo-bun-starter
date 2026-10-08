import React, { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  DemoAlertList,
  DemoCellDialog,
  DemoEventLog,
  DemoMimic,
  DemoUnitDetail,
  type DemoCellAction,
  type OverlayMode,
} from "@gd-monorepo/ui";
import { useDemoProjectContext } from "../layouts/DemoProjectLayout";
import { DemoTrendsSection } from "../components/DemoTrendsSection";
import { demoApi } from "../features/demo-data/demoApi";
import { DEMO_MV_DEVICE_ID, DEMO_TOPOLOGY, cellCommandName } from "../features/demo-data/demo-topology";

const OVERLAYS: Array<{ id: OverlayMode; label: string }> = [
  { id: "status", label: "Status" },
  { id: "soc", label: "SOC" },
  { id: "soh", label: "SOH" },
  { id: "temp", label: "Temperature" },
];

/** DemoFieldPage (Site layout) — UC-4: mimic + overlay + legend + attention/detail. */
export const DemoFieldPage: React.FC = () => {
  const { state, alerts, logs, openDevices } = useDemoProjectContext();
  const [overlay, setOverlay] = useState<OverlayMode>("status");
  const [selected, setSelected] = useState<number | null>(null);
  const [cellId, setCellId] = useState<string | null>(null);
  const [cellMsg, setCellMsg] = useState("");
  const [cellBusy, setCellBusy] = useState(false);
  const queryClient = useQueryClient();

  const selectedUnit = useMemo(
    () => state.units.find((u) => u.n === selected),
    [state, selected],
  );
  const openCell = useMemo(
    () => DEMO_TOPOLOGY.station.cells.find((c) => c.id === cellId),
    [cellId],
  );

  const handleCellCommand = async (id: string, action: DemoCellAction): Promise<void> => {
    setCellBusy(true);
    setCellMsg("");
    try {
      const r = await demoApi.executeCommand(DEMO_MV_DEVICE_ID, cellCommandName(id, action));
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
              topology={DEMO_TOPOLOGY}
              state={state}
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
                Attention<small>{alerts.length} items</small>
              </h2>
            </header>
            <DemoAlertList
              alerts={alerts}
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
              topology={DEMO_TOPOLOGY}
              onOpenDevices={(section) => {
                if (selectedUnit) openDevices(selectedUnit.n, section);
              }}
            />
          </section>
        </aside>

        {openCell ? (
          <DemoCellDialog
            cell={openCell}
            station={state.station}
            busy={cellBusy}
            message={cellMsg}
            onCommand={handleCellCommand}
            onClose={() => setCellId(null)}
          />
        ) : null}
      </div>

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
