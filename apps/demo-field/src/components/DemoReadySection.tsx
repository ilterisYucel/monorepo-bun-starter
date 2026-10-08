import React from "react";
import { DemoReadyCard } from "@gd-monorepo/ui";
import { useDemoProjectContext } from "../layouts/DemoProjectLayout";
import { DEMO_TOPOLOGY } from "../features/demo-data/demo-topology";

/**
 * Ready/Rest kartı — referans görünürlük kuralı: YALNIZ Operations sekmesinde.
 * Context'ten beslenir; gruba tıklayınca Devices › HVAC açılır.
 */
export const DemoReadySection: React.FC = () => {
  const { rest, readyUnits, state, openDevices } = useDemoProjectContext();
  const L = DEMO_TOPOLOGY.limits;
  return (
    <section className="card readycard">
      <DemoReadyCard
        units={readyUnits}
        rest={rest}
        ambient={state.ambient}
        tempMin={L.tempMin}
        tempMax={L.tempMax}
        onOpenUnit={(n) => openDevices(n, "hvac")}
      />
    </section>
  );
};
