import React from "react";
import { DemoTrendChart } from "@gd-monorepo/ui";
import { useDemoProjectContext } from "../layouts/DemoProjectLayout";
import { DEMO_TOPOLOGY } from "../features/demo-data/demo-topology";

/**
 * Trendler bölümü (SOC · saha / Güç · POI / Hücre sıcaklığı) — referans
 * görünürlük kuralı: yalnız Site layout + Operations. Context'ten beslenir.
 */
export const DemoTrendsSection: React.FC = () => {
  const { trendData, restPhases } = useDemoProjectContext();
  const L = DEMO_TOPOLOGY.limits;
  return (
    <section className="card trends">
      <header>
        <h2>
          Trends<small>up to the last 4 h · shaded = rest period</small>
        </h2>
      </header>
      <div className="charts">
        <DemoTrendChart
          title="SOC · site"
          unit="%"
          yMin={0}
          yMax={100}
          yTicks={[0, 25, 50, 75, 100]}
          series={[{ label: "Average", points: trendData.soc, color: "var(--nm-c-soc)" }]}
          limits={[
            { value: L.socMax, label: `Upper limit ${L.socMax} %` },
            { value: L.socMin, label: `Lower limit ${L.socMin} %` },
          ]}
          phases={restPhases}
          shade={["rest"]}
          shadeLabel={{ rest: "Rest" }}
        />
        <DemoTrendChart
          title="Power at POI (+ discharge / − charge)"
          unit="MW"
          series={[{ label: "Measured", points: trendData.power, color: "var(--nm-c-pow)", area: true }]}
          phases={restPhases}
          shade={["rest"]}
          shadeLabel={{ rest: "Rest" }}
        />
        <DemoTrendChart
          title="Cell temperature"
          unit="°C"
          series={[{ label: "Highest", points: trendData.temp, color: "var(--nm-c-hot)" }]}
          limits={[
            { value: L.tempMax, label: `Upper ${L.tempMax} °C`, cls: "hot" },
            { value: L.tempMin, label: `Lower ${L.tempMin} °C`, cls: "cold" },
          ]}
          phases={restPhases}
          shade={["rest"]}
          shadeLabel={{ rest: "Rest" }}
        />
      </div>
    </section>
  );
};
