import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { DemoTrendChart } from "@gd-monorepo/ui";
import { useDemoProjectContext } from "../layouts/DemoProjectLayout";
import { DEMO_TOPOLOGY } from "../features/demo-data/demo-topology";
import { DEMO_STATIONS, pcsIdsForStation } from "../features/demo-data/demo-stations";
import { buildTrendSeries, trendBands, BSC_TREND_NAMES } from "../features/demo-data/buildTrendSeries";
import { demoApi } from "../features/demo-data/demoApi";

/**
 * Trendler bölümü — **istasyon bazlı** (K-18/K-19): aktif istasyonun son 1
 * dakikalık serisi, 5 sn'de bir tazelenir.
 *
 * Kaynak ayrımı: **SOC + sıcaklık konteynerin BSC telemetrisinden** (istasyonun
 * gerçek durumu — connector'ın kopyaladığı PCS BMS değeri değil), **güç field
 * PCS çiftinden** (canonical power_kw). İki kaynak birleştirilip çizilir.
 */

export const TREND_WINDOW_MS = 60_000;
export const TREND_POINTS = 60;
export const TREND_REFETCH_MS = 2_000;
/** Güç yalnız PCS'ten (field) — SOC/sıcaklık konteynerden gelir (çifte sayım yok). */
export const TREND_POWER_NAMES = ["Grid Active Power"];

export const DemoTrendsSection: React.FC = () => {
  const { fieldId, activeStation, stationSystems, restPhases } = useDemoProjectContext();
  const L = DEMO_TOPOLOGY.limits;
  // gdems `activate(pi, k)`: trendler AKTİF istasyonun konteyneri (SOC/SOH/
  // sıcaklık) + PCS çifti (güç) üzerinden çizilir; istasyon geçişi grafikleri değiştirir.
  const station = DEMO_STATIONS[activeStation] ?? DEMO_STATIONS[0]!;
  const pcs = useMemo(() => [...pcsIdsForStation(station.key)], [station.key]);
  const containerId = stationSystems[station.key];
  const containerIds = useMemo(() => (containerId !== undefined ? [containerId] : []), [containerId]);
  // Gösterim ölçeği: 1 gerçek PCS çifti, istasyonun 9 grubunu temsil eder.
  const powerScale = (station.units.length * 2) / Math.max(1, pcs.length);

  const containerTrends = useQuery({
    queryKey: ["demo-station-trends-bsc", fieldId, station.key, containerId],
    queryFn: () =>
      demoApi.downsampled(fieldId, {
        containerIds,
        from: new Date(Date.now() - TREND_WINDOW_MS).toISOString(),
        to: new Date().toISOString(),
        points: TREND_POINTS,
        names: [...BSC_TREND_NAMES],
      }),
    refetchInterval: TREND_REFETCH_MS,
    refetchOnWindowFocus: false,
    enabled: fieldId.length > 0 && containerId !== undefined,
  });

  const powerTrends = useQuery({
    queryKey: ["demo-station-trends-pcs", fieldId, station.key],
    queryFn: () =>
      demoApi.unifiedDownsampled(pcs, {
        from: new Date(Date.now() - TREND_WINDOW_MS).toISOString(),
        to: new Date().toISOString(),
        points: TREND_POINTS,
        names: TREND_POWER_NAMES,
      }),
    refetchInterval: TREND_REFETCH_MS,
    refetchOnWindowFocus: false,
    enabled: fieldId.length > 0,
  });

  const trendData = useMemo(() => {
    const bsc = Object.values(containerTrends.data ?? {}).flat();
    const data = buildTrendSeries([...bsc, ...(powerTrends.data ?? [])]);
    // Güç: ölçülen 2 PCS → istasyon ölçeği (×9); SOC/sıcaklık zaten istasyon değeri.
    return { ...data, power: data.power.map((p) => ({ ...p, value: p.value * powerScale })) };
  }, [containerTrends.data, powerTrends.data, powerScale]);
  // K-18: ölçeği veriye yakınlaştır — SOC ±5 (5'in katı), güç min ±1 MW.
  const bands = useMemo(() => trendBands(trendData), [trendData]);

  return (
    <section className="card trends">
      <header>
        <h2>
          Trends<small>{`${station.name} · last 1 min · 2 s refresh`}</small>
        </h2>
      </header>
      <div className="charts">
        <DemoTrendChart
          title={`SOC · ${station.name}`}
          unit="%"
          yMin={0}
          yMax={100}
          yTicks={[0, 25, 50, 75, 100]}
          series={[{ label: "Average", points: trendData.soc, color: "var(--nm-c-soc)", area: true }]}
          limits={[
            { value: L.socMax, label: `Upper limit ${L.socMax} %` },
            { value: L.socMin, label: `Lower limit ${L.socMin} %` },
          ]}
          phases={restPhases}
          shade={["rest"]}
          shadeLabel={{ rest: "Rest" }}
        />
        <DemoTrendChart
          title={`Power at POI · ${station.name} (+ discharge / − charge)`}
          unit="MW"
          yMin={bands.power[0]}
          yMax={bands.power[1]}
          series={[{ label: "Measured", points: trendData.power, color: "var(--nm-c-pow)", area: true }]}
          phases={restPhases}
          shade={["rest"]}
          shadeLabel={{ rest: "Rest" }}
        />
        <DemoTrendChart
          title={`Cell temperature · ${station.name}`}
          unit="°C"
          yMin={10}
          yMax={35}
          yTicks={[10, 15, 20, 25, 30, 35]}
          series={[{ label: "Highest", points: trendData.temp, color: "var(--nm-c-hot)", area: true }]}
          limits={[
            { value: L.tripC ?? 32, label: `Trip ${L.tripC ?? 32} °C (H02 opens)`, cls: "hot" },
            { value: L.derateC, label: `Limit PCS ${L.derateC} °C (50 % derate)`, cls: "hot" },
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
