import React from "react";
import { DEMO_REST_ENABLED, DemoReadyCard } from "@gd-monorepo/ui";
import { useDemoProjectContext } from "../layouts/DemoProjectLayout";
import { DEMO_TOPOLOGY } from "../features/demo-data/demo-topology";

/**
 * Ready/Rest kartı — referans görünürlük kuralı: YALNIZ Operations sekmesinde.
 * Context'ten beslenir; gruba tıklayınca Devices › HVAC açılır.
 * UC-13: termal hazırlık listesi **seçili istasyonun** gruplarına süzülür.
 */
export const DemoReadySection: React.FC = () => {
  const { rest, readyUnits, state, stationState, openDevices } = useDemoProjectContext();
  const L = DEMO_TOPOLOGY.limits;
  const stationUnits = new Set(stationState.units.map((u) => u.n));
  const units = readyUnits.filter((r) => stationUnits.has(r.n));
  return (
    <section className="card readycard">
      <DemoReadyCard
        units={units}
        rest={rest}
        showRest={DEMO_REST_ENABLED}
        ambient={stationState.ambient ?? state.ambient}
        tempMin={L.tempMin}
        tempMax={L.tempMax}
        onOpenUnit={(n) => openDevices(n, "hvac")}
      />
    </section>
  );
};
